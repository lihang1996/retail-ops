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
} = require('../common/stock-helper')

module.exports = (app) => {
  const BaseService = require('@lh199.123/elpis').Service.Bass(app)

  return class StockService extends BaseService {
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

      if (query.warehouse_id) qb = qb.andWhere('s.warehouse_id', query.warehouse_id)
      if (query.sku_id) qb = qb.andWhere('s.sku_id', query.sku_id)
      if (query.sku_code) qb = qb.andWhere('sku.sku_code', 'like', `%${query.sku_code}%`)
      if (query.risk === 'low') qb = qb.andWhereRaw('s.available_qty <= s.warning_qty')

      const list = await qb.orderBy('s.updated_at', 'desc')
      return { list, total: list.length }
    }

    async listLocations(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('stock_locations as sl')
        .join('warehouse_locations as loc', 'sl.location_id', 'loc.location_id')
        .join('product_skus as sku', 'sl.sku_id', 'sku.sku_id')
        .join('warehouses as w', 'loc.warehouse_id', 'w.warehouse_id')
        .where('sl.tenant_id', tenantId)
        .select(
          'sl.*',
          'loc.location_code',
          'sku.sku_code',
          'w.warehouse_name'
        )

      if (query.warehouse_id) qb = qb.andWhere('loc.warehouse_id', query.warehouse_id)
      if (query.sku_id) qb = qb.andWhere('sl.sku_id', query.sku_id)

      const list = await qb.orderBy('sl.updated_at', 'desc')
      return { list, total: list.length }
    }

    async listLogs(ctx, query = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)

      let qb = db('stock_logs as l')
        .leftJoin('product_skus as sku', 'l.sku_id', 'sku.sku_id')
        .where('l.tenant_id', tenantId)
        .select('l.*', 'sku.sku_code')

      if (query.sku_id) qb = qb.andWhere('l.sku_id', query.sku_id)
      if (query.warehouse_id) qb = qb.andWhere('l.warehouse_id', query.warehouse_id)
      if (query.action_type) qb = qb.andWhere('l.action_type', query.action_type)

      const list = await qb.orderBy('l.created_at', 'desc').limit(200)
      return { list, total: list.length }
    }

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

      await db.transaction(async (trx) => {
        const stock = await trx('stocks')
          .where({ tenant_id: tenantId, sku_id: skuId, warehouse_id: warehouseId })
          .first()
        if (!stock || stock.available_qty < lockQty) bizError('可用库存不足', 40900)

        const before = stock.available_qty
        await updateStockWithVersion(trx, stock, {
          available_qty: stock.available_qty - lockQty,
          locked_qty: stock.locked_qty + lockQty,
        })

        await trx('stock_locks').insert({
          lock_id: idGen.next('lock'),
          tenant_id: tenantId,
          sku_id: skuId,
          warehouse_id: warehouseId,
          qty: lockQty,
          ref_type: refType,
          ref_id: refId,
          status: 'active',
        })

        await writeStockLog(trx, {
          tenantId,
          skuId,
          warehouseId,
          actionType: 'lock',
          qtyChange: -lockQty,
          beforeQty: before,
          afterQty: before - lockQty,
          refType,
          refId,
          operatorId,
        })
      })

      return { skuId, warehouseId, qty: lockQty }
    }

    async unlock(ctx, body = {}) {
      const db = ensureDb(app)
      const tenantId = getTenantId(ctx)
      const operatorId = getOperatorId(ctx)
      const { lock_id: lockId } = body
      if (!lockId) bizError('lock_id 不能为空')

      await db.transaction(async (trx) => {
        const lockRow = await trx('stock_locks')
          .where({ tenant_id: tenantId, lock_id: lockId, status: 'active' })
          .first()
        if (!lockRow) bizError('锁定记录不存在', 40400)

        const stock = await trx('stocks')
          .where({
            tenant_id: tenantId,
            sku_id: lockRow.sku_id,
            warehouse_id: lockRow.warehouse_id,
          })
          .first()
        if (!stock) bizError('库存记录不存在', 40400)

        const before = stock.available_qty
        await updateStockWithVersion(trx, stock, {
          available_qty: stock.available_qty + lockRow.qty,
          locked_qty: stock.locked_qty - lockRow.qty,
        })

        await trx('stock_locks').where({ lock_id: lockId }).update({ status: 'released' })

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
        const stock = await trx('stocks')
          .where({ tenant_id: tenantId, sku_id: skuId, warehouse_id: warehouseId })
          .first()

        if (!stock) bizError('库存记录不存在', 40400)

        let deductFromLocked = 0
        if (lockId) {
          const lockRow = await trx('stock_locks')
            .where({ tenant_id: tenantId, lock_id: lockId, status: 'active' })
            .first()
          if (!lockRow) bizError('锁定记录不存在', 40400)
          if (lockRow.qty < outQty) bizError('锁定数量不足', 40900)

          const remainLock = lockRow.qty - outQty
          await trx('stock_locks').where({ lock_id: lockId }).update({
            qty: remainLock,
            status: remainLock === 0 ? 'consumed' : 'active',
          })
          deductFromLocked = outQty
        } else if (stock.available_qty < outQty) {
          bizError('可用库存不足', 40900)
        }

        const before = stock.total_qty
        const patch = {
          total_qty: stock.total_qty - outQty,
        }
        if (deductFromLocked) {
          patch.locked_qty = stock.locked_qty - deductFromLocked
        } else {
          patch.available_qty = stock.available_qty - outQty
        }

        await updateStockWithVersion(trx, stock, patch)

        await writeStockLog(trx, {
          tenantId,
          skuId,
          warehouseId,
          actionType: 'outbound',
          qtyChange: -outQty,
          beforeQty: before,
          afterQty: before - outQty,
          refType,
          refId,
          operatorId,
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
