import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { warehouseApi } from '../api/warehouse-api.js'
import { shipmentApi } from '../api/shipment-api.js'
import { resolveWarehouseId } from '../common/warehouse-default.js'
import { LEGEND_ITEMS } from './warehouse-3d-meta.js'

export function useWarehouseData() {
  const route = useRoute()
  const warehouseId = ref(String(route.query.warehouse_id || ''))
  const shipmentId = ref(String(route.query.shipment_id || ''))
  const loading = ref(true)
  const detailLoading = ref(false)
  const warehouses = ref([])
  const warehouseName = ref('')
  const locations = ref([])
  const riskMapData = ref({})
  const pickingRoute = ref(null)
  const drawerVisible = ref(false)
  const drawerTitle = ref('库位详情')
  const locationDetail = ref(null)
  const selectedLocation = ref(null)
  const locationSearch = ref('')
  const stockedOnly = ref(false)
  const legendOff = ref(new Set())
  const sidebarTab = ref('locations')
  const activePickSeq = ref(null)
  const drawerPickSku = ref('')

  const pickingMode = computed(() => Boolean(shipmentId.value))
  const pickingTabLabel = computed(() => {
    const n = pickingRoute.value?.points?.length || 0
    return n ? `拣货路线 (${n})` : '拣货路线'
  })

  const riskSummary = computed(() => {
    const summary = { empty: 0, normal: 0, low: 0, full: 0, stocked: 0 }
    Object.values(riskMapData.value || {}).forEach((item) => {
      const level = item?.level || 'empty'
      summary[level] = (summary[level] || 0) + 1
      if ((item?.qty || 0) > 0) summary.stocked += 1
    })
    return summary
  })

  const hasActiveFilter = computed(() => stockedOnly.value || legendOff.value.size > 0)

  const activePickPoint = computed(() => (
    pickingRoute.value?.points?.find((p) => p.seq === activePickSeq.value) || null
  ))

  const summaryCards = computed(() => {
    const cards = [
      { key: 'total', label: '库位总数', value: locations.value.length, tone: '' },
      { key: 'stocked', label: '有货库位', value: riskSummary.value.stocked, tone: 'primary' },
      { key: 'empty', label: '空闲库位', value: riskSummary.value.empty, tone: '' },
      { key: 'low', label: '库存偏低', value: riskSummary.value.low, tone: 'warning', hint: '当前仓库' },
      { key: 'full', label: '满载库位', value: riskSummary.value.full, tone: 'danger', hint: '占用率 ≥ 90%' },
    ]
    if (pickingMode.value) {
      cards.push({
        key: 'pick',
        label: '拣货点数',
        value: pickingRoute.value?.points?.length || 0,
        tone: 'success',
      })
    }
    return cards
  })

  const filteredLocations = computed(() => {
    const q = locationSearch.value.trim().toLowerCase()
    return locations.value.filter((loc) => {
      const level = rowLevel(loc.location_id)
      if (legendOff.value.size && legendOff.value.has(level)) return false
      if (stockedOnly.value && (riskMapData.value[loc.location_id]?.qty || 0) <= 0) return false
      if (q && !String(loc.location_code).toLowerCase().includes(q)) return false
      return true
    })
  })

  function rowLevel(locationId) {
    return riskMapData.value[locationId]?.level || 'empty'
  }

  function rowQty(locationId) {
    return riskMapData.value[locationId]?.qty || 0
  }

  async function loadWarehouses() {
    const res = await warehouseApi.list()
    if (res?.success) {
      warehouses.value = res.data || []
      warehouseId.value = resolveWarehouseId(warehouseId.value, warehouses.value)
    }
  }

  async function loadPickingRoute() {
    if (!shipmentId.value) {
      pickingRoute.value = null
      return null
    }
    const res = await shipmentApi.pickingRoute({ shipment_id: shipmentId.value })
    if (res?.success) {
      pickingRoute.value = res.data
      if (res.data?.warehouseId) warehouseId.value = res.data.warehouseId
      if (res.data?.points?.length) {
        sidebarTab.value = 'picking'
        activePickSeq.value = res.data.points[0].seq
      }
    }
    return res?.success ? res.data : null
  }

  async function loadSceneData() {
    loading.value = true
    try {
      await loadPickingRoute()
      const [layoutRes, riskRes] = await Promise.all([
        warehouseApi.layout({ warehouse_id: warehouseId.value }),
        warehouseApi.riskMap({ warehouse_id: warehouseId.value }),
      ])
      if (layoutRes?.success) {
        locations.value = layoutRes.data.locations || []
        warehouseName.value = layoutRes.data.warehouse?.warehouse_name || ''
      }
      if (riskRes?.success) {
        riskMapData.value = riskRes.data.riskMap || {}
      }
    } finally {
      loading.value = false
    }
  }

  async function openLocationDetail(locationId, code) {
    const risk = riskMapData.value[locationId] || { level: 'empty', qty: 0, capacity: '-' }
    selectedLocation.value = {
      locationId,
      code: code || locationId,
      level: risk.level,
      qty: risk.qty,
      capacity: risk.capacity,
    }
    drawerTitle.value = `库位 ${code || locationId}`
    drawerVisible.value = true
    detailLoading.value = true
    locationDetail.value = null
    try {
      const res = await warehouseApi.location({ location_id: locationId })
      if (res?.success) locationDetail.value = res.data
    } finally {
      detailLoading.value = false
    }
  }

  function setLegendLevel(level, on) {
    const next = new Set(legendOff.value)
    if (on) next.delete(level)
    else next.add(level)
    legendOff.value = next
  }

  function toggleLegend(level) {
    setLegendLevel(level, legendOff.value.has(level))
  }

  function clearLegendFilter() {
    legendOff.value = new Set()
  }

  function resetFilters() {
    stockedOnly.value = false
    clearLegendFilter()
  }

  async function onWarehouseChange() {
    shipmentId.value = ''
    pickingRoute.value = null
    sidebarTab.value = 'locations'
  }

  function skuRowClass({ row }) {
    if (drawerPickSku.value && row.sku_code === drawerPickSku.value) return 'sku-pick-row'
    return ''
  }

  return {
    warehouseId,
    shipmentId,
    loading,
    detailLoading,
    warehouses,
    warehouseName,
    locations,
    riskMapData,
    pickingRoute,
    drawerVisible,
    drawerTitle,
    locationDetail,
    selectedLocation,
    locationSearch,
    stockedOnly,
    legendOff,
    sidebarTab,
    activePickSeq,
    drawerPickSku,
    pickingMode,
    pickingTabLabel,
    riskSummary,
    hasActiveFilter,
    activePickPoint,
    summaryCards,
    filteredLocations,
    legendItems: LEGEND_ITEMS,
    rowLevel,
    rowQty,
    loadWarehouses,
    loadPickingRoute,
    loadSceneData,
    openLocationDetail,
    onWarehouseChange,
    skuRowClass,
  }
}
