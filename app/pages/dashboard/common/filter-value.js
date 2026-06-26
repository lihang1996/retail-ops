const SKIP_VALUES = new Set(['', null, undefined, 'all', '-999'])

/** 与后端 pagination.hasFilterValue 语义对齐 */
export function hasFilterValue(value) {
  if (Array.isArray(value)) return value.some(hasFilterValue)
  const normalized = typeof value === 'string' ? value.trim() : value
  return !SKIP_VALUES.has(normalized)
}

export function cleanQueryParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => hasFilterValue(value)),
  )
}

// Node 单测可 require（webpack 打包时忽略）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hasFilterValue, cleanQueryParams }
}
