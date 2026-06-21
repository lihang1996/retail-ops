import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxPolarAngle = Math.PI / 2.1
  controls.target.set(8, 0, 8)
  return controls
}
