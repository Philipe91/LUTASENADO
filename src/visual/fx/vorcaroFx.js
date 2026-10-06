// VFX do VORCARO / "VORCASH" (sátira absurda: maleta mágica, dinheiro de desenho animado).
//   Hitters (VORCARO_VISUALS, registrados no Vfx):
//     maleta       — Maleta Voadora: maleta preta girando em arco; ao acertar/cair PARA, a tampa abre e as notas voam
//     juros        — Juros Compostos: moeda dourada rolando, cresce a cada quique (anel + "JUROS²!"), rastro dourado
//     malaContatos — Mala de Contatos: maleta grande jogada no chão; abre com feixe dourado de onde saem os ajudantes
//     assist       — ajudante temporário (src/fight/Assist.js): modelo do personagem (GLB se existir, senão placeholder)
//   Corpo (VORCARO_FX, registrados no SpecialFx):
//     caseHand     — maleta na mão até o frame do arremesso · coinFlick — moeda no polegar, sobe girando
import * as THREE from 'three';
import { swapToGLB, PROP_GLB } from '../propModel.js';
import { Puffs, Rings, std, canvasTex, textSprite, add, flat, bodyPoint, clamp01, easeOut, smooth } from './common.js';
import { PlaceholderModel } from '../models/PlaceholderModel.js';
import { GLBModel } from '../models/GLBModel.js';
import { CHARACTERS } from '../../data/characters/index.js';

const GOLD = 0xf2c230;
let _bill, _coin, _chart, _money;
export function billTexture() {
  return (_bill ||= canvasTex(128, 60, (g, w, h) => {
    g.fillStyle = '#3f9a52'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1f5a2c'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#d8f0c8'; g.beginPath(); g.ellipse(w / 2, h / 2, 17, 17, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1f5a2c'; g.font = 'bold 28px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('$', w / 2, h / 2 + 1); g.font = 'bold 16px Impact, sans-serif'; g.fillText('100', 20, 16); g.fillText('100', w - 20, h - 14);
  }));
}
export function coinTexture() {
  return (_coin ||= canvasTex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w * 0.4, h * 0.35, 6, w / 2, h / 2, 64);
    r.addColorStop(0, '#fff2a8'); r.addColorStop(0.6, '#f2c230'); r.addColorStop(1, '#b8860b');
    g.fillStyle = r; g.beginPath(); g.arc(w / 2, h / 2, 63, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a6208'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, h / 2, 52, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8a6208'; g.font = 'bold 74px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', w / 2, h / 2 + 4);
  }));
}
// gráfico "só sobe" (seta verde) — usado na chuva da ultimate
export function chartTexture() {
  return (_chart ||= canvasTex(128, 100, (g, w, h) => {
    g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#222'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
    g.strokeStyle = '#cfcfcf'; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(8, i * 24); g.lineTo(w - 8, i * 24); g.stroke(); }
    g.strokeStyle = '#18a03a'; g.lineWidth = 8; g.lineJoin = 'round'; g.beginPath();
    g.moveTo(12, 84); g.lineTo(40, 64); g.lineTo(60, 72); g.lineTo(88, 40); g.lineTo(108, 22); g.stroke();
    g.fillStyle = '#18a03a'; g.beginPath(); g.moveTo(118, 10); g.lineTo(98, 14); g.lineTo(114, 30); g.closePath(); g.fill();
  }));
}
function moneyTexture() {
  return (_money ||= canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#2f7d40'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
      g.fillStyle = (x + y) % 2 ? '#47a35a' : '#3c9450'; g.fillRect(4 + x * 41, 4 + y * 23, 38, 20);
      g.fillStyle = '#d8f0c8'; g.fillRect(4 + x * 41 + 15, 4 + y * 23, 7, 20); // cinta do maço
    }
  }));
}

