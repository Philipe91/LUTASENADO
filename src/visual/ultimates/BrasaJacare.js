// ULTIMATE do Capitão Brasa — "Efeito Colateral" (procedural, sem GLB).
// Cinemática: uma SERINGA GIGANTE cai do céu e espeta o braço dele → nuvem VERDE explode → ele incha em 3 pulsos
// e vira um JACARÉ bípede enorme de terno, faixa verde-amarela, cabelo de lado e o celular na mão (filmando).
// Golpes: hits pares = MORDIDA (avança, abre a bocarra e fecha no alvo no frame do dano); ímpares = RABADA (gira 360°
// com a cauda esticada). Finalizador curto: morde e faz o "ROLO DA MORTE" (gira em torno do próprio eixo) e bate;
// água do espelho d'água espirra. Contato só quando a lógica confirma (f.ultRes[k] === 'hit').
// Fim: nova nuvem verde e o Capitão volta.
import * as THREE from 'three';
import { Tentacle } from '../fx/Tentacle.js';
import { Puffs, Rings, std, clamp01, smooth, easeIn, easeOut, canvasTex } from '../fx/common.js';

const GREEN = 0x3f7d3a, BELLY = 0x9ccf6a, SUIT = 0x2b2f36, HAIR = 0x6b5a4a;
const UP_DOWN = new THREE.Vector3(0, -1, 0);

function teeth(parent, { from, to, step, z, y, dir }) {
  const mat = std(0xffffff, { roughness: 0.3 });
  for (let x = from; x <= to; x += step) for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), mat);
    t.position.set(x, y, s * z); t.rotation.x = dir > 0 ? 0 : Math.PI; parent.add(t);
  }
}

