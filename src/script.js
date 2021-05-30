import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'dat.gui'
import { gsap } from 'gsap'
import { ScrollTrigger} from 'gsap/ScrollTrigger'



// Initialization Variables ------------------------------------------------------------

const clock = new THREE.Clock()
// const gui = new dat.GUI()
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const sizes = { width: window.innerWidth, height: window.innerHeight }

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 40000)
camera.position.set(0, 0, 1500);
scene.add(camera)

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,    
    antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Loaders ------------------------------------------------------------


document.querySelector('body').style.overflow = 'hidden'
const manager = new THREE.LoadingManager()
manager.onProgress = (url, loaded, total) => {
}
manager.onLoad = () => {

}

const modelLoader = new GLTFLoader(manager);
const texLoader = new THREE.TextureLoader(manager);


// Mesh


// Lights

function lights() {
    pointLight = new THREE.DirectionalLight(0xfffad9, 1)
    pointLight.position.set(200, 100, 100);
    pointLight.castShadow = true;

    binLight = new THREE.PointLight(0xffffff, 2)
    binLight.position.set(0, 200, 1500);
    binLight.distance = 500;

    scene.add(pointLight, binLight);
}


window.addEventListener('resize', resizeHandler)

function resizeHandler() {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))   
    

}

/**
 * Animate
 */

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();

    // Render
    renderer.render(scene, camera);
    
    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}