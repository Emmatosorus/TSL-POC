import {
    AmbientLight, Mesh,
    MeshBasicNodeMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    WebGPURenderer,
} from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {Pane} from 'tweakpane'
import Stats from "three/addons/libs/stats.module.js";
import {GLTFLoader} from "three/addons";
import {
    abs,
    clamp,
    dot,
    float,
    floor,
    Fn,
    fract,
    length,
    max,
    mix,
    mod,
    pow,
    screenSize,
    select,
    sin,
    smoothstep,
    time,
    uv,
    vec2,
    vec3,
    vec4,
    viewportSize
} from "three/tsl";

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
    // scene.add(glb.scene.children[0])
})


/**
 * Torch Flame mesh
 */
const flameGeometry = new PlaneGeometry()
const flameMaterial = new MeshBasicNodeMaterial({
    transparent: true,
})

const flame = new Mesh(flameGeometry, flameMaterial)
scene.add(flame)

/**
 * ------------ Flame in TSL ------------
 * Based off https://www.shadertoy.com/view/3t2yWz by tukigp
 */

const permute = Fn(([x]) => {
    return mod(x.mul(34.0).add(1.0).mul(x), 289)
})

const snoise = Fn(([v]) => {
    const SIMPLEX_CONST = vec4(
        0.211324865405187, 0.366025403784439,
        -0.577350269189626, 0.024390243902439
    ).toConst()

    let cellCoord = vec2(floor(v.add(dot(v, SIMPLEX_CONST.yy)))).toVar()
    const cellOffset0 = vec2(v.sub(cellCoord).add(dot(cellCoord, SIMPLEX_CONST.xx))).toConst()

    const stepOffset = select(cellOffset0.x.greaterThan(cellOffset0.y), vec2(1.0, 0.0), vec2(0.0, 1.0)).toConst()

    let cellOffset12 = vec4(cellOffset0.xyxy.add(SIMPLEX_CONST.xxzz)).toVar()
    cellOffset12.xy.subAssign(stepOffset)

    cellCoord = mod(cellCoord, 289.0).toVar()

    const permutedIndex = vec3(permute(
        permute(cellCoord.y.add(vec3(0.0, stepOffset.y, 1.0)))
            .add(cellCoord.x).add(vec3(0.0, stepOffset.x, 1.0))
    )).toConst()

    let cornerWeight = vec3(max(float(0.5).sub(vec3(
        dot(cellOffset0, cellOffset0),
        dot(cellOffset12.xy, cellOffset12.xy),
        dot(cellOffset12.zw, cellOffset12.zw)
    )), 0.0)).toVar()

    cornerWeight.mulAssign(cornerWeight)
    cornerWeight.mulAssign(cornerWeight)

    const gradientBase = vec3(float(2.0).mul(fract(permutedIndex.mul(SIMPLEX_CONST.www))).sub(1.0)).toConst()
    const gradientHeight = vec3(abs(gradientBase).sub(0.5)).toConst()
    const gradientOffset = vec3(floor(gradientBase.add(0.5))).toConst()
    const gradientXY = vec3(gradientBase.sub(gradientOffset)).toConst()

    cornerWeight.mulAssign(float(1.79284291400159).sub(float(0.85373472095314))
        .mul(gradientXY.mul(gradientXY).mul(gradientHeight).mul(gradientHeight)))

    let gradientVector = vec3(0).toVar()
    gradientVector.x.assign(gradientXY.x.mul(cellOffset0.x).add(gradientHeight.x.mul(cellOffset0.y)))
    gradientVector.yz.assign(gradientXY.yz.mul(cellOffset12.xz).add(gradientHeight.yz.mul(cellOffset12.yw)))

    return float(130.0).mul(dot(cornerWeight, gradientVector))
})

