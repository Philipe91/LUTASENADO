// VFX do FLAVÃO (interface do SpecialFx: update(dt, f, model, sp) com sp = especial ativo ou null)
//   rachadinha — pisão: alvo escuro cresce sob o pé na antecipação; na pisada anel, poeira, pedrinhas (a rachadura
//                que corre é o visual 'crack' do Hitter; a explosão é o 'eruption')
//   zeroUm     — dígitos "0" e "1" holográficos giram em volta do punho na antecipação; anel vertical onde o clone nasce
//   cadeira    — cadeira institucional com rodinhas nasce embaixo dele, ele senta (corpo sobe) e atravessa a arena;
//                faíscas nas rodinhas, linhas de velocidade; no fim a cadeira segue sozinha, tomba e some
// Visuais de Hitter: crack (rachadura correndo pelo chão) e eruption (chão explode em coluna de pedras)
import * as THREE from 'three';
import { Puffs, Rings, Shards, std, bodyPoint, canvasTex, textSprite, clamp01, easeOut, easeIn, smooth, add, flat } from './common.js';

const AMBER = 0xd9a441, EARTH = 0x7a5a3a, HOLO = 0x8cff9a;

export function crackTexture() {
  return canvasTex(512, 128, (g, w, h) => {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = () => { g.beginPath(); g.moveTo(0, h / 2); for (let x = 0; x <= w; x += 32) g.lineTo(x, h / 2 + Math.sin(x * 0.11) * 22 + ((x / 32) % 2 ? 10 : -10)); };
    path(); g.strokeStyle = '#1a0e04'; g.lineWidth = 34; g.stroke();   // fenda escura e larga
    path(); g.strokeStyle = '#d9a441'; g.lineWidth = 12; g.stroke();   // brilho âmbar no fundo da fenda
    path(); g.strokeStyle = '#3a2210'; g.lineWidth = 5; g.stroke();
    g.strokeStyle = '#1a0e04'; g.lineWidth = 12;
    for (let k = 0; k < 6; k++) { const x = 40 + k * 80, y = h / 2 + Math.sin(x * 0.11) * 22; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y + (k % 2 ? 46 : -46)); g.stroke(); }
  });
}
let _crackTex = null;
const crackTex = () => (_crackTex ||= crackTexture());

// ---------- pisão ----------
class RachadinhaFx {
  constructor(scene) {
    this.scene = scene;
    this.rings = new Rings(scene, 3, AMBER, { additive: false, inner: 0.7, outer: 0.85 });
    this.dust = new Puffs(scene, 10, 0xcdbda0, { opacity: 0.55 });
    this.pebbles = new Shards(scene, 10, new THREE.DodecahedronGeometry(0.08, 0), std(EARTH));
    this.target = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), flat(0x2a1a0a, 0));
    this.target.rotation.x = -Math.PI / 2; this.target.position.y = 0.025; this.target.visible = false; scene.add(this.target);
    this.foot = new THREE.Vector3(); this.fired = -1;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt); this.dust.update(dt); this.pebbles.update(dt);
    if (!sp) { this.fired = -1; this.target.visible = false; return; }
    bodyPoint(this.foot, f, model, 'rightfoot', { dx: 0.35, y: 0 });
    const x = f.x + f.facing * 0.4;
    if (f.t < sp.startup) { // antecipação: sombra do pé crescendo no chão
      const q = easeIn(f.t / sp.startup);
      this.target.visible = true; this.target.position.set(x, 0.025, 0.1);
      this.target.scale.setScalar(0.3 + q * 1.4); this.target.material.opacity = 0.45 * q;
      return;
    }
    this.target.material.opacity *= 0.8; if (this.target.material.opacity < 0.02) this.target.visible = false;
    if (this.fired !== f.hitId) {
      this.fired = f.hitId;
      this.rings.spawn(x, 0.04, { from: 0.3, to: 2.4, life: 0.35, opacity: 0.9 });
      this.dust.burst(new THREE.Vector3(x, 0.15, 0.2), { count: 8, spread: 1.1, up: 1.5, speed: 2.0, size: 0.35, grow: 2.4, life: 0.5, z: 0 });
      this.pebbles.burst(new THREE.Vector3(x, 0.1, 0.2), { count: 8, speed: 2.5, up: 4, life: 0.8, dirX: f.facing });
    }
  }
  dispose() { this.scene.remove(this.target); }
}

