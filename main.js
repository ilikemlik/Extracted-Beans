import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { 
  getAllExtractions, 
  addExtractionRecord, 
  updateExtractionRecord, 
  deleteExtractionRecord, 
  getExtractionCount,
  subscribeToExtractions,
  resetDatabaseToDefaults,
  isPasscodeUnlocked,
  verifyPasscode,
  getStorageMode
} from './db.js';

/* ==========================================================================
   EXTRACTED BEANS - 3D INTERACTIVE EXPERIENCE
   Single Origin Specialty Coffee 3D Visualizer & Animation
   ========================================================================== */

// --- 1. SETUP YOUR VARIABLES ---
let isZoomed = false;
let isExtractedView = false;
let activeExtractionId = null;
const animationDuration = 2.5; // Seconds per cycle

// Default camera positions & Responsive Framing
const defaultZ = 5;
const zoomedZ = 2;
const GROUND_Y = -0.65; // Shifted higher to eliminate bottom clipping and decrease top dead space
const CAMERA_CENTER_Y = 0.50; // Focused right at the center of the machine

function getResponsiveCameraZ() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect >= 1.0) {
    return defaultZ; // Desktop default framing
  }
  // Mobile / portrait framing: smoothly pull camera back so the 3D model fits with breathing room
  return Math.min(8.6, Math.max(7.2, 3.5 / aspect));
}

// Scene Core Variables
let scene, camera, renderer, model, beanGroup, groundMesh, shadowMesh;
let undiscoveredTextRing = null;
let undiscoveredRingGroup = null;
let keyLight, fillLight, rimLight, ambientLight, hemisphereLight, frontLight;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let animationFrameId = null;
let isContextLost = false;

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

/* ==========================================================================
   Initialize Visual Experience (Desktop 3D vs Mobile 2D Studio)
   ========================================================================== */
function initExperience() {
  setupInteractivity();

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    // Mobile View: 100% Lightweight 2D Studio Product Showcase (Zero WebGL, Zero Crash)
    initMobileStudio();
    toggleExtractedView(true, true);
  } else {
    // Desktop View: High-fidelity Three.js 3D Interactive Lab
    initDesktopThree();
  }
}

function initMobileStudio() {
  const loaderOverlay = document.getElementById('model-loader');
  if (loaderOverlay) {
    loaderOverlay.classList.add('loaded');
  }
  updateMobileShowcaseImage(currentModelId);
  updateModelSourceTelemetry(MODELS_CONFIG[currentModelId].telemetryName);
}

function updateMobileShowcaseImage(modelId) {
  const brevilleImg = document.getElementById('mobile-img-breville');
  const classicImg = document.getElementById('mobile-img-classic');
  const undiscoveredBadge = document.getElementById('mobile-undiscovered-badge');

  if (modelId === 'classic') {
    if (brevilleImg) brevilleImg.classList.remove('active');
    if (classicImg) classicImg.classList.add('active');
    if (undiscoveredBadge) undiscoveredBadge.classList.add('visible');
  } else {
    if (classicImg) classicImg.classList.remove('active');
    if (brevilleImg) brevilleImg.classList.add('active');
    if (undiscoveredBadge) undiscoveredBadge.classList.remove('visible');
  }
}

function initDesktopThree() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  // 1. Scene & Atmospheric Fog (Centering around #F9F8F6)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9f8f6);
  scene.fog = new THREE.FogExp2(0xf9f8f6, 0.036);

  // 2. Camera setup with responsive Z distance, eye-level straight front 90 degrees
  const initialZ = getResponsiveCameraZ();
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, CAMERA_CENTER_Y, initialZ);
  camera.lookAt(0, CAMERA_CENTER_Y, 0);

  // 3. Renderer & PBR Studio Environment
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // WebGL Context Loss Recovery (Prevents Chromium Sad Canvas dead-face icon)
  setupContextLossHandling(canvas);

  // Generate Room Environment for photorealistic metallic reflections
  setupEnvironment();

  // 4. Lighting Rig
  setupLighting();

  // 5. Build Ground & Contact Shadow
  createCleanGround();
  createContactShadow();

  // Root model group container (clean studio scene without any initial bean placeholder)
  if (!beanGroup) {
    beanGroup = new THREE.Group();
    scene.add(beanGroup);
  }

  // 6. Load 3D Model in background (Default: Breville Barista Express)
  loadModel(currentModelId);

  // 7. Render Loop
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
   WebGL Context Loss & Environment Recovery
   ========================================================================== */
