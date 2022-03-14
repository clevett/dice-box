function createCanvas(options: { selector: string; id: string }) {
  const { selector, id } = options

  if (!selector) {
    throw(new Error("You must provide a selector in order to render the Dice Box"))
  }

  const container = document.querySelector(selector)
  let canvas: Element
  
  if(container.nodeName.toLowerCase() !== 'canvas') {
    canvas = document.createElement('canvas')
    canvas.id = id
    container.appendChild(canvas)
  } 
  else {
    canvas = container
  }
  return canvas
}

export { createCanvas }