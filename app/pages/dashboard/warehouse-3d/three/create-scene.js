import * as THREE from 'three'

export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeef4fb)
  scene.fog = new THREE.Fog(0xf8fbff, 38, 82)

  const ambient = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.2)
  const key = new THREE.DirectionalLight(0xffffff, 1.55)
  key.position.set(16, 24, 14)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 1
  key.shadow.camera.far = 80
  key.shadow.camera.left = -28
  key.shadow.camera.right = 28
  key.shadow.camera.top = 28
  key.shadow.camera.bottom = -28

  const fill = new THREE.DirectionalLight(0xc7ddff, 0.55)
  fill.position.set(-18, 14, -10)
  scene.add(ambient, key, fill)

  return scene
}