function setupContextLossHandling(canvas) {
  if (!canvas || canvas.dataset.contextLostBound) return;
  canvas.dataset.contextLostBound = 'true';

  canvas.addEventListener('webglcontextlost', (event) => {
    // CRITICAL: Calling preventDefault stops Chromium from painting the 'Sad Canvas' dead face icon
    event.preventDefault();
    isContextLost = true;
    console.warn('[WebGL] Context lost detected. Pausing render loop and awaiting GPU recovery.');

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    updateLoaderUI(100, 'Recovering graphics hardware...');
    const loaderOverlay = document.getElementById('model-loader');
    if (loaderOverlay) {
      loaderOverlay.classList.remove('loaded');
    }
  }, false);

  canvas.addEventListener('webglcontextrestored', () => {
    console.info('[WebGL] Context restored by browser. Reconstructing 3D scene.');
    isContextLost = false;

    // Clear GPU cache references
    modelCache.clear();
    if (beanGroup) {
      while (beanGroup.children.length > 0) {
        beanGroup.remove(beanGroup.children[0]);
      }
    }
    model = null;
    undiscoveredTextRing = null;
    undiscoveredRingGroup = null;

    // Restore environment and lights
    setupEnvironment();
    createCleanGround();
    createContactShadow();

    // Reload model
    loadModel(currentModelId);

    // Restart render loop
    animate(0);
  }, false);
}

function setupEnvironment() {
  if (!renderer || !scene) return;
  try {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv).texture;
    pmremGenerator.dispose();
  } catch (err) {
    console.warn('[WebGL] PMREMGenerator environment error:', err);
  }
}

/* ==========================================================================
   3D Model Loader Pipeline (GLTFLoader + DRACOLoader + Normalization)
   Desktop: Full 3D Breville Barista Express + Breville Dual Boiler Silhouette
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
    name: 'Breville Dual Boiler',
    path: 'assets/Breville Dual Boiler.glb',
    telemetryName: 'BREVILLE DUAL BOILER',
    description: 'Dual Boiler Specialty Espresso Machine (Silhouette)'
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

  if (progressBar) progressBar.style.width = success ? '100%' : '0%';
  if (percentText) percentText.textContent = success ? '100%' : '!';
  if (statusEl && finalStatus) statusEl.textContent = finalStatus;

  if (success) {
    setTimeout(() => {
      if (loaderOverlay) {
        loaderOverlay.classList.add('loaded');
      }
    }, 900);
  } else {
    if (loaderOverlay) {
      loaderOverlay.classList.remove('loaded');
    }
  }
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
   - Applies deep matte stealth silhouette shader for Breville 3D models
   ========================================================================== */
function prepareModelScene(importedScene, modelId) {
  // Deep matte stealth charcoal silhouette material
  const silhouetteMat = new THREE.MeshStandardMaterial({
    color: 0x141417, // Deep dark matte charcoal
    roughness: 0.92,
    metalness: 0.08,
    flatShading: false
  });

  importedScene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.material = silhouetteMat.clone();
    }
  });
}

/* ==========================================================================
   3D Rotating Text Ring Ribbon ("COFFEE EXTRACTION INFORMATION UNDISCOVERED")
   - Compact circular ribbon spinning in front of the coffee machine
   - Double-sided transparent cylinder with perspective tilt matching reference
   ========================================================================== */
function createUndiscoveredTextRing() {
  if (undiscoveredRingGroup) return undiscoveredRingGroup;

  // 1. Render high-resolution text onto dynamic canvas
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Bold geometric typography
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 80px "Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Phrase around cylinder circumference
  const phrase = "- UNDISCOVERED - UNDISCOVERED - UNDISCOVERED -";
  ctx.fillText(phrase, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  // 2. Open-ended cylinder geometry - a lot smaller (radius 0.48 vs previous 1.48)
  const radius = 0.48;
  const height = 0.15;
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);

  // DoubleSide is essential so the inside/rear letters show through mirrored, exactly like screenshot 2
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  undiscoveredTextRing = new THREE.Mesh(geometry, material);
  undiscoveredTextRing.name = 'undiscoveredTextRing';

  // Parent group positioned floating IN FRONT of the coffee machine with forward perspective tilt
  undiscoveredRingGroup = new THREE.Group();
  undiscoveredRingGroup.name = 'undiscoveredRingGroup';
  undiscoveredRingGroup.position.set(0, 0.30, 1.35); // In front of the front face of the machine
  undiscoveredRingGroup.rotation.x = 0.32; // Perspective tilt towards camera matching screenshot 2
  undiscoveredRingGroup.add(undiscoveredTextRing);
  undiscoveredRingGroup.visible = false;

  return undiscoveredRingGroup;
}

