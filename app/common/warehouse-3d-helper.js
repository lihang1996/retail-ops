const RISK_LEVELS = ['empty', 'normal', 'low', 'full']

function computeLocationRisk(qty, capacity) {
  const cap = capacity || 100
  if (!qty || qty <= 0) return 'empty'
  if (qty >= cap * 0.9) return 'full'
  if (qty <= cap * 0.15) return 'low'
  return 'normal'
}

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
