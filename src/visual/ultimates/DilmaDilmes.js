// ULTIMATE da Dilma — "DILMÊS TOTAL" (procedural; ela continua ela mesma).
// Cinemática: título DILMÊS TOTAL pulsa acima dela, letras embaralhadas giram em volta.
// Golpes: a cada hit um BALÃO de fala com frase embaralhada voa da boca dela e GRUDA em volta do rival (contato só
// se f.ultRes[k] === 'hit'; errou → o balão passa direto e some). No 3º hit aparece, atrás do rival, uma CRIANÇA e
// um CACHORRO atrás dela ("atrás da criança tem um cachorro"). Finalizador: MANDIOCA COLOSSAL cai do céu em cima do
// rival (poeira + anel); o rival fica CONFUSO (a lógica inverte os controles — StatusFx mostra a etiqueta).
import * as THREE from 'three';
import { swapToGLB, PROP_GLB } from '../propModel.js';
import { Rings, Puffs, Shards, std, clamp01, easeIn, easeOut, smooth, bodyPoint, textSprite } from '../fx/common.js';
import { makeMandioca, DILMA_RED } from '../fx/dilmaFx.js';

const PHRASES = ['ESTOCAR VENTO', 'META ABERTA!', 'DOBRA A META', 'SAÚDO A MANDIOCA', 'MULHER SAPIENS', 'NEM GANHAR NEM PERDER'];

function makeDog() {
  const g = new THREE.Group(), fur = std(0xb5793f, { roughness: 0.9 }), dark = std(0x5a3818);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.28), fur); body.position.y = 0.42;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.26), fur); head.position.set(0.38, 0.62, 0);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.16), std(0xd9a76a)); snout.position.set(0.56, 0.57, 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), std(0x111111)); nose.position.set(0.63, 0.6, 0);
  const ears = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), dark); e.position.set(0.34, 0.74, s * 0.12); e.rotation.x = s * 0.3; return e; });
  const legs = [[-0.22, -1], [-0.22, 1], [0.22, -1], [0.22, 1]].map(([x, s]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.08), fur); l.position.set(x, 0.15, s * 0.09); return l; });
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.3, 6), fur); tail.position.set(-0.38, 0.6, 0); tail.rotation.z = 0.9;
  g.add(body, head, snout, nose, ...ears, ...legs, tail);
  for (const m of g.children) m.castShadow = true;
  g.userData.tail = tail;
  swapToGLB(g, PROP_GLB.cachorro);
  return g;
}
function makeKid() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.2), std(0xffd23a)); body.position.y = 0.62;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 0.18), std(0x2f6bd6)); legs.position.y = 0.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), std(0xe8bf9c)); head.position.y = 1.02;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), std(0x3a2414)); hair.position.y = 1.04;
  g.add(body, legs, head, hair);
  for (const m of g.children) m.castShadow = true;
  swapToGLB(g, PROP_GLB.crianca);
  return g;
}

