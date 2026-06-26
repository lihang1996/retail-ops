/**
 * @module common/id
 * @description 分布式唯一 ID 生成器（时间戳 + 随机数）
 * 格式：{prefix}_{timestamp}_{random_hex}
 * 例如：user_1718956123456_a1b2c3d4
 *
 * 特点：
 * - 时间有序（可按 ID 排序）
 * - 冲突概率极低（8 字节随机数）
 * - 可读性好（包含业务前缀）
 */
const crypto = require('crypto')

module.exports = {
  /**
   * 生成带前缀的唯一 ID
   * @param {string} prefix - 业务前缀，如 'user', 'order', 'sku' 等
   * @returns {string} 格式化的唯一 ID
   *
   * @example
   * idGen.next('user')    // => 'user_1718956123456_a1b2c3d4'
   * idGen.next('order')   // => 'order_1718956123457_f5e6d7c8'
   */
  next(prefix = 'id') {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  },
}
