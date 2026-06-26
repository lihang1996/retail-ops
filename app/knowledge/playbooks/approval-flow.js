/** 上架审批：提交 → 待办 → 通过/驳回 */
module.exports = {
  id: 'approval-flow',
  title: '上架审批流程',
  keywords: [
    '审批', '待办', '通过', '驳回', '上架审批', '审核', '待审批',
    '审批怎么', '谁审批', '审批中心', '审批流程',
  ],
  permissionsAny: ['approval:view', 'approval:approve', 'approval:submit'],
  summary: '商品提交上架后进入审批待办，有审批权限的角色可通过或驳回，通过后商品变为在售。',
  stateFlow: 'pending → approved / rejected（审批单与商品状态联动）',
  steps: [
    {
      order: 1,
      title: '提交上架审批',
      description: '运营在商品管理中创建商品后，提交上架审批单，状态变为待审批。',
      pathKey: 'product_list',
      pathQuery: {},
      linkLabel: '商品管理',
    },
    {
      order: 2,
      title: '查看审批待办',
      description: '审批人进入「审批待办」，查看待处理的上架申请及关联商品信息。',
      pathKey: 'approval_todo',
      pathQuery: { status: 'pending' },
      linkLabel: '审批待办',
    },
    {
      order: 3,
      title: '审批通过或驳回',
      description: '点击通过：商品变为「在售」，可继续入库；驳回则退回修改。',
      pathKey: 'approval_todo',
      pathQuery: {},
      linkLabel: '去处理审批',
    },
    {
      order: 4,
      title: '核对审计记录',
      description: '审批动作会写入审计日志，可在审计查询中追溯操作人与时间。',
      pathKey: 'audit_log',
      pathQuery: {},
      linkLabel: '审计日志',
    },
  ],
  suggestQuestions: [
    '上架审批在哪里处理？',
    '审批通过后商品会怎样？',
    '怎么查看审批待办？',
  ],
}
