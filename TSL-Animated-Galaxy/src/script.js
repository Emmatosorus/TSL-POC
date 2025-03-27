import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import {
    vec3,
    sin,
    uniform,
    vec4,
    mix,
    float,
    time,
    range,
    PI2,
    cos,
    uv,
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
parameters.count = 20000
parameters.branches = 3
parameters.insideColor = '#ff6030'
parameters.outsideColor = '#1b3984'

let geometry = null
let material = null
let mesh = null

const size = uniform(0.25)
const radius = uniform(5)
const branches = uniform(parameters.branches)
const randomnessPower = uniform(1.5)

const inOutLimit = uniform(1.5)

geometry = new THREE.PlaneGeometry(1, 1)

material = new THREE.SpriteNodeMaterial({
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
})

/**
 * --------- Animated Galaxy in TSL ---------
 */


/**
 * Calculate the position of the plane
 */

// We set a scale for each plane
material.scaleNode = range(0, 1).mul(size)

// We get a random value between 0 and 1 for each plane
const radiusRatio = range(0, 1).toVar()
// We place the plane at a random position on the radius/branch
const newRadius = radiusRatio.pow(randomnessPower).mul(radius).toVar()

// We choose which branch the plane is on
const branchAngle = range(0, branches).floor().mul(PI2.div(branches)).toVar()
// We rotate the plan on its branch over time, we multiplie the time to make sure that the outer planes rotate slower
// This creates the spiral effect
const angle = branchAngle.add( time.mul(radiusRatio.oneMinus())).toVar()

// We create the new position of the plane on the branch
const position = vec3(sin(angle), 0, cos(angle)).mul(newRadius).toVar()

// We add some randomness to the position
const randomOffset = range(vec3(-1), vec3(1)).pow(3).mul(radiusRatio).toVar()

material.positionNode = position.add(randomOffset)

/**
 * Calculate the color of the plane
 */

const colorInside = uniform( new THREE.Color( parameters.insideColor ) );
const colorOutside = uniform( new THREE.Color( parameters.outsideColor ) );

// We interpolate the color between the inside and the outside of the galaxy
const colorFinal = mix(colorInside, colorOutside, radiusRatio.pow(inOutLimit)).toVar()

const alpha = float(0.1) // We lower the intensity to make the plane mor transparent
    .div(uv().sub(0.5).length()) // We take the uv coordinates, we center them around 0, we then calculate the distance from the center
                                // This makes the center (where length() is smallest) brighter (high alpha), while edges (where length() is large) dimmer
    .sub(0.4) // We remove 0.2 so that areas where 0.1 / length() is less than 0.2 become completely transparent
    .sub(0.4) // We remove 0.2 so that areas where 0.1 / length() is less than 0.2 become completely transparent

material.colorNode = vec4(colorFinal, alpha)

/**
 * --------- End of TSL ---------
 */

const generateGalaxy = () =>
{
    if(mesh !== null) {
        scene.remove(mesh)
    }

    mesh = new THREE.InstancedMesh(geometry, material, parameters.count)
    scene.add(mesh)
}

/**
 * Debug
 */
const posDebug = pane.addFolder({title: 'Positions'})

posDebug.addBinding(size, 'value', {min: 0, max: 1, step: 0.001, label: 'Particle size'})
posDebug.addBinding(parameters, 'count', {min: 0, max: 100000, step: 1, label: 'Particle count'}).on('change', (event) => {
    if (event.last) {
        generateGalaxy()
    }
})
posDebug.addBinding(radius, 'value', {min: 1, max: 20, step: 0.01, label: 'Galaxy radius'})
posDebug.addBinding(parameters, 'branches', {min: 2, max: 20, step: 1, label: 'Galaxy branches'}).on('change', (event) => {
    if (event.last) {
        branches.value = event.value
        generateGalaxy()
    }
})
posDebug.addBinding(randomnessPower, 'value', {min: 0, max: 5, step: 0.001, label: 'Particle randomnessPower'})


const colorDebug = pane.addFolder({title: 'Colors'})

colorDebug.addBinding(inOutLimit, 'value', {min: 0.3, max: 5, step: 0.01, label: 'Inside/Outside limit'})
colorDebug.addBinding(parameters, 'insideColor', {label: 'Galaxy inside color'}).on('change', (event) => {
    colorInside.value = new THREE.Color(event.value)
})
colorDebug.addBinding(parameters, 'outsideColor', {label: 'Galaxy outside color'}).on('change', (event) => {
    colorOutside.value = new THREE.Color(event.value)
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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 200)
camera.position.set(4, 2, 5)
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
 * Generate Galaxy
 */
generateGalaxy()

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