// maleta: corpo + tampa articulada (hinge 'bottom' abre pra frente/baixo; 'top' abre pra cima — deitada no chão)
// +X = largura, +Y = alça, +Z = frente (tampa). open(k) 0..1 abre a tampa.
export function makeBriefcase({ color = 0x151515, trim = GOLD, hinge = 'bottom' } = {}) {
  const g = new THREE.Group();
  const leather = std(color, { roughness: 0.45 }), gold = std(trim, { metalness: 0.8, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.46, 0.1), leather); base.position.z = -0.05; base.castShadow = true;
  const money = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.38, 0.03), new THREE.MeshStandardMaterial({ map: moneyTexture(), roughness: 0.8 }));
  money.position.z = 0.012;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14, Math.PI), leather); handle.position.set(0, 0.235, -0.02);
  const s = hinge === 'bottom' ? -1 : 1;
  const pivot = new THREE.Group(); pivot.position.set(0, s * 0.23, 0.0);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.46, 0.06), leather); lid.position.set(0, -s * 0.23, 0.03); lid.castShadow = true;
  pivot.add(lid);
  for (const x of [-0.2, 0.2]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), gold); c.position.set(x, -s * 0.23 - s * 0.19, 0.065); pivot.add(c); }
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.025, 0.061), gold); band.position.set(0, -s * 0.23 + s * 0.17, 0.03); pivot.add(band);
  g.add(base, money, handle, pivot);
  const OPEN = hinge === 'bottom' ? 1.95 : -1.75;
  g.userData.open = (k) => { pivot.rotation.x = OPEN * k; };
  // 2 peças: corpo (o dinheiro de canvas fica) + tampa no pivô (continua abrindo)
  swapToGLB(g, PROP_GLB.maletaCorpo, { keep: [money, pivot] });
  swapToGLB(pivot, PROP_GLB.maletaTampa);
  return g;
}

// notas voando (InstancedMesh: 1 draw call) — nascem num ponto local e caem flutuando
class Bills {
  constructor(parent, n = 24, size = 1) {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.26 * size, 0.12 * size), new THREE.MeshBasicMaterial({ map: billTexture(), side: THREE.DoubleSide, transparent: true }), n);
    this.mesh.frustumCulled = false; this.mesh.count = 0; parent.add(this.mesh);
    this.p = Array.from({ length: n }, () => ({ pos: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, max: 1 }));
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3();
  }
  burst(at, { count = 18, speed = 2, up = 3, toCam = 1.2, life = 1.3, dirX = 0 } = {}) {
    let c = 0;
    for (const p of this.p) {
      if (p.life > 0) continue;
      if (c++ >= count) break;
      p.life = p.max = life * (0.7 + Math.random() * 0.6);
      p.pos.copy(at);
      p.v.set((Math.random() - 0.5 + dirX * 0.5) * speed * 2, up * (0.5 + Math.random()), toCam * (0.3 + Math.random()));
      p.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); p.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8);
    }
  }
  update(dt) {
    let n = 0;
    for (const p of this.p) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.v.y -= 4.5 * dt; p.v.multiplyScalar(1 - dt * 1.8); // nota flutua (arrasto alto)
      p.pos.addScaledVector(p.v, dt);
      if (p.pos.y < -5) p.life = 0;
      p.r.x += p.w.x * dt; p.r.y += p.w.y * dt; p.r.z += p.w.z * dt;
      const k = p.life / p.max, sc = Math.min(1, k * 5);
      this.q.setFromEuler(p.r); this.s.setScalar(Math.max(0.001, sc));
      this.mesh.setMatrixAt(n++, this.m.compose(p.pos, this.q, this.s));
    }
    this.mesh.count = n;
    if (n) this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { for (const p of this.p) p.life = 0; this.mesh.count = 0; }
}

