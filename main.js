import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { gsap } from 'gsap';

/* ==========================================================================
   EXTRACTED BEANS - 3D INTERACTIVE EXPERIENCE
   Single Origin Specialty Coffee 3D Visualizer & Animation
   ========================================================================== */

// --- 1. SETUP YOUR VARIABLES ---
let isZoomed = false;
const animationDuration = 2.5; // Seconds per cycle

// Default camera positions
const defaultZ = 5;
const zoomedZ = 2;

// Scene Core Variables
let scene, camera, renderer, model, beanGroup, groundMesh, shadowMesh;
let keyLight, fillLight, rimLight, ambientLight;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0.2, y: 0 };
let mouseParallax = { x: 0, y: 0 };
let currentRoast = 'silver';
let audioEnabled = false;
let audioCtx = null;

// Material Finishes & Profiles (Centered on Clean Silver Grey)
const roastProfiles = {
  silver: {
    title: "Silver Grey Sculpted Bean",
    tag: "STUDIO EDITION // SILVER GREY",
    altitude: "Cast Solid",
    process: "Precision Satin Polish",
    varietal: "999 Fine Silver Alloy",
    roast: "Specular 0.28 Ra",
    notes: ["Satin Silver", "Clean Specular", "Soft Highlight", "Cool Metallic"],
    density: "Noble Metal (10.49g/cm³)",
    temp: "Ambient Studio",
    tds: "85% Specular Reflectance",
    roastPercent: "100%",
    color: 0xd2d7de,
    roughness: 0.28,
    metalness: 0.72,
    clearcoat: 0.35,
    sheenColor: 0xffffff,
    lightColor: 0xfff7ec
  },
  platinum: {
    title: "Brushed Platinum Edition",
    tag: "LIMITED RESERVE // PLATINUM",
    altitude: "Vapor Coated",
    process: "Brushed Micro-Grain",
    varietal: "Platinum Specular",
    roast: "Mirror Satin 0.18 Ra",
    notes: ["Luminous White", "Mirror Highlight", "Platinum Sheen", "Crisp Edge"],
    density: "Ultra Dense (21.45g/cm³)",
    temp: "Cold Chamber",
    tds: "92% Specular Reflectance",
    roastPercent: "100%",
    color: 0xe8ebf0,
    roughness: 0.20,
    metalness: 0.62,
    clearcoat: 0.45,
    sheenColor: 0xffffff,
    lightColor: 0xffffff
  },
  titanium: {
    title: "Matte Titanium Reserve",
    tag: "INDUSTRIAL LAB // TITANIUM",
    altitude: "Anodized",
    process: "Matte Sandblasted",
    varietal: "Aerospace Ti-6Al-4V",
    roast: "Matte 0.45 Ra",
    notes: ["Gunmetal Grey", "Deep Contrast", "Velvet Shadow", "Satin Dark"],
    density: "Light Alloy (4.43g/cm³)",
    temp: "Thermal Vacuum",
    tds: "65% Specular Reflectance",
    roastPercent: "95%",
    color: 0x7a818c,
    roughness: 0.40,
    metalness: 0.65,
    clearcoat: 0.20,
    sheenColor: 0xb5bcc7,
    lightColor: 0xe8ecf2
  },
  gold: {
    title: "24K Champagne Gold Reserve",
    tag: "SPECIAL EDITION // 24K GOLD",
    altitude: "Stratosphere",
    process: "Atomic Vapor Deposition",
    varietal: "Pure Aurum 24K",
    roast: "Luminous Polish",
    notes: ["Champagne Gold", "Warm Reflection", "Amber Luster", "Golden Glow"],
    density: "Noble Metal (19.3g/cm³)",
    temp: "Furnace Annealed",
    tds: "95% Gold Standard",
    roastPercent: "100%",
    color: 0xd4b37f,
    roughness: 0.22,
    metalness: 0.88,
    clearcoat: 0.50,
    sheenColor: 0xfff3dd,
    lightColor: 0xfff3dd
  }
};

/* ==========================================================================
   Initialize Three.js World
   ========================================================================== */
