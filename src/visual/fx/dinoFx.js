// VFX presos ao corpo do DINO SUPREMO (interface do SpecialFx: update(dt, f, model, sp) com sp = especial ativo ou null)
//   roar    — Rugido Togado: a BOCA abre absurdamente (sprite gigante na frente da cabeça), ondas de choque (arcos
//             duplos, claro + contorno escuro) correm pelo cone do golpe, poeira e pedrinhas voam do chão
//   throwUp — Meteoro Didático: o VADE MECUM fica na mão e, no frame de spawn, é arremessado para o CÉU girando
//             (o meteoro que cai é o visual 'meteor' do Hitter)
//   stomp   — Pisão Cretáceo: no frame da pisada, anel de choque, rachadura e poeira sob o pé
import * as THREE from 'three';
import { Puffs, Rings, Shards, std, bodyPoint, canvasTex, clamp01, easeOut, easeIn, add, flat } from './common.js';

function mouthTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.translate(w / 2, h / 2);
    g.fillStyle = '#5a0f12'; g.strokeStyle = '#111'; g.lineWidth = 10;
    g.beginPath(); g.ellipse(0, 0, 112, 118, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#d04a6a'; g.beginPath(); g.ellipse(0, 70, 58, 34, 0, 0, Math.PI * 2); g.fill(); // língua
    g.fillStyle = '#c0304a'; g.beginPath(); g.ellipse(0, -30, 14, 22, 0, 0, Math.PI * 2); g.fill(); // úvula
    g.fillStyle = '#fff'; g.strokeStyle = '#222'; g.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { // dentes de cima (triângulos) e de baixo (quadrados)
      const x = i * 30;
      g.beginPath(); g.moveTo(x - 14, -108); g.lineTo(x + 14, -108); g.lineTo(x, -70); g.closePath(); g.fill(); g.stroke();
      g.fillRect(x - 11, 90, 22, 22); g.strokeRect(x - 11, 90, 22, 22);
    }
  });
}
function crackTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; g.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      g.beginPath(); g.moveTo(w / 2, h / 2);
      let x = w / 2, y = h / 2; const a = (k / 5) * Math.PI * 2 + 0.3;
      for (let s = 0; s < 4; s++) { x += Math.cos(a + (Math.random() - 0.5)) * 26; y += Math.sin(a + (Math.random() - 0.5)) * 14; g.lineTo(x, y); }
      g.stroke();
    }
  });
}

class RoarFx {
  constructor(scene) {
    this.scene = scene; this.head = new THREE.Vector3();
    this.mouth = new THREE.Sprite(new THREE.SpriteMaterial({ map: mouthTexture(), transparent: true, depthWrite: false }));
    this.mouth.visible = false; this.mouth.renderOrder = 6; scene.add(this.mouth);
    // 4 ondas: arco claro (aditivo) + contorno escuro atrás (pra ler no chão claro)
    this.waves = Array.from({ length: 4 }, () => {
      const g = new THREE.Group();
      const dark = new THREE.Mesh(new THREE.RingGeometry(0.78, 1.0, 40, 1, -Math.PI / 2.4, Math.PI / 1.2), flat(0x3a2a10, 0.55, { side: THREE.DoubleSide }));
      const light = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.96, 40, 1, -Math.PI / 2.4, Math.PI / 1.2), add(0xffe08a, 0.9));
      light.position.z = 0.01; g.add(dark, light); g.visible = false; scene.add(g);
      return { g, dark, light, born: -1 };
    });
    this.dust = new Puffs(scene, 12, 0xd8c8a8, { opacity: 0.5 });
    this.pebbles = new Shards(scene, 14, new THREE.DodecahedronGeometry(0.07, 0), std(0x8a7a60));
    this.lastWave = -1; this.open = 0;
  }
  update(dt, f, model, sp) {
    this.dust.update(dt); this.pebbles.update(dt);
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const t0 = sp?.startup ?? 14, t1 = sp ? sp.startup + sp.active : 0;
    const want = !sp ? 0 : f.t < t0 ? easeIn(f.t / t0) : f.t < t1 ? 1 : clamp01(1 - (f.t - t1) / 6);
    this.open += (want - this.open) * Math.min(1, dt * 20);
    this.mouth.visible = this.open > 0.02;
    if (this.mouth.visible) {
      const s = 0.25 + this.open * 1.45;
      this.mouth.scale.set(s, s * 1.05, 1);
      this.mouth.position.set(this.head.x + f.facing * (0.15 + this.open * 0.35), this.head.y - 0.1 - this.open * 0.35, 0.55);
      this.mouth.material.rotation = f.facing * (Math.sin(f.t * 1.4) * 0.05);
    }
    if (!sp) { this.lastWave = -1; }
    const active = sp && f.t >= t0 && f.t < t1;
    const reach = (sp?.box?.x ?? -0.2) + (sp?.box?.w ?? 2.4);
    if (active && f.t !== this.lastWave && (f.t - t0) % 3 === 0) {
      this.lastWave = f.t;
      const w = this.waves.find((q) => q.born < 0) || this.waves[0];
      w.born = f.t; w.g.visible = true;
      this.dust.burst(new THREE.Vector3(f.x + f.facing * (0.6 + Math.random() * reach * 0.6), 0.15, 0.3), { count: 2, spread: 0.6, up: 1.5, speed: 1.4, size: 0.3, grow: 2.4, life: 0.5, z: 0 });
      this.pebbles.burst(new THREE.Vector3(f.x + f.facing * (0.5 + Math.random() * reach * 0.5), 0.1, 0.2), { count: 3, speed: 2, up: 3.5, life: 0.7, dirX: f.facing });
    }
    for (const w of this.waves) {
      if (w.born < 0) continue;
      const age = f.t - w.born;
      if (!sp || age > 14) { w.born = -1; w.g.visible = false; continue; }
      const q = age / 14;
      w.g.position.set(this.head.x + f.facing * (0.3 + q * reach), this.head.y - 0.35 - q * 0.3, 0.4);
      w.g.rotation.set(0, 0, f.facing > 0 ? 0 : Math.PI);
      w.g.scale.setScalar(0.5 + q * 2.0);
      w.light.material.opacity = 0.95 * (1 - q); w.dark.material.opacity = 0.55 * (1 - q);
    }
  }
  dispose() { this.scene.remove(this.mouth, ...this.waves.map((w) => w.g)); }
}