// ---------------- Hitters ----------------
export const VORCARO_VISUALS = {
  maleta: {
    build() {
      const g = new THREE.Group();
      const spin = new THREE.Group(); g.add(spin);
      const bc = makeBriefcase(); bc.scale.setScalar(1.3); spin.add(bc);
      const bills = new Bills(g, 26, 1.3);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), add(0xfff0a0, 0)); glow.position.z = 0.15; g.add(glow);
      const trail = Array.from({ length: 4 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.56, 0.05), flat(0x222233, 0.28 - i * 0.06)); g.add(m); return m; });
      g.userData = { spin, bc, bills, glow, trail, hist: [], center: true };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      if (u.lastId !== h.id) { u.lastId = h.id; u.opened = -1; u.hist.length = 0; u.bills.clear(); u.bc.userData.open(0); }
      const b = h.hit.boost || 1;
      u.spin.scale.setScalar(1 + (b - 1) * 0.6);
      u.bills.update(dt);
      if (!h.spent) { // voando: gira de lado, rastro
        u.spin.rotation.set(0, 0, u.spin.rotation.z - dt * 13 * h.facing);
        u.hist.unshift([h.x, h.y]); if (u.hist.length > 16) u.hist.pop();
        u.trail.forEach((t, i) => { const p = u.hist[(i + 1) * 3]; t.visible = !!p; if (p) { t.position.set(p[0] - h.x, p[1] - h.y, -0.05); t.rotation.z = u.spin.rotation.z + (i + 1) * 0.5 * h.facing; } });
        u.glow.material.opacity = 0;
        return;
      }
      for (const t of u.trail) t.visible = false;
      if (u.opened < 0) { // PAROU: endireita, abre, notas voam
        u.opened = h.t;
        const hit = (h.landed || 0) > 0;
        u.bills.burst(new THREE.Vector3(0, 0.1, 0.1), { count: hit ? Math.round(18 * b) : 10, speed: hit ? 2.4 : 1.4, up: hit ? 3.8 : 2.4, toCam: 1.4, dirX: -h.facing * 0.4 });
      }
      const age = h.t - u.opened;
      u.spin.rotation.z += (0 - u.spin.rotation.z) * Math.min(1, dt * 18);
      u.bc.userData.open(easeOut(clamp01(age / 5)));
      u.glow.material.opacity = 0.7 * (1 - clamp01(age / 10));
      u.glow.scale.setScalar(0.6 + age * 0.12);
      const left = h.delay + h.life - h.t; // some encolhendo
      u.spin.scale.multiplyScalar(clamp01(left / 6));
    },
  },

  juros: {
    build() {
      const g = new THREE.Group();
      const side = std(0xd9a520, { metalness: 0.85, roughness: 0.3 }), face = new THREE.MeshStandardMaterial({ map: coinTexture(), metalness: 0.5, roughness: 0.35 });
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), [side, face, face]); coin.rotation.x = Math.PI / 2; coin.castShadow = true;
      const spin = new THREE.Group(); spin.add(coin); g.add(spin);
      const halo = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), add(0xffe680, 0.35)); halo.position.z = -0.05; spin.add(halo);
      const trail = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.17, 14), add(GOLD, 0.4 - i * 0.07)); g.add(m); return m; });
      const labels = ['JUROS!', 'JUROS²!', 'JUROS³!'].map((t) => { const s = textSprite(t, { color: '#ffe14a', stroke: '#3a2a00', w: 1.3, h: 0.43 }); s.visible = false; g.add(s); return s; });
      const rings = new Rings(g, 3, GOLD, { inner: 0.6, outer: 0.85 });
      const sparks = new Puffs(g, 10, 0xfff0a0, { opacity: 0.9 });
      g.userData = { spin, coin, trail, labels, rings, sparks, hist: [], center: true, lastX: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      if (u.lastId !== h.id) { u.lastId = h.id; u.hist.length = 0; u.seen = 0; u.lastX = h.x; u.labelT = 9; u.sparks.clear(); }
      // anel/brilho do quique ficam no MUNDO: compensa o deslocamento do grupo
      const dx = h.x - u.lastX; u.lastX = h.x;
      for (const q of u.rings.items) if (q.life > 0) q.m.position.x -= dx;
      for (const p of u.sparks.items) if (p.life > 0) p.m.position.x -= dx;
      u.rings.update(dt); u.sparks.update(dt);
      const s = h.scale * (1 + ((h.hit.boost || 1) - 1) * 0.4);
      u.spin.scale.setScalar(s * 1.15);
      u.spin.rotation.z -= dt * 16 * h.facing; // rola
      u.coin.rotation.z = Math.sin(performance.now() / 90) * 0.35; // bamboleia
      if (h.bounced > u.seen) { // QUICOU: anel no chão, faíscas, rótulo
        u.seen = h.bounced; u.labelT = 0;
        u.rings.spawn(0, -h.h / 2 + 0.03, { from: 0.3, to: 1.4 * s, life: 0.35, opacity: 0.9 });
        u.sparks.burst(new THREE.Vector3(0, -h.h / 2, 0), { count: 6, spread: 0.6, up: 1.6, speed: 1.8, size: 0.12, grow: 1.5, life: 0.4, z: 0.1 });
      }
      u.labelT += dt;
      u.labels.forEach((l, i) => {
        l.visible = i === u.seen - 1 && u.labelT < 0.55;
        if (l.visible) { const q = u.labelT / 0.55; l.position.set(0, 0.55 + s * 0.2 + q * 0.4, 0.3); l.material.opacity = 1 - q * q; l.scale.set(1.3 * (0.8 + 0.2 * Math.min(1, q * 6)), 0.43, 1); }
      });
      u.hist.unshift([h.x, h.y]); if (u.hist.length > 20) u.hist.pop();
      u.trail.forEach((t, i) => { const p = u.hist[(i + 1) * 3]; t.visible = !!p; if (p) { t.position.set(p[0] - h.x, p[1] - h.y, -0.06); t.scale.setScalar(s * (1 - i * 0.12)); } });
    },
  },

  malaContatos: {
    build() {
      const g = new THREE.Group();
      const holder = new THREE.Group(); g.add(holder);
      const bc = makeBriefcase({ hinge: 'top', color: 0x1a1a1a }); bc.rotation.x = -Math.PI / 2; bc.scale.setScalar(1.8); bc.position.y = 0.11; holder.add(bc);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 2.4, 20, 1, true), add(0xffd860, 0)); beam.position.y = 1.3; holder.add(beam);
      const shine = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.8), add(0xfff3b0, 0)); shine.rotation.x = -Math.PI / 2; shine.position.y = 0.2; holder.add(shine);
      const dust = new Puffs(g, 10, 0xd8c8a8, { opacity: 0.6 });
      const gold = new Puffs(g, 12, 0xffd860, { opacity: 0.85 });
      const ring = new Rings(g, 3, 0xffd860, { inner: 0.7, outer: 0.9 });
      g.userData = { holder, bc, beam, shine, dust, gold, ring };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, t = h.t, o = h.owner;
      if (u.lastId !== h.id) { u.lastId = h.id; u.landed = false; u.pulsed = new Set(); u.dust.clear(); u.gold.clear(); }
      u.dust.update(dt); u.gold.update(dt); u.ring.update(dt);
      const FLY = 9;
      if (t < FLY) { // voa da mão do Vorcaro até o chão, girando
        const q = t / FLY, sx = o.x + o.facing * 0.4 - h.x;
        u.holder.position.set(sx * (1 - q), 1.3 * (1 - q) + Math.sin(q * Math.PI) * 0.7, 0);
        u.holder.rotation.set(0, 0, (1 - q) * 2.5 * h.facing); u.holder.scale.setScalar(0.55 + 0.45 * q);
      } else { u.holder.position.set(0, 0, 0); u.holder.rotation.set(0, 0, 0); u.holder.scale.setScalar(1); }
      if (t >= FLY && !u.landed) {
        u.landed = true;
        u.dust.burst(new THREE.Vector3(0, 0.1, 0.2), { count: 8, spread: 1.2, up: 1.2, speed: 2, size: 0.35, grow: 2.4, life: 0.5, z: 0 });
        u.ring.spawn(0, 0.04, { from: 0.3, to: 2.4, life: 0.4, opacity: 0.8 });
      }
      const end = h.delay + h.life, close = clamp01((end - 10 - t) / 6);
      const open = t < FLY ? 0 : easeOut(clamp01((t - FLY) / 5)) * close;
      u.bc.userData.open(open);
      // feixe dourado (pulsa quando cada ajudante sai)
      let pulse = 0;
      for (const a of h.hit.assists || []) {
        const at = a.delay ?? 0, k = t - at;
        if (k >= 0 && k < 10) pulse = Math.max(pulse, 1 - k / 10);
        if (k >= 0 && !u.pulsed.has(at)) {
          u.pulsed.add(at);
          u.gold.burst(new THREE.Vector3(0, 0.5, 0.2), { count: 4, spread: 0.8, up: 3, speed: 1.4, size: 0.12, grow: 1.5, life: 0.5, z: 0 });
        }
      }
      u.beam.material.opacity = open * pulse * 0.12;
      u.beam.scale.set(1 + pulse * 0.3, 0.6 + open * 0.4, 1 + pulse * 0.3);
      u.shine.material.opacity = open * (0.35 + pulse * 0.4);
      if (end - t < 4) u.holder.scale.setScalar(Math.max(0.01, (end - t) / 4)); // some encolhendo
      if (end - t === 4) u.dust.burst(new THREE.Vector3(0, 0.3, 0.2), { count: 6, spread: 1, up: 1.5, speed: 1.5, size: 0.35, grow: 2, life: 0.45, z: 0 });
    },
  },

  // AJUDANTE (Assist): modelo do personagem `h.variant` — CharacterData do elenco se existir; senão
  // visual.assistLooks do dono. Placeholder já; GLB troca sozinho quando o arquivo existir.
  assist: {
    build(h) {
      const g = new THREE.Group();
      const who = h.variant;
      const reg = CHARACTERS.find((c) => c.id === who);
      const look = reg ? { name: reg.name, height: reg.stats?.height ?? 1.8, ...reg.visual } : (h.owner.data.visual?.assistLooks?.[who] || { name: who.toUpperCase(), height: 1.8 });
      const height = look.height ?? 1.8;
      const inner = new THREE.Group(); g.add(inner);
      const pm = new PlaceholderModel({ name: look.name, stats: { height }, visual: { placeholder: look.placeholder } });
      inner.add(pm.object);
      const u = { inner, model: pm, who, height };
      if (look.model) {
        const animations = look.animations || h.owner.data.visual?.animations || [];
        GLBModel.create({ ...look, height, animations, clips: look.clips || {} }).then((m) => {
          inner.remove(pm.object); inner.add(m.object); u.model = m; u.lastPlay = null;
        }).catch(() => console.info(`[visual] ajudante ${who}: sem GLB em ${look.model}, usando placeholder`));
      }
      // efeitos do golpe e da entrada/saída (pools locais)
      u.puffs = new Puffs(g, 12, 0xffd860, { opacity: 0.5 });
      u.rings = new Rings(g, 3, 0xffffff, { inner: 0.7, outer: 0.9 });
      u.crack = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, opacity: 0, depthWrite: false }));
      u.crack.rotation.x = -Math.PI / 2; u.crack.position.y = 0.02; g.add(u.crack);
      u.stamp = textSprite('BLOQUEADO', { color: '#fff', stroke: '#7a0000', w: 1.9, h: 0.63, bubble: '#d62828' }); u.stamp.visible = false; g.add(u.stamp);
      u.flash = new THREE.Mesh(new THREE.CircleGeometry(1, 24), add(0xffffff, 0)); u.flash.position.z = 0.4; g.add(u.flash);
      u.phone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), std(0x111111)); u.phone.visible = false; g.add(u.phone);
      u.tag = textSprite(look.name, { color: '#ffd400', stroke: '#000', w: 1.0, h: 0.33 }); u.tag.visible = false; g.add(u.tag);
      g.userData = u;
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, k = h.k, E = h.enter, S = h.strikeN, X = h.exitN;
      if (u.lastId !== h.id) { u.lastId = h.id; u.stage = ''; u.fxT = -1; u.puffs.clear(); }
      u.puffs.update(dt); u.rings.update(dt);
      const show = k > 0;
      u.inner.visible = show;
      if (!show) { u.tag.visible = false; return; }
      u.inner.rotation.y = h.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
      const outK = clamp01((E + S + X - k) / 8);
      u.inner.scale.setScalar(Math.max(0.01, Math.min(clamp01(k / 4), outK) * (0.4 + 0.6 * smooth(Math.min(1, k / 6)))));
      // animação: salto na chegada → golpe (contato no fim da chegada) → sumindo
      const stage = k < E - 4 ? 'enter' : 'strike';
      if (stage !== u.stage) {
        u.stage = stage;
        if (stage === 'enter') {
          u.model.play('jump', E, false);
          u.puffs.burst(new THREE.Vector3(0, 0.2, 0), { count: 4, spread: 0.8, up: 1.0, speed: 1.4, size: 0.22, grow: 1.8, life: 0.35 });
          u.model.setFlash(true);
        } else { u.model.play(h.hit.anim || 'punch3', 4 + S + X, false); u.model.setFlash(false); }
      }
      if (k >= 3 && u.stage === 'enter') u.model.setFlash(false); // brilho só no "pop" de surgir
      u.model.update(dt, { key: stage === 'enter' ? 'jump' : h.hit.anim });
      // etiqueta com o nome (leitura do "quem é quem" em clipe curto)
      u.tag.visible = k < E + S + 4 && !(u.model instanceof PlaceholderModel); // placeholder já tem o nome
      u.tag.position.set(0, u.height + 0.35, 0.2);
      // efeito do golpe no frame de contato
      if (k === E + 1 && u.fxT < 0) {
        u.fxT = 0;
        const fx = h.hit.fx, fx0 = h.facing * 0.7;
        if (fx === 'crack') {
          u.crack.position.x = fx0; u.crack.rotation.z = h.facing > 0 ? 0 : Math.PI;
          u.rings.spawn(fx0, 0.04, { from: 0.3, to: 2.4, life: 0.4, opacity: 0.9, color: 0xd8b070 });
          u.puffs.burst(new THREE.Vector3(fx0, 0.15, 0.2), { count: 6, spread: 1.0, up: 1.6, speed: 2, size: 0.3, grow: 2.2, life: 0.5, color: 0xcdbda0 });
        } else if (fx === 'stamp') {
          u.rings.spawn(fx0 + h.facing * 0.2, 1.0, { flat: false, from: 0.3, to: 2.2, life: 0.35, opacity: 0.8, color: 0xd62828, z: 0.3 });
        } else if (fx === 'selfie') {
          u.rings.spawn(fx0, 1.2, { flat: false, from: 0.2, to: 2.6, life: 0.3, opacity: 1, color: 0xffffff, z: 0.4 });
        }
      }
      if (u.fxT >= 0) u.fxT += dt;
      const ft = u.fxT;
      u.crack.material.opacity = ft >= 0 && h.hit.fx === 'crack' ? 0.85 * (1 - clamp01(ft / 0.7)) : 0;
      u.stamp.visible = ft >= 0 && ft < 0.6 && h.hit.fx === 'stamp';
      if (u.stamp.visible) { const q = clamp01(ft / 0.08); u.stamp.position.set(h.facing * 1.0, 1.5, 0.5); u.stamp.scale.set(1.9 * (2 - q), 0.63 * (2 - q), 1); u.stamp.material.rotation = -0.15 * h.facing; u.stamp.material.opacity = 1 - clamp01((ft - 0.4) / 0.2); }
      const selfie = h.hit.fx === 'selfie';
      u.phone.visible = selfie && k > E - 6 && k < E + S + 6;
      if (u.phone.visible) u.phone.position.set(h.facing * 0.45, u.height * 0.72, 0.25);
      u.flash.material.opacity = selfie && ft >= 0 ? 0.95 * (1 - clamp01(ft / 0.25)) : 0;
      if (selfie) { u.flash.position.set(h.facing * 0.9, 1.2, 0.4); u.flash.scale.setScalar(0.4 + clamp01(ft / 0.12) * 1.4); }
      if (k === E + S + X - 6 && u.stage !== 'gone') { u.stage = 'gone'; u.puffs.burst(new THREE.Vector3(0, 0.6, 0), { count: 5, spread: 1, up: 1.2, speed: 1.6, size: 0.25, grow: 2, life: 0.4, color: 0xffd860 }); }
    },
  },
};

