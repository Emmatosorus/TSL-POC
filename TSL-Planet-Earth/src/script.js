import * as THREE from 'three/webgpu'
import {Pane} from 'tweakpane'
import {
    texture,
    uv,
    normalLocal,
    positionWorld,
    cameraPosition,
    color,
    dot,
    positionLocal,
    instancedArray,
    Fn,
    instanceIndex,
    hash,
    uniform
} from 'three/tsl'

// Debug
const pane = new Pane({title: '🌎 Planet Earth 🌎'})
const debugParams = {}
debugParams.atmoshpereColor = '#4c99ff'
debugParams.earthColor = '#abf5ff'
debugParams.earthSpeed = 0.001
debugParams.starCoolor = '#f5f5f5'


/**
 * Base
 */
const canvas = document.getElementById('webgpu')
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureMap = new THREE.TextureLoader().load('earth.jpg');
textureMap.colorSpace = THREE.SRGBColorSpace

/**
 * Earth material and geometry
 */
const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
const earthMaterial = new THREE.MeshNormalMaterial();

/**
 * ----------- Planet Earth in TSL -----------
 */

const earthColor = uniform(new THREE.Color(debugParams.earthColor))

earthMaterial.fragmentNode = texture(textureMap, uv()).mul(color(earthColor))

/**
 * ----------- End of TSL -----------
 */
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

/**
 * Atmosphere material and geometry
 */
const atmosphereGeometry = new THREE.SphereGeometry(1.15, 32, 32);
const atmosphereMaterial = new THREE.MeshStandardNodeMaterial({
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
})

/**
 * ----------- Atmosphere in TSL -----------
 */
const atmosphereColor = uniform(new THREE.Color(debugParams.atmoshpereColor))

atmosphereMaterial.fragmentNode = (() => {

    const viewDirection = positionWorld.sub(cameraPosition).normalize();

    const intensity = dot(viewDirection, normalLocal).pow(4.0);

    return color(atmosphereColor).mul(intensity)
})();

/**
 * ----------- End of TSL -----------
 */
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);


/**
 * Stars material and geometry
 */
const starGeometry = new THREE.CircleGeometry(0.5, 8);
const starMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0xffffff,
})
const starCount = 1000

/**
 * ----------- Stars in TSL -----------
 */

const posBuffer = instancedArray(starCount, 'vec3')
const scaleBuffer = instancedArray(starCount, 'vec3')

const randUint = () =>  Math.random() * 0xFFFFFF;

const setStarPosition = Fn( () => {

    const position = posBuffer.element( instanceIndex )
    const scale = scaleBuffer.element( instanceIndex )

    const randX = hash( instanceIndex );
    const randY = hash( instanceIndex.add( randUint() ) );
    const randZ = hash( instanceIndex.add( randUint() ) );

    position.x = randX.mul( 500 ).add( -250)
    position.y = randY.mul( 200 ).add( -100)
    position.z = randZ.mul( -100 ).add( -100)

    scale.xyz = hash( instanceIndex.add( Math.random() ) ).mul(0.8).add(0.2)

} )().compute( starCount )

starMaterial.positionNode = positionLocal.mul( scaleBuffer.toAttribute() ).add( posBuffer.toAttribute() )

const starColor = uniform(new THREE.Color(debugParams.starCoolor))

starMaterial.fragmentNode = color(starColor)


/**
 * ----------- End of TSL -----------
 */
const stars = new THREE.Mesh(starGeometry, starMaterial)
stars.count = starCount
stars.castShadow = true
scene.add(stars)

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
 * Debug
 */
const earthDebug = pane.addFolder({title: 'Earth'})
earthDebug.addBinding(debugParams, 'earthColor', {label: 'Color'}).on('change', (event) => {
    earthColor.value = new THREE.Color(event.value)
})

earthDebug.addBinding(debugParams, 'earthSpeed', {label: 'Speed', min: 0.001, max: 0.08})

const atmoshpereDebug = pane.addFolder({title: 'Atmosphere'})

atmoshpereDebug.addBinding(debugParams, 'atmoshpereColor', {label: 'Color'}).on('change', (event) => {
    atmosphereColor.value = new THREE.Color(event.value)
})

const starDebug = pane.addFolder({title: 'Stars'})
starDebug.addBinding(debugParams, 'starCoolor', {label: 'Color'}).on('change', (event) => {
    starColor.value = new THREE.Color(event.value)
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
scene.add(camera)

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

await renderer.computeAsync( setStarPosition );

const tick = async () => {
    earth.rotation.y += debugParams.earthSpeed;

    renderer.renderAsync(scene, camera);

    requestAnimationFrame(tick);
}
tick();

