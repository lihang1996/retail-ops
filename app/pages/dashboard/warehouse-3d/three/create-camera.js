import * as THREE from 'three'

export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500)
  camera.position.set(18, 16, 22)
  camera.lookAt(8, 0, 8)
  return camera
}
