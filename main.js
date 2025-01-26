import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

let scene, camera, renderer;
let sky;
const sun = new THREE.Vector3();

const effectController = {
  turbidity: 10,
  rayleigh: 3,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.7,
  elevation: 2,
  azimuth: 180,
  exposure: 0.5,
};

init();
animate();

function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = effectController.exposure;
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, 0, 1000);

  // Sky
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  // Initial sun position
  updateSun();

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

function updateSun() {
  const uniforms = sky.material.uniforms;
  uniforms['turbidity'].value = effectController.turbidity;
  uniforms['rayleigh'].value = effectController.rayleigh;
  uniforms['mieCoefficient'].value = effectController.mieCoefficient;
  uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

  const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
  const theta = THREE.MathUtils.degToRad(effectController.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);
  uniforms['sunPosition'].value.copy(sun);
}

function animate(time) {
  requestAnimationFrame(animate);

  // Animate sun position over time
  const t = time * 0.0001;
  effectController.elevation = Math.sin(t) * 15 + 50; // Elevation oscillates between 35 and 65 degrees
  effectController.azimuth = (t * 10) % 360; // Azimuth rotates continuously

  updateSun();

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}