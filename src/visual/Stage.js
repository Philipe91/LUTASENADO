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
      const aspect = this.camera.aspect; // aspect REAL (retrato ~0.5): travar em 0.9 cortava os lutadores
      const topY = Math.max(a.y, b.y) + 2.4;               // cabeça + salto
      const halfW = sep / 2 + 1.7;                         // corpo + margem de knockback
      const needX = halfW / (halfTan * aspect);
      const needY = (topY / 2 + 0.5) / halfTan;            // do chão até o topo, com folga
      tz = THREE.MathUtils.clamp(Math.max(needX, needY), 6.5, 40);
      tx = mid; lookX = mid;
      lookY = Math.min(topY / 2, 1.35 + Math.max(a.y, b.y) * 0.5);
      ty = lookY + Math.min(2.2, 0.9 + (tz - 7) * 0.06); // levemente acima, sem olhar muito de cima ao afastar
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
