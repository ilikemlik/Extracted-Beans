import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { getAllExtractions, addExtractionRecord, getExtractionCount } from './db.js';

/* ==========================================================================
   EXTRACTED BEANS - 3D INTERACTIVE EXPERIENCE
   Single Origin Specialty Coffee 3D Visualizer & Animation
   ========================================================================== */

// --- 1. SETUP YOUR VARIABLES ---
let isZoomed = false;
let isExtractedView = false;
let activeExtractionId = null;
let currentFilter = 'all';
const animationDuration = 2.5; // Seconds per cycle

// Default camera positions
const defaultZ = 5;
const zoomedZ = 2;
const GROUND_Y = -1.0; // Precise ground level for level seating

// Scene Core Variables
let scene, camera, renderer, model, beanGroup, groundMesh, shadowMesh;
let keyLight, fillLight, rimLight, ambientLight, hemisphereLight, frontLight;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Wobble & Movement Limits (Dual-axis bounded tilt with elastic spring-back)
const BASE_ROTATION_Y = 0.0; // Straight front 90 degrees to camera
const BASE_ROTATION_X = 0.0;
const MAX_TILT_Y = 0.26; // ~15 degrees max horizontal wobble
const MAX_TILT_X = 0.14; // ~8 degrees max vertical tilt

let dragTilt = { x: 0, y: 0 };
let hoverTilt = { x: 0, y: 0 };
let currentRoast = 'silver';
let audioEnabled = false;
let audioCtx = null;

// Reflective Metal Finishes & Profiles
const roastProfiles = {
  silver: {
    title: "Liquid Chrome Reflective Bean",
    tag: "STUDIO FINISH // LIQUID CHROME",
    altitude: "Optical Precision Polish",
    process: "Diamond Mirror Lapping",
    varietal: "Reflective Chrome Alloy",
    roast: "Mirror 0.04 Ra",
    notes: ["Mirror Reflective", "Liquid Chrome", "High Specular", "Sleek Silver"],
    density: "Pure Specular (99.2% Reflection)",
    temp: "Optical Studio",
    tds: "99.2% Mirror Reflectance",
    roastPercent: "100%",
    color: 0xf0f4f8,
    roughness: 0.08,
    metalness: 0.98,
    clearcoat: 0.50,
    sheenColor: 0xffffff,
    lightColor: 0xfff7ec
  },
  platinum: {
    title: "Mirror Platinum Specular",
    tag: "LUXURY RESERVE // PLATINUM",
    altitude: "Vacuum Vapor Deposition",
    process: "Single-Crystal Polishing",
    varietal: "Pure Platinum 999",
    roast: "Specular 0.02 Ra",
    notes: ["Pure Mirror", "Luminous White", "Ultra Specular", "Flawless Edge"],
    density: "Noble Metal (21.45g/cm³)",
    temp: "Cryo Clean",
    tds: "99.8% Mirror Reflectance",
    roastPercent: "100%",
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.98,
    clearcoat: 0.60,
    sheenColor: 0xffffff,
    lightColor: 0xffffff
  },
  titanium: {
    title: "Black Chrome Titanium",
    tag: "OBSIDIAN FINISH // BLACK CHROME",
    altitude: "PVD Magnetron Sputter",
    process: "Specular Ion Deposition",
    varietal: "Titanium Carbide Chrome",
    roast: "Dark Mirror 0.06 Ra",
    notes: ["Deep Obsidian", "Dark Mirror", "Liquid Gunmetal", "Stealth Chrome"],
    density: "Specular Carbide (5.4g/cm³)",
    temp: "High Vacuum Ion",
    tds: "88% Dark Specular",
    roastPercent: "98%",
    color: 0x3c424c,
    roughness: 0.10,
    metalness: 0.95,
    clearcoat: 0.40,
    sheenColor: 0x8892a0,
    lightColor: 0xe8ecf2
  },
  gold: {
    title: "Polished 24K Mirror Gold",
    tag: "LIMITED EDITION // 24K CHROME",
    altitude: "Stratosphere",
    process: "Atomic Vapor Deposition",
    varietal: "Pure Aurum 24K",
    roast: "Mirror Gold 0.04 Ra",
    notes: ["Mirror 24K Gold", "Warm Reflection", "Deep Luster", "Liquid Aurum"],
    density: "Noble Gold (19.3g/cm³)",
    temp: "High Vacuum Chamber",
    tds: "98.5% Gold Specular",
    roastPercent: "100%",
    color: 0xffd56b,
    roughness: 0.08,
    metalness: 0.98,
    clearcoat: 0.55,
    sheenColor: 0xffecb3,
    lightColor: 0xfff3dd
  }
};

