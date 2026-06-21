const TENANT_ID = 'tenant_demo_retail'

exports.seed = async (knex) => {
  const stockId = 'stock_demo_01'
  await knex('stocks').insert({
    stock_id: stockId,
    tenant_id: TENANT_ID,
    sku_id: 'sku_demo_01',
    warehouse_id: 'wh_main',
    total_qty: 500,
    available_qty: 500,
    locked_qty: 0,
    in_transit_qty: 0,
    warning_qty: 50,
    version: 0,
  }).onConflict(['tenant_id', 'sku_id', 'warehouse_id']).merge({
    total_qty: 500,
    available_qty: 500,
    locked_qty: 0,
  })

  await knex('stock_locations').insert({
    stock_location_id: 'sloc_demo_01',
    tenant_id: TENANT_ID,
    location_id: 'loc_a1_01',
    sku_id: 'sku_demo_01',
    qty: 500,
  }).onConflict(['tenant_id', 'location_id', 'sku_id']).merge({ qty: 500 })

  await knex('products').where({ product_id: 'product_demo_01' }).update({ status: 'on_sale' })
}
