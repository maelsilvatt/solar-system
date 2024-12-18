import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { film } from 'three/addons/tsl/display/FilmNode.js';

import Stats from 'three/addons/libs/stats.module.js';
import { FlyControls } from 'three/addons/controls/FlyControls.js';

const radius = 6371;
const tilt = 0.41;
const rotationSpeed = 0.02;

// Variável para controlar a rotação da Terra
let t_earth = 0;

const cloudsScale = 1.005;
const moonScale = 0.23;

const MARGIN = 0;
let SCREEN_HEIGHT = window.innerHeight - MARGIN * 2;
let SCREEN_WIDTH = window.innerWidth;

let camera, controls, scene, renderer, stats;
let geometry, earth_planet, meshClouds, meshMoon;
let dirLight;

let postProcessing;

const textureLoader = new THREE.TextureLoader();

let d, dPlanet, dMoon;
const dMoonVec = new THREE.Vector3();

// Para rastrear o objeto sob o mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let highlightedObject = null; 

const clock = new THREE.Clock();

init();

function init() {

    camera = new THREE.PerspectiveCamera( 25, SCREEN_WIDTH / SCREEN_HEIGHT, 50, 1e7 );
    camera.position.z = radius * 5;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2( 0x000000, 0.00000025 );

    dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
    dirLight.position.set( - 1, 0, 1 ).normalize();
    scene.add( dirLight );

    const materialNormalMap = new THREE.MeshPhongMaterial( {

        specular: 0x7c7c7c,
        shininess: 15,
        map: textureLoader.load( 'textures/planets/earth_atmos_2048.jpg' ),
        specularMap: textureLoader.load( 'textures/planets/earth_specular_2048.jpg' ),
        normalMap: textureLoader.load( 'textures/planets/earth_normal_2048.jpg' ),

        // y scale is negated to compensate for normal map handedness.
        normalScale: new THREE.Vector2( 0.85, - 0.85 )

    } );
    materialNormalMap.map.colorSpace = THREE.SRGBColorSpace;

    // planeta Terra

    geometry = new THREE.SphereGeometry( radius, 100, 50 );

    earth_planet = new THREE.Mesh( geometry, materialNormalMap );
    earth_planet.rotation.y = 0;
    earth_planet.rotation.z = tilt;
    scene.add( earth_planet );

    // Órbita da Terra
    const orbitRadiusX = radius * 30; // Raio maior da órbita
    const orbitRadiusY = radius * 25; // Raio menor da órbita
    const earth_orbit_curve = new THREE.EllipseCurve(
        0, 0, // Centro
        orbitRadiusX, orbitRadiusY, // Raio da órbita
        0, 2 * Math.PI, // Ângulo inicial e final (círculo completo)
        false, // Sentido horário ou anti-horário
        0 // Rotação
    );

    const points = earth_orbit_curve.getPoints(100);
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);

    // Criar a linha que representa a órbita
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const earth_orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(earth_orbit);

    // Nuvens

    const materialClouds = new THREE.MeshLambertMaterial( {

        map: textureLoader.load( 'textures/planets/earth_clouds_1024.png' ),
        transparent: true

    } );
    materialClouds.map.colorSpace = THREE.SRGBColorSpace;

    meshClouds = new THREE.Mesh( geometry, materialClouds );
    meshClouds.scale.set( cloudsScale, cloudsScale, cloudsScale );
    meshClouds.rotation.z = tilt;
    scene.add( meshClouds );

    // Lua

    const materialMoon = new THREE.MeshPhongMaterial( {

        map: textureLoader.load( 'textures/planets/moon_1024.jpg' )

    } );
    materialMoon.map.colorSpace = THREE.SRGBColorSpace;

    meshMoon = new THREE.Mesh( geometry, materialMoon );
    meshMoon.position.set( radius * 5, 0, 0 );
    meshMoon.scale.set( moonScale, moonScale, moonScale );
    scene.add( meshMoon );

    // Estrelas

    const r = radius, starsGeometry = [ new THREE.BufferGeometry(), new THREE.BufferGeometry() ];

    const vertices1 = [];
    const vertices2 = [];

    const vertex = new THREE.Vector3();

    for ( let i = 0; i < 250; i ++ ) {

        vertex.x = Math.random() * 2 - 1;
        vertex.y = Math.random() * 2 - 1;
        vertex.z = Math.random() * 2 - 1;
        vertex.multiplyScalar( r );

        vertices1.push( vertex.x, vertex.y, vertex.z );

    }

    for ( let i = 0; i < 1500; i ++ ) {

        vertex.x = Math.random() * 2 - 1;
        vertex.y = Math.random() * 2 - 1;
        vertex.z = Math.random() * 2 - 1;
        vertex.multiplyScalar( r );

        vertices2.push( vertex.x, vertex.y, vertex.z );

    }

    starsGeometry[ 0 ].setAttribute( 'position', new THREE.Float32BufferAttribute( vertices1, 3 ) );
    starsGeometry[ 1 ].setAttribute( 'position', new THREE.Float32BufferAttribute( vertices2, 3 ) );

    const starsMaterials = [
        new THREE.PointsMaterial( { color: 0x9c9c9c } ),
        new THREE.PointsMaterial( { color: 0x838383 } ),
        new THREE.PointsMaterial( { color: 0x5a5a5a } )
    ];

    for ( let i = 10; i < 30; i ++ ) {

        const stars = new THREE.Points( starsGeometry[ i % 2 ], starsMaterials[ i % 3 ] );

        stars.rotation.x = Math.random() * 6;
        stars.rotation.y = Math.random() * 6;
        stars.rotation.z = Math.random() * 6;
        stars.scale.setScalar( i * 10 );

        stars.matrixAutoUpdate = false;
        stars.updateMatrix();

        scene.add( stars );

    }

    renderer = new THREE.WebGPURenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    renderer.setAnimationLoop( animate );
    document.body.appendChild( renderer.domElement );

    // Controle de câmera 

    controls = new FlyControls( camera, renderer.domElement );

    controls.movementSpeed = 1000;
    controls.domElement = renderer.domElement;

    controls.rollSpeed = Math.PI / 24;
    controls.autoForward = false;
    controls.dragToLook = false;

    //

    stats = new Stats();
    document.body.appendChild( stats.dom );

    window.addEventListener( 'resize', onWindowResize );

    // postprocessing

    postProcessing = new THREE.PostProcessing( renderer );

    const scenePass = pass( scene, camera );
    const scenePassColor = scenePass.getTextureNode();

    postProcessing.outputNode = film( scenePassColor );

}