// 2D Extracted Coffee Dynamic Profiles (Linked to Roast Selector)
const extractionData = {
  silver: {
    brandName: "Onyx Coffee Lab",
    roastEdition: "Monarch Studio Chrome Edition",
    originRegion: "Tolima & Huila, Colombia",
    imageSrc: "assets/brands/onyx.svg",
    grindSize: "Medium-Fine (580 µm)",
    grindDetail: "24 Clicks · Precision Burr",
    grindAmount: "18.0 g",
    doseDetail: "Dry Ground Dose (18g in)",
    extractedWeight: "36.0 g",
    yieldDetail: "Liquid Espresso Yield (1:2.0)",
    brewTime: "27s",
    brewTemp: "93.5°C",
    ratio: "1:2.0",
    tds: "1.38%",
    tag: "EXTRACTION SPECS // 1:2.0 YIELD",
    notes: ["Dark Chocolate", "Caramelized Sugar", "Black Cherry"]
  },
  platinum: {
    brandName: "Sey Coffee",
    roastEdition: "El Paraiso Platinum Reserve",
    originRegion: "Cauca, Colombia · Thermal Shock",
    imageSrc: "assets/brands/sey.svg",
    grindSize: "Fine-Medium (520 µm)",
    grindDetail: "21 Clicks · Micro Grinder",
    grindAmount: "19.5 g",
    doseDetail: "High-Density Light Dose",
    extractedWeight: "42.0 g",
    yieldDetail: "High-Extraction Yield (1:2.15)",
    brewTime: "30s",
    brewTemp: "94.0°C",
    ratio: "1:2.15",
    tds: "1.42%",
    tag: "HIGH YIELD PROFILE // 1:2.15",
    notes: ["Red Currant", "Bergamot", "Jasmine Florals"]
  },
  titanium: {
    brandName: "Square Mile Coffee",
    roastEdition: "Red Brick Titanium Series",
    originRegion: "East Africa & Central America",
    imageSrc: "assets/brands/squaremile.svg",
    grindSize: "Medium (620 µm)",
    grindDetail: "26 Clicks · Conical Burrs",
    grindAmount: "18.5 g",
    doseDetail: "Espresso Dose (18.5g in)",
    extractedWeight: "37.0 g",
    yieldDetail: "Viscous Crema Yield (1:2.0)",
    brewTime: "28s",
    brewTemp: "93.0°C",
    ratio: "1:2.0",
    tds: "1.35%",
    tag: "CLASSIC BALANCED // 1:2.0",
    notes: ["Toffee Crisp", "Milk Chocolate", "Red Apple"]
  },
  gold: {
    brandName: "Hacienda La Esmeralda",
    roastEdition: "Geisha Special 24K Reserve",
    originRegion: "Boquete, Panama · 1,800m",
    imageSrc: "assets/brands/esmeralda.svg",
    grindSize: "Fine-Filter (480 µm)",
    grindDetail: "18 Clicks · Flat Titanium Burrs",
    grindAmount: "20.0 g",
    doseDetail: "Rare Varietal Geisha Dose",
    extractedWeight: "45.0 g",
    yieldDetail: "High Clarity Nectar (1:2.25)",
    brewTime: "32s",
    brewTemp: "95.0°C",
    ratio: "1:2.25",
    tds: "1.45%",
    tag: "LIMITED RESERVE // 1:2.25",
    notes: ["White Peach", "Orange Blossom", "Raw Honey"]
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

  // 2. Camera setup with defaultZ, eye-level straight front 90 degrees
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.2, defaultZ);
  camera.lookAt(0, 0.2, 0);

  // 3. Renderer & PBR Studio Environment
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Generate Room Environment for photorealistic metallic reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene(roomEnv).texture;

  // 4. Lighting Rig
  setupLighting();

  // 5. Build Ground & Contact Shadow
  createCleanGround();
  createContactShadow();

  // 6. Interaction Handlers
  setupInteractivity();

  // 7. Load 3D Model with Fallback Pipeline (Default: Breville Barista Express)
  loadModel(currentModelId);

  // 8. Render Loop
  animate(0);
}

/* ==========================================================================
   Studio Lighting Setup (Balanced Multi-Angle Studio Illumination)
   Ensures front dials, gauges, portafilter, and metal body are vividly lit
   ========================================================================== */
function setupLighting() {
  // Ambient Soft Daylight
  ambientLight = new THREE.AmbientLight(0xfffdfa, 2.2);
  scene.add(ambientLight);

  // Hemisphere Light for natural soft sky/ground bounce
  hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xd9cfc7, 1.2);
  hemisphereLight.position.set(0, 10, 0);
  scene.add(hemisphereLight);

  // Key Light (Warm daylight from upper right #FFF7EC)
  keyLight = new THREE.DirectionalLight(0xfff7ec, 3.2);
  keyLight.position.set(4, 6, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  // Rim Light (Warm caramel rim highlighting silhouette #C9B59C)
  rimLight = new THREE.DirectionalLight(0xc9b59c, 2.4);
  rimLight.position.set(-4, 2, -4);
  scene.add(rimLight);

  // Top/Side Fill Light (Soft neutral oat bounce #EFE9E3)
  fillLight = new THREE.DirectionalLight(0xefe9e3, 2.0);
  fillLight.position.set(-3, 4, 3);
  scene.add(fillLight);

  // Front Fill Light directly illuminating buttons, dials, gauges, and portafilter
  frontLight = new THREE.DirectionalLight(0xffffff, 1.6);
  frontLight.position.set(0, 2.5, 6);
  scene.add(frontLight);
}

/* ==========================================================================
   3D Model Loader Pipeline (GLTFLoader + DRACOLoader + Normalization)
   Supports instant cached switching between Breville Barista Express & Classic Espresso
   ========================================================================== */
