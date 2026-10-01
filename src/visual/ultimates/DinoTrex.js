// ULTIMATE do Dino Supremo — "T-Rex de Terno" (procedural, sem GLB).
// Cinemática: os ÓCULOS saem do rosto, são limpos, voltam e CRESCEM; os botões do terno estouram voando pra câmera;
// nuvem de poeira cobre a troca e o T-REX cresce: paletó rasgado nas costas, gravata de pegadinhas, óculos
// retangulares, cabelo grisalho pra trás e BRACINHOS. Gag: de vez em quando tenta ajeitar os óculos e não alcança.
// Golpes: 0 e 3 = MORDIDA (avança e fecha a bocarra no alvo), 1 = RABADA (gira 360°), 2 = PISÃO (levanta a perna e
// bate; poeira). Finalizador: ruge pro céu e um METEORO cai no alvo (no chão à frente, se errou).
import * as THREE from 'three';
import { Tentacle } from '../fx/Tentacle.js';
import { Puffs, Rings, Shards, std, clamp01, smooth, easeIn, easeOut, canvasTex, add, flat } from '../fx/common.js';

const SKIN = 0x5c7a3a, BELLY = 0xb8c48a, SUIT = 0x55595f, HAIR = 0xb9b9b9;
const UP_DOWN = new THREE.Vector3(0, -1, 0);

function teeth(parent, { from, to, step, z, y, dir, size = 0.3 }) {
  const mat = std(0xffffff, { roughness: 0.3 });
  for (let x = from; x <= to; x += step) for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(size * 0.3, size, 6), mat);
    t.position.set(x, y, s * z); t.rotation.x = dir > 0 ? 0 : Math.PI; parent.add(t);
  }
}
function tieTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#4f6b3a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a3a1e';
    for (let i = 0; i < 6; i++) { const y = 20 + i * 40, x = i % 2 ? 18 : 40; g.beginPath(); g.ellipse(x, y, 7, 10, 0, 0, Math.PI * 2); g.fill(); for (let t = -1; t <= 1; t++) { g.beginPath(); g.arc(x + t * 6, y - 13, 3, 0, Math.PI * 2); g.fill(); } }
  });
}
// óculos retangulares grossos (uma lente de cada lado + ponte sobre o focinho)
export function makeGlasses(scale = 1) {
  const g = new THREE.Group();
  const black = std(0x111111, { roughness: 0.4 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.35, roughness: 0.1 });
  for (const s of [-1, 1]) {
    const L = new THREE.Group(); L.position.z = s * 0.5;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.06), black); top.position.y = 0.22;
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.06), black); bot.position.y = -0.22;
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.06), black); l.position.x = -0.27;
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.06), black); r.position.x = 0.27;
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.42), lensMat); lens.rotation.y = s > 0 ? 0 : Math.PI;
    L.add(top, bot, l, r, lens); g.add(L);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 1.0), black); bridge.position.set(0.27, 0.22, 0); g.add(bridge);
  g.scale.setScalar(scale);
  return g;
}

