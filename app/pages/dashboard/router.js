// dashboard 自定义路由扩展
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

  siderRoutes.push({
    path: 'org-role-perm',
    component: () => import('./org-admin/org-role-perm.vue'),
  })
  siderRoutes.push({
    path: 'stock-inbound',
    component: () => import('./stock-admin/stock-inbound.vue'),
  })
}
