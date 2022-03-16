import { lerp } from '../helpers'
import AmmoJS from "../ammo/ammo.wasm.es.js"
import { InitData, InitDataOptions, PhysicsConfig } from './types'

// Firefox limitation: https://github.com/vitejs/vite/issues/4586

// there's probably a better place for these variables
let bodies = []
let sleepingBodies = []
let colliders: { [key: number]: typeof Ammo } = {}
let physicsWorld
let Ammo
let worldWorkerPort
let tmpBtTrans
let sharedVector3
let width = 150
let height = 150
let aspect = 1
let stopLoop = false
let spinScale = 60

const defaultOptions = {
	angularDamping: .4,
	friction: .8,
	gravity: 1,
	linearDamping: .4,
	mass: 1,
	restitution: .1,
	settleTimeout: 5000,
	size: 9.5,
	spinForce: 3,
	startingHeight: 12,
	throwForce: 2,
	// TODO: toss: "center", "edge", "allEdges"
}

let config: PhysicsConfig = { ...defaultOptions }

let emptyVector
let diceBufferView

self.onmessage = (e) => {
  switch (e.data.action) {
    case "rollDie":
      rollDie(e.data.sides)
      break;
    case "init":
      init(e.data).then(()=>{
        self.postMessage({
          action:"init-complete"
        })
      })
      break
    case "clearDice":
		clearDice()
      	break
	case "removeDie":
		removeDie(e.data.id)
		break;
	case "resize":
		width = e.data.width
		height = e.data.height
		aspect = width / height
		addBoxToWorld(config.size, config.startingHeight + 10)
		break
	case "updateConfig":
		updateConfig(e.data.options)
		break
    case "connect":
      worldWorkerPort = e.ports[0]
      worldWorkerPort.onmessage = (e) => {
        switch (e.data.action) {
			case "initBuffer":
				diceBufferView = new Float32Array(e.data.diceBuffer)
				diceBufferView[0] = -1
				break;
          case "addDie":
				// toss from all edges
				// setStartPosition()
				if(e.data.anustart){
					setStartPosition()
				}
            addDie(e.data.sides, e.data.id)
            break;
          case "rollDie":
						// TODO: this won't work, need a die object
            rollDie(e.data.id)
            break;
					case "removeDie":
						removeDie(e.data.id)
						break;
          case "stopSimulation":
            stopLoop = true
						
            break;
          case "resumeSimulation":
						if(e.data.anustart){
							setStartPosition()
						}
            stopLoop = false
						loop()
            break;
					case "stepSimulation":
						diceBufferView = new Float32Array(e.data.diceBuffer)
						loop()
						break;
          default:
            console.error("action not found in physics worker from worldOffscreen worker:", e.data.action)
        }
      }
      break
    default:
      console.error("action not found in physics worker:", e.data.action)
  }
}

