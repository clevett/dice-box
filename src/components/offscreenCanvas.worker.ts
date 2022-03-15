import { createEngine } from './engine'
import { createScene } from './scene'
import { createCamera } from './camera'
import { createLights } from './lights'
import DiceBox from './DiceBox'
import Dice from './Dice'
import { loadTheme } from './Dice/themes'
import { Vector3 } from '@babylonjs/core/Maths/math'
import { Engine, Scene, TargetCamera } from '@babylonjs/core'
import { DiceOptions, InitSceneData, Lights, OnMessage, PhysicsWorkerPort, Resize } from './types'

let 
	config: {
		origin?: string
		delay?: number
	} & Resize & DiceOptions,
	dieCache: { [key: number]: Dice } = {},
	count = 0,
	sleeperCount = 0,
	dieRollTimer = [],
	canvas: HTMLCanvasElement, 
	engine: Engine, 
	scene: Scene, 
	camera: TargetCamera,
	lights: Lights,
	diceBox: DiceBox,
	physicsWorkerPort: PhysicsWorkerPort,
	diceBufferView = new Float32Array(8000)

// these are messages sent to this worker from World.js
self.onmessage = (e: { data: InitSceneData }) => {
  switch( e.data.action ) {
    case "rollDie":
      // kick it over to the physics worker
      physicsWorkerPort.postMessage({
        action: "roll"
      })
      break
    case "addDie":
			add({...e.data.options})
      break
		case "loadTheme":
			loadThemes(e.data.id, e.data.theme)
			break
    case "clearDice":
			clear()
      break
		case "removeDie":
			remove(e.data.options)
			break;
    case "resize":
			resize(e.data.options)
      break
    case "init":
      initScene(e.data)
      break
		case "updateConfig":
			updateConfig(e.data.options)
			break
    case "connect": // These are messages sent from physics.worker.js
      physicsWorkerPort = e.data.port
      physicsWorkerPort.onmessage = (e: OnMessage) => {
        switch (e.data.action) {
          case "updates": // dice status/position updates from physics worker
				updatesFromPhysics(e.data.diceBuffer)
            break;
        
          default:
            console.error("action from physicsWorker not found in offscreen worker")
            break;
        }
      }
      break
    default:
      console.error("action not found in offscreen worker")
  }
}

// initialize the babylon scene
const initScene = async (data: InitSceneData) => {
	canvas = data.canvas

	// set the config from World
	config = data.options
	canvas.width = data.width
	canvas.height = data.height

	// setup babylonJS scene
	engine = createEngine(canvas)
	scene = createScene({engine})
	camera = createCamera({engine})
	lights = createLights({enableShadows: config.enableShadows})

  // create the box that provides surfaces for shadows to render on
	diceBox = new DiceBox({
		enableShadows: config.enableShadows,
    	aspect: canvas.width / canvas.height,
    	lights,
		scene,
		enableDebugging: false
	})

  // loading all our dice models
  // we use to load these models individually as needed, but it's faster to load them all at once and prevents animation jank when rolling
  	await Dice.loadModels({
		assetPath: config.origin + config.assetPath,
		scene,
		scale: config.scale
	})

	physicsWorkerPort.postMessage({
		action: "initBuffer",
		diceBuffer: diceBufferView.buffer
	}, [diceBufferView.buffer])

  // init complete - let the world know
  self.postMessage({action:"init-complete"})
}

const updateConfig = (options: Resize & DiceOptions) => {
	const prevConfig = config
	config = options
	// check if shadows setting has changed
	if(prevConfig.enableShadows !== config.enableShadows) {
		Object.values(lights).forEach(light => light.dispose())
		lights = createLights({enableShadows: config.enableShadows})
	}
	if(prevConfig.scale !== config.scale) {
		Object.values(dieCache).forEach(({mesh}) => {
			mesh.scaling = new Vector3(config.scale,config.scale,config.scale)
		})
	}
}

// all this does is start the render engine.
const render = (anustart: boolean) => {
  // document.body.addEventListener('click',()=>engine.stopRenderLoop())
  engine.runRenderLoop(renderLoop.bind(self))
	physicsWorkerPort.postMessage({
		action: "resumeSimulation",
		anustart
	})
}

const renderLoop = () => {
  // if no dice awake then stop the render loop and save some CPU power (unless we're in debug mode where we want the arc camera to continue working)
  if(sleeperCount && sleeperCount === Object.keys(dieCache).length) {
    // console.info(`no dice moving`)
    engine.stopRenderLoop()
		count = 0
		// stop the physics engine
    physicsWorkerPort.postMessage({
      action: "stopSimulation",
    })
		// post back to the world
		self.postMessage({
			action: "roll-complete"
		})
  }
  // otherwise keep on rendering
  else {
    scene.render()
  }
}

const loadThemes = async (id: number, theme: string) => {
	await loadTheme(theme, config.origin + config.assetPath, scene)
	self.postMessage({action:"theme-loaded",id})
}

const clear = () => {
	if(!Object.keys(dieCache).length && !sleeperCount) {
		return
	}
	if(diceBufferView.byteLength){
		diceBufferView.fill(0)
	}
	dieRollTimer.forEach(timer=>clearTimeout(timer))
	// stop anything that's currently rendering
	engine.stopRenderLoop()
	// remove all dice
	// dieCache.forEach(die => die.mesh.dispose())
	Object.values(dieCache).forEach(die => die.mesh.dispose())

	dieCache = {}
	count = 0
	sleeperCount = 0

	// step the animation forward
	scene.render()
}

