import { Color3 } from '@babylonjs/core/Maths/math.color'
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShadowOnlyMaterial } from '@babylonjs/materials/shadowOnly/shadowOnlyMaterial'
import { DiceBoxConfig, DiceBoxDefaultOptions, DiceBoxOptions } from './types'

const defaultOptions: DiceBoxDefaultOptions = {
  aspect: 300 / 150,
  enableDebugging: false,
  enableShadows: true,
}

class DiceBox {
	size = 9.5
	config: DiceBoxConfig
	box: TransformNode
	constructor(options: DiceBoxOptions){
		this.config = {...defaultOptions, ...options}
		this.create()
	}
	create(options?: DiceBoxOptions){
		// remove any previously existing boxes
		this.destroy()
		// extend config with options on create
		Object.assign(this.config,options)
		const { aspect, enableDebugging = true, enableShadows } = this.config
		const wallHeight = 30
		let boxMaterial: StandardMaterial | ShadowOnlyMaterial

		this.box = new TransformNode("diceBox");

		if(enableDebugging) {
			boxMaterial = new StandardMaterial("diceBox_material")
			boxMaterial.alpha = .7
			boxMaterial.diffuseColor = new Color3(1, 1, 0);
		}
		else {
			if(enableShadows) {
				boxMaterial = new ShadowOnlyMaterial('shadowOnly', this.config.scene)
			} 
		}

		// Bottom of the Box
		const ground = CreateBox("ground",{
			width: this.size, 
			height: 1,
			depth: this.size
		}, this.config.scene)
		ground.scaling = new Vector3(aspect, 1, 1)
		ground.material = boxMaterial
		ground.receiveShadows = true
		ground.setParent(this.box)

		if(enableDebugging) {
			// North Wall
			const wallTop = CreateBox("wallTop",{
				width: this.size,
				height: wallHeight,
				depth: 1
			}, this.config.scene)
			wallTop.position.y = wallHeight / 2
			wallTop.position.z = this.size / -2
			wallTop.scaling = new Vector3(aspect, 1, 1)
			wallTop.material = boxMaterial
			// wallTop.receiveShadows = true
			wallTop.setParent(this.box)

			// Right Wall
			const wallRight = CreateBox("wallRight",{
				width: 1, 
				height: wallHeight,
				depth: this.size
			}, this.config.scene )
			wallRight.position.x = this.size * aspect / 2
			wallRight.position.y = wallHeight / 2
			wallRight.material = boxMaterial
			// wallRight.receiveShadows = true
			wallRight.setParent(this.box)

			// South Wall
			const wallBottom = CreateBox("wallBottom",{
				width: this.size, 
				height: wallHeight,
				depth: 1
			}, this.config.scene)
			wallBottom.position.y = wallHeight / 2
			wallBottom.position.z = this.size / 2
			wallBottom.scaling = new Vector3(aspect, 1, 1)
			wallBottom.material = boxMaterial
			// wallBottom.receiveShadows = true
			wallBottom.setParent(this.box)

			// Left Wall
			const wallLeft = CreateBox("wallLeft",{
				width: 1, 
				height: wallHeight,
				depth: this.size
			}, this.config.scene)
			wallLeft.position.x = this.size * aspect / -2
			wallLeft.position.y = wallHeight / 2
			wallLeft.material = boxMaterial
			// wallLeft.receiveShadows = true
			wallLeft.setParent(this.box)
		}
	}
	destroy(){
		if(this.box) {
			this.box.dispose()
		}
	}
}

export default DiceBox