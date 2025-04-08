import * as THREE from 'three/webgpu'
import {Pane} from 'tweakpane'
import {OrbitControls} from "three/addons";
import {
    Fn,
    vec2,
    positionGeometry,
    uniform,
    texture,
    float,
    uv,
    vec3,
    modelViewMatrix,
    vec4,
    cross,
    min,
    normalize,
    dot,
    cameraProjectionMatrix,
    smoothstep
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Ball Tail'})

/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

/**
 * ball
 */
const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32)

const ballMaterial = new THREE.MeshBasicNodeMaterial()



const ball = new THREE.Mesh(ballGeometry, ballMaterial)

/**
 * Tail
 */
const subdivisions = 16
const tailGeometry = new THREE.CylinderGeometry(-0.5, 0.5, 2, 8, subdivisions, true)
tailGeometry.translate(0, 1, 0)

const tailMaterial = new THREE.MeshBasicNodeMaterial({
    wireframe: false,
    transparent: true,
    side: THREE.DoubleSide,
})
pane.addBinding(tailMaterial, 'wireframe', {label: 'Wireframe'})

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

const uColor = uniform(new THREE.Color('#00ffff'))

pane.addBinding({color : '#00ffff'}, 'color', {label: 'Color'}).on('change', (ev) => {
    uColor.value.set(ev.value)
})

tailMaterial.fragmentNode = Fn(() => {

    const alpha = float(1.0).mul(uv().y.oneMinus()).toVar()

    alpha.mulAssign(smoothstep(8.0, 0.1, uv().y.mul(20)))

    return vec4(uColor, alpha)
})().debug((t) => {
    console.log(t)
})

const tail = new THREE.Mesh(tailGeometry, tailMaterial)

const all = new THREE.Group()
all.add(ball)
all.add(tail)
scene.add(all)

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

all.position.set(1, 0, 1)

const positions = []
const tick = async () =>
{
    controls.update()

    const elapsedTime = clock.getElapsedTime()

    // Update sphere
    // ball.position.x = Math.sin(elapsedTime) * 5
    // ball.position.z = Math.cos(elapsedTime) * 5

    if (keysdown[0]) {
        ball.position.z -= 0.35
    }
    if (keysdown[1]) {
        ball.position.z += 0.35
    }
    if (keysdown[2]) {
        ball.position.x -= 0.35
    }
    if (keysdown[3]) {
        ball.position.x += 0.35
    }

    // Update tail
        positions.unshift(ball.position.x, ball.position.y, ball.position.z, 1.0)
        if (positions.length > subdivisions * 4) {
            positions.pop()
            positions.pop()
            positions.pop()
            positions.pop()
        }
        ballPositions.set(positions)
        positionTexture.needsUpdate = true;

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()