#!/usr/bin/env node
/**
 * M8-06 API 层黄金链路冒烟（需 MySQL 已 migrate+seed，服务已启动）
 *
 *   npm run build:prod && npm run dev   # 另开终端
 *   node scripts/e2e-smoke.js
 *
 * 环境变量：SMOKE_BASE_URL（默认 http://127.0.0.1:8080）
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8080'
const ACCOUNT = process.env.SMOKE_ACCOUNT || 'admin@retail.demo'
const PASSWORD = process.env.SMOKE_PASSWORD || 'demo123'
const PROJ = 'retail'

let passed = 0
let failed = 0

function ok(label) {
  passed += 1
  console.log(`  ✓ ${label}`)
}

function fail(label, detail) {
  failed += 1
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ''}`)
}

async function request(method, path, { token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

async function main() {
  console.log(`[e2e-smoke] base=${BASE}`)

  // 1. health
  try {
    const h = await request('GET', '/health')
    if (h.status === 200) ok('GET /health')
    else fail('GET /health', `status ${h.status}`)
  } catch (e) {
    fail('GET /health', e.message)
    console.error('\n服务未启动或不可达，请先 npm run dev')
    process.exit(1)
  }

  // 2. login
  let token
  try {
    const login = await request('POST', '/api/auth/login', {
      body: { account: ACCOUNT, password: PASSWORD },
    })
    token = login.json?.data?.token
    if (token) ok(`POST /api/auth/login (${ACCOUNT})`)
    else fail('POST /api/auth/login', login.json?.message || 'no token')
  } catch (e) {
    fail('POST /api/auth/login', e.message)
    process.exit(1)
  }

  const q = (path) => `${path}${path.includes('?') ? '&' : '?'}proj_key=${PROJ}`
  const authGet = (path) => request('GET', q(path), { token })

  // 3. dashboard
  const dash = await authGet('/api/proj/dashboard/overview')
  if (dash.status === 200 && dash.json?.success !== false) ok('GET dashboard/overview')
  else fail('GET dashboard/overview', dash.json?.message)

  // 4. stock list
  const stock = await authGet('/api/proj/stock/list')
  if (stock.status === 200) ok('GET stock/list')
  else fail('GET stock/list', stock.json?.message)

  // 5. order list
  const orders = await authGet('/api/proj/order/list')
  if (orders.status === 200) ok('GET order/list')
  else fail('GET order/list', orders.json?.message)

  // 6. warehouse layout (3D)
  const layout = await authGet('/api/proj/warehouse/layout')
  if (layout.status === 200) ok('GET warehouse/layout')
  else fail('GET warehouse/layout', layout.json?.message)

  // 7. audit list
  const audit = await authGet('/api/proj/audit/list')
  if (audit.status === 200) ok('GET audit/list')
  else fail('GET audit/list', audit.json?.message)

  // 8. AI query
  const ai = await request('POST', q('/api/proj/ai/query'), {
    token,
    body: { question: '库存不足的 SKU' },
  })
  if (ai.status === 200) ok('POST ai/query')
  else fail('POST ai/query', ai.json?.message)

  // 9. approval todo
  const approval = await authGet('/api/proj/approval/todo_list')
  if (approval.status === 200) ok('GET approval/todo_list')
  else fail('GET approval/todo_list', approval.json?.message)

  // 10. finance summary
  const finance = await authGet('/api/proj/finance/summary')
  if (finance.status === 200) ok('GET finance/summary')
  else fail('GET finance/summary', finance.json?.message)

  // 11. customer list
  const customer = await authGet('/api/proj/customer/list')
  if (customer.status === 200) ok('GET customer/list')
  else fail('GET customer/list', customer.json?.message)

  // 12. marketing list
  const marketing = await authGet('/api/proj/marketing/activity/list')
  if (marketing.status === 200) ok('GET marketing/activity/list')
  else fail('GET marketing/activity/list', marketing.json?.message)

  // 13. session refresh (me)
  const me = await request('GET', '/api/auth/me', { token })
  if (me.status === 200 && me.json?.data?.user) ok('GET auth/me (session)')
  else fail('GET auth/me', me.json?.message)

  console.log(`\n[e2e-smoke] ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[e2e-smoke] fatal:', err)
  process.exit(1)
})