// ---------- holograma 0/1 ----------
class ZeroUmFx {
  constructor(scene) {
    this.scene = scene; this.hand = new THREE.Vector3();
    this.digits = [0, 1, 0, 1].map((d) => { const s = textSprite(String(d), { color: '#9dffb0', stroke: '#0a3a1a', w: 0.3, h: 0.3 }); s.visible = false; scene.add(s); return s; });
    this.rings = new Rings(scene, 2, HOLO, { inner: 0.8, outer: 1.0 });
    this.glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), add(HOLO, 0)); this.glow.visible = false; scene.add(this.glow);
    this.spawned = -1;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt);
    for (const d of this.digits) d.visible = false;
    this.glow.visible = false;
    if (!sp) { this.spawned = -1; return; }
    const at = sp.clone?.at ?? sp.startup;
    if (f.t >= at && this.spawned !== f.hitId) {
      this.spawned = f.hitId;
      const cx = f.x + f.facing * (sp.clone?.offset ?? 1.5);
      this.rings.spawn(cx, 1.0, { flat: false, from: 0.2, to: 1.6, life: 0.3, opacity: 0.9, z: 0.3 });
    }
    if (f.t > sp.startup + sp.active) return;
    bodyPoint(this.hand, f, model, 'righthand', { dx: 0.35, y: f.stats.height * 0.6 });
    const q = clamp01(f.t / sp.startup);
    this.glow.visible = true; this.glow.position.copy(this.hand); this.glow.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(f.t * 1.3));
    this.digits.forEach((d, i) => {
      const a = f.t * 0.45 + (i * Math.PI) / 2;
      d.visible = true;
      d.position.set(this.hand.x + Math.cos(a) * 0.35 * (1 + q), this.hand.y + 0.1 + Math.sin(a * 1.7) * 0.2, this.hand.z + Math.sin(a) * 0.35);
      d.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(f.t * 2 + i));
    });
  }
  dispose() { this.scene.remove(...this.digits, this.glow); }
}

// ---------- cadeira institucional ----------
function makeChair() {
  const g = new THREE.Group();
  const leather = std(0x3a1f12, { roughness: 0.4 }), wood = std(0x6b3f1d, { roughness: 0.5 }), chrome = std(0xc8ccd2, { metalness: 0.8, roughness: 0.3 }), dark = std(0x151515);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.6), leather); seat.position.y = 0.5;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.6), leather); back.position.set(-0.3, 0.92, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.66), wood); top.position.set(-0.3, 1.34, 0);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), chrome); col.position.y = 0.3;
  g.add(seat, back, top, col);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.07), wood); arm.position.set(-0.02, 0.76, s * 0.32); g.add(arm); }
  const wheels = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.06), chrome); leg.position.set(Math.cos(a) * 0.2, 0.16, Math.sin(a) * 0.2); leg.rotation.y = -a;
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), dark); w.position.set(Math.cos(a) * 0.4, 0.07, Math.sin(a) * 0.4);
    g.add(leg, w); wheels.push(w);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.wheels = wheels;
  return g;
}

