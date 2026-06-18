// dashboard 自定义路由扩展
module.exports = ({ routes }) => {
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
}