function onWindowResize() {

    SCREEN_HEIGHT = window.innerHeight;
    SCREEN_WIDTH = window.innerWidth;

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

}

// Função para detectar interseção
function onMouseMove(event) {
    // Normalizar coordenadas do mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Atualizar o raycaster
    raycaster.setFromCamera(mouse, camera);

    // Verificar interseções
    const intersects = raycaster.intersectObjects(scene.children, true); // Use "true" para verificar objetos aninhados

    if (intersects.length > 0) {
        if (highlightedObject !== intersects[0].object) {
            if (highlightedObject) {
                // Resetar o último objeto destacado
                highlightedObject.material.opacity = 1;
                highlightedObject.material.emissive.set(0x000000); // Remova o brilho
            }
            // Aplicar destaque no novo objeto
            highlightedObject = intersects[0].object;
            highlightedObject.material.opacity = 0.3;
            highlightedObject.material.emissive.set(0x2cd3e6); // Amarelo como borda/brilho
        }
    } else if (highlightedObject) {
        // Resetar quando não houver interseção
        highlightedObject.material.opacity = 1;
        highlightedObject.material.emissive.set(0x000000);
        highlightedObject = null;
    }
}

// Adicionar o evento de movimento do mouse
window.addEventListener('mousemove', onMouseMove);

function animate() {

    render();
    stats.update();

}

function render() {

    // const position = earth_orbit_curve.getPointAt(t); // Obtém a posição na curva para t [0, 1]
    // sphere.position.set(position.x, position.y, 0);
    // t += 0.003 + velocity; // Incremento para animação
    // if (t > 1) t = 0; // Reinicia t quando atinge o final

    // rotate the planet and clouds

    const delta = clock.getDelta();

    earth_planet.rotation.y += rotationSpeed * delta;
    meshClouds.rotation.y += 1.25 * rotationSpeed * delta;

    // slow down as we approach the surface

    dPlanet = camera.position.length();

    dMoonVec.subVectors( camera.position, meshMoon.position );
    dMoon = dMoonVec.length();

    if ( dMoon < dPlanet ) {

        d = ( dMoon - radius * moonScale * 1.01 );

    } else {

        d = ( dPlanet - radius * 1.01 );

    }

    controls.movementSpeed = 0.33 * d;
    controls.update( delta );

    postProcessing.render();

}
