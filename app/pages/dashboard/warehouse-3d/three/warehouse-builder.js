import * as THREE from 'three'

const RISK_COLORS = {
  empty: 0x94a3b8,
  normal: 0x22c55e,
  low: 0xf59e0b,
  full: 0xef4444,
}

const UNIT = 1.85
const SLOT_W = 1.18
const SLOT_D = 1.06
const SLOT_H = 0.52
const BASE_Y = 0.18

const riskLabelMap = {
  empty: '空闲',
  normal: '正常',
  low: '偏低',
  full: '满载',
}

function createTextSprite(text, {
  color = '#334155',
  background = 'rgba(255,255,255,0.86)',
  fontSize = 44,
  width = 256,
  height = 88,
} = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = background
  roundRect(ctx, 8, 8, width - 16, height - 16, 18)
  ctx.fill()
  ctx.fillStyle = color
  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width / 150, height / 150, 1)
  return sprite
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.08,
    ...options,
  })
}

function addBox(group, {
  name,
  size,
  position,
  color,
  opacity = 1,
  userData = {},
  withEdges = true,
}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material(color, { transparent: opacity < 1, opacity })
  )
  mesh.name = name
  mesh.position.set(position[0], position[1], position[2])
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData = { ...userData, relatedMeshes: [] }
  group.add(mesh)

  if (withEdges) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })
    )
    edges.position.copy(mesh.position)
    edges.userData = { skipPick: true }
    group.add(edges)
    mesh.userData.relatedMeshes.push(edges)
  }
  return mesh
}

function setMeshVisible(mesh, visible) {
  if (!mesh) return
  mesh.visible = visible
  for (const child of mesh.userData?.relatedMeshes || []) {
    child.visible = visible
  }
}

