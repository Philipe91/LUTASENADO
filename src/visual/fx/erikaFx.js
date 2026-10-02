// VFX da ERIKA HILTON (interface do SpecialFx: update(dt, f, model, sp) com sp = especial ativo ou null)
//   micHand    — Discurso de Impacto: microfone sobe até a boca; no disparo, 3 pulsos rosa saem da boca (a onda é o Hitter)
//   agulha     — Salto Agulha: 2 arcos rosa/dourado girando em volta das pernas + faíscas douradas no rastro
//   closeCerto — Close Certo: POSE (estrelinhas douradas piscando + aro rosa no chão pulsando). Se a lógica registrou o
//                counter (f.counterInfo): clarão de câmera + FOTO POLAROID "CLOSE CERTO" que pipoca e sobe
//   visual de Hitter: sonicWave (3 arcos rosa → dourado → branco, pulsando, com brilhos)
// Cores: rosa 0xff5fa8, dourado 0xffc46b, branco. Terno preto 0x151515 (ARTE.md: energia = aditivo).
import * as THREE from 'three';
import { Puffs, Rings, Shards, std, canvasTex, clamp01, easeOut, smooth, add, flat, bodyPoint } from './common.js';
import { flashTexture, starTexture, roundRect, star } from './nikolasFx.js';

export const PINK = 0xff5fa8, GOLD = 0xffc46b;

export function makeMic() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.3, 10), std(0x1a1a1a, { metalness: 0.5, roughness: 0.4 })); handle.position.y = 0.15;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.05, 10), std(PINK, { roughness: 0.4 })); band.position.y = 0.24;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), std(0xc8c8c8, { metalness: 0.85, roughness: 0.3 })); ball.position.y = 0.36;
  const foam = new THREE.Mesh(new THREE.SphereGeometry(0.079, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), std(0xff8ac4, { roughness: 0.95 })); foam.position.y = 0.36;
  for (const m of [handle, ball]) m.castShadow = true;
  g.add(handle, band, ball, foam); g.scale.setScalar(1.5);
  return g;
}
const sprite = (tex, w, h, extra = {}) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...extra })); s.scale.set(w, h, 1); s.visible = false; s.renderOrder = 8; return s; };
let starTex = null; const sTex = () => (starTex ||= starTexture());

function polaroidTexture() {
  return canvasTex(400, 480, (g, w, h) => {
    g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 10; roundRect(g, 10, 10, w - 20, h - 20, 14); g.fill(); g.stroke();
    const grd = g.createLinearGradient(0, 40, 0, 360); grd.addColorStop(0, '#ff8fc8'); grd.addColorStop(0.5, '#ff5fa8'); grd.addColorStop(1, '#5a1238');
    g.fillStyle = grd; g.fillRect(34, 34, w - 68, 320);
    g.strokeStyle = '#111'; g.lineWidth = 6; g.strokeRect(34, 34, w - 68, 320);
    // silhueta elegante: cabeça + ombros + mão na cintura
    g.fillStyle = '#1a0a14';
    g.beginPath(); g.arc(w / 2, 140, 44, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 70, 354); g.lineTo(w / 2 - 60, 200); g.quadraticCurveTo(w / 2, 170, w / 2 + 60, 200); g.lineTo(w / 2 + 70, 354); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w / 2 + 55, 215); g.lineTo(w / 2 + 110, 250); g.lineTo(w / 2 + 70, 290); g.closePath(); g.fill();
    // brilho de flash e estrelas
    const fl = g.createRadialGradient(w / 2 + 90, 90, 0, w / 2 + 90, 90, 120); fl.addColorStop(0, 'rgba(255,255,255,.95)'); fl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fl; g.fillRect(34, 34, w - 68, 320);
    star(g, 70, 70, 18, '#ffd400', '#111'); star(g, w - 70, 320, 14, '#ffd400', '#111'); star(g, 90, 320, 12, '#fff', '#111');
    g.font = 'bold 60px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round';
    g.lineWidth = 8; g.strokeStyle = '#111'; g.strokeText('CLOSE CERTO', w / 2, h - 44);
    g.fillStyle = '#ff3fa4'; g.fillText('CLOSE CERTO', w / 2, h - 44);
  });
}

