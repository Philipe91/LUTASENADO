// VFX da DILMA (interface do SpecialFx: update(dt, f, model, sp) com sp = especial ativo ou null)
//   potVento — Estocar Vento: pote de vidro nas mãos; enquanto ela segura (f.charged) o vento gira e é sugado pra
//              dentro do pote; no disparo a tampa salta e um anel de vento abre (a rajada em si é o Hitter)
//   pedalada — Pedalada Fiscal: bicicleta embaixo dela (rodas girando) + boletos/notas voando atrás
//   visuais de Hitter: ventoEstocado (redemoinho que cresce com a carga), mandioca (gira; bumerangue)
// Cores: vermelho do terninho 0xc81e1e, vento azul-claro 0xbfe8ff, mandioca 0xb07a3c (ARTE.md: energia = aditivo).
import * as THREE from 'three';
import { Puffs, Rings, Shards, std, clamp01, easeOut, add, flat, bodyPoint, textSprite } from './common.js';

export const DILMA_RED = 0xc81e1e, WIND = 0xbfe8ff, MANDIOCA = 0xb07a3c;

export function makeMandioca(scale = 1) {
  const g = new THREE.Group();
  const root = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.035, 0.95, 12), std(0x8a5a2b, { roughness: 0.95 }));
  root.rotation.z = Math.PI / 2; root.castShadow = true;
  const cut = new THREE.Mesh(new THREE.CircleGeometry(0.115, 14), std(0xf6efd8, { roughness: 0.8 }));
  cut.rotation.y = -Math.PI / 2; cut.position.x = -0.476;
  const rings = [-0.2, 0.05, 0.25].map((x) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.1 - x * 0.08, 0.012, 5, 14), std(0x5a3818)); r.rotation.y = Math.PI / 2; r.position.x = x; return r; });
  const leaves = [-0.5, 0, 0.5].map((a) => { const l = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.32, 5), std(0x3f9a3a)); l.position.set(-0.6, 0.06 * Math.sin(a * 3), 0); l.rotation.z = Math.PI / 2 + a; return l; });
  const spin = new THREE.Group(); spin.add(root, cut, ...rings, ...leaves);
  g.add(spin); g.userData.spin = spin; g.scale.setScalar(scale);
  return g;
}

// pote de vidro com tampa (Estocar Vento)
function makePot() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.36, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.15, 18), flat(0xbfe8ff, 0.5, { side: THREE.DoubleSide })); base.rotation.x = -Math.PI / 2; base.position.y = -0.18;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.06, 18), std(DILMA_RED, { roughness: 0.4 })); lid.position.y = 0.21;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ map: labelTex(), transparent: true })); label.position.set(0, 0, 0.165);
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 20, Math.PI * 1.6), add(WIND, 0.8));
  g.add(glass, base, lid, label, swirl); g.userData = { lid, swirl };
  return g;
}
let _label = null;
function labelTex() {
  if (_label) return _label;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#fff8e6'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#c81e1e'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120);
  x.font = 'bold 54px Bangers, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#c81e1e'; x.fillText('VENTO', 128, 66);
  _label = new THREE.CanvasTexture(c); _label.colorSpace = THREE.SRGBColorSpace;
  return _label;
}

// arco de vento (meia volta de anel aditivo) — usado no pote e na rajada
const windArc = (r, c = WIND, op = 0.85) => new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 6, 28, Math.PI * 1.3), add(c, op));

