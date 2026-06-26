/**
 * @module common/marketing-helper
 * @description 营销活动查询辅助：即将结束时间窗与剩余天数。
 */

/** 未来 3 天内结束（含今日全天）的 end_at 区间 */
function getEndingSoonEndAtBounds(now = new Date()) {
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  const to = new Date(now)
  to.setDate(to.getDate() + 3)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

/** 按自然日计算剩余天数；null 表示未设置结束时间 */
function getActivityDaysRemaining(endAt, now = new Date()) {
  if (!endAt) return null
  const endDay = new Date(endAt)
  endDay.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.round((endDay.getTime() - today.getTime()) / 86400000)
}

function applyEndingSoonEndAtFilter(qb, column = 'end_at') {
  const { from, to } = getEndingSoonEndAtBounds()
  return qb.whereNotNull(column).whereBetween(column, [from, to])
}

module.exports = {
  getEndingSoonEndAtBounds,
  getActivityDaysRemaining,
  applyEndingSoonEndAtFilter,
}