// ---------------- DISCURSO DE IMPACTO: microfone na mão + pulsos na boca ----------------
class MicHandFx {
  constructor(scene) {
    this.scene = scene; this.hand = new THREE.Vector3(); this.head = new THREE.Vector3();
    this.mic = makeMic(); this.mic.visible = false; scene.add(this.mic);
    this.pulses = Array.from({ length: 3 }, () => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 32, 1, -Math.PI / 3, (Math.PI * 2) / 3), add(PINK, 0)); m.visible = false; scene.add(m); return m;
    });
  }
  update(dt, f, model, sp) {
    this.mic.visible = false; for (const p of this.pulses) p.visible = false;
    if (!sp || f.t > sp.startup + 14) return;
    bodyPoint(this.hand, f, model, 'righthand', { dx: 0.3, y: f.stats.height * 0.62 });
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const q = smooth(f.t / Math.max(1, sp.startup));
    this.mic.visible = true;
    this.mic.position.set(this.hand.x + (this.head.x + f.facing * 0.22 - this.hand.x) * q, this.hand.y + (this.head.y - 0.3 - this.hand.y) * q, 0.3);
    this.mic.rotation.z = -f.facing * (0.3 + q * 0.5);
    this.mic.scale.setScalar(1.5 * Math.min(1, f.t / 3, (sp.startup + 14 - f.t) / 4));
    this.pulses.forEach((p, i) => {
      const age = f.t - sp.startup - i * 3;
      if (age < 0 || age > 10) return;
      const k = age / 10;
      p.visible = true;
      p.position.set(this.head.x + f.facing * (0.3 + k * 0.8), this.head.y - 0.1, 0.4);
      p.rotation.set(0, 0, f.facing > 0 ? 0 : Math.PI);
      p.scale.setScalar(0.6 + k * 1.4); p.material.opacity = 0.9 * (1 - k);
    });
  }
  dispose() { this.scene.remove(this.mic, ...this.pulses); }
}

// ---------------- SALTO AGULHA: arcos girando + faíscas ----------------
class AgulhaFx {
  constructor(scene) {
    this.scene = scene;
    this.arcs = [PINK, GOLD].map((c) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 40, 1, 0, Math.PI * 1.2), add(c, 0)); m.visible = false; scene.add(m); return m; });
    this.sparks = Array.from({ length: 10 }, () => { const s = sprite(sTex(), 0.25, 0.25, { blending: THREE.AdditiveBlending, color: GOLD }); scene.add(s); return { s, life: 0 }; });
    this.dust = new Puffs(scene, 6, 0xf0d8e8, { opacity: 0.5 });
    this.lastSpark = -1; this.fired = -1;
  }
  update(dt, f, model, sp) {
    this.dust.update(dt);
    for (const q of this.sparks) {
      if (q.life <= 0) continue;
      q.life -= dt; q.s.position.y += dt * 0.8; q.s.material.opacity = clamp01(q.life / 0.25); q.s.material.rotation += dt * 6;
      if (q.life <= 0) q.s.visible = false;
    }
    const active = sp && f.t >= sp.startup && f.t < sp.startup + sp.active + 3;
    for (const a of this.arcs) a.visible = !!active;
    if (!sp) { this.fired = -1; return; }
    if (f.t >= sp.startup && this.fired !== f.hitId) { this.fired = f.hitId; this.dust.burst(new THREE.Vector3(f.x - f.facing * 0.3, 0.15, 0.2), { count: 4, spread: 0.6, up: 1.2, speed: 1.5, size: 0.3, grow: 2.2, life: 0.4, z: 0 }); }
    if (!active) return;
    const k = (f.t - sp.startup) / Math.max(1, sp.active);
    this.arcs.forEach((a, i) => {
      a.position.set(f.x + f.facing * 0.25, f.y + 0.9 + (i ? 0.1 : -0.1), 0.35 + i * 0.05);
      a.rotation.set(0.5, 0, f.t * (i ? -0.9 : 0.75) * f.facing);
      a.scale.setScalar(0.9 + k * 0.5 + i * 0.15);
      a.material.opacity = 0.85 * (1 - k * k);
    });
    if (f.t !== this.lastSpark) {
      this.lastSpark = f.t;
      for (let n = 0; n < 2; n++) {
        const q = this.sparks.find((s) => s.life <= 0); if (!q) break;
        q.life = 0.25; q.s.visible = true; q.s.material.color.setHex(n ? PINK : GOLD);
        q.s.position.set(f.x - f.facing * (0.2 + Math.random() * 0.6), f.y + 0.4 + Math.random() * 1.1, 0.5);
        const sz = 0.18 + Math.random() * 0.2; q.s.scale.set(sz, sz, 1); q.s.material.opacity = 1;
      }
    }
  }
  dispose() { this.scene.remove(...this.arcs, ...this.sparks.map((q) => q.s)); }
}

