#!/usr/bin/env node
/**
 * Real API/DB concurrency smoke.
 *
 * Requires a running service with migrated DB:
 *   SMOKE_BASE_URL=http://127.0.0.1:8090 node scripts/order-concurrency-smoke.js
 */
const XLSX = require('xlsx')

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8090'
const ACCOUNT = process.env.SMOKE_ACCOUNT || 'admin@retail.demo'
const PASSWORD = process.env.SMOKE_PASSWORD || 'demo123'
const PROJ = 'retail'

function log(message) {
  console.log(`[order-concurrency] ${message}`)
}

function fail(message, detail = '') {
  console.error(`[order-concurrency] failed: ${message}${detail ? ` - ${detail}` : ''}`)
  process.exit(1)
}

async function request(method, path, { token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (path.includes('/api/proj/')) headers.proj_key = PROJ
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { success: false, message: text || `HTTP ${res.status}` }
  }
  return json
}

async function api(method, path, token, body) {
  return request(method, path, { token, body })
}

async function main() {
  log(`base=${BASE}`)
  try {
    const health = await fetch(`${BASE}/health`)
    if (!health.ok) fail('health check', `HTTP ${health.status}`)
  } catch (error) {
    fail('health check', error.message)
  }

  const login = await api('POST', '/api/auth/login', null, { account: ACCOUNT, password: PASSWORD })
  const token = login?.data?.token
  if (!token) fail('login', login?.message || 'no token')
  log(`login ok: ${ACCOUNT}`)

  const tag = Date.now()
  const productRes = await api('POST', '/api/proj/product', token, {
    product_name: `CONCURRENCY-${tag}`,
    category_id: 'cat_drink',
    brand_id: 'brand_demo',
    main_image: 'https://example.com/concurrency.png',
    description: 'Concurrency smoke product',
  })
  const productId = productRes?.data?.productId || productRes?.data?.product_id
  if (!productId) fail('create product', productRes?.message || JSON.stringify(productRes))

  const skuCode = `SKU-CONC-${tag}`
  const skuRes = await api('POST', '/api/proj/product/sku', token, {
    product_id: productId,
    sku_code: skuCode,
    sale_price: 12.5,
    cost_price: 6,
  })
  const skuId = skuRes?.data?.skuId || skuRes?.data?.sku_id
  if (!skuId) fail('create sku', skuRes?.message || JSON.stringify(skuRes))

  const submitRes = await api('POST', '/api/proj/product/submit_review', token, { product_id: productId })
  const approvalId = submitRes?.data?.approvalId
  if (!approvalId) fail('submit approval', submitRes?.message || JSON.stringify(submitRes))

  const approveRes = await api('POST', '/api/proj/approval/approve', token, {
    approval_id: approvalId,
    remark: 'Concurrency smoke approval',
  })
  if (!approveRes?.success) fail('approve product', approveRes?.message)

  const inboundRes = await api('POST', '/api/proj/stock/inbound', token, {
    warehouse_id: 'wh_main',
    location_id: 'loc_a1_02',
    sku_id: skuId,
    qty: 5,
    remark: 'Concurrency smoke inbound',
  })
  if (!inboundRes?.success) fail('inbound stock', inboundRes?.message)

  const orderNo = `CONC-PAY-${tag}`
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['店铺名称', 'SKU编码', '数量', '单价', '订单号'],
      ['天猫旗舰店', skuCode, 1, 12.5, orderNo],
    ]),
    'orders',
  )
  const fd = new FormData()
  fd.append('file', new Blob([Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))]), 'concurrency-order.xlsx')
  const importRes = await request('POST', '/api/proj/order/import', { token, form: fd })
  if (!importRes?.success || (importRes?.data?.success || 0) < 1) {
    fail('import order', importRes?.data?.errors?.[0]?.reason || importRes?.message)
  }

  const ordersRes = await api('GET', '/api/proj/order/list', token)
  const order = (ordersRes?.data || []).find((row) => row.order_no === orderNo)
  if (!order) fail('find imported order', orderNo)

  const attempts = await Promise.allSettled([
    api('POST', '/api/proj/order/pay', token, { order_id: order.order_id }),
    api('POST', '/api/proj/order/pay', token, { order_id: order.order_id }),
  ])
  const responses = attempts.map((item) => (item.status === 'fulfilled' ? item.value : { success: false, message: item.reason?.message }))
  const successCount = responses.filter((res) => res?.success).length
  if (successCount !== 1) {
    fail('concurrent pay should succeed exactly once', JSON.stringify(responses))
  }

  const detail = await api('GET', `/api/proj/order?order_id=${order.order_id}`, token)
  const paid = detail?.data?.status === 'paid'
  const lockCount = Array.isArray(detail?.data?.stockLocks) ? detail.data.stockLocks.length : 0
  if (!paid || lockCount !== 1) {
    fail('order detail after concurrent pay', `status=${detail?.data?.status} locks=${lockCount}`)
  }

  log('concurrent pay ok: 1 success, 1 rejected, one stock lock')
}

main().catch((error) => fail('fatal', error.stack || error.message))