function updateUndiscoveredRingVisibility(targetModelId) {
  if (!undiscoveredRingGroup) {
    createUndiscoveredTextRing();
  }

  if (beanGroup && !beanGroup.children.includes(undiscoveredRingGroup)) {
    beanGroup.add(undiscoveredRingGroup);
  }

  if (targetModelId === 'classic') {
    undiscoveredRingGroup.visible = true;
    if (undiscoveredTextRing) {
      undiscoveredTextRing.material.opacity = 0;
      gsap.to(undiscoveredTextRing.material, {
        opacity: 0.96,
        duration: 0.7,
        ease: "power2.out"
      });
    }
  } else {
    if (undiscoveredTextRing) {
      gsap.to(undiscoveredTextRing.material, {
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          if (currentModelId !== 'classic' && undiscoveredRingGroup) {
            undiscoveredRingGroup.visible = false;
          }
        }
      });
    }
  }
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
  pivot.userData.baseScale = targetScale;

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
    updateUndiscoveredRingVisibility(modelId);
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
    loaderOverlay.style.cursor = 'default';
    loaderOverlay.onclick = null;
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

      // Preserve authentic materials and setup shadows (or deep matte silhouette for Dual Boiler)
      prepareModelScene(importedScene, modelId);
      const pivot = createNormalizedModelPivot(importedScene);

      // Cache normalized model in memory
      modelCache.set(modelId, pivot);

      replaceActiveModel(pivot, config);
      updateUndiscoveredRingVisibility(modelId);
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
      console.warn(`Could not load ${config.path} (${error.message || 'File not found'})`);
      isModelLoading = false;

      if (model && beanGroup && beanGroup.children.includes(model)) {
        beanGroup.remove(model);
        model = null;
      }

      modelSource = `OFFLINE / FAILED`;
      updateModelSourceTelemetry(modelSource);
      finishLoaderUI(false, `Failed to load ${config.name}. Tap to retry`);

      if (loaderOverlay) {
        loaderOverlay.style.cursor = 'pointer';
        loaderOverlay.onclick = () => {
          loaderOverlay.onclick = null;
          loaderOverlay.style.cursor = 'default';
          loadModel(modelId);
        };
      }
    }
  );
}

function replaceActiveModel(newPivot, config) {
  if (model && beanGroup.children.includes(model)) {
    const oldModel = model;
    const oldBaseScale = oldModel.userData.baseScale || oldModel.scale.x || 1.0;
    gsap.to(oldModel.scale, {
      x: oldBaseScale * 0.88,
      y: oldBaseScale * 0.88,
      z: oldBaseScale * 0.88,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        if (beanGroup && beanGroup.children.includes(oldModel)) {
          beanGroup.remove(oldModel);
        }
        // Essential: restore scale so cached pivot in modelCache never permanently shrinks
        oldModel.scale.setScalar(oldBaseScale);
      }
    });
  }

  model = newPivot;
  const targetScale = newPivot.userData.baseScale || newPivot.scale.x || 1.0;
  newPivot.scale.setScalar(targetScale);
  beanGroup.add(model);

  playModelFadeInAnimation();
}

function switchModel(targetModelId) {
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

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    // Mobile 2D Studio Image Cross-fade
    updateMobileShowcaseImage(targetModelId);
    updateModelSourceTelemetry(MODELS_CONFIG[targetModelId].telemetryName);
  } else {
    // Desktop 3D Model Stream
    loadModel(targetModelId);
  }

  // If extraction view is active, update recipe feed state
  if (isExtractedView) {
    renderExtractionFeed();
  }
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
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4
  });

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = GROUND_Y + 0.005;
  shadowMesh.renderOrder = 2;
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
  groundMesh.renderOrder = 0;
  scene.add(groundMesh);
}

/* ==========================================================================
   Model Fade-In Animation (Clean 3/4 View Cinematic Entrance)
   ========================================================================== */
