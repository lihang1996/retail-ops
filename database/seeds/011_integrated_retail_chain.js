/**
 * 全链路串联演示数据（在 002/007/008/010 之后执行）
 * 店铺(010) → 类目/品牌(010) → 商品/SKU/库存 → 多店订单 → 审批 → 营销
 */
const TENANT_ID = 'tenant_demo_retail'
const WH_MAIN = 'wh_main'
const WH_SOUTH = 'wh_south'

const STORES = {
  tmall: 'store_tmall',
  jd: 'store_jd',
  douyin: 'store_douyin',
  wechat: 'store_wechat',
  offline: 'store_offline',
  omniSh: 'store_omni_sh',
  omniSz: 'store_omni_sz',
}

const OPERATORS = {
  admin: 'user_admin',
  ops: 'user_ops',
}

function daysAgo(days, hour = 10, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d
}

function money(n) {
  return Math.round(n * 100) / 100
}

async function upsertRow(knex, table, row, conflict) {
  const q = knex(table).insert(row)
  if (conflict) q.onConflict(conflict).merge()
  else q.onConflict().merge()
  await q
}

async function ensureStock(knex, { stockId, skuId, warehouseId, total, warning }) {
  await upsertRow(knex, 'stocks', {
    stock_id: stockId,
    tenant_id: TENANT_ID,
    sku_id: skuId,
    warehouse_id: warehouseId,
    total_qty: total,
    available_qty: total,
    locked_qty: 0,
    in_transit_qty: 0,
    warning_qty: warning,
    version: 0,
  }, ['tenant_id', 'sku_id', 'warehouse_id'])
}

async function loadSkuMap(knex) {
  const rows = await knex('product_skus as sku')
    .leftJoin('products as p', 'sku.product_id', 'p.product_id')
    .where('sku.tenant_id', TENANT_ID)
    .select('sku.*', 'p.product_name')
  const byCode = new Map()
  rows.forEach((r) => byCode.set(r.sku_code, r))
  return byCode
}

