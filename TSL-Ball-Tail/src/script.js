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
    uv,
    positionWorld,
    remapClamp,
    abs,
    normalWorld,
    attribute,
    vec3,
    modelViewMatrix,
    vec4,
    cross,
    acos,
    mat4,
    clamp,
    If, sin, cos
} from "three/tsl";
import * as rotationMatrix from "three/tsl";

// Debug
const pane = new Pane({title: 'Ball Tail'})


/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

/**
 * Sphere
 */
const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32)

const sphereMaterial = new THREE.MeshBasicNodeMaterial({
})
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

/**
 * Tail
 */
const subdivisions = 16
const tailGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 4, subdivisions, true)

const tailMaterial = new THREE.MeshBasicNodeMaterial({ wireframe: true })

const ballPositions = new Float32Array(subdivisions * 4)

const positionTexture = new THREE.DataTexture(
    ballPositions,
    subdivisions,
    1,
    THREE.RGBAFormat,
    THREE.FloatType
)
positionTexture.needsUpdate = true;

tailMaterial.positionNode = Fn(() => {
    // Ratio
    const ratio = positionGeometry.x.oneMinus()

    // Trail data
    const trailData = texture(positionTexture, vec2(ratio, 0.5)).toVar()
    const trailPosition = trailData.xyz

    // Direction
    const nextPosition = texture(positionTexture, vec2(ratio.add(subdivisions), 0.5)).xyz
    const direction = nextPosition.sub(trailPosition).normalize().toVar()

    // Rotated position
    const basePosition = vec3(positionGeometry.x, positionGeometry.y, 0)
    const rotatedPoint = rotationMatrix.mul(direction).mul(basePosition).toVar()

    // Normal
    const customNormal = modelViewMatrix.mul(vec4(rotationMatrix.mul(attribute('normal')), 0))


    return trailPosition.add(rotatedPoint)

})().debug((t) => {
    console.log(t)
})

const tail = new THREE.Mesh(tailGeometry, tailMaterial)

/**
 * Ball Group
 */
const ball = new THREE.Group()
ball.add(sphere)
ball.add(tail)

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

const keysdown = [false, false, false, false]

window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyW') {
        keysdown[0] = true
    }
    if (event.code === 'KeyS') {
        keysdown[1] = true
    }
    if (event.code === 'KeyA') {
        keysdown[2] = true
    }
    if (event.code === 'KeyD') {
        keysdown[3] = true
    }
})

window.addEventListener('keyup', (event) => {
    if (event.code === 'KeyW') {
        keysdown[0] = false
    }
    if (event.code === 'KeyS') {
        keysdown[1] = false
    }
    if (event.code === 'KeyA') {
        keysdown[2] = false
    }
    if (event.code === 'KeyD') {
        keysdown[3] = false
    }
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 0, 10)
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

pane.addBinding(rendererParameters, 'clearColor', {label: 'Clear Color'}).on('change', () => {
    renderer.setClearColor(rendererParameters.clearColor)
})

/**
 * Animate
 */
const clock = new THREE.Clock()

const positions = []
const tick = async () =>
{
    controls.update()

    const elapsedTime = clock.getElapsedTime()

    // Update sphere
    if (keysdown[0]) {
        sphere.position.y += 0.35
    }
    if (keysdown[1]) {
        sphere.position.y -= 0.35
    }
    if (keysdown[2]) {
        sphere.position.x -= 0.35
    }
    if (keysdown[3]) {
        sphere.position.x += 0.35
    }

    console.log(sphere.position)

    // Update tail
    if (keysdown[0] || keysdown[1] || keysdown[2] || keysdown[3]) {
        positions.unshift(sphere.position.x, sphere.position.y, sphere.position.z, 1.0)
        if (positions.length > subdivisions * 4) {
            positions.pop()
            positions.pop()
            positions.pop()
            positions.pop()
        }
        ballPositions.set(positions)
        positionTexture.needsUpdate = true;
    }


    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()