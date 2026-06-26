const { ensureDb, getTenantId } = require('../org-helper')
const { ORDER_STATUS } = require('../order-helper')
const { applyEndingSoonEndAtFilter } = require('../marketing-helper')
const { PAID_ORDER_STATUSES } = require('../domain-constants')
const { todayStart } = require('../date-helper')
const { ACTIVE_SHIPMENT_STATUSES } = require('../fulfillment-state-machine')
const { buildCountMap, countAllocatedOrders } = require('./workbench-helpers')
const {
  buildOrderFunnel,
  buildServiceMetrics,
  buildTrendSeries,
  buildApprovalSummary,
  buildCustomerSummary,
  buildMarketingSummary,
  buildLocationRiskSummary,
  buildWarehouseSnapshot,
  buildTopStores,
  buildTopProducts,
} = require('./ops-summaries')

const PAID_STATUSES = PAID_ORDER_STATUSES

async function loadOpsWorkbench(app, ctx) {
  const db = ensureDb(app)
  const tenantId = getTenantId(ctx)
  const sinceToday = todayStart()

  const [
    pendingApprovalRow,
    todayAuditRow,
    revenueRow,
    customerRow,
    marketingRow,
  ] = await Promise.all([
    db('approvals')
      .where({ tenant_id: tenantId, status: 'pending' })
      .count('approval_id as cnt')
      .first(),
    db('audit_logs')
      .where({ tenant_id: tenantId })
      .where('created_at', '>=', sinceToday)
      .count('audit_id as cnt')
      .first(),
    db('orders')
      .where({ tenant_id: tenantId })
      .whereIn('status', PAID_STATUSES)
      .sum('total_amount as total')
      .first(),
    db('customers')
      .where({ tenant_id: tenantId })
      .count('customer_id as cnt')
      .first(),
    db('marketing_activities')
      .where({ tenant_id: tenantId, status: 'active' })
      .count('activity_id as cnt')
      .first(),
  ])

  const [orderStatusRows, allocatedCount, shipmentStatusRows] = await Promise.all([
    db('orders')
      .where({ tenant_id: tenantId })
      .whereNot('status', 'cancelled')
      .select('status')
      .count('order_id as cnt')
      .groupBy('status'),
    countAllocatedOrders(db, tenantId),
    db('shipments as sh')
      .join('orders as o', function joinShipmentOrder() {
        this.on('sh.order_id', 'o.order_id').andOn('sh.tenant_id', 'o.tenant_id')
      })
      .where('sh.tenant_id', tenantId)
      .andWhere('o.status', ORDER_STATUS.ALLOCATED)
      .whereIn('sh.status', ACTIVE_SHIPMENT_STATUSES)
      .select('sh.status as status')
      .countDistinct('sh.order_id as cnt')
      .groupBy('sh.status'),
  ])
  const orderStatusCounts = buildCountMap(orderStatusRows)
  const shipmentStatusCounts = buildCountMap(shipmentStatusRows)

  const [todayOrderRow, newCustomerRow] = await Promise.all([
    db('orders')
      .where({ tenant_id: tenantId })
      .where('created_at', '>=', sinceToday)
      .whereIn('status', PAID_STATUSES)
      .count('order_id as cnt')
      .sum('total_amount as total')
      .first(),
    db('customers')
      .where({ tenant_id: tenantId })
      .where('created_at', '>=', sinceToday)
      .count('customer_id as cnt')
      .first(),
  ])

  const [
    warehouseCountRow,
    locationRow,
    stockedLocationRow,
    stockSnapshotRow,
  ] = await Promise.all([
    db('warehouses')
      .where({ tenant_id: tenantId, status: 'active' })
      .count('warehouse_id as cnt')
      .first(),
    db('warehouse_locations')
      .where({ tenant_id: tenantId })
      .count('location_id as location_count')
      .sum('capacity as total_capacity')
      .first(),
    db('stock_locations as sl')
      .join('warehouse_locations as loc', function joinLocation() {
        this.on('sl.location_id', 'loc.location_id').andOn('sl.tenant_id', 'loc.tenant_id')
      })
      .where('sl.tenant_id', tenantId)
      .countDistinct('sl.location_id as stocked_location_count')
      .sum('sl.qty as stocked_qty')
      .first(),
    db('stocks')
      .where({ tenant_id: tenantId })
      .countDistinct('sku_id as stock_sku_count')
      .sum({
        total_qty: 'total_qty',
        available_qty: 'available_qty',
        locked_qty: 'locked_qty',
      })
      .select(
        db.raw('SUM(CASE WHEN available_qty > 0 AND available_qty <= warning_qty THEN 1 ELSE 0 END) as risk_sku_count'),
        db.raw('SUM(CASE WHEN available_qty <= 0 THEN 1 ELSE 0 END) as out_of_stock_sku_count')
      )
      .first(),
  ])

  const [topStores, riskSkus, recentOrders, recentAuditLogs] = await Promise.all([
    db('orders as o')
      .leftJoin('stores as s', 'o.store_id', 's.store_id')
      .where('o.tenant_id', tenantId)
      .whereIn('o.status', PAID_STATUSES)
      .select('o.store_id', 's.store_name')
      .count('o.order_id as order_count')
      .sum('o.total_amount as revenue')
      .groupBy('o.store_id', 's.store_name')
      .orderBy('revenue', 'desc')
      .limit(5),
    db('stocks as st')
      .join('product_skus as sku', 'st.sku_id', 'sku.sku_id')
      .leftJoin('products as p', 'sku.product_id', 'p.product_id')
      .leftJoin('warehouses as w', 'st.warehouse_id', 'w.warehouse_id')
      .where('st.tenant_id', tenantId)
      .where('st.available_qty', '>', 0)
      .whereRaw('st.available_qty <= st.warning_qty')
      .select(
        'st.stock_id',
        'st.sku_id',
        'sku.sku_code',
        'p.product_name',
        'w.warehouse_name',
        'st.available_qty',
        'st.warning_qty',
        'st.locked_qty',
        'st.updated_at'
      )
      .orderBy('st.available_qty', 'asc')
      .limit(8),
    db('orders as o')
      .leftJoin('stores as s', 'o.store_id', 's.store_id')
      .leftJoin('customers as c', 'o.customer_id', 'c.customer_id')
      .leftJoin('warehouses as w', 'o.warehouse_id', 'w.warehouse_id')
      .where('o.tenant_id', tenantId)
      .whereNot('o.status', 'cancelled')
      .select(
        'o.order_id',
        'o.order_no',
        'o.status',
        'o.total_amount',
        'o.created_at',
        's.store_name',
        'c.customer_name',
        'w.warehouse_name'
      )
      .orderBy('o.created_at', 'desc')
      .limit(8),
    db('audit_logs as a')
      .leftJoin('users as u', 'a.operator_id', 'u.user_id')
      .where('a.tenant_id', tenantId)
      .select(
        'a.audit_id',
        'a.action_code',
        'a.object_type',
        'a.object_id',
        'a.created_at',
        'u.display_name as operator_name'
      )
      .orderBy('a.created_at', 'desc')
      .limit(8),
  ])

  const trendSince = new Date()
  trendSince.setDate(trendSince.getDate() - 6)
  trendSince.setHours(0, 0, 0, 0)

  const [
    trendRows,
    approvalRows,
    customerOrderRows,
    marketingProductRow,
    endingSoonRow,
  ] = await Promise.all([
    db('orders')
      .where({ tenant_id: tenantId })
      .where('created_at', '>=', trendSince)
      .whereIn('status', PAID_STATUSES)
      .select(db.raw('DATE_FORMAT(created_at, "%Y-%m-%d") as day'))
      .count('order_id as order_count')
      .sum('total_amount as gmv')
      .groupByRaw('DATE_FORMAT(created_at, "%Y-%m-%d")')
      .orderBy('day', 'asc'),
    db('approvals')
      .where({ tenant_id: tenantId })
      .select('status')
      .count('approval_id as cnt')
      .groupBy('status'),
    db('customers as c')
      .leftJoin('orders as o', function joinOrders() {
        this.on('c.customer_id', 'o.customer_id').andOn('c.tenant_id', 'o.tenant_id')
      })
      .where('c.tenant_id', tenantId)
      .select('c.customer_id')
      .count('o.order_id as order_count')
      .sum('o.total_amount as total_spent')
      .groupBy('c.customer_id'),
    db('marketing_activity_products')
      .where({ tenant_id: tenantId })
      .countDistinct('product_id as cnt')
      .first(),
    applyEndingSoonEndAtFilter(
      db('marketing_activities').where({ tenant_id: tenantId, status: 'active' }),
      'end_at',
    )
      .count('activity_id as cnt')
      .first(),
  ])

  const [topProducts, locationRiskRows] = await Promise.all([
    db('order_items as oi')
      .join('orders as o', function joinOrder() {
        this.on('oi.order_id', 'o.order_id').andOn('oi.tenant_id', 'o.tenant_id')
      })
      .where('oi.tenant_id', tenantId)
      .whereIn('o.status', PAID_STATUSES)
      .select('oi.sku_code', 'oi.product_name')
      .sum({ sales_qty: 'oi.qty', sales_amount: 'oi.amount' })
      .countDistinct({ order_count: 'oi.order_id' })
      .groupBy('oi.sku_code', 'oi.product_name')
      .orderBy('sales_amount', 'desc')
      .limit(6),
    db('warehouse_locations as loc')
      .leftJoin('stock_locations as sl', function joinStockLocation() {
        this.on('loc.location_id', 'sl.location_id').andOn('loc.tenant_id', 'sl.tenant_id')
      })
      .where('loc.tenant_id', tenantId)
      .select('loc.location_id', 'loc.capacity')
      .sum({ qty: 'sl.qty' })
      .groupBy('loc.location_id', 'loc.capacity'),
  ])

  const orderRevenue = parseFloat(revenueRow && revenueRow.total) || 0
  const todayOrderCount = parseInt(todayOrderRow && todayOrderRow.cnt, 10) || 0
  const todayGmv = parseFloat(todayOrderRow && todayOrderRow.total) || 0
  const riskSkuCount = parseInt(stockSnapshotRow && stockSnapshotRow.risk_sku_count, 10) || 0
  const outOfStockSkuCount = parseInt(stockSnapshotRow && stockSnapshotRow.out_of_stock_sku_count, 10) || 0
  const pendingApprovalCount = parseInt(pendingApprovalRow && pendingApprovalRow.cnt, 10) || 0

  return {
    pendingApprovalCount,
    todayAuditCount: parseInt(todayAuditRow && todayAuditRow.cnt, 10) || 0,
    orderRevenue,
    customerCount: parseInt(customerRow && customerRow.cnt, 10) || 0,
    activeMarketingCount: parseInt(marketingRow && marketingRow.cnt, 10) || 0,
    todayOrderCount,
    todayGmv,
    newCustomerCount: parseInt(newCustomerRow && newCustomerRow.cnt, 10) || 0,
    orderFunnel: buildOrderFunnel(orderStatusCounts, allocatedCount, shipmentStatusCounts),
    serviceMetrics: buildServiceMetrics({
      orderStatusCounts,
      orderRevenue,
      allocatedCount,
      shipmentStatusCounts,
      pendingApprovalCount,
      riskSkuCount,
      outOfStockSkuCount,
      todayOrderCount,
      todayGmv,
    }),
    trend: buildTrendSeries(trendRows, trendSince),
    approvalSummary: buildApprovalSummary(approvalRows),
    customerSummary: buildCustomerSummary(customerOrderRows),
    marketingSummary: buildMarketingSummary(marketingRow, marketingProductRow, endingSoonRow),
    locationRiskSummary: buildLocationRiskSummary(locationRiskRows),
    warehouseSnapshot: buildWarehouseSnapshot({
      warehouseCountRow,
      locationRow,
      stockedLocationRow,
      stockSnapshotRow,
    }),
    topStores: buildTopStores(topStores, orderRevenue),
    topProducts: buildTopProducts(topProducts),
    riskSkus,
    recentOrders,
    recentAuditLogs,
  }
}

module.exports = {
  loadOpsWorkbench,
}
