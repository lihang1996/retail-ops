/**
 * 刷新近 7 天订单趋势数据：校正历史订单日期 + 补充每日订单量梯度。
 * 每次 seed 执行时按「当前日期」重算 created_at，确保趋势图有数据。
 */
const TENANT_ID = 'tenant_demo_retail'
const STORE_TMALL = 'store_tmall'
const WH_MAIN = 'wh_main'

function daysAgo(days, hour = 10, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d
}

function money(n) {
  return Math.round(n * 100) / 100
}

async function upsert(knex, table, row, conflict) {
  await knex(table).insert(row).onConflict(conflict).merge()
}

exports.seed = async (knex) => {
  const skuRows = await knex('product_skus as sku')
    .leftJoin('products as p', 'sku.product_id', 'p.product_id')
    .where('sku.tenant_id', TENANT_ID)
    .whereIn('sku.sku_code', [
      'SKU-DEMO-001', 'SKU-DEMO-002', 'SKU-FOOD-009', 'SKU-DRINK-010',
      'SKU-DAILY-011', 'SKU-BEAU-013', 'SKU-BABY-014',
    ])
    .select('sku.*', 'p.product_name')

  const skuByCode = new Map(skuRows.map((r) => [r.sku_code, r]))
  const customers = await knex('customers').where({ tenant_id: TENANT_ID }).limit(20)
  if (!customers.length || !skuRows.length) return

  // 1) 把历史演示订单的 created_at 拉回近 7 天
  const histOrders = await knex('orders')
    .where({ tenant_id: TENANT_ID })
    .where((qb) => {
      qb.where('order_id', 'like', 'order_hist_%')
        .orWhere('order_id', 'like', 'order_trend_%')
    })
    .orderBy('order_no', 'asc')

  let histIdx = 0
  for (let d = 6; d >= 0; d -= 1) {
    for (let slot = 0; slot < 4 && histIdx < histOrders.length; slot += 1) {
      const at = daysAgo(d, 9 + slot, 12 + slot * 7)
      await knex('orders')
        .where({ order_id: histOrders[histIdx].order_id })
        .update({ created_at: at, updated_at: at })
      histIdx += 1
    }
  }

  // 2) 按天补充趋势订单（已发货全链路），数量逐日递增
  const dailyCounts = [4, 6, 7, 9, 10, 12, 14]
  const skuCodes = [...skuByCode.keys()]

  for (let d = 6; d >= 0; d -= 1) {
    const dayIndex = 6 - d
    const count = dailyCounts[dayIndex]

    for (let i = 0; i < count; i += 1) {
      const orderId = `order_trend_d${dayIndex}_${i + 1}`
      const orderNo = `ORD-TREND-${dayIndex}-${String(i + 1).padStart(2, '0')}`
      const skuCode = skuCodes[(dayIndex * 3 + i) % skuCodes.length]
      const sku = skuByCode.get(skuCode)
      if (!sku) continue

      const qty = 1 + ((dayIndex + i) % 3)
      const unitPrice = parseFloat(sku.sale_price)
      const amount = money(qty * unitPrice)
      const createdAt = daysAgo(d, 8 + (i % 5), (i * 11) % 60)
      const shippedAt = daysAgo(d, 15 + (i % 4), 20 + (i % 30))
      const customer = customers[(dayIndex + i) % customers.length]
      const itemId = `item_${orderId}`
      const lockId = `lock_${itemId}`
      const shipmentId = `ship_${orderId}`

      await upsert(knex, 'orders', {
        order_id: orderId,
        tenant_id: TENANT_ID,
        order_no: orderNo,
        store_id: STORE_TMALL,
        customer_id: customer.customer_id,
        warehouse_id: WH_MAIN,
        status: 'shipped',
        total_amount: amount,
        currency: 'CNY',
        created_at: createdAt,
        updated_at: shippedAt,
      }, ['tenant_id', 'order_no'])

      await upsert(knex, 'order_items', {
        item_id: itemId,
        tenant_id: TENANT_ID,
        order_id: orderId,
        sku_id: sku.sku_id,
        sku_code: sku.sku_code,
        product_name: sku.product_name,
        qty,
        unit_price: unitPrice,
        amount,
        lock_id: lockId,
        created_at: createdAt,
        updated_at: createdAt,
      }, 'item_id')

      await upsert(knex, 'payments', {
        payment_id: `pay_${orderId}`,
        tenant_id: TENANT_ID,
        order_id: orderId,
        amount,
        pay_method: 'online',
        status: 'success',
        paid_at: daysAgo(d, 9 + (i % 4)),
        created_at: createdAt,
        updated_at: createdAt,
      }, 'payment_id')

      await upsert(knex, 'order_status_logs', {
        log_id: `olog_${orderId}_ship`,
        tenant_id: TENANT_ID,
        order_id: orderId,
        from_status: 'allocated',
        to_status: 'shipped',
        remark: '趋势演示订单已发货',
        operator_id: 'user_warehouse',
        created_at: shippedAt,
      }, 'log_id')

      await upsert(knex, 'stock_locks', {
        lock_id: lockId,
        tenant_id: TENANT_ID,
        sku_id: sku.sku_id,
        warehouse_id: WH_MAIN,
        qty: 0,
        ref_type: 'order',
        ref_id: orderId,
        status: 'consumed',
        created_at: createdAt,
        updated_at: shippedAt,
      }, 'lock_id')

      await upsert(knex, 'shipments', {
        shipment_id: shipmentId,
        tenant_id: TENANT_ID,
        order_id: orderId,
        warehouse_id: WH_MAIN,
        shipment_no: `SHP-TREND-${dayIndex}-${i + 1}`,
        status: 'shipped',
        created_at: createdAt,
        updated_at: shippedAt,
      }, 'shipment_id')

      await upsert(knex, 'shipment_items', {
        item_id: `sitem_${orderId}`,
        tenant_id: TENANT_ID,
        shipment_id: shipmentId,
        sku_id: sku.sku_id,
        qty,
        suggested_location_id: 'loc_a1_01',
        picked_location_id: 'loc_a1_01',
        created_at: createdAt,
        updated_at: shippedAt,
      }, 'item_id')

      await upsert(knex, 'logistics', {
        logistics_id: `logi_${orderId}`,
        tenant_id: TENANT_ID,
        shipment_id: shipmentId,
        carrier: '顺丰速运',
        tracking_no: `SF-TREND-${dayIndex}${i + 1}`,
        shipped_at: shippedAt,
        created_at: shippedAt,
        updated_at: shippedAt,
      }, 'logistics_id')

      await upsert(knex, 'stock_logs', {
        log_id: `slog_trend_${orderId}`,
        tenant_id: TENANT_ID,
        sku_id: sku.sku_id,
        warehouse_id: WH_MAIN,
        action_type: 'outbound',
        qty_change: -qty,
        before_qty: 500,
        after_qty: 500 - qty,
        ref_type: 'shipment',
        ref_id: shipmentId,
        operator_id: 'user_warehouse',
        created_at: shippedAt,
      }, 'log_id')
    }
  }
}
