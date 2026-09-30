// Renderer, cena e câmera lateral dinâmica (enquadra os dois, treme no impacto, close no ultimate).
import * as THREE from 'three';

export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 500);
    this.camera.position.set(0, 1.8, 11);
    this.cam = { x: 0, y: 1.8, z: 11, lookY: 1.15 };
    this.shakeAmt = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  shake(v) { this.shakeAmt = Math.min(0.6, Math.max(this.shakeAmt, v)); }

  updateCamera(match, dt) {
    const c = this.cam;
    let tx, ty, tz, lookY, lookX;
    if (match?.cinematic) {
      const f = match.cinematic.fighter;
      tx = f.x - f.facing * 0.2; ty = 1.0; tz = 4.2; lookX = f.x; lookY = 1.4;
    } else if (match) {
      const [a, b] = match.fighters;
      const mid = (a.x + b.x) / 2, sep = Math.abs(a.x - b.x);
      const halfTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const aspect = Math.max(this.camera.aspect, 0.9);
      tz = THREE.MathUtils.clamp((sep + 3.6) / (2 * halfTan * aspect), 6.5, 16);
      tx = mid; ty = 2.3 + (tz - 7) * 0.1; lookX = mid;
      lookY = 1.35 + Math.max(a.y, b.y) * 0.3;
      const ult = match.fighters.find((f) => f.state === 'ultimate');
      if (ult) tz *= 1.15;
    } else {
      tx = 0; ty = 1.9; tz = 12; lookX = 0; lookY = 1.3;
    }
    const k = Math.min(1, dt * (match?.cinematic ? 9 : 5));
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * k;
    c.lookY += (lookY - c.lookY) * k;
    c.lookX = (c.lookX ?? lookX) + (lookX - (c.lookX ?? lookX)) * k;
    const s = this.shakeAmt;
    this.camera.position.set(c.x + (Math.random() - 0.5) * s, c.y + (Math.random() - 0.5) * s, c.z);
    this.camera.lookAt(c.lookX, c.lookY, 0);
    this.shakeAmt = Math.max(0, s - dt * 2.2);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