// runs when the worker loads to set up the Ammo physics world and load our colliders
// loaded colliders will be cached and added to the world in a later post message
const init = async (data: InitData) => {
	width = data.width
	height = data.height
	aspect = width / height

	config = {...config, ...data.options}
	config.gravity === 0 ? 0 : config.gravity + config.mass / 3
	config.mass = 1 + config.mass / 3
	config.spinForce = config.spinForce/spinScale
	config.throwForce = config.throwForce / 2 / config.mass * (1 + config.scale / 6)
	// config.spinForce = (config.spinForce/100) * (config.scale * (config.scale < 1 ? .5 : 2))
	// config.throwForce = config.throwForce * (config.scale < 1 ? 2 - (config.scale ** config.scale) : 1 + config.scale/6)
	// ensure minimum startingHeight of 1
	config.startingHeight = config.startingHeight < 1 ? 1 : config.startingHeight

	const ammoWASM = {
		// locateFile: () => '../../node_modules/ammo.js/builds/ammo.wasm.wasm'
		locateFile: () => `${config.origin + config.assetPath}ammo/ammo.wasm.wasm`
	}

	Ammo = await new AmmoJS(ammoWASM)

	tmpBtTrans = new Ammo.btTransform()
	sharedVector3 = new Ammo.btVector3(0, 0, 0)
	emptyVector = setVector3(0,0,0)

	setStartPosition()
	
	// load our collider data
	// perhaps we don't await this, let it run and resolve it later
	const modelData = await fetch(`${config.origin + config.assetPath}models/dice-revised.json`).then(resp => {
		if(resp.ok) {
			const contentType = resp.headers.get("content-type")

			if (contentType && contentType.indexOf("application/json") !== -1) {
				return resp.json()
			} 
			else if (resp.type && resp.type === 'basic') {
				return resp.json()
			}
			else {
				return resp
			}
		} else {
			throw new Error(`Request rejected with status ${resp.status}: ${resp.statusText}`)
		}
	})
	.then(data => {
		return data.meshes.filter(mesh => {
			return mesh.id.includes("collider")
		})
	})
	.catch(error => {
		console.error(error)
		return error
	})
	
	physicsWorld = setupPhysicsWorld()

	// turn our model data into convex hull items for the physics world
	modelData.forEach((model,i) => {
		model.convexHull = createConvexHull(model)
		// model.physicsBody = createRigidBody(model.convexHull, {mass: model.mass})

		colliders[model.id] = model
	})

	addBoxToWorld(config.size, config.startingHeight + 10)

}

const updateConfig = (options: InitDataOptions) => {
	config = {...config,...options}
	config.mass = 1 + config.mass / 3
	config.gravity = config.gravity === 0 ? 0 : config.gravity + config.mass / 3
	config.spinForce = config.spinForce/spinScale
	config.throwForce = config.throwForce / 2 / config.mass * (1 + config.scale / 6)
	config.startingHeight = config.startingHeight < 1 ? 1 : config.startingHeight
	removeBoxFromWorld()
	addBoxToWorld(config.size, config.startingHeight + 10)
	physicsWorld.setGravity(setVector3(0, -9.81 * config.gravity, 0))
	Object.values(colliders).map((collider) => {
		collider.convexHull.setLocalScaling(setVector3(config.scale, config.scale, config.scale))
	})

}

const setVector3 = (x,y,z) => {
	sharedVector3.setValue(x,y,z)
	return sharedVector3
}

const setStartPosition = () => {
	let size = config.size
	// let envelopeSize = size * .6 / 2
	let edgeOffset = .5
	let xMin = size * aspect / 2 - edgeOffset
	let xMax = size * aspect / -2 + edgeOffset
	let yMin = size / 2 - edgeOffset
	let yMax = size / -2 + edgeOffset
	let xEnvelope = lerp(xMin, xMax, Math.random())
	let yEnvelope = lerp(yMin, yMax, Math.random())
	let tossFromTop = Math.round(Math.random())
	let tossFromLeft = Math.round(Math.random())
	let tossX = Math.round(Math.random())

	config.startPosition = [
		// tossing on x axis then z should be locked to top or bottom
		// not tossing on x axis then x should be locked to the left or right
		tossX ? xEnvelope : tossFromLeft ? xMax : xMin,
		config.startingHeight,
		tossX ? tossFromTop ? yMax : yMin : yEnvelope
	]

	// console.log(`startPosition`, config.startPosition)
}

const createConvexHull = (mesh: { positions: string | any[]; scaling: number[] }) => {
	const convexMesh = new Ammo.btConvexHullShape()

	let count = mesh.positions.length

	for (let i = 0; i < count; i+=3) {
		let v = setVector3(mesh.positions[i], mesh.positions[i+1], mesh.positions[i+2])
		convexMesh.addPoint(v, true)
	}

	convexMesh.setLocalScaling(setVector3(mesh.scaling[0] * config.scale, mesh.scaling[1] * config.scale, mesh.scaling[2] * config.scale))

	return convexMesh
}

