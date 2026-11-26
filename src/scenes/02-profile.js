import * as THREE from 'three';
import { colors, ease } from '../styles/tokens.js';

// Scene 2 — Profile: the photo as a 3D card that turns on its Y axis, showing
// a dark back with an iris frame. Slight mouse tilt on desktop only.

const SIZE = 2.2;
let texture;
let pivot; // layout + mouse tilt
let spinner; // scroll-driven turn
const fade = { opacity: 1 };
const materials = [];

function visibleSize(camera, w, h) {
  const height = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return { width: height * (w / h), height };
}

export default {
  id: 'profile',
  scrollLength: 1.5,

  async load(ctx) {
    texture = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}media/profile.webp`);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  },

  init(ctx) {
    const plane = new THREE.PlaneGeometry(SIZE, SIZE);
    const frontMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, transparent: true });
    const backMat = new THREE.MeshStandardMaterial({ color: colors.graphite, metalness: 0.6, roughness: 0.4, transparent: true });
    const frameMat = new THREE.LineBasicMaterial({ color: colors.accentOnDark, transparent: true, toneMapped: false });
    materials.push(frontMat, backMat, frameMat);

    const front = new THREE.Mesh(plane, frontMat);
    const back = new THREE.Mesh(plane, backMat);
    back.rotation.y = Math.PI;
    back.position.z = -0.01;
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(SIZE * 0.86, SIZE * 0.86)), frameMat);
    frame.rotation.y = Math.PI;
    frame.position.z = -0.02;

    spinner = new THREE.Group();
    spinner.add(front, back, frame);
    spinner.rotation.y = -Math.PI; // enters showing its back
    pivot = new THREE.Group();
    pivot.add(spinner);
    pivot.scale.setScalar(0);
    pivot.visible = false;
    ctx.act('profile').add(pivot);

    // Card left of the text on wide screens, above it on tall ones.
    const layout = { x: 0, y: 0, s: 1 };
    ctx.onResize((w, h) => {
      const view = visibleSize(ctx.camera, w, h);
      Object.assign(layout, w > h ? { x: -view.width * 0.2, y: 0, s: 1 } : { x: 0, y: view.height * 0.17, s: 0.75 });
      pivot.position.set(layout.x, layout.y, 0);
      pivot.userData.size = layout.s;
    });

    if (!ctx.quality.mobile) {
      const mouse = { x: 0, y: 0 };
      window.addEventListener('pointermove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      });
      ctx.onTick((dt) => {
        if (!pivot.visible) return;
        const k = 1 - Math.pow(1 - 0.08, dt * 60); // frame-rate independent lerp
        pivot.rotation.y += (mouse.x * 0.18 - pivot.rotation.y) * k;
        pivot.rotation.x += (mouse.y * 0.12 - pivot.rotation.x) * k;
      });
    }
  },

  build(tl, ctx, { start, length }) {
    const at = (f) => start + length * f;
    const size = () => pivot.userData.size;
    const applyFade = () => materials.forEach((m) => (m.opacity = fade.opacity));

    tl.set(pivot, { visible: true }, start)
      // Zoom from nothing while turning from its back to the photo.
      .to(pivot.scale, { x: size, y: size, z: size, duration: length * 0.4, ease: ease.enter.gsap }, start)
      .to(spinner.rotation, { y: 0, duration: length * 0.45, ease: ease.move.gsap }, start)
      // Drift while the text is on screen.
      .to(spinner.rotation, { y: 0.2, duration: length * 0.25, ease: ease.move.gsap }, at(0.45))
      // Leave: keep turning, grow toward the camera, fade.
      .to(spinner.rotation, { y: Math.PI * 0.6, duration: length * 0.3, ease: ease.exit.gsap }, at(0.7))
      .to(pivot.scale, { x: () => size() * 1.15, y: () => size() * 1.15, z: () => size() * 1.15, duration: length * 0.3, ease: ease.exit.gsap }, at(0.7))
      .to(fade, { opacity: 0, duration: length * 0.3, ease: ease.exit.gsap, onUpdate: applyFade }, at(0.7))
      .set(pivot, { visible: false }, start + length);

    ctx.cue(ctx.layer('profile').querySelector('.cue'), at(0.35), at(0.72));
  },
};