function initThree() {
  const canvas = document.getElementById('webgl-canvas');
  
  // 1. Scene & Atmospheric Fog (Centering around #F9F8F6)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9f8f6);
  scene.fog = new THREE.FogExp2(0xf9f8f6, 0.036);

  // 2. Camera setup with defaultZ, lifted a bit with downward tilt
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.25, defaultZ);
  camera.lookAt(0, 0, 0);

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 4. Lighting Rig
  setupLighting();

  // 5. Build Ground & Contact Shadow
  createCleanGround();
  createContactShadow();

  // 6. Interaction Handlers
  setupInteractivity();

  // 7. Load 3D Model with Fallback Pipeline
  loadCentralModel();

  // 8. Render Loop
  animate(0);
}

/* ==========================================================================
   Studio Lighting Setup (Soft Nordic Daylight & Caramel Accents)
   ========================================================================== */
function setupLighting() {
  // Ambient Soft Daylight (#F9F8F6)
  ambientLight = new THREE.AmbientLight(0xf9f8f6, 2.0);
  scene.add(ambientLight);

  // Key Light (Warm daylight from upper right #FFF7EC)
  keyLight = new THREE.DirectionalLight(0xfff7ec, 2.8);
  keyLight.position.set(4, 5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  // Rim Light (Warm caramel rim highlighting silhouette #C9B59C)
  rimLight = new THREE.DirectionalLight(0xc9b59c, 2.8);
  rimLight.position.set(-4, -2, -3.5);
  scene.add(rimLight);

  // Top Fill Light (Soft neutral oat bounce #EFE9E3)
  fillLight = new THREE.DirectionalLight(0xefe9e3, 1.8);
  fillLight.position.set(-3, 4, 2);
  scene.add(fillLight);
}

/* ==========================================================================
   3D Model Loader Pipeline (GLTFLoader + DRACOLoader + Bounding Normalization)
   High-performance glTF streaming with Draco geometry decompression
   ========================================================================== */
const MODEL_PATH = 'assets/coffee_bean.glb';
let modelSource = 'INITIALIZING';

function updateLoaderUI(percent, statusText) {
  const progressBar = document.getElementById('model-load-progress');
  const percentText = document.getElementById('model-load-percent');
  const statusEl = document.getElementById('model-load-status');

  if (progressBar) progressBar.style.width = `${percent}%`;
  if (percentText) percentText.textContent = `${percent}%`;
  if (statusEl && statusText) statusEl.textContent = statusText;
}

function finishLoaderUI(success, finalStatus) {
  const loaderOverlay = document.getElementById('model-loader');
  const progressBar = document.getElementById('model-load-progress');
  const percentText = document.getElementById('model-load-percent');
  const statusEl = document.getElementById('model-load-status');

  if (progressBar) progressBar.style.width = '100%';
  if (percentText) percentText.textContent = '100%';
  if (statusEl && finalStatus) statusEl.textContent = finalStatus;

  setTimeout(() => {
    if (loaderOverlay) {
      loaderOverlay.classList.add('loaded');
    }
  }, 900);
}

function updateModelSourceTelemetry(text) {
  const srcEl = document.getElementById('hud-model-src');
  if (srcEl) {
    srcEl.textContent = text;
  }
}

/* ==========================================================================
   Clean Silver Grey Material Finish
   Applies a lustrous satin silver PBR finish with crisp highlights and reflections
   ========================================================================== */
function applySilverGreyFinish(target) {
  if (!target) return;
  target.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      const silverMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xd2d7de),       // Clean lustrous silver grey
        metalness: 0.72,                        // Satin metallic sheen
        roughness: 0.28,                        // Silky reflection
        clearcoat: 0.35,                        // Clearcoat glossy finish
        clearcoatRoughness: 0.2,
        reflectivity: 0.85
      });
      child.material = silverMat;
      child.material.needsUpdate = true;
    }
  });
}

/* ==========================================================================
   Material Finish Application (Traverses mesh hierarchy with GSAP)
   ========================================================================== */
function applyRoastToModel(target, profile) {
  if (!target || !profile) return;

  target.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        if (mat.color && profile.color !== undefined) {
          gsap.to(mat.color, {
            r: new THREE.Color(profile.color).r,
            g: new THREE.Color(profile.color).g,
            b: new THREE.Color(profile.color).b,
            duration: 1.2,
            ease: "power2.out"
          });
        }
        if (mat.roughness !== undefined && profile.roughness !== undefined) {
          gsap.to(mat, {
            roughness: profile.roughness,
            metalness: profile.metalness ?? mat.metalness,
            clearcoat: profile.clearcoat ?? (mat.clearcoat || 0),
            duration: 1.2
          });
        }
        if (mat.sheenColor && profile.sheenColor !== undefined) {
          gsap.to(mat.sheenColor, {
            r: new THREE.Color(profile.sheenColor).r,
            g: new THREE.Color(profile.sheenColor).g,
            b: new THREE.Color(profile.sheenColor).b,
            duration: 1.2
          });
        }
      });
    }
  });
}

