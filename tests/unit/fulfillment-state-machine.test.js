const assert = require('assert')
const {
  resolveCurrentStep,
  buildFulfillmentRowActions,
  applyFulfillmentTabFilter,
} = require('../../app/common/fulfillment-state-machine')

function testResolveCurrentStep() {
  assert.strictEqual(resolveCurrentStep({ status: 'pending_payment' }), 'pending_payment')
  assert.strictEqual(resolveCurrentStep({ status: 'paid' }), 'paid')
  assert.strictEqual(resolveCurrentStep({ status: 'allocated' }, { status: 'created' }), 'await_pick')
  assert.strictEqual(resolveCurrentStep({ status: 'allocated' }, { status: 'picking' }), 'picking')
  assert.strictEqual(resolveCurrentStep({ status: 'allocated' }, { status: 'picked' }), 'await_outbound')
  assert.strictEqual(resolveCurrentStep({ status: 'shipped' }), 'shipped')
}

function testBuildFulfillmentRowActions() {
  const pending = buildFulfillmentRowActions({ order_status: 'pending_payment' })
  assert.ok(pending.some((a) => a.key === 'pay'))

  const picking = buildFulfillmentRowActions({
    order_status: 'allocated',
    shipment_id: 's1',
    shipment_status: 'picking',
  })
  assert.ok(picking.some((a) => a.key === 'confirm'))
  assert.ok(picking.some((a) => a.key === '3d'))
}

function testApplyFulfillmentTabFilter() {
  const calls = []
  const qb = {
    whereIn: (...args) => { calls.push(['whereIn', args]); return qb },
    andWhere: (...args) => { calls.push(['andWhere', args]); return qb },
    whereExists: (fn) => { calls.push(['whereExists']); fn.call({ select: () => ({ from: () => ({ whereRaw: () => ({ andWhere: () => ({ whereIn: () => ({}) }) }) }) }) }); return qb },
    whereNotExists: (fn) => { calls.push(['whereNotExists']); fn.call({ select: () => ({ from: () => ({ whereRaw: () => ({ andWhere: () => ({ whereIn: () => ({}) }) }) }) }) }); return qb },
  }
  applyFulfillmentTabFilter(qb, 'paid_lifecycle', 't1')
  assert.ok(calls.some((c) => c[0] === 'whereIn'))
}

testResolveCurrentStep()
testBuildFulfillmentRowActions()
testApplyFulfillmentTabFilter()
console.log('[unit] fulfillment-state-machine 3 passed')
