import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import * as dat from 'dat.gui'
import { gsap } from 'gsap'
import { ScrollTrigger} from 'gsap/ScrollTrigger'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector'


// Initialization Variables ------------------------------------------------------------

const clock = new THREE.Clock()
const gui = new dat.GUI()
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const sizes = { width: window.innerWidth, height: window.innerHeight }

let directLight;

let skyline;
let skylineReflect;
let garage;

const camera = new THREE.PerspectiveCamera(80, sizes.width / sizes.height, 0.1, 300)
camera.position.set(0, 10, 10);
scene.add(camera)

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,  
    antialias: true  
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2;

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

let stats = new Stats();
document.body.appendChild(stats.dom);

// called after all models and textures load
function init() {
    console.log('initializing...');


    skyline.getObjectByName("Main_Main_0").material = bodyMaterial
    skyline.getObjectByName("Door_R_Main_0").material = bodyMaterial
    skyline.getObjectByName("Door_L_Main_0").material = bodyMaterial
    scene.add(skyline);

    renderer.shadowMap.needsUpdate = true;


    lights();
    tick()
}

// Loaders ------------------------------------------------------------



const manager = new THREE.LoadingManager()

// manager.onProgress = (url, loaded, total) => {
// }

manager.onLoad = () => {
    init()
}



// Textures 

const texLoader = new RGBELoader(manager);

let envioMap = texLoader.load('./shophdr.hdr');
envioMap.mapping = THREE.EquirectangularReflectionMapping;
envioMap.encoding = THREE.sRGBEncoding;

const bodyMaterial = new THREE.MeshPhysicalMaterial( {
    color: 0xff0000, 
    metalness: 0, 
    reflectivity: 0,
    roughness: 1,   
    clearcoat: 0.5, 
    clearcoatRoughness: 0.05, 
    envMap: envioMap, 
} );

gui.add(bodyMaterial, 'clearcoat');
gui.add(bodyMaterial, 'clearcoatRoughness');
gui.add(bodyMaterial, 'metalness');
gui.add(bodyMaterial, 'roughness');
gui.add(bodyMaterial, 'reflectivity');
gui.add(bodyMaterial.color, 'r').min(0).max(1)
gui.add(bodyMaterial.color, 'g').min(0).max(1)
gui.add(bodyMaterial.color, 'b').min(0).max(1)
console.log(bodyMaterial.color)



// Models

const modelLoader = new GLTFLoader(manager);
modelLoader.load('./nissan_skyline/scene.gltf', (gltf) => {
    skyline = gltf.scene.children[0];
    skyline.traverse( (child) => {
        if (child.type == "Mesh") {
            child.castShadow = true;
        }
    })
    skyline.scale.set(0.1, 0.1, 0.1);
    skyline.position.set(0, 0.1, 0);


})



// Mesh

const reflectGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
const reflect = new Reflector(reflectGeometry)
reflect.rotation.x = -Math.PI / 2;

scene.add(reflect);

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32),
    new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('white'),
        reflectivity: .2,
    })
)

sphere.position.set(10, 5, 5);
sphere.castShadow = true;
scene.add(sphere);

// Lights

function lights() {
    let global = new THREE.AmbientLight(0xffffff, .2)


    directLight = new THREE.DirectionalLight(0xffffff, 1)
    directLight.position.set(100, -20, 0);
    directLight.castShadow = true;

    // gui.add(directLight.rotation, 'z');
    // gui.add(directLight.rotation, 'x');
    // gui.add(directLight.rotation, 'y');
    // gui.add(directLight.position, 'y');

    // let pointLight2 = new THREE.PointLight(0xffffff, .5)
    // pointLight2.position.x = 20
    // pointLight2.position.y = 30;
    // pointLight2.position.z = 0;

    scene.add(directLight, global);
}



// Re-size


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


const tick = () =>
{
    stats.begin();
    const elapsedTime = clock.getElapsedTime();

    // Render
    renderer.render(scene, camera);

    // Controls
    controls.update();

    directLight.position.y += .5


    stats.end();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}