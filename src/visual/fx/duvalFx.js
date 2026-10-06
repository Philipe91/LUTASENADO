// VFX do AGENTE DUVALL (interface do SpecialFx: update(dt, f, model, sp) com sp = especial ativo ou null)
//   pendriveHand — pendrive na mão (LED piscando) até o frame do arremesso
//   tatica       — Operação Tática: rastro de sombras azuis durante o dash, poeira; arco de rasteira no golpe
// Visuais de Hitter: pendrive (voa girando com rastro de pixels; ao acertar explode em cubos ciano e sobe o letreiro
// glitchado "ARQUIVO CORROMPIDO"), vazamento (pasta CONFIDENCIAL abre no ar e os arquivos caem em sequência)
import * as THREE from 'three';
import { swapToGLB, PROP_GLB } from '../propModel.js';
import { Puffs, Rings, Shards, std, bodyPoint, canvasTex, textSprite, clamp01, easeOut, easeIn, add, flat } from './common.js';
import { makeGhost } from './cloneFx.js';

export const CYAN = 0x35c4ff, NAVY = 0x1f3a7a;

export function makePendrive(scale = 1.6) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.08), std(0x1f2430, { roughness: 0.35 }));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), std(0xb8bec8, { metalness: 0.85, roughness: 0.25 })); cap.position.x = 0.26;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.052), std(0x222222)); slot.position.x = 0.27;
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 2 })); led.position.set(-0.12, 0.08, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.082), std(CYAN, { emissive: 0x0a4a66 })); stripe.position.set(-0.05, 0, 0);
  g.add(body, cap, slot, led, stripe);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(scale);
  g.userData.led = led;
  swapToGLB(g, PROP_GLB.pendrive, { keep: [led] }); // LED continua emissivo procedural
  return g;
}

export function fileTexture(stamp = 'CONFIDENCIAL') {
  return canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#333'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#9aa3ad'; for (let y = 28; y < h - 20; y += 16) g.fillRect(16, y, w - 32 - (y % 32 ? 20 : 0), 6);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.4);
    g.strokeStyle = '#e0262b'; g.lineWidth = 5; g.strokeRect(-56, -16, 112, 32);
    g.fillStyle = '#e0262b'; g.font = 'bold 19px Impact, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(stamp, 0, 1);
    g.restore();
  });
}
let _fileTex = null;
export const fileTex = () => (_fileTex ||= fileTexture());

// letreiro glitchado: 2 cópias (ciano / vermelho) deslocadas + a principal por cima
export function glitchText(text, w = 2.2, h = 0.6) {
  const g = new THREE.Group();
  const a = textSprite(text, { color: '#35c4ff', stroke: '#35c4ff', w, h }), b = textSprite(text, { color: '#ff2a5a', stroke: '#ff2a5a', w, h }), c = textSprite(text, { color: '#fff', stroke: '#06121f', w, h });
  a.material.opacity = 0.7; b.material.opacity = 0.7; c.renderOrder = 9;
  g.add(a, b, c); g.visible = false;
  g.userData = { a, b, c };
  return g;
}
export function glitchUpdate(g, t, k = 1) {
  const u = g.userData, j = t % 3 === 0 ? 1 : 0.25;
  u.a.position.set((Math.random() - 0.5) * 0.12 * j, (Math.random() - 0.5) * 0.04 * j, 0);
  u.b.position.set((Math.random() - 0.5) * 0.12 * j, (Math.random() - 0.5) * 0.04 * j, 0);
  u.a.material.opacity = 0.7 * k; u.b.material.opacity = 0.7 * k; u.c.material.opacity = k;
}

class PendriveHandFx {
  constructor(scene) { this.scene = scene; this.v = new THREE.Vector3(); this.p = makePendrive(); this.p.visible = false; scene.add(this.p); }
  update(dt, f, model, sp) {
    this.p.visible = false;
    if (!sp || f.t >= sp.startup) return;
    bodyPoint(this.v, f, model, 'righthand', { dx: 0.3, y: f.stats.height * 0.6 });
    this.p.visible = true; this.p.position.copy(this.v); this.p.scale.setScalar(1.6 * clamp01(f.t / 3));
    this.p.rotation.set(0, 0, -f.facing * 0.6);
    this.p.userData.led.material.emissiveIntensity = f.t % 6 < 3 ? 2.5 : 0.3;
  }
  dispose() { this.scene.remove(this.p); }
}

