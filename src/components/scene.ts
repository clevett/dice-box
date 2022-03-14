import { Color4 } from '@babylonjs/core/Maths/math.color'
import { Scene } from '@babylonjs/core/scene'
import { SceneOptimizer, SceneOptimizerOptions } from '@babylonjs/core/Misc/sceneOptimizer'
import { Engine } from '@babylonjs/core/Engines/engine'

function createScene(options: { engine: Engine }) {
  const { engine } = options
  const scene = new Scene(engine)

  // scene.useRightHandedSystem = true
  scene.clearColor = new Color4(0,0,0,0);

  scene.pointerMovePredicate = () => false;
  scene.pointerDownPredicate = () => false;
  scene.pointerUpPredicate = () => false;
  scene.clearCachedVertexData();

  const optimizationSettings = SceneOptimizerOptions.LowDegradationAllowed()
  optimizationSettings.optimizations = optimizationSettings.optimizations.splice(1)
  optimizationSettings.targetFrameRate = 60

  SceneOptimizer.OptimizeAsync(scene,optimizationSettings)

  return scene
}

export { createScene }