class CadeiraFx {
  constructor(scene) {
    this.scene = scene;
    this.chair = makeChair(); this.chair.visible = false; scene.add(this.chair);
    this.sparks = new Shards(scene, 10, new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    this.dust = new Puffs(scene, 12, 0xcdbda0, { opacity: 0.5 });
    this.lines = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.05), add(0xfff0a0, 0)); m.visible = false; scene.add(m); return m; });
    this.honk = textSprite('BIP BIP!', { color: '#f0c419', stroke: '#111', w: 1.6, h: 0.5 }); this.honk.visible = false; scene.add(this.honk);
    this.xEnd = 0; this.lastPuff = -1;
  }
  update(dt, f, model, sp) {
    this.sparks.update(dt); this.dust.update(dt);
    for (const l of this.lines) l.visible = false;
    this.honk.visible = false;
    if (!sp) { this.chair.visible = false; this.lastPuff = -1; return; }
    const d = sp.dash || { from: sp.startup, to: sp.startup + sp.active };
    const t = f.t, fac = f.facing, total = sp.startup + sp.active + sp.recovery;
    const rolling = t >= d.from && t < d.to;
    if (t < d.to) this.xEnd = f.x;
    let x = f.x, tilt = 0, s = clamp01(t / 5);
    if (t >= d.to) { // cadeira segue sozinha, tomba e some
      const r = t - d.to;
      x = this.xEnd + fac * 0.14 * r * Math.max(0, 1 - r / 24);
      tilt = -fac * easeIn(r / 14) * 1.2;
      s = 1 - clamp01((t - (total - 8)) / 8);
    }
    this.chair.visible = s > 0.01;
    this.chair.position.set(x, rolling ? Math.abs(Math.sin(t * 1.4)) * 0.03 : 0, 0.05);
    this.chair.rotation.set(0, fac > 0 ? 0 : Math.PI, tilt);
    this.chair.scale.setScalar(Math.max(0.01, s));
    for (const w of this.chair.userData.wheels) w.rotation.z += dt * 30;
    // ele senta: o corpo sobe até a altura do assento enquanto a cadeira está embaixo dele
    if (t < d.to && model?.object) model.object.position.y += 0.42 * s;
    if (rolling) {
      if (t % 2 === 0 && t !== this.lastPuff) {
        this.lastPuff = t;
        this.sparks.burst(new THREE.Vector3(f.x - fac * 0.3, 0.08, 0.3), { count: 2, speed: 1.5, up: 2, life: 0.3, size: 0.8, dirX: -fac });
        this.dust.burst(new THREE.Vector3(f.x - fac * 0.5, 0.15, 0.1), { count: 2, spread: 0.4, up: 0.9, speed: 0.8, size: 0.3, grow: 2.4, life: 0.45, z: 0 });
      }
      this.lines.forEach((m, i) => {
        m.visible = true;
        m.position.set(f.x - fac * (0.8 + ((i * 0.37 + t * 0.2) % 1) * 1.6), 0.35 + i * 0.28, 0.4);
        m.material.opacity = 0.35 + 0.4 * Math.sin(t * 2 + i);
      });
      this.honk.visible = t < d.from + 14;
      this.honk.position.set(f.x + fac * 0.3, f.stats.height + 0.9, 0.4);
      this.honk.scale.set(1.6 * clamp01((t - d.from) / 3), 0.5 * clamp01((t - d.from) / 3), 1);
    }
  }
  dispose() { this.scene.remove(this.chair, this.honk, ...this.lines); }
}

export const FLAVIO_FX = { rachadinha: RachadinhaFx, zeroUm: ZeroUmFx, cadeira: CadeiraFx };

