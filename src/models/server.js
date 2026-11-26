import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colors } from '../styles/tokens.js';

// Procedural server rack (§6): rounded dark-metal cabinet, recessed front
// frame with an iris light strip, and a mix of bay types (1U compute with
// vents + LEDs, 2U storage with drive caddies), each with rounded handles.
// Same interface as a future .glb loader: create() → { group, parts, update }.
// All geometry is built once, up front.

export const DEFAULT_SIZE = { width: 1.2, height: 2.6, depth: 1.1 };

// Bay layout from top to bottom: 1 = 1U compute, 2 = 2U storage.
const BAYS = [1, 1, 2, 1, 2, 1, 1];
const SLATS = 7;
const DRIVES = 4;

const LED_ON = new THREE.Color(colors.accentOnDark);
const LED_OFF = new THREE.Color(colors.graphite);

const mat = {
  body: new THREE.MeshStandardMaterial({ color: colors.ink, metalness: 0.75, roughness: 0.32 }),
  frame: new THREE.MeshStandardMaterial({ color: colors.ink, metalness: 0.5, roughness: 0.55 }),
  plate: new THREE.MeshStandardMaterial({ color: colors.graphite, metalness: 0.55, roughness: 0.4 }),
  drive: new THREE.MeshStandardMaterial({ color: colors.ink, metalness: 0.4, roughness: 0.5 }),
  handle: new THREE.MeshStandardMaterial({ color: colors.grayOnLight, metalness: 0.85, roughness: 0.25 }),
  slat: new THREE.MeshBasicMaterial({ color: colors.ink }),
  strip: new THREE.MeshBasicMaterial({ color: colors.accentOnDark, toneMapped: false }),
  led: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
};

export function create({ width: W, height: H, depth: D } = DEFAULT_SIZE, { segments = 1 } = {}) {
  const seg = Math.max(2, Math.round(4 * segments));
  const group = new THREE.Group();

  // Cabinet + recessed front frame.
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, seg, Math.min(W, H) * 0.07), mat.body);
  const frameW = W * 0.9;
  const frameH = H * 0.95;
  const frame = new THREE.Mesh(new RoundedBoxGeometry(frameW, frameH, 0.04, seg, 0.03), mat.frame);
  frame.position.z = D / 2 + 0.005;
  // Iris light strip down the left side of the frame ("lit edges").
  const strip = new THREE.Mesh(new RoundedBoxGeometry(0.018, frameH * 0.92, 0.012, 2, 0.006), mat.strip);
  strip.position.set(-frameW / 2 + 0.035, 0, D / 2 + 0.03);

  // Bays.
  const units = BAYS.reduce((a, b) => a + b, 0);
  const unitH = (frameH * 0.94) / units;
  const plateW = frameW * 0.84;
  const front = D / 2 + 0.03;
  const counts = { compute: BAYS.filter((b) => b === 1).length, storage: BAYS.filter((b) => b === 2).length };

  const plateGeo = (u) => new RoundedBoxGeometry(plateW, unitH * u * 0.84, 0.05, 2, 0.018);
  const plates1 = new THREE.InstancedMesh(plateGeo(1), mat.plate, counts.compute);
  const plates2 = new THREE.InstancedMesh(plateGeo(2), mat.plate, counts.storage);
  const slats = new THREE.InstancedMesh(new RoundedBoxGeometry(0.014, unitH * 0.42, 0.012, 1, 0.005), mat.slat, counts.compute * SLATS);
  const drives = new THREE.InstancedMesh(
    new RoundedBoxGeometry((plateW * 0.62) / DRIVES - 0.02, unitH * 2 * 0.62, 0.02, 2, 0.012),
    mat.drive,
    counts.storage * DRIVES,
  );
  const handles = new THREE.InstancedMesh(new RoundedBoxGeometry(0.035, unitH * 0.55, 0.05, 2, 0.012), mat.handle, BAYS.length * 2);
  const ledCount = counts.compute * 2 + counts.storage * DRIVES;
  const leds = new THREE.InstancedMesh(new THREE.CircleGeometry(0.018, 12), mat.led, ledCount);

  const m = new THREE.Matrix4();
  const blink = [];
  const addLed = (x, y) => {
    const i = blink.length;
    leds.setMatrixAt(i, m.makeTranslation(x, y, front + 0.028));
    leds.setColorAt(i, LED_OFF);
    blink.push({ rate: 0.6 + Math.random() * 2.4, phase: Math.random() * Math.PI * 2, duty: 0.2 + Math.random() * 0.5 });
  };

  let top = (frameH * 0.94) / 2;
  const n = { compute: 0, storage: 0, handle: 0 };
  for (const u of BAYS) {
    const y = top - (unitH * u) / 2;
    top -= unitH * u;
    for (const side of [-1, 1]) handles.setMatrixAt(n.handle++, m.makeTranslation(side * (plateW / 2 - 0.04), y, front + 0.035));
    if (u === 1) {
      const i = n.compute++;
      plates1.setMatrixAt(i, m.makeTranslation(0, y, front));
      for (let s = 0; s < SLATS; s++) {
        slats.setMatrixAt(i * SLATS + s, m.makeTranslation(plateW * 0.08 + s * 0.04, y, front + 0.028));
      }
      addLed(-plateW * 0.3, y);
      addLed(-plateW * 0.3 + 0.06, y);
    } else {
      const i = n.storage++;
      plates2.setMatrixAt(i, m.makeTranslation(0, y, front));
      const cell = (plateW * 0.62) / DRIVES;
      for (let d = 0; d < DRIVES; d++) {
        const x = -plateW * 0.31 + cell * (d + 0.5);
        drives.setMatrixAt(i * DRIVES + d, m.makeTranslation(x, y, front + 0.03));
        addLed(x, y - unitH * 0.75);
      }
    }
  }

  group.add(body, frame, strip, plates1, plates2, slats, drives, handles, leds);

  /** Idle LED blinking, driven by elapsed time (seconds). */
  function update(t) {
    for (let i = 0; i < blink.length; i++) {
      const { rate, phase, duty } = blink[i];
      leds.setColorAt(i, Math.sin(t * rate + phase) > 1 - duty * 2 ? LED_ON : LED_OFF);
    }
    leds.instanceColor.needsUpdate = true;
  }

  return { group, parts: { body, frame, strip, leds }, update, size: { width: W, height: H, depth: D } };
}