let _crack;
function crackTex() {
  return (_crack ||= canvasTex(256, 96, (g, w, h) => {
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); let x = 8, y = h / 2; g.moveTo(x, y);
    while (x < w - 10) { x += 18 + Math.random() * 14; y = h / 2 + (Math.random() - 0.5) * 40; g.lineTo(x, y); }
    g.stroke();
    g.lineWidth = 4; for (let i = 0; i < 4; i++) { const bx = 40 + i * 50; g.beginPath(); g.moveTo(bx, h / 2); g.lineTo(bx + 16, h / 2 + (i % 2 ? 30 : -30)); g.stroke(); }
  }));
}

// ---------------- efeitos presos ao corpo ----------------
class CaseHandFx {
  constructor(scene, c) {
    this.scene = scene; this.c = c; this.v = new THREE.Vector3();
    this.bc = makeBriefcase(); this.bc.visible = false; scene.add(this.bc);
    this.glow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), add(0xffe080, 0)); scene.add(this.glow);
  }
  update(dt, f, model, sp) {
    this.bc.visible = false; this.glow.material.opacity = 0;
    if (!sp || f.t >= sp.startup) return; // no frame de spawn a maleta "sai" da mão
    bodyPoint(this.v, f, model, 'righthand', { dx: 0.35, y: f.stats.height * 0.55 });
    const q = clamp01(f.t / sp.startup), s = (this.c.big ? 1.3 : 1.05) * (0.4 + 0.6 * clamp01(f.t / 4));
    this.bc.visible = true;
    this.bc.position.set(this.v.x - f.facing * 0.1 * q, this.v.y + q * 0.25, this.v.z + 0.2);
    this.bc.rotation.set(0, 0, -f.facing * q * 0.9);
    this.bc.scale.setScalar(s);
    if ((sp.boost || 1) > 1.05) { this.glow.material.opacity = 0.35 + Math.sin(f.t * 0.9) * 0.15; this.glow.position.copy(this.bc.position).setZ(this.bc.position.z - 0.1); }
  }
  dispose() { this.scene.remove(this.bc, this.glow); }
}

