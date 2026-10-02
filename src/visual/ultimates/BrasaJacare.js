// ULTIMATE do Capitão Brasa — "Efeito Colateral" (procedural, sem GLB).
// Cinemática: uma SERINGA GIGANTE cai do céu e espeta o braço dele → nuvem VERDE explode → ele incha em 3 pulsos
// e vira um JACARÉ bípede enorme de terno, faixa verde-amarela, cabelo de lado e o celular na mão (filmando).
// Modelagem v2 orgânica, acabamento vinil/toy como o Polvão (nada de caixas) — ver makeJacare().
// Golpes: hits pares = MORDIDA (avança, abre a bocarra e fecha no alvo no frame do dano); ímpares = RABADA (gira 360°
// com a cauda esticada). Finalizador curto: morde e faz o "ROLO DA MORTE" (gira em torno do próprio eixo) e bate;
// água do espelho d'água espirra. Contato só quando a lógica confirma (f.ultRes[k] === 'hit').
// Fim: nova nuvem verde e o Capitão volta.
import * as THREE from 'three';
import { Tentacle } from '../fx/Tentacle.js';
import { Puffs, Rings, std, clamp01, smooth, easeIn, easeOut, mergeParts } from '../fx/common.js';

const GREEN = 0x4a8f3c, BELLY = 0xd8e8a0, SUIT = 0x34405e, HAIR = 0x6b5a4a;
const UP_DOWN = new THREE.Vector3(0, -1, 0);

// ---- modelagem "vinil/toy" (mesmo acabamento do Polvão): só formas lisas — esferas achatadas, cápsulas, torno (Lathe),
// toros — com segmentos suficientes. Cada parte rígida é UMA malha (geometria fundida com cor por vértice, mergeParts):
// ~20 draw calls no bicho inteiro.
const VINYL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.02 });
const solid = (parts) => { const m = new THREE.Mesh(mergeParts(parts), VINYL); m.castShadow = true; return m; };
const S = (r, ...a) => new THREE.SphereGeometry(r, a[0] ?? 24, a[1] ?? 16, ...a.slice(2));
const C = (r, len, rs = 16) => new THREE.CapsuleGeometry(r, len, 6, rs);
const CONE = (r, h) => new THREE.ConeGeometry(r, h, 10);
const lathe = (pts, phiStart = 0, phiLen = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32, phiStart, phiLen);
const HALF = Math.PI / 2;

// fileira de dentes (cones) de x0 a x1 nos dois lados (z = ±z)
function teethParts(out, { x0, x1, step, y, z, r = 0.05, h = 0.16, up = false }) {
  for (let x = x0; x <= x1 + 1e-6; x += step) for (const s of [-1, 1]) out.push({ geo: CONE(r, h), color: 0xfffaf0, p: [x, y, s * z], r: [up ? 0 : Math.PI, 0, 0] });
}