const createRigidBody = (collisionShape, params) => {
	// apply params
	const {
		mass = .1,
		collisionFlags = 0,
		// pos = { x: 0, y: 0, z: 0 },
		// quat = { x: 0, y: 0, z: 0, w: 1 }
		pos = [0,0,0],
		// quat = [0,0,0,-1],
		quat = [
			lerp(-1.5, 1.5, Math.random()),
			lerp(-1.5, 1.5, Math.random()),
			lerp(-1.5, 1.5, Math.random()),
			-1
		],
		scale = [1,1,1],
		friction = config.friction,
		restitution = config.restitution
	} = params

	// apply position and rotation
	const transform = new Ammo.btTransform()
	// console.log(`collisionShape scaling `, collisionShape.getLocalScaling().x(),collisionShape.getLocalScaling().y(),collisionShape.getLocalScaling().z())
	transform.setIdentity()
	transform.setOrigin(setVector3(pos[0], pos[1], pos[2]))
	transform.setRotation(
		new Ammo.btQuaternion(quat[0], quat[1], quat[2], quat[3])
	)
	// collisionShape.setLocalScaling(new Ammo.btVector3(1.1, -1.1, 1.1))
	// transform.ScalingToRef()
	// set the scale of the collider
	// collisionShape.setLocalScaling(new Ammo.btVector3(scale[0],scale[1],scale[2]))

	// create the rigid body
	const motionState = new Ammo.btDefaultMotionState(transform)
	const localInertia = setVector3(0, 0, 0)
	if (mass > 0) collisionShape.calculateLocalInertia(mass, localInertia)
	const rbInfo = new Ammo.btRigidBodyConstructionInfo(
		mass,
		motionState,
		collisionShape,
		localInertia
	)
	const rigidBody = new Ammo.btRigidBody(rbInfo)
	
	// rigid body properties
	if (mass > 0) rigidBody.setActivationState(4) // Disable deactivation
	rigidBody.setCollisionFlags(collisionFlags)
	rigidBody.setFriction(friction)
	rigidBody.setRestitution(restitution)
	rigidBody.setDamping(config.linearDamping, config.angularDamping)

	// ad rigid body to physics world
	// physicsWorld.addRigidBody(rigidBody)

	return rigidBody

}
// cache for box parts so it can be removed after a new one has been made
let boxParts = []
const addBoxToWorld = (size, height) => {
	const tempParts = []
	// ground
	const localInertia = setVector3(0, 0, 0);
	const groundTransform = new Ammo.btTransform()
	groundTransform.setIdentity()
	groundTransform.setOrigin(setVector3(0, -.5, 0))
	const groundShape = new Ammo.btBoxShape(setVector3(size * aspect, 1, size))
	const groundMotionState = new Ammo.btDefaultMotionState(groundTransform)
	const groundInfo = new Ammo.btRigidBodyConstructionInfo(0, groundMotionState, groundShape, localInertia)
	const groundBody = new Ammo.btRigidBody(groundInfo)
	groundBody.setFriction(config.friction)
	groundBody.setRestitution(config.restitution)
	physicsWorld.addRigidBody(groundBody)
	tempParts.push(groundBody)

	const wallTopTransform = new Ammo.btTransform()
	wallTopTransform.setIdentity()
	wallTopTransform.setOrigin(setVector3(0, 0, (size/-2) - .5))
	const wallTopShape = new Ammo.btBoxShape(setVector3(size * aspect, height, 1))
	const topMotionState = new Ammo.btDefaultMotionState(wallTopTransform)
	const topInfo = new Ammo.btRigidBodyConstructionInfo(0, topMotionState, wallTopShape, localInertia)
	const topBody = new Ammo.btRigidBody(topInfo)
	topBody.setFriction(config.friction)
	topBody.setRestitution(config.restitution)
	physicsWorld.addRigidBody(topBody)
	tempParts.push(topBody)

	const wallBottomTransform = new Ammo.btTransform()
	wallBottomTransform.setIdentity()
	wallBottomTransform.setOrigin(setVector3(0, 0, (size/2) + .5))
	const wallBottomShape = new Ammo.btBoxShape(setVector3(size * aspect, height, 1))
	const bottomMotionState = new Ammo.btDefaultMotionState(wallBottomTransform)
	const bottomInfo = new Ammo.btRigidBodyConstructionInfo(0, bottomMotionState, wallBottomShape, localInertia)
	const bottomBody = new Ammo.btRigidBody(bottomInfo)
	bottomBody.setFriction(config.friction)
	bottomBody.setRestitution(config.restitution)
	physicsWorld.addRigidBody(bottomBody)
	tempParts.push(bottomBody)

	const wallRightTransform = new Ammo.btTransform()
	wallRightTransform.setIdentity()
	wallRightTransform.setOrigin(setVector3((size * aspect / -2) - .5, 0, 0))
	const wallRightShape = new Ammo.btBoxShape(setVector3(1, height, size))
	const rightMotionState = new Ammo.btDefaultMotionState(wallRightTransform)
	const rightInfo = new Ammo.btRigidBodyConstructionInfo(0, rightMotionState, wallRightShape, localInertia)
	const rightBody = new Ammo.btRigidBody(rightInfo)
	rightBody.setFriction(config.friction)
	rightBody.setRestitution(config.restitution)
	physicsWorld.addRigidBody(rightBody)
	tempParts.push(rightBody)

	const wallLeftTransform = new Ammo.btTransform()
	wallLeftTransform.setIdentity()
	wallLeftTransform.setOrigin(setVector3((size * aspect / 2) + .5, 0, 0))
	const wallLeftShape = new Ammo.btBoxShape(setVector3(1, height, size))
	const leftMotionState = new Ammo.btDefaultMotionState(wallLeftTransform)
	const leftInfo = new Ammo.btRigidBodyConstructionInfo(0, leftMotionState, wallLeftShape, localInertia)
	const leftBody = new Ammo.btRigidBody(leftInfo)
	leftBody.setFriction(config.friction)
	leftBody.setRestitution(config.restitution)
	physicsWorld.addRigidBody(leftBody)
	tempParts.push(leftBody)

	if(boxParts.length){
		removeBoxFromWorld()
	}
	boxParts = [...tempParts]
}

