/** 业务选项与展示文案（客户分层、营销类型、审批引用类型等） */

export const CUSTOMER_SEGMENT_OPTIONS = [
  { label: '新客', value: 'new' },
  { label: '活跃', value: 'active' },
  { label: '复购', value: 'repeat' },
  { label: '高价值', value: 'vip' },
]

export function customerSegmentLabel(value) {
  const item = CUSTOMER_SEGMENT_OPTIONS.find((row) => row.value === value)
  return (item && item.label) || '普通'
}

export function customerTierLabel(value) {
  return customerSegmentLabel(value)
}

export const MARKETING_ACTIVITY_TYPE_OPTIONS = [
  { label: '综合促销', value: 'promotion' },
  { label: '会员活动', value: 'member' },
  { label: '折扣活动', value: 'discount' },
  { label: '赠品活动', value: 'gift' },
  { label: '组合活动', value: 'bundle' },
]

export const APPROVAL_REF_TYPE_OPTIONS = [
  { label: '商品上架', value: 'product_on_sale' },
  { label: '价格调整', value: 'price_change' },
]

export function marketingActivityTypeLabel(value) {
  const item = MARKETING_ACTIVITY_TYPE_OPTIONS.find((row) => row.value === value)
  return (item && item.label) || value || '促销活动'
}

export function paymentMethodLabel(value) {
  return PAYMENT_METHOD_LABELS[value] || value || '其他'
}

export const PAYMENT_METHOD_LABELS = {
  online: '在线支付',
  cash: '线下现金',
  wechat: '微信支付',
  alipay: '支付宝',
}

export function approvalRefTypeLabel(value) {
  const item = APPROVAL_REF_TYPE_OPTIONS.find((row) => row.value === value)
  return (item && item.label) || value || '业务对象'
}