const MODELS_CONFIG = {
  breville: {
    id: 'breville',
    name: 'Breville Barista Express',
    path: 'assets/Breville Barista Express.glb',
    telemetryName: 'BREVILLE BARISTA EXPRESS',
    description: 'Specialty Espresso Machine with Integrated Conical Burr Grinder'
  },
  classic: {
    id: 'classic',
    name: 'Classic Espresso Machine',
    path: 'assets/coffee_bean.glb',
    telemetryName: 'CLASSIC ESPRESSO MACHINE',
    description: 'Classic Commercial Espresso Machine'
  }
};

let currentModelId = 'breville';
const modelCache = new Map();
let isModelLoading = false;
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
  const statusEl = document.getElementById('system-status-text');
  if (statusEl) {
    statusEl.textContent = `MODEL: ${text.toUpperCase()}`;
  }
}

/* ==========================================================================
   Model Scene Preparation & Normalization
   Preserves authentic PBR textures, materials, and maps from the GLB files
   ========================================================================== */
function prepareModelScene(importedScene) {
  importedScene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (mat) {
          mat.needsUpdate = true;
          // Ensure color textures are sRGB
          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
          }
          if (mat.emissiveMap) {
            mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          }
          // Enable realistic envMap reflections on metallic / glossy surfaces
          if ('envMapIntensity' in mat) {
            mat.envMapIntensity = 1.2;
          }
        }
      });
    }
  });
}

function createNormalizedModelPivot(importedScene) {
  const box = new THREE.Box3().setFromObject(importedScene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Target max dimension ~2.4 units to fill camera view at Z=5
  const targetScale = maxDim > 0.0001 ? 2.4 / maxDim : 1.0;

  // Align base (box.min.y) exactly to Y=0, and center X/Z at 0
  const pivot = new THREE.Group();
  importedScene.position.set(-center.x, -box.min.y, -center.z);
  pivot.add(importedScene);
  pivot.scale.setScalar(targetScale);

  // Position base evenly on ground plane at GROUND_Y
  pivot.position.set(0, GROUND_Y, 0);
  // Straight front 90 degrees facing camera
  pivot.rotation.set(0, BASE_ROTATION_Y, 0);

  return pivot;
}

/* ==========================================================================
   Roast Profile Light Transition (Subtle Ambient / Key Light Atmosphere)
   ========================================================================== */
function applyRoastToModel(target, profile) {
  if (!profile) return;

  // Tint key light and rim light with smooth GSAP transition
  if (keyLight && profile.lightColor) {
    gsap.to(keyLight.color, {
      r: new THREE.Color(profile.lightColor).r,
      g: new THREE.Color(profile.lightColor).g,
      b: new THREE.Color(profile.lightColor).b,
      duration: 1.2
    });
  }
  if (rimLight && profile.sheenColor) {
    gsap.to(rimLight.color, {
      r: new THREE.Color(profile.sheenColor).r,
      g: new THREE.Color(profile.sheenColor).g,
      b: new THREE.Color(profile.sheenColor).b,
      duration: 1.2
    });
  }

  // Only apply procedural material tinting if using procedural fallback bean
  if (modelSource && modelSource.startsWith('PROCEDURAL') && target) {
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
        });
      }
    });
  }
}

function loadModel(modelId) {
  const config = MODELS_CONFIG[modelId];
  if (!config) return;

  if (!beanGroup) {
    beanGroup = new THREE.Group();
    scene.add(beanGroup);
  }

  // Check in-memory cache for instant switching
  if (modelCache.has(modelId)) {
    const cachedPivot = modelCache.get(modelId);
    replaceActiveModel(cachedPivot, config);
    updateModelSourceTelemetry(config.telemetryName);
    finishLoaderUI(true, `${config.name} Ready`);
    return;
  }

  if (isModelLoading) return;
  isModelLoading = true;

  updateLoaderUI(10, `Streaming ${config.name}...`);
  const loaderOverlay = document.getElementById('model-loader');
  if (loaderOverlay) {
    loaderOverlay.classList.remove('loaded');
  }

  // Setup LoadingManager and DRACOLoader
  const manager = new THREE.LoadingManager();
  manager.onProgress = (item, loaded, total) => {
    const percent = Math.min(95, Math.round((loaded / total) * 100));
    updateLoaderUI(percent, `Streaming ${config.name} (${Math.round(percent)}%)...`);
  };

  const dracoLoader = new DRACOLoader(manager);
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  dracoLoader.setDecoderConfig({ type: 'js' });

  const gltfLoader = new GLTFLoader(manager);
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    config.path,
    (gltf) => {
      console.log('Successfully loaded 3D GLB model:', config.path);
      const importedScene = gltf.scene;

      // Preserve authentic materials and setup shadows
      prepareModelScene(importedScene);
      const pivot = createNormalizedModelPivot(importedScene);

      // Cache normalized model in memory
      modelCache.set(modelId, pivot);

      replaceActiveModel(pivot, config);
      modelSource = `GLB (${config.path})`;
      updateModelSourceTelemetry(config.telemetryName);
      finishLoaderUI(true, `${config.name} Loaded`);
      isModelLoading = false;
    },
    (xhr) => {
      if (xhr.lengthComputable && xhr.total > 0) {
        const percent = Math.min(95, Math.round((xhr.loaded / xhr.total) * 100));
        const loadedMB = (xhr.loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (xhr.total / (1024 * 1024)).toFixed(1);
        updateLoaderUI(percent, `Downloading ${config.name} (${loadedMB}MB / ${totalMB}MB)...`);
      }
    },
    (error) => {
      console.warn(`Could not load ${config.path} (${error.message || 'File not found'}), activating procedural fallback.`);
      isModelLoading = false;

      if (model && beanGroup.children.includes(model)) {
        beanGroup.remove(model);
      }

      createCoffeeBeanModel();
      modelSource = `PROCEDURAL (Fallback for ${config.name})`;
      updateModelSourceTelemetry(modelSource);
      finishLoaderUI(false, `Procedural Model Active`);
      playModelFadeInAnimation();
    }
  );
}

