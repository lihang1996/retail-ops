/** 商品上架：创建 → 审批 → 在售 */
module.exports = {
  id: 'product-onboarding',
  title: '商品上架流程',
  keywords: [
    '上架', '商品', 'sku', '审批', '怎么卖', '新品', '提交审核', '在售',
    '创建商品', '商品怎么', '卖商品',
  ],
  permissionsAny: ['product:view'],
  summary: '新建商品与 SKU，经上架审批通过后可在订单中使用。',
  stateFlow: 'draft / pending_review → on_sale（审批通过后上架）',
  steps: [
    {
      order: 1,
      title: '维护基础资料',
      description: '在商品管理维护店铺、类目、品牌（如尚未配置）。',
      pathKey: 'product_list',
      pathQuery: { key: 'product', sider_key: 'store' },
      linkLabel: '商品管理',
    },
    {
      order: 2,
      title: '创建商品与 SKU',
      description: '在商品列表新建商品，补充 SKU 编码、售价等信息。',
      pathKey: 'product_list',
      pathQuery: {},
      linkLabel: '打开商品列表',
    },
    {
      order: 3,
      title: '提交上架审批',
      description: '商品状态为待审核时，提交上架审批单。',
      pathKey: 'approval_todo',
      pathQuery: {},
      linkLabel: '审批待办',
    },
    {
      order: 4,
      title: '审批通过',
      description: '有审批权限的角色在审批待办中通过，商品变为「在售」。',
      pathKey: 'approval_todo',
      pathQuery: {},
      linkLabel: '去审批',
    },
    {
      order: 5,
      title: '商品入库',
      description: '在售商品需先入库才有可售库存，前往入库作业录入数量。',
      pathKey: 'stock_inbound',
      pathQuery: {},
      linkLabel: '商品入库',
    },
  ],
  suggestQuestions: [
    '商品怎么上架？',
    '新品从创建到可售要几步？',
    '上架审批在哪里？',
  ],
}
