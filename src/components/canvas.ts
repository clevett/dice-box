function createCanvas(options: { selector: string; id: string }) {
  const { selector, id } = options

  if (!selector) {
    throw(new Error("You must provide a selector in order to render the Dice Box"))
  }

  const container: Element | HTMLCanvasElement = document.querySelector(selector)
  let canvas: HTMLCanvasElement
  
  if(container.nodeName.toLowerCase() !== 'canvas') {
    canvas = document.createElement('canvas')
    canvas.id = id
    container.appendChild(canvas)

    return canvas
  } 

  return container
}

export { createCanvas }