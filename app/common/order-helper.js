/** 订单与发货辅助：状态常量、分仓、状态日志、拣货库位建议。详见 docs/INVENTORY_CONCURRENCY.md */
const { idGen, bizError } = require('./org-helper')
const { ERROR_CODES } = require('./error-codes')
const { generateOrderNo } = require('./business-no')

/** 订单状态：pending_payment → paid → allocated → shipped */
const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment', // 待支付（导入后初始状态）
  PAID: 'paid',                       // 已支付（库存已锁定）
  ALLOCATED: 'allocated',             // 已分仓（已分配履约仓库）
  SHIPPED: 'shipped',                 // 已发货（已出库）
  CANCELLED: 'cancelled',             // 已取消
}

/** 发货单状态：created → picking → picked → shipped */
const SHIPMENT_STATUS = {
  CREATED: 'created',   // 已创建（待拣货）
  PICKING: 'picking',   // 拣货中（拣货员已领取任务）
  PICKED: 'picked',     // 已拣货（待打包发货）
  PACKED: 'packed',     // 已打包（预留状态）
  SHIPPED: 'shipped',   // 已发货（已出库）
}

async function writeOrderStatusLog(trx, payload) {
  await trx('order_status_logs').insert({
    log_id: idGen.next('olog'),
    tenant_id: payload.tenantId,
    order_id: payload.orderId,
    from_status: payload.fromStatus || null,
    to_status: payload.toStatus,
    remark: payload.remark || null,
    operator_id: payload.operatorId || null,
  })
}

function assertOrderStatus(order, allowed, label = '操作') {
  if (!allowed.includes(order.status)) {
    bizError(`订单状态为 ${order.status}，无法执行${label}`, ERROR_CODES.CONFLICT)
  }
}

/** 按 sku_id 聚合订单明细数量（同一 SKU 多行合并） */
function aggregateItemsBySku(items) {
  const qtyBySku = new Map()
  for (const item of items) {
    const skuId = item.sku_id
    if (!skuId) continue
    const qty = parseInt(item.qty, 10) || 0
    qtyBySku.set(skuId, (qtyBySku.get(skuId) || 0) + qty)
  }
  return qtyBySku
}

/**
 * 智能分仓：批量拉取仓库与库存矩阵，选各 SKU 均可满足且最小可用量最大的仓。
 * 须在调用方事务内调用，与 lockStock 同事务完成选仓+锁定。
 */
async function findWarehouseForItems(trx, tenantId, items) {
  const qtyBySku = aggregateItemsBySku(items)
  if (!qtyBySku.size) bizError('订单无有效明细', ERROR_CODES.BAD_REQUEST)

  const warehouses = await trx('warehouses')
    .where({ tenant_id: tenantId, status: 'active' })
    .orderBy('created_at', 'asc')
  if (!warehouses.length) bizError('无可用仓库', ERROR_CODES.CONFLICT)

  const warehouseIds = warehouses.map((wh) => wh.warehouse_id)
  const skuIds = [...qtyBySku.keys()]

  const stockRows = await trx('stocks')
    .where({ tenant_id: tenantId })
    .whereIn('warehouse_id', warehouseIds)
    .whereIn('sku_id', skuIds)
    .select('warehouse_id', 'sku_id', 'available_qty')

  const matrix = new Map()
  for (const row of stockRows) {
    if (!matrix.has(row.warehouse_id)) matrix.set(row.warehouse_id, new Map())
    matrix.get(row.warehouse_id).set(row.sku_id, Number(row.available_qty) || 0)
  }

  let best = null
  let bestScore = -1

  for (const wh of warehouses) {
    let canFulfill = true
    let minAvailable = Infinity
    const whStock = matrix.get(wh.warehouse_id) || new Map()

    for (const [skuId, needQty] of qtyBySku) {
      const available = whStock.get(skuId) || 0
      if (available < needQty) {
        canFulfill = false
        break
      }
      minAvailable = Math.min(minAvailable, available)
    }

    if (canFulfill && minAvailable > bestScore) {
      bestScore = minAvailable
      best = wh
    }
  }

  if (!best) bizError('无仓库可满足订单库存需求', ERROR_CODES.CONFLICT)
  return {
    warehouse: best,
    reason: `选择仓库 ${best.warehouse_name}（各 SKU 可用库存均满足，最小可用 ${bestScore}）`,
  }
}

/** 优先沿用 order.warehouse_id，否则自动选仓 */
async function resolveWarehouseForOrder(db, tenantId, order, items) {
  if (order.warehouse_id) {
    // 优先沿用已绑定的仓库
    const warehouse = await db('warehouses')
      .where({ tenant_id: tenantId, warehouse_id: order.warehouse_id })
      .first()
    if (!warehouse) bizError('仓库不存在', ERROR_CODES.NOT_FOUND)
    return { warehouse, reason: '沿用支付时选定仓库' }
  }
  // 未绑定仓库，自动选仓
  return findWarehouseForItems(db, tenantId, items)
}

async function applyOrderAllocation(trx, { tenantId, orderId, fromStatus, warehouse, reason, operatorId }) {
  await trx('orders').where({ order_id: orderId }).update({
    status: ORDER_STATUS.ALLOCATED,
    warehouse_id: warehouse.warehouse_id,
  })
  await writeOrderStatusLog(trx, {
    tenantId,
    orderId,
    fromStatus,
    toStatus: ORDER_STATUS.ALLOCATED,
    remark: reason,
    operatorId,
  })
}

/** 建议拣货库位：取该 SKU 在仓库中 qty 最大的库位 */
async function suggestLocationForSku(trx, tenantId, warehouseId, skuId) {
  const row = await trx('stock_locations as sl')
    .join('warehouse_locations as loc', 'sl.location_id', 'loc.location_id')
    .where('sl.tenant_id', tenantId)
    .andWhere('loc.warehouse_id', warehouseId)
    .andWhere('sl.sku_id', skuId)
    .andWhere('sl.qty', '>', 0)
    .orderBy('sl.qty', 'desc')  // 按库存数量降序
    .select('sl.location_id', 'loc.location_code')
    .first()
  return row?.location_id || null
}

module.exports = {
  ORDER_STATUS,
  SHIPMENT_STATUS,
  generateOrderNo,
  writeOrderStatusLog,
  assertOrderStatus,
  aggregateItemsBySku,
  findWarehouseForItems,
  resolveWarehouseForOrder,
  applyOrderAllocation,
  suggestLocationForSku,
}
