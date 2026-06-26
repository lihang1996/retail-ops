/**
 * @module common/dashboard-paths
 * @description 仪表盘路由路径构建（前后端共用）
 */

function createSearchParams(query) {
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
  return params
}

function getProjKey(routeOrQuery) {
  if (routeOrQuery && routeOrQuery.query && routeOrQuery.query.proj_key) {
    return routeOrQuery.query.proj_key
  }
  if (typeof routeOrQuery === 'string') return routeOrQuery
  return 'retail'
}

function buildDashboardPath({ projKey = 'retail', moduleKey, path, query = {} }) {
  const params = createSearchParams({
    proj_key: projKey,
    key: moduleKey,
    ...query,
  })
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path || ''}`
  return `/view/dashboard${normalizedPath}?${params.toString()}`
}

function buildSiderPath({ projKey = 'retail', moduleKey, siderKey, query = {} }) {
  const params = createSearchParams({
    proj_key: projKey,
    key: moduleKey,
    sider_key: siderKey,
    ...query,
  })
  return `/view/dashboard/sider/${String(siderKey).replaceAll('_', '-')}?${params.toString()}`
}

function buildSchemaPath({ projKey = 'retail', moduleKey, siderKey, query = {} }) {
  const params = createSearchParams({
    proj_key: projKey,
    key: moduleKey,
    sider_key: siderKey,
    ...query,
  })
  return `/view/dashboard/sider/schema?${params.toString()}`
}

function buildFulfillmentPath({ tab, projKey = 'retail', query = {} }) {
  const params = createSearchParams({ proj_key: projKey, key: 'fulfillment', tab, ...query })
  return `/view/dashboard/fulfillment?${params.toString()}`
}

function buildOverviewPath({ projKey = 'retail', query = {} } = {}) {
  return buildDashboardPath({ projKey, moduleKey: 'overview', path: '/overview', query })
}

function buildAiWorkbenchPath({ projKey = 'retail', query = {} } = {}) {
  return buildDashboardPath({ projKey, moduleKey: 'ai', path: '/ai-workbench', query })
}

function buildWarehouse3dPath({ projKey = 'retail', query = {} } = {}) {
  return buildSiderPath({ projKey, moduleKey: 'warehouse', siderKey: 'warehouse_3d', query })
}

function buildStockInboundPath({ projKey = 'retail', query = {} } = {}) {
  return buildSiderPath({ projKey, moduleKey: 'warehouse', siderKey: 'stock_inbound', query })
}

function buildProductListPath({ projKey = 'retail', query = {} } = {}) {
  return buildSchemaPath({ projKey, moduleKey: 'product', siderKey: 'product_item', query })
}

function buildOpsConsolePath({ projKey = 'retail', query = {} } = {}) {
  return buildSiderPath({ projKey, moduleKey: 'ops', siderKey: 'ops_console', query })
}

function buildMarketingPath({ view, projKey = 'retail', query = {} }) {
  return buildSiderPath({
    projKey,
    moduleKey: 'ops',
    siderKey: 'marketing_activities',
    query: { ...query, view },
  })
}

function buildApprovalPath({ projKey = 'retail', query = {} } = {}) {
  return buildSiderPath({ projKey, moduleKey: 'ops', siderKey: 'approval_todo', query })
}

function buildAuditPath({ projKey = 'retail', query = {} } = {}) {
  return buildSiderPath({ projKey, moduleKey: 'ops', siderKey: 'audit_log', query })
}

function buildCustomerPath({ projKey = 'retail', query = {} } = {}) {
  return buildSiderPath({ projKey, moduleKey: 'ops', siderKey: 'customer_list', query })
}

function buildFinancePath({ projKey = 'retail', query = {} } = {}) {
  return buildSiderPath({ projKey, moduleKey: 'ops', siderKey: 'finance_summary', query })
}

function buildStockListPath({ projKey = 'retail', query = {} } = {}) {
  return buildSchemaPath({ projKey, moduleKey: 'warehouse', siderKey: 'stock_list', query })
}

/** AI playbook 路径解析（pathKey → 可跳转 URL） */
function resolvePlaybookPath(pathKey, { projKey = 'retail', pathQuery = {} } = {}) {
  const map = {
    overview: () => buildOverviewPath({ projKey, query: pathQuery }),
    fulfillment: () => buildFulfillmentPath({ projKey, query: pathQuery }),
    stock_inbound: () => buildStockInboundPath({ projKey, query: pathQuery }),
    stock_list: () => buildStockListPath({ projKey, query: pathQuery }),
    product_list: () => buildProductListPath({ projKey, query: pathQuery }),
    warehouse_3d: () => buildWarehouse3dPath({ projKey, query: pathQuery }),
    approval_todo: () => buildApprovalPath({ projKey, query: pathQuery }),
    audit_log: () => buildAuditPath({ projKey, query: pathQuery }),
    ops_console: () => buildOpsConsolePath({ projKey, query: pathQuery }),
    ai_workbench: () => buildAiWorkbenchPath({ projKey, query: pathQuery }),
    customer_list: () => buildCustomerPath({ projKey, query: pathQuery }),
    finance_summary: () => buildFinancePath({ projKey, query: pathQuery }),
    marketing_activities: () => buildMarketingPath({ projKey, query: pathQuery }),
  }
  const fn = map[pathKey]
  return fn ? fn() : buildOverviewPath({ projKey })
}

module.exports = {
  getProjKey,
  buildDashboardPath,
  buildSiderPath,
  buildSchemaPath,
  buildFulfillmentPath,
  buildOverviewPath,
  buildAiWorkbenchPath,
  buildWarehouse3dPath,
  buildStockInboundPath,
  buildProductListPath,
  buildOpsConsolePath,
  buildMarketingPath,
  buildApprovalPath,
  buildAuditPath,
  buildCustomerPath,
  buildFinancePath,
  buildStockListPath,
  resolvePlaybookPath,
}
