import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import {
    vec4,
    time,
    Fn,
    vec2,
    smoothstep,
    pow,
    positionWorld,
    mod,
    dot,
    cameraPosition,
    If,
    uniform,
    fract,
    sin,
    normalWorld,
    positionLocal, materialColor
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Halftone Shader 🔴'})
const debugObject = {}

/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

// Loaders
const gltfLoader = new GLTFLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 200)
camera.position.set(7, 7, 7)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const rendererParameters = {}
rendererParameters.clearColor = '#26132f'

const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setClearColor(rendererParameters.clearColor)
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

pane.addBinding(rendererParameters, 'clearColor', {label: 'Clear Color'}).on('change', () => {
    renderer.setClearColor(rendererParameters.clearColor)
})

/**
 * Material
 */
const material = new THREE.MeshBasicNodeMaterial()

pane.addBinding(material, 'wireframe')

debugObject.materialColor = '#ff794d'
const uColor = uniform(new THREE.Color(debugObject.materialColor))
pane.addBinding(debugObject, 'materialColor', {label: 'Color'}).on('change', () => {
    uColor.value = new THREE.Color(debugObject.holographicColor)
})

/**
 * Vertex shader
 */
material.positionNode = Fn(() => {
    return positionLocal
})()

/**
 * Fragment shader
 */
material.fragmentNode = Fn(() => {
    return vec4(uColor, 1.0)
})()

/**
 * Objects
 */
const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
    material
)
torusKnot.position.x = 3
scene.add(torusKnot)

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(),
    material
)
sphere.position.x = - 3
scene.add(sphere)

let suzanne = null
gltfLoader.load(
    './suzanne.glb',
    (gltf) =>
    {
        suzanne = gltf.scene
        suzanne.traverse((child) =>
        {
            if(child.isMesh)
                child.material = material
        })
        scene.add(suzanne)
    }
)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    if(suzanne)
    {
        suzanne.rotation.x = - elapsedTime * 0.1
        suzanne.rotation.y = elapsedTime * 0.2
    }

    sphere.rotation.x = - elapsedTime * 0.1
    sphere.rotation.y = elapsedTime * 0.2

    torusKnot.rotation.x = - elapsedTime * 0.1
    torusKnot.rotation.y = elapsedTime * 0.2

    controls.update()

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()