export class DilmaDilmes {
  constructor(scene) {
    this.scene = scene; this.hideBase = false; this.head = new THREE.Vector3();
    this.title = textSprite('DILMÊS TOTAL', { color: '#fff', stroke: '#7a0e0e', w: 3.0, h: 1.0, bubble: '#c81e1e' }); this.title.visible = false; this.title.renderOrder = 9; scene.add(this.title);
    this.balloons = PHRASES.map((p) => { const s = textSprite(p, { color: '#111', stroke: '#fff', w: 1.9, h: 0.63, bubble: '#ffffff', font: 'bold 54px Bangers, Impact, sans-serif' }); s.visible = false; s.renderOrder = 9; scene.add(s); return s; });
    this.letters = 'DILMÊS?!'.split('').map((ch) => { const s = textSprite(ch, { color: '#ffd23a', w: 0.5, h: 0.17 }); s.visible = false; scene.add(s); return s; });
    this.dog = makeDog(); this.dog.visible = false; scene.add(this.dog);
    this.kid = makeKid(); this.kid.visible = false; scene.add(this.kid);
    this.dogTxt = textSprite('TEM UM CACHORRO!', { color: '#fff', stroke: '#111', w: 1.7, h: 0.57, bubble: '#b5793f', font: 'bold 50px Bangers, Impact, sans-serif' }); this.dogTxt.visible = false; this.dogTxt.renderOrder = 9; scene.add(this.dogTxt);
    this.giant = makeMandioca(5.5); this.giant.visible = false; scene.add(this.giant);
    this.rings = new Rings(scene, 4, DILMA_RED);
    this.dust = new Puffs(scene, 16, 0xd8c8a8, { opacity: 0.7 });
    this.chunks = new Shards(scene, 14, new THREE.DodecahedronGeometry(0.12, 0), std(0xf6efd8));
    this.boomed = new Set(); this.wasOn = false;
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    this.rings.update(dt); this.dust.update(dt); this.chunks.update(dt);
    for (const s of [this.title, this.dogTxt, ...this.balloons, ...this.letters]) s.visible = false;
    this.dog.visible = this.kid.visible = this.giant.visible = false;
    if (!on) { if (this.wasOn) this.boomed.clear(); this.wasOn = false; return; }
    this.wasOn = true;
    const u = f.ultimate, o = f.opponent, fac = f.facing, now = performance.now() / 1000;
    const hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const mouth = new THREE.Vector3(this.head.x + fac * 0.25, this.head.y, 0.6);
    const oc = new THREE.Vector3(o.x, o.y + o.stats.height * 0.6, 0.6);

    // ---- cinemática: título + letras embaralhadas girando ----
    if (cine >= 0) {
      const q = smooth((75 - cine) / 12);
      this.title.visible = true; this.title.position.set(f.x, f.y + f.stats.height + 0.9, 0.8);
      const s = q * (1 + 0.06 * Math.sin(now * 14)); this.title.scale.set(3.0 * s, 1.0 * s, 1); this.title.material.rotation = Math.sin(now * 5) * 0.08;
      this.letters.forEach((l, i) => {
        const a = now * 3 + (i * Math.PI * 2) / this.letters.length;
        l.visible = q > 0.2; l.position.set(f.x + Math.cos(a) * 1.1, f.y + 1.1 + Math.sin(a * 2) * 0.4, 0.6 + Math.sin(a) * 0.4);
        l.material.rotation = a * 2; l.scale.set(0.5 * q, 0.17 * q * 3, 1);
      });
      return;
    }

    // ---- golpes: balões voam e grudam em volta do rival ----
    for (let h = 0; h < u.hits; h++) {
      const hitF = 12 + h * u.interval, born = hitF - 8, t = f.t - born;
      if (t < 0 || f.t > fin + 4) continue;
      const b = this.balloons[h % this.balloons.length], hit = f.ultRes[h] === 'hit';
      b.visible = true;
      const ang = h * 1.25 + now * 0.8, orbit = new THREE.Vector3(oc.x + Math.cos(ang) * 1.0, oc.y + 0.35 + Math.sin(ang) * 0.6, 0.7 + h * 0.03);
      if (f.t <= hitF) { b.position.lerpVectors(mouth, orbit, easeOut(t / 8)); const s = 0.4 + 0.6 * easeOut(t / 8); b.scale.set(1.9 * s, 0.63 * s, 1); }
      else if (hit) { b.position.copy(orbit); const wob = 1 + 0.05 * Math.sin(now * 12 + h); b.scale.set(1.9 * wob, 0.63 * wob, 1); if (!this.boomed.has(h)) { this.boomed.add(h); this.rings.spawn(orbit.x, orbit.y, { flat: false, from: 0.2, to: 1.2, life: 0.25, opacity: 0.8, color: 0xffffff, z: 0.7 }); } }
      else { const r = (f.t - hitF) / 10; b.visible = r < 1; b.position.copy(orbit).add(new THREE.Vector3(fac * r * 3, r, 0)); b.material.opacity = 1 - r; }
      b.material.rotation = Math.sin(now * 4 + h) * 0.1;
      if (f.t <= hitF || hit) b.material.opacity = 1;
    }

    // ---- criança + cachorro atrás dela (a partir do 3º hit) ----
    const dogT = f.t - (12 + 2 * u.interval);
    if (dogT >= 0 && f.t < end) {
      const k = Math.min(easeOut(dogT / 8), clamp01((end - f.t) / 8));
      const bx = (f.x + o.x) / 2 + fac * 0.2; // entre os dois, no fundo (fica no quadro)
      this.kid.visible = this.dog.visible = true;
      this.kid.position.set(bx, 0, -1.2); this.kid.scale.setScalar(Math.max(0.01, k)); this.kid.rotation.y = -fac * 0.4;
      this.dog.position.set(bx + fac * 0.15 - fac * (1 - k) * 2, 0, -1.9); this.dog.rotation.y = fac > 0 ? Math.PI : 0;
      this.dog.userData.tail.rotation.x = Math.sin(now * 20) * 0.6;
      this.dogTxt.visible = dogT > 6; this.dogTxt.position.set(bx, 2.1, -0.4);
      const s = clamp01((dogT - 6) / 5) * k; this.dogTxt.scale.set(1.7 * s, 0.57 * s, 1);
    }

    // ---- finalizador: mandioca colossal cai ----
    const ft = f.t - (fin - 14);
    if (ft >= 0 && f.t < end) {
      const hit = f.ultRes[u.hits] === 'hit';
      const gx = hit || f.t < fin ? o.x : o.x + fac * 1.5;
      this.giant.visible = true;
      if (f.t < fin) { const q = clamp01(ft / 14); this.giant.position.set(gx, 9 - easeIn(q) * 7.6, 0.2); this.giant.rotation.set(0, 0, -1.2 + q * 0.9); }
      else {
        const r = clamp01((f.t - fin) / 30);
        this.giant.position.set(gx, 1.4 - r * 0.2, 0.2); this.giant.rotation.set(0, 0, -0.3 + Math.sin(r * 30) * 0.05 * (1 - r));
        this.giant.scale.setScalar(5.5 * (1 - easeIn(clamp01((f.t - (end - 8)) / 8))));
        if (!this.boomed.has('fin')) {
          this.boomed.add('fin');
          this.rings.spawn(gx, 0.05, { from: 0.4, to: 5, life: 0.5, opacity: 0.9 });
          this.rings.spawn(gx, 1.2, { flat: false, from: 0.3, to: 3.5, life: 0.4, opacity: 0.8, color: 0xffd23a, z: 0.6 });
          this.dust.burst(new THREE.Vector3(gx, 0.2, 0.2), { count: 16, spread: 3, up: 1.6, speed: 4, size: 0.6, grow: 2.4, life: 0.8, z: 0 });
          this.chunks.burst(new THREE.Vector3(gx, 0.8, 0.3), { count: 14, speed: 4, up: 5, life: 1, size: 1, gravity: 12 });
        }
      }
      if (f.t >= end - 8) this.giant.visible = this.giant.scale.x > 0.05;
    }
    if (f.t < fin) this.giant.scale.setScalar(5.5);
  }

  dispose() { this.scene.remove(this.title, this.dogTxt, ...this.balloons, ...this.letters, this.dog, this.kid, this.giant); }
}
