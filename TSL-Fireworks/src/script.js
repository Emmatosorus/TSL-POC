import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import {Pane} from 'tweakpane'
import {
    vec4,
    Fn,
    vec2,
    uniform,
    vec3,
    distance,
    step,
    float,
    mix,
    range,
    div,
    cameraPosition,
    texture,
    uv,
    sin,
    cos,
    positionGeometry,
    remapClamp,
    pow,
    min,
} from "three/tsl";

// Debug
const pane = new Pane({title: 'Fireworks 🎇'})

/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}
sizes.resolution = new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)
    sizes.resolution.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.set(1.5, 0, 10)
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
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

pane.addBinding(rendererParameters, 'clearColor', {label: 'Clear Color'}).on('change', () => {
    renderer.setClearColor(rendererParameters.clearColor)
})

/**
 * Fierworks
 */
const textures = [
    textureLoader.load('./particles/1.png'),
    textureLoader.load('./particles/2.png'),
    textureLoader.load('./particles/3.png'),
    textureLoader.load('./particles/4.png'),
    textureLoader.load('./particles/5.png'),
    textureLoader.load('./particles/6.png'),
    textureLoader.load('./particles/7.png'),
    textureLoader.load('./particles/8.png')
]

const calculateScale = Fn(([progress]) => {
    const sizeOpeningProgress = remapClamp(progress, 0.0, 0.125, 0.0, 1.0).toVar()
    const sizeClosingProgress = remapClamp(progress, 0.125, 1.0, 1.0, 0.0).toVar()
    return min(sizeOpeningProgress, sizeClosingProgress)

})

const calculateTwinkle = Fn(([progress]) => {
    const twinkleProgress = remapClamp(progress, 0.2, 0.8, 0.0, 1.0).toConst()
    return sin(progress.mul(30)).mul(0.5).add(0.5).mul(twinkleProgress).oneMinus()
})

const createFirework = (count, position, size, textureParam, radius, color) => {
    // Geometry
    const geometry = new THREE.PlaneGeometry(0.02, 0.02)

    // Material
    const material = new THREE.SpriteNodeMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    })

    /**
     * ------------ Firework in TSL ------------
     */

    /**
     * Vertex Shader
     */
    const uRadius = uniform(radius)
    const uMinRadius = uniform(radius * 0.75)
    const uProgress = uniform(0)

    material.positionNode = Fn(() => {
        const progress = uProgress.mul(float(1.0).add(range(0, 1))).toVar()

        const spherical = vec3(
            range(uMinRadius, uRadius),
            range(0, Math.PI),
            range(0, Math.PI * 2)
        ).toConst()

        const sinPhiRadius = sin(spherical.y).mul(spherical.x).toVar()

        const randomness = vec3(
            sinPhiRadius.mul(sin(spherical.z)),
            cos(spherical.y).mul(spherical.x),
            sinPhiRadius.mul(cos(spherical.z))
        )

        const newPosition = positionGeometry.add(randomness).toVar()

        // Exploding
        const explodingProgress = remapClamp(progress, 0.0, 0.1, 0.0, 1.0).toVar()
        newPosition.mulAssign(pow(explodingProgress.oneMinus(), 3.0).oneMinus())

        // Falling
        const fallingProgress = remapClamp(progress, 0.1, 1.0, 0.0, 1.0).toVar()
        newPosition.y.subAssign(pow(fallingProgress.oneMinus(), 3.0).oneMinus().mul(0.2))

        /**
         * We have to estimate the size of the particles to make them disappear
         */
        const sizeProgress = calculateScale(progress).toVar()
        const twinkleSize = calculateTwinkle(progress).toVar()

        const approximateSize = sizeProgress.mul(twinkleSize).toVar()

        const disappearFactor = step(0.1, approximateSize).toVar()

        return mix(vec3(9999.0, 9999.0, 9999.0), newPosition, disappearFactor)
    })()

    const uSize = uniform(size)
    const uResolution = uniform(sizes.resolution)

    material.scaleNode = Fn(() => {
        const progress = uProgress.mul(float(1.0).add(range(0, 1))).toVar()

        const sizeProgress = calculateScale(progress).toVar()
        const twinkleSize = calculateTwinkle(progress).toVar()

        const pointSize = uSize.mul(uResolution.y).mul(range(0, 1)).mul(sizeProgress).mul(twinkleSize).toVar()

        const distanceFromCenter = distance(vec3(0, 0, 0), cameraPosition.mul(-1)).toVar()

        pointSize.mulAssign((div(1.0, distanceFromCenter)))

        return vec2(pointSize, pointSize)

    })()

    /**
     * Fragment Shader
     */
    const uColor = uniform(color)

    material.fragmentNode = Fn(() => {
        const textureAlpha = texture(textureParam, uv()).r
        return vec4(uColor, textureAlpha)
    })()


    /**
     * ------------ End of TSL ------------
     */

    // Points
    const fireworks = new THREE.InstancedMesh(geometry, material, count)
    fireworks.position.copy(position)
    scene.add(fireworks)

    const detroyFirework = () => {
        scene.remove(fireworks)
        geometry.dispose()
        material.dispose()
    }

    const animateFirework = (uProgress, duration, onComplete) => {
        const start = performance.now()

        function update(now) {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            uProgress.value = progress

            if (progress < 1) {
                requestAnimationFrame(update)
            } else if (onComplete) {
                onComplete()
            }
        }

        requestAnimationFrame(update)
    }
    animateFirework(uProgress, 3000, detroyFirework)
}

