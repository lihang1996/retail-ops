const assert = require('assert')
const {
  buildOrderFunnel,
  buildServiceMetrics,
  buildTrendSeries,
  buildCustomerSummary,
} = require('../../app/common/workbench/ops-summaries')

const trendSince = new Date('2024-06-01T00:00:00')
trendSince.setHours(0, 0, 0, 0)

const funnel = buildOrderFunnel(
  { pending_payment: 2, paid: 3, shipped: 5 },
  4,
  { created: 1, picking: 2, picked: 1 },
)
assert.strictEqual(funnel.awaitPick, 1)
assert.strictEqual(funnel.allocated, 4)

const metrics = buildServiceMetrics({
  orderStatusCounts: { pending_payment: 2, paid: 3, shipped: 5, cancelled: 1 },
  orderRevenue: 1000,
  allocatedCount: 4,
  shipmentStatusCounts: { created: 1, picking: 1, picked: 1 },
  pendingApprovalCount: 2,
  riskSkuCount: 3,
  outOfStockSkuCount: 1,
  todayOrderCount: 4,
  todayGmv: 400,
})
assert.ok(metrics.pendingTaskCount >= 10)
assert.strictEqual(metrics.todayAverageOrderValue, 100)

const trend = buildTrendSeries([
  { day: '2024-06-01', order_count: 2, gmv: 100 },
], trendSince)
assert.strictEqual(trend.length, 7)
assert.strictEqual(trend[0].orderCount, 2)

const customerSummary = buildCustomerSummary([
  { order_count: 0, total_spent: 0 },
  { order_count: 1, total_spent: 200 },
  { order_count: 3, total_spent: 500 },
  { order_count: 6, total_spent: 1200 },
])
assert.strictEqual(customerSummary.new, 1)
assert.strictEqual(customerSummary.active, 1)
assert.strictEqual(customerSummary.repeat, 2)
assert.strictEqual(customerSummary.vip, 1)

console.log('[unit] ops-summaries 4 passed')
