/** Demo 黄金链路速览（新人第一站） */
module.exports = {
  id: 'demo-golden-path',
  title: '演示黄金链路（新人速览）',
  keywords: [
    '新人', '入门', '怎么用', '演示', '黄金链路', '第一次', '不熟悉', '流程总览',
    '从哪开始', '能做什么', '帮助', '教程',
  ],
  permissionsAny: [],
  summary: '5 分钟了解本 Demo：商品 → 入库 → 订单履约 → 看板，适合第一次使用的业务同事。',
  stateFlow: '商品上架 → 入库 → 导入订单 → 支付 → 分仓 → 拣货出库 → 看板指标变化',
  steps: [
    {
      order: 1,
      title: '登录并进入经营总览',
      description: '使用演示账号登录，默认进入经营总览查看 GMV、订单与库存指标。',
      pathKey: 'overview',
      pathQuery: {},
      linkLabel: '经营总览',
    },
    {
      order: 2,
      title: '走通商品与入库',
      description: '商品管理创建/上架商品，再在「入库作业」补充库存。',
      pathKey: 'stock_inbound',
      pathQuery: {},
      linkLabel: '去入库',
    },
    {
      order: 3,
      title: '走通订单履约',
      description: '履约中心导入订单 → 支付 → 生成发货单 → 拣货 → 出库。',
      pathKey: 'fulfillment',
      pathQuery: { tab: 'active' },
      linkLabel: '履约中心',
    },
    {
      order: 4,
      title: '查看 3D 与看板变化',
      description: '3D 仓库看拣货路径；刷新经营总览可见指标变化。',
      pathKey: 'warehouse_3d',
      pathQuery: {},
      linkLabel: '3D 仓库',
    },
    {
      order: 5,
      title: '不懂就问 AI 助手',
      description: '任何流程步骤不清楚，可在 AI 业务助手用自然语言提问，获取分步指引。',
      pathKey: 'ai_workbench',
      pathQuery: {},
      linkLabel: 'AI 业务助手',
    },
  ],
  suggestQuestions: [
    '我是新人，从哪里开始？',
    '这个系统是干什么的？',
    '演示黄金链路怎么走？',
  ],
}
