// ULTIMATE da Erika — "PLENÁRIO É MEU" (procedural; ela continua ela mesma, com o microfone).
// Cinemática: as LUZES APAGAM (luzes da cena baixam + pano escuro atrás da arena) e um SPOTLIGHT acende em cima dela,
// com o cone de luz visível e um disco dourado no chão. Microfone sobe até a boca.
// Golpes: a cada hit uma ONDA SONORA (3 arcos rosa/dourado/branco) sai da boca e voa até o alvo no frame do dano
// (contato só se f.ultRes[k] === 'hit' → faíscas douradas; errou → passa direto). Finalizador: ONDA GIGANTE
// (anéis verticais + varredura de arcos) que arremessa o inimigo para fora do quadro; confete dourado.
// Fim: luzes voltam. Cor extra da ultimate: rosa-ouro (0xff6fae / 0xffc46b) — ARTE.md §2.
import * as THREE from 'three';
import { Rings, Puffs, Shards, std, clamp01, easeIn, easeOut, smooth, add, flat, bodyPoint } from '../fx/common.js';
import { makeMic, PINK, GOLD } from '../fx/erikaFx.js';
import { starTexture } from '../fx/nikolasFx.js';

const sprite = (tex, w, h, extra = {}) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...extra })); s.scale.set(w, h, 1); s.visible = false; s.renderOrder = 8; return s; };

function makeWave() {
  const g = new THREE.Group();
  const arcs = [[PINK, 0.62, 0.82], [GOLD, 0.42, 0.58], [0xffffff, 0.24, 0.36]].map(([c, r0, r1], i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 40, 1, -Math.PI / 2.6, Math.PI / 1.3), add(c, 0.9)); m.position.set(-i * 0.2, 0, 0.02 * i); g.add(m); return m;
  });
  g.userData.arcs = arcs; g.visible = false;
  return g;
}

