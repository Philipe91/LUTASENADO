// ULTIMATE do Lulácio — "O Polvão do Povo" (procedural, sem GLB).
// Silhueta de POLVO: manto bojudo + saia + 8 tentáculos grossos com ventosas, deitados no chão em espiral e ondulando
// (cada um é uma SkinnedMesh guiada por curva — fx/Tentacle.js). Chapéu panamá, barba, bigode, gravata e microfone
// num tentáculo erguido até a boca.
// Sequência: Lulácio treme → NUVEM DE TINTA explode e cobre a troca → o polvo cresce do chão desenrolando os tentáculos
// → cada hit um tentáculo chicoteia o alvo NO frame do dano (só encosta se f.ultRes[k] === 'hit'; errou → bate no chão)
// → FINALIZADOR: o 9º tentáculo (gag: polvo de 9 tentáculos) sobe atrás do corpo e ESMAGA o alvo; tinta espirra.
// Fim: polvo encolhe numa nova nuvem de tinta e o Lulácio volta.
import * as THREE from 'three';
import { swapToGLB, PROP_GLB } from '../propModel.js';
import { Tentacle, lerpPoints } from '../fx/Tentacle.js';
import { Puffs, Rings, std, clamp01, smooth, easeIn, easeOut, flat } from '../fx/common.js';

const PURPLE = 0x6f3fd1, UNDER = 0xa98ae8, INK = 0x1a0a30;
const N_TENT = 8, SEG = 10;
const UP_GROUND = new THREE.Vector3(0, 0.55, 1).normalize();   // ventosas viradas pra câmera e pra cima
const UP_AIR = new THREE.Vector3(0, 0, 1);

function makeHead() {
  const g = new THREE.Group();
  const skin = std(PURPLE, { roughness: 0.5 });
  const mantle = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 24), skin);
  mantle.scale.set(1.1, 1.25, 1.0); mantle.position.y = 2.35; mantle.castShadow = true;
  const skirt = new THREE.Mesh(new THREE.SphereGeometry(1.2, 28, 16), skin);
  skirt.scale.set(1.35, 0.42, 1.15); skirt.position.y = 1.15; skirt.castShadow = true;
  g.add(mantle, skirt);
  const eyeW = std(0xffffff, { roughness: 0.3 }), eyeB = std(0x111111), browM = std(0xf4f4f4, { roughness: 0.95 });
  const pupils = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), eyeW); e.position.set(s * 0.52, 2.55, 1.0);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), eyeB); p.position.set(s * 0.52, 2.55, 1.28);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyeW); hl.position.set(s * 0.52 + 0.07, 2.63, 1.4);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.13, 0.12), browM); brow.position.set(s * 0.52, 2.95, 1.12); brow.rotation.z = s * 0.32;
    g.add(e, p, hl, brow); pupils.push(p);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), std(0x5a2fb0)); nose.position.set(0, 2.18, 1.32);
  const beardMat = std(0xf0f0f0, { roughness: 0.95 });
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.78, 22, 16), beardMat);
  beard.scale.set(1.15, 0.78, 0.6); beard.position.set(0, 1.42, 1.02);
  const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.62, 4, 10), beardMat);
  stache.rotation.z = Math.PI / 2; stache.position.set(0, 1.98, 1.42);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.06), std(0x4a1515)); mouth.position.set(0, 1.86, 1.5);
  g.add(nose, beard, stache, mouth);
  // chapéu panamá
  const straw = std(0xeadcab, { roughness: 0.85 }), band = std(0x1b1b1b);
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.45, 0.08, 32), straw); brim.position.y = 3.74;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, 0.7, 24), straw); crown.position.y = 4.08;
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.17, 24), band); hb.position.y = 3.86;
  for (const m of [brim, crown, hb]) m.castShadow = true;
  hat.add(brim, crown, hb); hat.rotation.set(0.1, 0, -0.12);
  // colarinho + gravata vermelha
  const collar = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.13, 10, 36), std(0xffffff)); collar.rotation.x = Math.PI / 2; collar.position.y = 1.52;
  const red = std(0xd01c1c);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.14), red); knot.position.set(0, 1.44, 1.2);
  const tie = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.0, 4), red); tie.position.set(0, 0.82, 1.28); tie.rotation.set(Math.PI + 0.25, Math.PI / 4, 0);
  g.add(hat, collar, knot, tie);
  g.userData.pupils = pupils;
  return g;
}

