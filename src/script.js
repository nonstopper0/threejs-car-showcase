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
// import { Water } from 'three/examples/jsm/objects/water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { TextureLoader } from 'three'

var Water = function ( geometry, options ) {

	THREE.Mesh.call( this, geometry );

	var scope = this;

	options = options || {};

	var textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512;
	var textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512;

	var clipBias = options.clipBias !== undefined ? options.clipBias : 0.0;
	var alpha = options.alpha !== undefined ? options.alpha : 1.0;
	var time = options.time !== undefined ? options.time : 0.0;
	var normalSampler = options.waterNormals !== undefined ? options.waterNormals : null;
	var sunDirection = options.sunDirection !== undefined ? options.sunDirection : new THREE.Vector3( 0.70707, 0.70707, 0.0 );
	var sunColor = new THREE.Color( options.sunColor !== undefined ? options.sunColor : 0xffffff );
	var waterColor = new THREE.Color( options.waterColor !== undefined ? options.waterColor : 0x7F7F7F );
	var eye = options.eye !== undefined ? options.eye : new THREE.Vector3( 0, 0, 0 );
	var distortionScale = options.distortionScale !== undefined ? options.distortionScale : 20.0;
	var side = options.side !== undefined ? options.side : THREE.FrontSide;
	var fog = options.fog !== undefined ? options.fog : false;

	//

	var mirrorPlane = new THREE.Plane();
	var normal = new THREE.Vector3();
	var mirrorWorldPosition = new THREE.Vector3();
	var cameraWorldPosition = new THREE.Vector3();
	var rotationMatrix = new THREE.Matrix4();
	var lookAtPosition = new THREE.Vector3( 0, 0, - 1 );
	var clipPlane = new THREE.Vector4();

	var view = new THREE.Vector3();
	var target = new THREE.Vector3();
	var q = new THREE.Vector4();

	var textureMatrix = new THREE.Matrix4();

	var mirrorCamera = new THREE.PerspectiveCamera();

	var parameters = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBFormat,
		stencilBuffer: false
	};

	var renderTarget = new THREE.WebGLRenderTarget( textureWidth, textureHeight, parameters );

	if ( ! THREE.MathUtils.isPowerOfTwo( textureWidth ) || ! THREE.MathUtils.isPowerOfTwo( textureHeight ) ) {

		renderTarget.texture.generateMipmaps = false;

	}

	var mirrorShader = {

		uniforms: THREE.UniformsUtils.merge( [
			THREE.UniformsLib[ 'fog' ],
			THREE.UniformsLib[ 'lights' ],
			{
				"normalSampler": { value: null },
				"mirrorSampler": { value: null },
				"alpha": { value: 1.0 },
				"time": { value: 0.0 },
				"size": { value: 1.0 },
				"distortionScale": { value: 20.0 },
				"textureMatrix": { value: new THREE.Matrix4() },
				"sunColor": { value: new THREE.Color( 0x7F7F7F ) },
				"sunDirection": { value: new THREE.Vector3( 0.70707, 0.70707, 0 ) },
				"eye": { value: new THREE.Vector3() },
				"waterColor": { value: new THREE.Color( 0x555555 ) }
			}
		] ),

		vertexShader: [
			'uniform mat4 textureMatrix;',
			'uniform float time;',

			'varying vec4 mirrorCoord;',
			'varying vec4 worldPosition;',

		 	'#include <common>',
		 	'#include <fog_pars_vertex>',
			'#include <shadowmap_pars_vertex>',
			'#include <logdepthbuf_pars_vertex>',

			'void main() {',
			'	mirrorCoord = modelMatrix * vec4( position, 1.0 );',
			'	worldPosition = mirrorCoord.xyzw;',
			'	mirrorCoord = textureMatrix * mirrorCoord;',
			'	vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
			'	gl_Position = projectionMatrix * mvPosition;',

			'#include <logdepthbuf_vertex>',
			'#include <fog_vertex>',
			'#include <shadowmap_vertex>',
			'}'
		].join( '\n' ),

		fragmentShader: [
			'uniform sampler2D mirrorSampler;',
			'uniform float alpha;',
			'uniform float time;',
			'uniform float size;',
			'uniform float distortionScale;',
			'uniform sampler2D normalSampler;',
			'uniform vec3 sunColor;',
			'uniform vec3 sunDirection;',
			'uniform vec3 eye;',
			'uniform vec3 waterColor;',

			'varying vec4 mirrorCoord;',
			'varying vec4 worldPosition;',

			'vec4 getNoise( vec2 uv ) {',
			'	vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);',
			'	vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );',
			'	vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );',
			'	vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );',
			'	vec4 noise = texture2D( normalSampler, uv0 ) +',
			'		texture2D( normalSampler, uv1 ) +',
			'		texture2D( normalSampler, uv2 ) +',
			'		texture2D( normalSampler, uv3 );',
			'	return noise * 0.5 - 1.0;',
			'}',

			'void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {',
			'	vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );',
			'	float direction = max( 0.0, dot( eyeDirection, reflection ) );',
			'	specularColor += pow( direction, shiny ) * sunColor * spec;',
			'	diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;',
			'}',

			'#include <common>',
			'#include <packing>',
			'#include <bsdfs>',
			'#include <fog_pars_fragment>',
			'#include <logdepthbuf_pars_fragment>',
			'#include <lights_pars_begin>',
			'#include <shadowmap_pars_fragment>',
			'#include <shadowmask_pars_fragment>',

			'void main() {',

			'#include <logdepthbuf_fragment>',
			'	vec4 noise = getNoise( worldPosition.xz * size );',
			'	vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',

			'	vec3 diffuseLight = vec3(0.0);',
			'	vec3 specularLight = vec3(0.0);',

			'	vec3 worldToEye = eye-worldPosition.xyz;',
			'	vec3 eyeDirection = normalize( worldToEye );',
			'	sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );',

			'	float distance = length(worldToEye);',

			'	vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;',
			'	vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );',

			'	float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );',
			'	float rf0 = 0.3;',
			'	float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );',
			'	vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;',
			'	vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);',
			'	vec3 outgoingLight = albedo;',
			'	gl_FragColor = vec4( outgoingLight, alpha );',

			'#include <tonemapping_fragment>',
			'#include <fog_fragment>',
			'}'
		].join( '\n' )

	};

	var material = new THREE.ShaderMaterial( {
		fragmentShader: mirrorShader.fragmentShader,
		vertexShader: mirrorShader.vertexShader,
		uniforms: THREE.UniformsUtils.clone( mirrorShader.uniforms ),
		lights: true,
		side: side,
		fog: fog
	} );

	material.uniforms[ "mirrorSampler" ].value = renderTarget.texture;
	material.uniforms[ "textureMatrix" ].value = textureMatrix;
	material.uniforms[ "alpha" ].value = alpha;
	material.uniforms[ "time" ].value = time;
	material.uniforms[ "normalSampler" ].value = normalSampler;
	material.uniforms[ "sunColor" ].value = sunColor;
	material.uniforms[ "waterColor" ].value = waterColor;
	material.uniforms[ "sunDirection" ].value = sunDirection;
	material.uniforms[ "distortionScale" ].value = distortionScale;

	material.uniforms[ "eye" ].value = eye;

	scope.material = material;

	scope.onBeforeRender = function ( renderer, scene, camera ) {

		mirrorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
		cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

		rotationMatrix.extractRotation( scope.matrixWorld );

		normal.set( 0, 0, 1 );
		normal.applyMatrix4( rotationMatrix );

		view.subVectors( mirrorWorldPosition, cameraWorldPosition );

		// Avoid rendering when mirror is facing away

		if ( view.dot( normal ) > 0 ) return;

		view.reflect( normal ).negate();
		view.add( mirrorWorldPosition );

		rotationMatrix.extractRotation( camera.matrixWorld );

		lookAtPosition.set( 0, 0, - 1 );
		lookAtPosition.applyMatrix4( rotationMatrix );
		lookAtPosition.add( cameraWorldPosition );

		target.subVectors( mirrorWorldPosition, lookAtPosition );
		target.reflect( normal ).negate();
		target.add( mirrorWorldPosition );

		mirrorCamera.position.copy( view );
		mirrorCamera.up.set( 0, 1, 0 );
		mirrorCamera.up.applyMatrix4( rotationMatrix );
		mirrorCamera.up.reflect( normal );
		mirrorCamera.lookAt( target );

		mirrorCamera.far = camera.far; // Used in WebGLBackground

		mirrorCamera.updateMatrixWorld();
		mirrorCamera.projectionMatrix.copy( camera.projectionMatrix );

		// Update the texture matrix
		textureMatrix.set(
			0.5, 0.0, 0.0, 0.5,
			0.0, 0.5, 0.0, 0.5,
			0.0, 0.0, 0.5, 0.5,
			0.0, 0.0, 0.0, 1.0
		);
		textureMatrix.multiply( mirrorCamera.projectionMatrix );
		textureMatrix.multiply( mirrorCamera.matrixWorldInverse );

		// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
		// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
		mirrorPlane.setFromNormalAndCoplanarPoint( normal, mirrorWorldPosition );
		mirrorPlane.applyMatrix4( mirrorCamera.matrixWorldInverse );

		clipPlane.set( mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant );

		var projectionMatrix = mirrorCamera.projectionMatrix;

		q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
		q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
		q.z = - 1.0;
		q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

		// Calculate the scaled plane vector
		clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

		// Replacing the third row of the projection matrix
		projectionMatrix.elements[ 2 ] = clipPlane.x;
		projectionMatrix.elements[ 6 ] = clipPlane.y;
		projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
		projectionMatrix.elements[ 14 ] = clipPlane.w;

		eye.setFromMatrixPosition( camera.matrixWorld );

		//

		var currentRenderTarget = renderer.getRenderTarget();

		var currentXrEnabled = renderer.xr.enabled;
		var currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

		scope.visible = false;

		renderer.xr.enabled = false; // Avoid camera modification and recursion
		renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

		renderer.setRenderTarget( renderTarget );
		renderer.state.buffers.depth.setMask( true );
		if ( renderer.autoClear === false ) renderer.clear();
		renderer.render( scene, mirrorCamera );

		scope.visible = true;

		renderer.xr.enabled = currentXrEnabled;
		renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

		renderer.setRenderTarget( currentRenderTarget );

		// Restore viewport

		var viewport = camera.viewport;

		if ( viewport !== undefined ) {

			renderer.state.viewport( viewport );

		}

	};

};

