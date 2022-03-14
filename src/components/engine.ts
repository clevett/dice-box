import { Engine } from '@babylonjs/core/Engines/engine'
import "@babylonjs/core/Engines/Extensions/engine.debugging"

function createEngine(canvas: HTMLCanvasElement | OffscreenCanvas | WebGLRenderingContext | WebGL2RenderingContext) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  })

  return engine
}

export { createEngine }