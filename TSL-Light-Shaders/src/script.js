import {
    Clock,
    Color,
    DoubleSide,
    Mesh,
    MeshBasicNodeMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    SphereGeometry,
    TorusKnotGeometry,
    Vector3,
    WebGPURenderer,
} from "three/webgpu";
import {
    vec4,
    Fn,
    dot,
    cameraPosition,
    uniform,
    modelWorldMatrix,
    vec3,
    modelPosition,
    normalize,
    max,
    reflect,
    normalGeometry
} from "three/tsl";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'


// Debug
const pane = new Pane({title: 'Light Shaders 💡'})
const debugObject = {}
debugObject.directionalLight1Color = '#50b8e4'
debugObject.directionalLight1Position = new Vector3(0.0, 0.0, -3.0)
debugObject.directionalLight1Intensity = 5.0

debugObject.directionalLight2Color = '#7e50e4'
debugObject.directionalLight2Position = new Vector3(0.0, 2.0, 2.0)
debugObject.directionalLight2Intensity = 1.0

debugObject.directionalLight3Color = '#9569ff'
debugObject.directionalLight3Position = new Vector3(0.0, -2.0, 2.0)
debugObject.directionalLight3Intensity = 1.0

debugObject.showHelpers = false

/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new Scene()

// Loaders
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
const camera = new PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 200)
camera.position.set(7, 7, 7)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const rendererParameters = {}
rendererParameters.clearColor = '#1d1f2a'

