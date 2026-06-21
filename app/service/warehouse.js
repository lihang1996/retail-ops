const {
  ensureDb,
  getTenantId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
} = require('../common/org-helper')
const { computeLocationRisk } = require('../common/warehouse-3d-helper')

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class WarehouseService extends BaseService {
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('warehouses').where({ tenant_id: tenantId })
      if (query.status) qb = qb.andWhere({ status: query.status })
      if (query.warehouse_name) qb = qb.andWhere('warehouse_name', 'like', `%${query.warehouse_name}%`)
      const list = await qb.orderBy('created_at', 'desc')
      return { list, total: list.length }
    }

    async get(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const { warehouse_id: warehouseId } = query
      if (!warehouseId) bizError('warehouse_id 不能为空')
      return assertRowInTenant(db, 'warehouses', tenantId, 'warehouse_id', warehouseId, '仓库')
    }

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

    async listLocations(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      let qb = db('warehouse_locations as l')
        .leftJoin('warehouses as w', 'l.warehouse_id', 'w.warehouse_id')
        .where('l.tenant_id', tenantId)
        .select('l.*', 'w.warehouse_name')

      if (query.warehouse_id) qb = qb.andWhere('l.warehouse_id', query.warehouse_id)
      if (query.location_code) qb = qb.andWhere('l.location_code', 'like', `%${query.location_code}%`)

      const list = await qb.orderBy('l.created_at', 'desc')
      return { list, total: list.length }
    }

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