export class ErikaPlenario {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    this.hand = new THREE.Vector3(); this.head = new THREE.Vector3();
    this.mic = makeMic(); this.mic.visible = false; scene.add(this.mic);
    // escuridão: pano atrás da arena + luzes da cena baixam (lista preenchida na 1ª ativação)
    this.dark = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), flat(0x050308, 0)); this.dark.position.set(0, 12, -7); this.dark.visible = false; this.dark.renderOrder = -1; scene.add(this.dark);
    this.lights = null;
    this.spot = new THREE.SpotLight(0xfff0d8, 0, 20, 0.42, 0.5, 1); this.spot.position.set(0, 8, 2.5); this.spot.target = new THREE.Object3D(); scene.add(this.spot, this.spot.target);
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 8, 28, 1, true), add(0xfff0c0, 0)); this.cone.position.y = 4; this.cone.visible = false; scene.add(this.cone);
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), add(GOLD, 0)); this.disc.rotation.x = -Math.PI / 2; this.disc.position.y = 0.02; this.disc.visible = false; scene.add(this.disc);
    this.waves = Array.from({ length: 3 }, () => { const w = makeWave(); scene.add(w); return w; });
    this.finalArcs = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 48, 1, -Math.PI / 2.2, Math.PI / 1.1), add(i % 2 ? GOLD : PINK, 0)); m.visible = false; scene.add(m); return m; });
    this.rings = new Rings(scene, 6, PINK, { inner: 0.8, outer: 1.0 });
    this.sparks = new Puffs(scene, 18, 0xffe9a8, { opacity: 0.9 });
    this.confetti = new Shards(scene, 24, new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide }));
    this.confettiP = new Shards(scene, 16, new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: PINK, side: THREE.DoubleSide }));
    const st = starTexture();
    this.twinkles = Array.from({ length: 8 }, () => { const s = sprite(st, 0.3, 0.3, { blending: THREE.AdditiveBlending, color: 0xfff1c0 }); scene.add(s); return s; });
    this.k = 0; this.boomed = new Set(); this.wasOn = false;
  }

  collectLights() {
    this.lights = [];
    this.scene.traverse((o) => { if (o.isLight && o !== this.spot) this.lights.push([o, o.intensity]); });
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, o = f.opponent, fac = f.facing;
    const hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    // k = escuridão (sobe na cinemática, cai no fim)
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 20) : clamp01((end - f.t) / 12);
    this.k += (target - this.k) * Math.min(1, dt * 7);
    const k = smooth(clamp01(this.k));
    this.rings.update(dt); this.sparks.update(dt); this.confetti.update(dt); this.confettiP.update(dt);
    const now = performance.now() / 1000;

    // ---- luzes: apagam / voltam ----
    if (k > 0.001) {
      if (!this.lights) this.collectLights();
      for (const [l, i0] of this.lights) l.intensity = i0 * (1 - 0.82 * k);
      this.dark.visible = true; this.dark.material.opacity = 0.9 * k;
      this.spot.intensity = 70 * k; // candela: 180 estourava o placeholder em branco this.spot.position.set(f.x + fac * 0.3, 8, 2.5); this.spot.target.position.set(f.x, 0.8, 0);
      this.cone.visible = this.disc.visible = true;
      this.cone.position.set(f.x + fac * 0.15, 4, 0.2); this.cone.material.opacity = 0.14 * k * (0.9 + 0.1 * Math.sin(now * 9));
      this.cone.scale.set(1, 1, 0.6);
      this.disc.position.x = f.x; this.disc.material.opacity = 0.22 * k; this.disc.scale.setScalar(1 + 0.05 * Math.sin(now * 6));
    } else if (this.lights) {
      for (const [l, i0] of this.lights) l.intensity = i0;
      this.lights = null; this.dark.visible = this.cone.visible = this.disc.visible = false; this.spot.intensity = 0;
    }
    for (const s of this.twinkles) s.visible = false;
    for (const w of this.waves) w.visible = false;
    for (const m of this.finalArcs) m.visible = false;
    if (!on) { if (this.wasOn) { this.mic.visible = false; this.boomed.clear(); } this.wasOn = false; return; }
    this.wasOn = true;
    bodyPoint(this.hand, f, model, 'righthand', { dx: 0.3, y: f.stats.height * 0.62 });
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const mouth = new THREE.Vector3(this.head.x + fac * 0.25, this.head.y - 0.12, 0.35);

    // ---- microfone sobe até a boca ----
    const up = cine >= 0 ? smooth((75 - cine) / 14) : 1;
    this.mic.visible = true;
    this.mic.position.set(this.hand.x + (mouth.x - 0.05 * fac - this.hand.x) * up, this.hand.y + (mouth.y - 0.3 - this.hand.y) * up, 0.3);
    this.mic.rotation.z = -fac * (0.3 + up * 0.5); this.mic.scale.setScalar(1.5);
    // brilhos em volta dela sob o spotlight
    this.twinkles.forEach((s, i) => {
      const a = now * 2.5 + i * 0.785, tw = 0.5 + 0.5 * Math.sin(now * 11 + i * 1.7);
      s.visible = k > 0.3;
      s.position.set(f.x + Math.cos(a) * 0.8, f.y + 0.5 + ((i * 0.37 + now * 0.25) % 1) * 1.6, 0.4 + Math.sin(a) * 0.3);
      const sz = (0.12 + tw * 0.18) * k; s.scale.set(sz, sz, 1); s.material.opacity = 0.4 + tw * 0.6; s.material.rotation = a;
    });
    if (cine >= 0) return;

    // ---- GOLPES: onda sonora por hit ----
    for (let h = 0; h < u.hits; h++) {
      const hitF = 12 + h * u.interval, born = hitF - 7, t = f.t - born;
      if (t < 0 || t > 14) continue;
      const w = this.waves[h % this.waves.length];
      const tgt = new THREE.Vector3(o.x, o.y + o.stats.height * 0.55, 0.45);
      const hit = f.ultRes[h] === 'hit';
      w.visible = true; w.rotation.y = fac > 0 ? 0 : Math.PI;
      if (f.t <= hitF) { const q = clamp01(t / 7); w.position.lerpVectors(mouth, tgt, easeIn(q)); w.scale.setScalar(0.5 + q * 0.9); w.userData.arcs.forEach((a, i) => { a.material.opacity = 0.9 * Math.min(1, t / 2); a.scale.setScalar(1 + 0.15 * Math.sin(now * 25 + i)); }); }
      else {
        const r = (f.t - hitF) / 7;
        if (hit) { w.position.copy(tgt); w.scale.setScalar(1.4 + r * 0.8); w.userData.arcs.forEach((a) => { a.material.opacity = 0.9 * (1 - r); }); if (!this.boomed.has(h)) { this.boomed.add(h); this.rings.spawn(tgt.x, tgt.y, { flat: false, from: 0.2, to: 1.1, life: 0.28, opacity: 0.9, color: GOLD, z: 0.5 }); this.sparks.burst(tgt, { count: 6, spread: 0.7, up: 1.6, speed: 2.4, size: 0.2, grow: 2, life: 0.35, z: 0.3 }); } }
        else { w.position.copy(tgt).add(new THREE.Vector3(fac * r * 2.4, 0, 0)); w.scale.setScalar(1.4); w.userData.arcs.forEach((a) => { a.material.opacity = 0.9 * (1 - r); }); }
      }
    }
    // ---- FINALIZADOR: onda gigante ----
    const bt = f.t - (fin - 10);
    if (bt >= 0 && bt < 26) {
      const hit = f.ultRes[u.hits] === 'hit';
      const q = clamp01(bt / 10);
      // antecipação: anéis convergindo nela; disparo: arcos varrem até o alvo e além
      if (f.t < fin) {
        this.finalArcs.forEach((m, i) => {
          m.visible = true; m.rotation.set(0, fac > 0 ? 0 : Math.PI, 0);
          const s = 1.6 - q * 1.1 + i * 0.12; m.position.set(mouth.x + fac * 0.3, mouth.y - 0.4, 0.4 + i * 0.03); m.scale.setScalar(Math.max(0.05, s)); m.material.opacity = 0.35 + q * 0.6;
        });
      } else {
        const r = (f.t - fin) / 16;
        this.finalArcs.forEach((m, i) => {
          const rr = clamp01(r - i * 0.05);
          m.visible = rr > 0 && rr < 1; m.rotation.set(0, fac > 0 ? 0 : Math.PI, 0);
          m.position.set(mouth.x + fac * (0.5 + easeOut(rr) * 7.5), 1.1 + i * 0.05, 0.4 + i * 0.03);
          m.scale.setScalar(1 + rr * 2.2); m.material.opacity = 0.95 * (1 - rr);
        });
        if (!this.boomed.has('fin')) {
          this.boomed.add('fin');
          const tx = hit ? o.x : f.x + fac * 2.5, ty = o.y + o.stats.height * 0.55;
          for (let i = 0; i < 4; i++) this.rings.spawn(mouth.x + fac * (0.6 + i * 0.5), 1.1, { flat: false, from: 0.3 + i * 0.1, to: 6 + i, life: 0.5 + i * 0.08, opacity: 0.9, color: i % 2 ? GOLD : PINK, z: 0.5 });
          this.rings.spawn(f.x, 0.05, { from: 0.4, to: 7, life: 0.6, opacity: 0.8, color: GOLD });
          this.sparks.burst(new THREE.Vector3(tx, ty, 0.4), { count: 14, spread: 1.6, up: 2.5, speed: 3.5, size: 0.35, grow: 2.4, life: 0.5 });
          this.confetti.burst(new THREE.Vector3(f.x, 2.4, 0.3), { count: 24, speed: 3, up: 5, life: 1.4, size: 1, gravity: 6, spreadZ: 1.5 });
          this.confettiP.burst(new THREE.Vector3(f.x + fac * 1.5, 2.2, 0.3), { count: 16, speed: 3, up: 5, life: 1.3, size: 1, gravity: 6, spreadZ: 1.5 });
        }
      }
    }
  }

  dispose() {
    if (this.lights) for (const [l, i0] of this.lights) l.intensity = i0;
    this.scene.remove(this.mic, this.dark, this.spot, this.spot.target, this.cone, this.disc, ...this.waves, ...this.finalArcs, ...this.twinkles);
  }
}
