const { idGen, bizError } = require('./org-helper')

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

async function getOrCreateStock(trx, { tenantId, skuId, warehouseId }) {
  let stock = await trx('stocks')
    .where({ tenant_id: tenantId, sku_id: skuId, warehouse_id: warehouseId })
    .first()

  if (!stock) {
    const stockId = idGen.next('stock')
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
    stock = await trx('stocks').where({ stock_id: stockId }).first()
  }
  return stock
}

async function updateStockWithVersion(trx, stock, patch) {
  const affected = await trx('stocks')
    .where({ stock_id: stock.stock_id, version: stock.version })
    .update({ ...patch, version: stock.version + 1 })

  if (!affected) bizError('库存并发冲突，请重试', 40900)
}

async function upsertLocationQty(trx, { tenantId, locationId, skuId, qtyDelta }) {
  if (!locationId) return

  const row = await trx('stock_locations')
    .where({ tenant_id: tenantId, location_id: locationId, sku_id: skuId })
    .first()

  if (!row) {
    if (qtyDelta < 0) bizError('库位库存不足', 40900)
    await trx('stock_locations').insert({
      stock_location_id: idGen.next('sloc'),
      tenant_id: tenantId,
      location_id: locationId,
      sku_id: skuId,
      qty: qtyDelta,
    })
    return
  }

  const nextQty = row.qty + qtyDelta
  if (nextQty < 0) bizError('库位库存不足', 40900)
  await trx('stock_locations').where({ stock_location_id: row.stock_location_id }).update({ qty: nextQty })
}

module.exports = {
  writeStockLog,
  getOrCreateStock,
  updateStockWithVersion,
  upsertLocationQty,
}
