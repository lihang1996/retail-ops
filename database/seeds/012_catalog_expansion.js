/**
 * 扩充店铺 / 类目 / 品牌主数据，供商品管理三个目录页展示更丰富的演示数据。
 * 幂等 upsert，不破坏 010/011 已引用的 ID。
 */
const TENANT_ID = 'tenant_demo_retail'

async function upsertRow(knex, table, row, conflict) {
  const q = knex(table).insert(row)
  if (Array.isArray(conflict)) q.onConflict(conflict).merge()
  else q.onConflict(conflict).merge()
  await q
}

exports.seed = async (knex) => {
  const stores = [
    { store_id: 'store_pdd', store_name: '拼多多官方旗舰店', store_type: 'online', status: 'active' },
    { store_id: 'store_kuaishou', store_name: '快手官方小店', store_type: 'online', status: 'active' },
    { store_id: 'store_xhs', store_name: '小红书品牌店', store_type: 'online', status: 'active' },
    { store_id: 'store_taobao_corp', store_name: '淘宝企业购店', store_type: 'online', status: 'active' },
    { store_id: 'store_kaola', store_name: '考拉海购自营', store_type: 'online', status: 'active' },
    { store_id: 'store_amazon', store_name: '亚马逊海外旗舰店', store_type: 'online', status: 'active' },
    { store_id: 'store_meituan', store_name: '美团闪购店', store_type: 'online', status: 'active' },
    { store_id: 'store_eleme', store_name: '饿了么零售店', store_type: 'online', status: 'active' },
    { store_id: 'store_bj_sanlitun', store_name: '北京三里屯体验店', store_type: 'offline', status: 'active' },
    { store_id: 'store_bj_wangfujing', store_name: '北京王府井旗舰店', store_type: 'offline', status: 'active' },
    { store_id: 'store_sh_nanjinglu', store_name: '上海南京东路店', store_type: 'offline', status: 'active' },
    { store_id: 'store_gz_tianhe', store_name: '广州天河城店', store_type: 'offline', status: 'active' },
    { store_id: 'store_cd_chunxi', store_name: '成都春熙路店', store_type: 'offline', status: 'active' },
    { store_id: 'store_hz_hubin', store_name: '杭州湖滨银泰店', store_type: 'offline', status: 'active' },
    { store_id: 'store_wh_guanggu', store_name: '武汉光谷广场店', store_type: 'offline', status: 'active' },
    { store_id: 'store_xa_dayue', store_name: '西安大悦城店', store_type: 'offline', status: 'active' },
    { store_id: 'store_nj_xinjiekou', store_name: '南京新街口店', store_type: 'offline', status: 'active' },
    { store_id: 'store_omni_bj', store_name: '北京全渠道中心店', store_type: 'omni', status: 'active' },
    { store_id: 'store_omni_hz', store_name: '杭州全渠道中心店', store_type: 'omni', status: 'active' },
    { store_id: 'store_omni_cd', store_name: '成都全渠道中心店', store_type: 'omni', status: 'active' },
    { store_id: 'store_omni_east', store_name: '华东大区旗舰店', store_type: 'omni', status: 'active' },
    { store_id: 'store_omni_south', store_name: '华南大区旗舰店', store_type: 'omni', status: 'active' },
    { store_id: 'store_omni_west', store_name: '西南大区旗舰店', store_type: 'omni', status: 'active' },
    { store_id: 'store_popup_sh', store_name: '上海限时快闪店', store_type: 'offline', status: 'active' },
    { store_id: 'store_popup_sz', store_name: '深圳限时快闪店', store_type: 'offline', status: 'disabled' },
    { store_id: 'store_dutyfree', store_name: '海南免税专柜', store_type: 'offline', status: 'active' },
    { store_id: 'store_b2b', store_name: '企业团购专营店', store_type: 'online', status: 'active' },
  ]

  for (const row of stores) {
    await upsertRow(knex, 'stores', { tenant_id: TENANT_ID, ...row }, 'store_id')
  }

  const categories = [
    // 一级
    { category_id: 'cat_fresh', category_name: '生鲜果蔬', parent_id: null, status: 'active' },
    { category_id: 'cat_fashion', category_name: '服饰鞋包', parent_id: null, status: 'active' },
    { category_id: 'cat_digital', category_name: '数码家电', parent_id: null, status: 'active' },
    { category_id: 'cat_sports', category_name: '运动户外', parent_id: null, status: 'active' },
    { category_id: 'cat_home', category_name: '家居家纺', parent_id: null, status: 'active' },
    { category_id: 'cat_auto', category_name: '汽车用品', parent_id: null, status: 'active' },
    { category_id: 'cat_books', category_name: '图书文娱', parent_id: null, status: 'active' },
    { category_id: 'cat_health', category_name: '营养保健', parent_id: null, status: 'active' },
    // 生鲜二级
    { category_id: 'cat_meat', category_name: '肉禽蛋品', parent_id: 'cat_fresh', status: 'active' },
    { category_id: 'cat_veg', category_name: '蔬菜', parent_id: 'cat_fresh', status: 'active' },
    { category_id: 'cat_fruit', category_name: '水果', parent_id: 'cat_fresh', status: 'active' },
    { category_id: 'cat_seafood', category_name: '水产海鲜', parent_id: 'cat_fresh', status: 'active' },
    // 服饰二级
    { category_id: 'cat_women', category_name: '女装', parent_id: 'cat_fashion', status: 'active' },
    { category_id: 'cat_men', category_name: '男装', parent_id: 'cat_fashion', status: 'active' },
    { category_id: 'cat_kids_wear', category_name: '童装', parent_id: 'cat_fashion', status: 'active' },
    { category_id: 'cat_shoes', category_name: '鞋靴', parent_id: 'cat_fashion', status: 'active' },
    { category_id: 'cat_bags', category_name: '箱包皮具', parent_id: 'cat_fashion', status: 'active' },
    // 数码二级
    { category_id: 'cat_phone', category_name: '手机通讯', parent_id: 'cat_digital', status: 'active' },
    { category_id: 'cat_computer', category_name: '电脑办公', parent_id: 'cat_digital', status: 'active' },
    { category_id: 'cat_digital_acc', category_name: '数码配件', parent_id: 'cat_digital', status: 'active' },
    { category_id: 'cat_tv', category_name: '电视影音', parent_id: 'cat_digital', status: 'active' },
    // 数码三级
    { category_id: 'cat_phone_case', category_name: '手机壳膜', parent_id: 'cat_phone', status: 'active' },
    { category_id: 'cat_charger', category_name: '充电器/数据线', parent_id: 'cat_phone', status: 'active' },
    // 运动二级
    { category_id: 'cat_fitness', category_name: '健身器材', parent_id: 'cat_sports', status: 'active' },
    { category_id: 'cat_camping', category_name: '露营装备', parent_id: 'cat_sports', status: 'active' },
    { category_id: 'cat_ball', category_name: '球类运动', parent_id: 'cat_sports', status: 'active' },
    { category_id: 'cat_running', category_name: '跑步骑行', parent_id: 'cat_sports', status: 'active' },
    // 家居二级
    { category_id: 'cat_bedding', category_name: '床品布艺', parent_id: 'cat_home', status: 'active' },
    { category_id: 'cat_kitchen', category_name: '厨房用品', parent_id: 'cat_home', status: 'active' },
    { category_id: 'cat_decor', category_name: '家居饰品', parent_id: 'cat_home', status: 'active' },
    // 家居三级
    { category_id: 'cat_cookware', category_name: '锅具炊具', parent_id: 'cat_kitchen', status: 'active' },
    { category_id: 'cat_tableware', category_name: '餐具水具', parent_id: 'cat_kitchen', status: 'active' },
    // 食品扩展（挂到已有 cat_food）
    { category_id: 'cat_grain', category_name: '粮油调味', parent_id: 'cat_food', status: 'active' },
    { category_id: 'cat_instant', category_name: '方便速食', parent_id: 'cat_food', status: 'active' },
    { category_id: 'cat_milk', category_name: '乳制品', parent_id: 'cat_food', status: 'active' },
    // 饮料扩展
    { category_id: 'cat_tea', category_name: '茶饮冲调', parent_id: 'cat_drink', status: 'active' },
    { category_id: 'cat_wine', category_name: '酒类', parent_id: 'cat_drink', status: 'active' },
    // 美妆扩展
    { category_id: 'cat_makeup', category_name: '彩妆', parent_id: 'cat_beauty', status: 'active' },
    { category_id: 'cat_perfume', category_name: '香水', parent_id: 'cat_beauty', status: 'active' },
    { category_id: 'cat_hair', category_name: '洗护发', parent_id: 'cat_beauty', status: 'active' },
    // 母婴扩展
    { category_id: 'cat_toy', category_name: '玩具早教', parent_id: 'cat_baby', status: 'active' },
    { category_id: 'cat_maternity', category_name: '孕妈用品', parent_id: 'cat_baby', status: 'active' },
    // 停用示例
    { category_id: 'cat_discontinued', category_name: '已下线类目（示例）', parent_id: null, status: 'disabled' },
  ]

  for (const row of categories) {
    await upsertRow(knex, 'categories', { tenant_id: TENANT_ID, ...row }, 'category_id')
  }

  const brands = [
    { brand_id: 'brand_premium', brand_name: '臻选系列', status: 'active' },
    { brand_id: 'brand_unicom', brand_name: '联通优选', status: 'active' },
    { brand_id: 'brand_greenfield', brand_name: '绿野田园', status: 'active' },
    { brand_id: 'brand_ocean', brand_name: '海之蓝', status: 'active' },
    { brand_id: 'brand_mountain', brand_name: '山野集', status: 'active' },
    { brand_id: 'brand_sunrise', brand_name: '晨光文具', status: 'active' },
    { brand_id: 'brand_homestar', brand_name: '星家生活', status: 'active' },
    { brand_id: 'brand_fitpro', brand_name: '劲动', status: 'active' },
    { brand_id: 'brand_silkroad', brand_name: '丝路坊', status: 'active' },
    { brand_id: 'brand_cloudtea', brand_name: '云茶纪', status: 'active' },
    { brand_id: 'brand_petjoy', brand_name: '宠悦', status: 'active' },
    { brand_id: 'brand_babyplus', brand_name: '贝加', status: 'active' },
    { brand_id: 'brand_urban', brand_name: '都市轻履', status: 'active' },
    { brand_id: 'brand_pixel', brand_name: '像素科技', status: 'active' },
    { brand_id: 'brand_aroma', brand_name: '芳语', status: 'active' },
    { brand_id: 'brand_pureland', brand_name: '净土', status: 'active' },
    { brand_id: 'brand_harvest', brand_name: '丰年粮品', status: 'active' },
    { brand_id: 'brand_swift', brand_name: '迅达物流优选', status: 'active' },
    { brand_id: 'brand_lumen', brand_name: '明光照明', status: 'active' },
    { brand_id: 'brand_cocoon', brand_name: '茧居', status: 'active' },
    { brand_id: 'brand_wildbean', brand_name: '野豆咖啡', status: 'active' },
    { brand_id: 'brand_snowpeak', brand_name: '雪峰户外', status: 'active' },
    { brand_id: 'brand_jade', brand_name: '玉润', status: 'active' },
    { brand_id: 'brand_riverstone', brand_name: '河石', status: 'active' },
    { brand_id: 'brand_globalbuy', brand_name: '环球购', status: 'active' },
    { brand_id: 'brand_localhero', brand_name: '在地英雄', status: 'active' },
    { brand_id: 'brand_sweetday', brand_name: '甜日', status: 'active' },
    { brand_id: 'brand_craftman', brand_name: '匠人制造', status: 'active' },
    { brand_id: 'brand_vintage', brand_name: '复古集（停用）', status: 'disabled' },
  ]

  for (const row of brands) {
    await upsertRow(knex, 'brands', { tenant_id: TENANT_ID, ...row }, 'brand_id')
  }
}