// ---------------- CLOSE CERTO: pose → (counter) flash + polaroid ----------------
class CloseCertoFx {
  constructor(scene) {
    this.scene = scene; this.head = new THREE.Vector3();
    this.twinkles = Array.from({ length: 5 }, () => { const s = sprite(sTex(), 0.3, 0.3, { blending: THREE.AdditiveBlending, color: 0xfff1c0 }); scene.add(s); return s; });
    this.floor = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 48), flat(PINK, 0, { side: THREE.DoubleSide })); this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = 0.03; this.floor.visible = false; scene.add(this.floor);
    this.flash = sprite(flashTexture(), 1, 1, { blending: THREE.AdditiveBlending }); scene.add(this.flash);
    this.photo = sprite(polaroidTexture(), 1.25, 1.5); this.photo.renderOrder = 9; scene.add(this.photo);
    this.rings = new Rings(scene, 2, 0xffffff);
    this.confetti = new Shards(scene, 12, new THREE.PlaneGeometry(0.09, 0.09), new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide }));
    this.seenSeq = -1; this.shot = -1;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt); this.confetti.update(dt);
    const now = performance.now() / 1000;
    // foto depois do counter continua mesmo se o especial já virou o contra-ataque (sp.countered) ou acabou
    if (this.shot >= 0) {
      this.shot += dt;
      const q = this.shot / 1.0;
      this.flash.visible = q < 0.25; this.photo.visible = q < 1;
      if (this.flash.visible) { const sz = 2 + easeOut(q / 0.25) * 5; this.flash.scale.set(sz, sz, 1); this.flash.material.opacity = 1 - q / 0.25; }
      const pop = q < 0.12 ? 1.4 * easeOut(q / 0.12) : q < 0.2 ? 1.4 - 0.4 * ((q - 0.12) / 0.08) : 1;
      this.photo.scale.set(1.25 * pop, 1.5 * pop, 1);
      this.photo.position.y = this.photoY + Math.max(0, q - 0.5) * 1.2;
      this.photo.material.rotation = -0.12 + Math.sin(q * 6) * 0.04;
      this.photo.material.opacity = q > 0.8 ? (1 - q) / 0.2 : 1;
      if (q >= 1) this.shot = -1;
    } else { this.flash.visible = this.photo.visible = false; }
    if (f.counterInfo && f.counterInfo.seq !== this.seenSeq) {
      this.seenSeq = f.counterInfo.seq; this.shot = 0;
      bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.9 });
      this.flash.position.set(this.head.x + f.facing * 0.4, this.head.y, 0.6);
      this.photo.position.set(f.x + f.facing * 0.9, this.photoY = f.y + 1.9, 0.8);
      this.rings.spawn(this.head.x, this.head.y - 0.4, { flat: false, from: 0.3, to: 3.2, life: 0.35, opacity: 0.9, z: 0.5 });
      this.confetti.burst(new THREE.Vector3(f.x + f.facing * 0.5, f.y + 1.6, 0.4), { count: 12, speed: 2.5, up: 4, life: 0.9, size: 1, gravity: 9 });
    }
    const posing = sp && !sp.countered && f.t >= sp.startup && f.t < sp.startup + sp.active;
    for (const s of this.twinkles) s.visible = !!posing;
    this.floor.visible = !!posing;
    if (!posing) return;
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.9 });
    const k = (f.t - sp.startup) / sp.active;
    this.twinkles.forEach((s, i) => {
      const a = now * 3 + i * 1.26, tw = 0.5 + 0.5 * Math.sin(now * 14 + i * 2.1);
      s.position.set(this.head.x + Math.cos(a) * 0.55 - f.facing * 0.1, this.head.y - 0.55 + Math.sin(a * 1.3) * 0.6 + 0.3, 0.5 + Math.sin(a) * 0.2);
      const sz = 0.16 + tw * 0.22; s.scale.set(sz, sz, 1); s.material.opacity = 0.5 + tw * 0.5; s.material.rotation = a;
    });
    this.floor.position.x = f.x; this.floor.scale.setScalar(1 + 0.15 * Math.sin(now * 12));
    this.floor.material.opacity = 0.75 * (1 - k * 0.6);
  }
  dispose() { this.scene.remove(...this.twinkles, this.floor, this.flash, this.photo); }
}