// ---------------- ESTOCAR VENTO: pote + vento sugado durante a carga ----------------
class PotVentoFx {
  constructor(scene) {
    this.scene = scene; this.v = new THREE.Vector3();
    this.pot = makePot(); this.pot.visible = false; scene.add(this.pot);
    this.arcs = Array.from({ length: 4 }, (_, i) => { const m = windArc(0.5 + i * 0.12, i % 2 ? 0xffffff : WIND, 0); m.visible = false; scene.add(m); return m; });
    this.ring = new Rings(scene, 2, WIND);
    this.label = textSprite('ESTOCANDO...', { color: '#bfe8ff', w: 1.3, h: 0.43 }); this.label.visible = false; scene.add(this.label);
    this.fired = -1;
  }
  update(dt, f, model, sp) {
    this.ring.update(dt);
    this.pot.visible = false; this.label.visible = false; for (const a of this.arcs) a.visible = false;
    if (!sp) { this.fired = -1; return; }
    const end = sp.startup + 10;
    if (f.t > end) return;
    bodyPoint(this.v, f, model, 'righthand', { dx: 0.35, y: f.stats.height * 0.55 });
    const now = performance.now() / 1000, q = clamp01(f.charged / (sp.charge?.max || 1));
    this.pot.visible = true;
    this.pot.position.set(this.v.x + f.facing * 0.05, this.v.y + 0.05, 0.35);
    this.pot.scale.setScalar(1.3 * Math.min(1, f.t / 4) * (1 + q * 0.25));
    const u = this.pot.userData;
    u.swirl.rotation.z = now * (8 + q * 18); u.swirl.scale.setScalar(0.6 + q * 0.8 + 0.1 * Math.sin(now * 20));
    const opened = f.t >= sp.startup;
    u.lid.position.y = opened ? 0.21 + easeOut((f.t - sp.startup) / 6) * 0.45 : 0.21;
    u.lid.rotation.z = opened ? (f.t - sp.startup) * 0.4 * f.facing : 0;
    // vento girando em volta e sendo sugado (encolhe na direção do pote) enquanto carrega
    if (!opened) {
      const k = 0.35 + q * 0.65;
      this.arcs.forEach((a, i) => {
        const ph = ((now * (1.4 + q * 2) + i * 0.25) % 1);
        a.visible = true; a.position.copy(this.pot.position);
        a.rotation.set(0.3, 0, now * (6 + i * 2) * (i % 2 ? -1 : 1));
        a.scale.setScalar((1.6 - ph * 1.4) * (0.6 + q * 0.6)); a.material.opacity = 0.8 * k * Math.sin(ph * Math.PI);
      });
      if (f.charged > 6) {
        this.label.visible = true; this.label.position.set(f.x, f.y + f.stats.height + 0.75, 0.5);
        const s = 1 + q * 0.35 + 0.05 * Math.sin(now * 16); this.label.scale.set(1.3 * s, 0.43 * s, 1);
      }
    } else if (this.fired !== f.hitId) {
      this.fired = f.hitId;
      this.ring.spawn(this.pot.position.x + f.facing * 0.3, this.pot.position.y, { flat: false, from: 0.2, to: 1.6 + q * 1.4, life: 0.3, opacity: 0.9, z: 0.45 });
    }
  }
  dispose() { this.scene.remove(this.pot, this.label, ...this.arcs); }
}

