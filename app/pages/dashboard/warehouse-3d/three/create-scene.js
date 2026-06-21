import * as THREE from 'three'

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f4f8)

  const ambient = new THREE.AmbientLight(0xffffff, 0.65)
  const dir = new THREE.DirectionalLight(0xffffff, 0.85)
  dir.position.set(12, 20, 10)
  scene.add(ambient, dir)

  return scene
}
