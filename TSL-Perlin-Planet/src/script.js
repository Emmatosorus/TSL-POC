import * as THREE from 'three/webgpu'
import {Pane} from 'tweakpane'
import {OrbitControls} from "three/addons";
import {
    Fn,
    vec2,
    positionLocal,
    positionGeometry,
    mx_noise_float,
    normalLocal,
    uniform,
    texture,
    length
} from "three/tsl";

// Debug
const pane = new Pane({title: '🌎 Planet 🌎'})


/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()


/**
 * Textures
 */
const tex = new THREE.TextureLoader()
    .load("gradiant.jpg");

/**
 * Ambient light
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.5)
scene.add(ambientLight)

/**
 * Directional light
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
directionalLight.position.set(0, 1, -8)
directionalLight.lookAt(0, 0, 0)
scene.add(directionalLight)

/**
 * Test mesh
 */
const geometry = new THREE.SphereGeometry(5, 1024, 1024)

const material = new THREE.MeshStandardNodeMaterial({
    color: '#ffffff',
    metalness: 0.3,
    roughness: 0.4
})

/**
 * ----------- Perlin Planet in TSL -----------
 */

const noiseMultiplier = uniform(2.0)
const amplitude = uniform(0.3)
const perlinSeed = uniform(Math.random() * 5)

const vertexDebug = pane.addFolder({title: 'Shape'})
vertexDebug.addBinding(noiseMultiplier, 'value', {min: 0.2, max: 4, label: 'Noise'})
vertexDebug.addBinding(amplitude, 'value', {min: 0.1, max: 1, label: 'Amplitude'})
vertexDebug.addButton({title: 'Regenerate seed'}).on('click', () => {
    perlinSeed.value = Math.random() * 5
})

const posFunc = Fn(() => {
    const originalPos = positionGeometry;

    const noise = mx_noise_float(originalPos.mul(noiseMultiplier).add(perlinSeed));

    const displacement = noise.mul(amplitude);

    const newPosition = originalPos.add(normalLocal.mul(displacement));

    return newPosition;
});

material.positionNode = posFunc()

const texPosMultiplier = uniform(3.2)
const texPosSub = uniform(0.12)

const textureDebug = pane.addFolder({title: 'Texture'})
textureDebug.addBinding(texPosMultiplier, 'value', {min: 0, max: 15, label: 'Texture multiplier'})
textureDebug.addBinding(texPosSub, 'value', {min: -1, max: 1, label: 'Texture sub'})


const uvFunc = Fn(() => {
    const height = length(positionLocal).sub(length(positionGeometry).sub(texPosSub)).mul(texPosMultiplier);

    const uvPos = vec2(0.5, height);

    return texture(tex, uvPos);
});

material.fragmentNode = uvFunc()

/**
 * ----------- End of TSL -----------
 */

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
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const tick = async () =>
{
    controls.update()

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()