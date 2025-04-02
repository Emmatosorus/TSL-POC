import * as THREE from 'three/webgpu'
import {Pane} from 'tweakpane'
import {OrbitControls} from "three/addons";
import {
    Fn,
    vec2,
    positionLocal,
    positionGeometry,
    normalLocal,
    uniform,
    texture,
    length,
    float,
    mix,
    uv
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Ball Tail'})


/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

/**
 * Ball mesh
 */
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32)

const ballMaterial = new THREE.MeshStandardNodeMaterial({
})
const sphere = new THREE.Mesh(ballGeometry, ballMaterial)

/**
 * Plane mesh
 */
const coneGeometry = new THREE.ConeGeometry(0.5, 1.5, 32)
const coneMaterial = new THREE.MeshStandardNodeMaterial({
    color: '#ff6030'
})
const cone = new THREE.Mesh(coneGeometry, coneMaterial)
cone.position.y = 0.75

const ball = new THREE.Group()
ball.add(sphere)
ball.add(cone)

scene.add(ball)

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
camera.position.set(0, 0, 10)
scene.add(camera)

/**
 * SpotLight
 */
const spotLight = new THREE.SpotLight(0xffffff, 50)
spotLight.position.set(0, 0, 10)
scene.add(spotLight)

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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

pane.addBinding(rendererParameters, 'clearColor', {label: 'Clear Color'}).on('change', () => {
    renderer.setClearColor(rendererParameters.clearColor)
})

/**
 * Animate
 */
const clock = new THREE.Clock()
const tick = async () =>
{
    controls.update()

    const elapsedTime = clock.getElapsedTime()

    // Update ball
    const speeds = {
        x: Math.cos(elapsedTime) * 5,
        y: Math.sin(elapsedTime) * 5
    }
    console.log(speeds)

    // ball.position.x = speeds.x
    // ball.position.y = speeds.y


    spotLight.position.set(camera.position.x, camera.position.y, camera.position.z)

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()