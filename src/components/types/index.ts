import { DirectionalLight, HemisphericLight, Mesh, Scene, ShadowGenerator } from "@babylonjs/core"
import Dice from "../Dice"

type Anustart = boolean
type AssetPath = string
type Theme = string

type Sides = number
type Scale = number

type DiceBuffer = ArrayBufferLike

export type DiceConfig = {
    anustart: Anustart
    assetPath: AssetPath
    collectionId: number
    enableShadows: boolean
    groupId: number | null
    id: number | null
    lights: [] | Lights
    rollId: number | null
    scale: Scale
    scene: Scene | null
    sides: Sides
    theme: Theme
}

export type LoadModelOptions = {
    assetPath: AssetPath
    scale: Scale
    scene: Scene
}

export type LoadDieOptions = {
    sides: Sides,
    theme?: Theme,
    scene: CustomScene,
}

export type CustomScene = {
    meshes: Mesh[],
    getMeshByName: (name: string) => Mesh
} & Scene

//Passed into the new Dice class
export type DiceOptions = {
    anustart: Anustart
    assetPath: AssetPath
    collectionId: number
    enableShadows: boolean
    groupId: number
    id: number
    lights: Lights
    rollId: number
    scale: Scale
    scene: Scene
    sides: Sides
    theme: Theme
}

export type DirectionalLightType = {
    shadowGenerator?: ShadowGenerator
} & DirectionalLight
  
export type Lights = {
    directional: DirectionalLightType, 
    hemispheric: HemisphericLight
}

export type DiceBoxOptions = {
    aspect: number
    enableDebugging?: boolean
    enableShadows: boolean
    lights: Lights
    scene: Scene
}

export type DiceBoxDefaultOptions = {
    aspect: number
    enableDebugging: boolean
    enableShadows: boolean
}

export type DiceBoxConfig = {
    aspect: number
    enableDebugging: boolean
    enableShadows: boolean
    lights?: Lights
    scene?: Scene
}

export type DiceBoxCreateOptions = {
    aspect: number
}

export type OnMessage = { 
    data: { 
        action: string
        diceBuffer?: DiceBuffer
        options?: { 
             width: number
             height: number 
        }; 
        id?: number
        theme?: Theme
        port?: PhysicsWorkerPort
        die?: Dice
        rollId?: number
    } 
}

export type PhysicsWorkerPort = { 
    postMessage: (
        arg0: {
            action: string
            diceBuffer?: DiceBuffer
            anustart?: Anustart
            sides?: Sides
            scale?: Scale
            id?: number
            options?: unknown
        }, 
        arg1?: ArrayBufferLike[]
    ) => void;
    onmessage: (e: OnMessage) => void
}

export type Resize = {
    height: number
    width: number
}

export type InitSceneData = { 
    action: string
    diceBuffer?: DiceBuffer
    options: Resize & DiceOptions
    id?: number
    theme?: string
    port?: PhysicsWorkerPort
    canvas?: HTMLCanvasElement
    width?: number
    height?: number 
}

export type WorldOffScreenOptions = { 
    canvas: {
        transferControlToOffscreen: () => OffscreenCanvas
    } & HTMLCanvasElement
    options: {

    }
}

export type InitSceneConfig = {
    canvas: HTMLCanvasElement
    options: unknown
}