async function seedProductsAndStock(knex) {
  const catalog = [
    { product_id: 'product_demo_09', product_name: '鲜享每日坚果 200g', category_id: 'cat_snack', brand_id: 'brand_fresh', status: 'on_sale', sku_code: 'SKU-DEMO-009', price: 24.9, main: 180, south: 60, warn: 30 },
    { product_id: 'product_demo_10', product_name: '净泉矿泉水 550ml×12', category_id: 'cat_drink', brand_id: 'brand_pure', status: 'on_sale', sku_code: 'SKU-DEMO-010', price: 18.8, main: 420, south: 150, warn: 50 },
    { product_id: 'product_demo_11', product_name: '柔护婴儿洗衣液 1.5L', category_id: 'cat_baby', brand_id: 'brand_care', status: 'on_sale', sku_code: 'SKU-DEMO-011', price: 45.0, main: 95, south: 40, warn: 20 },
    { product_id: 'product_demo_12', product_name: '智家便携风扇', category_id: 'cat_appliance', brand_id: 'brand_tech', status: 'on_sale', sku_code: 'SKU-DEMO-012', price: 89.0, main: 65, south: 22, warn: 15 },
    { product_id: 'product_demo_13', product_name: '自然派海苔 8袋装', category_id: 'cat_snack', brand_id: 'brand_nature', status: 'on_sale', sku_code: 'SKU-DEMO-013', price: 16.5, main: 14, south: 6, warn: 20 },
    { product_id: 'product_demo_14', product_name: '臻选玻尿酸精华 30ml', category_id: 'cat_skincare', brand_id: 'brand_luxe', status: 'on_sale', sku_code: 'SKU-DEMO-014', price: 128.0, main: 88, south: 30, warn: 15 },
    { product_id: 'product_demo_15', product_name: '贝贝安婴儿米粉 500g', category_id: 'cat_baby', brand_id: 'brand_kids', status: 'on_sale', sku_code: 'SKU-DEMO-015', price: 52.0, main: 120, south: 45, warn: 25 },
    { product_id: 'product_demo_16', product_name: '自有品牌燕麦奶 1L', category_id: 'cat_drink', brand_id: 'brand_house', status: 'on_sale', sku_code: 'SKU-DEMO-016', price: 14.9, main: 200, south: 80, warn: 40 },
    { product_id: 'product_demo_17', product_name: '清洁护理除菌湿巾 60抽', category_id: 'cat_clean', brand_id: 'brand_care', status: 'on_sale', sku_code: 'SKU-DEMO-017', price: 12.8, main: 310, south: 100, warn: 35 },
    { product_id: 'product_demo_18', product_name: '演示品牌苏打饼干 400g', category_id: 'cat_food', brand_id: 'brand_demo', status: 'pending_review', sku_code: 'SKU-DEMO-018', price: 11.9, main: 160, south: 50, warn: 30 },
    { product_id: 'product_demo_19', product_name: '鲜享冷萃咖啡 250ml×6', category_id: 'cat_drink', brand_id: 'brand_fresh', status: 'on_sale', sku_code: 'SKU-DEMO-019', price: 39.9, main: 75, south: 28, warn: 20 },
    { product_id: 'product_demo_20', product_name: '智家电动剃须刀', category_id: 'cat_appliance', brand_id: 'brand_tech', status: 'draft', sku_code: 'SKU-DEMO-020', price: 199.0, main: 0, south: 0, warn: 10 },
    { product_id: 'product_demo_21', product_name: '净泉柠檬茶 500ml', category_id: 'cat_drink', brand_id: 'brand_pure', status: 'on_sale', sku_code: 'SKU-DEMO-021', price: 4.2, main: 500, south: 180, warn: 60 },
    { product_id: 'product_demo_22', product_name: '自然派芒果干 120g', category_id: 'cat_snack', brand_id: 'brand_nature', status: 'on_sale', sku_code: 'SKU-DEMO-022', price: 19.8, main: 9, south: 4, warn: 18 },
    { product_id: 'product_demo_23', product_name: '臻选丝绒口红 #07', category_id: 'cat_beauty', brand_id: 'brand_luxe', status: 'off_sale', sku_code: 'SKU-DEMO-023', price: 168.0, main: 40, south: 12, warn: 10 },
    { product_id: 'product_demo_24', product_name: '贝贝安纸尿裤 L码 54片', category_id: 'cat_baby', brand_id: 'brand_kids', status: 'on_sale', sku_code: 'SKU-DEMO-024', price: 89.0, main: 55, south: 20, warn: 15 },
    { product_id: 'product_demo_25', product_name: '柔护厨房油污净 500ml', category_id: 'cat_clean', brand_id: 'brand_care', status: 'on_sale', sku_code: 'SKU-DEMO-025', price: 22.5, main: 130, south: 45, warn: 25 },
    { product_id: 'product_demo_26', product_name: '自有品牌挂耳咖啡 10包', category_id: 'cat_food', brand_id: 'brand_house', status: 'on_sale', sku_code: 'SKU-DEMO-026', price: 35.0, main: 110, south: 38, warn: 20 },
    { product_id: 'product_demo_27', product_name: '智家空气炸锅 4L', category_id: 'cat_appliance', brand_id: 'brand_tech', status: 'pending_review', sku_code: 'SKU-DEMO-027', price: 299.0, main: 32, south: 10, warn: 8 },
    { product_id: 'product_demo_28', product_name: '演示品牌礼盒装曲奇', category_id: 'cat_food', brand_id: 'brand_demo', status: 'on_sale', sku_code: 'SKU-DEMO-028', price: 68.0, main: 85, south: 30, warn: 20 },
  ]

  for (const row of catalog) {
    const reviewStatus = row.status === 'pending_review' ? 'pending' : 'none'
    await upsertRow(knex, 'products', {
      product_id: row.product_id,
      tenant_id: TENANT_ID,
      product_name: row.product_name,
      category_id: row.category_id,
      brand_id: row.brand_id,
      status: row.status,
      review_status: reviewStatus,
      main_image: 'https://via.placeholder.com/200',
      description: `${row.product_name} — 全渠道零售演示商品，关联 ${row.category_id}/${row.brand_id}`,
      created_by: OPERATORS.admin,
      updated_by: OPERATORS.ops,
    }, 'product_id')

    const skuId = row.sku_code.toLowerCase().replace(/-/g, '_')
    await upsertRow(knex, 'product_skus', {
      sku_id: skuId,
      tenant_id: TENANT_ID,
      product_id: row.product_id,
      sku_code: row.sku_code,
      sale_price: row.price,
      cost_price: money(row.price * 0.42),
      status: 'active',
    }, 'sku_id')

    await ensureStock(knex, {
      stockId: `stock_${skuId}_${WH_MAIN}`,
      skuId,
      warehouseId: WH_MAIN,
      total: row.main,
      warning: row.warn,
    })
    await ensureStock(knex, {
      stockId: `stock_${skuId}_${WH_SOUTH}`,
      skuId,
      warehouseId: WH_SOUTH,
      total: row.south,
      warning: row.warn,
    })
  }

  // 补齐早期演示商品库存，保证商品列表「可用库存」有数
  await knex('products').where({ product_id: 'product_demo_01' }).update({ status: 'on_sale', brand_id: 'brand_pure', category_id: 'cat_drink' })
  await ensureStock(knex, {
    stockId: 'stock_sku_demo_01_wh_main',
    skuId: 'sku_demo_01',
    warehouseId: WH_MAIN,
    total: 500,
    warning: 50,
  })
  await ensureStock(knex, {
    stockId: 'stock_sku_demo_01_wh_south',
    skuId: 'sku_demo_01',
    warehouseId: WH_SOUTH,
    total: 120,
    warning: 30,
  })
}

