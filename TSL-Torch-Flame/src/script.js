import {
    AmbientLight,
    PerspectiveCamera,
    Scene,
    WebGPURenderer,
} from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import Stats from "three/addons/libs/stats.module.js";
import {GLTFLoader} from "three/addons";

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
const scene = new Scene()
const ambiantLight = new AmbientLight(0xffffff, 10)
scene.add(ambiantLight)

pane.addBinding(ambiantLight, 'intensity', {
  label: 'Ambient Light Intensity',
    min: 0,
    max: 10,
    step: 0.1
})

/**
 * Mounted Torch Model
 */
const gltfLoader = new GLTFLoader()
gltfLoader.load('wall_mounted_torch.glb', (glb) => {
    console.log('glb', glb.scene.children[0])
    scene.add(glb.scene.children[0])
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
const camera = new PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 200)
camera.position.set(4, 2, 5)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new WebGPURenderer({
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