const add = (options: DiceOptions) => {
	// loadDie allows you to specify sides(dieType) and theme and returns the options you passed in
	Dice.loadDie({
		...options,
		scene
	}).then(resp => {
		// space out adding the dice so they don't lump together too much
		dieRollTimer.push(setTimeout(() => {
			_add(resp)
		}, count++ * config.delay))
	})
}

// add a die to the scene
const _add = async (options: DiceOptions) => {
	if(engine.activeRenderLoops.length === 0) {
		render(options.anustart)
	}

	const diceOptions = {
		...options,
		assetPath: config.assetPath,
		enableShadows: config.enableShadows,
		scale: config.scale,
		lights,
	}

  const newDie = new Dice(diceOptions)

  // save the die just created to the cache
  dieCache[newDie.id] = newDie

	// tell the physics engine to roll this die type - which is a low poly collider
	physicsWorkerPort.postMessage({
		action: "addDie",
		sides: options.sides,
		scale: config.scale,
		id: newDie.id,
		anustart: options.anustart
	})

  // for d100's we need to add an additional d10 and pair it up with the d100 just created
  if(options.sides === 100) {
    // assign the new die to a property on the d100 - spread the options in order to pass a matching theme
    newDie.d10Instance = await Dice.loadDie(
		{...diceOptions, sides: 10, id: newDie.id + 10000}
	).then( response =>  {
      const d10Instance = new Dice(response)
      // identify the parent of this d10 so we can calculate the roll result later
      d10Instance.dieParent = newDie
      return d10Instance
    })
    // add the d10 to the cache and ask the physics worker for a collider
    dieCache[`${newDie.d10Instance.id}`] = newDie.d10Instance
    physicsWorkerPort.postMessage({
      action: "addDie",
      sides: 10,
			scale: config.scale,
			id: newDie.d10Instance.id
    })
  }

  // return the die instance
  return newDie

}

const remove = (data: Resize & DiceOptions) => {
	// TODO: test this with exploding dice
	// check if this is d100 and remove associated d10 first
	const dieData = dieCache[data.id]
	if(dieData.hasOwnProperty('d10Instance')){
		dieCache[dieData.d10Instance.id].mesh.dispose()
		delete dieCache[dieData.d10Instance.id]
		physicsWorkerPort.postMessage({
      action: "removeDie",
			id: dieData.d10Instance.id
    })
		sleeperCount--
	}

	// remove die
	dieData.mesh.dispose()
	// delete entry
	delete dieCache[data.id]
	// decrement count
	sleeperCount--

	// step the animation forward
	scene.render()

	self.postMessage({action:"die-removed", rollId: data.rollId})
}

const updatesFromPhysics = (buffer: ArrayBufferLike) => {
	diceBufferView = new Float32Array(buffer)
	let bufferIndex = 1

	// loop will be based on diceBufferView[0] value which is the bodies length in physics.worker
	for (let i = 0, len = diceBufferView[0]; i < len; i++) {
		if(!Object.keys(dieCache).length){
			continue
		}
		const die = dieCache[`${diceBufferView[bufferIndex]}`]
		if(!die) {
			console.log("Error: die not available in scene to animate")
			break
		}
		// if the first position index is -1 then this die has been flagged as asleep
		if(diceBufferView[bufferIndex + 1] === -1) {
			handleAsleep(die)
		} else {
			const px = diceBufferView[bufferIndex + 1]
			const py = diceBufferView[bufferIndex + 2]
			const pz = diceBufferView[bufferIndex + 3]
			const qx = diceBufferView[bufferIndex + 4]
			const qy = diceBufferView[bufferIndex + 5]
			const qz = diceBufferView[bufferIndex + 6]
			const qw = diceBufferView[bufferIndex + 7]

			die.mesh.position.set(px, py, pz)
			die.mesh.rotationQuaternion.set(qx, qy, qz, qw)
		}

		bufferIndex = bufferIndex + 8
	}

	// transfer the buffer back to physics worker
	requestAnimationFrame(()=>{
		physicsWorkerPort.postMessage({
			action: "stepSimulation",
			diceBuffer: diceBufferView.buffer
		}, [diceBufferView.buffer])
	})
}

const handleAsleep = async (die: Dice) => {
	// mark this die as asleep
	die.asleep = true

	// get the roll result for this die
	let result = await Dice.getRollResult(die)
	// TODO: catch error if no result is found
	if(result === undefined) {
		console.log("No result. This die needs a reroll.")
	}

	if(die.d10Instance || die.dieParent) {
		// if one of the pair is asleep and the other isn't then it falls through without getting the roll result
		// otherwise both dice in the d100 are asleep and ready to calc their roll result
		if(die?.d10Instance?.asleep || die?.dieParent?.asleep) {
			const d100 = die.config.sides === 100 ? die : die.dieParent
			const d10 = die.config.sides === 10 ? die : die.d10Instance
			if (d10.value === 0 && d100.value === 0) {
				d100.value = 100; // 00 + 0 is 100 on a d100
			} else {
				d100.value = d100.value + d10.value
			}

			self.postMessage({action:"roll-result", die: {
				rollId: d100.config.rollId,
				value : d100.value
			}})
		}
	} else {
		// turn 0's on a d10 into a 10
		if(die.config.sides === 10 && die.value === 0) {
			die.value = 10
		}
		self.postMessage({action:"roll-result", die: {
			rollId: die.config.rollId,
			value: die.value
		}})
	}
	// add to the sleeper count
	sleeperCount++
}

const resize = (data: Resize) => {
	canvas.width = data.width
	canvas.height = data.height
	// redraw the dicebox
	diceBox.create({aspect: data.width / data.height})
	engine.resize()
}