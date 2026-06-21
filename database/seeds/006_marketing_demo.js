const TENANT_ID = 'tenant_demo_retail'

exports.seed = async (knex) => {
  await knex('marketing_activities').insert({
    activity_id: 'act_summer',
    tenant_id: TENANT_ID,
    activity_name: '夏季促销',
    activity_type: 'promotion',
    status: 'active',
    start_at: knex.fn.now(),
  }).onConflict('activity_id').merge()

  await knex('marketing_activity_products').insert({
    id: 'map_demo_01',
    tenant_id: TENANT_ID,
    activity_id: 'act_summer',
    product_id: 'product_demo_01',
    sku_id: 'sku_demo_01',
    promo_price: 2.9,
  }).onConflict('id').merge()

  await knex('customers')
    .where({ tenant_id: TENANT_ID })
    .update({ phone: '13800138000' })
}
