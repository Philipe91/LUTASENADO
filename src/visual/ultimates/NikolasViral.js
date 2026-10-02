// ULTIMATE do Nikolas — "VIRALIZOU" (procedural; ele continua ele mesmo, com o celular erguido).
// Cinemática (75 frames): selfie com FLASH → contador de views acima da cabeça pipoca 10K → 100K → 1M, e os overlays
// LIKE / SHARE / COMENTÁRIO / SEGUIR estouram em volta dele enquanto corações sobem.
// Golpes: a cada hit uma NOTIFICAÇÃO (card) sai de trás dele, atravessa a arena e bate no alvo no frame do dano
// (contato só se f.ultRes[k] === 'hit'; errou → passa direto e some). Entre elas, uma PAREDE de notificações menores
// (sem dano) corre o tempo todo pelo inimigo. Finalizador: o card gigante "1.000.000" cai em cima do alvo.
// Cor extra da ultimate: ciano-notificação 0x3cc8ff (ARTE.md §2).
import * as THREE from 'three';
import { Rings, Puffs, canvasTex, clamp01, easeIn, easeOut, smooth, bodyPoint } from '../fx/common.js';
import { makePhone, flashTexture, starTexture, heartTexture, roundRect, heart, star, CYAN } from '../fx/nikolasFx.js';

const sprite = (tex, w, h, extra = {}) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...extra })); s.scale.set(w, h, 1); s.visible = false; s.renderOrder = 8; return s; };

