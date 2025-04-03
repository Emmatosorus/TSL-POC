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
    If, sin, cos, min, normalize, dot, cameraProjectionMatrix, add
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
const tailGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8, subdivisions, true)
tailGeometry.translate(0, 1, 0)

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

const sampleTexture = Fn(([t]) => {
    return texture(positionTexture, vec2(t, 0.5)).rgb
})


tailMaterial.vertexNode = Fn(() => {
    const t = uv().y.toVar()

    const posSample = sampleTexture(t).toVar()

    const delta = float(1.0).div(subdivisions).toVar()

    const posNext = sampleTexture(min(t.add(delta), float(1.0))).toVar()
    const tangent = posNext.sub(posSample).normalize()

    const up = vec3(0, 1, 0).toVar()
    const normal = normalize(up.sub(dot(up, tangent).mul(tangent))).toVar()
    const binormal = cross(tangent, normal).toVar()

    const localPos = positionGeometry.toVar()
    const rotatedPos = localPos.x.mul(normal).add(localPos.y.mul(tangent)).add(localPos.z.mul(binormal)).toVar()


    return cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(posSample.add(rotatedPos), 1.0))
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
camera.position.set(0, 10, 0)
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
        sphere.position.z -= 0.35
    }
    if (keysdown[1]) {
        sphere.position.z += 0.35
    }
    if (keysdown[2]) {
        sphere.position.x -= 0.35
    }
    if (keysdown[3]) {
        sphere.position.x += 0.35
    }

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