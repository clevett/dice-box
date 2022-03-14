import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import { Scene } from '@babylonjs/core/scene'

type DirectionalLightType = {
  shadowGenerator?: ShadowGenerator
} & DirectionalLight

function createLights(options: { enableShadows: boolean; scene?: Scene }) {
  const { enableShadows = true, scene } = options

  const d_light: DirectionalLightType = new DirectionalLight("DirectionalLight", new Vector3(-0.3, -1, 0.4), scene)
  d_light.position = new Vector3(-50,65,-50)
  d_light.intensity = .65

  const h_light = new HemisphericLight("HemisphericLight", new Vector3(1, 1, 0), scene)
  h_light.intensity = .2
  
  if(enableShadows){
    d_light.shadowMinZ = 1
    d_light.shadowMaxZ = 70
		// d_light.autoCalcShadowZBounds = true
    d_light.shadowGenerator = new ShadowGenerator(2048, d_light);
    d_light.shadowGenerator.useCloseExponentialShadowMap = true; // best
    d_light.shadowGenerator.darkness = .8
    // d_light.shadowGenerator.usePoissonSampling = true
    // d_light.shadowGenerator.bias = .01
  }

  return {directional: d_light, hemispheric: h_light}
}

export { createLights }