function loadCentralModel() {
  updateLoaderUI(10, `Checking for ${MODEL_PATH}...`);

  if (!beanGroup) {
    beanGroup = new THREE.Group();
    scene.add(beanGroup);
  }

  // Setup LoadingManager and DRACOLoader
  const manager = new THREE.LoadingManager();
  
  manager.onProgress = (item, loaded, total) => {
    const percent = Math.min(95, Math.round((loaded / total) * 100));
    updateLoaderUI(percent, `Streaming assets (${loaded}/${total})...`);
  };

  const dracoLoader = new DRACOLoader(manager);
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  dracoLoader.setDecoderConfig({ type: 'js' });

  const gltfLoader = new GLTFLoader(manager);
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    MODEL_PATH,
    (gltf) => {
      console.log('Successfully loaded 3D GLB model:', MODEL_PATH);

      if (model && beanGroup.children.includes(model)) {
        beanGroup.remove(model);
      }

      const importedScene = gltf.scene;

      // Compute bounding box and normalize scale & pivot
      const box = new THREE.Box3().setFromObject(importedScene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      // Target max dimension ~2.4 units to fill camera view at Z=5
      const targetScale = maxDim > 0.0001 ? 2.4 / maxDim : 1.0;

      // Pivot wrapper to center geometry at origin
      const pivot = new THREE.Group();
      importedScene.position.set(-center.x, -center.y, -center.z);
      pivot.add(importedScene);
      pivot.scale.setScalar(targetScale);
      
      // 3/4 view resting angle (tilted slightly downwards, classic three-quarter presentation)
      pivot.rotation.set(0.28, -Math.PI / 4, 0.12);

      // Apply clean silver grey material finish (removes any brown color)
      applySilverGreyFinish(pivot);

      model = pivot;
      beanGroup.add(model);

      modelSource = 'GLB (assets/coffee_bean.glb)';
      updateModelSourceTelemetry(modelSource);
      finishLoaderUI(true, 'GLB Model Loaded');

      // Trigger elegant 3/4 view fade-in entrance
      playModelFadeInAnimation();
    },
    (xhr) => {
      if (xhr.lengthComputable && xhr.total > 0) {
        const percent = Math.min(95, Math.round((xhr.loaded / xhr.total) * 100));
        updateLoaderUI(percent, `Downloading ${Math.round(xhr.loaded / 1024)} KB...`);
      }
    },
    (error) => {
      console.warn(`Could not load ${MODEL_PATH} (${error.message || 'File not found'}), activating procedural coffee bean fallback.`);

      if (model && beanGroup.children.includes(model)) {
        beanGroup.remove(model);
      }

      createCoffeeBeanModel();

      modelSource = 'PROCEDURAL (Ready for assets/coffee_bean.glb)';
      updateModelSourceTelemetry(modelSource);
      finishLoaderUI(false, 'Using Procedural Bean (Place coffee_bean.glb in assets/)');

      // Trigger elegant 3/4 view fade-in entrance
      playModelFadeInAnimation();
    }
  );
}

/* ==========================================================================
   Procedural 3D Coffee Bean Generation (Fallback & Standalone)
   Creates an authentic, anatomically sculpted coffee bean with crevice & cleft
   ========================================================================== */
