const assert = require('assert')
const { buildFulfillmentRowActions } = require('../../app/common/fulfillment-row-actions')

const pending = buildFulfillmentRowActions({ order_status: 'pending_payment' })
assert.strictEqual(pending.length, 1)
assert.strictEqual(pending[0].key, 'pay')

const allocated = buildFulfillmentRowActions({ order_status: 'allocated', shipment_status: 'created' })
assert.ok(allocated.some((item) => item.key === 'pick'))
assert.ok(allocated.some((item) => item.key === '3d'))

const empty = buildFulfillmentRowActions({ order_status: 'shipped' })
assert.strictEqual(empty.length, 0)

console.log('[unit] fulfillment-row-actions 3 passed')
