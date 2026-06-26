/**
 * @module service/stock
 * @description 库存服务：入库、锁定/解锁、出库及库存查询。
 * 关键规则：可用/锁定/总量分字段管理；乐观锁 version 防并发；出库可关联 lock_id 消耗锁定量；
 * 所有操作写 stock_logs 留痕，租户按 tenant_id 隔离。
 */
const {
  ensureDb,
  getTenantId,
  getOperatorId,
  bizError,
  audit,
  idGen,
  assertRowInTenant,
  activeOnly,
} = require('../common/org-helper')
const {
  writeStockLog,
  getOrCreateStock,
  updateStockWithVersion,
  upsertLocationQty,
  lockStock,
  outboundStock,
} = require('../common/stock-helper')
const { computeLocationRisk } = require('../common/warehouse-3d-helper')
const { ERROR_CODES } = require('../common/error-codes')
const { paginateQuery, hasFilterValue } = require('../common/pagination')
const { applyFilters } = require('../common/apply-filters')

const STOCK_LIST_FILTERS = [
  { key: 'warehouse_id', column: 's.warehouse_id' },
  { key: 'sku_id', column: 's.sku_id' },
  { key: 'sku_code', column: 'sku.sku_code', op: 'like', transform: (value) => value.trim() },
  { key: 'warehouse_name', column: 'w.warehouse_name', op: 'like', transform: (value) => value.trim() },
]

const STOCK_LOCATION_FILTERS = [
  { key: 'warehouse_id', column: 'loc.warehouse_id' },
  { key: 'warehouse_name', column: 'w.warehouse_name', op: 'like', transform: (value) => value.trim() },
  { key: 'location_code', column: 'loc.location_code', op: 'like', transform: (value) => value.trim() },
  { key: 'sku_id', column: 'sl.sku_id' },
]

