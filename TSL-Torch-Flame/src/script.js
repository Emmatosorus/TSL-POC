import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import {cameraProjectionMatrix, float, Fn, modelViewMatrix, positionGeometry, time, vec4} from "three/tsl";
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
 * Flame Geometry
 */
let planes = []
const leafCount = 10

for (let i = 0; i < leafCount; i++) {
    const plane = new THREE.BoxGeometry(0.1, 0.1, 0.1)
    planes.push(plane)

    const position = new THREE.Vector3()
    position.x = (Math.random() - 0.5) * 0.75
    position.y = (Math.random() - 0.5) * 0.75
    position.z = (Math.random() - 0.5) * 0.75

    plane.translate(position.x, position.y, position.z)
}

const bushGeometry = mergeGeometries(planes)

/**
 * Flame Material
 */

const material = new THREE.MeshBasicNodeMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
})

material.vertexNode = Fn(() => {
    let timeFactor = time.mul(0.1).modAssign(1.0).toVar()

    const scale = float(2.0).mul(timeFactor.oneMinus())

    let newPos = positionGeometry.mul(scale).toVar()

    newPos.y.addAssign(timeFactor.mul(2.0))

    return cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(newPos, 1.0))
})()

/**
 * Flame Mesh
 */
const mesh = new THREE.InstancedMesh(bushGeometry, material, 5)

for (let i = 0; i < mesh.count; i++) {
    const matrix = new THREE.Matrix4()
    const x = (Math.random() - 0.5) * 10
    const y = (Math.random() - 0.5) * 10
    const z = (Math.random() - 0.5) * 10
    matrix.setPosition(x, y, z)
    mesh.setMatrixAt(i, matrix)
}

scene.add(mesh)

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