/** 仓库拣货与 3D */
module.exports = {
  id: 'warehouse-picking',
  title: '仓库拣货与 3D 导航',
  keywords: [
    '拣货', '3d', '库位', '仓库', '拣货路径', '怎么拣', '仓管', '今天仓库',
  ],
  permissionsAny: ['shipment:pick', 'shipment:view', 'warehouse:view'],
  summary: '仓库人员处理发货单拣货，并可在 3D 场景查看库位风险与拣货路径。',
  stateFlow: '发货单 created → picking → picked → shipped',
  steps: [
    {
      order: 1,
      title: '查看待拣货发货单',
      description: '在履约中心「待拣货 / 拣货中 / 待出库」Tab 找到对应订单与发货单。',
      pathKey: 'fulfillment',
      pathQuery: { tab: 'await_pick' },
      linkLabel: '履约 · 待拣货',
    },
    {
      order: 2,
      title: '开始拣货并确认',
      description: '对发货单执行「开始拣货」→「确认拣货」，系统记录拣货库位。',
      pathKey: 'fulfillment',
      pathQuery: { tab: 'picking' },
      linkLabel: '履约 · 拣货中',
    },
    {
      order: 3,
      title: '3D 查看路径',
      description: '进入 3D 仓库，可查看库位热力与拣货路径（可带 shipment_id 参数）。',
      pathKey: 'warehouse_3d',
      pathQuery: {},
      linkLabel: '3D 仓库',
    },
    {
      order: 4,
      title: '出库发货',
      description: '确认拣货完成后，在待出库队列执行「出库发货」，库存扣减。',
      pathKey: 'fulfillment',
      pathQuery: { tab: 'await_outbound' },
      linkLabel: '履约 · 待出库',
    },
  ],
  suggestQuestions: [
    '仓库今天怎么拣货？',
    '3D 仓库怎么用？',
    '拣货完怎么出库？',
  ],
}
