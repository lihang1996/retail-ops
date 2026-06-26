/** 库存底层操作：流水、乐观锁、库位增减、锁定/出库。详见 docs/INVENTORY_CONCURRENCY.md */
const { idGen, bizError } = require('./org-helper')
const { ERROR_CODES } = require('./error-codes')

async function writeStockLog(trx, payload) {
  await trx('stock_logs').insert({
    log_id: idGen.next('slog'),
    tenant_id: payload.tenantId,
    sku_id: payload.skuId,
    warehouse_id: payload.warehouseId,
    location_id: payload.locationId || null,
    action_type: payload.actionType,
    qty_change: payload.qtyChange,
    before_qty: payload.beforeQty,
    after_qty: payload.afterQty,
    ref_type: payload.refType || null,
    ref_id: payload.refId || null,
    operator_id: payload.operatorId || null,
    remark: payload.remark || null,
  })
}

/** 获取或懒创建 stocks 行；并发 insert 由唯一键兜底 */
async function getOrCreateStock(trx, { tenantId, skuId, warehouseId }) {
  let stock = await trx('stocks')
    .where({ tenant_id: tenantId, sku_id: skuId, warehouse_id: warehouseId })
    .first()
  if (stock) return stock

  const stockId = idGen.next('stock')
  try {
    await trx('stocks').insert({
      stock_id: stockId,
      tenant_id: tenantId,
      sku_id: skuId,
      warehouse_id: warehouseId,
      total_qty: 0,
      available_qty: 0,
      locked_qty: 0,
      in_transit_qty: 0,
      version: 0,
    })
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY' && e.errno !== 1062) throw e
  }

  stock = await trx('stocks')
    .where({ tenant_id: tenantId, sku_id: skuId, warehouse_id: warehouseId })
    .first()
  if (!stock) bizError('库存记录创建失败', ERROR_CODES.INTERNAL)
  return stock
}

/** 乐观锁更新 stocks；version 不匹配报 CONFLICT */
async function updateStockWithVersion(trx, stock, patch) {
  const affected = await trx('stocks')
    .where({ stock_id: stock.stock_id, version: stock.version })
    .update({ ...patch, version: stock.version + 1 })

  if (!affected) bizError('库存并发冲突，请重试', ERROR_CODES.CONFLICT)
}

/** 原子增减库位 qty；扣减后不可为负 */
async function upsertLocationQty(trx, { tenantId, locationId, skuId, qtyDelta }) {
  if (!locationId) return

  const delta = parseInt(qtyDelta, 10)
  if (!delta) return

  const baseWhere = { tenant_id: tenantId, location_id: locationId, sku_id: skuId }

  if (delta > 0) {
    const updated = await trx('stock_locations')
      .where(baseWhere)
      .update({ qty: trx.raw('qty + ?', [delta]) })
    if (updated === 1) return

    try {
      await trx('stock_locations').insert({
        stock_location_id: idGen.next('sloc'),
        tenant_id: tenantId,
        location_id: locationId,
        sku_id: skuId,
        qty: delta,
      })
      return
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY' && e.errno !== 1062) throw e
      const retryUpdated = await trx('stock_locations')
        .where(baseWhere)
        .update({ qty: trx.raw('qty + ?', [delta]) })
      if (retryUpdated !== 1) bizError('库位库存并发冲突', ERROR_CODES.CONFLICT)
      return
    }
  }

  const decreased = await trx('stock_locations')
    .where(baseWhere)
    .where('qty', '>=', -delta)
    .update({ qty: trx.raw('qty + ?', [delta]) })
  if (decreased !== 1) bizError('库位库存不足', ERROR_CODES.CONFLICT)
}

/**
 * 在已有事务内锁定库存，返回 lockId。
 * 调用方须在同一事务内先完成选仓再调用；失败时由事务回滚。
 */
async function lockStock(trx, {
  tenantId,
  operatorId,
  warehouseId,
  skuId,
  qty,
  refType = 'order',
  refId,
}) {
  const lockQty = parseInt(qty, 10)
  if (!warehouseId || !skuId || !refId || !lockQty || lockQty <= 0) {
    bizError('参数不完整或 qty 无效')
  }

  const stock = await trx('stocks')
    .where({ tenant_id: tenantId, sku_id: skuId, warehouse_id: warehouseId })
    .first()
  if (!stock || stock.available_qty < lockQty) bizError('可用库存不足', ERROR_CODES.CONFLICT)

  const before = stock.available_qty
  await updateStockWithVersion(trx, stock, {
    available_qty: stock.available_qty - lockQty,
    locked_qty: stock.locked_qty + lockQty,
  })

  const lockId = idGen.next('lock')
  await trx('stock_locks').insert({
    lock_id: lockId,
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

  return lockId
}

/**
 * 在已有事务内出库，可关联 lock_id 消耗锁定量
 */
async function outboundStock(trx, {
  tenantId,
  operatorId,
  warehouseId,
  skuId,
  qty,
  lockId,
  refType = 'shipment',
  refId,
}) {
  const outQty = parseInt(qty, 10)
  if (!warehouseId || !skuId || !outQty || outQty <= 0) bizError('参数无效')

  const stock = await trx('stocks')
    .where({ tenant_id: tenantId, sku_id: skuId, warehouse_id: warehouseId })
    .first()
  if (!stock) bizError('库存记录不存在', ERROR_CODES.NOT_FOUND)

  let deductFromLocked = 0
  if (lockId) {
    const lockAffected = await trx('stock_locks')
      .where({ tenant_id: tenantId, lock_id: lockId, status: 'active' })
      .where('qty', '>=', outQty)
      .update({
        qty: trx.raw('qty - ?', [outQty]),
        status: trx.raw("CASE WHEN qty - ? <= 0 THEN 'consumed' ELSE 'active' END", [outQty]),
      })
    if (lockAffected !== 1) bizError('锁定记录不存在或数量不足', ERROR_CODES.CONFLICT)
    deductFromLocked = outQty
  } else if (stock.available_qty < outQty) {
    bizError('可用库存不足', ERROR_CODES.CONFLICT)
  }

  const before = stock.total_qty
  const patch = { total_qty: stock.total_qty - outQty }
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
}

module.exports = {
  writeStockLog,
  getOrCreateStock,
  updateStockWithVersion,
  upsertLocationQty,
  lockStock,
  outboundStock,
}