export function makeVadeMecum() {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.46), std(0x5a2d12, { roughness: 0.6 }));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.44), std(0xf2e8cc)); pages.position.x = 0.04;
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.48), std(0x3a1a08)); spine.position.x = -0.3;
  const title = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.26), new THREE.MeshStandardMaterial({ map: canvasTex(256, 160, (c, w, h) => {
    c.fillStyle = '#5a2d12'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d4af37'; c.lineWidth = 8; c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = '#d4af37'; c.font = 'bold 40px Georgia, serif'; c.textAlign = 'center'; c.fillText('VADE', w / 2, 60); c.fillText('MECUM', w / 2, 104); c.font = 'bold 22px Georgia, serif'; c.fillText('JURÁSSICO', w / 2, 136);
  }) })); title.rotation.x = -Math.PI / 2; title.position.set(0.02, 0.145, 0);
  for (const s of [-1, 1]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.05, 0.47), std(0xd4af37, { metalness: 0.7, roughness: 0.3 })); band.position.set(0, s * 0.1, 0); g.add(band); }
  g.add(cover, pages, spine, title);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

class ThrowUpFx {
  constructor(scene) {
    this.scene = scene; this.hand = new THREE.Vector3(); this.from = new THREE.Vector3();
    this.book = makeVadeMecum(); this.book.visible = false; scene.add(this.book);
    this.trail = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), add(0xffc070, 0.5)); m.visible = false; scene.add(m); return m; });
  }
  update(dt, f, model, sp) {
    this.book.visible = false; for (const t of this.trail) t.visible = false;
    if (!sp || f.t > sp.startup + 14) return;
    bodyPoint(this.hand, f, model, 'righthand', { dx: 0.35, y: f.stats.height * 0.62 });
    this.book.visible = true;
    if (f.t < sp.startup) { // na mão, erguendo pra jogar
      this.from.copy(this.hand);
      const q = clamp01(f.t / sp.startup);
      this.book.position.set(this.hand.x - f.facing * 0.1 * q, this.hand.y + q * 0.7, this.hand.z + 0.15);
      this.book.rotation.set(0, 0, -f.facing * q * 0.8); this.book.scale.setScalar(1);
      return;
    }
    const q = (f.t - sp.startup) / 14; // voa pro céu girando e some lá em cima
    this.book.position.set(this.from.x + f.facing * q * 1.4, this.from.y + 0.7 + easeOut(q) * 7.5, this.from.z + 0.15);
    this.book.rotation.set(0, 0, -f.facing * (0.8 + q * 9)); this.book.scale.setScalar(1 - q * 0.5);
    this.trail.forEach((t, i) => { const qq = Math.max(0, q - (i + 1) * 0.06); t.visible = qq > 0; t.position.set(this.from.x + f.facing * qq * 1.4, this.from.y + 0.7 + easeOut(qq) * 7.5, this.from.z + 0.1); t.material.opacity = 0.45 - i * 0.1; });
  }
  dispose() { this.scene.remove(this.book, ...this.trail); }
}

class StompFx {
  constructor(scene) {
    this.scene = scene;
    this.rings = new Rings(scene, 3, 0xd8b070, { additive: false, inner: 0.7, outer: 0.85 });
    this.dust = new Puffs(scene, 10, 0xcdbda0, { opacity: 0.55 });
    this.pebbles = new Shards(scene, 10, new THREE.DodecahedronGeometry(0.08, 0), std(0x8a7a60));
    this.crack = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, opacity: 0, depthWrite: false }));
    this.crack.rotation.x = -Math.PI / 2; this.crack.position.y = 0.02; this.crack.visible = false; scene.add(this.crack);
    this.fired = -1; this.crackT = -1;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt); this.dust.update(dt); this.pebbles.update(dt);
    if (this.crackT >= 0) { this.crackT += dt; this.crack.material.opacity = 0.85 * (1 - clamp01(this.crackT / 0.9)); if (this.crackT > 0.9) { this.crackT = -1; this.crack.visible = false; } }
    if (!sp) { this.fired = -1; return; }
    if (f.t >= sp.startup && this.fired !== f.hitId) {
      this.fired = f.hitId;
      const x = f.x + f.facing * 0.35;
      this.rings.spawn(x, 0.04, { from: 0.3, to: 2.6, life: 0.4, opacity: 0.9 });
      this.dust.burst(new THREE.Vector3(x, 0.15, 0.2), { count: 8, spread: 1.2, up: 1.6, speed: 2.2, size: 0.35, grow: 2.4, life: 0.5, z: 0 });
      this.pebbles.burst(new THREE.Vector3(x, 0.1, 0.2), { count: 8, speed: 2.5, up: 4, life: 0.8, dirX: f.facing });
      this.crack.visible = true; this.crack.position.set(x, 0.02, 0.1); this.crack.rotation.z = f.facing > 0 ? 0 : Math.PI; this.crackT = 0;
    }
  }
  dispose() { this.scene.remove(this.crack); }
}

export const DINO_FX = { roar: RoarFx, throwUp: ThrowUpFx, stomp: StompFx };
