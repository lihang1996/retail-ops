import { formatMoney } from '../common/format.js'

/**
 * 经营总览 KPI 卡片构建
 */
export function buildOverviewMetricCards(data = {}, paths = {}) {
  const v = data.visibility || {}
  const cards = []

  if (v.gmv) {
    cards.push({
      key: 'gmv',
      icon: '¥',
      label: 'GMV（元）',
      value: formatMoney(data.gmv),
      hint: `客单价 ¥${formatMoney(data.avgOrderValue)}`,
      tone: 'tone-primary',
      path: paths.fulfillment,
    })
  }
  if (v.orderCount) {
    cards.push({
      key: 'order',
      icon: '单',
      label: '订单量',
      value: data.orderCount != null ? data.orderCount : '-',
      hint: `待支付 ${data.pendingPaymentOrderCount || 0} · 待分仓 ${data.allocatedOrderCount || 0}`,
      tone: 'tone-info',
      path: paths.fulfillment,
    })
  }
  if (v.stockRisk) {
    const issueCount = data.stockIssueSkuCount != null ? data.stockIssueSkuCount : data.stockRiskSkuCount
    cards.push({
      key: 'stock',
      icon: '库',
      label: '库存异常 SKU',
      value: issueCount != null ? issueCount : '-',
      hint: `风险 ${data.stockRiskSkuCount || 0} · 无库存 ${data.stockOutOfStockSkuCount || 0}`,
      tone: (data.stockIssueSkuCount || data.stockRiskSkuCount || 0) > 0 ? 'tone-danger' : 'tone-success',
      path: paths.stockRisk,
    })
  }
  if (v.pendingShipment) {
    cards.push({
      key: 'shipment',
      icon: '发',
      label: '待处理发货单',
      value: data.pendingShipmentCount != null ? data.pendingShipmentCount : '-',
      hint: `待拣货 ${data.awaitPickCount || 0} · 拣货中 ${data.pickingShipmentCount || 0} · 待出库 ${data.pickedShipmentCount || 0}`,
      tone: 'tone-warning',
      path: paths.fulfillment,
    })
  }
  if (v.stockOps) {
    cards.push({
      key: 'inbound',
      icon: '入',
      label: '今日入库',
      value: data.todayInboundQty || 0,
      hint: `今日出库 ${data.todayOutboundQty || 0} · 库位利用率 ${data.locationUtilization || 0}%`,
      tone: 'tone-info',
      path: paths.stockInbound,
    })
  }

  return cards
}

export const OVERVIEW_QUICK_ENTRIES = [
  { key: 'fulfillment', icon: '履', title: '履约中心', desc: '订单支付、分仓、拣货出库' },
  { key: 'warehouse3d', icon: '3D', title: '3D 仓库', desc: '库位风险与拣货路径' },
  { key: 'product', icon: '商', title: '商品管理', desc: '店铺、类目、商品建档' },
  { key: 'ai', icon: 'AI', title: 'AI 业务助手', desc: '不懂流程？分步指引与跳转' },
]

export function buildOverviewQuickEntries(pathMap = {}) {
  return OVERVIEW_QUICK_ENTRIES.map((item) => ({
    ...item,
    path: pathMap[item.key] || '',
  })).filter((item) => item.path)
}
