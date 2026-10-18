import * as THREE from 'three';
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
let scene, camera, renderer, model, beanGroup, particles, shadowMesh;
let keyLight, fillLight, rimLight, ambientLight;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0.2, y: 0 };
let mouseParallax = { x: 0, y: 0 };
let currentRoast = 'medium';
let audioEnabled = false;
let audioCtx = null;

// Roast Profiles Data
const roastProfiles = {
  light: {
    title: "Ethiopian Guji Heirloom",
    tag: "LOT NO. 01 // LIGHT ROAST",
    altitude: "2,200 MASL",
    process: "Washed / Sun Dried",
    varietal: "Indigenous Heirloom",
    roast: "Agtron #82 Light",
    notes: ["Lemon Verbena", "Peach Blossom", "Wild Honey", "Bergamot"],
    density: "Ultra Dense (1.41g/cm³)",
    temp: "95.0°C // 24s",
    tds: "1.42% (22.1% EY)",
    roastPercent: "68%",
    color: 0x8b4f2c,
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.15,
    sheenColor: 0xd49b6a,
    lightColor: 0xffe2b8
  },
  medium: {
    title: "Colombian Geisha Natural",
    tag: "LOT NO. 04 // SPECIAL RESERVE",
    altitude: "1,950 MASL",
    process: "Anaerobic Slow",
    varietal: "Geisha T2722",
    roast: "Agtron #64 Medium",
    notes: ["Bergamot", "Jasmine Bloom", "Honey Melon", "Cacao Nib"],
    density: "High (SHB 1.34g/cm³)",
    temp: "93.5°C // 28s",
    tds: "1.38% (20.5% EY)",
    roastPercent: "88%",
    color: 0x442013,
    roughness: 0.38,
    metalness: 0.04,
    clearcoat: 0.25,
    sheenColor: 0xc68b59,
    lightColor: 0xffb86c
  },
  dark: {
    title: "Sumatra Mandheling Aged",
    tag: "LOT NO. 09 // DARK ROAST",
    altitude: "1,600 MASL",
    process: "Giling Basah",
    varietal: "Typica & Catimor",
    roast: "Agtron #42 Dark",
    notes: ["Dark Cocoa 90%", "Cedar Wood", "Molasses", "Black Truffle"],
    density: "Medium (1.28g/cm³)",
    temp: "91.0°C // 32s",
    tds: "1.48% (19.8% EY)",
    roastPercent: "98%",
    color: 0x1d0f09,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.55,
    sheenColor: 0x935638,
    lightColor: 0xff9944
  },
  gold: {
    title: "Extracted Beans 24K Reserve",
    tag: "SPECIAL EDITION // MYTHICAL",
    altitude: "Stratosphere",
    process: "Atomic Vapor Deposition",
    varietal: "Pure Aurum 24K",
    roast: "Agtron #00 Luminous",
    notes: ["Golden Caramel", "Amber Saffron", "Champagne Sparkle", "Bourbon"],
    density: "Noble Metal (19.3g/cm³)",
    temp: "98.0°C // 45s",
    tds: "2.10% (Gold Standard)",
    roastPercent: "100%",
    color: 0xffd700,
    roughness: 0.18,
    metalness: 0.95,
    clearcoat: 0.75,
    sheenColor: 0xfff0aa,
    lightColor: 0xfff0bb
  }
};

/* ==========================================================================
   Initialize Three.js World
   ========================================================================== */
function initThree() {
  const canvas = document.getElementById('webgl-canvas');
  
  // 1. Scene & Atmospheric Fog
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080605, 0.045);

  // 2. Camera setup with defaultZ
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, defaultZ);

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
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 4. Lighting Rig
  setupLighting();

  // 5. Build 3D Coffee Bean & Environment
  createCoffeeBeanModel();
  createContactShadow();
  createAromaParticles();

  // 6. Interaction Handlers
  setupInteractivity();

  // 7. Render Loop
  animate(0);
}

/* ==========================================================================
   Studio Lighting Setup
   ========================================================================== */
function setupLighting() {
  // Ambient Soft Fill
  ambientLight = new THREE.AmbientLight(0x281e18, 1.4);
  scene.add(ambientLight);

  // Key Light (Warm, Golden studio light)
  keyLight = new THREE.DirectionalLight(0xffb86c, 3.2);
  keyLight.position.set(4, 5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  // Rim Light (Sharp back rim to highlight bean silhouette)
  rimLight = new THREE.DirectionalLight(0xff7722, 4.0);
  rimLight.position.set(-4, -2, -3.5);
  scene.add(rimLight);

  // Top Fill Light (Cool daylight soft fill)
  fillLight = new THREE.DirectionalLight(0xa5c4ff, 1.5);
  fillLight.position.set(-3, 4, 2);
  scene.add(fillLight);
}

/* ==========================================================================
   Procedural 3D Coffee Bean Generation
   Creates an authentic, anatomically sculpted coffee bean with crevice & cleft
   ========================================================================== */
function createCoffeeBeanModel() {
  beanGroup = new THREE.Group();

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
  scene.add(beanGroup);
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

  // Chaff / Silver-skin center vein (the pale line inside coffee bean crevice)
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 150, 120, 0.55)';
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
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -1.6;
  scene.add(shadowMesh);
}