async function seedCustomers(knex) {
  const rows = [
    { customer_id: 'cust_chain_01', customer_name: '陈晓东', phone: '13611110001', address: '上海市浦东新区张江路 88 号' },
    { customer_id: 'cust_chain_02', customer_name: '林雨晴', phone: '13611110002', address: '北京市朝阳区望京街 12 号' },
    { customer_id: 'cust_chain_03', customer_name: '黄俊杰', phone: '13611110003', address: '广州市天河区体育西路 66 号' },
    { customer_id: 'cust_chain_04', customer_name: '周美琳', phone: '13611110004', address: '深圳市南山区科技园 5 号' },
    { customer_id: 'cust_chain_05', customer_name: '吴浩然', phone: '13611110005', address: '杭州市西湖区文三路 200 号' },
    { customer_id: 'cust_chain_06', customer_name: '郑思琪', phone: '13611110006', address: '成都市高新区天府大道 18 号' },
    { customer_id: 'cust_chain_07', customer_name: '孙博文', phone: '13611110007', address: '南京市鼓楼区中山北路 30 号' },
    { customer_id: 'cust_chain_08', customer_name: '马思远', phone: '13611110008', address: '武汉市武昌区中南路 9 号' },
    { customer_id: 'cust_chain_09', customer_name: '朱嘉怡', phone: '13611110009', address: '苏州市工业园区星湖街 1 号' },
    { customer_id: 'cust_chain_10', customer_name: '胡宇航', phone: '13611110010', address: '西安市雁塔区高新路 77 号' },
    { customer_id: 'cust_chain_11', customer_name: '高晓彤', phone: '13611110011', address: '重庆市渝中区解放碑 2 号' },
    { customer_id: 'cust_chain_12', customer_name: '罗子轩', phone: '13611110012', address: '天津市和平区南京路 108 号' },
  ]
  for (const c of rows) {
    await upsertRow(knex, 'customers', { tenant_id: TENANT_ID, ...c }, 'customer_id')
  }
  return rows
}