function makeJacare() {
  const root = new THREE.Group(); // +X = frente
  const green = std(GREEN, { roughness: 0.6 }), belly = std(BELLY, { roughness: 0.7 }), suit = std(SUIT), chrome = std(0xbbbbbb, { metalness: 0.7, roughness: 0.3 });
  const B = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; return x; };
  // pernas + pés com garras
  for (const s of [-1, 1]) {
    const leg = B(0.6, 1.5, 0.52, green); leg.position.set(-0.1, 0.78, s * 0.45); root.add(leg);
    const foot = B(1.0, 0.26, 0.5, green); foot.position.set(0.2, 0.13, s * 0.45); root.add(foot);
    for (let i = -1; i <= 1; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 6), std(0xffffff)); c.position.set(0.75, 0.12, s * 0.45 + i * 0.15); c.rotation.z = -Math.PI / 2; root.add(c); }
  }
  // tronco (inclinado pra frente) com paletó, barriga, camisa, gravata e faixa
  const torso = new THREE.Group(); torso.position.set(0, 1.5, 0); torso.rotation.z = -0.3; root.add(torso);
  const jacket = B(1.15, 1.7, 1.05, suit); jacket.position.set(-0.05, 0.85, 0); torso.add(jacket);
  const chest = B(0.5, 1.5, 0.8, belly); chest.position.set(0.42, 0.8, 0); torso.add(chest);
  const shirt = B(0.1, 1.3, 0.45, std(0xffffff)); shirt.position.set(0.66, 0.85, 0); torso.add(shirt);
  const tie = B(0.08, 1.0, 0.16, std(0x1fa34a)); tie.position.set(0.72, 0.7, 0); torso.add(tie);
  const tie2 = B(0.085, 0.3, 0.17, std(0xffd400)); tie2.position.set(0.72, 0.95, 0); torso.add(tie2);
  const sash = B(0.1, 1.5, 0.26, std(0x1fa34a)); sash.position.set(0.7, 0.9, 0); sash.rotation.x = 0.65; torso.add(sash);
  const sash2 = B(0.105, 1.5, 0.1, std(0xffd400)); sash2.position.set(0.7, 0.9, 0); sash2.rotation.x = 0.65; torso.add(sash2);
  // cristas nas costas
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), std(0x2f5f2a)); c.position.set(-0.62, 0.3 + i * 0.4, 0); c.rotation.z = Math.PI / 2; torso.add(c); }
  // braços (mangas do terno + antebraço verde + mão com garras); o da frente segura o celular no pau de selfie
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(0.25, 1.5, s * 0.68); torso.add(arm);
    const upper = B(0.32, 0.8, 0.32, suit); upper.position.y = -0.4; arm.add(upper);
    const fore = new THREE.Group(); fore.position.y = -0.8; arm.add(fore);
    const lower = B(0.27, 0.62, 0.27, green); lower.position.y = -0.3; fore.add(lower);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), green); hand.position.y = -0.66; fore.add(hand);
    for (let i = -1; i <= 1; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), std(0xffffff)); c.position.set(0.08, -0.8, i * 0.1); c.rotation.z = Math.PI; fore.add(c); }
    arms.push({ arm, fore, s });
  }
  // celular no pau de selfie (braço da frente, lado da câmera)
  const selfie = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), chrome); stick.position.y = 0.6; selfie.add(stick);
  const phone = B(0.3, 0.52, 0.05, std(0x111111)); phone.position.set(0, 1.25, 0); selfie.add(phone);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.46), new THREE.MeshStandardMaterial({ color: 0x9ad0ff, emissive: 0x4a90e2, emissiveIntensity: 1.2 }));
  screen.position.set(-0.03, 1.25, 0); screen.rotation.y = -Math.PI / 2; selfie.add(screen);
  const rec = new THREE.Mesh(new THREE.CircleGeometry(0.04, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); rec.position.set(-0.031, 1.44, 0.07); rec.rotation.y = -Math.PI / 2; selfie.add(rec);
  selfie.position.y = -0.7; selfie.rotation.z = -1.1; arms[1].fore.add(selfie);
  // pescoço + cabeça
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 0.7, 10), green); neck.position.set(0.6, 1.8, 0); neck.rotation.z = -0.7; torso.add(neck);
  const head = new THREE.Group(); head.position.set(0.95, 2.1, 0); torso.add(head);
  const skull = B(0.95, 0.68, 0.82, green); skull.position.set(0, 0.1, 0); head.add(skull);
  const upper = B(1.55, 0.3, 0.72, green); upper.position.set(1.05, -0.05, 0); head.add(upper);
  const snout = B(0.3, 0.2, 0.5, green); snout.position.set(1.75, 0.08, 0); head.add(snout);
  teeth(head, { from: 0.55, to: 1.75, step: 0.24, z: 0.33, y: -0.25, dir: -1 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), std(0xffffff, { roughness: 0.3 })); eye.position.set(0.15, 0.5, s * 0.32); head.add(eye);
    const pupil = B(0.05, 0.22, 0.07, std(0x111111)); pupil.position.set(0.32, 0.5, s * 0.32); head.add(pupil);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std(0x1e3a1a)); nostril.position.set(1.85, 0.2, s * 0.14); head.add(nostril);
  }
  // cabelo penteado de lado (marca registrada)
  const hair = B(0.8, 0.22, 0.78, std(HAIR)); hair.position.set(-0.1, 0.52, 0); hair.rotation.x = 0.18; head.add(hair);
  const part = B(0.72, 0.03, 0.05, std(0xa08a70)); part.position.set(-0.1, 0.64, 0.22); part.rotation.x = 0.18; head.add(part);
  const fringe = B(0.3, 0.2, 0.7, std(HAIR)); fringe.position.set(0.3, 0.46, 0); fringe.rotation.z = 0.5; head.add(fringe);
  // mandíbula inferior articulada
  const jaw = new THREE.Group(); jaw.position.set(0.3, -0.2, 0); head.add(jaw);
  const lower = B(1.5, 0.22, 0.66, green); lower.position.set(0.72, -0.08, 0); jaw.add(lower);
  const tongue = B(0.9, 0.06, 0.4, std(0xd0607a)); tongue.position.set(0.75, 0.06, 0); jaw.add(tongue);
  const chin = B(0.5, 0.2, 0.6, belly); chin.position.set(0.3, -0.2, 0); jaw.add(chin);
  teeth(jaw, { from: 0.35, to: 1.4, step: 0.24, z: 0.3, y: 0.08, dir: 1 });
  // cauda (cadeia de ossos, sem ventosas) com cristas
  const tail = new Tentacle({ length: 3.4, radius: 0.42, tipRadius: 0.06, segments: 8, suckers: false, color: GREEN, under: BELLY, roughness: 0.6 });
  tail.curve = new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()));
  root.add(tail.object);
  for (let k = 1; k < 7; k++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.1 * (1 - k / 9), 0.26 * (1 - k / 9), 6), std(0x2f5f2a));
    c.position.set(0, tail.segLen * 0.5, -(0.42 * (1 - k / 8)) - 0.02); c.rotation.x = -Math.PI / 2; tail.bones[k].add(c);
  }
  return { root, torso, head, jaw, arms, tail, hair };
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
