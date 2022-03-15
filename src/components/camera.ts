import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera'
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';

// this module has dynamically loaded modules so it's been made async
function createCamera(options: { engine?: Engine; scene?: Scene }) {
  const { scene } = options
  const cameraDistance = 36.5
  let camera = new TargetCamera("TargetCamera1", new Vector3(0, cameraDistance, 0), scene)
	camera.fov = .25
	camera.minZ = 5
	camera.maxZ = cameraDistance + 1
  camera.setTarget(Vector3.Zero())
  
  return camera
}

export { createCamera }