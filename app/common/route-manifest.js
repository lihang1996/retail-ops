/**
 * @module common/route-manifest
 * @description API 路由清单（从 permission-map 自动生成，CI 校验单一来源）
 */
const permissionMap = require('./permission-map')

function inferModule(apiPath) {
  if (apiPath.startsWith('/api/auth')) return 'auth'
  if (apiPath.startsWith('/api/project')) return 'project'
  if (apiPath.includes('/dashboard/')) return 'dashboard'
  if (apiPath.includes('/workbench/')) return 'workbench'
  if (apiPath.includes('/org/') || apiPath.includes('/permission/')) return 'org'
  if (apiPath.includes('/store/')) return 'store'
  if (apiPath.includes('/category/') || apiPath.includes('/brand/') || apiPath.includes('/product/')) return 'product'
  if (apiPath.includes('/warehouse/')) return 'warehouse'
  if (apiPath.includes('/stock/')) return 'stock'
  if (apiPath.includes('/order/') || apiPath.includes('/shipment/')) return 'order'
  if (apiPath.includes('/approval/')) return 'approval'
  if (apiPath.includes('/customer/')) return 'customer'
  if (apiPath.includes('/audit/')) return 'audit'
  if (apiPath.includes('/marketing/')) return 'marketing'
  if (apiPath.includes('/finance/')) return 'finance'
  if (apiPath.includes('/ai/')) return 'ai'
  return 'other'
}

const ROUTES = Object.keys(permissionMap).map((key) => {
  const spaceIndex = key.indexOf(' ')
  const method = key.slice(0, spaceIndex)
  const path = key.slice(spaceIndex + 1)
  return {
    method,
    path,
    permission: permissionMap[key],
    module: inferModule(path),
  }
})

function routeKey(route) {
  return `${route.method} ${route.path}`
}

function buildPermissionMapFromManifest(routes = ROUTES) {
  return routes.reduce((map, route) => {
    map[routeKey(route)] = route.permission
    return map
  }, {})
}

function assertPermissionMapCoverage(permissionMapInput, routes = ROUTES) {
  const missing = routes.filter((route) => !(routeKey(route) in permissionMapInput))
  return { ok: missing.length === 0, missing }
}

module.exports = {
  ROUTES,
  routeKey,
  buildPermissionMapFromManifest,
  assertPermissionMapCoverage,
  inferModule,
}
