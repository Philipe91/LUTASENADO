// ULTIMATE do Vorcaro — "CAPITAL INFINITO" (procedural, sem GLB; sátira absurda).
// Cinemática: ergue a maleta acima da cabeça, ela abre e cospe moedas/luz dourada pro céu.
// Luta: uma MALETA-PORTAL gigante abre no céu sobre o alvo e CHOVEM moedas, cartões, maletinhas e gráficos
// (4 InstancedMesh = 4 draw calls). O monte cresce até SOTERRAR o inimigo; a maleta fecha, despenca no monte →
// explosão dourada + painel "SALDO: 0". Errou (fora do alcance): tudo cai no chão à frente.
import * as THREE from 'three';
import { Puffs, Rings, std, canvasTex, add, bodyPoint, clamp01, smooth, easeIn, easeOut } from '../fx/common.js';
import { makeBriefcase, coinTexture, chartTexture } from '../fx/vorcaroFx.js';

const GOLD = 0xf2c230;
const G = 16; // gravidade da chuva (m/s²)

function saldoTexture() {
  return canvasTex(512, 200, (g, w, h) => {
    g.fillStyle = '#0d0f14'; g.strokeStyle = '#f2c230'; g.lineWidth = 10;
    g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 26); g.fill(); g.stroke();
    g.font = 'bold 30px Impact, sans-serif'; g.fillStyle = '#8a94a8'; g.textAlign = 'center'; g.fillText('EXTRATO ATUALIZADO', w / 2, 50);
    g.font = '108px Bangers, Impact, sans-serif'; g.lineWidth = 12; g.strokeStyle = '#000'; g.lineJoin = 'round';
    g.strokeText('SALDO: 0', w / 2, 158); g.fillStyle = '#ff3b3b'; g.fillText('SALDO: 0', w / 2, 158);
  });
}

// pool de itens instanciados de um tipo
class Rain {
  constructor(parent, geo, mat, n, { colors = null, flatRest = true } = {}) {
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.castShadow = true;
    if (colors) { const c = new THREE.Color(); for (let i = 0; i < n; i++) this.mesh.setColorAt(i, c.setHex(colors[i % colors.length])); }
    parent.add(this.mesh);
    this.flatRest = flatRest;
    this.items = Array.from({ length: n }, () => ({ st: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, s: 1 }));
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sv = new THREE.Vector3();
  }
  free() { return this.items.find((i) => i.st === 0) || null; }
  // st 1 = caindo (pousa no monte), 3 = balístico com sumiço (estouro/jorro)
  drop(x, y, z, vx = 0, vy = 0, vz = 0, st = 1, life = 1, s = 1) {
    const it = this.free(); if (!it) return;
    it.st = st; it.p.set(x, y, z); it.v.set(vx, vy, vz); it.life = it.max = life; it.s = s;
    it.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    it.w.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
  }
  update(dt, surface) {
    let n = 0;
    for (const it of this.items) {
      if (it.st === 0) continue;
      if (it.st === 1 || it.st === 3) {
        it.v.y -= G * dt; it.p.addScaledVector(it.v, dt);
        it.r.x += it.w.x * dt; it.r.y += it.w.y * dt; it.r.z += it.w.z * dt;
      }
      if (it.st === 1) {
        const sy = surface(it.p.x, it.p.z);
        if (it.p.y <= sy) { it.st = 2; it.p.y = sy + 0.03; if (this.flatRest) { it.r.x = (Math.random() - 0.5) * 0.8; it.r.z = (Math.random() - 0.5) * 0.8; } }
      } else if (it.st === 2) {
        if (it.p.y < surface(it.p.x, it.p.z) - 0.25) { it.st = 0; continue; } // soterrado pelo próprio monte: recicla
      } else if (it.st === 3) {
        it.life -= dt; if (it.life <= 0 || it.p.y < -1) { it.st = 0; continue; }
      }
      const sc = it.s * (it.st === 3 ? Math.min(1, (it.life / it.max) * 3) : 1);
      this.q.setFromEuler(it.r); this.sv.setScalar(Math.max(0.001, sc));
      this.mesh.setMatrixAt(n++, this.m.compose(it.p, this.q, this.sv));
    }
    this.mesh.count = n;
    if (n) this.mesh.instanceMatrix.needsUpdate = true;
  }
  // estoura: tudo que está no monte/caindo voa pra fora a partir de (cx, cy)
  explode(cx, cy) {
    for (const it of this.items) {
      if (it.st !== 1 && it.st !== 2) continue;
      const dx = it.p.x - cx, a = Math.atan2(it.p.y - cy + 0.5, dx);
      const sp = 5 + Math.random() * 6;
      it.st = 3; it.life = it.max = 0.7 + Math.random() * 0.5;
      it.v.set(Math.cos(a) * sp + (Math.random() - 0.5) * 2, Math.abs(Math.sin(a)) * sp + 3 + Math.random() * 4, (Math.random() - 0.2) * 5);
    }
  }
  clear() { for (const it of this.items) it.st = 0; this.mesh.count = 0; }
}

