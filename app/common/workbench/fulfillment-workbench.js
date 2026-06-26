const { ensureDb, getTenantId } = require('../org-helper')
const { ORDER_STATUS } = require('../order-helper')
const { todayStart } = require('../date-helper')
const { resolveCurrentStep, applyFulfillmentTabFilter } = require('../fulfillment-state-machine')
const { buildCountMap, summarizeItems, countAllocatedOrders } = require('./workbench-helpers')

async function loadFulfillmentWorkbench(app, ctx, query = {}) {
  const db = ensureDb(app)
  const tenantId = getTenantId(ctx)
  const tab = query.tab || 'all'
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(query.page_size, 10) || 20, 1), 100)

  const orderStatusRows = await db('orders')
    .where({ tenant_id: tenantId })
    .whereNot('status', 'cancelled')
    .select('status')
    .count('order_id as cnt')
    .groupBy('status')

  const shipmentStatusRows = await db('shipments as sh')
    .join('orders as o', function joinShipmentOrder() {
      this.on('sh.order_id', 'o.order_id').andOn('sh.tenant_id', 'o.tenant_id')
    })
    .where('sh.tenant_id', tenantId)
    .andWhere('o.status', ORDER_STATUS.ALLOCATED)
    .select('sh.status as status')
    .countDistinct('sh.order_id as cnt')
    .groupBy('sh.status')

  const orderStatusCounts = buildCountMap(orderStatusRows)
  const shipmentStatusCounts = buildCountMap(shipmentStatusRows)

  let orderQb = db('orders as o')
    .leftJoin('stores as s', 'o.store_id', 's.store_id')
    .leftJoin('warehouses as w', 'o.warehouse_id', 'w.warehouse_id')
    .leftJoin('customers as c', 'o.customer_id', 'c.customer_id')
    .where('o.tenant_id', tenantId)
    .whereNot('o.status', 'cancelled')
    .select(
      'o.*',
      's.store_name',
      'w.warehouse_name',
      'c.customer_name'
    )

  if (query.date_scope === 'today') orderQb = orderQb.andWhere('o.created_at', '>=', todayStart())

  if (query.order_no) orderQb = orderQb.andWhere('o.order_no', 'like', `%${query.order_no}%`)
  if (query.store_name) orderQb = orderQb.andWhere('s.store_name', 'like', `%${query.store_name}%`)
  if (query.customer_name) orderQb = orderQb.andWhere('c.customer_name', 'like', `%${query.customer_name}%`)
  if (query.warehouse_name) orderQb = orderQb.andWhere('w.warehouse_name', 'like', `%${query.warehouse_name}%`)
  if (query.shipment_no) {
    orderQb = orderQb.whereExists(function existsShipmentNo() {
      this.select(1)
        .from('shipments as sh')
        .whereRaw('sh.order_id = o.order_id')
        .andWhere('sh.tenant_id', tenantId)
        .andWhere('sh.shipment_no', 'like', `%${query.shipment_no}%`)
    })
  }
  if (query.keyword) {
    orderQb = orderQb.andWhere(function matchKeyword() {
      this.where('s.store_name', 'like', `%${query.keyword}%`)
        .orWhere('c.customer_name', 'like', `%${query.keyword}%`)
        .orWhereExists(function existsItemKeyword() {
          this.select(1)
            .from('order_items as oi')
            .whereRaw('oi.order_id = o.order_id')
            .andWhere('oi.tenant_id', tenantId)
            .andWhere(function matchItem() {
              this.where('oi.sku_code', 'like', `%${query.keyword}%`)
                .orWhere('oi.product_name', 'like', `%${query.keyword}%`)
            })
        })
    })
  }

  applyFulfillmentTabFilter(orderQb, tab, tenantId)

  const countRow = await orderQb
    .clone()
    .clearSelect()
    .count({ cnt: 'o.order_id' })
    .first()
  const total = parseInt(countRow && countRow.cnt, 10) || 0

  const orders = await orderQb
    .clone()
    .clearSelect()
    .select(
      'o.*',
      's.store_name',
      'w.warehouse_name',
      'c.customer_name',
    )
    .orderBy('o.created_at', 'desc')
    .offset((page - 1) * pageSize)
    .limit(pageSize)

  const orderIds = orders.map((o) => o.order_id)

  const itemRows = orderIds.length
    ? await db('order_items').where({ tenant_id: tenantId }).whereIn('order_id', orderIds)
    : []
  const shipmentRows = orderIds.length
    ? await db('shipments as sh')
      .where('sh.tenant_id', tenantId)
      .whereIn('sh.order_id', orderIds)
      .orderBy('sh.created_at', 'desc')
    : []

  const itemsByOrder = new Map()
  itemRows.forEach((item) => {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, [])
    itemsByOrder.get(item.order_id).push(item)
  })

  const activeShipmentByOrder = new Map()
  shipmentRows.forEach((sh) => {
    if (!activeShipmentByOrder.has(sh.order_id) && sh.status !== 'shipped') {
      activeShipmentByOrder.set(sh.order_id, sh)
    }
  })

  const latestShipmentByOrder = new Map()
  shipmentRows.forEach((sh) => {
    if (!latestShipmentByOrder.has(sh.order_id)) latestShipmentByOrder.set(sh.order_id, sh)
  })

  const rows = orders.map((order) => {
    const items = itemsByOrder.get(order.order_id) || []
    const shipment = activeShipmentByOrder.get(order.order_id) || latestShipmentByOrder.get(order.order_id) || null
    const lockedQty = items.filter((i) => i.lock_id).length
    return {
      order_id: order.order_id,
      order_no: order.order_no,
      store_name: order.store_name,
      customer_name: order.customer_name,
      total_amount: order.total_amount,
      order_status: order.status,
      warehouse_id: order.warehouse_id,
      warehouse_name: order.warehouse_name,
      item_summary: summarizeItems(items),
      item_count: items.length,
      lock_status: lockedQty > 0 ? 'locked' : order.status === ORDER_STATUS.PENDING_PAYMENT ? 'none' : 'unlocked',
      shipment_id: (shipment && shipment.shipment_id) || null,
      shipment_no: (shipment && shipment.shipment_no) || null,
      shipment_status: (shipment && shipment.status) || null,
      current_step: resolveCurrentStep(order, shipment),
      created_at: order.created_at,
    }
  })

  const allocatedCount = await countAllocatedOrders(db, tenantId)

  const riskRow = await db('stocks')
    .where({ tenant_id: tenantId })
    .where('available_qty', '>', 0)
    .whereRaw('available_qty <= warning_qty')
    .count('sku_id as cnt')
    .first()

  const auditLogs = await db('audit_logs as a')
    .leftJoin('users as u', 'a.operator_id', 'u.user_id')
    .where('a.tenant_id', tenantId)
    .whereIn('a.action_code', [
      'order:import',
      'order:pay',
      'order:allocate',
      'shipment:create',
      'shipment:pick',
      'shipment:ship',
      'stock:inbound',
      'stock:outbound',
    ])
    .select('a.*', 'u.display_name as operator_name')
    .orderBy('a.created_at', 'desc')
    .limit(12)

  return {
    tab,
    orderStatusCounts,
    shipmentStatusCounts,
    summary: {
      pendingPayment: orderStatusCounts.pending_payment || 0,
      paid: orderStatusCounts.paid || 0,
      allocated: allocatedCount,
      awaitPick: shipmentStatusCounts.created || 0,
      picking: shipmentStatusCounts.picking || 0,
      awaitOutbound: shipmentStatusCounts.picked || 0,
      shipped: orderStatusCounts.shipped || 0,
      stockRiskSkuCount: parseInt(riskRow && riskRow.cnt, 10) || 0,
    },
    rows,
    total,
    page,
    pageSize,
    recentAuditLogs: auditLogs,
  }
}

module.exports = {
  loadFulfillmentWorkbench,
}