function playModelFadeInAnimation() {
  if (!model) return;

  // Ensure beanGroup stays firmly grounded at center (unless in extracted recipe view)
  if (beanGroup && !isExtractedView) {
    beanGroup.position.set(0, 0, 0);
    beanGroup.rotation.set(0, 0, 0);
  }

  // Kill running animations & ensure scale is strictly baseScale
  gsap.killTweensOf(model.scale);
  const targetScale = model.userData.baseScale || model.scale.x || 1.0;
  model.scale.setScalar(targetScale);
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

  // Contact shadow fades in smoothly with the model (unless elevated in mobile extracted mode)
  if (shadowMesh) {
    const isMobile = window.innerWidth <= 768;
    if (isExtractedView && isMobile) {
      shadowMesh.material.opacity = 0;
    } else {
      shadowMesh.material.opacity = 0;
      shadowMesh.scale.set(1.0, 1.0, 1.0);
      fadeTl.to(shadowMesh.material, {
        opacity: 0.52,
        duration: 1.6,
        ease: "power2.out"
      }, 0);
    }
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
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* ==========================================================================
   PASSCODE PROTECTION & CLOUD STORAGE STATUS HELPERS
   ========================================================================== */
let pendingPasscodeAction = null;

function requirePasscode(onAuthorized) {
  if (isPasscodeUnlocked()) {
    onAuthorized();
    return;
  }
  pendingPasscodeAction = onAuthorized;
  openPasscodeModal();
}

function openPasscodeModal() {
  const modal = document.getElementById('modal-passcode');
  const input = document.getElementById('input-passcode');
  const errorMsg = document.getElementById('passcode-error-msg');
  if (errorMsg) errorMsg.textContent = '';
  if (input) {
    input.value = '';
    input.classList.remove('shake-input');
  }
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => { if (input) input.focus(); }, 100);
  }
}

function closePasscodeModal() {
  const modal = document.getElementById('modal-passcode');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  pendingPasscodeAction = null;
}

function updateStorageStatusIndicator(mode) {
  const pill = document.getElementById('storage-status-pill');
  const text = document.getElementById('storage-status-text');
  if (!pill || !text) return;

  if (mode === 'firebase') {
    pill.className = 'storage-status-pill is-cloud';
    pill.title = 'Connected to Cloud Firestore (Real-Time Multi-User Sync)';
    text.textContent = 'CLOUD LIVE';
  } else {
    pill.className = 'storage-status-pill is-local';
    pill.title = 'Running on Local IndexedDB (Configure firebase-config.js for Cloud Sync)';
    text.textContent = 'LOCAL DB';
  }
}

/* ==========================================================================
   2D Extracted Coffee Cards Feed (IndexedDB Powered)
   - Queries IndexedDB database for coffee extractions
   - Dynamically renders interactive 2D cards with Breville 1-12 grind & specs
   - Supports inline Edit and Delete operations with IndexedDB synchronization
   ========================================================================== */