Water.prototype = Object.create( THREE.Mesh.prototype );
Water.prototype.constructor = Water;


// Initialization Variables ------------------------------------------------------------

const clock = new THREE.Clock()
// const gui = new dat.GUI()
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const sizes = { width: window.innerWidth, height: window.innerHeight }

let directLight;
let directLight2;
let sun = new THREE.Vector3();

let skyline;
let rx7;
let garage;

const camera = new THREE.PerspectiveCamera(30, sizes.width / sizes.height, 0.01, 500)
camera.position.set(0, 8, 70);
scene.add(camera)

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,  
    antialias: true  
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2;

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
    loadCount++


    lights();

    // initialize re-renders
    tick()
}


// Loaders ------------------------------------------------------------

let loadCount = 0
const manager = new THREE.LoadingManager()
let loadingSlider = document.querySelector('.loading-slider');

manager.onLoad = () => {
    loadCount === 0 && init()
};
manager.onProgress = (url, loaded, total) => {
    console.log(url);
    let progress = loaded / total * 100 - 100
    loadingSlider.style.transform = `translate(${progress}px)`
}


// Textures 

const hdrLoader = new RGBELoader(manager);
const texLoader = new TextureLoader(manager);

let waternormal = texLoader.load('./waternormals.jpg', (jpg) => {
    jpg.wrapS = jpg.wrapT = THREE.RepeatWrapping;
})