class TaticaFx {
  constructor(scene) {
    this.scene = scene; this.ghosts = null; this.of = null;
    this.dust = new Puffs(scene, 10, 0xcdbda0, { opacity: 0.5 });
    this.arc = new Rings(scene, 2, CYAN, { inner: 0.75, outer: 0.95 });
    this.marks = []; this.swept = -1;
  }
  ensure(f) {
    if (this.of === f.data) return;
    if (this.ghosts) for (const g of this.ghosts) { this.scene.remove(g.object); g.dispose(); }
    this.of = f.data;
    this.ghosts = [0, 1, 2].map(() => { const g = makeGhost(f.data, { color: 0x1f3a7a, emissive: 0x2a8cff, opacity: 0.45, intensity: 0.5 }); g.object.visible = false; this.scene.add(g.object); return g; });
  }
  update(dt, f, model, sp) {
    this.dust.update(dt); this.arc.update(dt);
    if (!sp) { if (this.ghosts) for (const g of this.ghosts) g.object.visible = false; this.marks.length = 0; this.swept = -1; return; }
    this.ensure(f);
    const d = sp.dash, t = f.t;
    if (t >= d.from && t < d.to) {
      if (t % 3 === 0) { this.marks.unshift({ x: f.x, facing: f.facing, t }); if (this.marks.length > 3) this.marks.pop(); }
      if (t % 2 === 0) this.dust.burst(new THREE.Vector3(f.x - f.facing * 0.4, 0.12, 0.1), { count: 1, spread: 0.3, up: 0.8, speed: 0.6, size: 0.25, grow: 2.2, life: 0.35, z: 0 });
    }
    this.ghosts.forEach((g, i) => {
      const m = this.marks[i];
      const age = m ? t - m.t : 99;
      g.object.visible = !!m && age < 10;
      if (!g.object.visible) return;
      g.object.position.set(m.x, f.y, 0);
      g.object.rotation.y = m.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.mat.opacity = 0.45 * (1 - age / 10);
      g.model.play('dash', 0); g.model.update(dt);
    });
    if (t >= sp.startup && this.swept !== f.hitId) {
      this.swept = f.hitId;
      this.arc.spawn(f.x + f.facing * 0.5, 0.05, { from: 0.3, to: 2.2, life: 0.3, opacity: 0.9 });
      this.dust.burst(new THREE.Vector3(f.x + f.facing * 0.6, 0.1, 0.2), { count: 5, spread: 0.9, up: 1.2, speed: 1.6, size: 0.3, grow: 2.4, life: 0.4, z: 0 });
    }
  }
  dispose() { if (this.ghosts) for (const g of this.ghosts) { this.scene.remove(g.object); g.dispose(); } }
}

export const DUVAL_FX = { pendriveHand: PendriveHandFx, tatica: TaticaFx };

