export function disposeSceneResources({ renderer, controls, scene, sharedGeometry }) {
  controls?.dispose()
  renderer?.dispose()

  if (scene) {
    scene.traverse((obj) => {
      if (obj.geometry && obj.geometry !== sharedGeometry) {
        obj.geometry.dispose()
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => {
            m.map?.dispose?.()
            m.dispose()
          })
        } else {
          obj.material.map?.dispose?.()
          obj.material.dispose()
        }
      }
    })
  }

  sharedGeometry?.dispose()
}

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext
      && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}