async function renderExtractionFeed(recordsOverride = null) {
  const container = document.getElementById('extracted-cards-container');
  const countBadge = document.getElementById('db-counter-badge');
  if (!container) return;

  try {
    updateStorageStatusIndicator(getStorageMode());

    if (currentModelId === 'classic') {
      if (countBadge) {
        countBadge.textContent = '0 RECIPES';
      }
      container.innerHTML = '';
      return;
    }

    const extractions = Array.isArray(recordsOverride) ? recordsOverride : await getAllExtractions();

    if (countBadge) {
      countBadge.textContent = `${extractions.length} RECIPES`;
    }

    container.innerHTML = '';

    if (extractions.length === 0) {
      container.innerHTML = `
        <div class="empty-feed-notice" style="text-align: center; padding: 48px 20px; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8rem;">
          <p>No extraction records found in database.</p>
          <button class="action-pill-btn interactive-control" id="btn-seed-empty" style="margin: 14px auto 0 auto;">+ Log A New Recipe</button>
        </div>
      `;
      const seedBtn = document.getElementById('btn-seed-empty');
      if (seedBtn) seedBtn.addEventListener('click', () => openLogModal(null));
      return;
    }

    // Render cards
    extractions.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'extracted-item-card interactive-control';
      card.dataset.id = item.id;

      const isActive = activeExtractionId ? (item.id === activeExtractionId) : (index === 0);
      if (isActive) {
        card.classList.add('is-active');
        if (!activeExtractionId) activeExtractionId = item.id;
      }

      const notesHtml = (item.notes || []).map(note => `<span class="item-note-pill">${escapeHtml(note)}</span>`).join('');
      const additionalNotesHtml = item.additionalNotes
        ? `<p class="item-additional-notes">${escapeHtml(item.additionalNotes)}</p>`
        : '';

      card.innerHTML = `
        <div class="card-top-bar">
          <div class="card-action-btns">
            <button class="card-action-btn btn-edit-recipe interactive-control" title="Edit Recipe" aria-label="Edit Recipe">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button class="card-action-btn btn-delete-recipe interactive-control" title="Delete Recipe" aria-label="Delete Recipe">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Left Column: Brand Visual Badge & Origin -->
        <div class="item-card-left">
          <div class="item-brand-visual">
            <img class="item-brand-img" src="${item.imageSrc || 'assets/logo.jpg'}" alt="${escapeHtml(item.brandName)}" onerror="this.src='assets/logo.jpg'">
          </div>
          <span class="item-origin-meta">${escapeHtml(item.originRegion || 'Single Origin')}</span>
        </div>

        <!-- Right Column: Brand Name & Key Metrics -->
        <div class="item-card-right">
          <div class="item-card-heading">
            <h3 class="item-brand-title">${escapeHtml(item.brandName)}</h3>
            ${item.roastEdition ? `<p class="item-roast-edition">${escapeHtml(item.roastEdition)}</p>` : ''}
          </div>

          <!-- The Key Information Items -->
          <div class="item-metrics-grid">
            <div class="item-metric-row">
              <span class="metric-label-mini">1. Grind Setting</span>
              <span class="metric-val-bold">Setting ${item.grindSize || '5'}</span>
            </div>
            <div class="item-metric-row gold-tint">
              <span class="metric-label-mini">2. Ground Dose</span>
              <span class="metric-val-bold gold">${escapeHtml(item.grindAmount || '18.0 g')}</span>
            </div>
            <div class="item-metric-row gold-tint">
              <span class="metric-label-mini">3. Liquid Yield</span>
              <span class="metric-val-bold gold">${escapeHtml(item.extractedWeight || '36.0 g')}</span>
            </div>
          </div>

          <div class="item-telemetry-strip">
            <span class="item-tel-pill">TIME: ${escapeHtml(item.brewTime || '28s')}</span>
            <span class="item-tel-pill">TEMP: ${escapeHtml(item.brewTemp || '93.5°C')}</span>
            <span class="item-tel-pill">RATIO: ${escapeHtml(item.ratio || '1:2.0')}</span>
          </div>

          <div class="item-notes-row">
            ${notesHtml}
          </div>

          ${additionalNotesHtml}
        </div>
      `;

      // Interactive Click on card: Highlight active card
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.extracted-item-card').forEach(c => c.classList.remove('is-active'));
        card.classList.add('is-active');
        activeExtractionId = item.id;
      });

      // Edit Button Click (Passcode Protected)
      const btnEdit = card.querySelector('.btn-edit-recipe');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          requirePasscode(() => {
            openLogModal(item);
          });
        });
      }

      // Delete Button Click (Passcode Protected)
      const btnDelete = card.querySelector('.btn-delete-recipe');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          requirePasscode(async () => {
            const confirmed = window.confirm(`Delete recipe for "${item.brandName} - ${item.roastEdition}"?`);
            if (confirmed) {
              await deleteExtractionRecord(item.id);
              if (activeExtractionId === item.id) {
                activeExtractionId = null;
              }
              await renderExtractionFeed();
            }
          });
        });
      }

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Failed to render extraction feed from IndexedDB:', err);
  }
}