const renderer = new WebGPURenderer({
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
 * Material
 * Material
 */
const material = new MeshBasicNodeMaterial({
    side: DoubleSide,
})

/**
 * Fragment shader
 */
const directionalLight = Fn(([lightColor, lightIntensity, normal, lightPosition, viewDirection, specularPower]) => {
    const lightDirection = normalize(lightPosition).toConst()

    const lightReflection = reflect(lightDirection.negate(), normal).toConst()

    const shading = max(0.0, dot(normal, lightDirection)).toConst()

    const specular = max(0.0, dot(lightReflection, viewDirection).negate()).toConst()
    specular.powAssign(specularPower)

    return lightColor.mul(lightIntensity).mul(shading.add(specular))
})

const DirLight1Color = uniform(new Color(debugObject.directionalLight1Color))
const DirLight1Position = uniform(debugObject.directionalLight1Position)
const DirLight1Intensity = uniform(debugObject.directionalLight1Intensity)

const DirLight2Color = uniform(new Color(debugObject.directionalLight2Color))
const DirLight2Position = uniform(debugObject.directionalLight2Position)
const DirLight2Intensity = uniform(debugObject.directionalLight2Intensity)

const DirLight3Color = uniform(new Color(debugObject.directionalLight3Color))
const DirLight3Position = uniform(debugObject.directionalLight3Position)
const DirLight3Intensity = uniform(debugObject.directionalLight3Intensity)

material.fragmentNode = Fn(() => {
    const normal = normalize(modelWorldMatrix.mul(vec4(normalGeometry, 0.0)).xyz)
    const viewDirection = normalize(modelPosition.xyz.sub(cameraPosition))

    let color = vec3(1.0, 1.0, 1.0).toVar()

    let light = vec3(0.0).toVar()

    light.addAssign(directionalLight(
        DirLight1Color,
        DirLight1Intensity,
        normal,
        DirLight1Position,
        viewDirection,
        20.0
    ))

    light.addAssign(directionalLight(
        DirLight2Color,
        DirLight2Intensity,
        normal,
        DirLight2Position,
        viewDirection,
        20.0
    ))

    light.addAssign(directionalLight(
        DirLight3Color,
        DirLight3Intensity,
        normal,
        DirLight3Position,
        viewDirection,
        20.0
    ))

    color.mulAssign(light)

    return vec4(color, 1.0)
})()

/**
 * Objects
 */
const torusKnot = new Mesh(
    new TorusKnotGeometry(0.6, 0.25, 128, 32),
    material
)
torusKnot.position.x = 3
scene.add(torusKnot)

const sphere = new Mesh(
    new SphereGeometry(),
    material
)
sphere.position.x = - 3
scene.add(sphere)

let suzanne = null
gltfLoader.load(
    './suzanne.glb',
    (gltf) =>
    {
        suzanne = gltf.scene
        suzanne.traverse((child) =>
        {
            if(child.isMesh)
                child.material = material
        })
        scene.add(suzanne)
    }
)

/**
 * Light Helpers
 */
const directionalLightHelper1 = new Mesh(
    new PlaneGeometry(),
    new MeshBasicNodeMaterial({
        side: DoubleSide,
    })
)
directionalLightHelper1.material.color.setRGB(0.31, 0.72, 0.89)
directionalLightHelper1.position.set(0, 0, -3)
directionalLightHelper1.lookAt(0, 0, 0)
directionalLightHelper1.visible = false
scene.add(directionalLightHelper1)

const directionalLightHelper2 = new Mesh(
    new PlaneGeometry(),
    new MeshBasicNodeMaterial({
        side: DoubleSide,
    })
)
directionalLightHelper2.material.color.setRGB(0.49, 0.31, 0.89)
directionalLightHelper2.position.set(0.0, 2.0, 2.0)
directionalLightHelper2.lookAt(0, 0, 0)
directionalLightHelper2.visible = false
scene.add(directionalLightHelper2)

const directionalLightHelper3 = new Mesh(
    new PlaneGeometry(),
    new MeshBasicNodeMaterial({
        side: DoubleSide,
    })
)
directionalLightHelper3.material.color.setRGB(0.58, 0.41, 1.0)
directionalLightHelper3.position.set(0.0, -2.0, 2.0)
directionalLightHelper3.lookAt(0, 0, 0)
directionalLightHelper3.visible = false
scene.add(directionalLightHelper3)

/**
 * Debug
 */
pane.addBinding(material, 'wireframe')

pane.addBinding(debugObject, 'showHelpers', {label: 'Show Light Helpers'}).on('change', () => {
    directionalLightHelper1.visible = debugObject.showHelpers
    directionalLightHelper2.visible = debugObject.showHelpers
    directionalLightHelper3.visible = debugObject.showHelpers
})

const DirLightFolder = pane.addFolder({title: 'Directional Lights'})

const DirLight1 = DirLightFolder.addFolder({title: 'Directional Light 1'})
DirLight1.addBinding(debugObject, 'directionalLight1Color', {label: 'Directional Light 1 Color'}).on('change', (event) => {
    DirLight1Color.value = new Color(event.value)
    directionalLightHelper1.material.color.set(event.value)
})

DirLight1.addBinding(debugObject, 'directionalLight1Position', {label: 'Directional Light 1 Position'}).on('change', (event) => {
    DirLight1Position.value = new Vector3(event.value.x, event.value.y, event.value.z)
    directionalLightHelper1.position.set(event.value.x, event.value.y, event.value.z)
})

DirLight1.addBinding(debugObject, 'directionalLight1Intensity', {label: 'Directional Light 1 Intensity', min: 0.0}).on('change', (event) => {
    DirLight1Intensity.value = event.value
})

const DirLight2 = DirLightFolder.addFolder({title: 'Directional Light 2'})
DirLight2.addBinding(debugObject, 'directionalLight2Color', {label: 'Directional Light 2 Color'}).on('change', (event) => {
    DirLight2Color.value = new Color(event.value)
    directionalLightHelper2.material.color.set(event.value)
})

DirLight2.addBinding(debugObject, 'directionalLight2Position', {label: 'Directional Light 2 Position'}).on('change', (event) => {
    DirLight2Position.value = new Vector3(event.value.x, event.value.y, event.value.z)
    directionalLightHelper2.position.set(event.value.x, event.value.y, event.value.z)
})

DirLight2.addBinding(debugObject, 'directionalLight2Intensity', {label: 'Directional Light 2 Intensity', min: 0.0}).on('change', (event) => {
    DirLight2Intensity.value = event.value
})

const DirLight3 = DirLightFolder.addFolder({title: 'Directional Light 3'})
DirLight3.addBinding(debugObject, 'directionalLight3Color', {label: 'Directional Light 3 Color'}).on('change', (event) => {
    DirLight3Color.value = new Color(event.value)
    directionalLightHelper3.material.color.set(event.value)
})

DirLight3.addBinding(debugObject, 'directionalLight3Position', {label: 'Directional Light 3 Position'}).on('change', (event) => {
    DirLight3Position.value = new Vector3(event.value.x, event.value.y, event.value.z)
    directionalLightHelper3.position.set(event.value.x, event.value.y, event.value.z)
})

DirLight3.addBinding(debugObject, 'directionalLight3Intensity', {label: 'Directional Light 3 Intensity', min: 0.0}).on('change', (event) => {
    DirLight3Intensity.value = event.value
})

/**
 * Animate
 */
const clock = new Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    if(suzanne)
    {
        suzanne.rotation.x = - elapsedTime * 0.1
        suzanne.rotation.y = elapsedTime * 0.2
    }

    sphere.rotation.x = - elapsedTime * 0.1
    sphere.rotation.y = elapsedTime * 0.2

    torusKnot.rotation.x = - elapsedTime * 0.1
    torusKnot.rotation.y = elapsedTime * 0.2

    controls.update()

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()