let envioMap = hdrLoader.load('./sunrise.hdr');
envioMap.mapping = THREE.EquirectangularReflectionMapping;
envioMap.encoding = THREE.sRGBEncoding;

const bodyMaterial = new THREE.MeshPhysicalMaterial( {
    color: new THREE.Color("rgb(100, 0, 0)"),
    metalness: 0, 
    reflectivity: 0,
    roughness: .5,   
    clearcoat: 0.7, 
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
            child.castShadow = false;
        }
    })
    skyline.scale.set(0.1, 0.1, 0.1);
    skyline.position.set(0, 0.1, 0);
    skyline.getObjectByName("Main_Main_0").material = bodyMaterial
    skyline.getObjectByName("Door_R_Main_0").material = bodyMaterial
    skyline.getObjectByName("Door_L_Main_0").material = bodyMaterial
    // skyline.getObjectByName("Main_Tranparent_0").material = glassMaterial
    skyline.getObjectByName("Door_L_Tranparent_0").material = glassMaterial
    skyline.getObjectByName("Door_R_Tranparent_0").material = glassMaterial
    scene.add(skyline);
})

// function loadNext() {

//     modelLoader.load('./rx7/scene.gltf', (gltf) => {
//         rx7 = gltf.scene.children[0];
//         rx7.traverse( (child) => {
//             if (child.type == "Mesh") {
//                 child.castShadow = true;
//             }
//         })
//         rx7.scale.set(0.0026, 0.0026, 0.0026);
//         rx7.position.set(1, 0, 0);
//         rx7.getObjectByName("Material3").material = bodyMaterial;
//         scene.add(rx7);
//     })

