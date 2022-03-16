import { DirectionalLight, HemisphericLight, Mesh, Scene, ShadowGenerator } from "@babylonjs/core"
import Dice from "../components/Dice"

type Anustart = boolean
type AssetPath = string
type DiceBuffer = ArrayBufferLike
type Origin = string
type Scale = number
type Sides = number
type Theme = string
type Qty = number

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
    lights?: Lights
    scene?: Scene
} & DiceBoxDefaultOptions

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
        transferControlToOffscreen?: () => OffscreenCanvas
    } & HTMLCanvasElement
    options: WorldConfig
}

export type InitSceneConfig = {
    canvas: HTMLCanvasElement
    options: unknown
}

export type OnRollResult = {
    rollId: number
    value : number
}


export type InitDataOptions = {
    angularDamping: number
    friction: number
    gravity: number
    linearDamping: number
    mass: number
    restitution: number
    settleTimeout: number
    size: number
    spinForce: number
    startingHeight: number
    throwForce: number
}

export type InitData = { 
    height: number
    options: InitDataOptions
    width: number
}

export type PhysicsConfig = {
    assetPath?: AssetPath
    origin?: Origin
    scale?: number
    startPosition?: number[]
} & InitDataOptions

export type WorldConfig = {
    assetPath: AssetPath
    delay: number
    enableShadows: boolean 
    gravity: number
    id: string
    offscreen: boolean
    origin: Origin
    scale: Scale
    spinForce: number
    startingHeight: number
    theme: Theme
    throwForce: number
}

export type DiceRoll = {
    groupId: number
    id: number
    result: number
    rollId: number 
    sides: Sides
    theme: Theme
    value: number
}

export type RollResults = {
    modifier: number
    qty: Qty
    rolls: DiceRoll[]
    side: Sides
    value: number
}

export type Mods = {
    expr: {
        type: "number"
        value: number
    }
    highlow: "h"
    type: "keep"
}

export type Roll = {
    collectionId: number
    groupId: number
    id: number
    rollId: number
    sides: Sides
    theme: Theme
    value: number
}

export type Notation = {
    id: number
    mods: Mods[]
    qty: Qty
    rolls: Roll[]
    sides: Sides
    value: number
}

export type Collection = {
    anustart: boolean
    completedRolls: number
    id: number
    notation: Notation[]
    promise: Promise<unknown>
	resolve: (value: unknown) => void
	reject: (reason?: any) => void
    rolls: Roll[]
    theme?: Theme
}

export type CollectionOptions = { 
    anustart?: boolean; 
    id?: number; 
    notation?: Notation; 
    rolls?: Roll[] 
    theme?: Theme; 
}

export type RollGroup = { 
    theme: Theme
    groupId: number
    qty: Qty
    rollId: number
    id: number
    sides: Sides
    rolls: {} | {
        [key: number]: {
            collectionId: number
            id: number
            modifier?: number 
            value: number, 
        }
    }
    value: number
    modifier?: number
}