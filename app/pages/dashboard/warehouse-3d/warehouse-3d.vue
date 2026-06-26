<template>
  <div class="warehouse-3d-page biz-page-fluid">
    <header class="page-header">
      <div class="header-main">
        <p class="eyebrow">仓储可视化</p>
        <h1>3D 库位态势</h1>
        <p class="lead">
          一眼看清库位占用与风险分布；从履约中心带入发货单后，可沿推荐路径完成拣货导航。
        </p>
      </div>
      <div class="header-actions">
        <el-button plain @click="scene.focusStockedView()">聚焦有货区</el-button>
        <el-button plain @click="scene.resetCamera()">重置视角</el-button>
        <el-select v-model="warehouseId" placeholder="选择仓库" style="width: 200px" @change="handleWarehouseChange">
          <el-option
            v-for="w in warehouses"
            :key="w.warehouse_id"
            :label="w.warehouse_name"
            :value="w.warehouse_id"
          />
        </el-select>
      </div>
    </header>

    <PickingBanner
      :picking-mode="pickingMode"
      :shipment-no="pickingRoute && pickingRoute.shipmentNo ? pickingRoute.shipmentNo : shipmentId"
      :point-count="pickingRoute && pickingRoute.points ? pickingRoute.points.length : 0"
      @go-fulfillment="goFulfillment"
    />

    <el-row :gutter="10" class="summary-row">
      <el-col v-for="item in summaryCards" :key="item.key" :xs="12" :sm="8" :md="4" :lg="4">
        <KpiCard :label="item.label" :value="item.value" :hint="item.hint" :tone="item.tone" compact />
      </el-col>
    </el-row>

    <div class="workspace">
      <section class="scene-column">
        <WarehouseFallbackTable
          v-if="!webglSupported || mobileView"
          :loading="loading"
          :locations="filteredLocations"
          v-model:location-search="locationSearch"
          v-model:stocked-only="stockedOnly"
          :row-level="rowLevel"
          :row-qty="rowQty"
          @stocked-only-change="scene.onStockedOnlyChange()"
          @row-click="scene.onRowClick"
        />

        <div v-else class="scene-wrap">
          <div v-if="loading" class="scene-loading"><el-skeleton :rows="8" animated /></div>
          <div ref="canvasHost" class="canvas-host" />
          <PickingHud
            :point="activePickPoint"
            :total-steps="pickingRoute && pickingRoute.points ? pickingRoute.points.length : 0"
          />
          <div class="scene-toolbar">
            <el-checkbox v-model="stockedOnly" size="small" @change="scene.onStockedOnlyChange()">仅看有货</el-checkbox>
            <el-link v-if="hasActiveFilter" type="primary" :underline="false" class="toolbar-reset" @click="scene.resetFilters()">清除筛选</el-link>
          </div>
          <WarehouseLegend
            :items="legendItems"
            :off-levels="legendOff"
            @toggle="scene.toggleLegend"
          />
          <WarehouseSelectedCard :location="selectedLocation" />
        </div>
      </section>

      <WarehouseSidebar
        v-model:sidebar-tab="sidebarTab"
        v-model:location-search="locationSearch"
        :legend-items="legendItems"
        :legend-off="legendOff"
        :filtered-locations="filteredLocations"
        :selected-location="selectedLocation"
        :picking-tab-label="pickingTabLabel"
        :picking-mode="pickingMode"
        :picking-route="pickingRoute"
        :active-pick-seq="activePickSeq"
        :row-level="rowLevel"
        :row-qty="rowQty"
        @legend-level="scene.setLegendLevel"
        @focus="scene.focusLocation"
        @picking-step="scene.goToPickingStep"
        @go-fulfillment="goFulfillment"
      />
    </div>

    <LocationDetailDrawer
      v-model:visible="drawerVisible"
      :title="drawerTitle"
      :loading="detailLoading"
      :location-detail="locationDetail"
      :active-pick-point="activePickPoint"
      :drawer-pick-sku="drawerPickSku"
      :sku-row-class="skuRowClass"
    />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { supportsWebGL } from './three/dispose-scene.js'
import { useDashboardNav } from '../common/use-dashboard-nav.js'
import KpiCard from '../common/kpi-card.vue'
import PickingBanner from './PickingBanner.vue'
import PickingHud from './PickingHud.vue'
import WarehouseLegend from './WarehouseLegend.vue'
import WarehouseFallbackTable from './WarehouseFallbackTable.vue'
import WarehouseSelectedCard from './WarehouseSelectedCard.vue'
import WarehouseSidebar from './WarehouseSidebar.vue'
import LocationDetailDrawer from './LocationDetailDrawer.vue'
import { useWarehouseData } from './use-warehouse-data.js'
import { useWarehouseScene } from './use-warehouse-scene.js'

const canvasHost = ref(null)
const webglSupported = supportsWebGL()
const mobileView = ref(window.innerWidth < 768)
const { go, fulfillmentPath } = useDashboardNav()

const data = useWarehouseData()
const scene = useWarehouseScene(data, canvasHost)

const {
  warehouseId,
  shipmentId,
  loading,
  detailLoading,
  warehouses,
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
  hasActiveFilter,
  activePickPoint,
  summaryCards,
  filteredLocations,
  legendItems,
  rowLevel,
  rowQty,
  loadWarehouses,
  loadSceneData,
  onWarehouseChange,
  skuRowClass,
} = data

function goFulfillment() {
  go(fulfillmentPath('all'))
}

async function handleWarehouseChange() {
  await onWarehouseChange()
  await scene.reload(loadSceneData, { webglSupported, mobileView: mobileView.value })
}

onMounted(async () => {
  await loadWarehouses()
  await loadSceneData()
  scene.initThree({ webglSupported, mobileView: mobileView.value })
  if (activePickPoint.value) {
    scene.highlightActivePick()
    scene.syncSceneFilters()
    scene.goToPickingStep(activePickPoint.value)
  }
})

onBeforeUnmount(() => {
  scene.dispose()
})
</script>

<style lang="less" scoped>
@import './warehouse-3d-page.less';
</style>