// ---------- visuais de Hitter ----------
const SEG = 0.5, NSEG = 16;
export const FLAVIO_VISUALS = {
  // rachadura que corre: segmentos de rachadura ficam para trás da "cabeça" brilhante; poeira e pedrinhas no caminho
  crack: {
    build() {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false, opacity: 0.95 });
      const segs = [];
      for (let i = 0; i < NSEG; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(SEG * 1.1, 0.6), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.024; m.visible = false; m.renderOrder = 2;
        g.add(m); segs.push(m);
      }
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), add(AMBER, 0.8)); head.scale.set(1.4, 0.5, 1); head.position.y = 0.08;
      const dust = new Puffs(g, 10, 0xc9b089, { opacity: 0.5 });
      const pebbles = new Shards(g, 8, new THREE.DodecahedronGeometry(0.06, 0), std(EARTH));
      g.add(head);
      g.userData = { segs, head, dust, pebbles, x0: 0, offY: 1 }; // o Hitter fica enterrado (box.y = -1): sobe o visual até o chão
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      if (u.lastId !== h.id) { u.lastId = h.id; u.x0 = h.x - h.vx; u.lastPuff = -1; u.dust.clear(); }
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      const travelled = Math.abs(h.x - u.x0);
      u.segs.forEach((m, i) => { const back = i * SEG; m.visible = back < travelled; m.position.x = -back - SEG / 2; m.position.z = Math.sin(i * 2.1) * 0.08; });
      u.head.scale.y = 0.5 + 0.2 * Math.sin(h.t * 2);
      // poeira/pedrinhas ficam no MUNDO (compensa o deslocamento do grupo)
      const dxLocal = (h.x - (u.lastX ?? h.x)) * h.facing; u.lastX = h.x;
      for (const p of u.dust.items) if (p.life > 0) p.m.position.x -= dxLocal;
      for (const p of u.pebbles.items) if (p.life > 0) p.m.position.x -= dxLocal;
      if (h.t % 2 === 0 && h.t !== u.lastPuff) {
        u.lastPuff = h.t;
        u.dust.burst(new THREE.Vector3(0, 0.1, 0.1), { count: 1, spread: 0.3, up: 1.2, speed: 0.6, size: 0.25, grow: 2.2, life: 0.4, z: 0 });
        u.pebbles.burst(new THREE.Vector3(0, 0.05, 0), { count: 1, speed: 1.2, up: 2.5, life: 0.5, size: 1 });
      }
      u.dust.update(dt); u.pebbles.update(dt);
    },
  },
  // o chão explode: coluna de pedras sobe e cai, anel, poeira, estilhaços; a rachadura atrás (até o dono) some rápido
  eruption: {
    build() {
      const g = new THREE.Group();
      const rocks = [];
      const mats = [std(EARTH, { roughness: 0.95 }), std(0x5e4228, { roughness: 0.95 }), std(0x8d6b45, { roughness: 0.95 })];
      const geo = new THREE.DodecahedronGeometry(0.42, 0);
      for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(geo, mats[i % 3]); m.castShadow = true; m.userData = { x: (i % 2 ? 0.3 : -0.3) * (i > 3 ? 1.7 : 1), z: ((i * 7) % 3 - 1) * 0.3, s: 0.8 + (i % 3) * 0.3, r: i * 1.1 }; g.add(m); rocks.push(m); }
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 3.0, 12, 1, true), add(AMBER, 0)); glow.position.y = 1.5;
      const trail = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), new THREE.MeshBasicMaterial({ map: crackTex().clone(), transparent: true, depthWrite: false, opacity: 0 }));
      trail.rotation.x = -Math.PI / 2; trail.position.y = 0.023;
      const rings = new Rings(g, 2, AMBER, { additive: false, inner: 0.7, outer: 0.85 });
      const dust = new Puffs(g, 12, 0xcdbda0, { opacity: 0.6 });
      const shards = new Shards(g, 12, new THREE.DodecahedronGeometry(0.1, 0), std(EARTH));
      g.add(glow, trail);
      g.userData = { rocks, glow, trail, rings, dust, shards, offY: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, t = h.t, L = h.delay + h.life;
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      if (u.lastId !== h.id) {
        u.lastId = h.id; u.dust.clear();
        u.rings.spawn(0, 0.04, { from: 0.3, to: 3.2, life: 0.45, opacity: 1 });
        u.dust.burst(new THREE.Vector3(0, 0.6, 0), { count: 10, spread: 1.6, up: 3.0, speed: 2.6, size: 0.5, grow: 2.4, life: 0.6 });
        u.shards.burst(new THREE.Vector3(0, 0.3, 0), { count: 12, speed: 3.5, up: 6.5, life: 0.9, size: 1 });
        const back = Math.abs(h.x - h.owner.x); // rachadura do dono até aqui
        u.trail.scale.set(Math.max(0.1, back), 1, 1); u.trail.position.x = -back / 2;
        const tex = u.trail.material.map; tex.repeat.set(Math.max(1, back / 1.2), 1); tex.wrapS = THREE.RepeatWrapping; tex.needsUpdate = true;
      }
      const up = smooth(clamp01(t / 5)), down = smooth(clamp01((t - 10) / (L - 10)));
      for (const r of u.rocks) {
        const d = r.userData;
        r.position.set(d.x, (-0.3 + up * (1.6 + d.s * 0.8)) * (1 - down) - 0.8 * down, d.z);
        r.scale.setScalar(d.s * (0.4 + 0.6 * up));
        r.rotation.set(d.r + t * 0.1, d.r * 0.7, t * 0.08);
      }
      u.glow.material.opacity = 0.55 * up * (1 - down); u.glow.scale.set(1, 0.3 + up * 0.7, 1);
      u.trail.material.opacity = 0.9 * (1 - clamp01(t / 12));
      u.rings.update(dt); u.dust.update(dt); u.shards.update(dt);
    },
  },
};