function createCoffeeBeanModel() {
  if (!beanGroup) {
    beanGroup = new THREE.Group();
    scene.add(beanGroup);
  }

  // 1. Generate High Resolution Procedural Textures
  const { diffuseMap, bumpMap, roughnessMap } = generateCoffeeBeanTextures();

  // 2. Sculpt Parametric Coffee Bean Geometry
  // A high-density sphere deformed along ellipsoidal axes with a deep curved cleft
  const segments = 128;
  const geometry = new THREE.SphereGeometry(1.0, segments, segments);
  const positionAttribute = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i);

    // Initial bean dimensions (elongated Y, broad X, flatter Z)
    let x = vertex.x * 1.05;
    let y = vertex.y * 1.42;
    let z = vertex.z * 0.72;

    // Organic taper towards tips (narrower at the top and bottom)
    const taper = 1.0 - Math.pow(Math.abs(vertex.y), 2.2) * 0.28;
    x *= taper;
    z *= taper;

    // The iconic front coffee bean crevice (on the front face, z > 0)
    if (vertex.z > -0.15) {
      // Natural organic S-curve groove
      const centerS = Math.sin(y * 2.2) * 0.08 + Math.sin(y * 5.0) * 0.02;
      const distFromCenter = x - centerS;
      
      // Crevice profile using Gaussian groove
      const cleftWidth = 0.18;
      const inGroove = Math.exp(-Math.pow(distFromCenter / cleftWidth, 2));

      // Indent crease inwards towards the center of the bean
      const cleftDepth = 0.42 * (1.0 - Math.pow(Math.abs(y / 1.42), 2) * 0.5);
      z -= inGroove * cleftDepth;

      // Raised lip edges along each side of the crevice
      const lipDistance = Math.abs(distFromCenter) - 0.22;
      const lipHeight = Math.exp(-Math.pow(lipDistance / 0.16, 2)) * 0.09;
      z += lipHeight;
    } else {
      // Back side: smooth rounded dome with subtle spinal ridge
      const backRidge = Math.exp(-Math.pow(x / 0.4, 2)) * 0.05;
      z -= backRidge;
    }

    // Micro surface noise for natural organic bean feel
    const surfaceNoise = (Math.sin(x * 12.0) * Math.cos(y * 14.0) * Math.sin(z * 10.0)) * 0.012;
    x += surfaceNoise;
    y += surfaceNoise;
    z += surfaceNoise;

    positionAttribute.setXYZ(i, x, y, z);
  }

  geometry.computeVertexNormals();

  // 3. Physically Based Material with Clearcoat Sheen
  const profile = roastProfiles[currentRoast];
  const material = new THREE.MeshPhysicalMaterial({
    color: profile.color,
    map: diffuseMap,
    bumpMap: bumpMap,
    bumpScale: 0.025,
    roughnessMap: roughnessMap,
    roughness: profile.roughness,
    metalness: profile.metalness,
    clearcoat: profile.clearcoat,
    clearcoatRoughness: 0.2,
    sheen: 0.35,
    sheenColor: new THREE.Color(profile.sheenColor),
    reflectivity: 0.6,
  });

  // Assign the mesh as our flagship `model`
  model = new THREE.Mesh(geometry, material);
  model.castShadow = true;
  model.receiveShadow = true;
  model.scale.set(1.2, 1.2, 1.2);
  model.rotation.set(0.2, -0.4, 0.15); // Appealing default resting angle

  beanGroup.add(model);
}


/* ==========================================================================
   Procedural Texture Generation (Canvas-based)
   Generates rich roasted bean patterns, micro-pores, and chaff center seam
   ========================================================================== */
function generateCoffeeBeanTextures() {
  const size = 1024;
  
  // 1. Diffuse / Albedo Canvas
  const diffuseCanvas = document.createElement('canvas');
  diffuseCanvas.width = size;
  diffuseCanvas.height = size;
  const ctx = diffuseCanvas.getContext('2d');

  // Base roasted gradient
  const bgGrad = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.55);
  bgGrad.addColorStop(0, '#5a2d18');
  bgGrad.addColorStop(0.5, '#3b1c0e');
  bgGrad.addColorStop(1, '#200f07');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Cellular pores and micro speckles
  for (let i = 0; i < 6000; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const rad = Math.random() * 2.5 + 0.5;
    const brightness = Math.random() * 30;
    ctx.fillStyle = `rgba(${60 + brightness}, ${30 + brightness / 2}, ${15}, 0.25)`;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Chaff / Silver-skin center vein (matching palette oat #EFE9E3)
  ctx.save();
  ctx.strokeStyle = 'rgba(239, 233, 227, 0.75)';
  ctx.lineWidth = 14;
  ctx.filter = 'blur(6px)';
  ctx.beginPath();
  ctx.moveTo(size / 2, 80);
  ctx.bezierCurveTo(size / 2 + 30, size * 0.35, size / 2 - 30, size * 0.65, size / 2, size - 80);
  ctx.stroke();
  ctx.restore();

  // 2. Bump / Normal Details Canvas
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Micro-crevices and fibrous lines
  for (let i = 0; i < 400; i++) {
    const lx = Math.random() * size;
    const ly = Math.random() * size;
    const len = Math.random() * 60 + 20;
    const angle = Math.random() * Math.PI;
    bCtx.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    bCtx.globalAlpha = 0.12;
    bCtx.lineWidth = Math.random() * 3 + 1;
    bCtx.beginPath();
    bCtx.moveTo(lx, ly);
    bCtx.lineTo(lx + Math.cos(angle) * len, ly + Math.sin(angle) * len);
    bCtx.stroke();
  }

  // 3. Roughness Canvas
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#666666';
  rCtx.fillRect(0, 0, size, size);

  // Convert to Three.js Textures
  const diffuseMap = new THREE.CanvasTexture(diffuseCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);

  return { diffuseMap, bumpMap, roughnessMap };
}

/* ==========================================================================
   Realistic Contact Shadow
   ========================================================================== */
function createContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 110);
  grad.addColorStop(0, 'rgba(40, 28, 20, 0.45)');
  grad.addColorStop(0.35, 'rgba(80, 60, 48, 0.22)');
  grad.addColorStop(0.7, 'rgba(140, 120, 105, 0.08)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.52,
    depthWrite: false
  });

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -1.238;
  scene.add(shadowMesh);
}

