const assert = require('assert')
const backend = require('../../app/common/apply-filters')
const frontend = require('../../app/pages/dashboard/common/filter-value.js')

const CASES = [
  ['x', true],
  ['', false],
  ['all', false],
  [null, false],
  [undefined, false],
  ['-999', false],
  [' active ', true],
  [['', 'active'], true],
  [[], false],
]

function testFilterValueParity() {
  for (const [value, expected] of CASES) {
    assert.strictEqual(
      backend.hasFilterValue(value),
      expected,
      `backend mismatch for ${JSON.stringify(value)}`,
    )
    assert.strictEqual(
      frontend.hasFilterValue(value),
      expected,
      `frontend mismatch for ${JSON.stringify(value)}`,
    )
    assert.strictEqual(
      backend.hasFilterValue(value),
      frontend.hasFilterValue(value),
      `parity mismatch for ${JSON.stringify(value)}`,
    )
  }
}

function testCleanQueryParams() {
  const cleaned = frontend.cleanQueryParams({
    status: 'all',
    keyword: ' foo ',
    page: 1,
    empty: '',
  })
  assert.deepStrictEqual(cleaned, { keyword: ' foo ', page: 1 })
}

testFilterValueParity()
testCleanQueryParams()
console.log('[unit] filter-value 2 passed')
