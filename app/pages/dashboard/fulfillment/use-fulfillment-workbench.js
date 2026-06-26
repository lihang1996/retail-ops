import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { workbenchApi } from '../api/workbench-api.js'

const ALLOWED_TABS = new Set([
  'all',
  'paid_lifecycle',
  'active',
  'pending_payment',
  'paid',
  'allocated',
  'await_pick',
  'picking',
  'await_outbound',
  'shipped',
])

export const FULFILLMENT_TABS = [
  { key: 'all', label: '全部' },
  { key: 'paid_lifecycle', label: '已支付及后续' },
  { key: 'active', label: '履约处理中' },
  { key: 'pending_payment', label: '待支付' },
  { key: 'paid', label: '待分仓' },
  { key: 'allocated', label: '待生成发货单' },
  { key: 'await_pick', label: '待拣货' },
  { key: 'picking', label: '拣货中' },
  { key: 'await_outbound', label: '待出库' },
  { key: 'shipped', label: '已发货' },
]

export function useFulfillmentWorkbench() {
  const route = useRoute()
  const routeTab = String(route.query.tab || '')
  const activeTab = ref(ALLOWED_TABS.has(routeTab) ? routeTab : 'all')
  const dateScope = ref(route.query.scope === 'today' ? 'today' : '')
  const searchOrderNo = ref('')
  const searchKeyword = ref('')
  const searchShipmentNo = ref('')
  const searchWarehouseName = ref('')
  const loading = ref(false)
  const rows = ref([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const summary = ref({})
  const importResult = ref(null)

  const statCards = computed(() => [
    { key: 'pending_payment', label: '待支付', value: summary.value.pendingPayment ?? 0, tone: 'tone-danger' },
    { key: 'paid', label: '待分仓', value: summary.value.paid ?? 0, tone: 'tone-warning' },
    { key: 'allocated', label: '待生成发货单', value: summary.value.allocated ?? 0, tone: 'tone-info' },
    { key: 'await_pick', label: '待拣货', value: summary.value.awaitPick ?? 0, tone: 'tone-primary' },
    { key: 'picking', label: '拣货中', value: summary.value.picking ?? 0, tone: 'tone-warning' },
    { key: 'await_outbound', label: '待出库', value: summary.value.awaitOutbound ?? 0, tone: 'tone-success' },
    { key: 'shipped', label: '已发货', value: summary.value.shipped ?? 0, tone: 'tone-shipped' },
  ])

  const emptyTitle = computed(() => {
    const map = {
      pending_payment: '暂无待支付订单',
      paid_lifecycle: '暂无已支付订单',
      active: '暂无履约处理中订单',
      paid: '暂无待分仓订单',
      allocated: '暂无待生成发货单的订单',
      await_pick: '暂无待拣货发货单',
      picking: '暂无拣货中发货单',
      await_outbound: '暂无待出库发货单',
      shipped: '暂无已发货订单',
      all: '暂无订单数据',
    }
    return map[activeTab.value] || '暂无数据'
  })

  const emptyDescription = computed(() => {
    if (activeTab.value === 'pending_payment') return '可通过上方「导入 Excel」创建待支付订单。'
    if (activeTab.value === 'all') return '导入订单后，可在此完成支付、分仓、拣货与出库。'
    return '切换到其他状态查看，或点击刷新。'
  })

  function buildQuery() {
    return {
      tab: activeTab.value,
      date_scope: dateScope.value || undefined,
      order_no: searchOrderNo.value || undefined,
      keyword: searchKeyword.value || undefined,
      shipment_no: searchShipmentNo.value || undefined,
      warehouse_name: searchWarehouseName.value || undefined,
      page: page.value,
      page_size: pageSize.value,
    }
  }

  async function loadWorkbench() {
    loading.value = true
    try {
      const res = await workbenchApi.fulfillment(buildQuery())
      if (res?.success) {
        rows.value = res.data || []
        total.value = Number(res.metadata?.total ?? rows.value.length)
        summary.value = res.metadata?.summary || {}

        const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value) || 1)
        if (page.value > maxPage) {
          page.value = maxPage
          return loadWorkbench()
        }
      }
    } finally {
      loading.value = false
    }
  }

  function onTabChange() {
    page.value = 1
    return loadWorkbench()
  }

  function onSearch() {
    page.value = 1
    return loadWorkbench()
  }

  function resetSearch() {
    searchOrderNo.value = ''
    searchKeyword.value = ''
    searchShipmentNo.value = ''
    searchWarehouseName.value = ''
    page.value = 1
    return loadWorkbench()
  }

  function onPageChange(nextPage) {
    page.value = nextPage
    return loadWorkbench()
  }

  function onPageSizeChange(nextSize) {
    pageSize.value = nextSize
    page.value = 1
    return loadWorkbench()
  }

  function clearDateScope() {
    dateScope.value = ''
    page.value = 1
    return loadWorkbench()
  }

  function setTab(key) {
    activeTab.value = key
    page.value = 1
    return loadWorkbench()
  }

  return {
    activeTab,
    dateScope,
    searchOrderNo,
    searchKeyword,
    searchShipmentNo,
    searchWarehouseName,
    loading,
    rows,
    total,
    page,
    pageSize,
    summary,
    importResult,
    statCards,
    emptyTitle,
    emptyDescription,
    loadWorkbench,
    onTabChange,
    onSearch,
    resetSearch,
    onPageChange,
    onPageSizeChange,
    clearDateScope,
    setTab,
  }
}
