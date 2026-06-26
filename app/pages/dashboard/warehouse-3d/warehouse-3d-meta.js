/** 3D 仓库页 — 业务文案与图例常量 */

export const RISK_LABELS = {
  empty: '空闲',
  normal: '正常',
  low: '偏低',
  full: '满载',
}

export const RISK_TAG_TYPES = {
  empty: 'info',
  normal: 'success',
  low: 'warning',
  full: 'danger',
}

export const LEGEND_ITEMS = [
  { level: 'empty', label: '空闲', color: '#94a3b8', desc: '无库存，可上架' },
  { level: 'normal', label: '正常', color: '#22c55e', desc: '库存适中' },
  { level: 'low', label: '偏低', color: '#f59e0b', desc: '建议补货' },
  { level: 'full', label: '满载', color: '#ef4444', desc: '接近容量上限' },
]

export function riskLabel(level) {
  return RISK_LABELS[level] || level || '未知'
}

export function riskTagType(level) {
  return RISK_TAG_TYPES[level] || 'info'
}
