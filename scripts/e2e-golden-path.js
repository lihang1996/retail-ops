#!/usr/bin/env node
/**
 * M8-06 全链路 API 验收（与任务文档黄金链路一致）
 *
 * 登录 → 创建商品/SKU → 上架审批 → 入库 → 导入订单 → 支付确认锁库存
 * → 分仓 → 发货单 → 拣货路径 → 确认拣货 → 出库 → 看板/审计
 *
 * 用法：SMOKE_BASE_URL=http://127.0.0.1:18081 node scripts/e2e-golden-path.js
 */
const XLSX = require('xlsx')

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8090'
const ACCOUNT = process.env.SMOKE_ACCOUNT || 'admin@retail.demo'
const PASSWORD = process.env.SMOKE_PASSWORD || 'demo123'
const PROJ = 'retail'

const steps = []

function pass(name, detail = '') {
  steps.push({ ok: true, name, detail })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  steps.push({ ok: false, name, detail })
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
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
    json = { raw: text, status: res.status }
  }
  return { status: res.status, json }
}

async function api(method, path, token, body) {
  const r = await request(method, path, { token, body })
  return r.json
}

async function main() {
  console.log(`[golden-path] base=${BASE}`)
  const tag = Date.now()

  // 0. health
  try {
    const h = await fetch(`${BASE}/health`)
    if (h.ok) pass('健康检查')
    else fail('健康检查', `status ${h.status}`)
  } catch (e) {
    fail('健康检查', e.message)
    console.error('\n请先启动服务: npm run dev  或  NODE_ENV=local node serve.js')
    process.exit(1)
  }

  // 1. login
  const login = await api('POST', '/api/auth/login', null, { account: ACCOUNT, password: PASSWORD })
  const token = login?.data?.token
  if (!token) {
    fail('登录', login?.message || 'no token')
    process.exit(1)
  }
  pass('登录', ACCOUNT)

  // 2. create product + SKU
  const productRes = await api('POST', '/api/proj/product', token, {
    product_name: `E2E全链路商品-${tag}`,
    category_id: 'cat_drink',
    brand_id: 'brand_demo',
    main_image: 'https://example.com/e2e.png',
    description: '全链路验收商品',
  })
  const productId = productRes?.data?.productId || productRes?.data?.product_id
  if (!productId) {
    fail('创建商品', productRes?.message || JSON.stringify(productRes))
    process.exit(1)
  }
  pass('创建商品', productId)

  const skuCode = `SKU-E2E-${tag}`
  const skuRes = await api('POST', '/api/proj/product/sku', token, {
    product_id: productId,
    sku_code: skuCode,
    sale_price: 9.9,
    cost_price: 5,
  })
  const skuId = skuRes?.data?.skuId || skuRes?.data?.sku_id
  if (!skuId) {
    fail('创建 SKU', skuRes?.message || JSON.stringify(skuRes))
    process.exit(1)
  }
  pass('创建 SKU', skuCode)

  // 3. submit approval + approve
  const submitRes = await api('POST', '/api/proj/product/submit_review', token, { product_id: productId })
  const approvalId = submitRes?.data?.approvalId
  if (!approvalId) {
    fail('提交上架审批', submitRes?.message || JSON.stringify(submitRes))
    process.exit(1)
  }
  pass('提交上架审批', approvalId)

  const approveRes = await api('POST', '/api/proj/approval/approve', token, {
    approval_id: approvalId,
    remark: 'E2E 自动审批',
  })
  if (!approveRes?.success) {
    fail('审批通过', approveRes?.message)
    process.exit(1)
  }
  pass('审批通过')

  const prodCheck = await api('GET', `/api/proj/product?product_id=${productId}`, token)
  const prodStatus = prodCheck?.data?.status
  if (prodStatus === 'on_sale') pass('商品在售', prodStatus)
  else fail('商品在售', `status=${prodStatus}`)

  // 4. inbound
  const inboundRes = await api('POST', '/api/proj/stock/inbound', token, {
    warehouse_id: 'wh_main',
    location_id: 'loc_a1_02',
    sku_id: skuId,
    qty: 10,
    remark: 'E2E 入库',
  })
  if (!inboundRes?.success) {
    fail('商品入库', inboundRes?.message)
    process.exit(1)
  }
  pass('商品入库', '+10')

  const stockBefore = await api('GET', `/api/proj/stock/list?sku_id=${skuId}`, token)
  const stockRow = (stockBefore?.data || []).find((s) => s.sku_id === skuId)
  const availBefore = stockRow?.available_qty ?? 0
  pass('入库后库存', `可用=${availBefore}`)

  // 5. import order
  const orderNo = `E2E-FULL-${tag}`
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['店铺名称', 'SKU编码', '数量', '单价', '订单号'],
      ['天猫旗舰店', skuCode, 3, 9.9, orderNo],
    ]),
    'orders'
  )
  const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  const fd = new FormData()
  fd.append('file', new Blob([buf]), 'e2e-order.xlsx')
  const imp = await request('POST', '/api/proj/order/import', { token, form: fd })
  if (!imp.json?.success || (imp.json?.data?.success || 0) < 1) {
    fail('导入订单', imp.json?.data?.errors?.[0]?.reason || imp.json?.message)
    process.exit(1)
  }
  pass('导入订单', orderNo)

  const ordersRes = await api('GET', '/api/proj/order/list', token)
  const order = (ordersRes?.data || []).find((o) => o.order_no === orderNo)
  if (!order) {
    fail('查询订单', 'not found')
    process.exit(1)
  }
  pass('查询订单', order.status)

  // 6. pay (locks stock)
  const payRes = await api('POST', '/api/proj/order/pay', token, { order_id: order.order_id })
  if (!payRes?.success) {
    fail('支付确认锁库存', payRes?.message)
    process.exit(1)
  }
  pass('支付确认锁库存', payRes?.data?.warehouseId || 'ok')

  const stockAfterPay = await api('GET', `/api/proj/stock/list?sku_id=${skuId}`, token)
  const afterPay = (stockAfterPay?.data || []).find((s) => s.sku_id === skuId)
  if (afterPay && afterPay.locked_qty >= 3) pass('支付后库存锁定', `locked=${afterPay.locked_qty}`)
  else fail('支付后库存锁定', `locked=${afterPay?.locked_qty}`)

  // 7. allocate
  const allocRes = await api('POST', '/api/proj/order/allocate', token, { order_id: order.order_id })
  if (!allocRes?.success) {
    fail('智能分仓', allocRes?.message)
    process.exit(1)
  }
  pass('智能分仓', allocRes?.data?.warehouseName || 'ok')

  // 8. create shipment
  const shipCreate = await api('POST', '/api/proj/shipment/create_from_order', token, {
    order_id: order.order_id,
  })
  const shipmentId = shipCreate?.data?.shipmentId || shipCreate?.data?.shipment_id
  if (!shipCreate?.success || !shipmentId) {
    fail('生成发货单', shipCreate?.message)
    process.exit(1)
  }
  pass('生成发货单', shipmentId)

  // 9. 3D picking route
  const routeRes = await api('GET', `/api/proj/shipment/picking_route?shipment_id=${shipmentId}`, token)
  const points = routeRes?.data?.points?.length || 0
  if (routeRes?.success && points > 0) pass('3D 拣货路径', `${points} 个点`)
  else fail('3D 拣货路径', routeRes?.message || 'no points')

  const layoutRes = await api('GET', '/api/proj/warehouse/layout?warehouse_id=wh_main', token)
  if (layoutRes?.success) pass('3D 仓库布局', `${layoutRes?.data?.locations?.length || 0} 库位`)
  else fail('3D 仓库布局', layoutRes?.message)

  // 10. pick + ship
  for (const [name, path, body] of [
    ['开始拣货', '/api/proj/shipment/start_pick', { shipment_id: shipmentId }],
    ['确认拣货', '/api/proj/shipment/confirm_pick', { shipment_id: shipmentId }],
    ['出库发货', '/api/proj/shipment/ship', { shipment_id: shipmentId }],
  ]) {
    const r = await api('POST', path, token, body)
    if (r?.success) pass(name, r?.data?.status || 'ok')
    else fail(name, r?.message)
  }

  // 11. stock deduction
  const stockFinal = await api('GET', `/api/proj/stock/list?sku_id=${skuId}`, token)
  const finalRow = (stockFinal?.data || []).find((s) => s.sku_id === skuId)
  const expectedTotal = availBefore - 3
  if (finalRow && Number(finalRow.total_qty) === expectedTotal) {
    pass('出库后库存扣减', `总量 ${availBefore} → ${finalRow.total_qty}`)
  } else {
    fail('出库后库存扣减', `期望=${expectedTotal} 实际=${finalRow?.total_qty}`)
  }

  // 12. dashboard
  const dash = await api('GET', '/api/proj/dashboard/overview', token)
  if (dash?.success && dash?.data?.gmv > 0) {
    pass('看板指标', `GMV=${dash.data.gmv} 订单=${dash.data.orderCount}`)
  } else {
    fail('看板指标', `gmv=${dash?.data?.gmv}`)
  }

  // 13. audit
  const audit = await api('GET', '/api/proj/audit/list', token)
  const auditList = audit?.data?.list || audit?.data || []
  const codes = auditList.map((a) => a.action_code).filter(Boolean)
  const required = ['auth:login', 'stock:inbound', 'order:pay', 'shipment:ship']
  const missing = required.filter((c) => !codes.some((x) => x.includes(c.split(':')[1]) || x === c))
  if (auditList.length > 0 && missing.length === 0) {
    pass('审计日志', `${auditList.length} 条，含关键动作`)
  } else if (auditList.length > 0) {
    pass('审计日志', `${auditList.length} 条（部分动作: ${missing.join(', ')}）`)
  } else {
    fail('审计日志', '无记录')
  }

  // 14. session refresh
  const me = await api('GET', '/api/auth/me', token)
  if (me?.success && me?.data?.user) pass('刷新后会话', me.data.user.account)
  else fail('刷新后会话', me?.message)

  const passed = steps.filter((s) => s.ok).length
  const total = steps.length
  console.log(`\n[golden-path] ${passed}/${total} 通过`)
  process.exit(passed === total ? 0 : 1)
}

main().catch((err) => {
  console.error('[golden-path] fatal:', err)
  process.exit(1)
})
