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
    positionLocal
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Hologram Shader 🌐'})
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
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
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
rendererParameters.clearColor = '#1d1f2a'

const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setClearColor(rendererParameters.clearColor)
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

pane.addBinding(rendererParameters, 'clearColor', {label: 'Clear Color'}).on('change', () => {
    renderer.setClearColor(rendererParameters.clearColor)
})

/**
 * Material
 */
const material = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
})

pane.addBinding(material, 'wireframe')

debugObject.holographicColor = '#70c1ff'
const uColor = uniform(new THREE.Color(debugObject.holographicColor))
pane.addBinding(debugObject, 'holographicColor', {label: 'Color'}).on('change', () => {
    uColor.value = new THREE.Color(debugObject.holographicColor)
})

/**
 * Vertex shader
 */
// Function that returns a "random" float in range [0.0, 1.0[
const random2D = Fn(([value]) => {
    return fract(sin(dot(value.xy, vec2(12.9898, 78.233))).mul(43758.5453123))
})


material.positionNode = Fn(() => {
    // Position
    const position = positionLocal.toVar()

    // Glitch
    const glitchTime = time.sub(positionWorld.y).toVar()
    const glitchStrength = sin(glitchTime).add(sin(glitchTime.mul(3.45))).add(sin(glitchTime.mul(8.76))).div(3.0).toVar()
    glitchStrength.assign(smoothstep(0.3, 1.0, glitchStrength).mul(0.25))
    position.x.addAssign(random2D(position.xz.add(time)).sub(0.5).mul(glitchStrength))
    position.z.addAssign(random2D(position.zx.add(time)).sub(0.5).mul(glitchStrength))

    return position
})()

/**
 * Fragment shader
 */
material.fragmentNode = Fn(() => {
    // Normal
    const normal = normalWorld
    If(dot(normal, cameraPosition).lessThan(0.0), () => {
        normal.mulAssign(-1.0)
    })

    // Stripes
    const stripes = mod(positionWorld.y.sub(time.mul(0.02)).mul(20), 1.0).toVar()
    stripes.assign(pow(stripes, 3.0))

    // Fresnel
    const viewDirection = positionWorld.sub(cameraPosition).normalize().toVar()
    const fresnel = dot(viewDirection, normal).add(1.0).toVar()
    fresnel.assign(pow(fresnel, 4.0))

    // Falloff
    const falloff = smoothstep(0.8, 0.0, fresnel).toVar()

    // Holographic
    const holographic = stripes.mul(fresnel).toVar()
    holographic.addAssign(fresnel.mul(1.25))
    holographic.mulAssign(falloff)

    return vec4(uColor, holographic)
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