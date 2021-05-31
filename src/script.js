import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import * as dat from 'dat.gui'
import { gsap } from 'gsap'
import { ScrollTrigger} from 'gsap/ScrollTrigger'
import { Reflector } from 'three/examples/jsm/objects/Reflector'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'



// Initialization Variables ------------------------------------------------------------

const clock = new THREE.Clock()
const gui = new dat.GUI()
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const sizes = { width: window.innerWidth, height: window.innerHeight }

let directLight;
let directLight2;

let skyline;
let garage;

const camera = new THREE.PerspectiveCamera(90, sizes.width / sizes.height, 0.01, 300)
camera.position.set(0, 10, 30);
scene.add(camera)


// Renderer

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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 4;

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
controls.enableRotate = false;
controls.autoRotate = .5;

// Stats

let stats = new Stats();
document.body.appendChild(stats.dom);


function init() {
    
    console.log('initializing...');
    document.querySelector('.loading').classList.add('hidden');


    skyline.getObjectByName("Main_Main_0").material = bodyMaterial
    skyline.getObjectByName("Door_R_Main_0").material = bodyMaterial
    skyline.getObjectByName("Door_L_Main_0").material = bodyMaterial
    // skyline.getObjectByName("Main_Tranparent_0").material = glassMaterial
    skyline.getObjectByName("Door_L_Tranparent_0").material = glassMaterial
    skyline.getObjectByName("Door_R_Tranparent_0").material = glassMaterial
    scene.add(skyline);

    renderer.shadowMap.needsUpdate = true;


    lights();

    // initialize re-renders
    tick()
}


// Loaders ------------------------------------------------------------

const manager = new THREE.LoadingManager()

manager.onLoad = () => init();
manager.onProgress = (url, loaded, total) => {

}


// Textures 

const texLoader = new RGBELoader(manager);

let envioMap = texLoader.load('./shophdr.hdr');
envioMap.mapping = THREE.EquirectangularReflectionMapping;
envioMap.encoding = THREE.sRGBEncoding;

scene.background = new THREE.Color('white');

const bodyMaterial = new THREE.MeshPhysicalMaterial( {
    color: new THREE.Color("rgb(40, 0, 0)"),
    metalness: 0, 
    reflectivity: 0,
    roughness: .5,   
    clearcoat: 0.5, 
    clearcoatRoughness: 0.1, 
    envMap: envioMap, 
} );

const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('black'),
    transparent: true,
    transmission: 0.5,
    metalness: 0,
    roughness: 0.1,
    reflectivity: 1,
    envMap: envioMap
})


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



// Mesh ------------------------------------------------------

const reflectGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
const reflect = new Reflector(reflectGeometry)
reflect.rotation.x = -Math.PI / 2;

scene.add(reflect);

// Lights

function lights() {
    let global = new THREE.AmbientLight(0xffffff, .5)

    directLight = new THREE.PointLight(0xffffff, 1)
    directLight.position.set(100, 40, 0);
    directLight.castShadow = true;

    directLight2 = new THREE.PointLight(0xffffff, 1)
    directLight2.position.set(-100, 40, 0);
    directLight2.castShadow = true;

    // gui.add(directLight.rotation, 'z');
    // gui.add(directLight.rotation, 'x');
    // gui.add(directLight.rotation, 'y');
    // gui.add(directLight.position, 'y');

    // let pointLight2 = new THREE.PointLight(0xffffff, .5)
    // pointLight2.position.x = 20
    // pointLight2.position.y = 30;
    // pointLight2.position.z = 0;

    scene.add(directLight, directLight2, global);
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

    stats.end();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}