import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import {
    vec4,
    time,
    uv,
    positionLocal,
    texture,
    Fn,
    vec2,
    smoothstep,
    rotate,
    mul,
    pow
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Coffee Smoke ☕'})

/**
 * Base
 */

const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()
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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 200)
camera.position.set(8, 10, 12)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.target.y = 3
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
 * Model
 */
gltfLoader.load(
    './bakedModel.glb',
    (gltf) =>
    {
        gltf.scene.getObjectByName('baked').material.map.anisotropy = 8
        scene.add(gltf.scene)
    }
)

/**
 * Smoke
 */
const smokeGeometry = new THREE.PlaneGeometry(1, 1, 16, 64)
smokeGeometry.translate(0, 0.5, 0)
smokeGeometry.scale(1.5, 6, 1.5)

const smokeMaterial = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false
})

pane.addBinding(smokeMaterial, 'wireframe')

const perlinTexure = textureLoader.load('./perlin.png')
perlinTexure.wrapS = THREE.RepeatWrapping
perlinTexure.wrapT = THREE.RepeatWrapping

/**
 * -------- Coffee Smoke in TSL --------
 */

/**
 * Position Node
 */
smokeMaterial.positionNode = Fn(() => {

    const newPosition = positionLocal

    // Twist
    const twistPerlin = texture(perlinTexure, vec2(0.5, uv().y.mul(0.1).sub(time.mul(0.002)))).r
    const angle = twistPerlin.mul(10)
    newPosition.xz.assign(rotate(newPosition.xz, angle))

    // Wind
    const windOffset = vec2(
        texture(perlinTexure, vec2(0.25, time.mul(0.005))).r.sub(0.5),
        texture(perlinTexure, vec2(0.75, time.mul(0.005))).r.sub(0.5)
    )
    windOffset.mulAssign(mul(5, pow(uv().y, 2)))
    newPosition.xz.addAssign(windOffset)

    return newPosition
})()


/**
 * Fragment Node
 */

smokeMaterial.fragmentNode = Fn(() => {
    // Scale and animate
    const smokeUv = uv().toVar()
    smokeUv.x.mulAssign(0.5)
    smokeUv.y.mulAssign(0.3)
    smokeUv.y.subAssign(time.mul(0.03))

    const smoke = texture(perlinTexure, smokeUv).r

    // Remap
    smoke.assign(smoothstep(0.45, 1.0, smoke))

    // Smooth edges
    smoke.mulAssign(smoothstep(0.0, 0.1, uv().x))
    smoke.mulAssign(smoothstep(1.0, 0.9, uv().x))
    smoke.mulAssign(smoothstep(0.0, 0.2, uv().y))
    smoke.mulAssign(smoothstep(1.0, 0.4, uv().y))

    return vec4(0.6, 0.3, 0.2, smoke.mul(0.5))
})()

const smokeMesh = new THREE.Mesh(smokeGeometry, smokeMaterial)
smokeMesh.position.y = 1.83
scene.add(smokeMesh)

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