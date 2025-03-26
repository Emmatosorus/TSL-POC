import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import {
    Fn,
    positionGeometry,
    vec3,
    sin,
    uniform,
    vec2,
    vec4,
    modelWorldMatrix,
    cameraViewMatrix,
    cameraProjectionMatrix,
    positionWorld,
    positionLocal,
    varying,
    mix,
    float,
    mx_noise_float,
    time,
    Loop,
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Raging Sea 😡🌊'})

/**
 * Base
 */

const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

/**
 * Water
 */
const waterGeometry = new THREE.PlaneGeometry(2, 2, 1024, 1024)

const waterMaterial = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide
})

pane.addBinding(waterMaterial, 'wireframe', {label: 'Wireframe'})

/**
 * ------------ Water Material TSL ---------------
 */

/**
 * VertexNode
 */

const bigWaveElevation = uniform(0.13)
const bigWaveFrequency = uniform(vec2(5.88, 4.85))
const bigWaveSpeed = uniform(0.91)

const bigWaveDebug = pane.addFolder({title: 'Big waves'})
bigWaveDebug.addBinding(bigWaveElevation, 'value', {label: 'Wave elevation', min: 0, max: 1})
bigWaveDebug.addBinding(bigWaveFrequency, 'value', {label: 'Wave frequency', min: 0, max: 10})
bigWaveDebug.addBinding(bigWaveSpeed, 'value', {label: 'Wave speed', min: 0, max: 4})

const uSmallWavesElevation = uniform(0.21)
const uSmallWavesFrequency = uniform(3.91)
const uSmallWavesSpeed = uniform(0.35)
const uSmallWavesIterations = uniform(5)

const smallWaveDebug = pane.addFolder({title: 'Small waves'})
smallWaveDebug.addBinding(uSmallWavesElevation, 'value', {label: 'Small wave elevation', min: 0, max: 1})
smallWaveDebug.addBinding(uSmallWavesFrequency, 'value', {label: 'Small wave frequency', min: 0, max: 30})
smallWaveDebug.addBinding(uSmallWavesSpeed, 'value', {label: 'Small wave speed', min: 0, max: 4})
smallWaveDebug.addBinding(uSmallWavesIterations, 'value', {label: 'Small wave iterations', min: 0, max: 5, step: 1})

let vElevation = varying(float())

const posFunc = Fn(() => {

    const modelPosition = modelWorldMatrix.mul(vec4(positionGeometry, 1.0))

    const elevation = sin(modelPosition.x.mul(bigWaveFrequency.x).add(time).mul(bigWaveSpeed)).mul(
                    sin(modelPosition.z.mul(bigWaveFrequency.y).add(time).mul(bigWaveSpeed))).mul(
                    bigWaveElevation).toVar()

    Loop({ start: float(1), end: uSmallWavesIterations, condition: '<='}, ({ i }) => {

        const noiseInput = vec3(
            modelPosition.xz.add(2.0).mul(uSmallWavesFrequency).mul(i),
            time.mul(uSmallWavesSpeed)
        )

        elevation.subAssign(
            mx_noise_float(noiseInput, 1, 0).mul(uSmallWavesElevation).div(i).abs()
        )

    })

    modelPosition.y.addAssign(elevation)

    const viewPosition = cameraViewMatrix.mul(modelPosition)
    const projectionPosition = cameraProjectionMatrix.mul(viewPosition)

    vElevation.assign(elevation)

    return projectionPosition
})

waterMaterial.vertexNode = posFunc()

/**
 * Fragment Node
 */

const depthColors = {
    depthColor: '#ff0a81',
    surfaceColor: '#271442'
}
const uDepthColor = uniform(new THREE.Color(depthColors.depthColor))
const uSurfaceColor = uniform(new THREE.Color(depthColors.surfaceColor))
const uColorOffset = uniform(0.2)
const uColorMultiplier = uniform(5.11)

const colorDebug = pane.addFolder({title: 'Colors'})
colorDebug.addBinding(depthColors, 'depthColor', {label: 'Depth color'}).on('change', (ev) =>{
    uDepthColor.value = new THREE.Color(ev.value)
    })
colorDebug.addBinding(depthColors, 'surfaceColor', {label: 'Surface color'}).on('change', (ev) =>{
    uSurfaceColor.value = new THREE.Color(ev.value)
})
colorDebug.addBinding(uColorOffset, 'value', {label: 'Color offset', min: 0, max: 1})
colorDebug.addBinding(uColorMultiplier, 'value', {label: 'Color multiplier', min: 0, max: 10})

const fragFunc = Fn(() => {
    const mixStrength = vElevation.add(uColorOffset).mul(uColorMultiplier)

    const color = mix(uDepthColor, uSurfaceColor, mixStrength)

    return vec4(color, 1.0)
})

waterMaterial.fragmentNode = fragFunc()

/**
 * ------------ End of TSL ------------
 */

const water = new THREE.Mesh(waterGeometry, waterMaterial)
water.rotation.x = - Math.PI * 0.5
scene.add(water)

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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(1, 1, 3)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */

const tick = () =>
{
    controls.update()

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()