function makeJacare() {
  const root = new THREE.Group(); // +X = frente
  const DARK = 0x2f5f2a, SUIT_L = 0x3d4658, TIE = 0x1fa34a, YEL = 0xffd400, WHITE = 0xf6f6f2, BLACK = 0x111111;
  // ---- pernas: coxas GROSSAS, canela curta, pé comprido com dedos ----
  const legParts = [];
  for (const s of [-1, 1]) {
    legParts.push(
      { geo: S(0.46), color: GREEN, p: [-0.12, 1.2, s * 0.5], s: [1.0, 1.32, 0.9] },
      { geo: C(0.25, 0.55), color: GREEN, p: [0.0, 0.55, s * 0.52], r: [0, 0, 0.18] },
      { geo: S(0.33), color: GREEN, p: [0.3, 0.16, s * 0.52], s: [1.65, 0.5, 1.05] },
    );
    for (let i = -1; i <= 1; i++) {
      legParts.push({ geo: C(0.08, 0.14, 10), color: GREEN, p: [0.75, 0.12, s * 0.52 + i * 0.17], r: [0, 0, -HALF] });
      legParts.push({ geo: CONE(0.06, 0.16), color: WHITE, p: [0.92, 0.11, s * 0.52 + i * 0.17], r: [0, 0, -HALF] });
    }
  }
  root.add(solid(legParts));
  // ---- tronco (inclinado pra frente): barriga clara em forma de pera + PALETÓ aberto na frente (lapelas), gravata
  // verde-amarela, colarinho e a FAIXA presidencial em diagonal ----
  const torso = new THREE.Group(); torso.position.set(0, 1.5, 0); torso.rotation.z = -0.3; root.add(torso);
  const prof = [[0, 0], [0.42, 0.03], [0.66, 0.28], [0.75, 0.72], [0.68, 1.22], [0.52, 1.62], [0.34, 1.9], [0, 2.0]];
  const jacketProf = prof.slice(1, 7).map(([r, y]) => [r * 1.06 + 0.02, y]);
  const gap = 0.62; // meia-abertura do paletó na frente (+X = phi π/2)
  const tp = [
    { geo: lathe(prof), color: BELLY, s: [1, 1, 0.86] },
    { geo: lathe(jacketProf, HALF + gap, Math.PI * 2 - gap * 2), color: SUIT, s: [1, 1, 0.86] },
    { geo: S(0.22), color: SUIT, p: [0.18, 1.55, 0.52] }, { geo: S(0.22), color: SUIT, p: [0.18, 1.55, -0.52] }, // ombreiras
    { geo: C(0.035, 0.55, 8), color: 0x86b85a, p: [0.74, 0.62, 0], r: [HALF, 0, 0] }, // escamas da barriga
    { geo: C(0.035, 0.6, 8), color: 0x86b85a, p: [0.76, 0.42, 0], r: [HALF, 0, 0] },
    { geo: C(0.035, 0.5, 8), color: 0x86b85a, p: [0.7, 0.2, 0], r: [HALF, 0, 0] },
    { geo: new THREE.TorusGeometry(0.34, 0.07, 10, 28), color: WHITE, p: [0.2, 1.86, 0], r: [HALF, 0.35, 0] }, // colarinho
    { geo: S(0.1), color: TIE, p: [0.5, 1.72, 0], s: [0.8, 1, 1] },                                             // nó
    { geo: new THREE.ConeGeometry(0.15, 0.95, 4), color: TIE, p: [0.74, 1.2, 0], r: [Math.PI, Math.PI / 4, 0.3], s: [0.55, 1, 0.55] },
    { geo: new THREE.ConeGeometry(0.1, 0.3, 4), color: YEL, p: [0.67, 1.45, 0], r: [Math.PI, Math.PI / 4, 0.3], s: [0.55, 1, 0.55] },
    { geo: new THREE.TorusGeometry(0.84, 0.085, 10, 48), color: TIE, p: [0, 0.98, 0], r: [HALF, 0.62, 0], s: [1, 0.88, 1] }, // faixa
    { geo: new THREE.TorusGeometry(0.87, 0.05, 8, 48), color: YEL, p: [0, 0.98, 0], r: [HALF, 0.62, 0], s: [1, 0.88, 1] },
    { geo: C(0.33, 0.5), color: GREEN, p: [0.36, 1.95, 0], r: [0, 0, -0.7] },                                    // pescoço
  ];
  for (const s of [-1, 1]) tp.push({ geo: C(0.09, 0.75, 10), color: SUIT_L, p: [0.66, 1.3, s * 0.36], r: [s * 0.28, 0, -0.22], s: [0.45, 1, 1] }); // lapelas
  for (let i = 0; i < 4; i++) tp.push({ geo: CONE(0.11, 0.26), color: DARK, p: [-0.8 + i * 0.05, 0.45 + i * 0.38, 0], r: [0, 0, HALF] }); // cristas
  torso.add(solid(tp));
  // ---- braços (manga do terno + punho branco + mão verde com garras); o da frente segura o celular ----
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(0.25, 1.5, s * 0.68); torso.add(arm);
    arm.add(solid([{ geo: C(0.18, 0.45), color: SUIT, p: [0, -0.38, 0] }]));
    const fore = new THREE.Group(); fore.position.y = -0.8; arm.add(fore);
    const fp = [
      { geo: C(0.14, 0.36), color: GREEN, p: [0, -0.3, 0] },
      { geo: new THREE.TorusGeometry(0.15, 0.05, 8, 18), color: WHITE, p: [0, -0.06, 0], r: [HALF, 0, 0] },
      { geo: S(0.18), color: GREEN, p: [0, -0.66, 0], s: [1, 0.9, 1.1] },
    ];
    for (let i = -1; i <= 1; i++) fp.push({ geo: CONE(0.045, 0.18), color: WHITE, p: [0.06, -0.84, i * 0.1], r: [0, 0, Math.PI] });
    fore.add(solid(fp));
    arms.push({ arm, fore, s });
  }
  const chrome = std(0xbbbbbb, { metalness: 0.7, roughness: 0.3 });
  const selfie = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), chrome); stick.position.y = 0.6; selfie.add(stick);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.52, 0.05), std(0x111111)); phone.position.set(0, 1.25, 0); selfie.add(phone);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.46), new THREE.MeshStandardMaterial({ color: 0x9ad0ff, emissive: 0x4a90e2, emissiveIntensity: 1.2 }));
  screen.position.set(-0.03, 1.25, 0); screen.rotation.y = -Math.PI / 2; selfie.add(screen);
  selfie.position.y = -0.7; selfie.rotation.z = -1.1; arms[1].fore.add(selfie);
  // ---- cabeça: crânio arredondado, focinho COMPRIDO e redondo, OLHOS grandes (pálpebra de cara de "tá ok"),
  // cabelo penteado de lado com risca ----
  const head = new THREE.Group(); head.position.set(0.95, 2.1, 0); torso.add(head);
  const hp = [
    { geo: S(0.5), color: GREEN, p: [0, 0.12, 0], s: [1.15, 0.82, 0.95] },
    { geo: C(0.27, 1.2), color: GREEN, p: [1.0, 0.0, 0], r: [0, 0, HALF], s: [0.72, 1, 1.25] },     // focinho
    { geo: S(0.28), color: GREEN, p: [1.68, 0.04, 0], s: [1, 0.72, 1.3] },                          // ponta do focinho
    { geo: S(0.52, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), color: HAIR, p: [-0.1, 0.3, 0], s: [1.12, 0.78, 1.0] }, // cabelo
    { geo: S(0.3), color: HAIR, p: [0.3, 0.58, -0.1], r: [0.3, 0, -0.4], s: [1.35, 0.5, 1.15] },   // topete jogado de lado
    { geo: C(0.022, 0.55, 6), color: 0xc9b79a, p: [-0.08, 0.66, 0.26], r: [0.25, 0, HALF] },      // risca
  ];
  for (const s of [-1, 1]) hp.push(
    { geo: S(0.08), color: DARK, p: [1.84, 0.18, s * 0.13] },                                     // narinas
    { geo: S(0.28), color: GREEN, p: [0.12, 0.42, s * 0.27] },                                    // órbita
    { geo: S(0.24), color: WHITE, p: [0.2, 0.47, s * 0.35] },                                     // olho
    { geo: S(0.11), color: BLACK, p: [0.34, 0.46, s * 0.52] },                                    // pupila
    { geo: S(0.04, 10, 8), color: 0xffffff, p: [0.37, 0.52, s * 0.62] },                          // brilho
    { geo: S(0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), color: GREEN, p: [0.2, 0.5, s * 0.36], r: [s * 0.35, 0, -0.35] }, // pálpebra
  );
  teethParts(hp, { x0: 0.55, x1: 1.75, step: 0.2, y: -0.2, z: 0.28 });
  head.add(solid(hp));
  // mandíbula articulada
  const jaw = new THREE.Group(); jaw.position.set(0.3, -0.22, 0); head.add(jaw);
  const jp = [
    { geo: C(0.22, 1.1), color: GREEN, p: [0.74, -0.05, 0], r: [0, 0, HALF], s: [0.68, 1, 1.18] },
    { geo: S(0.32), color: BELLY, p: [0.1, -0.08, 0], s: [1.3, 0.7, 1] },
    { geo: C(0.15, 0.95), color: BELLY, p: [0.72, -0.13, 0], r: [0, 0, HALF], s: [0.5, 1, 1.35] },
    { geo: S(0.2), color: 0xd0607a, p: [0.65, 0.07, 0], s: [2.2, 0.3, 1] },
  ];
  teethParts(jp, { x0: 0.4, x1: 1.3, step: 0.2, y: 0.12, z: 0.22, up: true });
  jaw.add(solid(jp));
  // cauda (cadeia de ossos) afinando, com cristas
  const tail = new Tentacle({ length: 3.4, radius: 0.44, tipRadius: 0.05, segments: 10, radial: 16, suckers: false, color: GREEN, under: BELLY, roughness: 0.38 });
  tail.curve = new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()));
  root.add(tail.object);
  const crest = std(DARK, { roughness: 0.4 });
  for (let k = 1; k < 8; k += 1) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.1 * (1 - k / 11), 0.24 * (1 - k / 11), 8), crest);
    c.position.set(0, tail.segLen * 0.5, -(0.44 * (1 - k / 10)) - 0.02); c.rotation.x = -Math.PI / 2; tail.bones[k].add(c);
  }
  return { root, torso, head, jaw, arms, tail };
}

