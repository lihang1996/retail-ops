const { idGen, bizError } = require('./org-helper')

const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  ALLOCATED: 'allocated',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
}

const SHIPMENT_STATUS = {
  CREATED: 'created',
  PICKING: 'picking',
  PICKED: 'picked',
  PACKED: 'packed',
  SHIPPED: 'shipped',
}

function generateOrderNo() {
  const d = new Date()
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  return `ORD${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
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
    bizError(`订单状态为 ${order.status}，无法执行${label}`, 40900)
  }
}

async function findWarehouseForItems(trx, tenantId, items) {
  const warehouses = await trx('warehouses')
    .where({ tenant_id: tenantId, status: 'active' })
    .orderBy('created_at', 'asc')

  if (!warehouses.length) bizError('无可用仓库', 40900)

  let best = null
  let bestScore = -1

  for (const wh of warehouses) {
    let canFulfill = true
    let minAvailable = Infinity

    for (const item of items) {
      const stock = await trx('stocks')
        .where({ tenant_id: tenantId, warehouse_id: wh.warehouse_id, sku_id: item.sku_id })
        .first()
      const available = stock?.available_qty || 0
      if (available < item.qty) {
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

  if (!best) bizError('无仓库可满足订单库存需求', 40900)
  return { warehouse: best, reason: `选择仓库 ${best.warehouse_name}（各 SKU 可用库存均满足，最小可用 ${bestScore}）` }
}

async function resolveWarehouseForOrder(db, tenantId, order, items) {
  if (order.warehouse_id) {
    const warehouse = await db('warehouses')
      .where({ tenant_id: tenantId, warehouse_id: order.warehouse_id })
      .first()
    if (!warehouse) bizError('仓库不存在', 40400)
    return { warehouse, reason: '沿用支付时选定仓库' }
  }
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

async function suggestLocationForSku(trx, tenantId, warehouseId, skuId) {
  const row = await trx('stock_locations as sl')
    .join('warehouse_locations as loc', 'sl.location_id', 'loc.location_id')
    .where('sl.tenant_id', tenantId)
    .andWhere('loc.warehouse_id', warehouseId)
    .andWhere('sl.sku_id', skuId)
    .andWhere('sl.qty', '>', 0)
    .orderBy('sl.qty', 'desc')
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
  findWarehouseForItems,
  resolveWarehouseForOrder,
  applyOrderAllocation,
  suggestLocationForSku,
}