function makeTrex() {
  const root = new THREE.Group(); // +X = frente
  const skin = std(SKIN, { roughness: 0.65 }), belly = std(BELLY, { roughness: 0.7 }), suit = std(SUIT);
  const B = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; return x; };
  // pernas (pivô no quadril) + pés com garras
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(-0.2, 2.2, s * 0.6); root.add(leg);
    const thigh = B(0.8, 1.3, 0.62, skin); thigh.position.set(0, -0.6, 0); leg.add(thigh);
    const shin = B(0.5, 1.1, 0.45, skin); shin.position.set(0.15, -1.55, 0); leg.add(shin);
    const foot = B(1.05, 0.3, 0.6, skin); foot.position.set(0.4, -2.05, 0); leg.add(foot);
    for (let i = -1; i <= 1; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), std(0xeeeeee)); c.position.set(0.98, -2.08, i * 0.18); c.rotation.z = -Math.PI / 2; leg.add(c); }
    legs.push(leg);
  }
  // corpo horizontal + barriga + paletó (meia-esfera nas costas) rasgado + botões
  const bodyG = new THREE.Group(); bodyG.position.y = 2.45; root.add(bodyG);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), skin); torso.scale.set(1.7, 1.05, 1.1); torso.castShadow = true; bodyG.add(torso);
  const tummy = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 12), belly); tummy.scale.set(1.5, 0.8, 0.9); tummy.position.set(0.25, -0.35, 0); bodyG.add(tummy);
  const jacket = new THREE.Mesh(new THREE.SphereGeometry(1.06, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), suit); jacket.scale.set(1.72, 1.08, 1.14); jacket.castShadow = true; bodyG.add(jacket);
  for (let i = 0; i < 7; i++) { // rasgos pendurados na borda do paletó
    const a = (i / 7) * Math.PI * 2;
    const flap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 3), suit);
    flap.position.set(Math.cos(a) * 1.68, -0.2, Math.sin(a) * 1.1); flap.rotation.set(Math.PI + Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); bodyG.add(flap);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 20), std(0xffffff)); collar.position.set(0.85, 0.55, 0); collar.rotation.set(Math.PI / 2, 0, -0.5); bodyG.add(collar);
  const tie = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.2), new THREE.MeshStandardMaterial({ map: tieTexture(), side: THREE.DoubleSide }));
  tie.position.set(1.45, -0.05, 0); tie.rotation.y = Math.PI / 2; tie.rotation.z = 0; bodyG.add(tie);
  const buttons = [];
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 10), std(0x222222)); b.position.set(1.2 - i * 0.2, -0.45 - i * 0.28, 0.45); b.rotation.z = Math.PI / 2; bodyG.add(b); buttons.push(b); }
  // bracinhos (pivô no ombro)
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(1.35, -0.25, s * 1.0); bodyG.add(arm); // fora do tronco, visível de lado
    const up = B(0.3, 0.6, 0.3, suit); up.position.y = -0.3; arm.add(up);
    const fore = new THREE.Group(); fore.position.y = -0.6; arm.add(fore);
    const low = B(0.24, 0.45, 0.24, skin); low.position.y = -0.22; fore.add(low);
    for (const c of [-1, 1]) { const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), std(0xeeeeee)); claw.position.set(0.1, -0.45, c * 0.06); claw.rotation.z = Math.PI / 2 + 0.6; fore.add(claw); }
    arms.push({ arm, fore });
  }
  // pescoço + cabeça
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 1.5, 12), skin); neck.position.set(1.35, 0.55, 0); neck.rotation.z = -0.6; neck.castShadow = true; bodyG.add(neck);
  const head = new THREE.Group(); head.position.set(1.9, 1.15, 0); bodyG.add(head);
  const skull = B(1.35, 0.95, 1.0, skin); skull.position.set(0.1, 0.1, 0); head.add(skull);
  const brow = B(0.9, 0.25, 1.1, skin); brow.position.set(0.35, 0.55, 0); head.add(brow);
  const upper = B(1.6, 0.52, 0.82, skin); upper.position.set(1.15, -0.15, 0); head.add(upper);
  teeth(head, { from: 0.55, to: 1.85, step: 0.26, z: 0.37, y: -0.45, dir: -1, size: 0.34 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), std(0xffffff, { roughness: 0.3 })); eye.position.set(0.35, 0.3, s * 0.45); head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), std(0x111111)); pupil.position.set(0.35, 0.3, s * 0.6); head.add(pupil);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0x2e3d1e)); nostril.position.set(1.9, 0.1, s * 0.2); head.add(nostril);
  }
  const glasses = makeGlasses(1); glasses.position.set(0.4, 0.3, 0); head.add(glasses);
  const hair = B(1.0, 0.26, 0.92, std(HAIR)); hair.position.set(-0.15, 0.68, 0); hair.rotation.z = 0.22; head.add(hair);
  for (let i = -1; i <= 1; i++) { const st = B(0.5, 0.12, 0.2, std(HAIR)); st.position.set(-0.75, 0.78 + i * 0.05, i * 0.3); st.rotation.z = 0.5; head.add(st); }
  const jaw = new THREE.Group(); jaw.position.set(0.35, -0.45, 0); head.add(jaw);
  const lower = B(1.55, 0.32, 0.74, skin); lower.position.set(0.75, -0.14, 0); jaw.add(lower);
  const tongue = B(0.9, 0.08, 0.42, std(0xd0607a)); tongue.position.set(0.75, 0.05, 0); jaw.add(tongue);
  teeth(jaw, { from: 0.35, to: 1.45, step: 0.26, z: 0.33, y: 0.05, dir: 1, size: 0.3 });
  // cauda
  const tail = new Tentacle({ length: 4.2, radius: 0.55, tipRadius: 0.07, segments: 8, suckers: false, color: SKIN, under: BELLY, roughness: 0.65 });
  tail.curve = new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()));
  root.add(tail.object);
  return { root, bodyG, head, jaw, arms, legs, tail, glasses, buttons };
}