function addWarehouseShell(group, { minX, maxX, minZ, maxZ, centerX, centerZ, width, depth }) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 9, depth + 9),
    material(0xf1f5f9, { roughness: 0.86 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(centerX, 0, centerZ)
  floor.receiveShadow = true
  floor.userData = { skipPick: true }
  group.add(floor)

  const grid = new THREE.GridHelper(Math.max(width, depth) + 9, 28, 0xcbd5e1, 0xe8edf3)
  grid.position.set(centerX, 0.012, centerZ)
  grid.userData = { skipPick: true }
  group.add(grid)

  const aisleMaterial = material(0xffffff, { roughness: 0.75 })
  for (let z = Math.floor(minZ / 4) * 4; z <= maxZ + 2; z += 4) {
    const aisle = new THREE.Mesh(new THREE.PlaneGeometry(width + 5, 0.52), aisleMaterial)
    aisle.rotation.x = -Math.PI / 2
    aisle.position.set(centerX, 0.018, z * UNIT)
    aisle.receiveShadow = true
    aisle.userData = { skipPick: true }
    group.add(aisle)
  }

  addBox(group, {
    name: 'inbound-dock',
    size: [4.2, 0.08, 2.1],
    position: [minX * UNIT - 2.1, 0.045, minZ * UNIT - 2.2],
    color: 0xdbeafe,
    opacity: 0.92,
    userData: { skipPick: true },
    withEdges: false,
  })
  addBox(group, {
    name: 'outbound-dock',
    size: [4.2, 0.08, 2.1],
    position: [maxX * UNIT + 2.1, 0.045, minZ * UNIT - 2.2],
    color: 0xdcfce7,
    opacity: 0.92,
    userData: { skipPick: true },
    withEdges: false,
  })

  const inboundLabel = createTextSprite('入库月台', { color: '#1d4ed8', fontSize: 36 })
  inboundLabel.position.set(minX * UNIT - 2.1, 0.55, minZ * UNIT - 2.2)
  inboundLabel.userData = { skipPick: true }
  group.add(inboundLabel)
  const outboundLabel = createTextSprite('出库月台', { color: '#15803d', fontSize: 36 })
  outboundLabel.position.set(maxX * UNIT + 2.1, 0.55, minZ * UNIT - 2.2)
  outboundLabel.userData = { skipPick: true }
  group.add(outboundLabel)
}

function createRackFrame(group, x, z, height, locationId) {
  const rackColor = 0x64748b
  const postSize = 0.08
  const postHeight = height + 0.35
  const related = []
  const positions = [
    [-SLOT_W / 2 - 0.08, -SLOT_D / 2 - 0.08],
    [SLOT_W / 2 + 0.08, -SLOT_D / 2 - 0.08],
    [-SLOT_W / 2 - 0.08, SLOT_D / 2 + 0.08],
    [SLOT_W / 2 + 0.08, SLOT_D / 2 + 0.08],
  ]
  positions.forEach(([dx, dz]) => {
    const post = addBox(group, {
      name: 'rack-post',
      size: [postSize, postHeight, postSize],
      position: [x + dx, postHeight / 2, z + dz],
      color: rackColor,
      opacity: 0.65,
      userData: { skipPick: true, locationId, rackPart: true },
      withEdges: false,
    })
    related.push(post)
  })
  const beam = addBox(group, {
    name: 'rack-beam',
    size: [SLOT_W + 0.34, 0.08, SLOT_D + 0.26],
    position: [x, height + 0.36, z],
    color: rackColor,
    opacity: 0.24,
    userData: { skipPick: true, locationId, rackPart: true },
    withEdges: false,
  })
  related.push(beam)
  return related
}

function addEmptySlot(group, x, z, loc, level) {
  const h = 0.06
  const mesh = addBox(group, {
    name: `slot-empty-${loc.location_code}`,
    size: [SLOT_W * 0.92, h, SLOT_D * 0.92],
    position: [x, BASE_Y + h / 2, z],
    color: RISK_COLORS.empty,
    opacity: 0.22,
    userData: {
      locationId: loc.location_id,
      locationCode: loc.location_code,
      riskLevel: level,
      riskLabel: riskLabelMap[level],
      qty: 0,
      isEmptySlot: true,
    },
    withEdges: true,
  })
  mesh.material.emissive = new THREE.Color(RISK_COLORS.empty)
  mesh.material.emissiveIntensity = 0.01
  return mesh
}

function addStockedSlot(group, x, z, loc, risk, level, ratio) {
  const qty = Number(risk.qty || 0)
  const capacity = Number(risk.capacity || loc.capacity || 100)
  const h = SLOT_H + ratio * 1.45
  const rackParts = createRackFrame(group, x, z, Math.max(h, 1.05), loc.location_id)
  const mesh = addBox(group, {
    name: `slot-${loc.location_code}`,
    size: [SLOT_W, h, SLOT_D],
    position: [x, BASE_Y + h / 2, z],
    color: RISK_COLORS[level] || RISK_COLORS.normal,
    opacity: 0.94,
    userData: {
      locationId: loc.location_id,
      locationCode: loc.location_code,
      riskLevel: level,
      riskLabel: riskLabelMap[level] || level,
      qty,
      capacity,
      ratio,
      isEmptySlot: false,
    },
  })
  mesh.material.emissive = new THREE.Color(RISK_COLORS[level] || RISK_COLORS.normal)
  mesh.material.emissiveIntensity = level === 'full' ? 0.14 : level === 'low' ? 0.08 : 0.05
  mesh.userData.relatedMeshes.push(...rackParts)
  return mesh
}

export function buildWarehouse({ locations = [], riskMap = {} }) {
  const group = new THREE.Group()
  const meshByLocationId = new Map()

  const xs = locations.map((loc) => Number(loc.pos_x) || 0)
  const zs = locations.map((loc) => Number(loc.pos_z) || 0)
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 10)
  const minZ = Math.min(...zs, 0)
  const maxZ = Math.max(...zs, 8)
  const width = Math.max(18, (maxX - minX + 1) * UNIT)
  const depth = Math.max(14, (maxZ - minZ + 1) * UNIT)
  const centerX = ((minX + maxX) / 2) * UNIT
  const centerZ = ((minZ + maxZ) / 2) * UNIT

  addWarehouseShell(group, { minX, maxX, minZ, maxZ, centerX, centerZ, width, depth })

  const zoneMap = new Map()
  for (const loc of locations) {
    const risk = riskMap[loc.location_id] || { level: 'empty', qty: 0, capacity: loc.capacity || 100 }
    const level = risk.level || 'empty'
    const qty = Number(risk.qty || 0)
    const capacity = Number(risk.capacity || loc.capacity || 100)
    const ratio = capacity > 0 ? Math.min(1, qty / capacity) : 0
    const x = (Number(loc.pos_x) || 0) * UNIT
    const z = (Number(loc.pos_z) || 0) * UNIT

    const mesh = qty > 0
      ? addStockedSlot(group, x, z, loc, risk, level, ratio)
      : addEmptySlot(group, x, z, loc, level)
    meshByLocationId.set(loc.location_id, mesh)

    if (!zoneMap.has(loc.zone_id || 'default')) {
      zoneMap.set(loc.zone_id || 'default', { minX: x, maxX: x, minZ: z, maxZ: z })
    } else {
      const zone = zoneMap.get(loc.zone_id || 'default')
      zone.minX = Math.min(zone.minX, x)
      zone.maxX = Math.max(zone.maxX, x)
      zone.minZ = Math.min(zone.minZ, z)
      zone.maxZ = Math.max(zone.maxZ, z)
    }
  }

  zoneMap.forEach((zone, zoneKey) => {
    const label = createTextSprite(String(zoneKey).replace(/^zone_/, '').toUpperCase(), {
      color: '#0f172a',
      background: 'rgba(255,255,255,0.76)',
      fontSize: 34,
    })
    label.position.set(zone.minX - 0.7, 0.5, zone.minZ - 1.2)
    label.userData = { skipPick: true }
    group.add(label)
  })

  return {
    group,
    meshByLocationId,
    bounds: { centerX, centerZ, width, depth, minX, maxX, minZ, maxZ },
  }
}

