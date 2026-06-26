/**
 * @module common/warehouse-3d-helper
 * @description 仓库 3D 可视化辅助：库位占用风险等级计算与颜色映射。
 *
 * 核心职责：
 * 1. 根据库位占用率计算风险等级
 * 2. 为风险等级提供 3D 渲染颜色
 * 3. 支持风险地图热力图展示
 *
 * 风险等级定义：
 * - empty: 无货（qty=0）
 * - low: 库存偏低（0 < 占用率 ≤ 15%）
 * - normal: 正常（15% < 占用率 < 90%）
 * - full: 接近满仓（占用率 ≥ 90%）
 *
 * 使用场景：
 * - Three.js 3D 库位着色
 * - 风险地图热力图
 * - 库位详情风险提示
 */

/** 风险等级枚举 */
const RISK_LEVELS = ['empty', 'normal', 'low', 'full']

/**
 * 根据当前 qty 与 capacity 计算库位风险等级
 * @param {number} qty - 当前库存数量
 * @param {number} capacity - 库位容量
 * @returns {string} 风险等级（'empty' | 'low' | 'normal' | 'full'）
 *
 * 计算规则：
 * - empty: qty ≤ 0（无货）
 * - full: qty/capacity ≥ 90%（接近满仓，需要注意补货空间）
 * - low: qty/capacity ≤ 15%（库存偏低，需要关注补货）
 * - normal: 15% < qty/capacity < 90%（正常范围）
 *
 * 阈值设计考虑：
 * - 90%: 留 10% 缓冲空间，避免过度饱和
 * - 15%: 提前预警，避免缺货
 *
 * @example
 * computeLocationRisk(0, 100)    // => 'empty'
 * computeLocationRisk(10, 100)   // => 'low'    (10%)
 * computeLocationRisk(50, 100)   // => 'normal' (50%)
 * computeLocationRisk(95, 100)   // => 'full'   (95%)
 */
function computeLocationRisk(qty, capacity) {
  const cap = capacity || 100 // 默认容量 100
  if (!qty || qty <= 0) return 'empty'
  if (qty >= cap * 0.9) return 'full'   // 90% 以上
  if (qty <= cap * 0.15) return 'low'    // 15% 以下
  return 'normal'
}

/**
 * 风险等级对应的 3D 展示颜色（十六进制）
 * @param {string} level - 风险等级（'empty' | 'low' | 'normal' | 'full'）
 * @returns {number} Three.js 颜色值（十六进制整数）
 *
 * 颜色映射（Tailwind CSS 色系）：
 * - empty: 0x9ca3af（灰色 gray-400）- 无货状态
 * - normal: 0x22c55e（绿色 green-500）- 正常状态
 * - low: 0xf59e0b（橙色 amber-500）- 警告状态
 * - full: 0xef4444（红色 red-500）- 风险状态
 *
 * 在 Three.js 中使用：
 * ```javascript
 * const color = riskColor(level)
 * material.color.setHex(color)
 * ```
 *
 * @example
 * riskColor('empty')   // => 0x9ca3af (灰色)
 * riskColor('normal')  // => 0x22c55e (绿色)
 * riskColor('low')     // => 0xf59e0b (橙色)
 * riskColor('full')    // => 0xef4444 (红色)
 */
function riskColor(level) {
  const map = {
    empty: 0x9ca3af,   // 灰色 - 无货
    normal: 0x22c55e,  // 绿色 - 正常
    low: 0xf59e0b,     // 橙色 - 警告
    full: 0xef4444,    // 红色 - 风险
  }
  return map[level] || map.normal // 默认绿色
}

module.exports = {
  RISK_LEVELS,
  computeLocationRisk,
  riskColor,
}