export class VorcaroCapital {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    const root = new THREE.Group(); scene.add(root); this.root = root;
    // maleta-portal (deitada no céu, tampa abrindo pra BAIXO)
    this.portal = new THREE.Group();
    this.case = makeBriefcase({ color: 0x111111, hinge: 'bottom' }); this.case.rotation.x = Math.PI / 2; this.case.scale.setScalar(3.2);
    this.portal.add(this.case);
    this.inner = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.3), add(0xffe27a, 0)); this.inner.rotation.x = Math.PI / 2; this.inner.position.y = -0.2; this.portal.add(this.inner);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 1, 24, 1, true), add(0xffd860, 0)); this.portal.add(this.beam);
    this.portal.visible = false; root.add(this.portal);
    // maleta da cinemática (nas mãos, acima da cabeça)
    this.hand = makeBriefcase({ hinge: 'bottom' }); this.hand.scale.setScalar(1.5); this.hand.visible = false; root.add(this.hand);
    this.handBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.9, 6, 16, 1, true), add(0xffe27a, 0)); root.add(this.handBeam);
    // chuva
    const coinSide = std(0xd9a520, { metalness: 0.85, roughness: 0.3 }), coinFace = new THREE.MeshStandardMaterial({ map: coinTexture(), metalness: 0.5, roughness: 0.35 });
    this.coins = new Rain(root, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), [coinSide, coinFace, coinFace], 170);
    this.cards = new Rain(root, new THREE.BoxGeometry(0.42, 0.025, 0.27), std(0xffffff, { metalness: 0.4, roughness: 0.35 }), 50, { colors: [0xd4af37, 0x1c1c1c, 0x2a5bd7, 0xc0c0c8, 0x8a2be2] });
    this.cases = new Rain(root, new THREE.BoxGeometry(0.5, 0.36, 0.14), std(0xffffff, { roughness: 0.5 }), 26, { colors: [0x1a1a1a, 0x5a3a1a, 0x2a2a2a] });
    this.charts = new Rain(root, new THREE.PlaneGeometry(0.62, 0.48), new THREE.MeshStandardMaterial({ map: chartTexture(), side: THREE.DoubleSide, roughness: 0.8 }), 26);
    this.rains = [this.coins, this.cards, this.cases, this.charts];
    // monte de dinheiro (meia-esfera dourada que cresce)
    this.mound = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xe8b830, { metalness: 0.25, roughness: 0.5, emissive: 0x5a3a00, emissiveIntensity: 0.6, flatShading: true }));
    this.mound.castShadow = true; this.mound.receiveShadow = true; this.mound.visible = false; root.add(this.mound);
    // explosão + painel
    this.rings = new Rings(root, 4, GOLD);
    this.gold = new Puffs(root, 18, 0xffd860, { opacity: 0.9 });
    this.smoke = new Puffs(root, 12, 0x6a6a6a, { lit: true, opacity: 0.6 });
    this.saldo = new THREE.Sprite(new THREE.SpriteMaterial({ map: saldoTexture(), transparent: true, depthTest: false, depthWrite: false }));
    this.saldo.renderOrder = 30; this.saldo.visible = false; root.add(this.saldo);
    this.tx = 0; this.H = 0; this.lastT = -1; this.boomed = false; this.R = 1.25; this.RZ = 1.0;
    this.v = new THREE.Vector3();
    this.surface = (x, z) => {
      if (!this.mound.visible) return 0.02;
      const a = (x - this.tx) / this.R, b = z / this.RZ, q = 1 - a * a - b * b;
      return q > 0 ? this.H * Math.sqrt(q) : 0.02;
    };
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    for (const r of this.rains) r.update(dt, this.surface);
    this.rings.update(dt); this.gold.update(dt); this.smoke.update(dt);
    if (!on) {
      this.portal.visible = this.hand.visible = this.saldo.visible = this.mound.visible = false;
      this.handBeam.material.opacity = 0; this.boomed = false; this.lastT = -1; this.locked = false;
      return;
    }
    const o = f.opponent;
    // ---- cinemática: maleta acima da cabeça abre e jorra moedas/luz pro céu ----
    if (cine >= 0) {
      const T = 75 - cine;
      bodyPoint(this.v, f, model, 'head', { y: f.stats.height * 0.9 });
      this.hand.visible = true;
      const up = easeOut(clamp01(T / 14));
      this.hand.position.set(this.v.x + f.facing * 0.05, this.v.y + 0.25 + up * 0.55, this.v.z + 0.15);
      this.hand.rotation.set(-Math.PI / 2 * up, 0, 0); // deita a maleta, tampa pra cima
      const op = easeOut(clamp01((T - 18) / 8));
      this.hand.userData.open(op);
      this.handBeam.position.set(this.hand.position.x, this.hand.position.y + 3.2, this.hand.position.z - 0.2);
      this.handBeam.material.opacity = op * (0.35 + Math.sin(T * 0.6) * 0.08);
      if (op > 0.5 && T !== this.lastT) {
        this.lastT = T;
        const p = this.hand.position;
        this.coins.drop(p.x, p.y + 0.3, p.z, (Math.random() - 0.5) * 3, 7 + Math.random() * 5, (Math.random() - 0.5) * 2, 3, 0.9, 1);
        if (T % 3 === 0) this.cards.drop(p.x, p.y + 0.3, p.z, (Math.random() - 0.5) * 3, 6 + Math.random() * 5, (Math.random() - 0.5) * 2, 3, 0.9, 1);
        if (T % 8 === 0) this.gold.burst(p.clone().setY(p.y + 0.4), { count: 2, spread: 0.6, up: 4, speed: 1, size: 0.25, grow: 2, life: 0.6, z: 0 });
      }
      this.portal.visible = false; this.mound.visible = false; this.saldo.visible = false;
      return;
    }
    this.hand.visible = false; this.handBeam.material.opacity = 0;
    const t = f.t;
    if (!this.locked) { // trava o alvo no começo: em cima do inimigo (ou no chão à frente, se longe demais)
      this.locked = true; this.boomed = false; this.H = 0;
      const d = Math.abs(o.x - f.x);
      this.tx = d <= u.range ? o.x : f.x + f.facing * u.range;
      for (const r of this.rains) r.clear();
    }
    if (f.ultRes[0] === 'hit' && t < fin) this.tx += (o.x - this.tx) * Math.min(1, dt * 4); // acompanha o empurrãozinho
    // ---- portal ----
    const top = 4.3;
    const appear = easeOut(clamp01(t / 8));
    const closeK = clamp01((t - (hitsEnd - 10)) / 6); // fecha antes de cair
    const drop = easeIn(clamp01((t - (hitsEnd - 4)) / (fin - hitsEnd + 4)));
    const moundTop = this.H + 0.35;
    this.portal.visible = !this.boomed;
    this.portal.position.set(this.tx, top - (top - moundTop) * drop, 0);
    this.portal.scale.setScalar(Math.max(0.01, appear * (1 - closeK * 0.2)));
    this.portal.rotation.set(0, 0, Math.sin(t * 0.25) * 0.04 * (1 - drop));
    const open = easeOut(clamp01((t - 4) / 6)) * (1 - closeK);
    this.case.userData.open(open);
    this.inner.material.opacity = open * 0.8;
    const beamH = Math.max(0.1, this.portal.position.y);
    this.beam.scale.set(1, beamH, 1); this.beam.position.y = -beamH / 2;
    this.beam.material.opacity = open * (0.07 + Math.sin(t * 0.7) * 0.02);
    // ---- chuva + monte ----
    const growK = smooth((t - 10) / (hitsEnd - 10));
    if (!this.boomed) this.H = (f.ultRes[0] === 'miss' ? 1.0 : 2.35) * growK;
    this.mound.visible = this.H > 0.05 && !this.boomed;
    this.mound.position.set(this.tx, 0, 0);
    this.mound.scale.set(this.R * Math.min(1, 0.5 + this.H), Math.max(0.01, this.H), this.RZ * Math.min(1, 0.5 + this.H));
    if (t !== this.lastT && t >= 5 && t < hitsEnd - 8) {
      this.lastT = t;
      const sx = () => this.tx + (Math.random() - 0.5) * 1.9, sy = top - 0.4, sz = () => (Math.random() - 0.5) * 1.6;
      for (let i = 0; i < 2; i++) this.coins.drop(sx(), sy, sz(), (Math.random() - 0.5) * 1.5, -2 - Math.random() * 3, 0);
      if (t % 2 === 0) this.cards.drop(sx(), sy, sz(), (Math.random() - 0.5) * 1.5, -1 - Math.random() * 2, 0);
      if (t % 5 === 0) this.cases.drop(sx(), sy, sz(), (Math.random() - 0.5), -2, 0);
      if (t % 4 === 1) this.charts.drop(sx(), sy, sz(), (Math.random() - 0.5) * 1.5, -0.5, 0);
    }
    // ---- impacto: maleta fechada despenca no monte → estouro + SALDO: 0 ----
    if (t >= fin && !this.boomed) {
      this.boomed = true;
      const cy = Math.max(0.6, this.H * 0.6);
      for (const r of this.rains) r.explode(this.tx, cy);
      for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI; this.coins.drop(this.tx, cy, 0, Math.cos(a) * (4 + Math.random() * 6), Math.sin(a) * 9 + 2, (Math.random() - 0.3) * 5, 3, 1.0, 1.2); }
      this.rings.spawn(this.tx, 0.05, { from: 0.4, to: 6, life: 0.55, opacity: 1 });
      this.rings.spawn(this.tx, cy, { flat: false, from: 0.4, to: 4.5, life: 0.4, opacity: 0.9, z: 0.6, color: 0xfff0b0 });
      this.gold.burst(new THREE.Vector3(this.tx, cy, 0), { count: 16, spread: 2.2, up: 3.5, speed: 4, size: 0.7, grow: 2.2, life: 0.7 });
      this.smoke.burst(new THREE.Vector3(this.tx, cy, 0), { count: 10, spread: 2, up: 2.2, speed: 2, size: 0.8, grow: 2.6, life: 1.1 });
      this.saldoT = 0;
    }
    if (this.boomed) {
      this.saldoT += dt;
      const s = this.saldoT, pop = s < 0.12 ? 1.8 - (s / 0.12) * 0.8 : 1;
      this.saldo.visible = t < end - 2;
      this.saldo.position.set(this.tx, 3.0, 1.2);
      this.saldo.scale.set(3.3 * pop, 1.29 * pop, 1);
      this.saldo.material.opacity = 1 - clamp01((t - (end - 10)) / 8);
      this.saldo.material.rotation = -0.06 + Math.sin(s * 30) * 0.03 * Math.max(0, 1 - s * 3);
    }
  }

  dispose() {
    this.scene.remove(this.root);
  }
}
