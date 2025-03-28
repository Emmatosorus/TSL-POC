import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import {
    vec4,
    Fn,
    vec2,
    smoothstep,
    mod,
    dot,
    uniform,
    normalWorld,
    screenCoordinate,
    vec3,
    distance,
    step,
    mul,
    float,
    mix,
    assign, output
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

    // Update Material
    uResolution.value = new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)


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
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 3)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 8)
directionalLight.position.set(1, 1, 0)
scene.add(directionalLight)

/**
 * ---------- Halftone Shader in TSL ----------
 */

debugObject.materialColor = '#ff794d'
const uColor = uniform(new THREE.Color(debugObject.materialColor))
pane.addBinding(debugObject, 'materialColor', {label: 'Material Color'}).on('change', () => {
    uColor.value = new THREE.Color(debugObject.materialColor)
})

const uResolution = uniform(new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio))

debugObject.shadowRepetitions = 100
const uShadowRepetition = uniform(debugObject.shadowRepetitions)
pane.addBinding(debugObject, 'shadowRepetitions', {label: 'Shadow Repetitions', min: 10, max: 200}).on('change', () => {
    uShadowRepetition.value = debugObject.shadowRepetitions
})

debugObject.shadowColor = '#8e19b8'
const uShadowColor = uniform(new THREE.Color(debugObject.shadowColor))
pane.addBinding(debugObject, 'shadowColor', {label: 'Shadow Color'}).on('change', () => {
    uShadowColor.value = new THREE.Color(debugObject.shadowColor)
})

debugObject.LightRepetition = 100
const uLightRepetition = uniform(debugObject.LightRepetition)
pane.addBinding(debugObject, 'LightRepetition', {label: 'Light Repetitions', min: 10, max: 200}).on('change', () => {
    uLightRepetition.value = debugObject.LightRepetition
})

debugObject.lightColor = '#e5ffe0'
const uLightColor = uniform(new THREE.Color(debugObject.lightColor))
pane.addBinding(debugObject, 'lightColor', {label: 'Light Color'}).on('change', () => {
    uLightColor.value = new THREE.Color(debugObject.lightColor)
})

/**
 * Fragment shader
 */
const halftone = Fn(([color, repetitions, direction, low, high]) => {
    const intensity = dot(normalWorld, direction)
    intensity.assign(smoothstep(low, high, intensity))

    const uv = vec2(screenCoordinate.x, uResolution.y.sub(screenCoordinate.y)).toVar();
    uv.divAssign(uResolution.y)
    uv.mulAssign(repetitions)
    uv.assign(mod(uv, 1.0))

    const point = distance(uv, vec2(0.5))
    point.assign(step(mul(0.5, intensity), point).oneMinus())

    return vec4(color, point)
})

const halftones = Fn(([ input ]) => {

    const finalColor = input

    // Halftone
    let color = halftone(uShadowColor, uShadowRepetition, vec3(0.0, -1.0, 0.0), float(-0.8), float(1.5)).toVar()
    finalColor.rgb.assign(mix( finalColor.rgb, color.rgb, color.a ))

    color.assign(halftone(uLightColor, uLightRepetition, vec3(1.0, 1.0, 0.0), float(0.5), float(1.5)))
    finalColor.rgb.assign(mix( finalColor.rgb, color.rgb, color.a ))

    return finalColor
})

/**
 * Material
 */
const material = new THREE.MeshStandardNodeMaterial({
    color: debugObject.materialColor
})
material.outputNode = halftones( output )

/**
 * ---------- End of TSL ----------
 */

pane.addBinding(material, 'wireframe')

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

let glbModel = null
gltfLoader.load(
    './Michelle.glb',
    (gltf) =>
    {
        glbModel = gltf.scene
        glbModel.position.y = - 2;
        glbModel.scale.setScalar( 2.5 );
        glbModel.traverse((child) =>
        {
            if(child.isMesh)
                child.material.outputNode = halftones(output)
        })
        scene.add(glbModel)
    }
)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    sphere.rotation.x = - elapsedTime * 0.1
    sphere.rotation.y = elapsedTime * 0.2

    torusKnot.rotation.x = - elapsedTime * 0.1
    torusKnot.rotation.y = elapsedTime * 0.2

    controls.update()

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()