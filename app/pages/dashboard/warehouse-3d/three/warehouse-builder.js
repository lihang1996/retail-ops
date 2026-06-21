import * as THREE from 'three'

const RISK_COLORS = {
  empty: 0x9ca3af,
  normal: 0x22c55e,
  low: 0xf59e0b,
  full: 0xef4444,
}

const UNIT = 1.6
const BOX_W = 1.2
const BOX_H = 0.9
const BOX_D = 1.2

export function buildWarehouse({ locations = [], riskMap = {} }) {
  const group = new THREE.Group()
  const meshByLocationId = new Map()
  const sharedGeometry = new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D)

  const floorSize = Math.max(24, Math.ceil(Math.sqrt(locations.length)) * UNIT + 4)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSize, floorSize),
    new THREE.MeshStandardMaterial({ color: 0xe5e7eb })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(floorSize / 2 - 2, -BOX_H / 2, floorSize / 2 - 2)
  floor.receiveShadow = true
  group.add(floor)

  for (const loc of locations) {
    const risk = riskMap[loc.location_id] || { level: 'empty' }
    const color = RISK_COLORS[risk.level] || RISK_COLORS.empty
    const material = new THREE.MeshStandardMaterial({ color })
    const mesh = new THREE.Mesh(sharedGeometry, material)
    mesh.position.set(
      (parseFloat(loc.pos_x) || 0) * UNIT,
      BOX_H / 2,
      (parseFloat(loc.pos_z) || 0) * UNIT
    )
    mesh.userData = {
      locationId: loc.location_id,
      locationCode: loc.location_code,
      riskLevel: risk.level,
    }
    group.add(mesh)
    meshByLocationId.set(loc.location_id, mesh)
  }

  return { group, meshByLocationId, sharedGeometry }
}

export function buildPickingRoute(points = []) {
  if (!points.length) return null

  const vectors = points.map(
    (p) => new THREE.Vector3(
      (p.pos_x || 0) * UNIT,
      BOX_H + 0.3,
      (p.pos_z || 0) * UNIT
    )
  )

  const geometry = new THREE.BufferGeometry().setFromPoints(vectors)
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 2 })
  )

  const markers = new THREE.Group()
  points.forEach((p, i) => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2563eb })
    )
    sphere.position.set(
      (p.pos_x || 0) * UNIT,
      BOX_H + 0.35,
      (p.pos_z || 0) * UNIT
    )
    sphere.userData = { seq: p.seq, locationCode: p.location_code }
    markers.add(sphere)
  })

  const routeGroup = new THREE.Group()
  routeGroup.add(line, markers)
  return routeGroup
}

export { UNIT, BOX_H, RISK_COLORS }
