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
 * Galaxy
 */
const parameters = {}
parameters.count = 200000
parameters.size = 0.005
parameters.radius = 5
parameters.branches = 3
parameters.spin = 1
parameters.randomness = 0.5
parameters.randomnessPower = 3
parameters.insideColor = '#ff6030'
parameters.outsideColor = '#1b3984'

let geometry = null
let material = null
let points = null

const generateGalaxy = () =>
{
    if(points !== null)
    {
        geometry.dispose()
        material.dispose()
        scene.remove(points)
    }

    /**
     * Geometry
     */
    geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(parameters.count * 3)
    const colors = new Float32Array(parameters.count * 3)

    const insideColor = new THREE.Color(parameters.insideColor)
    const outsideColor = new THREE.Color(parameters.outsideColor)

    for(let i = 0; i < parameters.count; i++)
    {
        const i3 = i * 3

        // Position
        const radius = Math.random() * parameters.radius

        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness * radius
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness * radius
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness * radius

        positions[i3    ] = Math.cos(branchAngle) * radius + randomX
        positions[i3 + 1] = randomY
        positions[i3 + 2] = Math.sin(branchAngle) * radius + randomZ

        // Color
        const mixedColor = insideColor.clone()
        mixedColor.lerp(outsideColor, radius / parameters.radius)

        colors[i3    ] = mixedColor.r
        colors[i3 + 1] = mixedColor.g
        colors[i3 + 2] = mixedColor.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    /**
     * Material
     */
    material = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    })

    /**
     * Points
     */
    points = new THREE.Points(geometry, material)
    scene.add(points)
}

generateGalaxy()

pane.addBinding(parameters, 'count', {min: 100, max: 1000000, step: 100, label: 'Particle count'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})

pane.addBinding(parameters, 'radius', {min: 0.01, max: 20, step: 0.01, label: 'Galaxy radius'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})

pane.addBinding(parameters, 'branches', {min: 2, max: 20, step: 1, label: 'Galaxy branches'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})

pane.addBinding(parameters, 'randomness', {min: 0, max: 2, step: 0.001, label: 'Particle randomness'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})

pane.addBinding(parameters, 'randomnessPower', {min: 1, max: 10, step: 0.001, label: 'Particle randomnessPower'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})

pane.addBinding(parameters, 'insideColor', {label: 'Galaxy inside color'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})

pane.addBinding(parameters, 'outsideColor', {label: 'Galaxy outside color'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})



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
camera.position.set(3, 3, 3)
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