const { buildSchemaModule } = require('./org')

/** 运营中心侧栏：审批、审计、客户/财务/营销薄模块 */
function buildOpsMenu() {
  const custom = (key, name, path) => ({
    key,
    name,
    menuType: 'module',
    moduleType: 'custom',
    customConfig: { path },
  })

  return {
    key: 'ops',
    name: '运营中心',
    permissionCode: 'menu:ops',
    menuType: 'module',
    moduleType: 'sider',
    siderConfig: {
      menu: [
    custom('ops_console', '运营总览', '/ops-console'),
        custom('approval_todo', '审批待办', '/approval-todo'),
        custom('audit_log', '审计日志', '/audit-log'),
        custom('customer_list', '客户中心', '/customer-list'),
        custom('finance_summary', '财务中心', '/finance-summary'),
        custom('marketing_activities', '营销活动', '/marketing-activities'),
      ],
    },
  }
}

module.exports = { buildOpsMenu }
