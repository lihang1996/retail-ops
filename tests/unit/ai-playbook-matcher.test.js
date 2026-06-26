const assert = require('assert')
const {
  matchPlaybook,
  buildPlaybookResponse,
  getSuggestedQuestions,
  canAccessPlaybook,
  resolvePlaybookSteps,
} = require('../../app/knowledge')

const OPS_PERMS = new Set(['order:view', 'stock:view', 'product:view', 'warehouse:view'])
const NO_PERMS = new Set()

function testOrderFulfillmentMatch() {
  const hit = matchPlaybook('订单从导入到发货怎么走？', OPS_PERMS)
  assert.ok(hit, 'should match order fulfillment')
  assert.strictEqual(hit.playbook.id, 'order-fulfillment')
  assert.ok(hit.score >= 2)
}

function testStockInboundMatch() {
  const hit = matchPlaybook('怎么入库', OPS_PERMS)
  assert.ok(hit)
  assert.strictEqual(hit.playbook.id, 'stock-inbound')
}

function testPermissionFilter() {
  const hit = matchPlaybook('订单怎么发货', NO_PERMS)
  assert.strictEqual(hit, null, 'no permission should not match order playbook')
}

function testCanAccessPlaybook() {
  const pb = require('../../app/knowledge/playbooks/order-fulfillment')
  assert.strictEqual(canAccessPlaybook(pb, OPS_PERMS), true)
  assert.strictEqual(canAccessPlaybook(pb, NO_PERMS), false)
}

function testResolveStepsHavePaths() {
  const pb = require('../../app/knowledge/playbooks/order-fulfillment')
  const steps = resolvePlaybookSteps(pb, 'retail')
  assert.ok(steps.length >= 4)
  steps.forEach((s) => {
    assert.ok(s.path, `step ${s.order} should have path`)
    assert.ok(s.path.includes('/view/dashboard'), `path should be dashboard url: ${s.path}`)
  })
}

function testBuildPlaybookResponseShape() {
  const pb = require('../../app/knowledge/playbooks/demo-golden-path')
  const res = buildPlaybookResponse(pb)
  assert.strictEqual(res.type, 'playbook')
  assert.strictEqual(res.playbookId, pb.id)
  assert.ok(res.answer.includes(pb.summary.slice(0, 10)))
  assert.ok(Array.isArray(res.steps))
  assert.ok(res.links.length > 0)
}

function testSuggestedQuestions() {
  const qs = getSuggestedQuestions(OPS_PERMS, 5)
  assert.ok(qs.length > 0)
  assert.ok(qs.some((q) => q.includes('订单') || q.includes('发货') || q.includes('入库')))
}

function testApprovalFlowMatch() {
  const perms = new Set(['approval:view', 'approval:approve'])
  const hit = matchPlaybook('上架审批在哪里处理？', perms)
  assert.ok(hit)
  assert.strictEqual(hit.playbook.id, 'approval-flow')
}

function run() {
  testOrderFulfillmentMatch()
  testStockInboundMatch()
  testApprovalFlowMatch()
  testPermissionFilter()
  testCanAccessPlaybook()
  testResolveStepsHavePaths()
  testBuildPlaybookResponseShape()
  testSuggestedQuestions()
  console.log('ai-playbook-matcher.test.js: all passed')
}

run()