const removeBoxFromWorld = () => {
	boxParts.forEach(part => physicsWorld.removeRigidBody(part))
}

const addDie = (sides, id) => {
	let cType = `d${sides}_collider`
	const mass = colliders[cType].physicsMass * config.mass * config.scale // feature? mass should go up with scale, but it throws off the throwForce and spinForce scaling
	// clone the collider
	const newDie = createRigidBody(colliders[cType].convexHull, {
		mass,
		scaling: colliders[cType].scaling,
		pos: config.startPosition,
		// quat: colliders[cType].rotationQuaternion,
	})
	newDie.id = id
	newDie.timeout = config.settleTimeout
	newDie.mass = mass
	physicsWorld.addRigidBody(newDie)
	bodies.push(newDie)
	// console.log(`added collider for `, type)
	rollDie(newDie)
}

const rollDie = (die) => {
	die.setLinearVelocity(setVector3(
		lerp(-config.startPosition[0] * .5, -config.startPosition[0] * config.throwForce, Math.random()),
		// lerp(-config.startPosition[1] * .5, -config.startPosition[1] * config.throwForce, Math.random()),
		lerp(-config.startPosition[1], -config.startPosition[1] * 2, Math.random()),
		lerp(-config.startPosition[2] * .5, -config.startPosition[2] * config.throwForce, Math.random()),
	))

	const force = new Ammo.btVector3(
		lerp(-config.spinForce, config.spinForce, Math.random()),
		lerp(-config.spinForce, config.spinForce, Math.random()),
		lerp(-config.spinForce, config.spinForce, Math.random())
	)

	// attempting to create an envelope for the force influence based on scale and mass
	// linear scale was no good - this creates a nice power curve
	const scale = Math.abs(config.scale - 1) + config.scale * config.scale * (die.mass/config.mass) * .75

	// console.log('scale', scale)
	
	die.applyImpulse(force, setVector3(scale, scale, scale))

}