class CoinFlickFx {
  constructor(scene) {
    this.scene = scene; this.v = new THREE.Vector3();
    const side = std(0xd9a520, { metalness: 0.85, roughness: 0.3 }), face = new THREE.MeshStandardMaterial({ map: coinTexture(), metalness: 0.5, roughness: 0.35 });
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 20), [side, face, face]); this.coin.visible = false; scene.add(this.coin);
    this.glint = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: starTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); this.glint.visible = false; scene.add(this.glint);
  }
  update(dt, f, model, sp) {
    this.coin.visible = false; this.glint.visible = false;
    if (!sp || f.t >= sp.startup) return;
    bodyPoint(this.v, f, model, 'righthand', { dx: 0.35, y: f.stats.height * 0.55 });
    const flip = clamp01((f.t - (sp.startup - 7)) / 7); // últimos frames: sobe girando do polegar
    this.coin.visible = true;
    this.coin.position.set(this.v.x + f.facing * 0.05, this.v.y + 0.08 + Math.sin(flip * Math.PI) * 0.45, this.v.z + 0.2);
    this.coin.rotation.set(Math.PI / 2 + flip * 14, 0, 0);
    this.glint.visible = flip > 0.3;
    if (this.glint.visible) { this.glint.position.copy(this.coin.position).setZ(this.coin.position.z + 0.1); this.glint.rotation.z = f.t * 0.3; this.glint.scale.setScalar(0.6 + Math.sin(flip * Math.PI) * 0.8); }
  }
  dispose() { this.scene.remove(this.coin, this.glint); }
}
let _star;
function starTex() {
  return (_star ||= canvasTex(64, 64, (g, w, h) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,230,1)'); r.addColorStop(1, 'rgba(255,220,80,0)');
    g.fillStyle = r; g.beginPath(); g.moveTo(32, 0); g.lineTo(37, 27); g.lineTo(64, 32); g.lineTo(37, 37); g.lineTo(32, 64); g.lineTo(27, 37); g.lineTo(0, 32); g.lineTo(27, 27); g.closePath(); g.fill();
  }));
}

export const VORCARO_FX = { caseHand: CaseHandFx, coinFlick: CoinFlickFx };