// ---------- visuais de Hitter ----------
export const DUVAL_VISUALS = {
  pendrive: {
    build() {
      const g = new THREE.Group();
      const p = makePendrive(); g.add(p);
      const trail = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), add(CYAN, 0.5 - i * 0.08)); m.visible = false; g.add(m); return m; });
      const rings = new Rings(g, 2, CYAN);
      const cubes = new Shards(g, 12, new THREE.BoxGeometry(0.09, 0.09, 0.09), new THREE.MeshStandardMaterial({ color: CYAN, emissive: 0x0a4a66, roughness: 0.3 }));
      const smoke = new Puffs(g, 6, 0x10203a, { opacity: 0.6 });
      const label = glitchText('ARQUIVO CORROMPIDO', 2.4, 0.62); g.add(label);
      g.userData = { p, trail, rings, cubes, smoke, label, hist: [], offY: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      if (u.lastId !== h.id) { u.lastId = h.id; u.hist.length = 0; u.boomed = false; u.label.visible = false; u.smoke.clear(); u.p.visible = true; u.p.scale.setScalar(1.6); }
      u.rings.update(dt); u.cubes.update(dt); u.smoke.update(dt);
      if (!h.spent) {
        u.p.rotation.z -= dt * 16 * h.facing;
        u.p.userData.led.material.emissiveIntensity = h.t % 4 < 2 ? 2.5 : 0.4;
        u.hist.unshift([h.x, h.y]); if (u.hist.length > 16) u.hist.pop();
        u.trail.forEach((m, i) => { const p = u.hist[Math.min(u.hist.length - 1, (i + 1) * 3)]; m.visible = u.hist.length > (i + 1) * 3; if (p) m.position.set(p[0] - h.x, p[1] - h.y, 0.1); });
        return;
      }
      for (const m of u.trail) m.visible = false;
      if (!u.boomed) { // IMPACTA: explode em cubos, anel, fumaça escura; letreiro glitchado sobe
        u.boomed = true; u.boomT = h.t;
        u.rings.spawn(0, 0, { flat: false, from: 0.2, to: 2.6, life: 0.35, opacity: 1, z: 0.3 });
        u.cubes.burst(new THREE.Vector3(0, 0, 0), { count: 12, speed: 3, up: 4, life: 0.6, size: 1, gravity: 10 });
        u.smoke.burst(new THREE.Vector3(0, 0.1, 0), { count: 5, spread: 0.8, up: 1.5, speed: 1.2, size: 0.4, grow: 2.4, life: 0.6 });
      }
      const age = h.t - u.boomT, left = h.delay + h.life - h.t;
      u.p.scale.setScalar(1.6 * Math.max(0.01, 1 - age / 4)); u.p.visible = age < 4;
      const k = Math.min(1, age / 3, left / 6);
      u.label.visible = k > 0.01;
      u.label.position.set(0, 0.9 + age * 0.02, 0.4); u.label.scale.setScalar(0.6 + 0.4 * easeOut(Math.min(1, age / 4)));
      glitchUpdate(u.label, h.t, Math.max(0, k));
    },
  },
  vazamento: {
    build() {
      const g = new THREE.Group();
      const lock = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.85, 40), flat(CYAN, 0, { side: THREE.DoubleSide })); lock.rotation.x = -Math.PI / 2; lock.position.y = 0.03;
      const folder = new THREE.Group();
      const fTex = canvasTex(256, 192, (c, w, h) => { c.fillStyle = '#f2c94c'; c.fillRect(0, 30, w, h - 30); c.fillRect(0, 10, w * 0.42, 30); c.fillStyle = '#d9a441'; c.fillRect(0, 60, w, h - 60); c.strokeStyle = '#333'; c.lineWidth = 6; c.strokeRect(3, 33, w - 6, h - 36); c.fillStyle = '#e0262b'; c.font = 'bold 34px Impact, Arial Black, sans-serif'; c.textAlign = 'center'; c.fillText('CONFIDENCIAL', w / 2, 130); });
      const fold = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), new THREE.MeshBasicMaterial({ map: fTex, transparent: true, side: THREE.DoubleSide })); folder.add(fold);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), add(CYAN, 0)); folder.add(glow);
      const files = [];
      const fMat = new THREE.MeshBasicMaterial({ map: fileTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false });
      const fGeo = new THREE.PlaneGeometry(0.42, 0.52);
      for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(fGeo, fMat); m.visible = false; g.add(m); files.push(m); }
      const dust = new Puffs(g, 10, 0xcdbda0, { opacity: 0.45 });
      const ring = new Rings(g, 1, CYAN);
      g.add(lock, folder);
      g.userData = { lock, folder, fold, glow, files, dust, ring, offY: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, D = h.delay, t = h.t, L = h.delay + h.life;
      if (u.lastId !== h.id) { u.lastId = h.id; u.opened = false; u.dust.clear(); for (const f of u.files) f.visible = false; }
      u.dust.update(dt); u.ring.update(dt);
      const pre = t < D, q = clamp01(t / D), end = clamp01((L - t) / 8);
      u.lock.material.opacity = (pre ? 0.9 * clamp01(t / 4) * (0.6 + 0.4 * Math.sin(t * 0.9)) : 0.35) * end;
      u.lock.scale.setScalar(pre ? 2.4 - q * 1.4 : 1.0);
      // pasta desce do alto, para a 3,2 m e abre
      const fy = pre ? 5.5 - easeOut(q) * 2.3 : 3.2;
      u.folder.position.set(0, fy, 0.2);
      u.folder.rotation.y = Math.sin(t * 0.15) * 0.3;
      u.folder.scale.setScalar(clamp01(t / 4) * end);
      u.glow.material.opacity = pre ? 0.15 + q * 0.3 : 0.5 * Math.abs(Math.sin(t * 0.8)) * end;
      if (!pre && !u.opened) { u.opened = true; u.ring.spawn(0, fy, { flat: false, from: 0.2, to: 2.4, life: 0.3, opacity: 0.9, z: 0.3 }); }
      u.fold.scale.y = pre ? 1 : 1 + 0.25 * Math.abs(Math.sin(t * 0.9));
      // arquivos caem em sequência (um a cada 4 frames), giram, pousam e somem no fim
      u.files.forEach((m, i) => {
        const t0 = D + i * 4, k = (t - t0) / 10;
        m.visible = k >= 0 && end > 0.01;
        if (!m.visible) return;
        const fall = Math.min(1, k), x = ((i * 0.618) % 1 - 0.5) * 1.1, z = ((i * 0.37) % 1 - 0.5) * 0.6;
        m.position.set(x, fall < 1 ? fy - 0.3 - easeIn(fall) * (fy - 0.3) : 0.03 + i * 0.004, z + 0.2);
        m.rotation.set(fall < 1 ? k * 4 : -Math.PI / 2, i * 0.7, fall < 1 ? k * 2 : i * 0.5);
        m.scale.setScalar(end);
        if (fall >= 1 && k < 1.12 && u[`land${i}`] !== h.id) { u[`land${i}`] = h.id; u.dust.burst(new THREE.Vector3(x, 0.1, z), { count: 1, spread: 0.3, up: 0.8, speed: 0.6, size: 0.22, grow: 2, life: 0.35, z: 0 }); }
      });
    },
  },
};