export const ERIKA_FX = { micHand: MicHandFx, agulha: AgulhaFx, closeCerto: CloseCertoFx };

// ---------------- visual de Hitter: DISCURSO DE IMPACTO (onda sonora) ----------------
export const ERIKA_VISUALS = {
  sonicWave: {
    build() {
      const g = new THREE.Group();
      // cada arco tem um contorno escuro atrás (lê no chão claro — como as ondas do Rugido)
      const arcs = [[PINK, 0.62, 0.8], [GOLD, 0.42, 0.56], [0xffffff, 0.24, 0.34]].map(([c, r0, r1], i) => {
        const dark = new THREE.Mesh(new THREE.RingGeometry(r0 - 0.04, r1 + 0.04, 40, 1, -Math.PI / 2.6, Math.PI / 1.3), flat(0x3a0f28, 0.55, { side: THREE.DoubleSide }));
        dark.position.set(-i * 0.18, 0, 0.02 * i - 0.01); g.add(dark);
        const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 40, 1, -Math.PI / 2.6, Math.PI / 1.3), add(c, 0.9)); m.position.set(-i * 0.18, 0, 0.02 * i); m.userData.dark = dark; g.add(m); return m;
      });
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), add(PINK, 0.25)); glow.position.x = -0.3; g.add(glow);
      const sparks = Array.from({ length: 4 }, () => { const s = sprite(sTex(), 0.22, 0.22, { blending: THREE.AdditiveBlending, color: GOLD }); s.visible = true; g.add(s); return s; });
      g.userData = { arcs, glow, sparks, center: true };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, now = performance.now() / 1000;
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      const inK = clamp01(h.t / 5), outK = clamp01((h.delay + h.life - h.t) / 8), k = Math.min(inK, outK) * (h.spent ? 0 : 1);
      u.arcs.forEach((a, i) => { const s = k * (1 + 0.15 * Math.sin(now * 22 + i * 1.5)); a.scale.setScalar(s); a.material.opacity = 0.95 * k; a.userData.dark.scale.setScalar(s); a.userData.dark.material.opacity = 0.55 * k; });
      u.glow.scale.setScalar(k * (1 + 0.2 * Math.sin(now * 18))); u.glow.material.opacity = 0.25 * k;
      u.sparks.forEach((s, i) => {
        const a = now * 7 + i * 1.57;
        s.position.set(-0.5 - i * 0.22 + Math.sin(a) * 0.1, Math.cos(a * 1.1) * 0.5, 0.2);
        const sz = (0.12 + 0.12 * Math.abs(Math.sin(a * 2))) * k; s.scale.set(sz, sz, 1); s.material.rotation = a;
      });
    },
  },
};