const createRandomFirework = () => {
    const count = Math.round(400 + Math.random() * 1000)
    const position = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random(),
        (Math.random() - 0.5) * 2,
    )
    const size = 0.1 + Math.random() * 0.1
    const texIndex = textures[Math.floor(Math.random() * textures.length)]
    const radius = 0.5 + Math.random()
    const color = new THREE.Color()
    color.setHSL(Math.random(), 1, 0.7)

    createFirework(count, position, size, texIndex, radius, color)
}

window.addEventListener('click', createRandomFirework)

/**
 * Sky
 */
// Add Sky
const sky = new SkyMesh();
sky.scale.setScalar(450000);
scene.add(sky);

const sun = new THREE.Vector3();

const skyParameters = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.95,
    elevation: -2.2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
};

function updateSky() {
    sky.turbidity.value = skyParameters.turbidity;
    sky.rayleigh.value = skyParameters.rayleigh;
    sky.mieCoefficient.value = skyParameters.mieCoefficient;
    sky.mieDirectionalG.value = skyParameters.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad( 90 - skyParameters.elevation );
    const theta = THREE.MathUtils.degToRad( skyParameters.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.sunPosition.value.copy( sun );

    renderer.toneMappingExposure = skyParameters.exposure;
}

pane.addBinding(skyParameters, 'turbidity', {min: 0.0, max: 20.0, step: 0.1}).on('change', updateSky);
pane.addBinding(skyParameters, 'rayleigh', {min: 0.0, max: 4, step: 0.001}).on('change', updateSky);
pane.addBinding(skyParameters, 'mieCoefficient', {min: 0.0, max: 0.1, step: 0.001}).on('change', updateSky);
pane.addBinding(skyParameters, 'mieDirectionalG', {min: 0.0, max: 1, step: 0.001 }).on('change', updateSky);
pane.addBinding(skyParameters, 'elevation', {min: -3, max: 90, step: 0.01 }).on('change', updateSky);
pane.addBinding(skyParameters, 'azimuth', {min: - 180, max: 180, step: 0.1 }).on('change', updateSky);
pane.addBinding(skyParameters, 'exposure', {min: 0, max: 1, step: 0.0001 }).on('change', updateSky);

updateSky()

/**
 * Animate
 */

const tick = () =>
{
    controls.update()

    renderer.renderAsync(scene, camera)

    window.requestAnimationFrame(tick)
}

tick()