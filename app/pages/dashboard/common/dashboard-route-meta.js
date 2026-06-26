/** Dashboard Shell 路由元数据：模块权限、路径标题、图标 */

export const MODULE_PERMISSION_MAP = {
  overview: 'menu:overview',
  fulfillment: 'menu:fulfillment',
  product: 'menu:product',
  warehouse: 'menu:fulfillment',
  warehouse_3d: 'menu:fulfillment',
  ops: 'menu:ops',
  ai: 'menu:ai',
  org: 'menu:org',
}

export const PATH_MODULE_MAP = [
  { prefix: '/view/dashboard/overview', key: 'overview' },
  { prefix: '/view/dashboard/fulfillment', key: 'fulfillment' },
  { prefix: '/view/dashboard/warehouse-3d', key: 'warehouse' },
  { prefix: '/view/dashboard/ai-workbench', key: 'ai' },
  { prefix: '/view/dashboard/ops-console', key: 'ops' },
  { prefix: '/view/dashboard/approval-todo', key: 'ops' },
  { prefix: '/view/dashboard/audit-log', key: 'ops' },
  { prefix: '/view/dashboard/finance-summary', key: 'ops' },
  { prefix: '/view/dashboard/customer-list', key: 'ops' },
  { prefix: '/view/dashboard/marketing-activities', key: 'ops' },
]

export const CUSTOM_PATH_TITLES = {
  '/view/dashboard/overview': '经营总览',
  '/view/dashboard/fulfillment': '履约中心',
  '/view/dashboard/warehouse-3d': '3D 仓库',
  '/view/dashboard/ai-workbench': 'AI 业务助手',
  '/view/dashboard/approval-todo': '审批待办',
  '/view/dashboard/audit-log': '审计日志',
  '/view/dashboard/finance-summary': '财务中心',
  '/view/dashboard/customer-list': '客户中心',
  '/view/dashboard/marketing-activities': '营销活动',
  '/view/dashboard/org-role-perm': '角色权限',
  '/view/dashboard/ops-console': '运营总览',
  '/view/dashboard/stock-inbound': '商品入库',
}

export const MODULE_ICON_MAP = {
  overview: '总',
  fulfillment: '履',
  product: '商',
  warehouse: '仓',
  warehouse_3d: '3D',
  ops: '运',
  ai: 'AI',
  org: '组',
}

export function resolveModuleKey(route, visibleModules = []) {
  if (route.query && route.query.key) return route.query.key
  const matched = PATH_MODULE_MAP.find((item) => route.path.startsWith(item.prefix))
  if (matched) return matched.key
  return (visibleModules[0] && visibleModules[0].key) || ''
}

export function resolvePageTitle(route, menuStore, currentModule) {
  const siderKey = route.query && route.query.sider_key
  if (siderKey) {
    const item = menuStore.findMenuItem({ key: 'key', value: siderKey })
    return (item && item.name) || null
  }

  const customMatch = Object.entries(CUSTOM_PATH_TITLES).find(([path]) => route.path.startsWith(path))
  if (customMatch) return customMatch[1]

  if (route.path.includes('/sider/schema') && currentModule) {
    const menu = currentModule.siderConfig && currentModule.siderConfig.menu
    const first = menuStore.findFirstMenuItem(menu || [])
    return (first && first.name) || null
  }

  return null
}

export function buildContextTrail(route, moduleName, pageName) {
  if (route.query && route.query.sider_key && pageName) return [pageName]
  if (moduleName && pageName && pageName !== moduleName) return [moduleName, pageName]
  return []
}

export function resolveModuleTarget(menuItem, {
  route,
  menuStore,
  defaultWarehouseId = '',
} = {}) {
  if (!menuItem || !route || !menuStore) return null
  const query = {
    proj_key: route.query.proj_key || 'retail',
    key: menuItem.key,
  }

  if (menuItem.moduleType === 'sider') {
    const firstSiderItem = menuStore.findFirstMenuItem(menuItem.siderConfig?.menu ?? [])
    if (!firstSiderItem) return { path: '/view/dashboard/sider', query }

    const childPathMap = {
      iframe: '/iframe',
      schema: '/schema',
      custom: firstSiderItem.customConfig?.path,
    }
    const childPath = childPathMap[firstSiderItem.moduleType]
    return {
      path: `/view/dashboard/sider${childPath || ''}`,
      query: {
        ...query,
        sider_key: firstSiderItem.key,
      },
    }
  }

  const pathMap = {
    iframe: '/iframe',
    schema: '/schema',
    custom: menuItem.customConfig?.path,
  }
  const target = pathMap[menuItem.moduleType]
  if (!target) return null

  if (menuItem.key === 'warehouse_3d') {
    const warehouseId = route.query.warehouse_id || defaultWarehouseId
    if (warehouseId) query.warehouse_id = warehouseId
  }

  return { path: `/view/dashboard${target}`, query }
}
