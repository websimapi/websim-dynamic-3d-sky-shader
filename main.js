import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let sky, stars, clouds;
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
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.set(0, 100, 1000);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.65;
  controls.minDistance = 100;
  controls.maxDistance = 2000;

  // Sky
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  // Stars
  createStars();
  
  // Clouds
  createClouds();

  // Ground plane
  createGround();

  // Initial sun position
  updateSun();

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

function createStars() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 1,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: false
  });

  const starsVertices = [];
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 2000 - 1000;
    const y = Math.random() * 2000 - 1000;
    const z = Math.random() * 2000 - 1000;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

function createClouds() {
  const cloudGeometry = new THREE.SphereGeometry(1000, 32, 32);
  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  clouds = new THREE.Group();

  for (let i = 0; i < 20; i++) {
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(
      Math.random() * 2000 - 1000,
      Math.random() * 200 + 200,
      Math.random() * 2000 - 1000
    );
    cloud.scale.set(
      Math.random() * 0.3 + 0.1,
      Math.random() * 0.2 + 0.1,
      Math.random() * 0.3 + 0.1
    );
    clouds.add(cloud);
  }

  scene.add(clouds);
}

function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
  const groundMaterial = new THREE.MeshPhongMaterial({
    color: 0x225522,
    side: THREE.DoubleSide
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -100;
  ground.receiveShadow = true;
  scene.add(ground);
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

  // Update star visibility based on sun elevation
  if (stars) {
    stars.material.opacity = Math.max(0, 0.8 - effectController.elevation / 90);
  }
}

function animate(time) {
  requestAnimationFrame(animate);

  // Animate sun position over time
  const t = time * 0.0001;
  effectController.elevation = Math.sin(t) * 15 + 50;
  effectController.azimuth = (t * 10) % 360;

  // Animate clouds
  if (clouds) {
    clouds.children.forEach((cloud, index) => {
      cloud.position.x += Math.sin(t + index) * 0.2;
      cloud.position.z += Math.cos(t + index) * 0.2;
      
      // Reset cloud position if it moves too far
      if (cloud.position.x > 1000) cloud.position.x = -1000;
      if (cloud.position.x < -1000) cloud.position.x = 1000;
      if (cloud.position.z > 1000) cloud.position.z = -1000;
      if (cloud.position.z < -1000) cloud.position.z = 1000;
    });
  }

  updateSun();
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}