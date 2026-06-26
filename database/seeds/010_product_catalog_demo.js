const TENANT_ID = 'tenant_demo_retail'

async function upsertRow(knex, table, row, conflict) {
  const q = knex(table).insert(row)
  if (Array.isArray(conflict)) q.onConflict(conflict).merge()
  else q.onConflict(conflict).merge()
  await q
}

exports.seed = async (knex) => {
  const stores = [
    { store_id: 'store_tmall', store_name: '天猫旗舰店', store_type: 'online', status: 'active' },
    { store_id: 'store_jd', store_name: '京东自营店', store_type: 'online', status: 'active' },
    { store_id: 'store_douyin', store_name: '抖音小店', store_type: 'online', status: 'active' },
    { store_id: 'store_wechat', store_name: '微信视频号店', store_type: 'online', status: 'active' },
    { store_id: 'store_offline', store_name: '线下体验店', store_type: 'offline', status: 'active' },
    { store_id: 'store_omni_sh', store_name: '上海全渠道店', store_type: 'omni', status: 'active' },
    { store_id: 'store_omni_sz', store_name: '深圳全渠道店', store_type: 'omni', status: 'active' },
    { store_id: 'store_outlet', store_name: '奥特莱斯店', store_type: 'offline', status: 'disabled' },
  ]

  for (const row of stores) {
    await upsertRow(knex, 'stores', { tenant_id: TENANT_ID, ...row }, 'store_id')
  }

  const categories = [
    { category_id: 'cat_food', category_name: '食品', parent_id: null, status: 'active' },
    { category_id: 'cat_drink', category_name: '饮料', parent_id: 'cat_food', status: 'active' },
    { category_id: 'cat_snack', category_name: '休闲零食', parent_id: 'cat_food', status: 'active' },
    { category_id: 'cat_daily', category_name: '日用品', parent_id: null, status: 'active' },
    { category_id: 'cat_clean', category_name: '清洁护理', parent_id: 'cat_daily', status: 'active' },
    { category_id: 'cat_beauty', category_name: '美妆个护', parent_id: null, status: 'active' },
    { category_id: 'cat_skincare', category_name: '护肤', parent_id: 'cat_beauty', status: 'active' },
    { category_id: 'cat_baby', category_name: '母婴', parent_id: null, status: 'active' },
    { category_id: 'cat_appliance', category_name: '小家电', parent_id: null, status: 'active' },
    { category_id: 'cat_pet', category_name: '宠物用品', parent_id: null, status: 'disabled' },
  ]

  for (const row of categories) {
    await upsertRow(knex, 'categories', { tenant_id: TENANT_ID, ...row }, 'category_id')
  }

  const brands = [
    { brand_id: 'brand_demo', brand_name: '演示品牌', status: 'active' },
    { brand_id: 'brand_house', brand_name: '自有品牌', status: 'active' },
    { brand_id: 'brand_pure', brand_name: '净泉', status: 'active' },
    { brand_id: 'brand_fresh', brand_name: '鲜享', status: 'active' },
    { brand_id: 'brand_care', brand_name: '柔护', status: 'active' },
    { brand_id: 'brand_tech', brand_name: '智家', status: 'active' },
    { brand_id: 'brand_nature', brand_name: '自然派', status: 'active' },
    { brand_id: 'brand_luxe', brand_name: '臻选', status: 'active' },
    { brand_id: 'brand_kids', brand_name: '贝贝安', status: 'active' },
    { brand_id: 'brand_legacy', brand_name: '旧品牌（停用）', status: 'disabled' },
  ]

  for (const row of brands) {
    await upsertRow(knex, 'brands', { tenant_id: TENANT_ID, ...row }, 'brand_id')
  }
}
