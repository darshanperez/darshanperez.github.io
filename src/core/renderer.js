import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { colors } from '../styles/tokens.js';
import { createFx } from './fx.js';

// One fullscreen canvas behind the HTML overlay (§3).
export function createRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // page background (--bg) shows through
    antialias: quality.antialias,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = quality.shadows;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  // Scenes tween `camera.position` and `cameraTarget`; the camera looks at the target every frame.
  const HOME = { position: new THREE.Vector3(0, 0, 8), target: new THREE.Vector3(0, 0, 0), fov: 35 };
  const cameraTarget = HOME.target.clone();
  camera.position.copy(HOME.position);

  // Metal needs something to reflect: a neutral studio environment, kept dim.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  // One group per act, so a later scene can hide a whole act at once.
  const acts = new Map();
  function act(name) {
    if (!acts.has(name)) {
      const g = new THREE.Group();
      g.name = name;
      scene.add(g);
      acts.set(name, g);
    }
    return acts.get(name);
  }

  scene.add(new THREE.AmbientLight(colors.mist, 0.6));
  const key = new THREE.DirectionalLight(colors.mist, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  // Neutral lighting only; colored light and effects belong to the SFX phase.
  const rim = new THREE.DirectionalLight(colors.mist, 0.8);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const fx = createFx(renderer, scene, camera);
  const resizers = new Set();
  function resize() {
    // The canvas is sized by CSS (100lvh) so iOS's toolbar doesn't cause jumps.
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fx.resize(w, h);
    resizers.forEach((fn) => fn(w, h));
  }
  resize();
  window.addEventListener('resize', resize);

  let enabled = true;
  const timer = new THREE.Timer();
  timer.connect(document); // ignores time spent in a hidden tab
  const tickers = new Set(); // idle, clock-driven micro-animations
  const overlays = new Set(); // drawn after the WebGL frame, with the same camera (e.g. CSS3D labels)

  function render() {
    timer.update();
    if (!enabled || document.hidden) return;
    const dt = timer.getDelta();
    const t = timer.getElapsed();
    tickers.forEach((fn) => fn(dt, t));
    camera.updateProjectionMatrix(); // scenes may tween the fov
    camera.lookAt(cameraTarget);
    fx.render();
    overlays.forEach((fn) => fn(scene, camera));
  }

  return {
    renderer,
    scene,
    camera,
    cameraTarget,
    HOME,
    act,
    render,
    onTick: (fn) => tickers.add(fn),
    /** Runs after every drawn frame with (scene, camera). */
    onRender: (fn) => overlays.add(fn),
    /** Runs now and on every resize with the canvas size in CSS px. */
    onResize(fn) {
      resizers.add(fn);
      fn(canvas.clientWidth, canvas.clientHeight);
    },
    setEnabled(on) {
      enabled = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
    },
  };
}
