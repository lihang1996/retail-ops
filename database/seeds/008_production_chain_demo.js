/**
 * 生产级演示数据：完整业务链路（商品→库存→订单→支付→锁库→分仓→拣货→出库→物流）。
 * 幂等：固定 ID + onConflict merge；重复执行会校正库存锁与订单关联。
 */
const TENANT_ID = 'tenant_demo_retail'
const STORE_TMALL = 'store_tmall'
const STORE_OFFLINE = 'store_offline'
const WH_MAIN = 'wh_main'
const WH_SOUTH = 'wh_south'

const OPERATORS = {
  admin: 'user_admin',
  ops: 'user_ops',
  warehouse: 'user_warehouse',
  finance: 'user_finance',
}

function daysAgo(days, hour = 10, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d
}

function todayAt(hour, minute = 0) {
  const d = new Date()
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

async function loadSkuMap(knex) {
  const rows = await knex('product_skus as sku')
    .leftJoin('products as p', 'sku.product_id', 'p.product_id')
    .where('sku.tenant_id', TENANT_ID)
    .select('sku.*', 'p.product_name')
  const byCode = new Map()
  rows.forEach((r) => byCode.set(r.sku_code, r))
  return byCode
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

async function ensureLocationStock(knex, { stockLocationId, locationId, skuId, qty }) {
  await upsertRow(knex, 'stock_locations', {
    stock_location_id: stockLocationId,
    tenant_id: TENANT_ID,
    location_id: locationId,
    sku_id: skuId,
    qty,
  }, ['tenant_id', 'location_id', 'sku_id'])
}

async function writeStockLog(knex, {
  logId, skuId, warehouseId, locationId, actionType, qtyChange, beforeQty, afterQty,
  refType, refId, operatorId, createdAt, remark,
}) {
  await upsertRow(knex, 'stock_logs', {
    log_id: logId,
    tenant_id: TENANT_ID,
    sku_id: skuId,
    warehouse_id: warehouseId,
    location_id: locationId || null,
    action_type: actionType,
    qty_change: qtyChange,
    before_qty: beforeQty,
    after_qty: afterQty,
    ref_type: refType || null,
    ref_id: refId || null,
    operator_id: operatorId || null,
    remark: remark || null,
    created_at: createdAt || knex.fn.now(),
  }, 'log_id')
}

async function applyActiveLock(knex, {
  lockId, skuId, warehouseId, qty, refId, itemId, operatorId,
}) {
  const stock = await knex('stocks')
    .where({ tenant_id: TENANT_ID, sku_id: skuId, warehouse_id: warehouseId })
    .first()
  if (!stock) return

  const existing = await knex('stock_locks').where({ lock_id: lockId }).first()
  if (existing?.status === 'active') {
    await knex('order_items').where({ item_id: itemId }).update({ lock_id: lockId })
    return
  }

  let available = stock.available_qty
  let locked = stock.locked_qty
  if (available < qty) {
    const gap = qty - available
    available += gap
    await knex('stocks').where({ stock_id: stock.stock_id }).update({
      total_qty: stock.total_qty + gap,
      available_qty: available,
    })
  }

  const before = available
  await knex('stocks').where({ stock_id: stock.stock_id }).update({
    available_qty: available - qty,
    locked_qty: locked + qty,
  })

  await upsertRow(knex, 'stock_locks', {
    lock_id: lockId,
    tenant_id: TENANT_ID,
    sku_id: skuId,
    warehouse_id: warehouseId,
    qty,
    ref_type: 'order',
    ref_id: refId,
    status: 'active',
  }, 'lock_id')

  await knex('order_items').where({ item_id: itemId }).update({ lock_id: lockId })

  await writeStockLog(knex, {
    logId: `slog_lock_${lockId}`,
    skuId,
    warehouseId,
    actionType: 'lock',
    qtyChange: -qty,
    beforeQty: before,
    afterQty: before - qty,
    refType: 'order',
    refId,
    operatorId,
  })
}

async function applyConsumedLockAndOutbound(knex, {
  lockId, skuId, warehouseId, qty, refId, shipmentId, itemId, operatorId, shippedAt,
}) {
  const existing = await knex('stock_locks').where({ lock_id: lockId }).first()
  if (existing?.status === 'consumed') {
    await knex('order_items').where({ item_id: itemId }).update({ lock_id: lockId })
    return
  }

  const stock = await knex('stocks')
    .where({ tenant_id: TENANT_ID, sku_id: skuId, warehouse_id: warehouseId })
    .first()
  if (!stock) return

  const beforeTotal = stock.total_qty
  await knex('stocks').where({ stock_id: stock.stock_id }).update({
    total_qty: stock.total_qty - qty,
    locked_qty: Math.max(0, stock.locked_qty - qty),
  })

  await upsertRow(knex, 'stock_locks', {
    lock_id: lockId,
    tenant_id: TENANT_ID,
    sku_id: skuId,
    warehouse_id: warehouseId,
    qty: 0,
    ref_type: 'order',
    ref_id: refId,
    status: 'consumed',
  }, 'lock_id')

  await knex('order_items').where({ item_id: itemId }).update({ lock_id: lockId })

  await writeStockLog(knex, {
    logId: `slog_out_${lockId}`,
    skuId,
    warehouseId,
    actionType: 'outbound',
    qtyChange: -qty,
    beforeQty: beforeTotal,
    afterQty: beforeTotal - qty,
    refType: 'shipment',
    refId: shipmentId,
    operatorId,
    createdAt: shippedAt,
  })
}

async function writeOrderStatusLog(knex, {
  logId, orderId, fromStatus, toStatus, remark, operatorId, createdAt,
}) {
  await upsertRow(knex, 'order_status_logs', {
    log_id: logId,
    tenant_id: TENANT_ID,
    order_id: orderId,
    from_status: fromStatus || null,
    to_status: toStatus,
    remark: remark || null,
    operator_id: operatorId || null,
    created_at: createdAt || knex.fn.now(),
  }, 'log_id')
}

async function createOrderBundle(knex, skuMap, bundle) {
  const {
    orderId,
    orderNo,
    storeId = STORE_TMALL,
    customerId,
    warehouseId = null,
    status,
    createdAt,
    items,
    payment = false,
    locks = false,
    consumedLocks = false,
    shipment = null,
    statusLogs = [],
  } = bundle

  const resolvedItems = items.map((line, idx) => {
    const sku = skuMap.get(line.skuCode)
    if (!sku) throw new Error(`SKU not found: ${line.skuCode}`)
    const qty = line.qty
    const unitPrice = line.unitPrice ?? parseFloat(sku.sale_price)
    const amount = money(qty * unitPrice)
    return {
      item_id: line.itemId || `item_${orderId}_${idx + 1}`,
      tenant_id: TENANT_ID,
      order_id: orderId,
      sku_id: sku.sku_id,
      sku_code: sku.sku_code,
      product_name: sku.product_name,
      qty,
      unit_price: unitPrice,
      amount,
      lock_id: null,
      created_at: createdAt,
      updated_at: createdAt,
    }
  })

  const totalAmount = money(resolvedItems.reduce((s, i) => s + parseFloat(i.amount), 0))

  await upsertRow(knex, 'orders', {
    order_id: orderId,
    tenant_id: TENANT_ID,
    order_no: orderNo,
    store_id: storeId,
    customer_id: customerId,
    warehouse_id: warehouseId,
    status,
    total_amount: totalAmount,
    currency: 'CNY',
    created_at: createdAt,
    updated_at: createdAt,
  }, ['tenant_id', 'order_no'])

  for (const item of resolvedItems) {
    await upsertRow(knex, 'order_items', item, 'item_id')
  }

  for (const log of statusLogs) {
    await writeOrderStatusLog(knex, {
      logId: log.logId || `olog_${orderId}_${log.toStatus}`,
      orderId,
      fromStatus: log.from,
      toStatus: log.to,
      remark: log.remark,
      operatorId: log.operator || OPERATORS.ops,
      createdAt: log.at || createdAt,
    })
  }

  if (payment) {
    await upsertRow(knex, 'payments', {
      payment_id: `pay_${orderId}`,
      tenant_id: TENANT_ID,
      order_id: orderId,
      amount: totalAmount,
      pay_method: 'online',
      status: 'success',
      paid_at: createdAt,
      created_at: createdAt,
      updated_at: createdAt,
    }, 'payment_id')
  }

  const wh = warehouseId || WH_MAIN
  if (locks || consumedLocks) {
    for (const item of resolvedItems) {
      const lockId = `lock_${item.item_id}`
      if (consumedLocks && shipment) {
        await applyConsumedLockAndOutbound(knex, {
          lockId,
          skuId: item.sku_id,
          warehouseId: wh,
          qty: item.qty,
          refId: orderId,
          shipmentId: shipment.shipmentId,
          itemId: item.item_id,
          operatorId: OPERATORS.warehouse,
          shippedAt: shipment.shippedAt || createdAt,
        })
      } else if (locks) {
        await applyActiveLock(knex, {
          lockId,
          skuId: item.sku_id,
          warehouseId: wh,
          qty: item.qty,
          refId: orderId,
          itemId: item.item_id,
          operatorId: OPERATORS.ops,
        })
      }
    }
  }

  if (shipment) {
    await upsertRow(knex, 'shipments', {
      shipment_id: shipment.shipmentId,
      tenant_id: TENANT_ID,
      order_id: orderId,
      warehouse_id: wh,
      shipment_no: shipment.shipmentNo,
      status: shipment.status,
      created_at: createdAt,
      updated_at: shipment.shippedAt || createdAt,
    }, 'shipment_id')

    for (const item of resolvedItems) {
      const sitemId = `sitem_${shipment.shipmentId}_${item.sku_id}`
      const picked = ['picking', 'picked', 'shipped'].includes(shipment.status)
      await upsertRow(knex, 'shipment_items', {
        item_id: sitemId,
        tenant_id: TENANT_ID,
        shipment_id: shipment.shipmentId,
        sku_id: item.sku_id,
        qty: item.qty,
        suggested_location_id: shipment.itemLocations?.[item.sku_code]
          || shipment.locationId
          || 'loc_a1_01',
        picked_location_id: picked
          ? (shipment.itemLocations?.[item.sku_code] || shipment.locationId || 'loc_a1_01')
          : null,
        created_at: createdAt,
        updated_at: createdAt,
      }, 'item_id')
    }

    if (['picking', 'picked', 'shipped'].includes(shipment.status)) {
      await upsertRow(knex, 'picking_tasks', {
        task_id: `pick_${shipment.shipmentId}`,
        tenant_id: TENANT_ID,
        shipment_id: shipment.shipmentId,
        status: shipment.status === 'shipped' ? 'done' : 'in_progress',
        picker_id: OPERATORS.warehouse,
        started_at: createdAt,
        finished_at: ['picked', 'shipped'].includes(shipment.status) ? (shipment.shippedAt || createdAt) : null,
        created_at: createdAt,
        updated_at: createdAt,
      }, 'task_id')
    }

    if (shipment.status === 'shipped') {
      await upsertRow(knex, 'logistics', {
        logistics_id: `logi_${shipment.shipmentId}`,
        tenant_id: TENANT_ID,
        shipment_id: shipment.shipmentId,
        carrier: shipment.carrier || '顺丰速运',
        tracking_no: shipment.trackingNo || `SF${Date.now().toString().slice(-10)}`,
        shipped_at: shipment.shippedAt || createdAt,
        created_at: createdAt,
        updated_at: createdAt,
      }, 'logistics_id')
    }
  }
}

async function seedSouthWarehouse(knex) {
  await upsertRow(knex, 'warehouse_zones', {
    zone_id: 'zone_south_a',
    tenant_id: TENANT_ID,
    warehouse_id: WH_SOUTH,
    zone_name: '华南 A 区',
    zone_code: 'SA',
    status: 'active',
  }, 'zone_id')

  await upsertRow(knex, 'warehouse_shelves', {
    shelf_id: 'shelf_south_a1',
    tenant_id: TENANT_ID,
    warehouse_id: WH_SOUTH,
    zone_id: 'zone_south_a',
    shelf_name: 'SA-1货架',
    shelf_code: 'SA1',
    status: 'active',
  }, 'shelf_id')

  const southLocs = [
    { location_id: 'loc_south_01', location_code: 'SA1-01', pos_x: 0, pos_y: 0, pos_z: 0 },
    { location_id: 'loc_south_02', location_code: 'SA1-02', pos_x: 2, pos_y: 0, pos_z: 0 },
    { location_id: 'loc_south_03', location_code: 'SA1-03', pos_x: 4, pos_y: 0, pos_z: 0 },
    { location_id: 'loc_south_04', location_code: 'SA1-04', pos_x: 6, pos_y: 0, pos_z: 0 },
    { location_id: 'loc_south_05', location_code: 'SA1-05', pos_x: 8, pos_y: 0, pos_z: 0 },
    { location_id: 'loc_south_06', location_code: 'SA1-06', pos_x: 10, pos_y: 0, pos_z: 0 },
  ]
  for (const loc of southLocs) {
    await upsertRow(knex, 'warehouse_locations', {
      ...loc,
      tenant_id: TENANT_ID,
      warehouse_id: WH_SOUTH,
      zone_id: 'zone_south_a',
      shelf_id: 'shelf_south_a1',
      capacity: 120,
      status: 'active',
    }, 'location_id')
  }
}

async function seedCatalog(knex) {
  const categories = [
    { category_id: 'cat_appliance', category_name: '家电' },
    { category_id: 'cat_beauty', category_name: '美妆护肤' },
    { category_id: 'cat_baby', category_name: '母婴用品' },
    { category_id: 'cat_snack', category_name: '休闲零食' },
  ]
  for (const c of categories) {
    await upsertRow(knex, 'categories', { ...c, tenant_id: TENANT_ID, status: 'active' }, 'category_id')
  }

  await upsertRow(knex, 'brands', {
    brand_id: 'brand_premium',
    tenant_id: TENANT_ID,
    brand_name: '臻选系列',
    status: 'active',
  }, 'brand_id')

  const products = [
    { product_id: 'product_prod_09', product_name: '有机燕麦片 1kg', category_id: 'cat_food', brand_id: 'brand_house', status: 'on_sale' },
    { product_id: 'product_prod_10', product_name: '冷萃咖啡液 8杯装', category_id: 'cat_drink', brand_id: 'brand_premium', status: 'on_sale' },
    { product_id: 'product_prod_11', product_name: '抗菌洗手液 500ml', category_id: 'cat_daily', brand_id: 'brand_demo', status: 'on_sale' },
    { product_id: 'product_prod_12', product_name: '便携榨汁机', category_id: 'cat_appliance', brand_id: 'brand_premium', status: 'on_sale' },
    { product_id: 'product_prod_13', product_name: '保湿面膜 5片', category_id: 'cat_beauty', brand_id: 'brand_demo', status: 'on_sale' },
    { product_id: 'product_prod_14', product_name: '婴儿湿巾 80抽', category_id: 'cat_baby', brand_id: 'brand_house', status: 'on_sale' },
    { product_id: 'product_prod_15', product_name: '海苔脆片 12包', category_id: 'cat_snack', brand_id: 'brand_demo', status: 'on_sale' },
    { product_id: 'product_prod_16', product_name: '无糖乌龙茶 500ml×6', category_id: 'cat_drink', brand_id: 'brand_house', status: 'on_sale' },
    { product_id: 'product_prod_17', product_name: '电动牙刷 Pro', category_id: 'cat_appliance', brand_id: 'brand_premium', status: 'pending_review' },
    { product_id: 'product_prod_18', product_name: '防晒霜 SPF50', category_id: 'cat_beauty', brand_id: 'brand_premium', status: 'draft' },
    { product_id: 'product_prod_19', product_name: '婴儿奶粉 1段 800g', category_id: 'cat_baby', brand_id: 'brand_premium', status: 'on_sale' },
    { product_id: 'product_prod_20', product_name: '混合坚果 750g', category_id: 'cat_snack', brand_id: 'brand_house', status: 'off_sale' },
    { product_id: 'product_prod_21', product_name: '厨房纸巾 8卷', category_id: 'cat_daily', brand_id: 'brand_demo', status: 'on_sale' },
    { product_id: 'product_prod_22', product_name: '气泡水 混合口味 24罐', category_id: 'cat_drink', brand_id: 'brand_demo', status: 'on_sale' },
    { product_id: 'product_prod_23', product_name: '智能体重秤', category_id: 'cat_appliance', brand_id: 'brand_demo', status: 'on_sale' },
    { product_id: 'product_prod_24', product_name: '氨基酸洁面 120ml', category_id: 'cat_beauty', brand_id: 'brand_house', status: 'on_sale' },
  ]

  for (const p of products) {
    await upsertRow(knex, 'products', {
      ...p,
      tenant_id: TENANT_ID,
      review_status: p.status === 'pending_review' ? 'pending' : 'none',
      main_image: 'https://via.placeholder.com/200',
      description: `${p.product_name} — 生产级演示商品`,
      created_by: OPERATORS.admin,
      updated_by: OPERATORS.ops,
    }, 'product_id')
  }

  const skus = [
    { sku_id: 'sku_prod_09', product_id: 'product_prod_09', sku_code: 'SKU-FOOD-009', sale_price: 32.8, main: 280, south: 90, warning: 40 },
    { sku_id: 'sku_prod_10', product_id: 'product_prod_10', sku_code: 'SKU-DRINK-010', sale_price: 49.9, main: 160, south: 55, warning: 30 },
    { sku_id: 'sku_prod_11', product_id: 'product_prod_11', sku_code: 'SKU-DAILY-011', sale_price: 15.9, main: 420, south: 130, warning: 50 },
    { sku_id: 'sku_prod_12', product_id: 'product_prod_12', sku_code: 'SKU-APPL-012', sale_price: 199.0, main: 85, south: 25, warning: 15 },
    { sku_id: 'sku_prod_13', product_id: 'product_prod_13', sku_code: 'SKU-BEAU-013', sale_price: 68.0, main: 210, south: 70, warning: 35 },
    { sku_id: 'sku_prod_14', product_id: 'product_prod_14', sku_code: 'SKU-BABY-014', sale_price: 22.5, main: 350, south: 110, warning: 45 },
    { sku_id: 'sku_prod_15', product_id: 'product_prod_15', sku_code: 'SKU-SNCK-015', sale_price: 26.6, main: 12, south: 8, warning: 20 },
    { sku_id: 'sku_prod_16', product_id: 'product_prod_16', sku_code: 'SKU-DRINK-016', sale_price: 36.0, main: 190, south: 65, warning: 40 },
    { sku_id: 'sku_prod_17', product_id: 'product_prod_17', sku_code: 'SKU-APPL-017', sale_price: 329.0, main: 40, south: 12, warning: 10 },
    { sku_id: 'sku_prod_18', product_id: 'product_prod_18', sku_code: 'SKU-BEAU-018', sale_price: 89.0, main: 0, south: 0, warning: 15 },
    { sku_id: 'sku_prod_19', product_id: 'product_prod_19', sku_code: 'SKU-BABY-019', sale_price: 268.0, main: 95, south: 30, warning: 20 },
    { sku_id: 'sku_prod_20', product_id: 'product_prod_20', sku_code: 'SKU-SNCK-020', sale_price: 55.0, main: 60, south: 20, warning: 25 },
    { sku_id: 'sku_prod_21', product_id: 'product_prod_21', sku_code: 'SKU-DAILY-021', sale_price: 28.8, main: 6, south: 4, warning: 15 },
    { sku_id: 'sku_prod_22', product_id: 'product_prod_22', sku_code: 'SKU-DRINK-022', sale_price: 79.0, main: 140, south: 48, warning: 30 },
    { sku_id: 'sku_prod_23', product_id: 'product_prod_23', sku_code: 'SKU-APPL-023', sale_price: 129.0, main: 75, south: 22, warning: 18 },
    { sku_id: 'sku_prod_24', product_id: 'product_prod_24', sku_code: 'SKU-BEAU-024', sale_price: 59.0, main: 3, south: 2, warning: 12 },
  ]

  for (const sku of skus) {
    await upsertRow(knex, 'product_skus', {
      sku_id: sku.sku_id,
      tenant_id: TENANT_ID,
      product_id: sku.product_id,
      sku_code: sku.sku_code,
      sale_price: sku.sale_price,
      cost_price: money(sku.sale_price * 0.38),
      status: 'active',
    }, 'sku_id')

    await ensureStock(knex, {
      stockId: `stock_${sku.sku_id}_${WH_MAIN}`,
      skuId: sku.sku_id,
      warehouseId: WH_MAIN,
      total: sku.main,
      warning: sku.warning,
    })
    await ensureStock(knex, {
      stockId: `stock_${sku.sku_id}_${WH_SOUTH}`,
      skuId: sku.sku_id,
      warehouseId: WH_SOUTH,
      total: sku.south,
      warning: sku.warning,
    })
  }
}

async function seedCustomers(knex) {
  const cities = ['上海', '北京', '广州', '深圳', '杭州', '成都', '武汉', '南京', '苏州', '西安']
  const names = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨磊', '赵敏', '黄涛', '周婷', '吴强',
    '徐丽', '孙浩', '马超', '朱琳', '胡军', '郭倩', '何鹏', '高洁', '林峰', '罗雪',
    '梁晨', '宋佳', '唐宇', '韩雪', '冯刚', '董梅', '程亮', '曹颖', '袁波', '邓华',
    '许婷', '傅杰', '沈璐', '曾伟', '彭敏', '吕强', '苏芳', '卢洋', '蒋静', '蔡磊',
    '贾丽', '丁浩', '魏娜', '薛军', '叶婷', '阎强', '余雪', '潘磊', '杜芳', '戴洋']

  for (let i = 0; i < names.length; i += 1) {
    const id = `cust_prod_${String(i + 1).padStart(2, '0')}`
    const city = cities[i % cities.length]
    await upsertRow(knex, 'customers', {
      customer_id: id,
      tenant_id: TENANT_ID,
      customer_name: names[i],
      phone: `139${String(10000000 + i * 137).slice(0, 8)}`,
      address: `${city}市${['浦东', '朝阳', '天河', '南山', '余杭'][i % 5]}区演示大道 ${100 + i} 号`,
    }, 'customer_id')
  }
}

async function fixLegacyOrders(knex, skuMap) {
  const legacyItems = await knex('order_items as oi')
    .join('product_skus as sku', 'oi.sku_id', 'sku.sku_id')
    .leftJoin('products as p', 'sku.product_id', 'p.product_id')
    .where('oi.tenant_id', TENANT_ID)
    .whereNull('oi.lock_id')
    .select('oi.*', 'p.product_name')

  for (const item of legacyItems) {
    if (item.product_name && item.product_name !== item.sku_id) {
      await knex('order_items').where({ item_id: item.item_id }).update({ product_name: item.product_name })
    }
  }

  const legacyOrders = await knex('orders')
    .where({ tenant_id: TENANT_ID })
    .whereIn('order_id', [
      'order_demo_paid_01', 'order_demo_paid_02',
      'order_demo_alloc_01', 'order_demo_alloc_02',
      'order_demo_ship_01', 'order_demo_ship_02', 'order_demo_ship_03',
      'order_demo_done_01', 'order_demo_done_02',
    ])

  for (const order of legacyOrders) {
    const items = await knex('order_items').where({ order_id: order.order_id })
    const wh = order.warehouse_id || WH_MAIN
    const needsLock = ['paid', 'allocated', 'shipped'].includes(order.status)
    const isShipped = order.status === 'shipped'

    if (needsLock) {
      for (const item of items) {
        const lockId = `lock_${item.item_id}`
        if (isShipped) {
          const ship = await knex('shipments').where({ order_id: order.order_id }).first()
          if (ship) {
            await applyConsumedLockAndOutbound(knex, {
              lockId,
              skuId: item.sku_id,
              warehouseId: wh,
              qty: item.qty,
              refId: order.order_id,
              shipmentId: ship.shipment_id,
              itemId: item.item_id,
              operatorId: OPERATORS.warehouse,
            })
          }
        } else {
          await applyActiveLock(knex, {
            lockId,
            skuId: item.sku_id,
            warehouseId: wh,
            qty: item.qty,
            refId: order.order_id,
            itemId: item.item_id,
            operatorId: OPERATORS.ops,
          })
        }
      }
    }
  }
}

async function seedProductionOrders(knex, skuMap) {
  const customers = Array.from({ length: 50 }, (_, i) => `cust_prod_${String(i + 1).padStart(2, '0')}`)

  const scenarios = []

  // 近 7 天已发货订单（驱动 GMV 趋势）
  const shippedSkus = [
    'SKU-DEMO-001', 'SKU-DEMO-002', 'SKU-DEMO-003', 'SKU-FOOD-009', 'SKU-DRINK-010',
    'SKU-DAILY-011', 'SKU-BEAU-013', 'SKU-BABY-014', 'SKU-DRINK-016', 'SKU-DAILY-021',
  ]
  for (let d = 6; d >= 0; d -= 1) {
    for (let i = 0; i < 4; i += 1) {
      const idx = (6 - d) * 4 + i
      const skuCode = shippedSkus[idx % shippedSkus.length]
      const qty = 1 + (idx % 4)
      const created = daysAgo(d, 9 + i, 15 * i)
      const shipped = daysAgo(d, 14 + i, 20)
      scenarios.push({
        orderId: `order_hist_${String(idx + 1).padStart(3, '0')}`,
        orderNo: `ORD-HIST-2024${String(700 + idx)}`,
        storeId: idx % 3 === 0 ? STORE_OFFLINE : STORE_TMALL,
        customerId: customers[idx % customers.length],
        warehouseId: idx % 5 === 0 ? WH_SOUTH : WH_MAIN,
        status: 'shipped',
        createdAt: created,
        items: [{ skuCode, qty }],
        payment: true,
        consumedLocks: true,
        shipment: {
          shipmentId: `ship_hist_${String(idx + 1).padStart(3, '0')}`,
          shipmentNo: `SHP-HIST-${700 + idx}`,
          status: 'shipped',
          locationId: idx % 5 === 0 ? 'loc_south_01' : 'loc_a1_01',
          carrier: idx % 2 === 0 ? '顺丰速运' : '中通快递',
          trackingNo: `SF2024${String(100000 + idx)}`,
          shippedAt: shipped,
        },
        statusLogs: [
          { from: null, to: 'pending_payment', remark: '订单创建', at: created },
          { from: 'pending_payment', to: 'paid', remark: '支付确认成功', at: daysAgo(d, 10 + i) },
          { from: 'paid', to: 'allocated', remark: '自动分仓', at: daysAgo(d, 11 + i) },
          { from: 'allocated', to: 'shipped', remark: '已出库发货', at: shipped },
        ],
      })
    }
  }

  // 待支付
  const pendingSkus = ['SKU-DEMO-007', 'SKU-SNCK-015', 'SKU-BEAU-024', 'SKU-APPL-012', 'SKU-DRINK-022']
  pendingSkus.forEach((skuCode, i) => {
    scenarios.push({
      orderId: `order_pp_${String(i + 1).padStart(2, '0')}`,
      orderNo: `ORD-PP-2024${String(100 + i)}`,
      customerId: customers[10 + i],
      status: 'pending_payment',
      createdAt: daysAgo(0, 8 + i),
      items: [{ skuCode, qty: 1 + (i % 3) }],
      statusLogs: [{ from: null, to: 'pending_payment', remark: '待客户支付' }],
    })
  })

  // 已支付待分仓
  ;[
    { sku: 'SKU-FOOD-009', qty: 2 },
    { sku: 'SKU-DRINK-016', qty: 1 },
    { sku: 'SKU-BABY-019', qty: 1 },
    { sku: 'SKU-APPL-023', qty: 1 },
    { sku: 'SKU-DEMO-006', qty: 2 },
    { sku: 'SKU-DAILY-011', qty: 3 },
  ].forEach((line, i) => {
    scenarios.push({
      orderId: `order_paid_${String(i + 1).padStart(2, '0')}`,
      orderNo: `ORD-PAID-2024${String(200 + i)}`,
      customerId: customers[20 + i],
      status: 'paid',
      warehouseId: WH_MAIN,
      createdAt: daysAgo(1, 11 + i),
      items: [{ skuCode: line.sku, qty: line.qty }],
      payment: true,
      locks: true,
      statusLogs: [
        { from: null, to: 'pending_payment', at: daysAgo(1, 10 + i) },
        { from: 'pending_payment', to: 'paid', remark: '支付成功，库存已锁定', at: daysAgo(1, 11 + i) },
      ],
    })
  })

  // 已分仓待生成发货单
  ;[
    { sku: 'SKU-BEAU-013', qty: 2, wh: WH_MAIN },
    { sku: 'SKU-SNCK-015', qty: 3, wh: WH_MAIN },
    { sku: 'SKU-DRINK-010', qty: 1, wh: WH_SOUTH },
    { sku: 'SKU-DEMO-004', qty: 2, wh: WH_MAIN },
    { sku: 'SKU-APPL-012', qty: 1, wh: WH_SOUTH },
  ].forEach((line, i) => {
    scenarios.push({
      orderId: `order_alloc_${String(i + 1).padStart(2, '0')}`,
      orderNo: `ORD-ALLOC-2024${String(300 + i)}`,
      customerId: customers[30 + i],
      status: 'allocated',
      warehouseId: line.wh,
      createdAt: daysAgo(0, 9 + i),
      items: [{ skuCode: line.sku, qty: line.qty }],
      payment: true,
      locks: true,
      statusLogs: [
        { from: null, to: 'pending_payment', at: daysAgo(0, 8 + i) },
        { from: 'pending_payment', to: 'paid', at: daysAgo(0, 9 + i) },
        { from: 'paid', to: 'allocated', remark: `分仓至${line.wh === WH_SOUTH ? '华南备仓' : '华东主仓'}`, at: daysAgo(0, 10 + i) },
      ],
    })
  })

  // 履约各阶段发货单
  const fulfillmentStages = [
    { key: 'await_pick', status: 'created', count: 6 },
    { key: 'picking', status: 'picking', count: 5 },
    { key: 'await_outbound', status: 'picked', count: 5 },
  ]
  const fulfillSkus = ['SKU-DEMO-001', 'SKU-DEMO-002', 'SKU-FOOD-009', 'SKU-DAILY-011', 'SKU-BABY-014', 'SKU-DRINK-022']

  let fulfillIdx = 0
  for (const stage of fulfillmentStages) {
    for (let i = 0; i < stage.count; i += 1) {
      const skuCode = fulfillSkus[fulfillIdx % fulfillSkus.length]
      fulfillIdx += 1
      const orderId = `order_ful_${stage.key}_${String(i + 1).padStart(2, '0')}`
      scenarios.push({
        orderId,
        orderNo: `ORD-FUL-${stage.key.toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
        customerId: customers[40 + (fulfillIdx % 10)],
        status: 'allocated',
        warehouseId: fulfillIdx % 4 === 0 ? WH_SOUTH : WH_MAIN,
        createdAt: daysAgo(0, 7 + i),
        items: [{ skuCode, qty: 1 + (i % 2) }],
        payment: true,
        locks: true,
        shipment: {
          shipmentId: `ship_ful_${stage.key}_${String(i + 1).padStart(2, '0')}`,
          shipmentNo: `SHP-FUL-${stage.key.toUpperCase()}-${i + 1}`,
          status: stage.status,
          locationId: fulfillIdx % 4 === 0 ? 'loc_south_02' : 'loc_a1_02',
        },
        statusLogs: [
          { from: null, to: 'pending_payment', at: daysAgo(0, 6 + i) },
          { from: 'pending_payment', to: 'paid', at: daysAgo(0, 7 + i) },
          { from: 'paid', to: 'allocated', at: daysAgo(0, 8 + i) },
        ],
      })
    }
  }

  // 多 SKU 组合订单
  scenarios.push({
    orderId: 'order_multi_001',
    orderNo: 'ORD-MULTI-001',
    customerId: customers[0],
    status: 'allocated',
    warehouseId: WH_MAIN,
    createdAt: daysAgo(0, 12),
    items: [
      { skuCode: 'SKU-DEMO-001', qty: 2 },
      { skuCode: 'SKU-FOOD-009', qty: 1 },
      { skuCode: 'SKU-DAILY-011', qty: 2 },
    ],
    payment: true,
    locks: true,
    shipment: {
      shipmentId: 'ship_multi_001',
      shipmentNo: 'SHP-MULTI-001',
      status: 'picking',
      itemLocations: {
        'SKU-DEMO-001': 'loc_a1_01',
        'SKU-FOOD-009': 'loc_grid_5',
        'SKU-DAILY-011': 'loc_a1_03',
      },
    },
    statusLogs: [
      { from: null, to: 'pending_payment' },
      { from: 'pending_payment', to: 'paid' },
      { from: 'paid', to: 'allocated', remark: '组合订单分仓' },
    ],
  })

  scenarios.push({
    orderId: 'order_multi_002',
    orderNo: 'ORD-MULTI-002',
    storeId: STORE_OFFLINE,
    customerId: customers[5],
    status: 'shipped',
    warehouseId: WH_MAIN,
    createdAt: daysAgo(2, 10),
    items: [
      { skuCode: 'SKU-BEAU-013', qty: 1 },
      { skuCode: 'SKU-BEAU-024', qty: 2 },
    ],
    payment: true,
    consumedLocks: true,
    shipment: {
      shipmentId: 'ship_multi_002',
      shipmentNo: 'SHP-MULTI-002',
      status: 'shipped',
      locationId: 'loc_a1_03',
      shippedAt: daysAgo(2, 16),
    },
    statusLogs: [
      { from: null, to: 'pending_payment', at: daysAgo(2, 10) },
      { from: 'pending_payment', to: 'paid', at: daysAgo(2, 11) },
      { from: 'paid', to: 'allocated', at: daysAgo(2, 12) },
      { from: 'allocated', to: 'shipped', at: daysAgo(2, 16) },
    ],
  })

  // 已取消
  scenarios.push({
    orderId: 'order_cancel_001',
    orderNo: 'ORD-CANCEL-001',
    customerId: customers[8],
    status: 'cancelled',
    createdAt: daysAgo(1, 15),
    items: [{ skuCode: 'SKU-APPL-017', qty: 1 }],
    statusLogs: [
      { from: null, to: 'pending_payment' },
      { from: 'pending_payment', to: 'cancelled', remark: '客户超时未支付' },
    ],
  })

  for (const scenario of scenarios) {
    await createOrderBundle(knex, skuMap, scenario)
  }
}

async function seedApprovalsAndMarketing(knex) {
  await upsertRow(knex, 'approvals', {
    approval_id: 'appr_prod_06',
    tenant_id: TENANT_ID,
    ref_type: 'product_on_sale',
    ref_id: 'product_demo_06',
    title: '曲奇礼盒上架审批',
    status: 'pending',
    applicant_id: OPERATORS.ops,
    created_at: daysAgo(1, 14),
    updated_at: daysAgo(1, 14),
  }, 'approval_id')

  await upsertRow(knex, 'approval_nodes', {
    node_id: 'anode_prod_06_1',
    approval_id: 'appr_prod_06',
    node_order: 1,
    approver_role_id: 'role_admin',
    status: 'pending',
    created_at: daysAgo(1, 14),
    updated_at: daysAgo(1, 14),
  }, 'node_id')

  await upsertRow(knex, 'approvals', {
    approval_id: 'appr_prod_17',
    tenant_id: TENANT_ID,
    ref_type: 'product_on_sale',
    ref_id: 'product_prod_17',
    title: '电动牙刷 Pro 上架审批',
    status: 'pending',
    applicant_id: OPERATORS.ops,
    created_at: daysAgo(0, 9),
    updated_at: daysAgo(0, 9),
  }, 'approval_id')

  await upsertRow(knex, 'approval_nodes', {
    node_id: 'anode_prod_17_1',
    approval_id: 'appr_prod_17',
    node_order: 1,
    approver_role_id: 'role_admin',
    status: 'pending',
    created_at: daysAgo(0, 9),
    updated_at: daysAgo(0, 9),
  }, 'node_id')

  await upsertRow(knex, 'approvals', {
    approval_id: 'appr_prod_09_done',
    tenant_id: TENANT_ID,
    ref_type: 'product_on_sale',
    ref_id: 'product_prod_09',
    title: '有机燕麦片上架审批',
    status: 'approved',
    applicant_id: OPERATORS.ops,
    created_at: daysAgo(5, 10),
    updated_at: daysAgo(5, 15),
  }, 'approval_id')

  await upsertRow(knex, 'approval_nodes', {
    node_id: 'anode_prod_09_1',
    approval_id: 'appr_prod_09_done',
    node_order: 1,
    approver_role_id: 'role_admin',
    status: 'approved',
    acted_by: OPERATORS.admin,
    acted_at: daysAgo(5, 15),
    created_at: daysAgo(5, 10),
    updated_at: daysAgo(5, 15),
  }, 'node_id')

  await upsertRow(knex, 'marketing_activities', {
    activity_id: 'act_1111',
    tenant_id: TENANT_ID,
    activity_name: '双十一大促',
    activity_type: 'promotion',
    status: 'active',
    start_at: daysAgo(3, 0),
    end_at: daysAgo(-7, 23),
  }, 'activity_id')

  await upsertRow(knex, 'marketing_activities', {
    activity_id: 'act_member_day',
    tenant_id: TENANT_ID,
    activity_name: '会员日专享',
    activity_type: 'member',
    status: 'active',
    start_at: daysAgo(0, 0),
    end_at: daysAgo(-14, 23),
  }, 'activity_id')

  const mapProducts = [
    { id: 'map_act_1111_01', activity_id: 'act_1111', product_id: 'product_prod_09', sku_id: 'sku_prod_09', promo_price: 27.9 },
    { id: 'map_act_1111_02', activity_id: 'act_1111', product_id: 'product_prod_13', sku_id: 'sku_prod_13', promo_price: 49.9 },
    { id: 'map_act_1111_03', activity_id: 'act_1111', product_id: 'product_prod_16', sku_id: 'sku_prod_16', promo_price: 29.9 },
    { id: 'map_act_member_01', activity_id: 'act_member_day', product_id: 'product_prod_11', sku_id: 'sku_prod_11', promo_price: 12.9 },
    { id: 'map_act_member_02', activity_id: 'act_member_day', product_id: 'product_prod_14', sku_id: 'sku_prod_14', promo_price: 18.8 },
  ]
  for (const row of mapProducts) {
    await upsertRow(knex, 'marketing_activity_products', { ...row, tenant_id: TENANT_ID }, 'id')
  }
}

async function seedImportBatch(knex) {
  await upsertRow(knex, 'order_import_batches', {
    batch_id: 'ibatch_prod_001',
    tenant_id: TENANT_ID,
    file_name: 'orders_202406_batch.xlsx',
    total_rows: 25,
    success_rows: 22,
    fail_rows: 3,
    status: 'done',
    created_by: OPERATORS.ops,
    created_at: daysAgo(2, 9),
  }, 'batch_id')

  const errors = [
    { error_id: 'ierr_prod_01', row_no: 8, reason: 'SKU 不存在: SKU-UNKNOWN-999' },
    { error_id: 'ierr_prod_02', row_no: 15, reason: '店铺不存在: 京东旗舰店' },
    { error_id: 'ierr_prod_03', row_no: 21, reason: '数量必须大于 0' },
  ]
  for (const err of errors) {
    await upsertRow(knex, 'order_import_errors', {
      ...err,
      batch_id: 'ibatch_prod_001',
      raw_data: JSON.stringify({ row: err.row_no }),
      created_at: daysAgo(2, 9),
    }, 'error_id')
  }
}

async function seedAuditLogs(knex) {
  const AUDIT_DETAIL_PRESETS = {
    audit_prod_01: { total: 18, success: 16, summary: '批量导入近 7 日演示订单' },
    audit_prod_02: { warehouseId: 'wh_main', summary: '单笔订单完成支付确认' },
    audit_prod_03: { warehouseId: 'wh_main', summary: '分配至华东主仓待发货' },
    audit_prod_04: { shipmentNo: 'SHP-20260623-001', orderId: 'order_alloc_01' },
    audit_prod_05: { orderId: 'order_ful_picking_01', summary: '拣货中，待复核出库' },
    audit_prod_07: { warehouseId: 'wh_main', locationId: 'loc_a1_02', qty: 120, summary: '采购入库至 A 区库位' },
    audit_prod_08: { warehouseId: 'wh_main', qty: 36, summary: '履约出库扣减可用库存' },
    audit_prod_09: { summary: '新品提交上架前审核' },
    audit_prod_10: { refType: 'product', refId: 'product_prod_17', summary: '关联商品上架审批流' },
    audit_prod_11: { warehouseId: 'wh_main', summary: '多仓订单完成支付' },
    audit_prod_12: { orderId: 'order_multi_001', summary: '多品项拣货完成，待打包' },
  }

  const logs = [
    { audit_id: 'audit_prod_01', action_code: 'order:import', object_type: 'import_batch', object_id: 'ibatch_prod_001', operator_id: OPERATORS.ops, at: daysAgo(2, 9) },
    { audit_id: 'audit_prod_02', action_code: 'order:pay', object_type: 'order', object_id: 'order_paid_01', operator_id: OPERATORS.ops, at: daysAgo(1, 11) },
    { audit_id: 'audit_prod_03', action_code: 'order:allocate', object_type: 'order', object_id: 'order_alloc_01', operator_id: OPERATORS.ops, at: daysAgo(0, 10) },
    { audit_id: 'audit_prod_04', action_code: 'shipment:create', object_type: 'shipment', object_id: 'ship_ful_await_pick_01', operator_id: OPERATORS.warehouse, at: daysAgo(0, 8) },
    { audit_id: 'audit_prod_05', action_code: 'shipment:pick', object_type: 'shipment', object_id: 'ship_ful_picking_01', operator_id: OPERATORS.warehouse, at: daysAgo(0, 9) },
    { audit_id: 'audit_prod_06', action_code: 'shipment:ship', object_type: 'shipment', object_id: 'ship_hist_001', operator_id: OPERATORS.warehouse, at: daysAgo(6, 14) },
    { audit_id: 'audit_prod_07', action_code: 'stock:inbound', object_type: 'stock', object_id: 'sku_prod_11', operator_id: OPERATORS.warehouse, at: todayAt(8, 30) },
    { audit_id: 'audit_prod_08', action_code: 'stock:outbound', object_type: 'stock', object_id: 'sku_demo_01', operator_id: OPERATORS.warehouse, at: todayAt(10, 15) },
    { audit_id: 'audit_prod_09', action_code: 'product:submit_review', object_type: 'product', object_id: 'product_prod_17', operator_id: OPERATORS.ops, at: daysAgo(0, 9) },
    { audit_id: 'audit_prod_10', action_code: 'approval:submit', object_type: 'approval', object_id: 'appr_prod_17', operator_id: OPERATORS.ops, at: daysAgo(0, 9) },
    { audit_id: 'audit_prod_11', action_code: 'order:pay', object_type: 'order', object_id: 'order_multi_001', operator_id: OPERATORS.ops, at: daysAgo(0, 7) },
    { audit_id: 'audit_prod_12', action_code: 'shipment:pick', object_type: 'shipment', object_id: 'ship_multi_001', operator_id: OPERATORS.warehouse, at: daysAgo(0, 12) },
  ]

  for (const log of logs) {
    const detail = AUDIT_DETAIL_PRESETS[log.audit_id] || { source: 'production_chain_seed' }
    await upsertRow(knex, 'audit_logs', {
      audit_id: log.audit_id,
      tenant_id: TENANT_ID,
      operator_id: log.operator_id,
      action_code: log.action_code,
      object_type: log.object_type,
      object_id: log.object_id,
      request_id: `req_${log.audit_id}`,
      ip: '127.0.0.1',
      detail_json: JSON.stringify(detail),
      created_at: log.at,
    }, 'audit_id')
  }
}

async function seedTodayStockActivity(knex, skuMap) {
  const inboundLines = [
    { skuCode: 'SKU-DAILY-011', qty: 120, locationId: 'loc_a1_02' },
    { skuCode: 'SKU-FOOD-009', qty: 80, locationId: 'loc_a1_01' },
    { skuCode: 'SKU-BABY-014', qty: 60, locationId: 'loc_south_01' },
  ]

  for (const [i, line] of inboundLines.entries()) {
    const logId = `slog_today_in_${i}`
    const exists = await knex('stock_logs').where({ log_id: logId }).first()
    if (exists) continue

    const sku = skuMap.get(line.skuCode)
    if (!sku) continue
    const wh = line.locationId.startsWith('loc_south') ? WH_SOUTH : WH_MAIN
    const stock = await knex('stocks')
      .where({ tenant_id: TENANT_ID, sku_id: sku.sku_id, warehouse_id: wh })
      .first()
    if (!stock) continue

    const before = stock.available_qty
    await knex('stocks').where({ stock_id: stock.stock_id }).update({
      total_qty: stock.total_qty + line.qty,
      available_qty: stock.available_qty + line.qty,
    })

    await ensureLocationStock(knex, {
      stockLocationId: `sloc_today_in_${i}`,
      locationId: line.locationId,
      skuId: sku.sku_id,
      qty: line.qty,
    })

    await writeStockLog(knex, {
      logId,
      skuId: sku.sku_id,
      warehouseId: wh,
      locationId: line.locationId,
      actionType: 'inbound',
      qtyChange: line.qty,
      beforeQty: before,
      afterQty: before + line.qty,
      operatorId: OPERATORS.warehouse,
      createdAt: todayAt(8, 30 + i * 10),
      remark: '采购入库',
    })
  }

  const outLogId = 'slog_today_out_01'
  const outExists = await knex('stock_logs').where({ log_id: outLogId }).first()
  if (!outExists) {
  const outboundLine = { skuCode: 'SKU-DEMO-001', qty: 10, warehouseId: WH_MAIN }
  const outSku = skuMap.get(outboundLine.skuCode)
  if (outSku) {
    const stock = await knex('stocks')
      .where({ tenant_id: TENANT_ID, sku_id: outSku.sku_id, warehouse_id: outboundLine.warehouseId })
      .first()
    if (stock && stock.available_qty >= outboundLine.qty) {
      const before = stock.total_qty
      await knex('stocks').where({ stock_id: stock.stock_id }).update({
        total_qty: stock.total_qty - outboundLine.qty,
        available_qty: stock.available_qty - outboundLine.qty,
      })
      await writeStockLog(knex, {
        logId: outLogId,
        skuId: outSku.sku_id,
        warehouseId: WH_MAIN,
        actionType: 'outbound',
        qtyChange: -outboundLine.qty,
        beforeQty: before,
        afterQty: before - outboundLine.qty,
        refType: 'adjustment',
        refId: 'adj_today_01',
        operatorId: OPERATORS.warehouse,
        createdAt: todayAt(10, 15),
        remark: '残次品报废出库',
      })
    }
  }
  }
}

async function seedProductStatusLogs(knex) {
  const logs = [
    { log_id: 'pslog_09', product_id: 'product_prod_09', from: 'draft', to: 'pending_review', remark: '提交审核' },
    { log_id: 'pslog_09b', product_id: 'product_prod_09', from: 'pending_review', to: 'on_sale', remark: '审批通过上架' },
    { log_id: 'pslog_20', product_id: 'product_prod_20', from: 'on_sale', to: 'off_sale', remark: '季节性下架' },
  ]
  for (const log of logs) {
    await upsertRow(knex, 'product_status_logs', {
      log_id: log.log_id,
      tenant_id: TENANT_ID,
      product_id: log.product_id,
      from_status: log.from,
      to_status: log.to,
      operator_id: OPERATORS.ops,
      remark: log.remark,
      created_at: daysAgo(3, 11),
    }, 'log_id')
  }
}

async function distributeStockLocations(knex, skuMap) {
  const mainDist = [
    { skuCode: 'SKU-DEMO-001', loc: 'loc_a1_01', qty: 300 },
    { skuCode: 'SKU-DEMO-001', loc: 'loc_a1_02', qty: 200 },
    { skuCode: 'SKU-DEMO-002', loc: 'loc_a1_02', qty: 200 },
    { skuCode: 'SKU-DEMO-002', loc: 'loc_grid_4', qty: 120 },
    { skuCode: 'SKU-FOOD-009', loc: 'loc_a1_01', qty: 150 },
    { skuCode: 'SKU-FOOD-009', loc: 'loc_grid_5', qty: 130 },
    { skuCode: 'SKU-DAILY-011', loc: 'loc_a1_03', qty: 250 },
    { skuCode: 'SKU-DAILY-011', loc: 'loc_grid_6', qty: 170 },
    { skuCode: 'SKU-BEAU-013', loc: 'loc_grid_7', qty: 120 },
    { skuCode: 'SKU-BEAU-013', loc: 'loc_grid_8', qty: 90 },
    { skuCode: 'SKU-BABY-014', loc: 'loc_grid_9', qty: 200 },
    { skuCode: 'SKU-BABY-014', loc: 'loc_grid_10', qty: 150 },
    { skuCode: 'SKU-DEMO-002', loc: 'loc_grid_11', qty: 12 },
    { skuCode: 'SKU-DAILY-011', loc: 'loc_grid_12', qty: 92 },
  ]
  const southDist = [
    { skuCode: 'SKU-DRINK-010', loc: 'loc_south_01', qty: 55 },
    { skuCode: 'SKU-DRINK-016', loc: 'loc_south_02', qty: 65 },
    { skuCode: 'SKU-APPL-012', loc: 'loc_south_03', qty: 25 },
    { skuCode: 'SKU-BABY-019', loc: 'loc_south_04', qty: 30 },
  ]

  let idx = 0
  for (const row of [...mainDist, ...southDist]) {
    const sku = skuMap.get(row.skuCode)
    if (!sku) continue
    idx += 1
    await ensureLocationStock(knex, {
      stockLocationId: `sloc_dist_${idx}`,
      locationId: row.loc,
      skuId: sku.sku_id,
      qty: row.qty,
    })
  }
}

exports.seed = async (knex) => {
  await seedSouthWarehouse(knex)
  await seedCatalog(knex)
  await seedCustomers(knex)

  const skuMap = await loadSkuMap(knex)
  await distributeStockLocations(knex, skuMap)

  await fixLegacyOrders(knex, skuMap)
  await seedProductionOrders(knex, skuMap)

  await seedApprovalsAndMarketing(knex)
  await seedImportBatch(knex)
  await seedAuditLogs(knex)
  await seedTodayStockActivity(knex, skuMap)
  await seedProductStatusLogs(knex)

  // 修正历史订单明细商品名
  await knex.raw(`
    UPDATE order_items oi
    JOIN product_skus sku ON oi.sku_id = sku.sku_id
    JOIN products p ON sku.product_id = p.product_id
    SET oi.product_name = p.product_name
    WHERE oi.tenant_id = ? AND (oi.product_name IS NULL OR oi.product_name = oi.sku_id OR oi.product_name LIKE 'product_%')
  `, [TENANT_ID])
}
