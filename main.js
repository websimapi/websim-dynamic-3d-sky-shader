import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderMaterial } from 'three';

let scene, camera, renderer, controls, composer;
let sky, stars, cloudSystems = [], flash;
const sun = new THREE.Vector3();

// Enhanced effect controller with adjusted cloud parameters
const effectController = {
  turbidity: 6,
  rayleigh: 2,
  mieCoefficient: 0.015,
  mieDirectionalG: 0.8,
  elevation: 2,
  azimuth: 180,
  exposure: 0.5,
  cloudDensity: 1.2, 
  windSpeed: 0.2,
  temperature: 20,
};

// Modified cloud shader with enhanced whiteness
const cloudShader = {
  uniforms: {
    time: { value: 0 },
    density: { value: 1.2 }, 
    altitude: { value: 0.0 },
    lightPos: { value: new THREE.Vector3() },
    temperature: { value: 20.0 }
  },
  vertexShader: `
    varying vec3 vPosition;
    varying vec2 vUv;
    void main() {
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float density;
    uniform float altitude;
    uniform float temperature;
    uniform vec3 lightPos;
    varying vec3 vPosition;
    varying vec2 vUv;

    // Noise functions
    float rand(vec2 n) { 
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 ip = floor(p);
      vec2 u = fract(p);
      u = u*u*(3.0-2.0*u);
      float res = mix(
        mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
        mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
      return res*res;
    }

    float fbm(vec2 p) {
      float f = 0.0;
      float w = 0.5;
      for (int i = 0; i < 5; i++) {
        f += w * noise(p);
        p *= 2.0;
        w *= 0.5;
      }
      return f;
    }

    void main() {
      // Worley noise-based density
      float n = fbm(vUv * 4.0 + time * 0.1);
      
      // Altitude-based density
      float altitudeFactor = smoothstep(0.0, 1.0, 1.0 - abs(altitude - vPosition.y) / 100.0);
      
      // Whiter cloud color palette
      vec3 cloudColor = mix(
        vec3(0.95, 0.95, 0.97), 
        vec3(1.0, 1.0, 1.0),    
        smoothstep(0.0, 30.0, temperature)
      );

      // Light scattering
      vec3 lightDir = normalize(lightPos - vPosition);
      float scatter = max(0.0, dot(lightDir, vec3(0.0, 1.0, 0.0)));
      
      // Enhanced alpha for thicker clouds
      float alpha = n * density * altitudeFactor * 1.5;
      // Enhance brightness
      vec3 finalColor = cloudColor * (0.8 + 0.4 * scatter);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
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
  createCumulusClouds();
  createCirrusClouds();
  createStratusClouds();

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

function createCumulusClouds() {
  const cloudGeometry = new THREE.SphereBufferGeometry(50, 32, 32);
  const material = new ShaderMaterial({
    ...cloudShader,
    transparent: true,
    depthWrite: false,
  });

  // Increased number of cumulus clouds
  for(let i = 0; i < 40; i++) { 
    const cloud = new THREE.Mesh(cloudGeometry, material.clone());
    cloud.position.set(
      Math.random() * 1200 - 600,
      Math.random() * 150 + 250,
      Math.random() * 1200 - 600
    );
    cloud.scale.setScalar(1.5 + Math.random() * 2.5); 
    cloud.material.uniforms.altitude.value = cloud.position.y;
    cloud.material.uniforms.density.value = 1.2 + Math.random() * 0.3; 
    cloudSystems.push({ mesh: cloud, type: 'cumulus' });
    scene.add(cloud);
  }
}

function createCirrusClouds() {
  const cloudGeometry = new THREE.PlaneBufferGeometry(300, 30); 
  const material = new ShaderMaterial({
    ...cloudShader,
    transparent: true,
    depthWrite: false,
  });

  for(let i = 0; i < 45; i++) { 
    const cloud = new THREE.Mesh(cloudGeometry, material.clone());
    cloud.position.set(
      Math.random() * 1200 - 600,
      Math.random() * 100 + 500,
      Math.random() * 1200 - 600
    );
    cloud.rotation.x = Math.PI / 2;
    cloud.rotation.z = Math.random() * Math.PI;
    cloud.material.uniforms.density.value = 0.5; 
    cloud.material.uniforms.altitude.value = cloud.position.y;
    cloudSystems.push({ mesh: cloud, type: 'cirrus' });
    scene.add(cloud);
  }
}

function createStratusClouds() {
  const cloudGeometry = new THREE.PlaneBufferGeometry(600, 600); 
  const material = new ShaderMaterial({
    ...cloudShader,
    transparent: true,
    depthWrite: false,
  });

  for(let i = 0; i < 15; i++) { 
    const cloud = new THREE.Mesh(cloudGeometry, material.clone());
    cloud.position.set(
      Math.random() * 1200 - 600,
      Math.random() * 50 + 200,
      Math.random() * 1200 - 600
    );
    cloud.rotation.x = Math.PI / 2;
    cloud.material.uniforms.density.value = 0.8; 
    cloud.material.uniforms.altitude.value = cloud.position.y;
    cloudSystems.push({ mesh: cloud, type: 'stratus' });
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

function updateClouds(time) {
  cloudSystems.forEach(cloudSystem => {
    const { mesh, type } = cloudSystem;
    mesh.material.uniforms.time.value = time;
    mesh.material.uniforms.temperature.value = effectController.temperature;
    mesh.material.uniforms.lightPos.value.copy(sun);

    // Type-specific updates
    switch(type) {
      case 'cumulus':
        mesh.position.y += Math.sin(time * 0.001 + mesh.position.x) * 0.1;
        break;
      case 'cirrus':
        mesh.position.x += effectController.windSpeed;
        if(mesh.position.x > 500) mesh.position.x = -500;
        break;
      case 'stratus':
        mesh.material.uniforms.density.value = 
          0.5 + 0.2 * Math.sin(time * 0.0005 + mesh.position.z);
        break;
    }
  });
}

function animate(time) {
  requestAnimationFrame(animate);

  // Animate sun position
  const t = time * 0.0001;
  effectController.elevation = Math.sin(t) * 15 + 50;
  effectController.azimuth = (t * 10) % 360;

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
  updateClouds(time);
  controls.update();
  composer.render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}