// }

// setTimeout(() => {
//     loadNext()
// }, 4000)



// Mesh ------------------------------------------------------

// const reflectGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
// const reflect = new Reflector(reflectGeometry)
// reflect.rotation.x = -Math.PI / 2;

// const floorG = new THREE.PlaneGeometry(1000, 1000, 10, 10);
// const floorM = new THREE.MeshPhysicalMaterial({
//     transparent: true,
//     color: new THREE.Color('rgb(10, 10, 10)'),
//     transmission: 0.6
// })
// const floor = new THREE.Mesh(floorG, floorM)
// floor.rotation.x = -Math.PI / 2;
// floor.position.set(0, reflect.position.y + 0.05, 0);

let water = new Water(
    new THREE.PlaneGeometry(1000, 1000),
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waternormal,
        sunDirection: new THREE.Vector3(),
        sunColor: 0xfffffff,
        waterColor: 0x001e0f,
        distortionScale: 1,
        fog: scene.fog !== undefined
    }
)
water.rotation.x = - Math.PI / 2
scene.add(water);


const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;

skyUniforms[ 'turbidity' ].value = 10;
skyUniforms[ 'rayleigh' ].value = 2;
skyUniforms[ 'mieCoefficient' ].value = 0.005;
skyUniforms[ 'mieDirectionalG' ].value = 0.8;

const parameters = {
    elevation: 2,
    azimuth: 180
};

const pmremGenerator = new THREE.PMREMGenerator( renderer );


function updateSun() {

    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
    const theta = THREE.MathUtils.degToRad( parameters.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

    scene.environment = pmremGenerator.fromScene( sky ).texture;

}

updateSun();


// Lights

function lights() {
    let global = new THREE.AmbientLight(0xffffff, .1)

    directLight = new THREE.PointLight(0xffffff, .5)
    directLight.position.set(100, -100, 0);
    directLight.castShadow = true;

    directLight2 = new THREE.PointLight(0xffffff, .5)
    directLight2.position.set(-100, -30, 0);
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


let colorTo = new THREE.Color('rgb(150, 0, 0)')
let count = 0
function randomizeColor() {
    bodyMaterial.color.lerp(colorTo, 0.05);
    if (count % 60 === 0) {
        colorTo = new THREE.Color(`rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`)
    }
    count++
}

const tick = () =>
{
    stats.begin();
    const elapsedTime = clock.getElapsedTime();

    // Render
    renderer.render(scene, camera);

    // Controls
    controls.update();

    // Randomize Color
    // randomizeColor()

    water.material.uniforms[ 'time' ].value += 1.0 / 60.0;

    stats.end();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}