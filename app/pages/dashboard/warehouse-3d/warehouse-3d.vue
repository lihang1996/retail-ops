<template>
  <div class="warehouse-3d-page">
    <div class="toolbar">
      <div class="title-wrap">
        <h2>3D 仓库</h2>
        <span v-if="warehouseName" class="sub">{{ warehouseName }}</span>
        <el-tag v-if="shipmentId" type="primary" size="small">拣货路径</el-tag>
      </div>
      <el-select v-model="warehouseId" placeholder="选择仓库" style="width: 220px" @change="reload">
        <el-option v-for="w in warehouses" :key="w.warehouse_id" :label="w.warehouse_name" :value="w.warehouse_id" />
      </el-select>
    </div>

    <div v-if="!webglSupported || mobileView" class="fallback-panel">
      <el-alert title="当前环境已降级为 2D 库位列表" type="warning" :closable="false" show-icon />
      <el-table v-loading="loading" :data="locations" size="small" stripe style="margin-top: 12px" @row-click="onRowClick">
        <el-table-column prop="location_code" label="库位" width="120" />
        <el-table-column label="风险" width="100">
          <template #default="{ row }">
            <el-tag :type="riskTagType(row.location_id)" size="small">{{ riskLabel(row.location_id) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="容量" width="80" />
      </el-table>
    </div>

    <div v-else class="scene-wrap">
      <div v-if="loading" class="scene-loading">
        <el-skeleton :rows="6" animated />
      </div>
      <div ref="canvasHost" class="canvas-host" />
      <div class="legend">
        <div v-for="item in legendItems" :key="item.level" class="legend-item">
          <span class="dot" :style="{ background: item.color }" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>

    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="360px">
      <div v-loading="detailLoading">
        <template v-if="locationDetail">
          <p>风险：{{ riskText(locationDetail.risk?.level) }}</p>
          <p>库存量：{{ locationDetail.risk?.totalQty || 0 }} / {{ locationDetail.risk?.capacity || '-' }}</p>
          <el-divider />
          <h4>SKU 明细</h4>
          <el-empty v-if="!locationDetail.skus?.length" description="无库存" />
          <el-table v-else :data="locationDetail.skus" size="small">
            <el-table-column prop="sku_code" label="SKU" />
            <el-table-column prop="qty" label="数量" width="80" />
          </el-table>
          <el-divider />
          <h4>最近流水</h4>
          <el-empty v-if="!locationDetail.recentLogs?.length" description="无流水" />
          <ul v-else class="log-list">
            <li v-for="(log, i) in locationDetail.recentLogs" :key="i">
              {{ log.action_type }} {{ log.qty_change }} · {{ log.sku_code }} · {{ log.created_at }}
            </li>
          </ul>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import $curl from '$elpisCommon/curl.js'
import { createScene } from './three/create-scene.js'
import { createCamera } from './three/create-camera.js'
import { createControls } from './three/create-controls.js'
import { buildWarehouse, buildPickingRoute } from './three/warehouse-builder.js'
import { disposeSceneResources, supportsWebGL } from './three/dispose-scene.js'

const params = new URLSearchParams(window.location.search)
const warehouseId = ref(params.get('warehouse_id') || 'wh_main')
const shipmentId = ref(params.get('shipment_id') || '')

const loading = ref(true)
const detailLoading = ref(false)
const warehouses = ref([])
const warehouseName = ref('')
const locations = ref([])
const riskMapData = ref({})
const canvasHost = ref(null)
const drawerVisible = ref(false)
const drawerTitle = ref('库位详情')
const locationDetail = ref(null)

const webglSupported = supportsWebGL()
const mobileView = ref(window.innerWidth < 768)

const legendItems = [
  { level: 'empty', label: '空闲', color: '#9ca3af' },
  { level: 'normal', label: '正常', color: '#22c55e' },
  { level: 'low', label: '偏低', color: '#f59e0b' },
  { level: 'full', label: '满载', color: '#ef4444' },
]

let renderer
let scene
let camera
let controls
let animationId
let sharedGeometry
let raycaster
let pointer
let resizeObserver

function riskLabel(locationId) {
  const level = riskMapData.value[locationId]?.level || 'empty'
  return { empty: '空闲', normal: '正常', low: '偏低', full: '满载' }[level]
}

function riskTagType(locationId) {
  const level = riskMapData.value[locationId]?.level || 'empty'
  return { empty: 'info', normal: 'success', low: 'warning', full: 'danger' }[level]
}

function riskText(level) {
  return { empty: '空闲', normal: '正常', low: '偏低', full: '满载' }[level] || level
}

async function loadWarehouses() {
  const res = await $curl({ method: 'get', url: '/api/proj/warehouse/list' })
  if (res?.success) warehouses.value = res.data || []
}

async function loadSceneData() {
  loading.value = true
  try {
    const [layoutRes, riskRes] = await Promise.all([
      $curl({ method: 'get', url: '/api/proj/warehouse/layout', query: { warehouse_id: warehouseId.value } }),
      $curl({ method: 'get', url: '/api/proj/warehouse/risk_map', query: { warehouse_id: warehouseId.value } }),
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

async function loadPickingRoute() {
  if (!shipmentId.value) return null
  const res = await $curl({
    method: 'get',
    url: '/api/proj/shipment/picking_route',
    query: { shipment_id: shipmentId.value },
  })
  return res?.success ? res.data : null
}

async function openLocationDetail(locationId, code) {
  drawerTitle.value = `库位 ${code || locationId}`
  drawerVisible.value = true
  detailLoading.value = true
  locationDetail.value = null
  try {
    const res = await $curl({
      method: 'get',
      url: '/api/proj/warehouse/location',
      query: { location_id: locationId },
    })
    if (res?.success) locationDetail.value = res.data
  } finally {
    detailLoading.value = false
  }
}

function onRowClick(row) {
  openLocationDetail(row.location_id, row.location_code)
}

function initThree() {
  if (!canvasHost.value || !webglSupported || mobileView.value) return

  const width = canvasHost.value.clientWidth
  const height = canvasHost.value.clientHeight || 560

  scene = createScene()
  camera = createCamera(width, height)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  canvasHost.value.appendChild(renderer.domElement)

  controls = createControls(camera, renderer.domElement)
  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()

  const { group, sharedGeometry: geom } = buildWarehouse({
    locations: locations.value,
    riskMap: riskMapData.value,
  })
  sharedGeometry = geom
  scene.add(group)

  loadPickingRoute().then((route) => {
    if (route?.points?.length) {
      const routeGroup = buildPickingRoute(route.points)
      if (routeGroup) scene.add(routeGroup)
    }
  })

  const onClick = (event) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(group.children, true)
    const mesh = hits.find((h) => h.object.userData?.locationId)?.object
    if (mesh) {
      openLocationDetail(mesh.userData.locationId, mesh.userData.locationCode)
    }
  }
  renderer.domElement.addEventListener('click', onClick)

  const animate = () => {
    animationId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  resizeObserver = new ResizeObserver(() => {
    if (!canvasHost.value || !renderer) return
    const w = canvasHost.value.clientWidth
    const h = canvasHost.value.clientHeight || 560
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  resizeObserver.observe(canvasHost.value)

  renderer.domElement._onClick = onClick
}

function teardownThree() {
  if (renderer?.domElement?._onClick) {
    renderer.domElement.removeEventListener('click', renderer.domElement._onClick)
  }
  if (animationId) cancelAnimationFrame(animationId)
  resizeObserver?.disconnect()
  disposeSceneResources({ renderer, controls, scene, sharedGeometry })
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
  renderer = null
  scene = null
  camera = null
  controls = null
}

async function reload() {
  teardownThree()
  await loadSceneData()
  initThree()
}

onMounted(async () => {
  await loadWarehouses()
  await loadSceneData()
  initThree()
})

onBeforeUnmount(() => {
  teardownThree()
})
</script>

<style lang="less" scoped>
.warehouse-3d-page {
  padding: 16px;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  h2 { margin: 0; font-size: 18px; }
  .sub { color: #6b7280; font-size: 13px; }
}
.scene-wrap {
  position: relative;
  flex: 1;
  min-height: 520px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
.canvas-host {
  width: 100%;
  height: 100%;
  min-height: 520px;
}
.scene-loading {
  position: absolute;
  inset: 0;
  padding: 24px;
  background: rgba(255, 255, 255, 0.85);
  z-index: 2;
}
.legend {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.fallback-panel {
  flex: 1;
}
.log-list {
  padding-left: 18px;
  font-size: 12px;
  color: #4b5563;
}
</style>