// contador de views: olho + número, estilo placa de live
function counterTexture(text, big) {
  return canvasTex(512, 200, (g, w, h) => {
    g.fillStyle = big ? '#ffd400' : '#0b0b12'; g.strokeStyle = '#111'; g.lineWidth = 10; roundRect(g, 8, 8, w - 16, h - 16, 40); g.fill(); g.stroke();
    // olho
    g.strokeStyle = big ? '#111' : '#3cc8ff'; g.lineWidth = 9; g.beginPath(); g.ellipse(80, h / 2, 46, 28, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = big ? '#111' : '#3cc8ff'; g.beginPath(); g.arc(80, h / 2, 16, 0, Math.PI * 2); g.fill();
    g.font = `bold ${text.length > 4 ? 78 : 118}px Bangers, Impact, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 10; g.strokeStyle = '#111'; g.strokeText(text, 150, h / 2 + 6);
    g.fillStyle = big ? '#e0262b' : '#fff'; g.fillText(text, 150, h / 2 + 6);
  });
}
// overlay de rede social: pílula colorida com ícone + palavra
function overlayTexture(label, color, icon) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = color; g.strokeStyle = '#111'; g.lineWidth = 10; roundRect(g, 8, 8, w - 16, h - 16, 70); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(78, h / 2, 48, 0, Math.PI * 2); g.fill();
    icon(g, 78, h / 2);
    g.font = 'bold 86px Bangers, Impact, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 9; g.strokeStyle = '#111'; g.strokeText(label, 142, h / 2 + 6);
    g.fillStyle = '#fff'; g.fillText(label, 142, h / 2 + 6);
  });
}
// notificação: card branco com ícone colorido e texto
function notifTexture(title, body, color, icon) {
  return canvasTex(512, 170, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 9; roundRect(g, 6, 6, w - 12, h - 12, 28); g.fill(); g.stroke();
    g.fillStyle = color; g.beginPath(); g.arc(70, h / 2, 44, 0, Math.PI * 2); g.fill();
    icon(g, 70, h / 2);
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#0b0b12'; g.font = '900 38px Inter, Arial, sans-serif'; g.fillText(title, 130, 58);
    g.fillStyle = '#3b4a66'; g.font = '700 32px Inter, Arial, sans-serif'; g.fillText(body, 130, 112);
    g.fillStyle = '#3cc8ff'; g.beginPath(); g.arc(w - 44, 44, 12, 0, Math.PI * 2); g.fill();
  });
}
const ICON = {
  heart: (g, x, y) => heart(g, x, y + 4, 22, '#ff3fa4'),
  share: (g, x, y) => { g.strokeStyle = '#1d4ed8'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 24, y + 18); g.quadraticCurveTo(x - 20, y - 14, x + 18, y - 12); g.stroke(); g.beginPath(); g.moveTo(x + 2, y - 28); g.lineTo(x + 24, y - 12); g.lineTo(x + 2, y + 6); g.stroke(); },
  comment: (g, x, y) => { g.fillStyle = '#1fa34a'; roundRect(g, x - 26, y - 20, 52, 36, 12); g.fill(); g.beginPath(); g.moveTo(x - 10, y + 14); g.lineTo(x - 16, y + 28); g.lineTo(x + 4, y + 14); g.fill(); g.fillStyle = '#fff'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(x + i * 13, y - 2, 4, 0, Math.PI * 2); g.fill(); } },
  follow: (g, x, y) => { g.strokeStyle = '#b026c9'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x + 20, y); g.moveTo(x, y - 20); g.lineTo(x, y + 20); g.stroke(); },
  bell: (g, x, y) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y - 6, 18, Math.PI, 0); g.lineTo(x + 18, y + 12); g.lineTo(x + 26, y + 20); g.lineTo(x - 26, y + 20); g.lineTo(x - 18, y + 12); g.closePath(); g.fill(); g.beginPath(); g.arc(x, y + 26, 7, 0, Math.PI * 2); g.fill(); },
  star: (g, x, y) => star(g, x, y + 2, 22, '#fff'),
  eye: (g, x, y) => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, 24, 14, 0, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); },
};
const NOTIFS = [
  ['NOVO SEGUIDOR', '+48.000 em 1 min', '#b026c9', ICON.follow],
  ['999+ CURTIDAS', 'o feed inteiro curtiu', '#ff3fa4', ICON.heart],
  ['COMENTÁRIO', '"KKKKKK ele voou"', '#1fa34a', ICON.comment],
  ['COMPARTILHADO', '50K vezes agora', '#1d4ed8', ICON.share],
  ['EM ALTA', '#1 no país', '#f59e0b', ICON.star],
  ['AO VIVO', '1.000.000 assistindo', '#e0262b', ICON.eye],
  ['NOTIFICAÇÃO', 'você foi marcado', '#3cc8ff', ICON.bell],
];
const OVERLAYS = [['LIKE', '#e0262b', ICON.heart], ['SHARE', '#1d4ed8', ICON.share], ['COMENTÁRIO', '#1fa34a', ICON.comment], ['SEGUIR', '#b026c9', ICON.follow]];

export class NikolasViral {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    this.hand = new THREE.Vector3(); this.head = new THREE.Vector3();
    this.phone = makePhone(); this.phone.visible = false; scene.add(this.phone);
    this.flash = sprite(flashTexture(), 1, 1, { blending: THREE.AdditiveBlending }); scene.add(this.flash);
    this.starS = sprite(starTexture(), 1, 1, { blending: THREE.AdditiveBlending }); scene.add(this.starS);
    this.counters = ['10K', '100K', '1M'].map((t, i) => { const s = sprite(counterTexture(t, i === 2), 2.2, 0.86); scene.add(s); return s; });
    this.overlays = OVERLAYS.map(([l, c, ic]) => { const s = sprite(overlayTexture(l, c, ic), 2.0, 0.62); scene.add(s); return s; });
    const notifTex = NOTIFS.map(([t, b, c, ic]) => notifTexture(t, b, c, ic));
    this.cards = Array.from({ length: 7 }, (_, i) => { const s = sprite(notifTex[i % notifTex.length], 1.9, 0.63); s.renderOrder = 9; scene.add(s); return s; });
    this.wall = Array.from({ length: 8 }, (_, i) => { const s = sprite(notifTex[(i * 3) % notifTex.length], 1.3, 0.43); scene.add(s); return { s, t0: -1, y: 1, z: 0 }; });
    this.big = sprite(counterTexture('1.000.000', true), 4.0, 1.56); this.big.renderOrder = 10; scene.add(this.big);
    const ht = heartTexture();
    this.hearts = Array.from({ length: 12 }, () => { const s = sprite(ht, 0.3, 0.3); scene.add(s); return { s, life: 0, max: 1, vx: 0 }; });
    this.rings = new Rings(scene, 4, CYAN);
    this.sparks = new Puffs(scene, 16, 0xbfefff, { opacity: 0.85 });
    this.lastHeart = -1; this.boomed = new Set(); this.wasOn = false;
  }

  hideAll() {
    for (const s of [this.phone, this.flash, this.starS, this.big, ...this.counters, ...this.overlays, ...this.cards]) s.visible = false;
    for (const w of this.wall) { w.s.visible = false; w.t0 = -1; }
    this.boomed.clear();
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    this.rings.update(dt); this.sparks.update(dt);
    for (const h of this.hearts) {
      if (h.life <= 0) continue;
      h.life -= dt; h.s.position.y += dt * 1.3; h.s.position.x += h.vx * dt;
      const k = 1 - h.life / h.max; h.s.material.opacity = k < 0.1 ? k / 0.1 : 1 - Math.max(0, k - 0.6) / 0.4;
      const sz = 0.22 + 0.12 * Math.sin(k * 9); h.s.scale.set(sz, sz, 1);
      if (h.life <= 0) h.s.visible = false;
    }
    if (!on) { if (this.wasOn) this.hideAll(); this.wasOn = false; return; }
    this.wasOn = true;
    const u = f.ultimate, o = f.opponent, fac = f.facing;
    const hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6;
    bodyPoint(this.hand, f, model, 'righthand', { dx: 0.3, y: f.stats.height * 0.6 });
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.9 });
    const now = performance.now() / 1000;

    // ---- celular erguido o tempo todo; tela pulsa ----
    this.phone.visible = true;
    const up = cine >= 0 ? smooth((75 - cine) / 8) : 1;
    this.phone.position.set(this.hand.x + fac * 0.3 * up, this.hand.y + (this.head.y + 0.5 - this.hand.y) * up, 0.35);
    this.phone.rotation.set(0.12, fac * 0.45, -fac * 0.15 + Math.sin(now * 3) * 0.04);
    this.phone.scale.setScalar(1.5);

    // ---- corações subindo (a live inteira) ----
    const frameNow = cine >= 0 ? 1000 - cine : f.t;
    if (frameNow !== this.lastHeart && frameNow % 4 === 0) {
      this.lastHeart = frameNow;
      const h = this.hearts.find((q) => q.life <= 0);
      if (h) { h.life = h.max = 0.9 + Math.random() * 0.4; h.vx = (Math.random() - 0.5) * 0.8; h.s.visible = true; h.s.position.set(f.x + fac * (0.2 + Math.random() * 0.8), f.y + 1.0 + Math.random() * 0.6, 0.5 + Math.random() * 0.3); }
    }

    // ---- CINEMÁTICA: flash → contadores → overlays ----
    const fl = cine >= 0 ? 66 - cine : -1; // flash no frame 66 (9 frames depois do close)
    this.flash.visible = this.starS.visible = fl >= 0 && fl < 10;
    if (this.flash.visible) {
      const q = fl / 10, sz = 1.5 + easeOut(q) * 5;
      this.flash.position.copy(this.phone.position).add(new THREE.Vector3(fac * 0.2, 0, 0.1)); this.flash.scale.set(sz, sz, 1); this.flash.material.opacity = 1 - q * q;
      this.starS.position.copy(this.flash.position); this.starS.scale.set(sz * 1.6, sz * 1.6, 1); this.starS.material.opacity = 0.9 * (1 - q); this.starS.material.rotation = q * 1.2;
    }
    const stages = [60, 44, 26]; // frame da cinemática (contado do início) em que cada contador entra
    this.counters.forEach((s, i) => {
      const born = stages[i], age = cine >= 0 ? (75 - cine) - born : (i === 2 ? 1000 : -1);
      const next = i < 2 ? stages[i + 1] : 1e9, dieAt = next - born;
      s.visible = age >= 0 && age < dieAt && cine >= 0;
      if (!s.visible) return;
      const pop = age < 4 ? (i === 2 ? 1.7 : 1.3) * easeOut(age / 4) : age < 7 ? (i === 2 ? 1.7 : 1.3) - (i === 2 ? 0.5 : 0.3) * ((age - 4) / 3) : i === 2 ? 1.2 : 1;
      const w = i === 2 ? 1.7 : 1.35, h = w * 0.39; // close da cinemática: a câmera está perto, placa pequena já enche
      s.scale.set(w * pop, h * pop, 1);
      s.position.set(this.head.x - fac * 0.1, this.head.y + 0.75 + (i === 2 ? 0.1 : 0) + Math.sin(now * 5) * 0.03, 0.5);
      s.material.rotation = (i === 2 ? -0.06 : 0.04) * fac;
      if (i === 2 && age === 0 && !this.boomed.has('1M')) { this.boomed.add('1M'); this.rings.spawn(this.head.x, this.head.y + 1.0, { flat: false, from: 0.3, to: 4, life: 0.45, opacity: 0.9, z: 0.4 }); }
    });
    this.overlays.forEach((s, i) => {
      const born = 56 + i * 7, age = cine >= 0 ? (75 - cine) - born : -1;
      s.visible = age >= 0 && age < 26;
      if (!s.visible) return;
      const pop = age < 4 ? 1.35 * easeOut(age / 4) : age < 7 ? 1.35 - 0.35 * ((age - 4) / 3) : 1;
      const side = i % 2 ? 1 : -1;
      s.position.set(f.x + side * (0.75 + i * 0.08) * fac, f.y + 0.7 + i * 0.3 + age * 0.012, 0.8);
      s.scale.set(1.1 * pop, 0.34 * pop, 1);
      s.material.rotation = side * 0.1;
      s.material.opacity = age > 18 ? (26 - age) / 8 : 1;
    });

    // ---- GOLPES: notificações (uma por hit) ----
    const inHits = cine < 0;
    this.cards.forEach((s, h) => {
      if (h >= u.hits || !inHits) { s.visible = false; return; }
      const hitF = 12 + h * u.interval, born = hitF - 9;
      const t = f.t - born;
      if (t < 0 || t > 16) { s.visible = false; return; }
      const start = new THREE.Vector3(f.x - fac * 1.6, f.y + 0.9 + (h % 3) * 0.45, 0.3 + (h % 2) * 0.25);
      const tgt = new THREE.Vector3(o.x, o.y + o.stats.height * (0.45 + (h % 3) * 0.15), 0.5);
      const q = clamp01(t / 9);
      const hit = f.ultRes[h] === 'hit';
      s.visible = true;
      if (f.t <= hitF) {
        s.position.lerpVectors(start, tgt, easeIn(q));
        s.position.y += Math.sin(q * Math.PI) * 0.6;
        const sc = 0.6 + q * 0.6; s.scale.set(1.9 * sc, 0.63 * sc, 1); s.material.opacity = Math.min(1, t / 2);
        s.material.rotation = -fac * (0.35 - q * 0.3);
      } else {
        const r = (f.t - hitF) / 7;
        if (hit) { // bate e estoura
          s.position.copy(tgt); s.position.y += Math.sin(r * 10) * 0.03;
          const sc = 1.25 - r * 0.5; s.scale.set(1.9 * sc, 0.63 * sc, 1); s.material.opacity = 1 - r;
          if (!this.boomed.has(h)) { this.boomed.add(h); this.rings.spawn(tgt.x, tgt.y, { flat: false, from: 0.2, to: 1.1, life: 0.28, opacity: 0.9, z: 0.6 }); this.sparks.burst(tgt, { count: 5, spread: 0.5, up: 1.4, speed: 2.2, size: 0.12, grow: 1.6, life: 0.3, z: 0.3 }); }
        } else { // errou: passa direto e some
          s.position.copy(tgt).add(new THREE.Vector3(fac * r * 2.2, r * 0.3, 0)); s.material.opacity = 1 - r; s.scale.set(1.9, 0.63, 1);
        }
      }
    });
    // ---- PAREDE de notificações (sem dano) correndo pelo inimigo ----
    for (const w of this.wall) {
      if (!inHits || f.t > hitsEnd + 4) { w.s.visible = false; w.t0 = -1; continue; }
      if (w.t0 < 0 && Math.random() < 0.08) { w.t0 = f.t; w.y = 0.3 + Math.random() * 2.2; w.z = -0.5 + Math.random() * 1.4; }
      if (w.t0 < 0) continue;
      const age = f.t - w.t0, x = f.x - fac * 1.3 + fac * age * 0.24;
      const past = (x - o.x) * fac;
      if (past > 2.6) { w.s.visible = false; w.t0 = -1; continue; }
      w.s.visible = true; w.s.position.set(x, f.y + w.y + Math.sin(age * 0.4) * 0.05, w.z);
      w.s.material.opacity = Math.min(1, age / 3, past > 1.4 ? (2.6 - past) / 1.2 : 1) * 0.9;
      w.s.material.rotation = -fac * 0.08;
    }
    // ---- FINALIZADOR: card gigante 1.000.000 cai sobre o alvo ----
    const bt = f.t - (fin - 10);
    this.big.visible = inHits && bt >= 0 && bt < 24;
    if (this.big.visible) {
      const hit = f.ultRes[u.hits] === 'hit';
      const tx = f.t < fin || hit ? o.x : o.x + fac * 1.2, ty = o.y + o.stats.height * 0.55;
      if (f.t < fin) { const q = easeIn(bt / 10); this.big.position.set(tx - fac * (1 - q) * 1.0, ty + (1 - q) * 5.5, 0.9); this.big.scale.set(4.0, 1.56, 1); this.big.material.opacity = 1; this.big.material.rotation = -fac * 0.1 * (1 - q); }
      else {
        const r = (f.t - fin) / 14;
        this.big.position.set(tx, ty + Math.sin(r * 14) * 0.04 * (1 - r), 0.9);
        const sq = r < 0.15 ? 1.15 : 1; this.big.scale.set(4.0 * sq, 1.56 / sq, 1); this.big.material.opacity = 1 - Math.max(0, r - 0.6) / 0.4; this.big.material.rotation = -fac * 0.06;
        if (!this.boomed.has('fin')) {
          this.boomed.add('fin');
          this.rings.spawn(tx, ty, { flat: false, from: 0.3, to: 3, life: 0.45, opacity: 1, z: 0.6 });
          this.rings.spawn(tx, 0.05, { from: 0.4, to: 3.5, life: 0.5, opacity: 0.8 });
          this.sparks.burst(new THREE.Vector3(tx, ty, 0.4), { count: 14, spread: 1.4, up: 2.5, speed: 3.5, size: 0.22, grow: 2.2, life: 0.5 });
          for (const h of this.hearts) { if (h.life > 0) continue; h.life = h.max = 0.8 + Math.random() * 0.5; h.vx = (Math.random() - 0.5) * 2.5; h.s.visible = true; h.s.position.set(tx + (Math.random() - 0.5) * 1.5, ty + (Math.random() - 0.5), 0.6); }
        }
      }
    }
  }

  dispose() {
    this.scene.remove(this.phone, this.flash, this.starS, this.big, ...this.counters, ...this.overlays, ...this.cards, ...this.wall.map((w) => w.s), ...this.hearts.map((h) => h.s));
  }
}
