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
    length
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Ball Tail'})


/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

/**
 * Displacement
 */
const displacement = {}

// 2D canvas
displacement.canvas = document.createElement('canvas')
displacement.canvas.width = 128
displacement.canvas.height = 128
displacement.canvas.style.position = 'fixed'
displacement.canvas.style.width = '256px'
displacement.canvas.style.height = '256px'
displacement.canvas.style.top = 0
displacement.canvas.style.left = 0
displacement.canvas.style.zIndex = 10
document.body.append(displacement.canvas)

displacement.context = displacement.canvas.getContext('2d')
displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)

displacement.glowImage = new Image()
displacement.glowImage.src = './glow.png'

// Interactive plane
displacement.interactivePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide})
)
displacement.interactivePlane.position.z = 1
// displacement.interactivePlane.visible = false
scene.add(displacement.interactivePlane)

// Raycaster
displacement.raycaster = new THREE.Raycaster()
// Coordinates
displacement.screenCursor = new THREE.Vector2(9999, 9999)
displacement.canvasCursor = new THREE.Vector2(9999, 9999)

// Textures
displacement.texture = new THREE.CanvasTexture(displacement.canvas)


/**
 * Ball mesh
 */
const geometry = new THREE.SphereGeometry(0.5, 32, 32)

const material = new THREE.MeshBasicNodeMaterial({
    color: '#ffffff',
})

material.positionNode

const mesh = new THREE.Mesh(geometry, material)
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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, -0, -10)
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
const tick = async () =>
{
    controls.update()

    const elapsedTime = clock.getElapsedTime()

    // Update ball
    mesh.position.y = Math.sin(elapsedTime) * 5
    mesh.position.x = Math.cos(elapsedTime) * 5

    /**
     * Raycaster
     */
    displacement.raycaster.set(mesh.position, new THREE.Vector3(0, 0, 1))
    const intersections = displacement.raycaster.intersectObject(displacement.interactivePlane)

    if(intersections.length)
    {
        const uv = intersections[0].uv
        displacement.canvasCursor.x = (1 - uv.x) * displacement.canvas.width
        displacement.canvasCursor.y = (1 - uv.y) * displacement.canvas.height
    }

    // Fade out
    displacement.context.globalCompositeOperation = 'source-over'
    displacement.context.globalAlpha = 0.05
    displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height)

    // Draw glow
    const glowSize = displacement.context.canvas.width * 0.25
    displacement.context.globalAlpha = 1
    displacement.context.globalCompositeOperation = 'lighten'
    displacement.context.drawImage(
        displacement.glowImage,
        displacement.canvasCursor.x - (glowSize * 0.5),
        displacement.canvasCursor.y - (glowSize * 0.5),
        glowSize,
        glowSize
    )

    displacement.texture.needsUpdate = true

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()