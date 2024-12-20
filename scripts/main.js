import * as THREE from "three";
import { Planet } from "./Planet.js";
import { planets } from "./planets.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container").appendChild(renderer.domElement);

// Sol
const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: new THREE.TextureLoader().load("../assets/textures/sun_texture.jpg"),
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Adiciona os planetas
const planetObjects = planets.map(planetData => {
  const planet = new Planet(planetData);
  scene.add(planet.mesh);
  return planet;
});

// Posição da câmera
camera.position.z = 50;

// Animação
function animate() {
  requestAnimationFrame(animate);

  // Atualiza os planetas
  planetObjects.forEach(planet => planet.update());

  renderer.render(scene, camera);
}
animate();
