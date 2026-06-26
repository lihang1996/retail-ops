/**
 * 营销活动「即将结束」演示数据：为无结束时间的活动补全 end_at，并新增 2 天内 / 3 天内到期样例。
 */
const TENANT_ID = 'tenant_demo_retail'

function todayEnd() {
  const d = new Date()
  d.setHours(23, 59, 59, 0)
  return d
}

function daysFromNow(days, hour = 23, minute = 59) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d
}

function daysAgo(days, hour = 10, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d
}

async function upsertActivity(knex, row) {
  await knex('marketing_activities')
    .insert({ ...row, tenant_id: TENANT_ID })
    .onConflict('activity_id')
    .merge()
}

async function upsertMap(knex, row) {
  await knex('marketing_activity_products')
    .insert({ ...row, tenant_id: TENANT_ID })
    .onConflict('id')
    .merge()
}

exports.seed = async (knex) => {
  await upsertActivity(knex, {
    activity_id: 'act_summer',
    activity_name: '夏季促销',
    activity_type: 'promotion',
    status: 'active',
    start_at: daysAgo(0, 0),
    end_at: todayEnd(),
  })

  await upsertActivity(knex, {
    activity_id: 'act_autumn',
    activity_name: '秋季上新',
    activity_type: 'promotion',
    status: 'active',
    start_at: daysAgo(0, 0),
    end_at: todayEnd(),
  })

  await upsertActivity(knex, {
    activity_id: 'act_flash_2d',
    activity_name: '限时闪购',
    activity_type: 'discount',
    status: 'active',
    start_at: daysAgo(2, 0),
    end_at: daysFromNow(2),
  })

  await upsertActivity(knex, {
    activity_id: 'act_clearance_3d',
    activity_name: '季末清仓',
    activity_type: 'promotion',
    status: 'active',
    start_at: daysAgo(5, 0),
    end_at: daysFromNow(3),
  })

  await upsertMap(knex, {
    id: 'map_autumn_01',
    activity_id: 'act_autumn',
    product_id: 'product_demo_02',
    sku_id: 'sku_demo_02',
    promo_price: 7.5,
  })

  await upsertMap(knex, {
    id: 'map_flash_01',
    activity_id: 'act_flash_2d',
    product_id: 'product_demo_07',
    sku_id: 'sku_demo_07',
    promo_price: 3.9,
  })

  await upsertMap(knex, {
    id: 'map_flash_02',
    activity_id: 'act_flash_2d',
    product_id: 'product_demo_13',
    sku_id: 'sku_demo_013',
    promo_price: 8.8,
  })

  await upsertMap(knex, {
    id: 'map_clearance_01',
    activity_id: 'act_clearance_3d',
    product_id: 'product_demo_15',
    sku_id: 'sku_demo_015',
    promo_price: 45.0,
  })
}