const flameShader = Fn(() => {
    const FLAME_SIZE = float(2.2).toConst()
    const FLAME_WIDTH = float(1.3).toConst()
    const DISPLACEMENT_STRENGTH = float(0.3).toConst()
    const DISPLACEMENT_FREQUENCY = float(5.0).toConst()
    const DISPLACEMENT_EXPONENT = float(1.5).toConst()
    const DISPLACEMENT_SPEED = float(5.0).toConst()
    const TEAR_EXPONENT = float(0.7).toConst()
    const BASE_SHARPNESS = float(4.0).toConst()

    const NOISE_SCALE = float(3.0).toConst()
    const NOISE_SPEED = float(-2.7).toConst()
    const NOISE_GAIN = float(0.5).toConst()
    const NOISE_MULT = float(0.35).toConst()

    const FALLOFF_MIN = float(0.2).toConst()
    const FALLOFF_MAX = float(1.3).toConst()
    const FALLOFF_EXPONENT = float(0.9).toConst()

    const BACKGROUND_MIN = float(0.0).toConst()
    const BACKGROUND_MAX = float(0.15).toConst()
    const BACKGROUND_COLOR_MIN = vec3(1.0, 0.0, 0.0).toConst()
    const BACKGROUND_COLOR_MAX = vec3(1.0, 0.3, 0.0).toConst()
    const RIM_COLOR = vec3(1.0, 0.9, 0.0).toConst()

    const FLICKER_SPEED = float(10.0).toConst()
    const FLICKER_STRENGTH = float(0.08).toConst()
    const GLOW_OFFSET = vec2(0.0, 0.1).toConst()
    const GLOW_EXPONENT = float(4.0).toConst()
    const GLOW_WIDTH = float(1.5).toConst()
    const GLOW_SIZE = float(0.4).toConst()
    const GLOW_STRENGTH = float(0.4).toConst()
    const GLOW_COLOR = vec3(1.0, 0.8, 0.0).toConst()

    const uvCoord = uv().toVar()
    const fragCoord = vec2(uvCoord.mul(screenSize)).toConst()
    const pixelWidth = abs(float(fragCoord.x).mul(float(viewportSize))).toConst()

    const aspectRatio = viewportSize.x.div(viewportSize.y).toConst()
    uvCoord.x.mulAssign(aspectRatio)

    let flamePos = vec2(uvCoord.sub(vec2(float(0.5).mul(aspectRatio), float(0.5)))).toVar()
    let glowPos = vec2(flamePos).toVar()

    flamePos.mulAssign(FLAME_SIZE)
    glowPos.x.mulAssign(FLAME_WIDTH)

    const flameDisplacement = max(
        float(0.0),
        sin(time.mul(DISPLACEMENT_SPEED)
            .add(flamePos.y.mul(DISPLACEMENT_FREQUENCY)))
            .mul(DISPLACEMENT_STRENGTH.mul(pow(uvCoord.y.sub(0.1), DISPLACEMENT_EXPONENT)))
    ).toConst()
    flamePos.x.addAssign(flameDisplacement)
    flamePos.x.addAssign(flamePos.x.div(pow(flamePos.y.oneMinus(), TEAR_EXPONENT)))

    const radialGradient = length(flamePos).toConst()
    const baseMask = pow(radialGradient, BASE_SHARPNESS).oneMinus().toConst()

    const noiseLayer0 = snoise(
            uvCoord.mul(NOISE_SCALE)
            .add(vec2(0.0, time.mul(NOISE_SPEED))))
        .mul(NOISE_MULT).add(NOISE_GAIN).toConst()
    const noiseLayer1 = float(0.5).add(noiseLayer0).toConst()

    let flame = baseMask.mul(noiseLayer0).mul(noiseLayer1).toVar()

    const falloff = smoothstep(FALLOFF_MIN, FALLOFF_MAX, pow(uvCoord.y, FALLOFF_EXPONENT)).toConst()
    flame.assign(clamp(flame.sub(falloff), -0.0, 1.0))

    const backgroundMask = smoothstep(BACKGROUND_MIN, BACKGROUND_MAX, flame).toConst()

    let color = vec3(mix(BACKGROUND_COLOR_MIN, BACKGROUND_COLOR_MAX, uvCoord.y).mul(backgroundMask)).toVar()

    const darkColor = vec3(mix(vec3(0.0), vec3(1.0, 0.4, 0.0), smoothstep(float(0.25), flame, pixelWidth))).toConst()
    const lightColor = vec3(mix(darkColor, vec3(1.0, 0.8, 0.0), smoothstep(float(0.7), flame, pixelWidth))).toConst()

    color.assign(mix(color, RIM_COLOR, lightColor))

    const glowFlicker = float(1.0).add(snoise(vec2(time.mul(FLICKER_SPEED))).mul(FLICKER_STRENGTH)).toConst()
    glowPos.addAssign(GLOW_OFFSET)
    glowPos.x.mulAssign(GLOW_WIDTH)
    glowPos.mulAssign(GLOW_SIZE)

    const glowColor = vec3(GLOW_COLOR
        .mul(pow(length(glowPos).oneMinus(), GLOW_EXPONENT)
            .mul(GLOW_STRENGTH).mul(glowFlicker))).toConst()
    color.addAssign(glowColor)

    return vec4(color, 1.0)
})

flameMaterial.fragmentNode = flameShader()

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