/**
 * 业务状态字典：全站状态文案与配色的单一数据源。
 * type 对应 Element Plus 标签色调，与「待处理=灰 / 进行中=蓝 / 警告=橙 / 成功=绿 / 异常=红」规范一致：
 *   info=灰、primary=蓝、warning=橙、success=绿、danger=红。
 * 手写页面用 domain 精确取值（避免跨域同名歧义）；Schema 通用表格用合并字典兜底。
 */

export const ORDER_STATUS_DICT = {
  pending_payment: { label: '待支付', type: 'info' },
  paid: { label: '已支付', type: 'primary' },
  allocated: { label: '已分仓', type: 'primary' },
  shipped: { label: '已发货', type: 'success' },
  cancelled: { label: '已取消', type: 'info' },
}

export const SHIPMENT_STATUS_DICT = {
  created: { label: '待拣货', type: 'info' },
  picking: { label: '拣货中', type: 'warning' },
  picked: { label: '待出库', type: 'primary' },
  packed: { label: '已包装', type: 'primary' },
  shipped: { label: '已发货', type: 'success' },
}

export const PRODUCT_STATUS_DICT = {
  draft: { label: '草稿', type: 'info' },
  pending_review: { label: '待审核', type: 'warning' },
  on_sale: { label: '在售', type: 'success' },
  off_sale: { label: '下架', type: 'info' },
}

export const FULFILLMENT_STEP_DICT = {
  pending_payment: { label: '待支付', type: 'info' },
  paid: { label: '待分仓', type: 'warning' },
  await_shipment: { label: '待生成发货单', type: 'warning' },
  await_pick: { label: '待拣货', type: 'primary' },
  picking: { label: '拣货中', type: 'warning' },
  await_outbound: { label: '待出库', type: 'primary' },
  shipped: { label: '已发货', type: 'success' },
}

export const STOCK_RISK_DICT = {
  empty: { label: '空闲', type: 'info' },
  low: { label: '偏低', type: 'warning' },
  full: { label: '满载', type: 'danger' },
  none: { label: '无库存', type: 'info' },
  normal: { label: '正常', type: 'success' },
  has_risk: { label: '有风险', type: 'danger' },
}

export const APPROVAL_STATUS_DICT = {
  none: { label: '无', type: 'info' },
  pending: { label: '待审批', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' },
}

export const COMMON_STATUS_DICT = {
  active: { label: '启用', type: 'success' },
  enabled: { label: '启用', type: 'success' },
  disabled: { label: '停用', type: 'info' },
  locked: { label: '已锁定', type: 'primary' },
  unlocked: { label: '未锁定', type: 'info' },
  unpaid: { label: '未支付', type: 'info' },
  none: { label: '无', type: 'info' },
  has_risk: { label: '有风险', type: 'danger' },
  normal: { label: '正常', type: 'success' },
  frozen: { label: '冻结', type: 'danger' },
  overdue: { label: '欠费', type: 'danger' },
  pending: { label: '待处理', type: 'warning' },
  processing: { label: '处理中', type: 'warning' },
  in_progress: { label: '进行中', type: 'primary' },
  scheduled: { label: '待开始', type: 'info' },
  inactive: { label: '已停用', type: 'info' },
  expired: { label: '已结束', type: 'info' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' },
  completed: { label: '已完成', type: 'success' },
  done: { label: '已完成', type: 'success' },
  consumed: { label: '已消耗', type: 'info' },
  released: { label: '已释放', type: 'info' },
  success: { label: '成功', type: 'success' },
  fail: { label: '失败', type: 'danger' },
}

const DOMAIN_DICTS = {
  order: ORDER_STATUS_DICT,
  shipment: SHIPMENT_STATUS_DICT,
  product: PRODUCT_STATUS_DICT,
  fulfillment: FULFILLMENT_STEP_DICT,
  stock: STOCK_RISK_DICT,
  approval: APPROVAL_STATUS_DICT,
  common: COMMON_STATUS_DICT,
}

/**
 * 合并字典：通用 → 商品 → 订单 → 发货，后者覆盖前者。
 * 用于不指定 domain 的通用场景（如 Schema 自动渲染表格的状态列）。
 */
const MERGED_DICT = {
  ...COMMON_STATUS_DICT,
  ...PRODUCT_STATUS_DICT,
  ...ORDER_STATUS_DICT,
  ...SHIPMENT_STATUS_DICT,
}

const EMPTY_STATUS = { label: '—', type: 'info' }

/** 解析状态为 { label, type }；优先按 domain 精确匹配，再回退合并字典，最后回退原值。 */
export function resolveStatus(value, domain) {
  if (value === undefined || value === null || value === '') return { ...EMPTY_STATUS }
  const dict = (domain && DOMAIN_DICTS[domain]) || MERGED_DICT
  return dict[value] || MERGED_DICT[value] || { label: String(value), type: 'info' }
}

/** 取状态中文文案 */
export function statusLabel(value, domain) {
  return resolveStatus(value, domain).label
}

/** 取状态标签色调（info/primary/warning/success/danger） */
export function statusType(value, domain) {
  return resolveStatus(value, domain).type
}

/** 将字典转为下拉/筛选用 enumList（含「全部」选项） */
export function toEnumList(domain, { withAll = true } = {}) {
  const dict = DOMAIN_DICTS[domain] || MERGED_DICT
  const list = Object.entries(dict).map(([value, { label }]) => ({ label, value }))
  return withAll ? [{ label: '全部', value: 'all' }, ...list] : list
}
