import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import {
    cameraProjectionMatrix,
    float,
    Fn,
    modelViewMatrix,
    positionGeometry,
    range,
    time, vec3,
    vec4
} from "three/tsl";
import Stats from "three/addons/libs/stats.module.js";

// Debug
const pane = new Pane({title: 'Torch Flame 🔥'})
const stats = new Stats()
stats.domElement.style.position = 'absolute'
stats.domElement.style.top = '0px'
document.body.appendChild(stats.dom)

/**
 * Base
 */

const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

/**
 * Flame Variables
 */
const Flames = {}
Flames.cubeCount = 10
Flames.flameCount = 1000

/**
 * Flame Geometry
 */
const cubeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)

/**
 * Flame Material
 */

const flameMaterial = new THREE.MeshBasicNodeMaterial({
    color: 0xffaa00,
})

/**
 * Flame Mesh
 */
const mesh = new THREE.InstancedMesh(cubeGeometry, flameMaterial, Flames.cubeCount)

for (let i = 0; i < Flames.cubeCount; i++) {
    const matrix = new THREE.Matrix4()
    const x = (Math.random() - 0.5) * 0.75
    const y = (Math.random() - 0.5) * 0.75
    const z = (Math.random() - 0.5) * 0.75

    matrix.setPosition(x, y, z)
    mesh.setMatrixAt(i, matrix)
}

scene.add(mesh)

/**
 * ------------ Flame in TSL ------------
 */

flameMaterial.vertexNode = Fn(() => {
    const randomness = vec3(
        range(-0.75, 0.75),
        range(-0.75, 0.75),
        range(-0.75, 0.75)
    ).toConst()

    let timeFactor = time.mul(0.1).toVar()

    const scale = float(2.0).mul(timeFactor.mod(1.0).oneMinus())

    let newPos = positionGeometry.add(randomness).mul(scale).toVar()

    newPos.y.addAssign(timeFactor.mul(2.0))
    newPos.y.modAssign(1.0)

    return cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(newPos, 1.0))
})().debug()

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
 * Animate
 */

const tick = () =>
{
    stats.begin()

    controls.update()

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)

    stats.end()
}

tick()