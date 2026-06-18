const TENANT_ID = 'tenant_demo_retail'

exports.seed = async (knex) => {
  await knex('stores').insert([
    { store_id: 'store_tmall', tenant_id: TENANT_ID, store_name: '天猫旗舰店', store_type: 'online', status: 'active' },
    { store_id: 'store_offline', tenant_id: TENANT_ID, store_name: '线下体验店', store_type: 'offline', status: 'active' },
  ]).onConflict('store_id').merge()

  await knex('categories').insert([
    { category_id: 'cat_food', tenant_id: TENANT_ID, category_name: '食品', status: 'active' },
    { category_id: 'cat_drink', tenant_id: TENANT_ID, category_name: '饮料', status: 'active' },
    { category_id: 'cat_daily', tenant_id: TENANT_ID, category_name: '日用品', status: 'active' },
  ]).onConflict('category_id').merge()

  await knex('brands').insert([
    { brand_id: 'brand_demo', tenant_id: TENANT_ID, brand_name: '演示品牌', status: 'active' },
    { brand_id: 'brand_house', tenant_id: TENANT_ID, brand_name: '自有品牌', status: 'active' },
  ]).onConflict('brand_id').merge()

  await knex('products').insert({
    product_id: 'product_demo_01',
    tenant_id: TENANT_ID,
    product_name: '演示矿泉水 500ml',
    category_id: 'cat_drink',
    brand_id: 'brand_demo',
    status: 'draft',
    review_status: 'none',
    main_image: 'https://via.placeholder.com/200',
    description: '演示商品，用于建档与上架流程验证',
    created_by: 'user_admin',
    updated_by: 'user_admin',
  }).onConflict('product_id').merge()

  await knex('product_skus').insert({
    sku_id: 'sku_demo_01',
    tenant_id: TENANT_ID,
    product_id: 'product_demo_01',
    sku_code: 'SKU-DEMO-001',
    sale_price: 3.5,
    cost_price: 1.2,
    status: 'active',
  }).onConflict('sku_id').merge()
}
