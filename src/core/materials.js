import * as THREE from 'three';
import { colors } from '../styles/tokens.js';

// Shared 3D materials, by role. Models only ask for a role here and never
// build their own materials, so the SFX phase (§15, phase 7) can upgrade the
// whole look (HDRI reflections, real glass, emissive bloom…) in one place.
export const materials = {
  /** Glossy black shell, like a phone's body. */
  shell: new THREE.MeshPhysicalMaterial({ color: colors.ink, metalness: 0.6, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
  /** Dark tinted glass front; what's behind it stays visible. */
  glass: new THREE.MeshPhysicalMaterial({ color: colors.ink, roughness: 0.05, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 0.4, depthWrite: false }),
  /** Internal hardware: matte dark gray. */
  hardware: new THREE.MeshStandardMaterial({ color: colors.graphite, metalness: 0.2, roughness: 0.7 }),
  /** Slots, vents and gaps. */
  recess: new THREE.MeshBasicMaterial({ color: colors.ink }),
  /** Status lights; per-instance colors, unaffected by tone mapping. */
  led: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
};

export const ledColors = {
  on: new THREE.Color(colors.accentOnDark),
  idle: new THREE.Color(colors.mist),
  off: new THREE.Color(colors.graphite),
};
