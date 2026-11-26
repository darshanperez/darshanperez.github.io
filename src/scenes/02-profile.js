import * as THREE from 'three';
import { ease } from '../styles/tokens.js';

// Scene 2 — Profile: the photo as a 3D card that always faces the viewer and
// turns slowly on its Y axis as you scroll (never far enough to show its
// back). Slight mouse tilt on desktop only.

const SIZE = 2.2;
const TURN = 0.35; // radians each side of facing front

let texture;
let pivot; // layout + mouse tilt
let spinner; // scroll-driven turn
let material;

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
    material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, transparent: true, opacity: 0 });
    spinner = new THREE.Group();
    spinner.add(new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), material));
    spinner.rotation.y = -TURN;
    pivot = new THREE.Group();
    pivot.add(spinner);
    pivot.scale.setScalar(0);
    pivot.visible = false;
    ctx.act('profile').add(pivot);

    // Card left of the text on wide screens, above it on tall ones.
    ctx.onResize((w, h) => {
      const view = visibleSize(ctx.camera, w, h);
      const wide = w > h;
      pivot.position.set(wide ? -view.width * 0.2 : 0, wide ? 0 : view.height * 0.17, 0);
      pivot.userData.size = wide ? 1 : 0.75;
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
        pivot.rotation.y += (mouse.x * 0.15 - pivot.rotation.y) * k;
        pivot.rotation.x += (mouse.y * 0.1 - pivot.rotation.x) * k;
      });
    }
  },

  build(tl, ctx, { start, length }) {
    const at = (f) => start + length * f;
    const size = (f = 1) => () => pivot.userData.size * f;

    tl.set(pivot, { visible: true }, start)
      // Slow turn across the whole scene, photo always in front.
      .to(spinner.rotation, { y: TURN, duration: length, ease: ease.move.gsap }, start)
      // Zoom from nothing and fade in.
      .to(pivot.scale, { x: size(), y: size(), z: size(), duration: length * 0.4, ease: ease.enter.gsap }, start)
      .to(material, { opacity: 1, duration: length * 0.3, ease: ease.enter.gsap }, start)
      // Leave toward the camera, fading.
      .to(pivot.scale, { x: size(1.15), y: size(1.15), z: size(1.15), duration: length * 0.3, ease: ease.exit.gsap }, at(0.7))
      .to(material, { opacity: 0, duration: length * 0.3, ease: ease.exit.gsap }, at(0.7))
      .set(pivot, { visible: false }, start + length);

    ctx.cue(ctx.layer('profile').querySelector('.cue'), at(0.35), at(0.72));
  },
};
