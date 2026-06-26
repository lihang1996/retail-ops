/**
 * 经营/运营看板 KPI 与待办队列构建
 */
export function buildOrderFunnelMetrics(funnel = {}, paths = {}) {
  const f = funnel || {}
  return [
    { key: 'pending_payment', label: '待支付', value: f.pendingPayment ?? 0, tone: 'tone-danger', path: paths.pending_payment },
    { key: 'paid', label: '待分仓', value: f.paid ?? 0, tone: 'tone-warning', path: paths.paid },
    { key: 'allocated', label: '待生成发货单', value: f.allocated ?? 0, tone: 'tone-info', path: paths.allocated },
    { key: 'await_pick', label: '待拣货', value: f.awaitPick ?? 0, tone: 'tone-primary', path: paths.await_pick },
    { key: 'picking', label: '拣货中', value: f.picking ?? 0, tone: 'tone-warning', path: paths.picking },
    { key: 'await_outbound', label: '待出库', value: f.awaitOutbound ?? 0, tone: 'tone-success', path: paths.await_outbound },
    { key: 'shipped', label: '已发货', value: f.shipped ?? 0, tone: 'tone-shipped', path: paths.shipped },
  ]
}

export function buildOpsActionQueue({
  approvalSummary = {},
  warehouse = {},
  orderFunnel = {},
  marketingSummary = {},
  paths = {},
}) {
  const stockIssues = (warehouse.riskSkuCount || 0) + (warehouse.outOfStockSkuCount || 0)
  const fulfillmentQueue = (orderFunnel.awaitPick || 0) + (orderFunnel.picking || 0) + (orderFunnel.awaitOutbound || 0)
  return [
    {
      key: 'approval',
      icon: '审',
      title: '处理商品上架审批',
      desc: '避免新品建档后阻塞上架',
      value: approvalSummary.pending || 0,
      tone: 'warning',
      path: paths.approval,
    },
    {
      key: 'stock',
      icon: '库',
      title: '补货或仓间调拨',
      desc: `风险 ${warehouse.riskSkuCount || 0} · 无库存 ${warehouse.outOfStockSkuCount || 0}`,
      value: stockIssues,
      tone: 'danger',
      path: paths.stock,
    },
    {
      key: 'shipment',
      icon: '发',
      title: '推进履约队列',
      desc: '待拣货、拣货中和待出库',
      value: fulfillmentQueue,
      tone: 'primary',
      path: paths.fulfillmentActive,
    },
    {
      key: 'marketing',
      icon: '营',
      title: '检查即将结束活动',
      desc: '及时续期或恢复原价',
      value: marketingSummary.endingSoon || 0,
      tone: 'info',
      path: paths.marketingEndingSoon,
    },
  ]
}

export function buildAuditFeedItems(logs = [], labelFn = (code) => code) {
  return (logs || []).map((log) => ({
    key: log.audit_id || `${log.action_code}-${log.created_at}`,
    code: log.action_code,
    label: labelFn(log.action_code),
    operator: log.operator_name || log.operator_account || '系统',
    createdAt: log.created_at,
  }))
}

/** 经营总览「今日关注」列表（与 overview API 字段对齐） */
export function buildOverviewFocusItems(data = {}, paths = {}) {
  const v = data.visibility || {}
  const items = []
  if (v.pendingShipment) {
    items.push({
      key: 'shipment',
      title: '履约待办',
      desc: '发货单需继续处理',
      value: data.pendingShipmentCount ?? 0,
      tone: 'warning',
      path: paths.fulfillment,
    })
  }
  if (v.stockRisk) {
    const stockIssues = data.stockIssueSkuCount ?? data.stockRiskSkuCount ?? 0
    items.push({
      key: 'stock',
      title: '库存异常',
      desc: `风险 ${data.stockRiskSkuCount ?? 0} · 无库存 ${data.stockOutOfStockSkuCount ?? 0}`,
      value: stockIssues,
      tone: stockIssues > 0 ? 'danger' : 'success',
      path: paths.stockRisk,
    })
  }
  if (v.orderCount) {
    items.push({
      key: 'order',
      title: '待支付订单',
      desc: '待支付确认或导入',
      value: data.pendingPaymentOrderCount ?? 0,
      tone: 'info',
      path: paths.pendingPayment,
    })
  }
  return items
}