const STOCK_LOG_FILTERS = [
  { key: 'sku_id', column: 'l.sku_id' },
  { key: 'warehouse_id', column: 'l.warehouse_id' },
  { key: 'action_type', column: 'l.action_type' },
  { key: 'warehouse_name', column: 'w.warehouse_name', op: 'like', transform: (value) => value.trim() },
  { key: 'location_code', column: 'loc.location_code', op: 'like', transform: (value) => value.trim() },
  { key: 'ref_id', column: 'l.ref_id', op: 'like', transform: (value) => value.trim() },
  { key: 'operator_name', column: 'u.display_name', op: 'like', transform: (value) => value.trim() },
]

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class StockService extends BaseService {
    /** 按仓库/SKU 查询库存汇总，支持低库存风险筛选 */
    async list(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('stocks as s')
        .join('product_skus as sku', 's.sku_id', 'sku.sku_id')
        .join('warehouses as w', 's.warehouse_id', 'w.warehouse_id')
        .leftJoin('products as p', 'sku.product_id', 'p.product_id')
        .where('s.tenant_id', tenantId)
        .select(
          's.*',
          'sku.sku_code',
          'p.product_name',
          'w.warehouse_name',
          'w.warehouse_code'
        )

      qb = applyFilters(qb, query, STOCK_LIST_FILTERS)
      if (hasFilterValue(query.keyword)) {
        const keyword = query.keyword.trim()
        qb = qb.andWhere(function matchKeyword() {
          this.where('sku.sku_code', 'like', `%${keyword}%`)
            .orWhere('p.product_name', 'like', `%${keyword}%`)
        })
      }

      const risk = hasFilterValue(query.risk) ? query.risk : null
      if (risk === 'abnormal' || risk === 'low' || risk === 'warning') {
        qb = qb.andWhere('s.available_qty', '>', 0)
          .andWhereRaw('s.available_qty <= s.warning_qty')
      } else if (risk === 'out_of_stock') {
        qb = qb.andWhere('s.available_qty', '<=', 0)
      } else if (risk === 'normal') {
        qb = qb.andWhereRaw('s.available_qty > s.warning_qty')
      }

      const result = await paginateQuery(qb.orderBy('s.updated_at', 'desc'), query, { countColumn: 's.stock_id' })
      return {
        list: result.list.map((row) => ({
          ...row,
          stock_risk: Number(row.available_qty) <= 0
            ? 'none'
            : (Number(row.available_qty) <= Number(row.warning_qty) ? 'has_risk' : 'normal'),
        })),
        total: result.total,
      }
    }

    /** 查询库位级库存分布 */
    async listLocations(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('stock_locations as sl')
        .join('warehouse_locations as loc', 'sl.location_id', 'loc.location_id')
        .join('product_skus as sku', 'sl.sku_id', 'sku.sku_id')
        .leftJoin('products as p', 'sku.product_id', 'p.product_id')
        .join('warehouses as w', 'loc.warehouse_id', 'w.warehouse_id')
        .where('sl.tenant_id', tenantId)
        .select(
          'sl.*',
          'loc.location_code',
          'loc.capacity',
          'sku.sku_code',
          'p.product_name',
          'w.warehouse_name',
          'w.warehouse_code'
        )

      qb = applyFilters(qb, query, STOCK_LOCATION_FILTERS)
      if (hasFilterValue(query.keyword)) {
        const keyword = query.keyword.trim()
        qb = qb.andWhere(function matchKeyword() {
          this.where('sku.sku_code', 'like', `%${keyword}%`)
            .orWhere('p.product_name', 'like', `%${keyword}%`)
        })
      }

      const result = await paginateQuery(qb.orderBy('sl.updated_at', 'desc'), query, { countColumn: 'sl.stock_location_id' })
      const locationIds = [...new Set(result.list.map((row) => row.location_id).filter(Boolean))]
      const aggregateRows = locationIds.length
        ? await db('stock_locations')
          .where({ tenant_id: tenantId })
          .whereIn('location_id', locationIds)
          .select('location_id')
          .sum({ location_total_qty: 'qty' })
          .countDistinct({ location_sku_count: 'sku_id' })
          .groupBy('location_id')
        : []
      const aggregateMap = aggregateRows.reduce((map, row) => {
        map[row.location_id] = {
          location_total_qty: parseInt(row.location_total_qty, 10) || 0,
          location_sku_count: parseInt(row.location_sku_count, 10) || 0,
        }
        return map
      }, {})

      return {
        ...result,
        list: result.list.map((row) => {
          const aggregate = aggregateMap[row.location_id] || {
            location_total_qty: Number(row.qty || 0),
            location_sku_count: 1,
          }
          const capacity = Number(row.capacity || 0)
          const totalQty = aggregate.location_total_qty
          return {
            ...row,
            ...aggregate,
            capacity_used_pct: capacity > 0 ? Math.round((totalQty / capacity) * 100) : 0,
            risk_level: computeLocationRisk(totalQty, capacity),
          }
        }),
      }
    }

    /** 查询库存变动流水 */
    async listLogs(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('stock_logs as l')
        .leftJoin('product_skus as sku', function joinSku() {
          this.on('l.sku_id', 'sku.sku_id').andOn('l.tenant_id', 'sku.tenant_id')
        })
        .leftJoin('products as p', function joinProduct() {
          this.on('sku.product_id', 'p.product_id').andOn('sku.tenant_id', 'p.tenant_id')
        })
        .leftJoin('warehouses as w', function joinWarehouse() {
          this.on('l.warehouse_id', 'w.warehouse_id').andOn('l.tenant_id', 'w.tenant_id')
        })
        .leftJoin('warehouse_locations as loc', function joinLocation() {
          this.on('l.location_id', 'loc.location_id').andOn('l.tenant_id', 'loc.tenant_id')
        })
        .leftJoin('users as u', 'l.operator_id', 'u.user_id')
        .where('l.tenant_id', tenantId)
        .select(
          'l.*',
          'sku.sku_code',
          'p.product_name',
          'w.warehouse_name',
          'w.warehouse_code',
          'loc.location_code',
          'u.display_name as operator_name'
        )

      qb = applyFilters(qb, query, STOCK_LOG_FILTERS)
      if (hasFilterValue(query.keyword)) {
        const keyword = query.keyword.trim()
        qb = qb.andWhere(function matchKeyword() {
          this.where('sku.sku_code', 'like', `%${keyword}%`)
            .orWhere('p.product_name', 'like', `%${keyword}%`)
        })
      }
      return paginateQuery(qb.orderBy('l.created_at', 'desc'), query, {
        countColumn: 'l.log_id',
        defaultPageSize: query.limit ? 200 : 20,
        maxPageSize: 500,
      })
    }

    /** 入库：增加 total/available，可选更新库位 qty */
    async inbound(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const {
        warehouse_id: warehouseId,
        location_id: locationId,
        sku_id: skuId,
        qty,
        remark,
      } = body

      const inboundQty = parseInt(qty, 10)
      if (!warehouseId || !skuId || !inboundQty || inboundQty <= 0) {
        bizError('warehouse_id、sku_id、qty 必填且 qty > 0')
      }

      await assertRowInTenant(db, 'warehouses', tenantId, 'warehouse_id', warehouseId, '仓库')
      const sku = await activeOnly(db('product_skus')).where({ tenant_id: tenantId, sku_id: skuId }).first()
      if (!sku) bizError('SKU 不存在', 40400)

      if (locationId) {
        const loc = await db('warehouse_locations')
          .where({ tenant_id: tenantId, location_id: locationId, warehouse_id: warehouseId })
          .first()
        if (!loc) bizError('库位不存在或不属于该仓库', 40400)
      }

      await db.transaction(async (trx) => {
        const stock = await getOrCreateStock(trx, { tenantId, skuId, warehouseId })
        const before = stock.available_qty

        await updateStockWithVersion(trx, stock, {
          total_qty: stock.total_qty + inboundQty,
          available_qty: stock.available_qty + inboundQty,
        })

        await upsertLocationQty(trx, { tenantId, locationId, skuId, qtyDelta: inboundQty })

        await writeStockLog(trx, {
          tenantId,
          skuId,
          warehouseId,
          locationId,
          actionType: 'inbound',
          qtyChange: inboundQty,
          beforeQty: before,
          afterQty: before + inboundQty,
          operatorId,
          remark,
        })
      })

      await audit(app, ctx, {
        actionCode: 'stock:inbound',
        objectType: 'stock',
        objectId: skuId,
        detail: { warehouseId, locationId, qty: inboundQty },
      })

      return { skuId, warehouseId, qty: inboundQty }
    }

    /** 锁定库存：available → locked，关联订单等 ref_type/ref_id */
    async lock(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const {
        warehouse_id: warehouseId,
        sku_id: skuId,
        qty,
        ref_type: refType = 'order',
        ref_id: refId,
      } = body

      const lockQty = parseInt(qty, 10)
      if (!warehouseId || !skuId || !refId || !lockQty || lockQty <= 0) {
        bizError('参数不完整或 qty 无效')
      }

      let lockId
      await db.transaction(async (trx) => {
        lockId = await lockStock(trx, {
          tenantId,
          operatorId,
          warehouseId,
          skuId,
          qty: lockQty,
          refType,
          refId,
        })
      })

      return { skuId, warehouseId, qty: lockQty, lockId }
    }

    /** 释放锁定：locked → available，标记 lock 为 released */
    async unlock(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { lock_id: lockId } = body
      if (!lockId) bizError('lock_id 不能为空')

      await db.transaction(async (trx) => {
        const lockRow = await trx('stock_locks')
          .where({ tenant_id: tenantId, lock_id: lockId, status: 'active' })
          .forUpdate()
          .first()
        if (!lockRow) bizError('锁定记录不存在', ERROR_CODES.NOT_FOUND)

        const stock = await trx('stocks')
          .where({
            tenant_id: tenantId,
            sku_id: lockRow.sku_id,
            warehouse_id: lockRow.warehouse_id,
          })
          .first()
        if (!stock) bizError('库存记录不存在', ERROR_CODES.NOT_FOUND)

        const before = stock.available_qty
        await updateStockWithVersion(trx, stock, {
          available_qty: stock.available_qty + lockRow.qty,
          locked_qty: stock.locked_qty - lockRow.qty,
        })

        const released = await trx('stock_locks')
          .where({ tenant_id: tenantId, lock_id: lockId, status: 'active' })
          .update({ status: 'released' })
        if (released !== 1) bizError('锁定记录并发冲突', ERROR_CODES.CONFLICT)

        await writeStockLog(trx, {
          tenantId,
          skuId: lockRow.sku_id,
          warehouseId: lockRow.warehouse_id,
          actionType: 'unlock',
          qtyChange: lockRow.qty,
          beforeQty: before,
          afterQty: before + lockRow.qty,
          refType: lockRow.ref_type,
          refId: lockRow.ref_id,
          operatorId,
        })
      })

      return { lockId }
    }

    /** 出库：扣减 total，优先消耗锁定量，否则扣 available */
    async outbound(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const {
        warehouse_id: warehouseId,
        sku_id: skuId,
        qty,
        lock_id: lockId,
        ref_type: refType = 'shipment',
        ref_id: refId,
      } = body

      const outQty = parseInt(qty, 10)
      if (!warehouseId || !skuId || !outQty || outQty <= 0) bizError('参数无效')

      await db.transaction(async (trx) => {
        await outboundStock(trx, {
          tenantId,
          operatorId,
          warehouseId,
          skuId,
          qty: outQty,
          lockId,
          refType,
          refId,
        })
      })

      await audit(app, ctx, {
        actionCode: 'stock:outbound',
        objectType: 'stock',
        objectId: skuId,
        detail: { warehouseId, qty: outQty, lockId },
      })

      return { skuId, warehouseId, qty: outQty }
    }
  }
}
