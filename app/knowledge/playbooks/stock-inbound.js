/** 仓储入库 */
module.exports = {
  id: 'stock-inbound',
  title: '商品入库流程',
  keywords: [
    '入库', '收货', '补货', '库存怎么加', '怎么入库', '进货', '上架库存',
  ],
  permissionsAny: ['stock:inbound', 'stock:view'],
  summary: '将实物库存录入系统，增加仓库可用库存，供订单支付时锁定。',
  stateFlow: '入库后 stocks.available_qty 增加，并写入 stock_logs 流水。',
  steps: [
    {
      order: 1,
      title: '选择仓库与 SKU',
      description: '进入「入库作业」，选择目标仓库、SKU 和数量；可选指定库位。',
      pathKey: 'stock_inbound',
      pathQuery: {},
      linkLabel: '打开入库作业',
    },
    {
      order: 2,
      title: '确认入库',
      description: '提交后库存汇总与库位数量增加，可在库存汇总/流水页核对。',
      pathKey: 'stock_list',
      pathQuery: {},
      linkLabel: '查看库存汇总',
    },
    {
      order: 3,
      title: '关注库存风险',
      description: '可用库存低于预警值时，经营总览与 AI 问数均可看到风险 SKU。',
      pathKey: 'overview',
      pathQuery: {},
      linkLabel: '经营总览',
    },
  ],
  suggestQuestions: [
    '怎么给 SKU 入库？',
    '入库后在哪里看库存？',
  ],
}
