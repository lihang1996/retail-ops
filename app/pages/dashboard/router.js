// dashboard 自定义路由扩展（履约、3D、AI、审批、审计、薄模块等）
module.exports = ({ routes, siderRoutes }) => {
  // 全屏自定义页（非 sider 内嵌）
  const fullPages = [
    { path: '/view/dashboard/overview', file: './overview/overview.vue' },
    { path: '/view/dashboard/fulfillment', file: './fulfillment/fulfillment.vue' },
    { path: '/view/dashboard/ai-workbench', file: './ai-workbench/ai-workbench.vue' },
    { path: '/view/dashboard/warehouse-3d', file: './warehouse-3d/warehouse-3d.vue' },
    { path: '/view/dashboard/approval-todo', file: './approval/approval-todo.vue' },
    { path: '/view/dashboard/audit-log', file: './audit/audit-log.vue' },
    { path: '/view/dashboard/finance-summary', file: './finance/finance-summary.vue' },
    { path: '/view/dashboard/customer-list', file: './customer/customer-list.vue' },
    { path: '/view/dashboard/marketing-activities', file: './marketing/marketing-activities.vue' },
  ]
  fullPages.forEach(({ path, file }) => {
    routes.push({ path, component: () => import(file) })
  })

  // sider 内嵌自定义页（组织权限、入库等）
  siderRoutes.push({
    path: 'org-role-perm',
    component: () => import('./org-admin/org-role-perm.vue'),
  })
  siderRoutes.push({
    path: 'stock-inbound',
    component: () => import('./stock-admin/stock-inbound.vue'),
  })
  siderRoutes.push({
    path: 'approval-todo',
    component: () => import('./approval/approval-todo.vue'),
  })
  siderRoutes.push({
    path: 'audit-log',
    component: () => import('./audit/audit-log.vue'),
  })
  siderRoutes.push({
    path: 'finance-summary',
    component: () => import('./finance/finance-summary.vue'),
  })
  siderRoutes.push({
    path: 'customer-list',
    component: () => import('./customer/customer-list.vue'),
  })
  siderRoutes.push({
    path: 'marketing-activities',
    component: () => import('./marketing/marketing-activities.vue'),
  })
}