// ---------------- PEDALADA FISCAL: bicicleta + boletos voando ----------------
function makeBike() {
  const g = new THREE.Group();
  const dark = std(0x1a1a1a, { metalness: 0.4, roughness: 0.4 }), red = std(DILMA_RED, { roughness: 0.35 });
  const wheels = [-0.45, 0.45].map((x) => {
    const w = new THREE.Group(); w.position.set(x, 0.32, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 26), dark);
    for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.015), std(0xcccccc, { metalness: 0.8 })); sp.rotation.z = (i * Math.PI) / 3; w.add(sp); }
    w.add(tire); g.add(w); return w;
  });
  const bar = (len, x, y, rz) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), red); b.position.set(x, y, 0); b.rotation.z = rz; g.add(b); return b; };
  bar(0.75, 0, 0.62, Math.PI / 2); bar(0.5, -0.18, 0.48, 0.9); bar(0.5, 0.2, 0.48, -0.75); bar(0.42, 0.42, 0.68, 0.25);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), dark); seat.position.set(-0.22, 0.78, 0); g.add(seat);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), dark); handle.rotation.x = Math.PI / 2; handle.position.set(0.47, 0.88, 0); g.add(handle);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.26), std(0xb07a3c, { roughness: 1 })); basket.position.set(0.62, 0.78, 0); g.add(basket);
  for (const m of g.children) m.castShadow = true;
  g.userData.wheels = wheels;
  return g;
}
class PedaladaFx {
  constructor(scene) {
    this.scene = scene;
    this.bike = makeBike(); this.bike.visible = false; scene.add(this.bike);
    const paper = new THREE.PlaneGeometry(0.22, 0.12);
    this.notes = new Shards(scene, 14, paper, new THREE.MeshBasicMaterial({ color: 0x8fd18a, side: THREE.DoubleSide }));
    this.bills = new Shards(scene, 10, paper, new THREE.MeshBasicMaterial({ color: 0xfff8e6, side: THREE.DoubleSide }));
    this.dust = new Puffs(scene, 8, 0xd8c8a8, { opacity: 0.5 });
    this.last = -1;
  }
  update(dt, f, model, sp) {
    this.notes.update(dt); this.bills.update(dt); this.dust.update(dt);
    const on = sp && f.t >= sp.startup - 4 && f.t < sp.startup + sp.active + 4;
    this.bike.visible = !!on;
    if (!on) return;
    const k = Math.min(1, (f.t - sp.startup + 4) / 4, (sp.startup + sp.active + 4 - f.t) / 4);
    this.bike.position.set(f.x + f.facing * 0.1, 0, 0.05);
    this.bike.rotation.y = f.facing > 0 ? 0 : Math.PI;
    this.bike.scale.setScalar(Math.max(0.01, k));
    for (const w of this.bike.userData.wheels) w.rotation.z -= dt * 22;
    if (f.t !== this.last && f.t % 3 === 0) {
      this.last = f.t;
      const at = new THREE.Vector3(f.x - f.facing * 0.5, 0.9, 0.2);
      this.notes.burst(at, { count: 2, speed: 1.4, up: 2.5, life: 0.9, size: 1, gravity: 3, dirX: -f.facing });
      this.bills.burst(at, { count: 1, speed: 1.2, up: 2.2, life: 0.9, size: 1, gravity: 3, dirX: -f.facing });
      this.dust.burst(new THREE.Vector3(f.x - f.facing * 0.5, 0.1, 0.1), { count: 1, spread: 0.3, up: 0.6, speed: 1, size: 0.25, grow: 2, life: 0.4, z: 0 });
    }
  }
  dispose() { this.scene.remove(this.bike); }
}

export const DILMA_FX = { potVento: PotVentoFx, pedalada: PedaladaFx };

// ---------------- visuais de Hitter ----------------
export const DILMA_VISUALS = {
  // rajada de vento estocado: 3 arcos + espiral girando; tamanho acompanha a caixa (carga → maior)
  ventoEstocado: {
    build() {
      const g = new THREE.Group();
      const arcs = [0.42, 0.32, 0.22].map((r, i) => { const m = windArc(r, i === 1 ? 0xffffff : WIND, 0.85); m.position.x = -i * 0.12; g.add(m); return m; });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), add(0xe8f8ff, 0.35)); g.add(core);
      const streaks = Array.from({ length: 5 }, (_, i) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.03), add(0xffffff, 0.7)); s.position.set(-0.4 - i * 0.08, (i - 2) * 0.16, 0.1); g.add(s); return s; });
      g.userData = { arcs, core, streaks, center: true };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, now = performance.now() / 1000;
      const base = h.w / 0.75, k = Math.min(clamp01(h.t / 4), clamp01((h.delay + h.life - h.t) / 8)) * (h.spent ? 0 : 1);
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      v.scale.setScalar(Math.max(0.01, (0.55 + base * 0.45) * k));
      u.arcs.forEach((a, i) => { a.rotation.z = now * (10 + i * 4) * (i % 2 ? -1 : 1); a.material.opacity = 0.85 * k; });
      u.core.material.opacity = 0.35 * k;
      u.streaks.forEach((s, i) => { s.position.x = -0.4 - ((now * 3 + i * 0.2) % 0.6); s.material.opacity = 0.6 * k; });
    },
  },
  mandioca: {
    build() { const g = makeMandioca(1); g.userData.center = true; return g; },
    animate(v, h, dt) { v.userData.spin.rotation.z += dt * 16 * h.facing; v.visible = !h.spent; },
  },
};
