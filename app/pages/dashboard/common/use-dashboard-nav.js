import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getProjKey,
  buildSiderPath,
  buildSchemaPath,
  buildFulfillmentPath,
  buildMarketingPath,
  buildProductListPath,
  buildWarehouse3dPath,
  buildOpsConsolePath,
} from './nav.js'

/**
 * 仪表盘内导航：统一 projKey 与 router.push
 */
export function useDashboardNav() {
  const route = useRoute()
  const router = useRouter()
  const projKey = computed(() => getProjKey(route))

  function go(path) {
    if (!path) return
    router.push(path).catch(() => {})
  }

  const opsPath = (siderKey, query = {}) => buildSiderPath({
    projKey: projKey.value,
    moduleKey: 'ops',
    siderKey,
    query,
  })

  const warehousePath = (siderKey, query = {}) => buildSchemaPath({
    projKey: projKey.value,
    moduleKey: 'warehouse',
    siderKey,
    query,
  })

  const fulfillmentPath = (tab, query = {}) => {
    if (typeof tab === 'object' && tab !== null) {
      return buildFulfillmentPath({ projKey: projKey.value, query: tab })
    }
    return buildFulfillmentPath({ tab, projKey: projKey.value, query })
  }

  const marketingPath = (view) => buildMarketingPath({ view, projKey: projKey.value })

  return {
    route,
    router,
    projKey,
    go,
    opsPath,
    warehousePath,
    fulfillmentPath,
    marketingPath,
    productListPath: (query = {}) => buildProductListPath({ projKey: projKey.value, query }),
    warehouse3dPath: (query = {}) => buildWarehouse3dPath({ projKey: projKey.value, query }),
    opsConsolePath: (query = {}) => buildOpsConsolePath({ projKey: projKey.value, query }),
  }
}
