const { PAID_ORDER_STATUSES } = require('../domain-constants')
const { localDateKey } = require('../date-helper')
const { buildCountMap } = require('./workbench-helpers')

const PAID_STATUSES = PAID_ORDER_STATUSES

function buildOrderFunnel(orderStatusCounts, allocatedCount, shipmentStatusCounts) {
  return {
    pendingPayment: orderStatusCounts.pending_payment || 0,
    paid: orderStatusCounts.paid || 0,
    allocated: allocatedCount,
    awaitPick: shipmentStatusCounts.created || 0,
    picking: shipmentStatusCounts.picking || 0,
    awaitOutbound: shipmentStatusCounts.picked || 0,
    shipped: orderStatusCounts.shipped || 0,
  }
}

function buildServiceMetrics({
  orderStatusCounts = {},
  orderRevenue = 0,
  allocatedCount = 0,
  shipmentStatusCounts = {},
  pendingApprovalCount = 0,
  riskSkuCount = 0,
  outOfStockSkuCount = 0,
  todayOrderCount = 0,
  todayGmv = 0,
}) {
  const totalOrders = Object.values(orderStatusCounts).reduce((sum, count) => sum + count, 0)
  const paidLifecycleOrders = PAID_STATUSES.reduce((sum, status) => sum + (orderStatusCounts[status] || 0), 0)
  const shippedOrders = orderStatusCounts.shipped || 0
  const pendingTaskCount = pendingApprovalCount
    + allocatedCount
    + (shipmentStatusCounts.created || 0)
    + (shipmentStatusCounts.picking || 0)
    + (shipmentStatusCounts.picked || 0)
    + riskSkuCount
    + outOfStockSkuCount

  return {
    paymentConversionRate: totalOrders > 0 ? Math.round((paidLifecycleOrders / totalOrders) * 100) : 0,
    fulfillmentRate: paidLifecycleOrders > 0 ? Math.round((shippedOrders / paidLifecycleOrders) * 100) : 0,
    averageOrderValue: paidLifecycleOrders > 0 ? orderRevenue / paidLifecycleOrders : 0,
    todayAverageOrderValue: todayOrderCount > 0 ? todayGmv / todayOrderCount : 0,
    pendingTaskCount,
  }
}

function buildTrendSeries(trendRows, trendSince) {
  const trendMap = new Map(trendRows.map((row) => [
    String(row.day).slice(0, 10),
    {
      orderCount: parseInt(row.order_count, 10) || 0,
      gmv: parseFloat(row.gmv) || 0,
    },
  ]))
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendSince)
    date.setDate(trendSince.getDate() + index)
    const key = localDateKey(date)
    return { date: key, ...(trendMap.get(key) || { orderCount: 0, gmv: 0 }) }
  })
}

function buildApprovalSummary(approvalRows) {
  const counts = buildCountMap(approvalRows)
  return {
    pending: counts.pending || 0,
    approved: counts.approved || 0,
    rejected: counts.rejected || 0,
  }
}

function buildCustomerSummary(customerOrderRows) {
  return customerOrderRows.reduce((summary, row) => {
    const orderCount = parseInt(row.order_count, 10) || 0
    const totalSpent = parseFloat(row.total_spent) || 0
    if (orderCount === 0) summary.new += 1
    else if (orderCount === 1) summary.active += 1
    else summary.repeat += 1
    if (orderCount >= 5 || totalSpent >= 1000) summary.vip += 1
    return summary
  }, { new: 0, active: 0, repeat: 0, vip: 0 })
}

function buildMarketingSummary(marketingRow, marketingProductRow, endingSoonRow) {
  return {
    active: parseInt(marketingRow && marketingRow.cnt, 10) || 0,
    coveredProducts: parseInt(marketingProductRow && marketingProductRow.cnt, 10) || 0,
    endingSoon: parseInt(endingSoonRow && endingSoonRow.cnt, 10) || 0,
  }
}

function buildLocationRiskSummary(locationRiskRows) {
  return locationRiskRows.reduce((summary, row) => {
    const qty = parseInt(row.qty, 10) || 0
    const capacity = parseInt(row.capacity, 10) || 100
    const ratio = capacity > 0 ? qty / capacity : 0
    if (qty <= 0) summary.empty += 1
    else if (ratio >= 0.9) summary.full += 1
    else if (ratio <= 0.15) summary.low += 1
    else summary.normal += 1
    return summary
  }, { empty: 0, low: 0, normal: 0, full: 0 })
}

function buildWarehouseSnapshot({
  warehouseCountRow,
  locationRow,
  stockedLocationRow,
  stockSnapshotRow,
}) {
  const totalLocations = parseInt(locationRow && locationRow.location_count, 10) || 0
  const stockedLocations = parseInt(stockedLocationRow && stockedLocationRow.stocked_location_count, 10) || 0
  const riskSkuCount = parseInt(stockSnapshotRow && stockSnapshotRow.risk_sku_count, 10) || 0
  const outOfStockSkuCount = parseInt(stockSnapshotRow && stockSnapshotRow.out_of_stock_sku_count, 10) || 0

  return {
    warehouseCount: parseInt(warehouseCountRow && warehouseCountRow.cnt, 10) || 0,
    locationCount: totalLocations,
    stockedLocationCount: stockedLocations,
    locationFillRate: totalLocations > 0 ? Math.round((stockedLocations / totalLocations) * 100) : 0,
    totalCapacity: parseInt(locationRow && locationRow.total_capacity, 10) || 0,
    stockedQty: parseInt(stockedLocationRow && stockedLocationRow.stocked_qty, 10) || 0,
    stockSkuCount: parseInt(stockSnapshotRow && stockSnapshotRow.stock_sku_count, 10) || 0,
    totalQty: parseInt(stockSnapshotRow && stockSnapshotRow.total_qty, 10) || 0,
    availableQty: parseInt(stockSnapshotRow && stockSnapshotRow.available_qty, 10) || 0,
    lockedQty: parseInt(stockSnapshotRow && stockSnapshotRow.locked_qty, 10) || 0,
    riskSkuCount,
    outOfStockSkuCount,
  }
}

function buildTopStores(topStores, orderRevenue) {
  return topStores.map((row) => ({
    ...row,
    order_count: parseInt(row.order_count, 10) || 0,
    revenue: parseFloat(row.revenue) || 0,
    share: orderRevenue > 0
      ? Math.round((parseFloat(row.revenue) / orderRevenue) * 1000) / 10
      : 0,
  }))
}

function buildTopProducts(topProducts) {
  return topProducts.map((row) => ({
    ...row,
    sales_qty: parseInt(row.sales_qty, 10) || 0,
    sales_amount: parseFloat(row.sales_amount) || 0,
    order_count: parseInt(row.order_count, 10) || 0,
  }))
}

module.exports = {
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
}
