import * as THREE from 'three'

export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500)
  camera.position.set(22, 18, 24)
  camera.lookAt(8, 0, 8)
  return camera
}