function replaceActiveModel(newPivot, config) {
  if (model && beanGroup.children.includes(model)) {
    const oldModel = model;
    gsap.to(oldModel.scale, {
      x: oldModel.scale.x * 0.88,
      y: oldModel.scale.y * 0.88,
      z: oldModel.scale.z * 0.88,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        if (beanGroup && beanGroup.children.includes(oldModel)) {
          beanGroup.remove(oldModel);
        }
      }
    });
  }

  model = newPivot;
  beanGroup.add(model);

  playModelFadeInAnimation();
}

function switchModel(targetModelId) {
  if (targetModelId === currentModelId && model) return;
  currentModelId = targetModelId;

  // Update switcher UI buttons active state
  const brevilleBtn = document.getElementById('btn-model-breville');
  const classicBtn = document.getElementById('btn-model-classic');

  if (brevilleBtn && classicBtn) {
    if (targetModelId === 'breville') {
      brevilleBtn.classList.add('is-active');
      brevilleBtn.setAttribute('aria-selected', 'true');
      classicBtn.classList.remove('is-active');
      classicBtn.setAttribute('aria-selected', 'false');
    } else {
      classicBtn.classList.add('is-active');
      classicBtn.setAttribute('aria-selected', 'true');
      brevilleBtn.classList.remove('is-active');
      brevilleBtn.setAttribute('aria-selected', 'false');
    }
  }

  loadModel(targetModelId);
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

  // 3. Reflective Metal Finish Material
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf0f4f8,
    metalness: 0.98,
    roughness: 0.08,
    clearcoat: 0.50,
    clearcoatRoughness: 0.06,
    reflectivity: 1.0,
    envMapIntensity: 1.6
  });

  // Assign the mesh as fallback `model`
  model = new THREE.Mesh(geometry, material);
  model.castShadow = true;
  model.receiveShadow = true;
  model.scale.set(1.2, 1.2, 1.2);
  model.position.set(0, GROUND_Y + 0.85, 0);
  model.rotation.set(0, BASE_ROTATION_Y, 0);

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

  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 115);
  grad.addColorStop(0, 'rgba(30, 25, 20, 0.50)');
  grad.addColorStop(0.35, 'rgba(65, 55, 45, 0.22)');
  grad.addColorStop(0.7, 'rgba(120, 110, 100, 0.06)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(4.0, 4.0);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.52,
    depthWrite: false
  });

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = GROUND_Y + 0.002;
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
  groundMesh.position.y = GROUND_Y;
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
        if (mat.userData.wasTransparent === undefined) {
          mat.userData.wasTransparent = mat.transparent;
        }
        mat.transparent = true;
        mat.opacity = 0;
        fadeTl.to(mat, {
          opacity: 1,
          duration: 1.4,
          ease: "power2.out",
          onComplete: () => {
            if (!mat.userData.wasTransparent) {
              mat.transparent = false;
            }
          }
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
  if (hudMode) {
    if (isExtractedView) {
      hudMode.textContent = 'EXTRACTION SPECS';
    } else if (isZoomed) {
      hudMode.textContent = 'MACRO VIEW';
    } else {
      hudMode.textContent = 'OVERVIEW';
    }
  }
}

/* ==========================================================================
   2D Extracted Coffee Specification UI & GSAP Animation Controller
   Choreographed 3D Transition:
   - Rotates bean 360 degrees smoothly
   - Zooms camera out from 5.0 to 5.85 (making space)
   - Pans bean to the left (or upward on mobile portrait)
   - Synchronously moves ground shadow beneath the bean
   - 2D Frosted Specification Card fades & slides in on the right
   ========================================================================== */
/* ==========================================================================
   2D Extracted Coffee Cards Feed (IndexedDB Powered)
   - Queries IndexedDB database for coffee extractions
   - Dynamically renders interactive 2D cards with 3 quick metrics
   - Clicking any card morphs the 3D bean to match that roast profile
   ========================================================================== */
async function renderExtractionFeed(filterRoast = currentFilter) {
  const container = document.getElementById('extracted-cards-container');
  const countBadge = document.getElementById('db-counter-badge');
  if (!container) return;

  try {
    const extractions = await getAllExtractions(filterRoast);
    const totalCount = await getExtractionCount();

    if (countBadge) {
      countBadge.textContent = `${extractions.length} / ${totalCount} RECIPES`;
    }

    container.innerHTML = '';

    if (extractions.length === 0) {
      container.innerHTML = `
        <div class="empty-feed-notice" style="text-align: center; padding: 48px 20px; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8rem;">
          <p>No extraction records found for this roast style.</p>
          <button class="action-pill-btn interactive-control" id="btn-seed-empty" style="margin: 14px auto 0 auto;">+ Log A New Recipe</button>
        </div>
      `;
      const seedBtn = document.getElementById('btn-seed-empty');
      if (seedBtn) seedBtn.addEventListener('click', openLogModal);
      return;
    }

    // Render cards
    extractions.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'extracted-item-card interactive-control';
      card.dataset.id = item.id;
      card.dataset.roast = item.roast;

      const isActive = activeExtractionId ? (item.id === activeExtractionId) : (index === 0);
      if (isActive) {
        card.classList.add('is-active');
        if (!activeExtractionId) activeExtractionId = item.id;
      }

      const notesHtml = (item.notes || []).map(note => `<span class="item-note-pill">${note}</span>`).join('');

      card.innerHTML = `
        <div class="card-active-indicator">
          <span class="active-pulse-dot"></span>
          <span>SYNCED 3D</span>
        </div>

        <!-- Left Column: Brand Visual Badge & Origin -->
        <div class="item-card-left">
          <div class="item-brand-visual">
            <img class="item-brand-img" src="${item.imageSrc || 'assets/logo.jpg'}" alt="${item.brandName}" onerror="this.src='assets/logo.jpg'">
          </div>
          <span class="item-origin-meta">${item.originRegion || 'Single Origin'}</span>
        </div>

        <!-- Right Column: Brand Name & 3 Quick Key Metrics -->
        <div class="item-card-right">
          <div class="item-card-heading">
            <h3 class="item-brand-title">${item.brandName}</h3>
            <p class="item-roast-edition">${item.roastEdition}</p>
          </div>

          <!-- The 3 Quick Information Items -->
          <div class="item-metrics-grid">
            <div class="item-metric-row">
              <span class="metric-label-mini">1. Grind Size</span>
              <span class="metric-val-bold">${item.grindSize}</span>
            </div>
            <div class="item-metric-row gold-tint">
              <span class="metric-label-mini">2. Ground Dose</span>
              <span class="metric-val-bold gold">${item.grindAmount}</span>
            </div>
            <div class="item-metric-row gold-tint">
              <span class="metric-label-mini">3. Liquid Yield</span>
              <span class="metric-val-bold gold">${item.extractedWeight}</span>
            </div>
          </div>

          <div class="item-telemetry-strip">
            <span class="item-tel-pill">TIME: ${item.brewTime || '28s'}</span>
            <span class="item-tel-pill">TEMP: ${item.brewTemp || '93.5°C'}</span>
            <span class="item-tel-pill">RATIO: ${item.ratio || '1:2.0'}</span>
            <span class="item-tel-pill">TDS: ${item.tds || '1.38%'}</span>
          </div>

          <div class="item-notes-row">
            ${notesHtml}
          </div>
        </div>
      `;

      // Interactive Click: Syncs card highlight and 3D bean material finish!
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.extracted-item-card').forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');
        activeExtractionId = item.id;

        // Synchronize 3D bean model finish
        if (item.roast) {
          setRoastProfile(item.roast);
        }
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Failed to render extraction feed from IndexedDB:', err);
  }
}