async function seedStoreOrders(knex, skuMap, customers) {
  const bundles = [
    { id: 'order_chain_tmall_01', no: 'ORD-TM-240601', store: STORES.tmall, cust: 0, status: 'pending_payment', sku: 'SKU-DEMO-010', qty: 2, days: 0 },
    { id: 'order_chain_tmall_02', no: 'ORD-TM-240602', store: STORES.tmall, cust: 1, status: 'paid', sku: 'SKU-DEMO-014', qty: 1, days: 0 },
    { id: 'order_chain_jd_01', no: 'ORD-JD-240601', store: STORES.jd, cust: 2, status: 'paid', sku: 'SKU-DEMO-012', qty: 1, days: 1 },
    { id: 'order_chain_jd_02', no: 'ORD-JD-240602', store: STORES.jd, cust: 3, status: 'allocated', sku: 'SKU-DEMO-024', qty: 2, days: 1, wh: WH_MAIN },
    { id: 'order_chain_dy_01', no: 'ORD-DY-240601', store: STORES.douyin, cust: 4, status: 'pending_payment', sku: 'SKU-DEMO-013', qty: 3, days: 0 },
    { id: 'order_chain_dy_02', no: 'ORD-DY-240602', store: STORES.douyin, cust: 5, status: 'paid', sku: 'SKU-DEMO-019', qty: 1, days: 0 },
    { id: 'order_chain_wx_01', no: 'ORD-WX-240601', store: STORES.wechat, cust: 6, status: 'shipped', sku: 'SKU-DEMO-016', qty: 4, days: 2, wh: WH_MAIN },
    { id: 'order_chain_off_01', no: 'ORD-OF-240601', store: STORES.offline, cust: 7, status: 'shipped', sku: 'SKU-DEMO-001', qty: 6, days: 3, wh: WH_MAIN },
    { id: 'order_chain_omni_sh_01', no: 'ORD-SH-240601', store: STORES.omniSh, cust: 8, status: 'allocated', sku: 'SKU-DEMO-021', qty: 12, days: 0, wh: WH_MAIN },
    { id: 'order_chain_omni_sz_01', no: 'ORD-SZ-240601', store: STORES.omniSz, cust: 9, status: 'paid', sku: 'SKU-DEMO-025', qty: 2, days: 1 },
    { id: 'order_chain_tmall_03', no: 'ORD-TM-240603', store: STORES.tmall, cust: 10, status: 'shipped', sku: 'SKU-DEMO-028', qty: 1, days: 4, wh: WH_SOUTH },
    { id: 'order_chain_jd_03', no: 'ORD-JD-240603', store: STORES.jd, cust: 11, status: 'pending_payment', sku: 'SKU-DEMO-022', qty: 2, days: 0 },
    { id: 'order_chain_dy_03', no: 'ORD-DY-240603', store: STORES.douyin, cust: 0, status: 'paid', sku: 'SKU-DEMO-009', qty: 2, days: 0 },
    { id: 'order_chain_wx_02', no: 'ORD-WX-240602', store: STORES.wechat, cust: 1, status: 'allocated', sku: 'SKU-DEMO-017', qty: 5, days: 1, wh: WH_MAIN },
    { id: 'order_chain_off_02', no: 'ORD-OF-240602', store: STORES.offline, cust: 2, status: 'paid', sku: 'SKU-DEMO-026', qty: 1, days: 0 },
    { id: 'order_chain_omni_sh_02', no: 'ORD-SH-240602', store: STORES.omniSh, cust: 3, status: 'shipped', sku: 'SKU-DEMO-011', qty: 1, days: 5, wh: WH_MAIN },
    { id: 'order_chain_omni_sz_02', no: 'ORD-SZ-240602', store: STORES.omniSz, cust: 4, status: 'pending_payment', sku: 'SKU-DEMO-015', qty: 1, days: 0 },
    { id: 'order_chain_tmall_04', no: 'ORD-TM-240604', store: STORES.tmall, cust: 5, status: 'paid', sku: 'SKU-FOOD-009', qty: 3, days: 1 },
    { id: 'order_chain_jd_04', no: 'ORD-JD-240604', store: STORES.jd, cust: 6, status: 'shipped', sku: 'SKU-DRINK-016', qty: 2, days: 6, wh: WH_SOUTH },
    { id: 'order_chain_dy_04', no: 'ORD-DY-240604', store: STORES.douyin, cust: 7, status: 'allocated', sku: 'SKU-BEAU-013', qty: 1, days: 0, wh: WH_MAIN },
  ]

  for (const b of bundles) {
    const sku = skuMap.get(b.sku)
    if (!sku) continue

    const createdAt = daysAgo(b.days, 9 + (customers.length % 5), 0)
    const qty = b.qty
    const unitPrice = parseFloat(sku.sale_price)
    const amount = money(qty * unitPrice)
    const customer = customers[b.cust % customers.length]

    await upsertRow(knex, 'orders', {
      order_id: b.id,
      tenant_id: TENANT_ID,
      order_no: b.no,
      store_id: b.store,
      customer_id: customer.customer_id,
      warehouse_id: b.wh || null,
      status: b.status,
      total_amount: amount,
      currency: 'CNY',
      created_at: createdAt,
      updated_at: createdAt,
    }, ['tenant_id', 'order_no'])

    await upsertRow(knex, 'order_items', {
      item_id: `item_${b.id}_1`,
      tenant_id: TENANT_ID,
      order_id: b.id,
      sku_id: sku.sku_id,
      sku_code: sku.sku_code,
      product_name: sku.product_name,
      qty,
      unit_price: unitPrice,
      amount,
      created_at: createdAt,
      updated_at: createdAt,
    }, 'item_id')

    if (['paid', 'allocated', 'shipped'].includes(b.status)) {
      await upsertRow(knex, 'payments', {
        payment_id: `pay_${b.id}`,
        tenant_id: TENANT_ID,
        order_id: b.id,
        amount,
        pay_method: b.store === STORES.offline ? 'cash' : 'online',
        status: 'success',
        paid_at: daysAgo(b.days, 10),
        created_at: createdAt,
        updated_at: createdAt,
      }, 'payment_id')
    }

    await upsertRow(knex, 'order_status_logs', {
      log_id: `olog_${b.id}_create`,
      tenant_id: TENANT_ID,
      order_id: b.id,
      from_status: null,
      to_status: 'pending_payment',
      remark: `来自${b.store}下单`,
      operator_id: OPERATORS.ops,
      created_at: createdAt,
    }, 'log_id')

    if (b.status !== 'pending_payment') {
      await upsertRow(knex, 'order_status_logs', {
        log_id: `olog_${b.id}_paid`,
        tenant_id: TENANT_ID,
        order_id: b.id,
        from_status: 'pending_payment',
        to_status: 'paid',
        remark: '支付成功',
        operator_id: OPERATORS.ops,
        created_at: daysAgo(b.days, 10),
      }, 'log_id')
    }
  }
}