export function buildPickingRoute(points = []) {
  if (!points.length) return null

  const vectors = points.map(
    (p) => new THREE.Vector3(
      (Number(p.pos_x) || 0) * UNIT,
      2.35,
      (Number(p.pos_z) || 0) * UNIT
    )
  )

  const curve = new THREE.CatmullRomCurve3(vectors)
  const geometry = new THREE.TubeGeometry(curve, Math.max(points.length * 14, 28), 0.06, 10, false)
  const tube = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x2563eb,
      emissiveIntensity: 0.32,
      roughness: 0.4,
    })
  )
  tube.userData = { skipPick: true }

  const markers = new THREE.Group()
  const markerBySeq = new Map()
  const posCount = new Map()

  points.forEach((p, i) => {
    const isStart = i === 0
    const isEnd = i === points.length - 1
    const color = isStart ? 0x16a34a : isEnd ? 0xdc2626 : 0x2563eb
    const x = (Number(p.pos_x) || 0) * UNIT
    const z = (Number(p.pos_z) || 0) * UNIT
    const posKey = `${x},${z}`
    const dup = posCount.get(posKey) || 0
    posCount.set(posKey, dup + 1)
    const ox = x + dup * 0.35
    const oz = z + dup * 0.25

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 18, 18),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.22,
      })
    )
    sphere.position.set(ox, 2.35, oz)
    sphere.userData = {
      seq: p.seq,
      locationId: p.location_id,
      locationCode: p.location_code,
      skipPick: true,
      isRouteMarker: true,
    }
    markers.add(sphere)
    markerBySeq.set(p.seq, sphere)

    const label = createTextSprite(String(p.seq), {
      color: '#ffffff',
      background: isStart ? 'rgba(22,163,74,0.92)' : 'rgba(37,99,235,0.92)',
      fontSize: 40,
      width: 72,
      height: 72,
    })
    label.position.set(ox, 2.85, oz)
    label.userData = { seq: p.seq, skipPick: true, isRouteMarker: true }
    markers.add(label)
  })

  const routeGroup = new THREE.Group()
  routeGroup.name = 'picking-route'
  routeGroup.add(tube, markers)
  routeGroup.userData = { markerBySeq }
  return routeGroup
}