function openLogModal() {
  const modal = document.getElementById('modal-log-extraction');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeLogModal() {
  const modal = document.getElementById('modal-log-extraction');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

async function toggleExtractedView(forceState) {
  const shouldOpen = (typeof forceState === 'boolean') ? forceState : !isExtractedView;
  if (shouldOpen === isExtractedView) return;

  const panel = document.getElementById('extracted-list-panel');
  const btn = document.getElementById('btn-view-extracted');
  const btnTitle = document.getElementById('btn-extracted-title');
  const btnSub = document.getElementById('btn-extracted-sub');
  const btnBadge = document.getElementById('btn-extracted-badge');
  const statusBadge = document.getElementById('system-status-text');

  // Reset macro zoom if active
  if (isZoomed && shouldOpen) {
    toggleMacroZoom(false);
  }

  // Kill running tweens to prevent frame drops or conflicting state
  if (beanGroup) gsap.killTweensOf(beanGroup.position);
  if (shadowMesh) {
    gsap.killTweensOf(shadowMesh.position);
    gsap.killTweensOf(shadowMesh.scale);
  }
  if (camera) gsap.killTweensOf(camera.position);
  if (model) gsap.killTweensOf(model.rotation);

  const isMobile = window.innerWidth <= 768;

  if (shouldOpen) {
    // 1. Refresh extraction data feed from IndexedDB
    await renderExtractionFeed(currentFilter);

    // 2. Choreograph 3D Bean: Pan Left, Zoom Out, Spin 360
    const targetX = isMobile ? 0.0 : -1.45;
    const targetY = isMobile ? 0.85 : 0.0;
    const targetZ = isMobile ? 6.2 : 5.85;

    const tl = gsap.timeline({
      onUpdate: updateTelemetry
    });

    if (beanGroup) {
      tl.to(beanGroup.position, {
        x: targetX,
        y: targetY,
        duration: 1.6,
        ease: "power3.inOut"
      }, 0);
    }

    if (shadowMesh) {
      tl.to(shadowMesh.position, {
        x: targetX,
        duration: 1.6,
        ease: "power3.inOut"
      }, 0);
      if (isMobile) {
        tl.to(shadowMesh.scale, {
          x: 0.85,
          y: 0.85,
          duration: 1.6,
          ease: "power3.inOut"
        }, 0);
      }
    }

    if (camera) {
      tl.to(camera.position, {
        z: targetZ,
        duration: 1.6,
        ease: "power3.inOut"
      }, 0);
    }

    if (model) {
      tl.to(model.rotation, {
        y: BASE_ROTATION_Y - 0.08,
        x: 0,
        duration: 1.4,
        ease: "power3.inOut"
      }, 0);
    }

    // 3. UI states
    document.body.classList.add('extracted-mode-active');
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('is-active');
    if (btnTitle) btnTitle.textContent = 'BACK TO 3D BEAN';
    if (btnSub) btnSub.textContent = 'Click to return to center inspection';
    if (btnBadge) btnBadge.textContent = 'RETURN';
    if (statusBadge) statusBadge.textContent = 'MODE: EXTRACTION DATABASE';

    // Staggered luxury fade-in of cards
    gsap.from("#extracted-cards-container .extracted-item-card", {
      opacity: 0,
      y: 22,
      stagger: 0.07,
      duration: 0.55,
      ease: "power2.out",
      delay: 0.2
    });

    isExtractedView = true;
    updateTelemetry();
  } else {
    // Return to Center Default Overview
    const tl = gsap.timeline({
      onUpdate: updateTelemetry
    });

    if (beanGroup) {
      tl.to(beanGroup.position, {
        x: 0,
        y: 0,
        duration: 1.4,
        ease: "power3.inOut"
      }, 0);
    }

    if (shadowMesh) {
      tl.to(shadowMesh.position, {
        x: 0,
        duration: 1.4,
        ease: "power3.inOut"
      }, 0);
      tl.to(shadowMesh.scale, {
        x: 1.0,
        y: 1.0,
        duration: 1.4,
        ease: "power3.inOut"
      }, 0);
    }

    if (camera) {
      tl.to(camera.position, {
        z: defaultZ,
        duration: 1.4,
        ease: "power3.inOut"
      }, 0);
    }

    if (model) {
      tl.to(model.rotation, {
        y: BASE_ROTATION_Y,
        x: 0,
        duration: 1.4,
        ease: "power3.inOut"
      }, 0);
    }

    document.body.classList.remove('extracted-mode-active');
    if (panel) panel.classList.remove('active');
    if (btn) btn.classList.remove('is-active');
    if (btnTitle) btnTitle.textContent = 'VIEW EXTRACTED COFFEE';
    if (btnSub) btnSub.textContent = 'Grind Size · Ground Dose · Liquid Weight';
    if (btnBadge) btnBadge.textContent = 'RECIPE';
    if (statusBadge) statusBadge.textContent = 'SYSTEM: ONLINE';

    isExtractedView = false;
    updateTelemetry();
  }
}

function toggleMacroZoom(forceState) {
  const shouldZoom = (typeof forceState === 'boolean') ? forceState : !isZoomed;
  if (shouldZoom === isZoomed) return;

  const macroBtn = document.getElementById('btn-macro-zoom');
  const macroPanel = document.getElementById('macro-panel');
  const statusBadge = document.getElementById('system-status-text');

  if (isExtractedView && shouldZoom) {
    toggleExtractedView(false);
  }

  if (camera) gsap.killTweensOf(camera.position);
  if (model) gsap.killTweensOf(model.rotation);

  const tl = gsap.timeline({
    onUpdate: updateTelemetry
  });

  if (shouldZoom) {
    tl.to(camera.position, {
      z: zoomedZ,
      duration: 1.8,
      ease: "power2.inOut"
    }, 0);

    if (model) {
      tl.to(model.rotation, {
        y: BASE_ROTATION_Y + 0.05,
        x: 0,
        duration: 1.4,
        ease: "power2.inOut"
      }, 0);
    }

    if (macroPanel) macroPanel.classList.add('active');
    if (macroBtn) macroBtn.classList.add('is-zoomed');
    if (statusBadge) statusBadge.textContent = 'MODE: MACRO INSPECTION';
    isZoomed = true;
  } else {
    tl.to(camera.position, {
      z: defaultZ,
      duration: 1.6,
      ease: "power2.inOut"
    }, 0);

    if (model) {
      tl.to(model.rotation, {
        y: BASE_ROTATION_Y,
        x: 0,
        duration: 1.4,
        ease: "power2.inOut"
      }, 0);
    }

    if (macroPanel) macroPanel.classList.remove('active');
    if (macroBtn) macroBtn.classList.remove('is-zoomed');
    if (statusBadge) statusBadge.textContent = 'SYSTEM: ONLINE';
    isZoomed = false;
  }
  updateTelemetry();
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

  // Update UI spec sheets if present
  const originTag = document.getElementById('origin-tag');
  if (originTag) originTag.textContent = profile.tag;
  const originTitle = document.getElementById('origin-title');
  if (originTitle) originTitle.textContent = profile.title;
  const specAlt = document.getElementById('spec-altitude');
  if (specAlt) specAlt.textContent = profile.altitude;
  const specProc = document.getElementById('spec-process');
  if (specProc) specProc.textContent = profile.process;
  const specVar = document.getElementById('spec-varietal');
  if (specVar) specVar.textContent = profile.varietal;
  const specRoast = document.getElementById('spec-roast');
  if (specRoast) specRoast.textContent = profile.roast;
  const macroDensity = document.getElementById('macro-density');
  if (macroDensity) macroDensity.textContent = profile.density;
  const macroTemp = document.getElementById('macro-temp');
  if (macroTemp) macroTemp.textContent = profile.temp;
  const macroTds = document.getElementById('macro-tds');
  if (macroTds) macroTds.textContent = profile.tds;
  const macroRoastPercent = document.getElementById('macro-roast-percent');
  if (macroRoastPercent) macroRoastPercent.textContent = profile.roastPercent;
  const macroProgress = document.getElementById('macro-progress-indicator');
  if (macroProgress) macroProgress.style.width = profile.roastPercent;

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

  // Synchronize active card highlight in extraction list feed if visible
  const matchingCard = document.querySelector(`.extracted-item-card[data-roast="${roastKey}"]`);
  if (matchingCard) {
    document.querySelectorAll('.extracted-item-card').forEach(c => c.classList.remove('is-active'));
    matchingCard.classList.add('is-active');
    activeExtractionId = matchingCard.dataset.id;
    matchingCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ==========================================================================
   Interactivity & Event Listeners
   ========================================================================== */
function setupInteractivity() {
  const canvas = document.getElementById('webgl-canvas');

  // Mouse drag tracking & canvas click differentiation
  let startX = 0;
  let startY = 0;
  let dragDist = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    dragDist = 0;
    previousMousePosition = { x: e.clientX, y: e.clientY };
    gsap.killTweensOf(dragTilt);
  });

  window.addEventListener('mousemove', (e) => {
    // Subtle cursor hover parallax wobble across the viewport
    hoverTilt.x = ((e.clientX / window.innerWidth) - 0.5) * (MAX_TILT_Y * 0.55);
    hoverTilt.y = ((e.clientY / window.innerHeight) - 0.5) * (MAX_TILT_X * 0.55);

    if (isDragging && model) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      dragDist += Math.abs(deltaX) + Math.abs(deltaY);

      // Accumulate drag tilt bounded strictly within limits
      dragTilt.x = THREE.MathUtils.clamp(dragTilt.x + deltaX * 0.003, -MAX_TILT_Y, MAX_TILT_Y);
      dragTilt.y = THREE.MathUtils.clamp(dragTilt.y + deltaY * 0.003, -MAX_TILT_X, MAX_TILT_X);

      previousMousePosition = { x: e.clientX, y: e.clientY };
      updateTelemetry();
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (isDragging) {
      isDragging = false;
      // Smooth elastic damped return back to center resting angle
      gsap.to(dragTilt, {
        x: 0,
        y: 0,
        duration: 1.2,
        ease: "elastic.out(1, 0.4)"
      });

      // Single clean click on canvas (not a drag)
      if (dragDist < 6 && e.target === canvas) {
        createClickRipple(e);
        // Dual Exit: if in Extracted View, clicking canvas returns to default 3D view
        if (isExtractedView) {
          toggleExtractedView(false);
        }
      }
    }
  });

  window.addEventListener('mouseleave', () => {
    gsap.to(hoverTilt, {
      x: 0,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    });
  });

  // Touch drag for mobile devices
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDist = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchDist = 0;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      gsap.killTweensOf(dragTilt);
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1 && model) {
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;
      touchDist += Math.abs(deltaX) + Math.abs(deltaY);

      dragTilt.x = THREE.MathUtils.clamp(dragTilt.x + deltaX * 0.003, -MAX_TILT_Y, MAX_TILT_Y);
      dragTilt.y = THREE.MathUtils.clamp(dragTilt.y + deltaY * 0.003, -MAX_TILT_X, MAX_TILT_X);

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateTelemetry();
    }
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isDragging) {
      isDragging = false;
      gsap.to(dragTilt, {
        x: 0,
        y: 0,
        duration: 1.2,
        ease: "elastic.out(1, 0.4)"
      });
      if (touchDist < 10) {
        if (isExtractedView) {
          toggleExtractedView(false);
        }
      }
    }
  });

  // Primary Action Button: View Extracted Coffee
  const btnExtracted = document.getElementById('btn-view-extracted');
  if (btnExtracted) {
    btnExtracted.addEventListener('click', (e) => {
      e.stopPropagation();
      createClickRipple(e);
      toggleExtractedView();
    });
  }

  // Close Button on 2D Extracted List Panel
  const btnCloseExtracted = document.getElementById('btn-close-extracted-list');
  if (btnCloseExtracted) {
    btnCloseExtracted.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleExtractedView(false);
    });
  }

  // Filter Chips in Extraction List Header
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter || 'all';
      renderExtractionFeed(currentFilter);
    });
  });

  // Modal Dialog Controls: Open, Close & Backdrop Click
  const btnOpenModal = document.getElementById('btn-open-log-modal');
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', (e) => {
      e.stopPropagation();
      openLogModal();
    });
  }

  const btnCloseModal = document.getElementById('btn-close-modal');
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLogModal();
    });
  }

  const btnCancelModal = document.getElementById('btn-cancel-modal');
  if (btnCancelModal) {
    btnCancelModal.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLogModal();
    });
  }

  const logModal = document.getElementById('modal-log-extraction');
  if (logModal) {
    logModal.addEventListener('click', (e) => {
      if (e.target === logModal) {
        closeLogModal();
      }
    });
  }

  // Log Extraction Form Submission (IndexedDB Write)
  const formLog = document.getElementById('form-log-extraction');
  if (formLog) {
    formLog.addEventListener('submit', async (e) => {
      e.preventDefault();
      const brand = document.getElementById('input-brand').value.trim();
      const edition = document.getElementById('input-edition').value.trim();
      const origin = document.getElementById('input-origin').value.trim() || 'Custom Micro-lot';
      const roast = document.getElementById('select-roast').value;
      const grind = document.getElementById('input-grind').value.trim();
      const dose = document.getElementById('input-dose').value.trim();
      const yieldWeight = document.getElementById('input-yield').value.trim();
      const time = document.getElementById('input-time').value.trim() || '28s';
      const temp = document.getElementById('input-temp').value.trim() || '93.5°C';
      const tds = document.getElementById('input-tds').value.trim() || '1.38%';

      // Calculate brewing ratio if numeric dose and yield
      const numDose = parseFloat(dose);
      const numYield = parseFloat(yieldWeight);
      const ratio = (!isNaN(numDose) && !isNaN(numYield) && numDose > 0)
        ? `1:${(numYield / numDose).toFixed(2)}`
        : '1:2.0';

      const notesRaw = document.getElementById('input-notes').value.trim();
      const notes = notesRaw
        ? notesRaw.split(',').map(s => s.trim()).filter(Boolean)
        : ['Craft Specialty', 'Balanced Extraction'];

      const newRecord = {
        roast,
        brandName: brand,
        roastEdition: edition,
        originRegion: origin,
        grindSize: grind,
        grindDetail: 'Custom Dial-In',
        grindAmount: dose,
        doseDetail: `Dry Ground Dose (${dose} in)`,
        extractedWeight: yieldWeight,
        yieldDetail: `Liquid Espresso Yield (${ratio})`,
        brewTime: time,
        brewTemp: temp,
        ratio: ratio,
        tds: tds,
        notes: notes,
        timestamp: Date.now()
      };

      try {
        const newId = await addExtractionRecord(newRecord);
        activeExtractionId = newId;
        formLog.reset();
        closeLogModal();

        // Refresh feed and update active 3D bean roast
        await renderExtractionFeed(currentFilter);
        setRoastProfile(roast);

        // Make sure extracted view is open so user sees their new recipe
        if (!isExtractedView) {
          toggleExtractedView(true);
        }
      } catch (err) {
        console.error('Failed to save coffee extraction record:', err);
      }
    });
  }

  // Secondary Button: 2.5X Macro Zoom
  const btnMacro = document.getElementById('btn-macro-zoom');
  if (btnMacro) {
    btnMacro.addEventListener('click', (e) => {
      e.stopPropagation();
      createClickRipple(e);
      initAudio();
      playZoomSound(!isZoomed);
      toggleMacroZoom();
    });
  }

  // Spacebar hotkey to toggle Extracted View & Escape to dismiss
  window.addEventListener('keydown', (e) => {
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (e.code === 'Space' && !isTyping) {
      e.preventDefault();
      toggleExtractedView();
    }
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-log-extraction');
      if (modal && modal.classList.contains('active')) {
        closeLogModal();
      } else if (isExtractedView) {
        toggleExtractedView(false);
      }
    }
  });

  // Roast Selection Buttons
  document.querySelectorAll('.roast-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setRoastProfile(btn.dataset.roast);
    });
  });

  // 3D Model Switcher Buttons
  const brevilleBtn = document.getElementById('btn-model-breville');
  const classicBtn = document.getElementById('btn-model-classic');

  if (brevilleBtn) {
    brevilleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchModel('breville');
    });
  }

  if (classicBtn) {
    classicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchModel('classic');
    });
  }

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

  // Initialize extracted cards feed with all recipes from IndexedDB
  renderExtractionFeed('all');
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

  // Keep camera facing straight front at machine center (Y=0.2)
  if (camera) {
    camera.lookAt(0, 0.2, 0);
  }

  // Dual-axis bounded wobble tilt
  if (model && !gsap.isTweening(model.rotation)) {
    const combinedY = THREE.MathUtils.clamp(dragTilt.x + (isDragging ? 0 : hoverTilt.x), -MAX_TILT_Y, MAX_TILT_Y);
    const combinedX = THREE.MathUtils.clamp(dragTilt.y + (isDragging ? 0 : hoverTilt.y), -MAX_TILT_X, MAX_TILT_X);

    const targetRotY = BASE_ROTATION_Y + combinedY;
    const targetRotX = BASE_ROTATION_X + combinedX;

    model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, targetRotY, isDragging ? 0.22 : 0.08);
    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, targetRotX, isDragging ? 0.22 : 0.08);
  }

  // Update HUD
  updateTelemetry();

  renderer.render(scene, camera);
}

// Start Three.js when DOM is ready
window.addEventListener('DOMContentLoaded', initThree);