const removeDie = (id) => {
	sleepingBodies = sleepingBodies.filter((die) => {
		let match = die.id === id
		if(match){
			// remove the mesh from the scene
			physicsWorld.removeRigidBody(die)
		}
		return !match
	})

	// step the animation forward
	// requestAnimationFrame(loop)
}

const clearDice = () => {
	if(diceBufferView.byteLength){
		diceBufferView.fill(0)
	}
	stopLoop = true
	// clear all bodies
	bodies.forEach(body => physicsWorld.removeRigidBody(body))
	sleepingBodies.forEach(body => physicsWorld.removeRigidBody(body))
	// clear cache arrays
	bodies = []
	sleepingBodies = []
}


const setupPhysicsWorld = () => {
	const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration()
	const broadphase = new Ammo.btDbvtBroadphase()
	const solver = new Ammo.btSequentialImpulseConstraintSolver()
	const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration)
	const World = new Ammo.btDiscreteDynamicsWorld(
		dispatcher,
		broadphase,
		solver,
		collisionConfiguration
	)
	World.setGravity(setVector3(0, -9.81 * config.gravity, 0))

	return World
}

const update = (delta) => {
	// step world
	const deltaTime = delta / 1000
	
	// console.time("stepSimulation")
	physicsWorld.stepSimulation(deltaTime, 2, 1 / 90) // higher number = slow motion
	// console.timeEnd("stepSimulation")

	diceBufferView[0] = bodies.length

	// looping backwards since bodies are removed as they are put to sleep
	for (let i = bodies.length - 1; i >= 0; i--) {
		const rb = bodies[i]
		const speed = rb.getLinearVelocity().length()
		const tilt = rb.getAngularVelocity().length()

		if(speed < .01 && tilt < .01 || rb.timeout < 0) {
			// flag the second param for this body so it can be processed in World, first param will be the roll.id
			diceBufferView[(i*8) + 1] = rb.id
			diceBufferView[(i*8) + 2] = -1
			rb.asleep = true
			rb.setMassProps(0)
			rb.forceActivationState(3)
			// zero out anything left
			rb.setLinearVelocity(emptyVector)
			rb.setAngularVelocity(emptyVector)
			sleepingBodies.push(bodies.splice(i,1)[0])
			continue
		}
		// tick down the movement timeout on this die
		rb.timeout -= delta
		const ms = rb.getMotionState()
		if (ms) {
			ms.getWorldTransform(tmpBtTrans)
			let p = tmpBtTrans.getOrigin()
			let q = tmpBtTrans.getRotation()
			let j = i*8 + 1

			diceBufferView[j] = rb.id
			diceBufferView[j+1] = p.x()
			diceBufferView[j+2] = p.y()
			diceBufferView[j+3] = p.z()
			diceBufferView[j+4] = q.x()
			diceBufferView[j+5] = q.y()
			diceBufferView[j+6] = q.z()
			diceBufferView[j+7] = q.w()
		}
	}
}

let last = new Date().getTime()
const loop = () => {
	let now = new Date().getTime()
	const delta = now - last
	last = now

	if(!stopLoop && diceBufferView.byteLength) {
		// console.time("physics")
		update(delta)
		// console.timeEnd("physics")
			worldWorkerPort.postMessage({
				action: 'updates',
				diceBuffer: diceBufferView.buffer
			}, [diceBufferView.buffer])
	}
}