/* ==========================================================================
   Floating Aroma Embers & Particles
   ========================================================================== */
function createAromaParticles() {
  const count = 120;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Spherical volume around bean
    const radius = 1.2 + Math.random() * 2.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    scales[i] = Math.random() * 0.05 + 0.02;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

  // Circular glow particle texture
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 64;
  pCanvas.height = 64;
  const pCtx = pCanvas.getContext('2d');
  const grad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 200, 120, 1)');
  grad.addColorStop(0.3, 'rgba(229, 176, 90, 0.6)');
  grad.addColorStop(1, 'rgba(229, 176, 90, 0)');
  pCtx.fillStyle = grad;
  pCtx.fillRect(0, 0, 64, 64);

  const pTexture = new THREE.CanvasTexture(pCanvas);

  const material = new THREE.PointsMaterial({
    size: 0.12,
    map: pTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.75
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
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

/* ==========================================================================
   Telemetry & HUD Updates
   ========================================================================== */
function updateTelemetry() {
  const camZ = camera.position.z.toFixed(2);
  const rotY = ((model.rotation.y * 180 / Math.PI) % 360).toFixed(1);
  
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

  // Animate material transition with GSAP
  if (model && model.material) {
    gsap.to(model.material.color, {
      r: new THREE.Color(profile.color).r,
      g: new THREE.Color(profile.color).g,
      b: new THREE.Color(profile.color).b,
      duration: 1.2,
      ease: "power2.out"
    });

    gsap.to(model.material, {
      roughness: profile.roughness,
      metalness: profile.metalness,
      clearcoat: profile.clearcoat,
      duration: 1.2
    });

    if (profile.sheenColor) {
      gsap.to(model.material.sheenColor, {
        r: new THREE.Color(profile.sheenColor).r,
        g: new THREE.Color(profile.sheenColor).g,
        b: new THREE.Color(profile.sheenColor).b,
        duration: 1.2
      });
    }
  }

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

      tl.to(model.rotation, {
        y: model.rotation.y + Math.PI * 2, // Full 360-degree spin
        duration: animationDuration,
        ease: "power2.inOut"
      }, 0);

      isZoomed = true;
      setZoomUIState(true);
    } else {
      // === CYCLE 2: CLICK AGAIN TO ZOOM OUT & SPIN ===
      tl.to(camera.position, {
        z: defaultZ,
        duration: animationDuration,
        ease: "power2.inOut"
      }, 0);

      tl.to(model.rotation, {
        y: model.rotation.y - Math.PI * 2, // Spins backward (or + to keep spinning forward)
        duration: animationDuration,
        ease: "power2.inOut"
      }, 0);

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
      // Warm Amber Studio
      gsap.to(keyLight.color, { r: 1.0, g: 0.72, b: 0.42, duration: 1 });
      gsap.to(rimLight.color, { r: 1.0, g: 0.47, b: 0.13, duration: 1 });
    } else if (lightMode === 1) {
      // Cyber Roastery Neon
      gsap.to(keyLight.color, { r: 0.2, g: 0.8, b: 1.0, duration: 1 });
      gsap.to(rimLight.color, { r: 1.0, g: 0.1, b: 0.6, duration: 1 });
    } else {
      // Pure White Laboratory
      gsap.to(keyLight.color, { r: 1.0, g: 1.0, b: 1.0, duration: 1 });
      gsap.to(rimLight.color, { r: 0.9, g: 0.9, b: 1.0, duration: 1 });
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
   Render Animation Loop
   ========================================================================== */
function animate(time) {
  requestAnimationFrame(animate);

  const t = time * 0.001;

  // Gentle idle floating motion on bean group (without interrupting GSAP timeline on model)
  if (beanGroup) {
    beanGroup.position.y = Math.sin(t * 1.5) * 0.08;
    beanGroup.rotation.z = Math.sin(t * 0.8) * 0.04;
    
    // Parallax tilt from mouse
    beanGroup.rotation.x = THREE.MathUtils.lerp(beanGroup.rotation.x, mouseParallax.y * 0.5, 0.05);
  }

  // Contact shadow breathing in sync with bean float
  if (shadowMesh) {
    const shadowScale = 1.0 - Math.sin(t * 1.5) * 0.08;
    shadowMesh.scale.set(shadowScale, shadowScale, 1.0);
    shadowMesh.material.opacity = 0.65 - Math.sin(t * 1.5) * 0.12;
  }

  // Aroma particles gentle swirl
  if (particles) {
    particles.rotation.y = t * 0.05;
    particles.rotation.x = Math.sin(t * 0.03) * 0.1;
  }

  // Update HUD
  updateTelemetry();

  renderer.render(scene, camera);
}

// Start Three.js when DOM is ready
window.addEventListener('DOMContentLoaded', initThree);
