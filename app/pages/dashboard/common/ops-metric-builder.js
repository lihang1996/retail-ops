import { formatMoney, formatNumber } from './format.js'
import { getAuditActionLabel } from './audit-action-dict.js'

export function buildOpsCoreMetrics({
  data = {},
  service = {},
  approvalSummary = {},
  stockIssueCount = 0,
  paths = {},
}) {
  const funnel = data.orderFunnel || {}
  return [
    {
      key: 'gmv',
      label: '今日 GMV',
      badge: `${data.todayOrderCount || 0} 单`,
      value: `¥${formatMoney(data.todayGmv)}`,
      hint: `今日平均客单 ¥${formatMoney(service.todayAverageOrderValue)}`,
      tone: 'tone-primary',
      path: paths.todayPaidLifecycle,
    },
    {
      key: 'task',
      label: '待处理任务',
      badge: '跨模块',
      value: formatNumber(service.pendingTaskCount),
      hint: `审批 ${approvalSummary.pending || 0} · 库存异常 ${stockIssueCount}`,
      tone: service.pendingTaskCount > 0 ? 'tone-warning' : 'tone-success',
      action: 'task-breakdown',
    },
    {
      key: 'conversion',
      label: '支付转化率',
      badge: '全量订单',
      value: `${service.paymentConversionRate || 0}%`,
      hint: '已支付及后续状态 / 非取消订单',
      tone: 'tone-success',
      path: paths.paidLifecycle,
    },
    {
      key: 'fulfillment',
      label: '履约完成率',
      badge: '支付后订单',
      value: `${service.fulfillmentRate || 0}%`,
      hint: `待拣货 ${funnel.awaitPick || 0} · 待出库 ${funnel.awaitOutbound || 0}`,
      tone: 'tone-primary',
      path: paths.fulfillmentActive,
    },
  ]
}

export function buildOpsTaskBreakdown({
  orderFunnel = {},
  approvalSummary = {},
  warehouse = {},
  paths = {},
}) {
  const f = orderFunnel || {}
  return [
    {
      key: 'approval',
      title: '商品上架审批',
      desc: '待管理员审核',
      value: approvalSummary.pending || 0,
      path: paths.approval,
    },
    {
      key: 'stock',
      title: '风险库存',
      desc: '有库存但低于或等于预警值',
      value: warehouse.riskSkuCount || 0,
      path: paths.stockRisk,
    },
    {
      key: 'out-of-stock',
      title: '无库存',
      desc: '可用库存为 0，需补货或调拨',
      value: warehouse.outOfStockSkuCount || 0,
      path: paths.stockOut,
    },
    {
      key: 'allocated',
      title: '待生成发货单',
      desc: '已分仓但尚未创建发货单',
      value: f.allocated || 0,
      path: paths.allocated,
    },
    {
      key: 'await-pick',
      title: '待拣货',
      desc: '发货单已创建',
      value: f.awaitPick || 0,
      path: paths.awaitPick,
    },
    {
      key: 'picking',
      title: '拣货中',
      desc: '仓库正在执行拣货',
      value: f.picking || 0,
      path: paths.picking,
    },
    {
      key: 'outbound',
      title: '待出库',
      desc: '拣货完成，等待发货',
      value: f.awaitOutbound || 0,
      path: paths.awaitOutbound,
    },
  ]
}

export function buildOpsAuditFeedItems(logs = []) {
  return (logs || []).map((log) => ({
    key: log.audit_id,
    operator: log.operator_name || '系统',
    label: getAuditActionLabel(log.action_code),
    meta: log.object_type || '业务对象',
    createdAt: log.created_at,
  }))
}

export function buildWarehouseMiniMetrics({ warehouse = {}, locationRisk = {} } = {}) {
  return [
    { label: '风险 SKU', value: warehouse.riskSkuCount || 0, tone: 'danger' },
    { label: '无库存', value: warehouse.outOfStockSkuCount || 0, tone: 'warning' },
    { label: '满载库位', value: locationRisk.full || 0, tone: 'warning' },
    { label: '可用库存', value: formatNumber(warehouse.availableQty), tone: '' },
  ]
}

export function buildCustomerMiniMetrics({ data = {}, customerSummary = {} } = {}) {
  return [
    { label: '客户总数', value: formatNumber(data.customerCount), tone: '' },
    { label: '复购客户', value: customerSummary.repeat || 0, tone: 'primary' },
    { label: '高价值客户', value: customerSummary.vip || 0, tone: 'success' },
    { label: '今日新增', value: data.newCustomerCount || 0, tone: '' },
  ]
}

export function buildMarketingApprovalMetrics({
  marketingSummary = {},
  approvalSummary = {},
} = {}) {
  return [
    { label: '进行中活动', value: marketingSummary.active || 0, tone: 'primary' },
    { label: '覆盖商品', value: marketingSummary.coveredProducts || 0, tone: '' },
    { label: '即将结束', value: marketingSummary.endingSoon || 0, tone: 'warning' },
    { label: '待审批', value: approvalSummary.pending || 0, tone: 'danger' },
  ]
}