function openLogModal(itemToEdit = null) {
  const modal = document.getElementById('modal-log-extraction');
  const modalTag = document.getElementById('modal-tag');
  const modalTitle = document.getElementById('modal-log-title');
  const btnSaveText = document.getElementById('btn-save-text');
  const formLog = document.getElementById('form-log-extraction');
  const advSection = document.getElementById('advanced-fields-section');
  const btnToggleAdv = document.getElementById('btn-toggle-advanced');

  if (!modal) return;

  // Always start with advanced section collapsed
  if (advSection) advSection.classList.add('is-collapsed');
  if (btnToggleAdv) {
    btnToggleAdv.classList.remove('is-open');
    btnToggleAdv.setAttribute('aria-expanded', 'false');
  }

  if (itemToEdit) {
    // Edit mode
    if (modalTag) modalTag.textContent = 'INDEXEDDB RECIPE EDITOR';
    if (modalTitle) modalTitle.textContent = 'Edit Coffee Extraction';
    if (btnSaveText) btnSaveText.textContent = 'Update Recipe';

    const inputEditId = document.getElementById('input-edit-id');
    if (inputEditId) inputEditId.value = itemToEdit.id || '';

    const inputBrand = document.getElementById('input-brand');
    if (inputBrand) inputBrand.value = itemToEdit.brandName || '';

    const inputEdition = document.getElementById('input-edition');
    if (inputEdition) inputEdition.value = itemToEdit.roastEdition || '';

    const inputOrigin = document.getElementById('input-origin');
    if (inputOrigin) inputOrigin.value = itemToEdit.originRegion || '';

    // Grind size Breville 1-12
    const grindSelect = document.getElementById('select-grind');
    if (grindSelect) {
      const numericVal = parseInt(itemToEdit.grindSize, 10);
      if (!isNaN(numericVal) && numericVal >= 1 && numericVal <= 12) {
        grindSelect.value = String(numericVal);
      } else {
        grindSelect.value = '5';
      }
    }

    const inputDose = document.getElementById('input-dose');
    if (inputDose) inputDose.value = itemToEdit.grindAmount || '18.0 g';

    const inputYield = document.getElementById('input-yield');
    if (inputYield) inputYield.value = itemToEdit.extractedWeight || '36.0 g';

    const inputTime = document.getElementById('input-time');
    if (inputTime) inputTime.value = itemToEdit.brewTime || '28s';

    const inputTemp = document.getElementById('input-temp');
    if (inputTemp) inputTemp.value = itemToEdit.brewTemp || '93.5°C';

    const inputNotes = document.getElementById('input-notes');
    if (inputNotes) inputNotes.value = (itemToEdit.notes || []).join(', ');

    const inputAdditionalNotes = document.getElementById('input-additional-notes');
    if (inputAdditionalNotes) inputAdditionalNotes.value = itemToEdit.additionalNotes || '';
  } else {
    // New Log mode
    if (modalTag) modalTag.textContent = 'INDEXEDDB LOGGING ENGINE';
    if (modalTitle) modalTitle.textContent = 'Log Coffee Extraction';
    if (btnSaveText) btnSaveText.textContent = 'Save to Database';

    if (formLog) formLog.reset();
    const inputEditId = document.getElementById('input-edit-id');
    if (inputEditId) inputEditId.value = '';

    const inputBrand = document.getElementById('input-brand');
    if (inputBrand) inputBrand.value = '';

    const inputEdition = document.getElementById('input-edition');
    if (inputEdition) inputEdition.value = '';

    const inputOrigin = document.getElementById('input-origin');
    if (inputOrigin) inputOrigin.value = '';

    const grindSelect = document.getElementById('select-grind');
    if (grindSelect) grindSelect.value = '5';

    const inputDose = document.getElementById('input-dose');
    if (inputDose) inputDose.value = '18.0 g';

    const inputYield = document.getElementById('input-yield');
    if (inputYield) inputYield.value = '36.0 g';

    const inputTime = document.getElementById('input-time');
    if (inputTime) inputTime.value = '28s';

    const inputTemp = document.getElementById('input-temp');
    if (inputTemp) inputTemp.value = '93.5°C';

    const inputNotes = document.getElementById('input-notes');
    if (inputNotes) inputNotes.value = '';

    const inputAdditionalNotes = document.getElementById('input-additional-notes');
    if (inputAdditionalNotes) inputAdditionalNotes.value = '';
  }

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeLogModal() {
  const modal = document.getElementById('modal-log-extraction');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

async function toggleExtractedView(forceState, isInstant = false) {
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
    gsap.killTweensOf(shadowMesh.material);
  }
  if (camera) gsap.killTweensOf(camera.position);
  if (model) gsap.killTweensOf(model.rotation);

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    document.body.classList.toggle('extracted-open-mobile', shouldOpen);
  }

  if (shouldOpen) {
    // 1. Refresh extraction data feed from IndexedDB
    await renderExtractionFeed();

    // 2. Choreograph 3D Bean: Pan Left, Zoom Out, Spin 360
    const targetX = isMobile ? 0.0 : -1.45;
    const targetY = isMobile ? 1.32 : 0.0;
    const targetZ = isMobile ? getResponsiveCameraZ() * 1.05 : 5.85;

    if (isInstant) {
      if (beanGroup) beanGroup.position.set(targetX, targetY, 0);
      if (shadowMesh) {
        shadowMesh.position.set(targetX, GROUND_Y + 0.005, 0);
        if (isMobile) {
          shadowMesh.material.opacity = 0;
          shadowMesh.scale.set(0.85, 0.85, 1);
        } else {
          shadowMesh.material.opacity = 0.52;
          shadowMesh.scale.set(1.0, 1.0, 1.0);
        }
      }
      if (camera) camera.position.set(0, CAMERA_CENTER_Y, targetZ);
      if (model) model.rotation.set(0, BASE_ROTATION_Y - 0.08, 0);
    } else {
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
          // Fade out shadow quickly as machine takes off into the air
          tl.to(shadowMesh.material, {
            opacity: 0,
            duration: 0.45,
            ease: "power2.out"
          }, 0);
          tl.to(shadowMesh.scale, {
            x: 0.85,
            y: 0.85,
            duration: 1.6,
            ease: "power3.inOut"
          }, 0);
        } else {
          // On desktop, keep shadow fully visible and sliding with machine
          tl.to(shadowMesh.material, {
            opacity: 0.52,
            duration: 0.6,
            ease: "power2.out"
          }, 0);
        }
      }

      if (camera) {
        tl.to(camera.position, {
          y: CAMERA_CENTER_Y,
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
    }

    // 3. UI states
    document.body.classList.add('extracted-mode-active');
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('is-active');
    if (btnTitle) btnTitle.textContent = isMobile ? 'VIEW 3D MACHINE' : 'BACK TO 3D MACHINE';
    if (btnSub) btnSub.textContent = isMobile ? 'Tap to inspect 3D espresso machine' : 'Click to return to center inspection';
    if (btnBadge) btnBadge.textContent = isMobile ? '3D VIEW' : 'RETURN';
    if (statusBadge) statusBadge.textContent = 'MODE: EXTRACTION DATABASE';

    if (!isInstant) {
      // Staggered luxury fade-in of cards
      gsap.from("#extracted-cards-container .extracted-item-card", {
        opacity: 0,
        y: 22,
        stagger: 0.07,
        duration: 0.55,
        ease: "power2.out",
        delay: 0.2
      });
    }

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
      shadowMesh.position.y = GROUND_Y + 0.005;
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

      // Realistic touchdown landing: Keep shadow hidden during initial descent,
      // and smoothly fade it in during the final ~0.6s as the machine contacts the floor
      if (isMobile) {
        tl.fromTo(shadowMesh.material,
          { opacity: 0 },
          {
            opacity: 0.52,
            duration: 0.6,
            ease: "power2.out"
          },
          0.8 // starts at 0.8s into the 1.4s descent
        );
      } else {
        tl.to(shadowMesh.material, {
          opacity: 0.52,
          duration: 0.8,
          ease: "power2.out"
        }, 0);
      }
    }

    if (camera) {
      tl.to(camera.position, {
        y: CAMERA_CENTER_Y,
        z: getResponsiveCameraZ(),
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
    }
  });

  // Mobile Drag Handle on 2D Extracted List Panel
  const dragHandle = document.getElementById('sheet-drag-handle');
  if (dragHandle) {
    dragHandle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleExtractedView(false);
    });
  }

  // Primary Action Button: View Extracted Coffee / View 3D Machine
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

  // Advanced Settings Toggle in Modal
  const btnToggleAdv = document.getElementById('btn-toggle-advanced');
  const advSection = document.getElementById('advanced-fields-section');
  if (btnToggleAdv && advSection) {
    btnToggleAdv.addEventListener('click', (e) => {
      e.stopPropagation();
      const isCollapsed = advSection.classList.contains('is-collapsed');
      if (isCollapsed) {
        advSection.classList.remove('is-collapsed');
        btnToggleAdv.classList.add('is-open');
        btnToggleAdv.setAttribute('aria-expanded', 'true');
      } else {
        advSection.classList.add('is-collapsed');
        btnToggleAdv.classList.remove('is-open');
        btnToggleAdv.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Modal Dialog Controls: Open, Close & Backdrop Click
  const btnOpenModal = document.getElementById('btn-open-log-modal');
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', (e) => {
      e.stopPropagation();
      openLogModal(null);
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

  // Log / Edit Extraction Form Submission (IndexedDB Write)
  const formLog = document.getElementById('form-log-extraction');
  if (formLog) {
    formLog.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('input-edit-id')?.value;
      const brand = document.getElementById('input-brand').value.trim();
      const edition = document.getElementById('input-edition').value.trim();
      const origin = document.getElementById('input-origin').value.trim() || 'Single Origin';
      const grind = document.getElementById('select-grind')?.value || '5';
      const dose = document.getElementById('input-dose')?.value.trim() || '18.0 g';
      const yieldWeight = document.getElementById('input-yield')?.value.trim() || '36.0 g';
      const time = document.getElementById('input-time')?.value.trim() || '28s';
      const temp = document.getElementById('input-temp')?.value.trim() || '93.5°C';

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

      const additionalNotes = document.getElementById('input-additional-notes')?.value.trim() || '';

      const recordData = {
        brandName: brand,
        roastEdition: edition,
        originRegion: origin,
        grindSize: grind,
        grindDetail: `Dial Setting ${grind} · Breville Conical`,
        grindAmount: dose,
        doseDetail: `Dry Ground Dose (${dose} in)`,
        extractedWeight: yieldWeight,
        yieldDetail: `Liquid Espresso Yield (${ratio})`,
        brewTime: time,
        brewTemp: temp,
        ratio: ratio,
        notes: notes,
        additionalNotes: additionalNotes,
        timestamp: Date.now()
      };

      try {
        if (editId) {
          const recordId = isNaN(Number(editId)) ? editId : Number(editId);
          // Preserve existing imageSrc if available
          const existingList = await getAllExtractions();
          const existingRecord = existingList.find(x => String(x.id) === String(recordId));
          if (existingRecord && existingRecord.imageSrc) {
            recordData.imageSrc = existingRecord.imageSrc;
          }
          await updateExtractionRecord({ id: recordId, ...recordData });
          activeExtractionId = recordId;
        } else {
          const newId = await addExtractionRecord(recordData);
          activeExtractionId = newId;
        }

        formLog.reset();
        closeLogModal();

        // Refresh feed
        await renderExtractionFeed();

        // Make sure extracted view is open so user sees their updated or new recipe
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
      const passcodeModal = document.getElementById('modal-passcode');
      const modal = document.getElementById('modal-log-extraction');
      if (passcodeModal && passcodeModal.classList.contains('active')) {
        closePasscodeModal();
      } else if (modal && modal.classList.contains('active')) {
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

  // Sound Toggle Button (if element present)
  const audioBtn = document.getElementById('audio-toggle-btn');
  const iconMuted = document.getElementById('audio-icon-muted');
  const iconActive = document.getElementById('audio-icon-active');

  if (audioBtn && iconMuted && iconActive) {
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      initAudio();
      audioEnabled = !audioEnabled;
      iconMuted.style.display = audioEnabled ? 'none' : 'block';
      iconActive.style.display = audioEnabled ? 'block' : 'none';
      audioBtn.style.color = audioEnabled ? 'var(--gold-primary)' : 'var(--text-secondary)';
      audioBtn.title = audioEnabled ? 'Sound Enabled (Mute)' : 'Sound Muted (Enable)';
    });
  }

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

  // Security Passcode Form Submission
  const formPasscode = document.getElementById('form-passcode');
  if (formPasscode) {
    formPasscode.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-passcode');
      const errorMsg = document.getElementById('passcode-error-msg');
      const pin = input?.value || '';

      if (verifyPasscode(pin)) {
        closePasscodeModal();
        if (typeof pendingPasscodeAction === 'function') {
          const action = pendingPasscodeAction;
          pendingPasscodeAction = null;
          action();
        }
      } else {
        if (errorMsg) errorMsg.textContent = 'Incorrect passcode. Please try again.';
        if (input) {
          input.classList.add('shake-input');
          setTimeout(() => input.classList.remove('shake-input'), 500);
          input.focus();
        }
      }
    });
  }

  const btnCancelPasscode = document.getElementById('btn-cancel-passcode');
  if (btnCancelPasscode) {
    btnCancelPasscode.addEventListener('click', closePasscodeModal);
  }

  const btnClosePasscodeModal = document.getElementById('btn-close-passcode-modal');
  if (btnClosePasscodeModal) {
    btnClosePasscodeModal.addEventListener('click', closePasscodeModal);
  }

  // Reset to Defaults Button
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', () => {
      requirePasscode(async () => {
        const confirmed = window.confirm('Reset all recipes to default curated profiles? This will restore original recipes.');
        if (confirmed) {
          await resetDatabaseToDefaults();
          activeExtractionId = null;
          await renderExtractionFeed();
        }
      });
    });
  }

  // Initialize real-time extraction subscription (Cloud Firestore or local IndexedDB fallback)
  subscribeToExtractions((records, mode) => {
    updateStorageStatusIndicator(mode);
    renderExtractionFeed(records);
  });
}