export class DinoTrex {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root); this.root = root;
    this.body = new THREE.Group(); root.add(this.body);
    this.T = makeTrex(); this.body.add(this.T.root);
    // óculos "soltos" da cinemática (saem do rosto, são limpos, voltam e crescem)
    this.bigGlasses = makeGlasses(0.55); this.bigGlasses.visible = false; scene.add(this.bigGlasses);
    this.dust = new Puffs(root, 22, 0xb9a98a, { lit: true, opacity: 0.85 });
    this.dustDark = new Puffs(root, 10, 0x6e604e, { lit: true, opacity: 0.8 });
    this.buttons = new Shards(scene, 8, new THREE.CylinderGeometry(0.09, 0.09, 0.04, 10), std(0x222222));
    this.rings = new Rings(scene, 4, 0xffe0a0);
    this.stompDust = new Puffs(scene, 10, 0xcdbda0, { lit: true, opacity: 0.7 });
    // meteoro do finalizador
    this.meteor = new THREE.Group();
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), std(0x4a3a30, { emissive: 0xff5a1a, emissiveIntensity: 0.6 }));
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), add(0xff7a1a, 0.55));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.0, 10, 1, true), add(0xffb040, 0.5)); flame.position.y = 1.6;
    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4.0, 8, 1, true), add(0xfff0a0, 0.45)); flame2.position.y = 2.2;
    this.meteor.add(core, shell, flame, flame2); this.meteor.visible = false; scene.add(this.meteor);
    this.fire = new Puffs(scene, 12, 0xff8a2a, { opacity: 0.9 });
    this.smoke = new Puffs(scene, 10, 0x4a4a4a, { lit: true, opacity: 0.7 });
    this.rocks = new Shards(scene, 12, new THREE.DodecahedronGeometry(0.16, 0), std(0x6a5a48));
    this.scorch = new THREE.Mesh(new THREE.CircleGeometry(1.2, 28), flat(0x2a1a0a, 0)); this.scorch.rotation.x = -Math.PI / 2; this.scorch.position.y = 0.028; this.scorch.visible = false; scene.add(this.scorch);
    this.k = 0; this.dusted = false; this.dustedOut = true; this.lunge = 0; this.jawOpen = 0; this.boomed = -1; this.stomped = -1; this.scorchT = -1;
    this.tmp = new THREE.Vector3();
  }

  tailPose(now, stiff) {
    const P = this.T.tail.curve.points;
    for (let j = 0; j < 5; j++) {
      const sway = stiff ? 0 : Math.sin(now * 1.8 + j * 0.8) * 0.3 * j;
      P[j].set(-1.4 - j * 0.95, stiff ? 2.3 - j * 0.05 : [2.3, 2.3, 2.1, 1.75, 1.35][j], sway);
    }
    this.T.tail.curve.needsUpdate = true;
    this.T.tail.setCurve(this.T.tail.curve, UP_DOWN);
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 42) : clamp01((end - f.t) / 14);
    this.k += (target - this.k) * Math.min(1, dt * 8);
    const k = clamp01(this.k), now = performance.now() / 1000;
    this.hideBase = this.k > 0.5;
    this.root.position.set(f.x, f.y, 0);
    this.root.visible = true;
    const o = f.opponent, d = Math.abs(o.x - f.x);

    // ---- cinemática: óculos saem, são limpos, voltam e crescem; botões estouram ----
    const gOn = on && cine >= 0 && cine > 36;
    this.bigGlasses.visible = gOn;
    if (gOn) {
      const hb = model?.bones?.get('head');
      if (hb) hb.getWorldPosition(this.tmp); else this.tmp.set(f.x, f.y + f.stats.height * 0.9, 0);
      const faceX = this.tmp.x + f.facing * 0.2, faceY = this.tmp.y, handX = this.tmp.x + f.facing * 0.75, handY = this.tmp.y - 0.35;
      let x = faceX, y = faceY, rot = 0, s = 0.55;
      if (cine > 66) { const q = clamp01((75 - cine) / 9); x = faceX + (handX - faceX) * easeOut(q); y = faceY + (handY - faceY) * easeOut(q); }
      else if (cine > 56) { x = handX; y = handY; rot = Math.sin(now * 40) * 0.35; }                 // limpa (esfrega)
      else if (cine > 50) { const q = clamp01((56 - cine) / 6); x = handX + (faceX - handX) * easeOut(q); y = handY + (faceY - handY) * easeOut(q); }
      else { const q = clamp01((50 - cine) / 14); s = 0.55 + easeIn(q) * 3.2; rot = Math.sin(now * 50) * 0.08 * q; } // crescem tremendo
      this.bigGlasses.position.set(x, y, 0.1); this.bigGlasses.rotation.set(0, 0, rot); this.bigGlasses.scale.setScalar(s); // lente de frente pra câmera
    }
    const at = this.tmp.set(0, 1.5, 0);
    if (!this.dusted && this.k > 0.42 && target > this.k) {
      this.dusted = true; this.dustedOut = false;
      this.dust.burst(at, { count: 20, spread: 2.8, up: 1.6, speed: 3.0, size: 1.0, grow: 2.6, life: 1.0 });
      this.dustDark.burst(at, { count: 10, spread: 2.2, up: 1.0, speed: 2.4, size: 0.8, grow: 2.4, life: 0.85 });
      this.buttons.burst(new THREE.Vector3(f.x, f.y + 1.2, 0.3), { count: 6, speed: 3, up: 4, life: 1.2, spreadZ: 3, gravity: 8 });
      this.rings.spawn(f.x, 0.04, { from: 0.4, to: 4.5, life: 0.6, opacity: 0.8 });
    }
    if (!this.dustedOut && this.k < 0.42 && target < this.k) {
      this.dustedOut = true; this.dusted = false;
      this.dust.burst(at, { count: 12, spread: 2.0, up: 1.2, speed: 2.4, size: 0.9, grow: 2.2, life: 0.9 });
    }
    if (!on) { this.dusted = false; this.dustedOut = true; this.boomed = -1; this.stomped = -1; }
    this.dust.update(dt); this.dustDark.update(dt); this.buttons.update(dt); this.rings.update(dt); this.stompDust.update(dt);
    this.fire.update(dt); this.smoke.update(dt); this.rocks.update(dt);
    if (this.scorchT >= 0) { this.scorchT += dt; this.scorch.material.opacity = 0.75 * (1 - clamp01(this.scorchT / 1.4)); if (this.scorchT > 1.4) { this.scorchT = -1; this.scorch.visible = false; } }

    const g = clamp01((k - 0.4) / 0.6);
    const vis = g > 0.001;
    this.body.visible = vis;
    if (!vis) { this.root.visible = this.bigGlasses.visible || this.dust.items.some((p) => p.life > 0); return; }
    this.body.scale.setScalar(Math.max(0.01, 0.25 + 0.75 * smooth(g)));
    const yaw = f.facing > 0 ? 0 : Math.PI, T = this.T;

    // ---- golpes ----
    let lunge = 0, jaw = 0.15 + Math.sin(now * 1.8) * 0.05, spin = 0, headUp = 0, stiff = false, legLift = 0, bodyDip = 0;
    if (on && cine < 0) {
      for (let h = 0; h < u.hits; h++) {
        const hitF = 12 + h * u.interval;
        if (f.t < hitF - 9 || f.t > hitF + 8) continue;
        const kind = h === 1 ? 'tail' : h === 2 ? 'stomp' : 'bite';
        if (kind === 'bite') {
          const q = clamp01((f.t - (hitF - 9)) / 9);
          const reach = clamp01((d - 3.0) / 2.5) * 2.0;
          lunge = f.t <= hitF ? easeIn(q) * reach : reach * (1 - smooth((f.t - hitF) / 8));
          jaw = f.t < hitF ? 0.2 + q * 0.8 : 0.04;
          bodyDip = f.t <= hitF ? q * 0.5 : 0.5 * (1 - (f.t - hitF) / 8);
        } else if (kind === 'tail') {
          const q = clamp01((f.t - (hitF - 7)) / 14);
          spin = -f.facing * Math.PI * 2 * smooth(q); stiff = q > 0 && q < 1;
        } else {
          const q = clamp01((f.t - (hitF - 9)) / 9);
          legLift = f.t < hitF ? Math.sin(q * Math.PI * 0.5) * 1.1 : 0;
          if (f.t >= hitF && this.stomped !== hitF) {
            this.stomped = hitF;
            const sx = f.x + f.facing * 1.2;
            this.rings.spawn(sx, 0.05, { from: 0.3, to: 3.5, life: 0.45, opacity: 0.9, color: 0xd8b070 });
            this.stompDust.burst(new THREE.Vector3(sx, 0.2, 0.3), { count: 10, spread: 1.6, up: 2.0, speed: 2.8, size: 0.45, grow: 2.6, life: 0.6, z: 0 });
          }
        }
      }
      // finalizador: ruge pro céu e um meteoro cai
      if (f.t >= fin - 16 && f.t <= fin + 20) {
        const q = clamp01((f.t - (fin - 16)) / 8);
        headUp = f.t < fin + 6 ? 0.9 * q : 0.9 * (1 - clamp01((f.t - fin - 6) / 10));
        jaw = f.t < fin + 4 ? 0.2 + q * 0.95 : 0.1;
        const hit = f.ultRes[u.hits] === 'hit';
        const landX = f.t < fin || hit ? o.x : f.x + f.facing * (u.range + 1.5), landY = f.t < fin || hit ? o.y + 0.4 : 0.4;
        const fallOn = f.t >= fin - 10 && f.t < fin;
        this.meteor.visible = fallOn;
        if (fallOn) {
          const r = (f.t - (fin - 10)) / 10, kk = r * r;
          this.meteor.position.set(landX - f.facing * 3.5 * (1 - r), landY + (1 - kk) * 11, 0);
          this.meteor.rotation.set(0, now * 2, -f.facing * 0.35); this.meteor.scale.setScalar(1.1);
        }
        if (f.t >= fin && this.boomed !== fin) {
          this.boomed = fin;
          this.rings.spawn(landX, 0.05, { from: 0.3, to: 5, life: 0.5, opacity: 1, color: 0xffa040 });
          this.rings.spawn(landX, 0.8, { flat: false, from: 0.3, to: 3.5, life: 0.4, opacity: 0.8, z: 0.5, color: 0xffd080 });
          this.fire.burst(new THREE.Vector3(landX, 0.6, 0.2), { count: 12, spread: 1.8, up: 4, speed: 3.6, size: 0.6, grow: 2.2, life: 0.6 });
          this.smoke.burst(new THREE.Vector3(landX, 1.0, 0.2), { count: 10, spread: 1.6, up: 2.6, speed: 1.8, size: 0.7, grow: 2.8, life: 1.1 });
          this.rocks.burst(new THREE.Vector3(landX, 0.4, 0.2), { count: 12, speed: 4, up: 6.5, life: 1.0, size: 1.1 });
          this.scorch.visible = true; this.scorch.position.set(landX, 0.028, 0); this.scorchT = 0;
        }
      } else this.meteor.visible = false;
    } else this.meteor.visible = false;
    this.lunge += (lunge - this.lunge) * Math.min(1, dt * 18);
    this.jawOpen += (jaw - this.jawOpen) * Math.min(1, dt * 22);
    T.root.position.set(this.lunge, 0, 0);
    T.root.rotation.set(0, yaw + spin, 0);
    T.bodyG.position.y = 2.45 - bodyDip + Math.sin(now * 2) * 0.03;
    T.bodyG.rotation.z = -bodyDip * 0.35 + headUp * 0.15;
    T.jaw.rotation.z = -this.jawOpen;
    T.head.rotation.z = -0.1 + this.jawOpen * 0.2 + headUp;
    T.legs[0].rotation.z = legLift; T.legs[1].rotation.z = 0;
    // gag: a cada ~3 s tenta ajeitar os óculos com o bracinho e não alcança (os óculos escorregam no focinho)
    const ph = (now % 3.2) / 3.2;
    const tryK = ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) : 0;
    T.arms[1].arm.rotation.set(0, 0, -0.4 - tryK * 2.3); T.arms[1].fore.rotation.z = -0.8 - tryK * 0.6;
    T.arms[0].arm.rotation.set(0, 0, -0.3 + Math.sin(now * 2.4) * 0.2); T.arms[0].fore.rotation.z = -0.9;
    T.glasses.position.set(0.4 + tryK * 0.12, 0.3 - tryK * 0.1, 0); T.glasses.rotation.z = -tryK * 0.1;
    this.tailPose(now, stiff);
  }

  dispose() { this.scene.remove(this.root, this.bigGlasses, this.meteor, this.scorch); this.T.tail.dispose(); }
}