/** 高亮当前拣货步骤的 3D 路径标记 */
export function highlightPickingMarker(routeGroup, activeSeq) {
  if (!routeGroup) return
  routeGroup.traverse((obj) => {
    if (!obj.userData?.isRouteMarker) return
    const isSphere = obj.geometry?.type === 'SphereGeometry'
    const isActive = obj.userData.seq === activeSeq
    if (isSphere) {
      obj.scale.setScalar(isActive ? 1.5 : 1)
      if (obj.material) obj.material.emissiveIntensity = isActive ? 0.55 : 0.22
    }
    if (obj.isSprite) {
      obj.material.opacity = isActive ? 1 : 0.72
      const s = isActive ? 1.15 : 1
      obj.scale.set((72 / 150) * s, (72 / 150) * s, 1)
    }
  })
}

/** 综合筛选：图例 + 仅看有货 + 拣货高亮 */
export function applySceneFilters(meshByLocationId, {
  activeLevels = null,
  stockedOnly = false,
  routeLocationIds = [],
  activeLocationId = null,
} = {}) {
  if (!meshByLocationId) return
  const routeSet = new Set(routeLocationIds)
  const showAllLevels = !activeLevels || activeLevels.size === 0

  meshByLocationId.forEach((mesh, locationId) => {
    const level = mesh.userData?.riskLevel || 'empty'
    const hasStock = Number(mesh.userData?.qty || 0) > 0
    let visible = true
    if (!showAllLevels && !activeLevels.has(level)) visible = false
    if (stockedOnly && !hasStock) visible = false
    setMeshVisible(mesh, visible)

    if (!mesh.material || !visible) return
    const onRoute = routeSet.has(locationId)
    const isActive = locationId === activeLocationId
    if (routeSet.size > 0 && !onRoute) {
      mesh.material.opacity = 0.15
      mesh.material.emissiveIntensity = 0.01
    } else {
      mesh.material.opacity = mesh.userData?.isEmptySlot ? 0.22 : 0.94
      const lv = mesh.userData?.riskLevel
      mesh.material.emissiveIntensity = isActive ? 0.4 : lv === 'full' ? 0.14 : 0.05
    }
    mesh.scale.set(isActive ? 1.1 : 1, isActive ? 1.1 : 1, isActive ? 1.1 : 1)
  })
}

/** 计算有货库位的包围盒，用于默认视角 */
export function computeStockedBounds(locations = [], riskMap = {}) {
  const stocked = locations.filter((loc) => (riskMap[loc.location_id]?.qty || 0) > 0)
  const source = stocked.length ? stocked : locations
  if (!source.length) return null

  const xs = source.map((loc) => Number(loc.pos_x) || 0)
  const zs = source.map((loc) => Number(loc.pos_z) || 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  const centerX = ((minX + maxX) / 2) * UNIT
  const centerZ = ((minZ + maxZ) / 2) * UNIT
  const width = Math.max(12, (maxX - minX + 2) * UNIT)
  const depth = Math.max(10, (maxZ - minZ + 2) * UNIT)
  return { centerX, centerZ, width, depth }
}

export function focusCameraOnBounds(camera, controls, bounds) {
  if (!camera || !controls || !bounds) return
  const distance = Math.max(bounds.width, bounds.depth, 14) * 0.72
  camera.position.set(
    bounds.centerX + distance * 0.65,
    Math.max(12, distance * 0.55),
    bounds.centerZ + distance * 0.75
  )
  controls.target.set(bounds.centerX, 0.8, bounds.centerZ)
  controls.update()
}

export { UNIT, SLOT_H, RISK_COLORS, riskLabelMap }