function makeMic() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.55, 10), std(0x1a1a1a, { metalness: 0.5 }));
  handle.position.y = 0.3;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), std(0xa8a8a8, { metalness: 0.8, roughness: 0.35 }));
  ball.position.y = 0.66;
  g.add(handle, ball); g.scale.setScalar(1.5);
  swapToGLB(g, PROP_GLB.microfonePolvo);
  return g;
}

export class LulacioPolvo {
  constructor(scene) {
    this.scene = scene;
    this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    this.root = root;
    this.body = new THREE.Group(); root.add(this.body);
    this.head = makeHead(); this.body.add(this.head);
    // 8 tentáculos (bases na saia) + o 9º, grosso, do finalizador
    this.tents = [];
    for (let i = 0; i < N_TENT; i++) {
      const a = (i / N_TENT) * Math.PI * 2 + Math.PI / 8;
      const t = new Tentacle({ length: 4.4, radius: 0.3, tipRadius: 0.04, segments: SEG, color: PURPLE, under: UNDER });
      t.a = a; t.o = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)); t.s = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      t.base = new THREE.Vector3(Math.cos(a) * 1.15, 1.0, Math.sin(a) * 1.0);
      t.curve = new THREE.CatmullRomCurve3(Array.from({ length: 6 }, () => new THREE.Vector3()));
      t.curve2 = new THREE.CatmullRomCurve3(Array.from({ length: 6 }, () => new THREE.Vector3()));
      t.blend = Array.from({ length: SEG + 1 }, () => new THREE.Vector3());
      t.strike = 0;
      this.body.add(t.object);
      this.tents.push(t);
    }
    this.slam = new Tentacle({ length: 6.5, radius: 0.5, tipRadius: 0.22, segments: 12, color: PURPLE, under: UNDER });
    this.slam.curve = new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()));
    this.slam.object.visible = false; this.body.add(this.slam.object);
    this.mic = makeMic(); this.tents[1].tip.add(this.mic); this.mic.position.y = -0.1;
    // tinta: nuvens escuras + poça no chão + anel roxo
    this.ink = new Puffs(root, 26, INK, { opacity: 0.95 });
    this.inkLight = new Puffs(root, 10, 0x5a2d8f, { opacity: 0.8 });
    this.pool = new THREE.Mesh(new THREE.CircleGeometry(1, 36), flat(INK, 0));
    this.pool.rotation.x = -Math.PI / 2; this.pool.position.y = 0.025; this.pool.visible = false; root.add(this.pool);
    this.rings = new Rings(scene, 4, 0xc58cff);
    this.dust = new Puffs(scene, 12, 0xcdbda0, { opacity: 0.75 });
    this.splats = Array.from({ length: 5 }, () => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), flat(INK, 0));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.visible = false; scene.add(m); return m;
    });
    this.k = 0; this.inked = false; this.inkedOut = true; this.poolT = -1; this.slammed = false;
    this.tmp = new THREE.Vector3(); this.tgtL = new THREE.Vector3(); this.world = new THREE.Vector3();
  }

  // ---------- curvas (espaço do corpo) ----------
  idleCurve(t, i, now, reach) {
    const P = t.curve.points, o = t.o, s = t.s, B = t.base;
    const w = (j, f = 1) => Math.sin(now * 2.2 + i * 0.9 + j * 1.1) * 0.1 * j * f;
    P[0].copy(B);
    P[1].copy(B).addScaledVector(o, 0.7).setY(0.62);
    P[2].copy(o).multiplyScalar(2.0 * reach).addScaledVector(s, w(2)).setY(0.3);
    P[3].copy(o).multiplyScalar(2.9 * reach).addScaledVector(s, 0.35 + w(3)).setY(0.3);
    P[4].copy(o).multiplyScalar(3.3 * reach).addScaledVector(s, 1.0 + w(4)).setY(0.34 + Math.abs(Math.sin(now * 2.6 + i)) * 0.12);
    P[5].copy(o).multiplyScalar(3.0 * reach).addScaledVector(s, 1.5 + w(5)).setY(0.72 + Math.sin(now * 2.5 + i * 1.3) * 0.25);
    t.curve.needsUpdate = true;
    return t.curve;
  }
  micCurve(t, now) {
    const P = t.curve.points, B = t.base;
    const bob = Math.sin(now * 3) * 0.04;
    P[0].copy(B);
    P[1].copy(B).addScaledVector(t.o, 0.9).setY(1.2);
    P[2].set(1.25, 1.5, 1.7);
    P[3].set(1.05, 1.95 + bob, 1.95);
    P[4].set(0.78, 2.15 + bob, 1.85);
    P[5].set(0.5, 2.0 + bob, 1.62);
    t.curve.needsUpdate = true;
    return t.curve;
  }
  // enrolado (transformação / close da cinemática): pende da saia e se enrola embaixo do corpo
  curledCurve(t, i, now) {
    const P = t.curve2.points, a = t.a;
    for (let j = 0; j < 6; j++) {
      const ang = a + j * 0.75 + Math.sin(now * 2 + i) * 0.1, r = 0.9 + j * 0.16;
      P[j].set(Math.cos(ang) * r, Math.max(0.3, 1.0 - j * 0.22), Math.sin(ang) * r * 0.85);
    }
    P[0].copy(t.base);
    t.curve2.needsUpdate = true;
    return t.curve2;
  }
  // chicote até E (espaço do corpo); q = progresso até o contato
  strikeCurve(t, E) {
    const P = t.curve2.points, B = t.base;
    P[0].copy(B);
    P[1].copy(B).addScaledVector(t.o, 0.5).setY(B.y + 1.9);
    P[2].lerpVectors(B, E, 0.45).setY(Math.max(B.y, E.y) + 2.3);
    P[3].lerpVectors(B, E, 0.8).setY(Math.max(B.y, E.y) + 1.2);
    P[4].lerpVectors(P[3], E, 0.6);
    P[5].copy(E);
    t.curve2.needsUpdate = true;
    return t.curve2;
  }

  toLocal(x, y, z) { return this.body.worldToLocal(this.world.set(x, y, z)); }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 42) : clamp01((end - f.t) / 14);
    this.k += (target - this.k) * Math.min(1, dt * 8);
    const k = smooth(clamp01(this.k)), now = performance.now() / 1000;
    this.hideBase = this.k > 0.5;
    this.root.position.set(f.x, f.y, 0);
    this.root.visible = true;

    // ---- tinta: explode na virada (ida e volta) ----
    const inkAt = this.tmp.set(0, 1.4, 0);
    if (!this.inked && this.k > 0.42 && target > this.k) {
      this.inked = true; this.inkedOut = false; this.poolT = 0;
      this.ink.burst(inkAt, { count: 22, spread: 2.6, up: 1.4, speed: 3.0, size: 1.0, grow: 2.6, life: 1.15 });
      this.inkLight.burst(inkAt, { count: 10, spread: 2.0, up: 2.2, speed: 2.0, size: 0.6, grow: 2.2, life: 0.9 });
      this.rings.spawn(f.x, 0.04, { from: 0.4, to: 4.5, life: 0.6, opacity: 0.8 });
    }
    if (!this.inkedOut && this.k < 0.42 && target < this.k) {
      this.inkedOut = true; this.inked = false; this.poolT = 0;
      this.ink.burst(inkAt, { count: 14, spread: 2.0, up: 1.0, speed: 2.2, size: 0.9, grow: 2.2, life: 0.9 });
    }
    if (!on) { this.inked = false; this.inkedOut = true; this.slammed = false; this.unf = 0; }
    this.ink.update(dt); this.inkLight.update(dt); this.rings.update(dt); this.dust.update(dt);
    if (this.poolT >= 0) {
      this.poolT += dt;
      const q = this.poolT / 1.6;
      this.pool.visible = q < 1;
      this.pool.scale.setScalar(0.3 + easeOut(q) * 3.4);
      this.pool.material.opacity = 0.85 * (1 - q * q);
      if (q >= 1) this.poolT = -1;
    }
    for (const s of this.splats) { if (!s.visible) continue; s.material.opacity -= dt * 0.9; if (s.material.opacity <= 0) s.visible = false; }

    // só aparece quando a tinta já cobre a troca (k > 0.4)
    const g = smooth(clamp01((k - 0.4) / 0.6));
    const vis = g > 0.001;
    this.body.visible = vis;
    if (!vis) { this.root.visible = this.ink.items.some((p) => p.life > 0) || this.pool.visible; return; }
    this.body.scale.setScalar(Math.max(0.01, 0.25 + 0.75 * g));
    this.body.rotation.y = f.facing > 0 ? 0.35 : -0.35;
    this.body.updateMatrixWorld(true);
    // respiração + olhar para o alvo
    const o = f.opponent;
    this.head.scale.set(1 + Math.sin(now * 2.4) * 0.015, 1 + Math.sin(now * 2.4 + 1) * 0.02, 1);
    const look = Math.sign(o.x - f.x) * 0.06;
    for (const p of this.head.userData.pupils) p.position.x = (p.position.x > 0 ? 0.52 : -0.52) + look;

    // ---- tentáculos ----
    // desenrola enquanto cresce; no close da cinemática fica meio enrolado (senão os tentáculos da frente tapam a câmera)
    this.unf = (this.unf ?? 0) + ((cine >= 0 ? 0.45 : 1) - (this.unf ?? 0)) * Math.min(1, dt * 5);
    const ku = smooth((this.k - 0.55) / 0.42) * this.unf;
    const tgtW = new THREE.Vector3(o.x, o.y + o.stats.height * 0.5, 0.15);
    const hitTent = (h) => [0, 7, 2, 6, 3, 5][h % 6];
    const toward = (t) => (Math.cos(t.a + this.body.rotation.y) * f.facing); // >0: aponta pro adversário
    for (let i = 0; i < N_TENT; i++) {
      const t = this.tents[i];
      const reach = 1 - 0.3 * clamp01(toward(t));
      const idle = i === 1 ? this.micCurve(t, now) : this.idleCurve(t, i, now, reach);
      const pts = t.setCurve(idle, i === 1 ? UP_AIR : UP_GROUND);
      let out = pts;
      if (ku < 1) {
        const c = this.curledCurve(t, i, now).getSpacedPoints(SEG);
        out = lerpPoints(t.blend, c, pts, ku);
      }
      // golpes: um tentáculo por hit chicoteia até o alvo (ou até o chão, se errou)
      let w = 0, E = null;
      if (on && cine < 0) {
        for (let h = 0; h < u.hits; h++) {
          if (hitTent(h) !== i) continue;
          const hitF = 12 + h * u.interval, s = hitF - 7;
          if (f.t < s || f.t > hitF + 10) continue;
          w = f.t <= hitF ? smooth((f.t - s) / 3) : 1 - smooth((f.t - hitF - 5) / 5);
          const q = clamp01((f.t - s) / 7);
          const miss = f.t > hitF && f.ultRes[h] !== 'hit';
          const above = tgtW.clone().add(new THREE.Vector3(-f.facing * 1.2, 3.2, 0));
          const endW = f.t <= hitF ? above.lerp(tgtW, easeIn(q)) : miss
            ? new THREE.Vector3(o.x + f.facing * 0.7, 0.3, 0.3)
            : tgtW.clone().add(new THREE.Vector3(0, 0.12 * Math.sin((f.t - hitF) * 1.2), 0));
          E = this.toLocal(endW.x, endW.y, endW.z).clone();
          if (f.t >= hitF && f.ultRes[h] === 'hit' && t.lastHit !== h) { t.lastHit = h; this.dust.burst(tgtW, { count: 3, spread: 0.5, up: 1.5, speed: 1.5, size: 0.3, grow: 2, life: 0.4 }); }
          if (f.t >= hitF && f.ultRes[h] !== 'hit' && t.lastHit !== h) { t.lastHit = h; this.dust.burst(endW.setY(0.1), { count: 5, spread: 0.8, up: 2, speed: 2, size: 0.35, grow: 2.2, life: 0.5 }); }
        }
      }
      if (w > 0 && E) {
        const sp = this.strikeCurve(t, E).getSpacedPoints(SEG);
        out = lerpPoints(t.blend, out, sp, w);
      }
      if (out !== pts) t.setPoints(out, w > 0.5 ? UP_AIR : UP_GROUND);
    }

    // ---- finalizador: 9º tentáculo sobe atrás e esmaga ----
    const sOn = on && cine < 0 && f.t >= fin - 12 && f.t <= fin + 18;
    this.slam.object.visible = sOn;
    if (sOn) {
      const P = this.slam.curve.points;
      const base = new THREE.Vector3(-0.2, 1.3, -1.1);
      const hit = f.ultRes[u.hits] === 'hit';
      const landW = f.t < fin || hit ? tgtW.clone() : new THREE.Vector3(o.x + f.facing * 0.9, 0.35, 0.2);
      const landL = this.toLocal(landW.x, landW.y, landW.z).clone();
      const aboveL = landL.clone().setY(landL.y + 5.5);
      let E;
      if (f.t < fin) E = aboveL.lerp(landL, easeIn((f.t - (fin - 12)) / 12));
      else if (f.t <= fin + 8) E = landL.clone().setY(hit ? Math.max(0.4, landL.y - 0.6) : landL.y);
      else E = landL.clone().lerp(aboveL, smooth((f.t - fin - 8) / 10));
      P[0].copy(base);
      P[1].copy(base).add(new THREE.Vector3(0, 2.6, -0.6));
      P[2].set(E.x * 0.35, Math.max(E.y, base.y) + 4.2, -0.3);
      P[3].set(E.x * 0.8, E.y + 2.0, E.z * 0.6);
      P[4].copy(E);
      this.slam.curve.needsUpdate = true;
      this.slam.setCurve(this.slam.curve, UP_AIR);
      // antecipação: cabeça se estica antes, achata no impacto
      const squash = f.t < fin ? 1 + 0.08 * easeIn((f.t - (fin - 12)) / 12) : 1 - 0.12 * (1 - smooth((f.t - fin) / 10));
      this.head.scale.y *= squash;
      if (f.t >= fin && !this.slammed) {
        this.slammed = true;
        const at = hit ? tgtW.clone().setY(0.1) : landW.clone().setY(0.1);
        this.rings.spawn(at.x, 0.05, { from: 0.3, to: 4, life: 0.5, opacity: 0.9, color: 0xc58cff });
        this.dust.burst(at, { count: 10, spread: 1.6, up: 2.5, speed: 3.5, size: 0.45, grow: 2.6, life: 0.6 });
        this.splats.forEach((s, j) => {
          s.visible = true; s.material.opacity = 0.9;
          s.position.set(at.x + (Math.random() - 0.5) * 2.4, 0.03 + j * 0.002, 0.3 + (Math.random() - 0.5) * 1.2);
          s.scale.set(0.6 + Math.random() * 1.4, 0.4 + Math.random() * 0.8, 1);
          s.rotation.z = Math.random() * Math.PI;
        });
      }
    }
    if (!on || f.t < fin - 12) this.slammed = false;
  }

  dispose() {
    this.scene.remove(this.root, ...this.splats);
    for (const t of this.tents) t.dispose();
    this.slam.dispose();
  }
}
