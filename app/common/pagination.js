/**
 * @module common/pagination
 * @description 列表接口统一分页工具。前端 schema-table 统一传 page/size，
 * 后端统一返回当前页 list 与真实 total，避免“20条/页但实际展示更多”的问题。
 */

function parsePagination(query = {}, defaults = {}) {
  const defaultPageSize = defaults.defaultPageSize || 20
  const maxPageSize = defaults.maxPageSize || 100

  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const sizeRaw = query.size ?? query.page_size ?? query.limit
  const size = Math.min(Math.max(parseInt(sizeRaw, 10) || defaultPageSize, 1), maxPageSize)

  return {
    page,
    size,
    offset: (page - 1) * size,
    limit: size,
  }
}

async function paginateQuery(qb, query = {}, options = {}) {
  const pagination = parsePagination(query, options)
  const countColumn = options.countColumn || '*'
  const countDistinct = options.countDistinct === true

  const countQb = qb.clone().clearSelect().clearOrder()
  const countRow = countDistinct
    ? await countQb.countDistinct({ cnt: countColumn }).first()
    : await countQb.count({ cnt: countColumn }).first()

  const total = parseInt(countRow?.cnt, 10) || 0
  const list = await qb
    .clone()
    .offset(pagination.offset)
    .limit(pagination.limit)

  return { list, total, page: pagination.page, size: pagination.size }
}

function paginateArray(rows = [], query = {}, options = {}) {
  const pagination = parsePagination(query, options)
  const total = rows.length
  const list = rows.slice(pagination.offset, pagination.offset + pagination.limit)
  return { list, total, page: pagination.page, size: pagination.size }
}

function hasFilterValue(value) {
  if (Array.isArray(value)) return value.some(hasFilterValue)
  const normalized = typeof value === 'string' ? value.trim() : value
  return normalized !== undefined
    && normalized !== null
    && normalized !== ''
    && normalized !== 'all'
    && normalized !== '-999'
}

module.exports = {
  parsePagination,
  paginateQuery,
  paginateArray,
  hasFilterValue,
}
