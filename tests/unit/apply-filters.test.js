const assert = require('assert')
const { hasFilterValue, applyFilters } = require('../../app/common/apply-filters')

function testHasFilterValue() {
  assert.strictEqual(hasFilterValue('x'), true)
  assert.strictEqual(hasFilterValue(''), false)
  assert.strictEqual(hasFilterValue('all'), false)
  assert.strictEqual(hasFilterValue(null), false)
  assert.strictEqual(hasFilterValue([]), false)
  assert.strictEqual(hasFilterValue(['', 'active']), true)
}

function testApplyFilters() {
  const calls = []
  const qb = {
    andWhere: (...args) => { calls.push(args); return qb },
    whereIn: (...args) => { calls.push(args); return qb },
  }
  applyFilters(qb, { name: 'foo', status: 'all' }, [
    { key: 'name', column: 'p.name', op: 'like' },
    { key: 'status', column: 'p.status' },
  ])
  assert.strictEqual(calls.length, 1)
  assert.deepStrictEqual(calls[0], ['p.name', 'like', '%foo%'])
}

function testApplyFiltersOperators() {
  const calls = []
  const qb = {
    andWhere: (...args) => { calls.push(['andWhere', ...args]); return qb },
    whereIn: (...args) => { calls.push(['whereIn', ...args]); return qb },
  }
  applyFilters(qb, {
    min_qty: '10',
    max_qty: '90',
    statuses: ['pending', 'approved'],
    marker: 'yes',
  }, [
    { key: 'min_qty', column: 'stock.available_qty', op: 'gte', transform: Number },
    { key: 'max_qty', column: 'stock.available_qty', op: 'lte', transform: Number },
    { key: 'statuses', column: 'approval.status', op: 'in' },
    {
      key: 'marker',
      op: 'custom',
      apply: (builder, value) => builder.andWhere('marker_flag', value === 'yes' ? 1 : 0),
    },
  ])

  assert.deepStrictEqual(calls, [
    ['andWhere', 'stock.available_qty', '>=', 10],
    ['andWhere', 'stock.available_qty', '<=', 90],
    ['whereIn', 'approval.status', ['pending', 'approved']],
    ['andWhere', 'marker_flag', 1],
  ])
}

testHasFilterValue()
testApplyFilters()
testApplyFiltersOperators()
console.log('[unit] apply-filters 3 passed')
