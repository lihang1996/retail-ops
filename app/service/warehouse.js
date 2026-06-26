/**
 * @module service/warehouse
 * @description 仓库与库位管理：仓库 CRUD、库位维护、3D 布局与风险地图。
 * 关键规则：仓库编码租户内唯一；库位含 3D 坐标与容量；风险等级由库存量/容量比计算。
 */
const {
  ensureDb,
  getTenantId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
} = require('../common/org-helper')
const { computeLocationRisk } = require('../common/warehouse-3d-helper')
const { paginateQuery } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const WAREHOUSE_LIST_FILTERS = [
  { key: 'status', column: 'status' },
  { key: 'warehouse_name', column: 'warehouse_name', op: 'like', transform: (value) => value.trim() },
  { key: 'warehouse_code', column: 'warehouse_code', op: 'like', transform: (value) => value.trim() },
]

const WAREHOUSE_LOCATION_FILTERS = [
  { key: 'warehouse_id', column: 'l.warehouse_id' },
  { key: 'warehouse_name', column: 'w.warehouse_name', op: 'like', transform: (value) => value.trim() },
  { key: 'location_code', column: 'l.location_code', op: 'like', transform: (value) => value.trim() },
  { key: 'status', column: 'l.status' },
]

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class WarehouseService extends BaseService {
    /** 列出当前租户仓库 */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('warehouses').where({ tenant_id: tenantId })
      qb = applyFilters(qb, query, WAREHOUSE_LIST_FILTERS)
      const result = await paginateQuery(qb.orderBy('created_at', 'desc'), query, { countColumn: 'warehouse_id', maxPageSize: 500 })
      const warehouseIds = result.list.map((item) => item.warehouse_id)

      if (!warehouseIds.length) return result

      const locationRows = await db('warehouse_locations')
        .where({ tenant_id: tenantId })
        .whereIn('warehouse_id', warehouseIds)
        .select('warehouse_id')
        .count({ location_count: 'location_id' })
        .sum({ location_capacity: 'capacity' })
        .groupBy('warehouse_id')

      const stockRows = await db('stocks')
        .where({ tenant_id: tenantId })
        .whereIn('warehouse_id', warehouseIds)
        .select('warehouse_id')
        .countDistinct({ stock_sku_count: 'sku_id' })
        .sum({
          total_qty: 'total_qty',
          available_qty: 'available_qty',
          locked_qty: 'locked_qty',
        })
        .select(db.raw('SUM(CASE WHEN available_qty > 0 AND available_qty <= warning_qty THEN 1 ELSE 0 END) as risk_sku_count'))
        .groupBy('warehouse_id')

      const stockedLocationRows = await db('stock_locations as sl')
        .join('warehouse_locations as loc', function joinLocation() {
          this.on('sl.location_id', 'loc.location_id').andOn('sl.tenant_id', 'loc.tenant_id')
        })
        .where('sl.tenant_id', tenantId)
        .whereIn('loc.warehouse_id', warehouseIds)
        .select('loc.warehouse_id')
        .countDistinct({ stocked_location_count: 'sl.location_id' })
        .groupBy('loc.warehouse_id')

      const shipmentRows = await db('shipments')
        .where({ tenant_id: tenantId })
        .whereIn('warehouse_id', warehouseIds)
        .whereIn('status', ['created', 'picking', 'picked'])
        .select('warehouse_id')
        .count({ active_shipment_count: 'shipment_id' })
        .groupBy('warehouse_id')

      const byWarehouse = (rows) => rows.reduce((map, row) => {
        map[row.warehouse_id] = row
        return map
      }, {})

      const locationMap = byWarehouse(locationRows)
      const stockMap = byWarehouse(stockRows)
      const stockedLocationMap = byWarehouse(stockedLocationRows)
      const shipmentMap = byWarehouse(shipmentRows)

      return {
        ...result,
        list: result.list.map((warehouse) => {
          const loc = locationMap[warehouse.warehouse_id] || {}
          const stock = stockMap[warehouse.warehouse_id] || {}
          const stocked = stockedLocationMap[warehouse.warehouse_id] || {}
          const shipment = shipmentMap[warehouse.warehouse_id] || {}
          const locationCount = parseInt(loc.location_count, 10) || 0
          const stockedLocationCount = parseInt(stocked.stocked_location_count, 10) || 0
          return {
            ...warehouse,
            location_count: locationCount,
            stocked_location_count: stockedLocationCount,
            location_capacity: parseInt(loc.location_capacity, 10) || 0,
            stock_sku_count: parseInt(stock.stock_sku_count, 10) || 0,
            total_qty: parseInt(stock.total_qty, 10) || 0,
            available_qty: parseInt(stock.available_qty, 10) || 0,
            locked_qty: parseInt(stock.locked_qty, 10) || 0,
            risk_sku_count: parseInt(stock.risk_sku_count, 10) || 0,
            active_shipment_count: parseInt(shipment.active_shipment_count, 10) || 0,
            location_fill_rate: locationCount > 0 ? Math.round((stockedLocationCount / locationCount) * 100) : 0,
          }
        }),
      }
    }

    /** 获取单个仓库详情 */
    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { warehouse_id: warehouseId } = query
      if (!warehouseId) bizError('warehouse_id 不能为空')
      return assertRowInTenant(db, 'warehouses', tenantId, 'warehouse_id', warehouseId, '仓库')
    }

    /** 创建仓库，编码租户内唯一 */
    async create(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { warehouse_name: name, warehouse_code: code, address } = body
      if (!name || !code) bizError('仓库名称和编码不能为空')

      const exists = await db('warehouses').where({ tenant_id: tenantId, warehouse_code: code }).first()
      if (exists) bizError('仓库编码已存在', 40900)

      const warehouseId = idGen.next('wh')
      await db('warehouses').insert({
        warehouse_id: warehouseId,
        tenant_id: tenantId,
        warehouse_name: name,
        warehouse_code: code,
        address: address || null,
        status: 'active',
      })

      await audit(app, ctx, {
        actionCode: 'warehouse:create',
        objectType: 'warehouse',
        objectId: warehouseId,
        detail: { name, code },
      })
      return { warehouseId }
    }

    /** 更新仓库名称、地址或状态 */
    async update(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { warehouse_id: warehouseId, warehouse_name: name, address, status } = body
      if (!warehouseId) bizError('warehouse_id 不能为空')

      await assertRowInTenant(db, 'warehouses', tenantId, 'warehouse_id', warehouseId, '仓库')

      const patch = {}
      if (name) patch.warehouse_name = name
      if (address !== undefined) patch.address = address || null
      if (status) patch.status = status

      await db('warehouses').where({ warehouse_id: warehouseId }).update(patch)
      await audit(app, ctx, {
        actionCode: 'warehouse:update',
        objectType: 'warehouse',
        objectId: warehouseId,
        detail: patch,
      })
      return { warehouseId }
    }

    /** 列出库位及所属仓库 */
    async listLocations(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('warehouse_locations as l')
        .leftJoin('warehouses as w', 'l.warehouse_id', 'w.warehouse_id')
        .where('l.tenant_id', tenantId)
        .select('l.*', 'w.warehouse_name')

      qb = applyFilters(qb, query, WAREHOUSE_LOCATION_FILTERS)

      const result = await paginateQuery(qb.orderBy('l.created_at', 'desc'), query, { countColumn: 'l.location_id', maxPageSize: 500 })
      const locationIds = result.list.map((item) => item.location_id)
      if (!locationIds.length) return result

      const stockRows = await db('stock_locations')
        .where({ tenant_id: tenantId })
        .whereIn('location_id', locationIds)
        .select('location_id')
        .sum({ current_qty: 'qty' })
        .countDistinct({ sku_count: 'sku_id' })
        .groupBy('location_id')

      const stockMap = stockRows.reduce((map, row) => {
        map[row.location_id] = row
        return map
      }, {})

      return {
        ...result,
        list: result.list.map((location) => {
          const stock = stockMap[location.location_id] || {}
          const currentQty = parseInt(stock.current_qty, 10) || 0
          const capacity = parseInt(location.capacity, 10) || 0
          return {
            ...location,
            current_qty: currentQty,
            sku_count: parseInt(stock.sku_count, 10) || 0,
            capacity_used_pct: capacity > 0 ? Math.round((currentQty / capacity) * 100) : 0,
            risk_level: computeLocationRisk(currentQty, capacity),
          }
        }),
      }
    }

    /** 获取库位详情含 SKU 分布、风险等级、近期流水 */
    async getLocation(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { location_id: locationId } = query
      if (!locationId) bizError('location_id 不能为空')

      const location = await assertRowInTenant(
        db,
        'warehouse_locations',
        tenantId,
        'location_id',
        locationId,
        '库位'
      )

      const skus = await db('stock_locations as sl')
        .join('product_skus as sku', 'sl.sku_id', 'sku.sku_id')
        .leftJoin('products as p', 'sku.product_id', 'p.product_id')
        .where('sl.tenant_id', tenantId)
        .andWhere('sl.location_id', locationId)
        .select('sl.qty', 'sku.sku_id', 'sku.sku_code', 'p.product_name')

      const totalQty = skus.reduce((sum, row) => sum + (row.qty || 0), 0)
      const riskLevel = computeLocationRisk(totalQty, location.capacity)

      const logs = await db('stock_logs as l')
        .leftJoin('product_skus as sku', 'l.sku_id', 'sku.sku_id')
        .where('l.tenant_id', tenantId)
        .andWhere('l.location_id', locationId)
        .select('l.action_type', 'l.qty_change', 'l.created_at', 'sku.sku_code')
        .orderBy('l.created_at', 'desc')
        .limit(10)

      return {
        location,
        skus,
        risk: { level: riskLevel, totalQty, capacity: location.capacity },
        recentLogs: logs,
      }
    }

    /** 创建库位，含 3D 坐标与容量，编码仓库内唯一 */
    async createLocation(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const {
        warehouse_id: warehouseId,
        zone_id: zoneId,
        shelf_id: shelfId,
        location_code: locationCode,
        capacity,
        pos_x: posX,
        pos_y: posY,
        pos_z: posZ,
      } = body

      if (!warehouseId || !locationCode) bizError('warehouse_id 与 location_code 不能为空')
      await assertRowInTenant(db, 'warehouses', tenantId, 'warehouse_id', warehouseId, '仓库')

      const exists = await db('warehouse_locations')
        .where({ tenant_id: tenantId, warehouse_id: warehouseId, location_code: locationCode })
        .first()
      if (exists) bizError('库位编码已存在', 40900)

      const locationId = idGen.next('loc')
      await db('warehouse_locations').insert({
        location_id: locationId,
        tenant_id: tenantId,
        warehouse_id: warehouseId,
        zone_id: zoneId || null,
        shelf_id: shelfId || null,
        location_code: locationCode,
        capacity: capacity ?? 100,
        pos_x: posX ?? 0,
        pos_y: posY ?? 0,
        pos_z: posZ ?? 0,
        status: 'active',
      })

      await audit(app, ctx, {
        actionCode: 'warehouse:location:create',
        objectType: 'location',
        objectId: locationId,
        detail: { warehouseId, locationCode },
      })
      return { locationId }
    }

    /** 更新库位容量、坐标或状态 */
    async updateLocation(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const {
        location_id: locationId,
        capacity,
        pos_x: posX,
        pos_y: posY,
        pos_z: posZ,
        status,
      } = body
      if (!locationId) bizError('location_id 不能为空')

      await assertRowInTenant(db, 'warehouse_locations', tenantId, 'location_id', locationId, '库位')

      const patch = {}
      if (capacity !== undefined) patch.capacity = capacity
      if (posX !== undefined) patch.pos_x = posX
      if (posY !== undefined) patch.pos_y = posY
      if (posZ !== undefined) patch.pos_z = posZ
      if (status) patch.status = status

      await db('warehouse_locations').where({ location_id: locationId }).update(patch)
      await audit(app, ctx, {
        actionCode: 'warehouse:location:update',
        objectType: 'location',
        objectId: locationId,
        detail: patch,
      })
      return { locationId }
    }

    /** 获取仓库 3D 布局：库区、货架、库位坐标 */
    async getLayout(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { warehouse_id: warehouseId } = query
      if (!warehouseId) bizError('warehouse_id 不能为空')

      const warehouse = await assertRowInTenant(db, 'warehouses', tenantId, 'warehouse_id', warehouseId, '仓库')
      const zones = await db('warehouse_zones')
        .where({ tenant_id: tenantId, warehouse_id: warehouseId, status: 'active' })
        .select('zone_id', 'zone_name', 'zone_code')
      const shelves = await db('warehouse_shelves')
        .where({ tenant_id: tenantId, warehouse_id: warehouseId, status: 'active' })
        .select('shelf_id', 'zone_id', 'shelf_name', 'shelf_code')
      const locations = await db('warehouse_locations')
        .where({ tenant_id: tenantId, warehouse_id: warehouseId, status: 'active' })
        .select(
          'location_id',
          'location_code',
          'zone_id',
          'shelf_id',
          'pos_x',
          'pos_y',
          'pos_z',
          'capacity'
        )

      return { warehouse, zones, shelves, locations }
    }

    /** 获取仓库库位风险地图（empty/low/normal/full） */
    async getRiskMap(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { warehouse_id: warehouseId } = query
      if (!warehouseId) bizError('warehouse_id 不能为空')

      await assertRowInTenant(db, 'warehouses', tenantId, 'warehouse_id', warehouseId, '仓库')

      const locations = await db('warehouse_locations')
        .where({ tenant_id: tenantId, warehouse_id: warehouseId, status: 'active' })
        .select('location_id', 'capacity')

      if (!locations.length) return { warehouseId, riskMap: {} }

      const qtyRows = await db('stock_locations')
        .where({ tenant_id: tenantId })
        .whereIn(
          'location_id',
          locations.map((l) => l.location_id)
        )
        .groupBy('location_id')
        .select('location_id')
        .sum('qty as total_qty')

      const qtyMap = new Map(qtyRows.map((r) => [r.location_id, parseInt(r.total_qty, 10) || 0]))
      const riskMap = {}

      for (const loc of locations) {
        const qty = qtyMap.get(loc.location_id) || 0
        riskMap[loc.location_id] = {
          level: computeLocationRisk(qty, loc.capacity),
          qty,
          capacity: loc.capacity,
        }
      }

      return { warehouseId, riskMap }
    }
  }
}
