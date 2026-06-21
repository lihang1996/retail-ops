/**
 * @module common/warehouse-3d-helper
 * @description 仓库 3D 可视化辅助：库位占用风险等级计算与颜色映射。
 * 关键规则：empty(无货) / low(≤15%容量) / normal / full(≥90%容量)，用于风险地图着色。
 */
const RISK_LEVELS = ['empty', 'normal', 'low', 'full']

/** 根据当前 qty 与 capacity 计算库位风险等级 */
function computeLocationRisk(qty, capacity) {
  const cap = capacity || 100
  if (!qty || qty <= 0) return 'empty'
  if (qty >= cap * 0.9) return 'full'
  if (qty <= cap * 0.15) return 'low'
  return 'normal'
}

/** 风险等级对应的 3D 展示颜色（十六进制） */
function riskColor(level) {
  const map = {
    empty: 0x9ca3af,
    normal: 0x22c55e,
    low: 0xf59e0b,
    full: 0xef4444,
  }
  return map[level] || map.normal
}

module.exports = {
  RISK_LEVELS,
  computeLocationRisk,
  riskColor,
}