function makeSyringe() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 14), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.4, roughness: 0.1 }));
  glass.position.y = 1.0;
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 12), std(0x5ef08a, { emissive: 0x1f7a3a, emissiveIntensity: 0.4 }));
  liquid.position.y = 0.8;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), std(0x888888)); rod.position.y = 2.1;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), std(0xdddddd)); cap.position.y = 2.6;
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), std(0xdddddd)); flange.position.y = 1.7;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.005, 0.7, 6), std(0xd8d8d8, { metalness: 0.8, roughness: 0.2 })); needle.position.y = -0.05;
  g.add(glass, liquid, rod, cap, flange, needle);
  g.scale.setScalar(1.5);
  g.userData = { liquid, rod, cap };
  return g;
}

export class BrasaJacare {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root); this.root = root;
    this.body = new THREE.Group(); root.add(this.body);
    this.J = makeJacare(); this.body.add(this.J.root);
    this.syringe = makeSyringe(); this.syringe.visible = false; scene.add(this.syringe);
    this.gas = new Puffs(root, 24, 0x6ee05a, { opacity: 0.8 });
    this.gasDark = new Puffs(root, 10, 0x2e7d32, { opacity: 0.75 });
    this.water = new Puffs(scene, 18, 0xcfefff, { lit: true, opacity: 0.85 });
    this.rings = new Rings(scene, 4, 0x8ff07a);
    this.k = 0; this.gassed = false; this.gassedOut = true; this.lunge = 0; this.jawOpen = 0; this.spin = 0; this.roll = 0; this.lastSplash = -1;
    this.tmp = new THREE.Vector3();
  }

  tailPose(now, stiff) {
    const P = this.J.tail.curve.points;
    for (let j = 0; j < 5; j++) {
      const sway = stiff ? 0 : Math.sin(now * 2.2 + j * 0.9) * 0.22 * j;
      const y = stiff ? 1.35 - j * 0.06 : [1.35, 1.1, 0.65, 0.4, 0.32][j];
      P[j].set(-0.55 - j * 0.78, y, sway);
    }
    this.J.tail.curve.needsUpdate = true;
    this.J.tail.setCurve(this.J.tail.curve, UP_DOWN);
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

    // ---- seringa (só na cinemática, antes da nuvem) ----
    const sOn = on && cine >= 0 && cine > 38;
    this.syringe.visible = sOn;
    if (sOn) {
      const armX = f.x - f.facing * 0.1, armY = f.y + f.stats.height * 0.62;
      const fall = clamp01((75 - cine) / 14);              // 14 frames caindo
      const stuck = cine <= 61;
      const out = clamp01((46 - cine) / 8);                 // sai e some
      const y = stuck ? armY + 0.05 : armY + (1 - easeIn(fall)) * 7.5;
      this.syringe.position.set(armX + f.facing * 0.55 * (1 - out * 0.3), y + out * 3, 0.35);
      this.syringe.rotation.z = f.facing * 0.5 + (stuck ? Math.sin(now * 60) * 0.03 : 0);
      this.syringe.scale.setScalar(1.5 * (1 - out));
      const inj = stuck ? clamp01((61 - cine) / 12) : 0;   // êmbolo desce, líquido some
      this.syringe.userData.liquid.scale.y = 1 - inj * 0.95; this.syringe.userData.liquid.position.y = 0.8 - inj * 0.45;
      this.syringe.userData.rod.position.y = 2.1 - inj * 0.9; this.syringe.userData.cap.position.y = 2.6 - inj * 0.9;
    }
    // ---- nuvem verde na virada (ida e volta) ----
    const at = this.tmp.set(0, 1.3, 0);
    if (!this.gassed && this.k > 0.42 && target > this.k) {
      this.gassed = true; this.gassedOut = false;
      this.gas.burst(at, { count: 20, spread: 2.4, up: 1.8, speed: 2.8, size: 0.9, grow: 2.6, life: 0.95 });
      this.gasDark.burst(at, { count: 10, spread: 2.0, up: 1.2, speed: 2.2, size: 0.8, grow: 2.4, life: 0.8 });
      this.rings.spawn(f.x, 0.04, { from: 0.4, to: 4, life: 0.6, opacity: 0.8 });
    }
    if (!this.gassedOut && this.k < 0.42 && target < this.k) {
      this.gassedOut = true; this.gassed = false;
      this.gas.burst(at, { count: 12, spread: 2.0, up: 1.2, speed: 2.2, size: 0.8, grow: 2.2, life: 0.9 });
    }
    if (!on) { this.gassed = false; this.gassedOut = true; this.lastSplash = -1; }
    this.gas.update(dt); this.gasDark.update(dt); this.water.update(dt); this.rings.update(dt);

    // só aparece quando a nuvem já cobre a troca (k > 0.4); cresce em 3 pulsos cartunescos
    const g = clamp01((k - 0.4) / 0.6);
    const vis = g > 0.001;
    this.body.visible = vis;
    if (!vis) { this.root.visible = this.syringe.visible || this.gas.items.some((p) => p.life > 0); return; }
    const pulse = 1 + 0.16 * Math.abs(Math.sin(g * Math.PI * 3)) * (1 - g);
    this.body.scale.setScalar(Math.max(0.01, 0.25 + 0.75 * smooth(g)) * pulse);
    const yaw = f.facing > 0 ? 0 : Math.PI;
    const o = f.opponent, d = Math.abs(o.x - f.x);
    const J = this.J;

    // ---- golpes ----
    let lunge = 0, jaw = 0.18 + Math.sin(now * 2) * 0.05, spin = 0, roll = 0, lean = -0.3, lift = 0, stiff = false;
    if (on && cine < 0) {
      for (let h = 0; h < u.hits; h++) {
        const hitF = 12 + h * u.interval;
        if (f.t < hitF - 8 || f.t > hitF + 7) continue;
        if (h % 2 === 0) { // MORDIDA
          const q = clamp01((f.t - (hitF - 8)) / 8);
          const reach = clamp01((d - 2.2) / 2.5) * 2.2;
          lunge = f.t <= hitF ? easeIn(q) * reach : reach * (1 - smooth((f.t - hitF) / 7));
          jaw = f.t < hitF ? 0.2 + q * 0.75 : 0.04;
          lean = -0.3 - 0.45 * (f.t <= hitF ? q : 1 - (f.t - hitF) / 7);
        } else { // RABADA: gira 360° com a cauda dura
          const q = clamp01((f.t - (hitF - 6)) / 12);
          spin = -f.facing * Math.PI * 2 * smooth(q); stiff = q > 0 && q < 1; lean = -0.15;
        }
      }
      // finalizador: morde e faz o rolo da morte
      if (f.t >= fin - 10 && f.t <= fin + 18) {
        const q = clamp01((f.t - (fin - 10)) / 10);
        const reach = clamp01((d - 2.2) / 2.5) * 2.2;
        lunge = f.t <= fin ? easeIn(q) * reach : reach;
        jaw = f.t < fin ? 0.2 + q * 0.9 : 0.03;
        lean = -0.75;
        if (f.t > fin) {
          const r = clamp01((f.t - fin) / 12);
          roll = Math.PI * 2 * smooth(r); lift = Math.sin(r * Math.PI) * 0.9;
          if (f.t >= fin + 12 && this.lastSplash !== fin) {
            this.lastSplash = fin;
            const sx = f.ultRes[u.hits] === 'hit' ? o.x : f.x + f.facing * 2.2;
            this.water.burst(new THREE.Vector3(sx, 0.2, 0.3), { count: 16, spread: 1.6, up: 4.5, speed: 2.5, size: 0.35, grow: 2.2, life: 0.8, gravity: 9 });
            this.rings.spawn(sx, 0.05, { from: 0.3, to: 4.5, life: 0.5, opacity: 0.9, color: 0xbfe9ff });
          }
        }
        if (f.t > fin + 12) lunge = reach * (1 - smooth((f.t - fin - 12) / 6));
      }
    }
    this.lunge += (lunge - this.lunge) * Math.min(1, dt * 18);
    this.jawOpen += (jaw - this.jawOpen) * Math.min(1, dt * 22);
    J.root.position.set(this.lunge * 0.9, lift, 0);
    J.root.rotation.set(0, 0, 0); J.root.rotation.y = yaw + spin; J.root.rotateX(roll);
    J.torso.rotation.z = lean + Math.sin(now * 2.2) * 0.02;
    J.jaw.rotation.z = -this.jawOpen;
    J.head.rotation.z = -0.1 + this.jawOpen * 0.25; // cabeça levanta ao abrir a boca
    // braços: o da câmera segura o celular na altura da cara; o outro balança/esperneia
    J.arms[1].arm.rotation.set(0, 0, -2.3 + Math.sin(now * 1.7) * 0.08); J.arms[1].fore.rotation.z = -0.9;
    J.arms[0].arm.rotation.set(0, 0, -0.6 + Math.sin(now * 2.6) * 0.25 + (this.jawOpen > 0.5 ? -0.8 : 0)); J.arms[0].fore.rotation.z = -0.9;
    this.tailPose(now, stiff);
  }

  dispose() { this.scene.remove(this.root, this.syringe); this.J.tail.dispose(); }
}
