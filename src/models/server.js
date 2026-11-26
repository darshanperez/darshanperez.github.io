import * as THREE from 'three';
import { colors } from '../styles/tokens.js';

// Procedural server rack (§6): body + front bays + vent slats + LEDs, dark
// metal with lit edges. Same interface as a future .glb loader:
// create() → { group, parts }. All geometry is built once, up front.

export const SIZE = { width: 1.1, height: 2.2, depth: 1.0 };
const BAYS = 7;
const SLATS = 6;
const LEDS_PER_BAY = 2;

const { width: W, height: H, depth: D } = SIZE;
const bayH = (H * 0.86) / BAYS;
const front = D / 2;

const geo = {
  body: new THREE.BoxGeometry(W, H, D),
  plate: new THREE.BoxGeometry(W * 0.86, bayH * 0.78, 0.03),
  slat: new THREE.BoxGeometry(0.012, bayH * 0.5, 0.012),
  led: new THREE.CircleGeometry(0.02, 12),
};
const edges = new THREE.EdgesGeometry(geo.body);

const mat = {
  body: new THREE.MeshStandardMaterial({ color: colors.ink, metalness: 0.7, roughness: 0.35 }),
  plate: new THREE.MeshStandardMaterial({ color: colors.graphite, metalness: 0.5, roughness: 0.45 }),
  slat: new THREE.MeshBasicMaterial({ color: colors.ink }),
  edge: new THREE.LineBasicMaterial({ color: colors.accentOnDark, transparent: true, opacity: 0.55, toneMapped: false }),
  led: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
};

const LED_ON = new THREE.Color(colors.accentOnDark);
const LED_OFF = new THREE.Color(colors.graphite);

export function create() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo.body, mat.body);
  const outline = new THREE.LineSegments(edges, mat.edge);

  const m = new THREE.Matrix4();
  const plates = new THREE.InstancedMesh(geo.plate, mat.plate, BAYS);
  const slats = new THREE.InstancedMesh(geo.slat, mat.slat, BAYS * SLATS);
  const leds = new THREE.InstancedMesh(geo.led, mat.led, BAYS * LEDS_PER_BAY);
  const blink = []; // per-LED rhythm

  for (let b = 0; b < BAYS; b++) {
    const y = -H * 0.43 + bayH * (b + 0.5);
    plates.setMatrixAt(b, m.makeTranslation(0, y, front + 0.015));
    for (let s = 0; s < SLATS; s++) {
      slats.setMatrixAt(b * SLATS + s, m.makeTranslation(W * 0.08 + s * 0.045, y, front + 0.036));
    }
    for (let l = 0; l < LEDS_PER_BAY; l++) {
      const i = b * LEDS_PER_BAY + l;
      leds.setMatrixAt(i, m.makeTranslation(-W * 0.33 + l * 0.07, y, front + 0.032));
      leds.setColorAt(i, LED_OFF);
      blink.push({ rate: 0.6 + Math.random() * 2.4, phase: Math.random() * Math.PI * 2, duty: 0.2 + Math.random() * 0.5 });
    }
  }

  group.add(body, outline, plates, slats, leds);

  /** Idle LED blinking, driven by elapsed time (seconds). */
  function update(t) {
    for (let i = 0; i < blink.length; i++) {
      const { rate, phase, duty } = blink[i];
      leds.setColorAt(i, Math.sin(t * rate + phase) > 1 - duty * 2 ? LED_ON : LED_OFF);
    }
    leds.instanceColor.needsUpdate = true;
  }

  return { group, parts: { body, outline, plates, slats, leds }, update };
}
