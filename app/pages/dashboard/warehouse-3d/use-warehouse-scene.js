import { nextTick, watch } from 'vue'
import * as THREE from 'three'
import { ElMessage } from 'element-plus'
import { createScene } from './three/create-scene.js'
import { createCamera } from './three/create-camera.js'
import { createControls } from './three/create-controls.js'
import {
  buildWarehouse,
  buildPickingRoute,
  applySceneFilters,
  computeStockedBounds,
  focusCameraOnBounds,
  highlightPickingMarker,
} from './three/warehouse-builder.js'
import { disposeSceneResources } from './three/dispose-scene.js'
import { LEGEND_ITEMS } from './warehouse-3d-meta.js'

/**
 * Three.js 场景生命周期、筛选同步、拣货导航
 */
export function useWarehouseScene(data, canvasHost) {
  let renderer
  let scene
  let camera
  let controls
  let animationId
  let raycaster
  let pointer
  let resizeObserver
  let warehouseGroup
  let pickingRouteGroup
  let meshByLocationId
  let warehouseBounds
  let stockedBounds
  let selectedMesh
  let cameraAnimId = null
  let pulseAnimId = null

  function cancelCameraAnim() {
    if (cameraAnimId) cancelAnimationFrame(cameraAnimId)
    cameraAnimId = null
  }

  function animateCameraTo(x, z) {
    if (!camera || !controls) return
    cancelCameraAnim()
    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()
    const endPos = new THREE.Vector3(x + 5.5, 9.5, z + 7.5)
    const endTarget = new THREE.Vector3(x, 0.8, z)
    const start = performance.now()
    const duration = 520

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - (1 - t) ** 3
      camera.position.lerpVectors(startPos, endPos, ease)
      controls.target.lerpVectors(startTarget, endTarget, ease)
      controls.update()
      if (t < 1) cameraAnimId = requestAnimationFrame(tick)
      else cameraAnimId = null
    }
    cameraAnimId = requestAnimationFrame(tick)
  }

  function pulseMesh(mesh) {
    if (!mesh) return
    if (pulseAnimId) cancelAnimationFrame(pulseAnimId)
    const base = 1.1
    const start = performance.now()
    const tick = (now) => {
      const t = (now - start) / 600
      if (t >= 1) {
        mesh.scale.set(base, base, base)
        pulseAnimId = null
        return
      }
      const s = base + Math.sin(t * Math.PI) * 0.18
      mesh.scale.set(s, s, s)
      pulseAnimId = requestAnimationFrame(tick)
    }
    pulseAnimId = requestAnimationFrame(tick)
  }

  function setSelectedMesh(mesh) {
    if (selectedMesh && selectedMesh.material) {
      selectedMesh.scale.set(1, 1, 1)
      const level = selectedMesh.userData?.riskLevel
      selectedMesh.material.emissiveIntensity = level === 'full' ? 0.14 : 0.05
    }
    selectedMesh = mesh
    if (selectedMesh?.material) {
      selectedMesh.scale.set(1.1, 1.1, 1.1)
      selectedMesh.material.emissiveIntensity = 0.38
    }
  }

  function syncSceneFilters() {
    if (!meshByLocationId) return
    const activeLevels = data.legendOff.value.size
      ? new Set(LEGEND_ITEMS.map((i) => i.level).filter((l) => !data.legendOff.value.has(l)))
      : null
    const routeIds = data.pickingRoute.value?.points?.map((p) => p.location_id) || []
    const activeId = data.pickingRoute.value?.points?.find((p) => p.seq === data.activePickSeq.value)?.location_id
    applySceneFilters(meshByLocationId, {
      activeLevels,
      stockedOnly: data.stockedOnly.value,
      routeLocationIds: routeIds,
      activeLocationId: activeId,
    })
  }

  function setLegendLevel(level, on) {
    const next = new Set(data.legendOff.value)
    if (on) next.delete(level)
    else next.add(level)
    data.legendOff.value = next
    syncSceneFilters()
  }

  function toggleLegend(level) {
    setLegendLevel(level, data.legendOff.value.has(level))
  }

  function clearLegendFilter() {
    data.legendOff.value = new Set()
    syncSceneFilters()
  }

  function resetFilters() {
    data.stockedOnly.value = false
    clearLegendFilter()
  }

  function onStockedOnlyChange() {
    syncSceneFilters()
  }

  function focusStockedView() {
    if (!camera || !controls) return
    const bounds = stockedBounds || warehouseBounds
    if (bounds) focusCameraOnBounds(camera, controls, bounds)
  }

  function focusLocation(locationId, code, { animate = true, pickSku = '' } = {}) {
    const mesh = meshByLocationId?.get(locationId)
    if (mesh) {
      setSelectedMesh(mesh)
      pulseMesh(mesh)
      const x = mesh.position.x
      const z = mesh.position.z
      if (camera && controls) {
        if (animate) animateCameraTo(x, z)
        else {
          camera.position.set(x + 5.5, 9.5, z + 7.5)
          controls.target.set(x, 0.8, z)
          controls.update()
        }
      }
    }
    data.drawerPickSku.value = pickSku || ''
    data.openLocationDetail(locationId, code)
  }

  function onRowClick(row) {
    focusLocation(row.location_id, row.location_code)
  }

  function goToPickingStep(point) {
    if (!point) return
    data.activePickSeq.value = point.seq
    highlightPickingMarker(pickingRouteGroup, point.seq)
    syncSceneFilters()
    focusLocation(point.location_id, point.location_code, {
      animate: true,
      pickSku: point.sku_code,
    })
    ElMessage({
      type: 'success',
      message: `第 ${point.seq} 步：${point.location_code} · 拣 ${point.sku_code} × ${point.qty}`,
      duration: 2200,
      offset: 72,
    })
    nextTick(() => {
      document.querySelector('.pick-step.active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }

  function rebuildPickingRouteInScene(route) {
    if (pickingRouteGroup && scene) {
      scene.remove(pickingRouteGroup)
      pickingRouteGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
      pickingRouteGroup = null
    }
    if (route?.points?.length && scene) {
      pickingRouteGroup = buildPickingRoute(route.points)
      if (pickingRouteGroup) scene.add(pickingRouteGroup)
      if (data.activePickSeq.value) highlightPickingMarker(pickingRouteGroup, data.activePickSeq.value)
    }
    syncSceneFilters()
  }

  function initThree({ webglSupported, mobileView }) {
    if (!canvasHost.value || !webglSupported || mobileView) return

    const width = canvasHost.value.clientWidth
    const height = canvasHost.value.clientHeight || 520

    scene = createScene()
    camera = createCamera(width, height)
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0xeef4fb, 1)
    canvasHost.value.appendChild(renderer.domElement)

    controls = createControls(camera, renderer.domElement)
    raycaster = new THREE.Raycaster()
    pointer = new THREE.Vector2()

    const built = buildWarehouse({
      locations: data.locations.value,
      riskMap: data.riskMapData.value,
    })
    warehouseGroup = built.group
    meshByLocationId = built.meshByLocationId
    warehouseBounds = built.bounds
    stockedBounds = computeStockedBounds(data.locations.value, data.riskMapData.value) || warehouseBounds
    scene.add(warehouseGroup)
    focusStockedView()
    rebuildPickingRouteInScene(data.pickingRoute.value)

    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(warehouseGroup.children, true)
      const mesh = hits.find((h) => h.object.userData?.locationId && !h.object.userData?.skipPick)?.object
      if (mesh) {
        setSelectedMesh(mesh)
        data.openLocationDetail(mesh.userData.locationId, mesh.userData.locationCode)
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
      const h = canvasHost.value.clientHeight || 520
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
    disposeSceneResources({ renderer, controls, scene })
    if (renderer?.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    renderer = null
    scene = null
    camera = null
    controls = null
    warehouseGroup = null
    pickingRouteGroup = null
    meshByLocationId = null
    warehouseBounds = null
    selectedMesh = null
  }

  async function reload(loadSceneData, { webglSupported, mobileView }) {
    teardownThree()
    await loadSceneData()
    stockedBounds = computeStockedBounds(data.locations.value, data.riskMapData.value)
    initThree({ webglSupported, mobileView })
  }

  function dispose() {
    cancelCameraAnim()
    if (pulseAnimId) cancelAnimationFrame(pulseAnimId)
    teardownThree()
  }

  watch(data.pickingRoute, (route) => {
    if (scene) rebuildPickingRouteInScene(route)
  })

  return {
    focusLocation,
    focusStockedView,
    resetCamera: focusStockedView,
    onRowClick,
    goToPickingStep,
    toggleLegend,
    setLegendLevel,
    resetFilters,
    onStockedOnlyChange,
    initThree,
    teardownThree,
    reload,
    dispose,
    syncSceneFilters,
    highlightActivePick: () => {
      if (data.activePickSeq.value) highlightPickingMarker(pickingRouteGroup, data.activePickSeq.value)
    },
  }
}