async function seedApprovals(knex) {
  const pending = [
    { approval_id: 'appr_chain_18', ref_id: 'product_demo_18', title: '苏打饼干上架审批' },
    { approval_id: 'appr_chain_27', ref_id: 'product_demo_27', title: '空气炸锅 4L 上架审批' },
  ]
  for (const row of pending) {
    await upsertRow(knex, 'approvals', {
      approval_id: row.approval_id,
      tenant_id: TENANT_ID,
      ref_type: 'product_on_sale',
      ref_id: row.ref_id,
      title: row.title,
      status: 'pending',
      applicant_id: OPERATORS.ops,
      created_at: daysAgo(0, 11),
      updated_at: daysAgo(0, 11),
    }, 'approval_id')
    await upsertRow(knex, 'approval_nodes', {
      node_id: `${row.approval_id}_n1`,
      approval_id: row.approval_id,
      node_order: 1,
      approver_role_id: 'role_admin',
      status: 'pending',
      created_at: daysAgo(0, 11),
      updated_at: daysAgo(0, 11),
    }, 'node_id')
  }
}

async function seedMarketing(knex) {
  await upsertRow(knex, 'marketing_activities', {
    activity_id: 'act_store_week',
    tenant_id: TENANT_ID,
    activity_name: '全渠道周末购',
    activity_type: 'promotion',
    status: 'active',
    start_at: daysAgo(1, 0),
    end_at: daysAgo(-6, 23),
  }, 'activity_id')

  const maps = [
    { id: 'map_chain_01', activity_id: 'act_store_week', product_id: 'product_demo_10', sku_id: 'sku_demo_010', promo_price: 15.9 },
    { id: 'map_chain_02', activity_id: 'act_store_week', product_id: 'product_demo_21', sku_id: 'sku_demo_021', promo_price: 3.5 },
    { id: 'map_chain_03', activity_id: 'act_store_week', product_id: 'product_demo_09', sku_id: 'sku_demo_009', promo_price: 19.9 },
    { id: 'map_chain_04', activity_id: 'act_1111', product_id: 'product_demo_14', sku_id: 'sku_demo_014', promo_price: 99.0 },
    { id: 'map_chain_05', activity_id: 'act_member_day', product_id: 'product_demo_16', sku_id: 'sku_demo_016', promo_price: 11.9 },
    { id: 'map_chain_06', activity_id: 'act_summer', product_id: 'product_demo_19', sku_id: 'sku_demo_019', promo_price: 32.9 },
  ]
  for (const row of maps) {
    await upsertRow(knex, 'marketing_activity_products', { ...row, tenant_id: TENANT_ID }, 'id')
  }
}

async function seedStatusLogs(knex) {
  const logs = [
    { log_id: 'pslog_chain_18', product_id: 'product_demo_18', from: 'draft', to: 'pending_review', remark: '提交上架审核' },
    { log_id: 'pslog_chain_27', product_id: 'product_demo_27', from: 'draft', to: 'pending_review', remark: '新品提交审核' },
    { log_id: 'pslog_chain_09', product_id: 'product_demo_09', from: 'pending_review', to: 'on_sale', remark: '审核通过并上架' },
    { log_id: 'pslog_chain_23', product_id: 'product_demo_23', from: 'on_sale', to: 'off_sale', remark: '渠道下架' },
  ]
  for (const row of logs) {
    await upsertRow(knex, 'product_status_logs', {
      log_id: row.log_id,
      tenant_id: TENANT_ID,
      product_id: row.product_id,
      from_status: row.from,
      to_status: row.to,
      operator_id: OPERATORS.admin,
      remark: row.remark,
      created_at: daysAgo(2, 14),
    }, 'log_id')
  }
}

exports.seed = async (knex) => {
  await seedProductsAndStock(knex)
  const customers = await seedCustomers(knex)
  const skuMap = await loadSkuMap(knex)
  await seedStoreOrders(knex, skuMap, customers)
  await seedApprovals(knex)
  await seedMarketing(knex)
  await seedStatusLogs(knex)
}
