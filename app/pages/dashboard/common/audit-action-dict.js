/** 审计动作码 → 展示文案 / 图标 / 模块 / 色调 */
export const AUDIT_ACTION_DICT = {
  'auth:login': { label: '用户登录', icon: '登', module: '系统', tone: 'info' },
  'order:import': { label: '导入订单', icon: '导', module: '订单', tone: 'info' },
  'order:pay': { label: '支付确认', icon: '付', module: '订单', tone: 'primary' },
  'order:allocate': { label: '订单分仓', icon: '分', module: '履约', tone: 'warning' },
  'shipment:create': { label: '生成发货单', icon: '发', module: '履约', tone: 'info' },
  'shipment:pick': { label: '拣货作业', icon: '拣', module: '履约', tone: 'warning' },
  'shipment:ship': { label: '出库发货', icon: '出', module: '履约', tone: 'success' },
  'stock:inbound': { label: '商品入库', icon: '入', module: '仓储', tone: 'success' },
  'stock:outbound': { label: '库存出库', icon: '出', module: '仓储', tone: 'danger' },
  'product:submit_review': { label: '提交审核', icon: '审', module: '商品', tone: 'warning' },
  'product:on_sale': { label: '商品上架', icon: '上', module: '商品', tone: 'success' },
  'approval:submit': { label: '提交审批', icon: '批', module: '运营', tone: 'info' },
  'approval:approve': { label: '审批通过', icon: '过', module: '运营', tone: 'success' },
}

export const OBJECT_TYPE_LABELS = {
  order: '订单',
  shipment: '发货单',
  stock: '库存',
  product: '商品',
  approval: '审批',
  import_batch: '导入批次',
  user: '用户',
  sku: 'SKU',
}

function parseDetail(detailJson) {
  if (!detailJson) return {}
  try {
    return typeof detailJson === 'string' ? JSON.parse(detailJson) : detailJson
  } catch {
    return {}
  }
}

function objectRef(objectType, objectId) {
  const typeLabel = OBJECT_TYPE_LABELS[objectType] || objectType || '对象'
  return objectId ? `${typeLabel} ${objectId}` : typeLabel
}

const SUMMARY_TEMPLATES = {
  'auth:login': () => '登录系统',
  'order:import': (_obj, detail) => {
    if (detail.success != null) return `导入订单成功 ${detail.success} 笔`
    if (detail.total != null) return `导入订单 ${detail.total} 笔`
    return '导入订单批次'
  },
  'order:pay': (obj) => `确认${obj}已支付`,
  'order:allocate': (obj) => `为${obj}分配发货仓库`,
  'shipment:create': (obj, detail) => (
    detail.shipmentNo ? `生成发货单 ${detail.shipmentNo}` : `为${obj}创建发货单`
  ),
  'shipment:pick': (obj) => `对${obj}完成拣货确认`,
  'shipment:ship': (obj) => `对${obj}完成出库发货`,
  'stock:inbound': (obj, detail) => (
    detail.qty != null ? `${obj} 入库 +${detail.qty} 件` : `${obj} 办理入库`
  ),
  'stock:outbound': (obj, detail) => (
    detail.qty != null ? `${obj} 出库 -${detail.qty} 件` : `${obj} 办理出库`
  ),
  'product:submit_review': (obj) => `提交${obj}进入审核`,
  'product:on_sale': (obj) => `将${obj}上架销售`,
  'approval:submit': (obj, detail) => {
    if (detail.refType && detail.refId) {
      const refLabel = OBJECT_TYPE_LABELS[detail.refType] || detail.refType
      return `发起${refLabel} ${detail.refId} 的审批`
    }
    return obj ? `提交审批 ${obj}` : '提交审批申请'
  },
  'approval:approve': (obj) => (obj ? `审批通过 ${obj}` : '审批通过'),
}

export function resolveAuditAction(actionCode) {
  return AUDIT_ACTION_DICT[actionCode] || {
    label: actionCode || '未知操作',
    icon: '·',
    module: '其他',
    tone: 'info',
  }
}

export function getAuditActionLabel(actionCode) {
  return resolveAuditAction(actionCode).label
}

export function buildAuditSummary(row) {
  const detail = parseDetail(row.detail_json)
  const obj = objectRef(row.object_type, row.object_id)
  const template = SUMMARY_TEMPLATES[row.action_code]
  const action = resolveAuditAction(row.action_code)

  const actionPhrase = template
    ? template(obj, detail, row)
    : `${action.label}${row.object_id ? ` · ${obj}` : ''}`

  const detailHint = formatDetailHint(row.action_code, detail)

  return { actionPhrase, detailHint }
}

function formatDetailHint(actionCode, detail) {
  if (detail.summary) return detail.summary

  const parts = []
  if (detail.warehouseId) parts.push(`仓库 ${detail.warehouseId}`)
  if (detail.locationId) parts.push(`库位 ${detail.locationId}`)
  if (detail.orderId) parts.push(`关联订单 ${detail.orderId}`)
  if (detail.remark) parts.push(detail.remark)
  if (detail.from && detail.to) parts.push(`状态 ${detail.from} → ${detail.to}`)
  if (detail.account) parts.push(`账号 ${detail.account}`)

  const skipQty = ['stock:inbound', 'stock:outbound'].includes(actionCode)
  if (!skipQty && detail.qty != null) parts.push(`数量 ${detail.qty}`)

  return parts.join(' · ')
}

export function formatObjectHint(objectType, objectId) {
  if (!objectId) return ''
  const typeLabel = OBJECT_TYPE_LABELS[objectType] || objectType || '对象'
  const shortId = String(objectId).length > 18
    ? `${String(objectId).slice(0, 8)}…${String(objectId).slice(-4)}`
    : objectId
  return `${typeLabel} ${shortId}`
}

export function formatRelativeTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value

  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`

  const isToday = d.toDateString() === now.toDateString()
  const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (isToday) return `今天 ${timeStr}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${timeStr}`

  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
