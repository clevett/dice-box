import { DirectionalLight, HemisphericLight, Mesh, Scene, ShadowGenerator } from "@babylonjs/core"

type theme = string
type assetPath = string

export type DiceDefaults = {
    assetPath: assetPath
    enableShadows: boolean
    groupId: number | null
    id: number | null
    lights: []
    rollId: number | null
    scene: Scene | null
    sides: number
    theme: theme
}

export type DiceConfig = {
    anustart: boolean
    assetPath: assetPath
    collectionId: number
    enableShadows: boolean
    groupId: number | null
    id: number | null
    lights: [] | Lights
    rollId: number | null
    scale: number
    scene: CustomScene | null
    sides: number
    theme: theme
}

export type LoadModelOptions = {
    assetPath: assetPath
    scale: number
    scene: CustomScene
}

export type LoadDieOptions = {
    sides: number,
    theme?: theme,
    scene: CustomScene,
}

type CustomScene = {
    meshes: Mesh[],
    getMeshByName: (name: string) => Mesh
} & Scene

//Passed into the new Dice class
export type DiceOptions = {
    anustart: boolean
    assetPath: assetPath
    collectionId: number
    enableShadows: boolean
    groupId: number
    id: number
    lights: Lights
    rollId: number
    scale: number
    scene: CustomScene
    sides: number
    theme: theme
}

export type DirectionalLightType = {
    shadowGenerator?: ShadowGenerator
} & DirectionalLight
  
export type Lights = {
    directional: DirectionalLightType, 
    hemispheric: HemisphericLight
}