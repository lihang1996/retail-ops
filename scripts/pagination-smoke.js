#!/usr/bin/env node
/**
 * 列表接口分页冒烟测试。
 *
 * 用法：
 *   SMOKE_BASE_URL=http://127.0.0.1:8090 node scripts/pagination-smoke.js
 *
 * 验证点：
 * - 接口返回 200 且 success !== false
 * - data 是数组
 * - data.length <= size
 * - metadata.total 是数字
 */
const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8090'
const ACCOUNT = process.env.SMOKE_ACCOUNT || 'admin@retail.demo'
const PASSWORD = process.env.SMOKE_PASSWORD || 'demo123'
const PROJ = 'retail'
const PAGE_SIZE = 2

const endpoints = [
  ['店铺列表', '/api/proj/store/list'],
  ['类目列表', '/api/proj/category/list'],
  ['品牌列表', '/api/proj/brand/list'],
  ['商品列表', '/api/proj/product/list'],
  ['仓库列表', '/api/proj/warehouse/list'],
  ['库位列表', '/api/proj/warehouse/location/list'],
  ['库存汇总', '/api/proj/stock/list'],
  ['库位库存兼容接口', '/api/proj/stock/location_list'],
  ['库位库存', '/api/proj/stock/location/list'],
  ['库存流水', '/api/proj/stock/log_list'],
  ['库存流水REST接口', '/api/proj/stock/log/list'],
  ['订单列表', '/api/proj/order/list'],
  ['发货单列表', '/api/proj/shipment/list'],
  ['部门列表', '/api/proj/org/department/list'],
  ['用户列表', '/api/proj/org/user/list'],
  ['角色列表', '/api/proj/org/role/list'],
  ['审批待办', '/api/proj/approval/todo_list'],
  ['客户列表', '/api/proj/customer/list'],
  ['审计日志', '/api/proj/audit/list'],
  ['营销活动', '/api/proj/marketing/activity/list'],
]

const compatibilityEndpoints = [
  ['履约工作台', '/api/proj/workbench/fulfillment?tab=all&page=1&page_size=2'],
  ['SKU 选择器', '/api/proj/product/sku_list?limit=2'],
]

let passed = 0
let failed = 0

function makeUrl(path) {
  const url = new URL(path, BASE)
  if (path.includes('/api/proj/')) url.searchParams.set('proj_key', PROJ)
  return url
}

async function request(method, path, { token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (path.includes('/api/proj/')) headers.proj_key = PROJ
  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(makeUrl(path), { method, headers, body: payload })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

function pass(label, detail = '') {
  passed += 1
  console.log(`  ✓ ${label}${detail ? ` ${detail}` : ''}`)
}

function fail(label, detail = '') {
  failed += 1
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ''}`)
}

function getTotal(json) {
  return json?.metadata?.total ?? json?.meta?.total
}

async function assertPaginatedEndpoint(token, label, path, page) {
  const url = new URL(path, BASE)
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', String(PAGE_SIZE))
  const normalizedPath = `${url.pathname}${url.search}`
  const res = await request('GET', normalizedPath, { token })
  const list = res.json?.data
  const total = getTotal(res.json)

  if (res.status !== 200 || res.json?.success === false) {
    fail(`${label} page=${page}`, res.json?.message || `status ${res.status}`)
    return
  }
  if (!Array.isArray(list)) {
    fail(`${label} page=${page}`, 'data 不是数组')
    return
  }
  if (list.length > PAGE_SIZE) {
    fail(`${label} page=${page}`, `返回 ${list.length} 条，超过 size=${PAGE_SIZE}`)
    return
  }
  if (!Number.isFinite(Number(total))) {
    fail(`${label} page=${page}`, 'metadata.total 不是数字')
    return
  }

  pass(`${label} page=${page}`, `rows=${list.length} total=${total}`)
}

async function assertCompatibilityEndpoint(token, label, path) {
  const res = await request('GET', path, { token })
  const list = res.json?.data
  const total = getTotal(res.json)
  if (res.status !== 200 || res.json?.success === false) {
    fail(label, res.json?.message || `status ${res.status}`)
    return
  }
  if (!Array.isArray(list)) {
    fail(label, 'data 不是数组')
    return
  }
  if (!Number.isFinite(Number(total))) {
    fail(label, 'metadata.total 不是数字')
    return
  }
  pass(label, `rows=${list.length} total=${total}`)
}

async function main() {
  console.log(`[pagination-smoke] base=${BASE}`)

  const health = await request('GET', '/health')
  if (health.status !== 200) {
    throw new Error(`服务不可用：GET /health status=${health.status}`)
  }
  pass('服务健康检查')

  const login = await request('POST', '/api/auth/login', {
    body: { account: ACCOUNT, password: PASSWORD },
  })
  const token = login.json?.data?.token
  if (!token) {
    throw new Error(`登录失败：${login.json?.message || `status=${login.status}`}`)
  }
  pass(`登录 ${ACCOUNT}`)

  for (const [label, path] of endpoints) {
    await assertPaginatedEndpoint(token, label, path, 1)
    await assertPaginatedEndpoint(token, label, path, 2)
  }

  for (const [label, path] of compatibilityEndpoints) {
    await assertCompatibilityEndpoint(token, label, path)
  }

  console.log(`\n[pagination-smoke] ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(`[pagination-smoke] fatal: ${error.message}`)
  process.exit(1)
})
