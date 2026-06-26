/**
 * @module knowledge
 * @description 业务流程 playbook 知识库：加载、匹配、路径解析、推荐问题
 */
const { resolvePlaybookPath } = require('../common/dashboard-paths')

const PLAYBOOKS = [
  require('./playbooks/demo-golden-path'),
  require('./playbooks/order-fulfillment'),
  require('./playbooks/product-onboarding'),
  require('./playbooks/approval-flow'),
  require('./playbooks/stock-inbound'),
  require('./playbooks/warehouse-picking'),
]

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, '')
}

function canAccessPlaybook(playbook, permissionCodes = new Set()) {
  const required = playbook.permissionsAny || []
  if (!required.length) return true
  return required.some((code) => permissionCodes.has(code))
}

function scorePlaybook(question, playbook) {
  const q = normalizeText(question)
  let score = 0
  for (const keyword of playbook.keywords || []) {
    const k = normalizeText(keyword)
    if (!k) continue
    if (q.includes(k)) score += k.length >= 4 ? 3 : 2
  }
  if (normalizeText(playbook.title) && q.includes(normalizeText(playbook.title))) {
    score += 4
  }
  for (const sq of playbook.suggestQuestions || []) {
    const s = normalizeText(sq)
    if (s && (q.includes(s) || s.includes(q))) score += 5
  }
  return score
}

function matchPlaybook(question, permissionCodes = new Set()) {
  let best = null
  let bestScore = 0
  for (const playbook of PLAYBOOKS) {
    if (!canAccessPlaybook(playbook, permissionCodes)) continue
    const score = scorePlaybook(question, playbook)
    if (score > bestScore) {
      bestScore = score
      best = playbook
    }
  }
  if (!best || bestScore < 2) return null
  return { playbook: best, score: bestScore }
}

function resolvePlaybookSteps(playbook, projKey = 'retail') {
  return (playbook.steps || []).map((step) => {
    const path = resolvePlaybookPath(step.pathKey, {
      projKey,
      pathQuery: step.pathQuery || {},
    })
    return {
      order: step.order,
      title: step.title,
      description: step.description,
      path,
      linkLabel: step.linkLabel || step.title,
    }
  })
}

function formatPlaybookAnswer(playbook, steps) {
  const lines = [
    playbook.summary,
    '',
    playbook.stateFlow ? `状态流转：${playbook.stateFlow}` : null,
    '',
    '操作步骤：',
    ...steps.map((s) => `${s.order}. ${s.title}：${s.description}`),
  ].filter(Boolean)
  return lines.join('\n')
}

function buildPlaybookResponse(playbook, { projKey = 'retail' } = {}) {
  const steps = resolvePlaybookSteps(playbook, projKey)
  const links = steps
    .filter((s) => s.path)
    .map((s) => ({ label: s.linkLabel, path: s.path }))

  return {
    type: 'playbook',
    playbookId: playbook.id,
    playbookTitle: playbook.title,
    answer: formatPlaybookAnswer(playbook, steps),
    steps,
    links,
    dataSource: `playbook:${playbook.id}`,
    queryCondition: null,
    rows: [],
  }
}

function getSuggestedQuestions(permissionCodes = new Set(), limit = 8) {
  const questions = []
  for (const playbook of PLAYBOOKS) {
    if (!canAccessPlaybook(playbook, permissionCodes)) continue
    for (const q of playbook.suggestQuestions || []) {
      if (!questions.includes(q)) questions.push(q)
    }
    if (questions.length >= limit) break
  }
  return questions.slice(0, limit)
}

function listAccessiblePlaybooks(permissionCodes = new Set()) {
  return PLAYBOOKS.filter((p) => canAccessPlaybook(p, permissionCodes)).map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.summary,
  }))
}

module.exports = {
  PLAYBOOKS,
  canAccessPlaybook,
  scorePlaybook,
  matchPlaybook,
  resolvePlaybookSteps,
  buildPlaybookResponse,
  getSuggestedQuestions,
  listAccessiblePlaybooks,
}
