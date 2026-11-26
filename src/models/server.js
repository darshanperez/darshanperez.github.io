import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials, ledColors } from '../core/materials.js';

// Procedural server (§6): a minimal black "tech object", like a phone. A
// glossy rounded shell with a slim bezel and a dark glass front; behind the
// glass, a stack of thin units with drive slots and small status lights; a
// vent band at the foot. Same interface as a future .glb loader:
// create() → { group, parts, update }. Geometry is built once, up front;
// materials come from core/materials.js.

export const DEFAULT_SIZE = { width: 1.2, height: 2.6, depth: 1.1 };

const UNITS = 11;
const LEDS_PER_UNIT = 5;
const SLOTS = 8;
const VENTS = 7;

export function create({ width: W, height: H, depth: D } = DEFAULT_SIZE, { segments = 1 } = {}) {
  const seg = Math.max(2, Math.round(4 * segments));
  const group = new THREE.Group();
  const front = D / 2;

  // Shell.
  const shell = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, seg, Math.min(W, H) * 0.06), materials.shell);

  // Window: the glass sits in front of the shell, framed by a slim bezel, so
  // the hardware lives in the space between.
  const border = W * 0.07;
  const footH = H * 0.11; // vent band below the window
  const winW = W - border * 2;
  const winH = H - border - footH;
  const winY = (footH - border) / 2;
  const depth = 0.07; // window depth
  const glassZ = front + depth;

  const bar = (w, h) => new RoundedBoxGeometry(w, h, depth + 0.01, 2, Math.min(w, h) * 0.45);
  const bezel = new THREE.Group();
  const t = border * 0.55;
  for (const [w, h, x, y] of [
    [winW + t * 2, t, 0, winY + winH / 2 + t / 2],
    [winW + t * 2, t, 0, winY - winH / 2 - t / 2],
    [t, winH, -winW / 2 - t / 2, winY],
    [t, winH, winW / 2 + t / 2, winY],
  ]) {
    const m = new THREE.Mesh(bar(w, h), materials.shell);
    m.position.set(x, y, front + depth / 2);
    bezel.add(m);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), materials.glass);
  glass.position.set(0, winY, glassZ);

  // Hardware behind the glass.
  const unitH = winH / UNITS;
  const unitW = winW * 0.94;
  const z = front + 0.025;
  const units = new THREE.InstancedMesh(new RoundedBoxGeometry(unitW, unitH * 0.78, 0.03, 2, 0.008), materials.hardware, UNITS);
  const slots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, unitH * 0.46, 0.006), materials.recess, UNITS * SLOTS);
  const leds = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.016, 0.016), materials.led, UNITS * LEDS_PER_UNIT);
  const m = new THREE.Matrix4();
  const blink = [];
  for (let u = 0; u < UNITS; u++) {
    const y = winY + winH / 2 - unitH * (u + 0.5);
    units.setMatrixAt(u, m.makeTranslation(0, y, z));
    for (let s = 0; s < SLOTS; s++) {
      slots.setMatrixAt(u * SLOTS + s, m.makeTranslation(unitW * 0.12 + s * (unitW * 0.042), y, z + 0.016));
    }
    for (let l = 0; l < LEDS_PER_UNIT; l++) {
      const i = u * LEDS_PER_UNIT + l;
      leds.setMatrixAt(i, m.makeTranslation(-unitW * 0.4 + l * 0.034, y, z + 0.017));
      leds.setColorAt(i, ledColors.off);
      blink.push({
        rate: 0.5 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        duty: 0.15 + Math.random() * 0.55,
        color: Math.random() < 0.7 ? ledColors.on : ledColors.idle,
      });
    }
  }

  // Vent band at the foot of the front.
  const vents = new THREE.InstancedMesh(new RoundedBoxGeometry(winW, footH * 0.06, 0.012, 1, 0.004), materials.recess, VENTS);
  for (let v = 0; v < VENTS; v++) {
    const y = -H / 2 + footH * (0.25 + (v * 0.5) / (VENTS - 1));
    vents.setMatrixAt(v, m.makeTranslation(0, y, front + 0.002));
  }

  group.add(shell, bezel, units, slots, leds, vents, glass);

  /** Idle status lights, driven by elapsed time (seconds). */
  function update(time) {
    for (let i = 0; i < blink.length; i++) {
      const { rate, phase, duty, color } = blink[i];
      leds.setColorAt(i, Math.sin(time * rate + phase) > 1 - duty * 2 ? color : ledColors.off);
    }
    leds.instanceColor.needsUpdate = true;
  }

  return { group, parts: { shell, bezel, glass, units, leds }, update, size: { width: W, height: H, depth: D, front: glassZ } };
}