/* ==========================================================================
   Clean White Ground Plane
   ========================================================================== */
function createCleanGround() {
  const groundGeo = new THREE.PlaneGeometry(120, 120);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.02
  });
  groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -1.24;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
}

/* ==========================================================================
   Model Fade-In Animation (Clean 3/4 View Cinematic Entrance)
   ========================================================================== */
function playModelFadeInAnimation() {
  if (!model) return;

  // Ensure beanGroup stays firmly grounded at center
  if (beanGroup) {
    beanGroup.position.set(0, 0, 0);
    beanGroup.rotation.set(0, 0, 0);
  }

  // Kill running animations
  gsap.killTweensOf(model.scale);
  if (shadowMesh) gsap.killTweensOf(shadowMesh.material);

  const fadeTl = gsap.timeline({
    delay: 0.15
  });

  // Fade in all mesh materials
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = 0;
        fadeTl.to(mat, {
          opacity: 1,
          duration: 1.8,
          ease: "power2.out"
        }, 0);
      });
    }
  });

  // Smooth subtle scale entrance from 95% to 100%
  const currentScale = model.scale.x;
  model.scale.multiplyScalar(0.95);
  fadeTl.to(model.scale, {
    x: currentScale,
    y: currentScale,
    z: currentScale,
    duration: 1.8,
    ease: "power2.out"
  }, 0);

  // Contact shadow fades in smoothly with the model
  if (shadowMesh) {
    shadowMesh.material.opacity = 0;
    shadowMesh.scale.set(1.0, 1.0, 1.0);
    fadeTl.to(shadowMesh.material, {
      opacity: 0.45,
      duration: 1.6,
      ease: "power2.out"
    }, 0);
  }
}

/* ==========================================================================
   Interactive Audio Synthesizer (Web Audio API)
   Generates cinematic swooshes on zoom and atmospheric coffee room tone
   ========================================================================== */
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playZoomSound(zoomingIn) {
  if (!audioEnabled || !audioCtx) return;

  const now = audioCtx.currentTime;
  
  // Whoosh Oscillator
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  filter.type = 'lowpass';
  osc.type = 'sine';

  if (zoomingIn) {
    // Ascending whoosh sweep
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 1.2);
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 1.2);
  } else {
    // Descending whoosh sweep
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 1.2);
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 1.2);
  }

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 2.0);
}

