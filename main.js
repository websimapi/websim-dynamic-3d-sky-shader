import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, controls, composer;
let sky, stars, cloudParticles = [], flash;
const sun = new THREE.Vector3();

const effectController = {
  turbidity: 6,
  rayleigh: 2,
  mieCoefficient: 0.015,
  mieDirectionalG: 0.8,
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
  scene.fog = new THREE.FogExp2(0x11111f, 0.0001);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
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

  // Post Processing
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  );
  composer.addPass(bloomPass);

  // Sky
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0x555555);
  scene.add(ambientLight);

  // Stars
  createStars();
  
  // Volumetric Clouds
  createVolumetricClouds();

  // Lightning
  createLightning();

  // Initial sun position
  updateSun();

  window.addEventListener('resize', onWindowResize);
}

function createStars() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 2,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: false
  });

  const starsVertices = [];
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 2000 - 1000;
    const y = Math.random() * 2000 - 1000;
    const z = Math.random() * 2000 - 1000;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

function createVolumetricClouds() {
  const loader = new THREE.TextureLoader();
  const cloudTexture = new THREE.TextureLoader().load(
    'data:image/png;base64,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'
  );

  const cloudGeometry = new THREE.PlaneBufferGeometry(500, 500);
  const cloudMaterial = new THREE.MeshLambertMaterial({
    map: cloudTexture,
    transparent: true
  });

  for(let p = 0; p < 50; p++) {
    let cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(
      Math.random() * 1000 - 500,
      Math.random() * 200 + 200,
      Math.random() * 1000 - 500
    );
    cloud.rotation.x = 1.16;
    cloud.rotation.y = -0.12;
    cloud.rotation.z = Math.random() * 2 * Math.PI;
    cloud.material.opacity = 0.55;
    cloudParticles.push(cloud);
    scene.add(cloud);
  }
}

function createLightning() {
  flash = new THREE.PointLight(0x062d89, 30, 500, 1.7);
  flash.position.set(200, 300, 100);
  scene.add(flash);
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

  if (stars) {
    stars.material.opacity = Math.max(0, 0.8 - effectController.elevation / 90);
  }
}

function animate(time) {
  requestAnimationFrame(animate);

  // Animate sun position
  const t = time * 0.0001;
  effectController.elevation = Math.sin(t) * 15 + 50;
  effectController.azimuth = (t * 10) % 360;

  // Animate clouds
  cloudParticles.forEach(p => {
    p.rotation.z -= 0.001;
  });

  // Animate lightning
  if(Math.random() > 0.93 || flash.power > 100) {
    if(flash.power < 100) {
      flash.position.set(
        Math.random() * 400,
        300 + Math.random() * 200,
        100
      );
    }
    flash.power = 50 + Math.random() * 500;
  }

  updateSun();
  controls.update();
  composer.render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}