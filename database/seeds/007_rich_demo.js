/**
 * 扩充演示数据：更多商品/SKU、多仓库存梯度、客户、分状态订单。
 * 幂等：onConflict merge / 按固定 ID 插入。
 */
const TENANT_ID = 'tenant_demo_retail'
const STORE_ID = 'store_tmall'

exports.seed = async (knex) => {
  await knex('warehouses').insert({
    warehouse_id: 'wh_south',
    tenant_id: TENANT_ID,
    warehouse_name: '华南备仓',
    warehouse_code: 'WH-SC-01',
    address: '广州市白云区物流园 B 区',
    status: 'active',
  }).onConflict('warehouse_id').merge()

  const products = [
    { product_id: 'product_demo_02', product_name: '演示薯片 原味', category_id: 'cat_food', status: 'on_sale' },
    { product_id: 'product_demo_03', product_name: '演示橙汁 1L', category_id: 'cat_drink', status: 'on_sale' },
    { product_id: 'product_demo_04', product_name: '演示纸巾 10包', category_id: 'cat_daily', status: 'on_sale' },
    { product_id: 'product_demo_05', product_name: '演示洗衣液 2kg', category_id: 'cat_daily', status: 'draft' },
    { product_id: 'product_demo_06', product_name: '演示曲奇礼盒', category_id: 'cat_food', status: 'pending_review' },
    { product_id: 'product_demo_07', product_name: '演示气泡水 330ml', category_id: 'cat_drink', status: 'on_sale' },
    { product_id: 'product_demo_08', product_name: '演示坚果混合装', category_id: 'cat_food', status: 'off_sale' },
  ]

  for (const p of products) {
    await knex('products').insert({
      ...p,
      tenant_id: TENANT_ID,
      brand_id: 'brand_demo',
      main_image: 'https://via.placeholder.com/200',
      description: `${p.product_name} 演示数据`,
      created_by: 'user_admin',
      updated_by: 'user_admin',
    }).onConflict('product_id').merge()
  }

  const skus = [
    { sku_id: 'sku_demo_02', product_id: 'product_demo_02', sku_code: 'SKU-DEMO-002', sale_price: 8.9, stock_main: 320, stock_south: 80, warning: 40 },
    { sku_id: 'sku_demo_03', product_id: 'product_demo_03', sku_code: 'SKU-DEMO-003', sale_price: 12.5, stock_main: 45, stock_south: 120, warning: 50 },
    { sku_id: 'sku_demo_04', product_id: 'product_demo_04', sku_code: 'SKU-DEMO-004', sale_price: 19.9, stock_main: 8, stock_south: 15, warning: 20 },
    { sku_id: 'sku_demo_05', product_id: 'product_demo_05', sku_code: 'SKU-DEMO-005', sale_price: 39.0, stock_main: 0, stock_south: 0, warning: 10 },
    { sku_id: 'sku_demo_06', product_id: 'product_demo_06', sku_code: 'SKU-DEMO-006', sale_price: 58.0, stock_main: 200, stock_south: 60, warning: 30 },
    { sku_id: 'sku_demo_07', product_id: 'product_demo_07', sku_code: 'SKU-DEMO-007', sale_price: 4.5, stock_main: 5, stock_south: 3, warning: 15 },
    { sku_id: 'sku_demo_08', product_id: 'product_demo_08', sku_code: 'SKU-DEMO-008', sale_price: 29.9, stock_main: 150, stock_south: 40, warning: 25 },
  ]

  for (const sku of skus) {
    await knex('product_skus').insert({
      sku_id: sku.sku_id,
      tenant_id: TENANT_ID,
      product_id: sku.product_id,
      sku_code: sku.sku_code,
      sale_price: sku.sale_price,
      cost_price: sku.sale_price * 0.4,
      status: 'active',
    }).onConflict('sku_id').merge()

    for (const [whId, qty] of [['wh_main', sku.stock_main], ['wh_south', sku.stock_south]]) {
      const stockId = `stock_${sku.sku_id}_${whId}`
      await knex('stocks').insert({
        stock_id: stockId,
        tenant_id: TENANT_ID,
        sku_id: sku.sku_id,
        warehouse_id: whId,
        total_qty: qty,
        available_qty: qty,
        locked_qty: 0,
        in_transit_qty: 0,
        warning_qty: sku.warning,
        version: 0,
      }).onConflict(['tenant_id', 'sku_id', 'warehouse_id']).merge({
        total_qty: qty,
        available_qty: qty,
        warning_qty: sku.warning,
      })
    }
  }

  const customers = Array.from({ length: 12 }, (_, i) => ({
    customer_id: `cust_demo_${String(i + 1).padStart(2, '0')}`,
    tenant_id: TENANT_ID,
    customer_name: `演示客户${i + 1}`,
    phone: `1380013${String(8000 + i).slice(-4)}`,
    address: `上海市浦东新区演示路 ${i + 1} 号`,
  }))
  for (const c of customers) {
    await knex('customers').insert(c).onConflict('customer_id').merge()
  }

  const orderDefs = [
    { id: 'order_demo_pp_01', no: 'ORD-DEMO-PP-01', status: 'pending_payment', sku: 'SKU-DEMO-002', qty: 2, price: 8.9 },
    { id: 'order_demo_pp_02', no: 'ORD-DEMO-PP-02', status: 'pending_payment', sku: 'SKU-DEMO-003', qty: 1, price: 12.5 },
    { id: 'order_demo_pp_03', no: 'ORD-DEMO-PP-03', status: 'pending_payment', sku: 'SKU-DEMO-007', qty: 6, price: 4.5 },
    { id: 'order_demo_paid_01', no: 'ORD-DEMO-PAID-01', status: 'paid', sku: 'SKU-DEMO-001', qty: 3, price: 3.5 },
    { id: 'order_demo_paid_02', no: 'ORD-DEMO-PAID-02', status: 'paid', sku: 'SKU-DEMO-004', qty: 2, price: 19.9 },
    { id: 'order_demo_alloc_01', no: 'ORD-DEMO-ALLOC-01', status: 'allocated', sku: 'SKU-DEMO-002', qty: 4, price: 8.9, warehouse_id: 'wh_main' },
    { id: 'order_demo_alloc_02', no: 'ORD-DEMO-ALLOC-02', status: 'allocated', sku: 'SKU-DEMO-006', qty: 1, price: 58.0, warehouse_id: 'wh_south' },
    { id: 'order_demo_ship_01', no: 'ORD-DEMO-SHIP-01', status: 'allocated', sku: 'SKU-DEMO-003', qty: 2, price: 12.5, warehouse_id: 'wh_main', shipment: 'created' },
    { id: 'order_demo_ship_02', no: 'ORD-DEMO-SHIP-02', status: 'allocated', sku: 'SKU-DEMO-008', qty: 1, price: 29.9, warehouse_id: 'wh_main', shipment: 'picking' },
    { id: 'order_demo_ship_03', no: 'ORD-DEMO-SHIP-03', status: 'allocated', sku: 'SKU-DEMO-001', qty: 5, price: 3.5, warehouse_id: 'wh_main', shipment: 'picked' },
    { id: 'order_demo_done_01', no: 'ORD-DEMO-DONE-01', status: 'shipped', sku: 'SKU-DEMO-001', qty: 2, price: 3.5, warehouse_id: 'wh_main', shipment: 'shipped' },
    { id: 'order_demo_done_02', no: 'ORD-DEMO-DONE-02', status: 'shipped', sku: 'SKU-DEMO-002', qty: 1, price: 8.9, warehouse_id: 'wh_main', shipment: 'shipped' },
  ]

  for (const def of orderDefs) {
    const skuRow = await knex('product_skus').where({ tenant_id: TENANT_ID, sku_code: def.sku }).first()
    if (!skuRow) continue

    const amount = def.qty * def.price
    await knex('orders').insert({
      order_id: def.id,
      tenant_id: TENANT_ID,
      order_no: def.no,
      store_id: STORE_ID,
      customer_id: customers[0].customer_id,
      warehouse_id: def.warehouse_id || null,
      status: def.status,
      total_amount: amount,
      currency: 'CNY',
    }).onConflict(['tenant_id', 'order_no']).merge({
      status: def.status,
      warehouse_id: def.warehouse_id || null,
      total_amount: amount,
    })

    await knex('order_items').insert({
      item_id: `item_${def.id}`,
      tenant_id: TENANT_ID,
      order_id: def.id,
      sku_id: skuRow.sku_id,
      sku_code: def.sku,
      product_name: skuRow.product_id,
      qty: def.qty,
      unit_price: def.price,
      amount,
    }).onConflict('item_id').merge({
      qty: def.qty,
      unit_price: def.price,
      amount,
    })

    if (['paid', 'allocated', 'shipped'].includes(def.status)) {
      await knex('payments').insert({
        payment_id: `pay_${def.id}`,
        tenant_id: TENANT_ID,
        order_id: def.id,
        amount,
        pay_method: 'online',
        status: 'success',
        paid_at: knex.fn.now(),
      }).onConflict('payment_id').merge()
    }

    if (def.shipment) {
      const shipmentId = `ship_${def.id}`
      await knex('shipments').insert({
        shipment_id: shipmentId,
        tenant_id: TENANT_ID,
        order_id: def.id,
        warehouse_id: def.warehouse_id || 'wh_main',
        shipment_no: `SHP-${def.no}`,
        status: def.shipment,
      }).onConflict('shipment_id').merge({ status: def.shipment })

      await knex('shipment_items').insert({
        item_id: `sitem_${def.id}`,
        tenant_id: TENANT_ID,
        shipment_id: shipmentId,
        sku_id: skuRow.sku_id,
        qty: def.qty,
        suggested_location_id: 'loc_a1_01',
      }).onConflict('item_id').merge()
    }
  }

  await knex('marketing_activities').insert({
    activity_id: 'act_autumn',
    tenant_id: TENANT_ID,
    activity_name: '秋季上新',
    activity_type: 'promotion',
    status: 'active',
    start_at: knex.fn.now(),
  }).onConflict('activity_id').merge()
}
