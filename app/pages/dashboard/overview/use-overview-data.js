import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dashboardApi } from '../api/dashboard-api.js'
import { authApi } from '../api/auth-api.js'
import { unwrapData } from '../api/http.js'
import { buildOverviewFocusItems } from '../common/dashboard-metric-builder.js'
import {
  buildFulfillmentPath,
  buildProductListPath,
  buildSchemaPath,
  buildSiderPath,
  buildStockInboundPath,
  buildWarehouse3dPath,
  buildAiWorkbenchPath,
  getProjKey,
} from '../common/nav.js'
import {
  resolveAuditAction,
  buildAuditSummary,
  formatRelativeTime,
} from '../common/audit-action-dict.js'
import { buildOverviewMetricCards, buildOverviewQuickEntries } from './overview-metric-builder.js'

export function useOverviewData() {
  const loading = ref(true)
  const error = ref(null)
  const router = useRouter()
  const route = useRoute()
  const projKey = computed(() => getProjKey(route))
  const data = ref({ visibility: {}, trend: [] })
  const permissionMenus = ref([])

  const showAiGuide = computed(() => permissionMenus.value.includes('menu:ai'))
  const aiWorkbenchPath = computed(() => buildAiWorkbenchPath({ projKey: projKey.value }))

  const fulfillmentPath = (query = {}) => buildFulfillmentPath({ projKey: projKey.value, query })
  const stockRiskPath = () => buildSchemaPath({
    projKey: projKey.value,
    moduleKey: 'warehouse',
    siderKey: 'stock_list',
    query: { risk: 'abnormal' },
  })
  const opsPath = (siderKey, query = {}) => buildSiderPath({
    projKey: projKey.value,
    moduleKey: 'ops',
    siderKey,
    query,
  })

  const healthTone = computed(() => {
    const rate = data.value.stockHealthRate != null ? data.value.stockHealthRate : 100
    if (rate >= 80) return 'is-good'
    if (rate >= 50) return 'is-warn'
    return 'is-bad'
  })

  const trendSummary = computed(() => {
    const trend = data.value.trend || []
    let orders = 0
    let gmv = 0
    for (const row of trend) {
      orders += Number(row.orderCount) || 0
      gmv += Number(row.gmv) || 0
    }
    return { orders, gmv }
  })

  const metricCards = computed(() => buildOverviewMetricCards(data.value, {
    fulfillment: fulfillmentPath(),
    stockRisk: stockRiskPath(),
    stockInbound: buildStockInboundPath({ projKey: projKey.value }),
  }))

  const todoItems = computed(() => buildOverviewFocusItems(data.value, {
    fulfillment: fulfillmentPath({ tab: 'active' }),
    stockRisk: stockRiskPath(),
    pendingPayment: fulfillmentPath({ tab: 'pending_payment' }),
  }))

  const quickCards = computed(() => buildOverviewQuickEntries({
    fulfillment: fulfillmentPath(),
    warehouse3d: buildWarehouse3dPath({ projKey: projKey.value }),
    product: buildProductListPath({ projKey: projKey.value }),
    ai: showAiGuide.value ? aiWorkbenchPath.value : '',
  }))

  const enrichedAuditLogs = computed(() => (
    (data.value.recentAuditLogs || []).map((row) => {
      const action = resolveAuditAction(row.action_code)
      const { actionPhrase, detailHint } = buildAuditSummary(row)
      return {
        ...row,
        label: action.label,
        icon: action.icon,
        module: action.module,
        tone: action.tone,
        actionPhrase,
        detailHint,
        relativeTime: formatRelativeTime(row.created_at),
      }
    })
  ))

  function go(path) {
    if (!path) return
    router.push(path).catch(() => {})
  }

  async function loadPermissions() {
    try {
      const res = await authApi.permissions()
      const payload = unwrapData(res)
      permissionMenus.value = (payload && payload.menus) || []
    } catch {
      permissionMenus.value = []
    }
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const [res] = await Promise.all([
        dashboardApi.overview(),
        loadPermissions(),
      ])
      data.value = unwrapData(res, { visibility: {}, trend: [] }) || { visibility: {}, trend: [] }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('经营总览加载失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  return {
    loading,
    error,
    data,
    healthTone,
    trendSummary,
    metricCards,
    todoItems,
    quickCards,
    enrichedAuditLogs,
    showAiGuide,
    aiWorkbenchPath,
    opsPath,
    go,
    load,
  }
}
