// dashboard 自定义路由扩展（履约、3D、AI、审批、审计、薄模块等）
// 注意：动态 import 路径必须是静态字符串，不能用变量，否则 webpack dev 无法打包 .vue 文件
module.exports = ({ routes, siderRoutes }) => {
  routes.push({
    path: '/view/dashboard/overview',
    component: () => import('./overview/overview.vue'),
  })
  routes.push({
    path: '/view/dashboard/fulfillment',
    component: () => import('./fulfillment/fulfillment.vue'),
  })
  routes.push({
    path: '/view/dashboard/ai-workbench',
    component: () => import('./ai-workbench/ai-workbench.vue'),
  })
  routes.push({
    path: '/view/dashboard/warehouse-3d',
    component: () => import('./warehouse-3d/warehouse-3d.vue'),
  })
  routes.push({
    path: '/view/dashboard/approval-todo',
    component: () => import('./approval/approval-todo.vue'),
  })
  routes.push({
    path: '/view/dashboard/audit-log',
    component: () => import('./audit/audit-log.vue'),
  })
  routes.push({
    path: '/view/dashboard/finance-summary',
    component: () => import('./finance/finance-summary.vue'),
  })
  routes.push({
    path: '/view/dashboard/customer-list',
    component: () => import('./customer/customer-list.vue'),
  })
  routes.push({
    path: '/view/dashboard/marketing-activities',
    component: () => import('./marketing/marketing-activities.vue'),
  })

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
    path: 'warehouse-3d',
    component: () => import('./warehouse-3d/warehouse-3d.vue'),
  })
  routes.push({
    path: '/view/dashboard/ops-console',
    component: () => import('./ops/ops-console.vue'),
  })
  siderRoutes.push({
    path: 'ops-console',
    component: () => import('./ops/ops-console.vue'),
  })
  siderRoutes.push({
    path: 'marketing-activities',
    component: () => import('./marketing/marketing-activities.vue'),
  })
}
