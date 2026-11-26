import * as THREE from 'three';
import { colors } from '../styles/tokens.js';

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
  camera.position.set(0, 0, 8);

  scene.add(new THREE.AmbientLight(colors.mist, 0.6));
  const key = new THREE.DirectionalLight(colors.mist, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(colors.accentOnDark, 1.2);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  function resize() {
    // The canvas is sized by CSS (100lvh) so iOS's toolbar doesn't cause jumps.
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let enabled = true;
  const timer = new THREE.Timer();
  timer.connect(document); // ignores time spent in a hidden tab
  const tickers = new Set(); // idle, clock-driven micro-animations

  function render() {
    timer.update();
    if (!enabled || document.hidden) return;
    const dt = timer.getDelta();
    const t = timer.getElapsed();
    tickers.forEach((fn) => fn(dt, t));
    renderer.render(scene, camera);
  }

  return {
    renderer,
    scene,
    camera,
    render,
    onTick: (fn) => tickers.add(fn),
    setEnabled(on) {
      enabled = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
    },
  };
}