function onWindowResize() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    updateMobileShowcaseImage(currentModelId);
    return;
  }

  // Transitioning from mobile to desktop: lazily initialize Three.js
  if (!renderer) {
    initDesktopThree();
    return;
  }

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));

  // Maintain smooth responsive camera distance when resizing or rotating device
  if (!isZoomed && !isExtractedView) {
    camera.position.z = getResponsiveCameraZ();
  }

  if (!animationFrameId && !isContextLost) {
    animate(0);
  }
}

/* ==========================================================================
   Render Animation Loop (3/4 View - Clean Grounded Model)
   ========================================================================== */
function animate(time) {
  if (isContextLost) return;
  animationFrameId = requestAnimationFrame(animate);

  // Keep camera facing straight front at machine center (Y = CAMERA_CENTER_Y)
  if (camera) {
    camera.lookAt(0, CAMERA_CENTER_Y, 0);
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

  // Continuous smooth 3D rotation for undiscovered text ribbon
  if (undiscoveredTextRing && undiscoveredRingGroup && undiscoveredRingGroup.visible) {
    undiscoveredTextRing.rotation.y -= 0.0075;
  }

  // Update HUD
  updateTelemetry();

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Start experience when DOM is ready (Desktop 3D vs Mobile 2D Studio)
window.addEventListener('DOMContentLoaded', initExperience);
