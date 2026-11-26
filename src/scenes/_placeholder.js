import * as THREE from 'three';
import { colors, ease } from '../styles/tokens.js';

// Phase 1 stand-ins: a dark cube with iris edges. Replaced scene by scene
// with the real models in later phases.
const geometry = new THREE.BoxGeometry(1, 1, 1);
const edges = new THREE.EdgesGeometry(geometry);
const body = new THREE.MeshStandardMaterial({ color: colors.graphite, metalness: 0.2, roughness: 0.6 });
const line = new THREE.LineBasicMaterial({ color: colors.accentOnDark });

export function placeholderCube(ctx, { size = 1, x = 0, y = 0, z = 0 } = {}) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, body), new THREE.LineSegments(edges, line));
  group.position.set(x, y, z);
  group.scale.setScalar(0);
  group.userData.size = size;
  group.visible = false;
  ctx.scene.add(group);
  // Idle: slow rotation on the clock (linear is allowed for idle loops).
  const speed = 0.25 + Math.random() * 0.1;
  ctx.onTick((dt) => {
    group.rotation.y += dt * speed;
    group.rotation.x += dt * speed * 0.4;
  });
  return group;
}

/** Scrubbed "zoom from nothing" in, then out past the camera, within a slot. */
export function enterExit(tl, obj, { start, length }, { enter = 0.3, exit = 0.3 } = {}) {
  const s = obj.userData.size ?? 1;
  tl.set(obj, { visible: true }, start)
    .fromTo(obj.scale, { x: 0, y: 0, z: 0 }, { x: s, y: s, z: s, duration: length * enter, ease: ease.enter.gsap }, start)
    .to(obj.scale, { x: s * 1.6, y: s * 1.6, z: s * 1.6, duration: length * exit, ease: ease.exit.gsap }, start + length * (1 - exit))
    .to(obj.position, { z: obj.position.z + 4, duration: length * exit, ease: ease.exit.gsap }, start + length * (1 - exit))
    .set(obj, { visible: false }, start + length);
}