function playDropSound() {
  if (!audioEnabled || !audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(130, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

/* ==========================================================================
   Telemetry & HUD Updates
   ========================================================================== */
function updateTelemetry() {
  const camZ = camera ? camera.position.z.toFixed(2) : '5.00';
  const rotY = model ? ((model.rotation.y * 180 / Math.PI) % 360).toFixed(1) : '0.0';
  
  const hudCamZ = document.getElementById('hud-cam-z');
  const hudRotY = document.getElementById('hud-rot-y');
  const hudMode = document.getElementById('hud-mode');

  if (hudCamZ) hudCamZ.textContent = camZ;
  if (hudRotY) hudRotY.textContent = `${rotY}°`;
  if (hudMode) hudMode.textContent = isZoomed ? 'MACRO VIEW' : 'OVERVIEW';
}

function setZoomUIState(zoomed) {
  const macroPanel = document.getElementById('macro-panel');
  const promptMode = document.getElementById('prompt-mode-indicator');
  const promptTitle = document.getElementById('prompt-action-text');
  const statusBadge = document.getElementById('system-status-text');

  if (macroPanel) {
    if (zoomed) {
      macroPanel.classList.add('active');
    } else {
      macroPanel.classList.remove('active');
    }
  }

  if (promptMode) {
    promptMode.textContent = zoomed ? 'ZOOMED (Z=2)' : 'DEFAULT (Z=5)';
    promptMode.style.background = zoomed ? 'rgba(245, 158, 11, 0.3)' : 'rgba(229, 176, 90, 0.15)';
  }

  if (promptTitle) {
    promptTitle.textContent = zoomed 
      ? 'CLICK ANYWHERE TO ZOOM OUT & RESET'
      : 'CLICK ANYWHERE TO ZOOM & ROTATE';
  }

  if (statusBadge) {
    statusBadge.textContent = zoomed ? 'MODE: MACRO INSPECTION' : 'SYSTEM: ONLINE';
  }
}

/* ==========================================================================
   Click Wave Ripple Animation
   ========================================================================== */
function createClickRipple(e) {
  if (!e || typeof e.clientX === 'undefined') return;
  const ripple = document.createElement('div');
  ripple.className = 'click-ripple';
  ripple.style.left = `${e.clientX}px`;
  ripple.style.top = `${e.clientY}px`;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 900);
}

/* ==========================================================================
   Roast Profile Switching
   ========================================================================== */
function setRoastProfile(roastKey) {
  const profile = roastProfiles[roastKey];
  if (!profile) return;
  currentRoast = roastKey;

  // Animate material transition with GSAP across procedural or GLTF meshes
  applyRoastToModel(model, profile);

  // Animate key light color transition
  if (keyLight) {
    gsap.to(keyLight.color, {
      r: new THREE.Color(profile.lightColor).r,
      g: new THREE.Color(profile.lightColor).g,
      b: new THREE.Color(profile.lightColor).b,
      duration: 1.2
    });
  }

  // Update UI spec sheets
  document.getElementById('origin-tag').textContent = profile.tag;
  document.getElementById('origin-title').textContent = profile.title;
  document.getElementById('spec-altitude').textContent = profile.altitude;
  document.getElementById('spec-process').textContent = profile.process;
  document.getElementById('spec-varietal').textContent = profile.varietal;
  document.getElementById('spec-roast').textContent = profile.roast;
  document.getElementById('macro-density').textContent = profile.density;
  document.getElementById('macro-temp').textContent = profile.temp;
  document.getElementById('macro-tds').textContent = profile.tds;
  document.getElementById('macro-roast-percent').textContent = profile.roastPercent;
  document.getElementById('macro-progress-indicator').style.width = profile.roastPercent;

  // Flavor pills
  const notesContainer = document.getElementById('origin-notes');
  if (notesContainer) {
    notesContainer.innerHTML = '';
    profile.notes.forEach(note => {
      const pill = document.createElement('span');
      pill.className = 'flavor-pill';
      pill.textContent = note;
      notesContainer.appendChild(pill);
    });
  }

  // Update button active state
  document.querySelectorAll('.roast-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.roast === roastKey);
  });
}

/* ==========================================================================
   Interactivity & Event Listeners
   ========================================================================== */
function setupInteractivity() {
  
  // --- 2. THE CLICK EVENT LISTENER (USER'S EXACT SPECIFICATION & ANIMATION) ---
  window.addEventListener('click', (e) => {
    // If clicking an interactive UI control or roast button, handle that specifically and don't trigger 3D zoom
    if (e.target.closest('button, .roast-option, .icon-btn, .brand-emblem')) {
      return;
    }

    createClickRipple(e);
    initAudio();
    playZoomSound(!isZoomed);

    // Create a synchronized animation timeline
    const tl = gsap.timeline({
      onUpdate: updateTelemetry
    });

    if (!isZoomed) {
      // === CYCLE 1: CLICK TO ZOOM IN & SPIN ===
      tl.to(camera.position, {
        z: zoomedZ,
        duration: animationDuration,
        ease: "power2.inOut" // Smooth ease-in, ease-out transition
      }, 0);

      if (model) {
        tl.to(model.rotation, {
          y: model.rotation.y + Math.PI * 2, // Full 360-degree spin
          duration: animationDuration,
          ease: "power2.inOut"
        }, 0);
      }

      isZoomed = true;
      setZoomUIState(true);
    } else {
      // === CYCLE 2: CLICK AGAIN TO ZOOM OUT & SPIN ===
      tl.to(camera.position, {
        z: defaultZ,
        duration: animationDuration,
        ease: "power2.inOut"
      }, 0);

      if (model) {
        tl.to(model.rotation, {
          y: model.rotation.y - Math.PI * 2, // Spins backward (or + to keep spinning forward)
          duration: animationDuration,
          ease: "power2.inOut"
        }, 0);
      }

      isZoomed = false;
      setZoomUIState(false);
    }
  });

  // Spacebar hotkey to also trigger zoom
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      window.dispatchEvent(new MouseEvent('click', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      }));
    }
  });

  // Mouse drag to orbit bean
  const canvas = document.getElementById('webgl-canvas');
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    // Parallax
    mouseParallax.x = (e.clientX / window.innerWidth - 0.5) * 0.4;
    mouseParallax.y = (e.clientY / window.innerHeight - 0.5) * 0.4;

    if (isDragging && model) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      model.rotation.y += deltaX * 0.008;
      model.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
      updateTelemetry();
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch drag for mobile devices
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1 && model) {
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      model.rotation.y += deltaX * 0.008;
      model.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateTelemetry();
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Roast Selection Buttons
  document.querySelectorAll('.roast-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setRoastProfile(btn.dataset.roast);
    });
  });

  // Replay Fade-in Button
  const replayBtn = document.getElementById('btn-replay-fade') || document.getElementById('btn-replay-drop');
  if (replayBtn) {
    replayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playModelFadeInAnimation();
    });
  }

  // Also trigger fade-in replay on clicking brand logo
  const logoBtn = document.getElementById('brand-logo-btn');
  if (logoBtn) {
    logoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playModelFadeInAnimation();
    });
  }

  // Sound Toggle Button
  const audioBtn = document.getElementById('audio-toggle-btn');
  const iconMuted = document.getElementById('audio-icon-muted');
  const iconActive = document.getElementById('audio-icon-active');

  audioBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    audioEnabled = !audioEnabled;
    iconMuted.style.display = audioEnabled ? 'none' : 'block';
    iconActive.style.display = audioEnabled ? 'block' : 'none';
    audioBtn.style.color = audioEnabled ? 'var(--gold-primary)' : 'var(--text-secondary)';
    audioBtn.title = audioEnabled ? 'Sound Enabled (Mute)' : 'Sound Muted (Enable)';
  });

  // Lighting Mode Toggle
  const lightBtn = document.getElementById('lighting-mode-btn');
  let lightMode = 0;
  lightBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    lightMode = (lightMode + 1) % 3;
    if (lightMode === 0) {
      // Nordic Studio Daylight (#FFF7EC / #C9B59C)
      gsap.to(keyLight.color, { r: 1.0, g: 0.97, b: 0.92, duration: 1 });
      gsap.to(rimLight.color, { r: 0.79, g: 0.71, b: 0.61, duration: 1 });
    } else if (lightMode === 1) {
      // Warm Caramel Sunset (#C9B59C / #D9CFC7)
      gsap.to(keyLight.color, { r: 0.79, g: 0.71, b: 0.61, duration: 1 });
      gsap.to(rimLight.color, { r: 0.85, g: 0.81, b: 0.78, duration: 1 });
    } else {
      // Gallery Minimalist White (#F9F8F6 / #EFE9E3)
      gsap.to(keyLight.color, { r: 0.98, g: 0.97, b: 0.96, duration: 1 });
      gsap.to(rimLight.color, { r: 0.94, g: 0.91, b: 0.89, duration: 1 });
    }
  });

  // Window Resize
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

/* ==========================================================================
   Render Animation Loop (3/4 View - Clean Grounded Model)
   ========================================================================== */
function animate(time) {
  requestAnimationFrame(animate);

  // Keep camera tilted downwards focusing at bean center
  if (camera) {
    camera.lookAt(0, 0, 0);
  }

  // Update HUD
  updateTelemetry();

  renderer.render(scene, camera);
}

// Start Three.js when DOM is ready
window.addEventListener('DOMContentLoaded', initThree);
