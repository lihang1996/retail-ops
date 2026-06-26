/**
 * @module common/apply-filters
 * @description Knex 查询条件统一应用
 */
const { hasFilterValue } = require('./pagination')

function applyFilterRule(qb, rule, query) {
  const raw = query[rule.key]
  if (!hasFilterValue(raw)) return qb

  const value = rule.transform ? rule.transform(raw) : raw
  const column = rule.column || rule.key
  const op = rule.op || 'eq'

  if (op === 'like') return qb.andWhere(column, 'like', `%${value}%`)
  if (op === 'gte') return qb.andWhere(column, '>=', value)
  if (op === 'lte') return qb.andWhere(column, '<=', value)
  if (op === 'in') return qb.whereIn(column, Array.isArray(value) ? value : [value])
  if (op === 'custom' && typeof rule.apply === 'function') return rule.apply(qb, value, query)
  return qb.andWhere(column, value)
}

function applyFilters(qb, query = {}, filterConfig = []) {
  return filterConfig.reduce((next, rule) => applyFilterRule(next, rule, query), qb)
}

module.exports = {
  hasFilterValue,
  applyFilters,
  applyFilterRule,
}
