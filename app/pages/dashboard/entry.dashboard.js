import { getAuthToken } from '$elpisCommon/auth-token.js'
import boot from '$elpisPages/boot.js'
import dashboard from './dashboard-shell.vue'
import businessDashboardRouterConfig from '$businessDashboardRouterConfig'
import './dashboard-theme.css'
import './ops/ops-page-kit.css'

document.documentElement.classList.remove('dark')
document.documentElement.classList.add('retail-light', 'retail-dashboard')

/** 从 URL 同步 proj_key（与 entry.tpl 隐藏域互补，避免 API 缺 proj_key 头） */
function syncProjKeyFromUrl() {
  const pk = new URLSearchParams(window.location.search).get('proj_key')
  if (pk && window.projKey !== pk) window.projKey = pk
}

syncProjKeyFromUrl()

if (!getAuthToken()) {
  window.location.replace('/view/login')
} else {
  const routes = []

  routes.push({
    path: '/view/dashboard/iframe',
    component: () => import('$elpisPages/dashboard/complex-view/iframe-view/iframe-view.vue'),
  })
  routes.push({
    path: '/view/dashboard/schema',
    component: () => import('./schema-view/schema-view.vue'),
  })

  const siderRoutes = [
    {
      path: 'iframe',
      component: () => import('$elpisPages/dashboard/complex-view/iframe-view/iframe-view.vue'),
    },
    {
      path: 'schema',
      component: () => import('./schema-view/schema-view.vue'),
    },
  ]

  routes.push({
    path: '/view/dashboard/sider',
    component: () => import('$elpisPages/dashboard/complex-view/sider-view/sider-view.vue'),
    children: siderRoutes,
  })

  if (typeof businessDashboardRouterConfig === 'function') {
    businessDashboardRouterConfig({ routes, siderRoutes })
  }

  routes.push({
    path: '/view/dashboard/sider/:chapters+',
    component: () => import('$elpisPages/dashboard/complex-view/sider-view/sider-view.vue'),
  })

  boot(dashboard, { routes })
}
