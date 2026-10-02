// ULTIMATE do Flavão — "DINASTIA" (composição de VFX, o corpo base continua visível).
// Cinemática: três SOMBRAS fictícias da "família" (fantasmas verde-escuro com brilho dourado) sobem do chão atrás dele
// em profundidades diferentes. Golpes: a cada hit o Flavão e as sombras repetem o mesmo golpe (escalonado 2 frames),
// faíscas douradas no alvo quando a lógica confirma (f.ultRes[k] === 'hit'). Finalizador: todos pisam juntos →
// RACHADINHA AMPLIADA: rachadura larga até o alvo com colunas de pedra subindo em sequência e explosão final.
// Fim: as sombras afundam no chão. Frames: hit k = 12 + k·interval; final = 12 + hits·interval + 6.
import * as THREE from 'three';
import { Puffs, Rings, Shards, std, clamp01, smooth, easeIn, easeOut, add } from '../fx/common.js';
import { makeGhost } from '../fx/cloneFx.js';
import { crackTexture } from '../fx/flavioFx.js';

const GOLD = 0xffd36b, AMBER = 0xd9a441, EARTH = 0x7a5a3a;
const SHADOWS = [{ x: -0.55, z: -0.8, s: 0.96 }, { x: -1.0, z: 0.75, s: 0.92 }, { x: -1.5, z: -1.5, s: 0.88 }];
const COMBO = ['punch1', 'punch2', 'kick', 'punch3', 'punch2', 'punch1', 'kick', 'punch3'];
const N_PILLAR = 5;

export class FlavioDinastia {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    this.root = root;
    this.ghosts = null; this.of = null;
    this.floor = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.0, 48), add(GOLD, 0)); this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = 0.03; root.add(this.floor);
    this.rings = new Rings(scene, 4, GOLD);
    this.sparks = new Puffs(scene, 12, 0xffe08a, { opacity: 0.9 });
    this.dust = new Puffs(scene, 16, 0xcdbda0, { opacity: 0.6 });
    this.rocks = new Shards(scene, 20, new THREE.DodecahedronGeometry(0.14, 0), std(EARTH));
    // rachadura ampliada + colunas de pedra (mundo)
    this.crack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.1), new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, depthWrite: false, opacity: 0 }));
    this.crack.rotation.x = -Math.PI / 2; this.crack.position.y = 0.021; this.crack.visible = false; scene.add(this.crack);
    this.crack.material.map.wrapS = THREE.RepeatWrapping;
    const mats = [std(EARTH, { roughness: 0.95 }), std(0x5e4228, { roughness: 0.95 }), std(0x8d6b45, { roughness: 0.95 })];
    this.pillars = Array.from({ length: N_PILLAR }, (_, i) => {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), mats[(i + j) % 3]); m.castShadow = true; m.position.set((j % 2 ? 0.2 : -0.2), j * 0.45, (j > 1 ? 0.2 : -0.2)); m.rotation.set(j, i, j * 0.7); g.add(m); }
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 2.0, 10, 1, true), add(AMBER, 0.5)); glow.position.y = 1.0; g.add(glow);
      g.visible = false; scene.add(g); g.userData.glow = glow;
      return g;
    });
    this.k = 0; this.lastHit = -1; this.lastCombo = -1; this.fired = false;
  }
  ensure(f) {
    if (this.of === f.data) return;
    if (this.ghosts) for (const g of this.ghosts) { this.root.remove(g.object); g.dispose(); }
    this.of = f.data;
    this.ghosts = SHADOWS.map((S) => {
      const g = makeGhost(f.data, { color: 0x0f2a1a, emissive: 0xd4a62a, opacity: 0.7, intensity: 0.45 });
      g.object.rotation.y = Math.PI / 2; g.object.position.set(S.x, 0, S.z); g.object.scale.setScalar(S.s);
      this.root.add(g.object);
      return g;
    });
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 40) : clamp01((end - f.t) / 12);
    this.k += (target - this.k) * Math.min(1, dt * 9);
    const k = smooth(this.k), now = performance.now() / 1000;
    this.rings.update(dt); this.sparks.update(dt); this.dust.update(dt); this.rocks.update(dt);
    this.ensure(f);
    const vis = this.k > 0.01;
    this.root.visible = vis;
    this.root.position.set(f.x, f.y, 0);
    this.root.rotation.y = f.facing > 0 ? 0 : Math.PI;
    this.floor.material.opacity = 0.5 * k; this.floor.rotation.z = now * 0.6;
    const o = f.opponent;
    // sombras sobem do chão (escalonadas) e balançam
    this.ghosts.forEach((g, i) => {
      const S = SHADOWS[i], gk = smooth(clamp01((k - i * 0.15) / 0.7));
      g.object.visible = gk > 0.01;
      g.object.scale.set(S.s, Math.max(0.01, S.s * gk), S.s);
      g.object.position.set(S.x, Math.sin(now * 2 + i) * 0.03, S.z);
      g.mat.opacity = 0.7 * gk * (0.85 + 0.15 * Math.sin(now * 9 + i));
      if (gk > 0.3 && !g.rose) { g.rose = true; this.rings.spawn(f.x + f.facing * S.x, 0.04, { from: 0.2, to: 1.6, life: 0.35, opacity: 0.8, z: S.z }); this.dust.burst(new THREE.Vector3(f.x + f.facing * S.x, 0.2, S.z), { count: 4, spread: 0.6, up: 1.5, speed: 1.4, size: 0.3, grow: 2.2, life: 0.45, z: 0 }); }
      if (!on) g.rose = false;
      g.model.update(dt);
    });
    if (!on || cine >= 0) { this.lastCombo = -1; this.lastHit = -1; this.fired = false; this.crack.visible = false; for (const p of this.pillars) p.visible = false; if (on && this.ghosts) for (const g of this.ghosts) if (g.model.key !== 'idle') g.model.play('idle', 0); return; }

    // ---- golpes: Flavão + sombras repetem o mesmo golpe, escalonado ----
    for (let h = 0; h < u.hits; h++) {
      const hitF = 12 + h * u.interval, anim = COMBO[h % COMBO.length];
      if (f.t === hitF - 7 && this.lastCombo !== h) { this.lastCombo = h; model?.play?.(anim, 14, false, undefined, 0.05); }
      this.ghosts.forEach((g, i) => { if (f.t === hitF - 7 + 2 * (i + 1)) g.model.play(anim, 14); });
      if (f.t === hitF && this.lastHit !== h) {
        this.lastHit = h;
        if (f.ultRes[h] === 'hit') {
          const at = new THREE.Vector3(o.x - f.facing * 0.2, o.y + o.stats.height * 0.6, 0.3);
          this.sparks.burst(at, { count: 4, spread: 0.6, up: 1.8, speed: 2.4, size: 0.22, grow: 1.6, life: 0.3, z: 0 });
          this.rings.spawn(at.x, at.y, { flat: false, from: 0.2, to: 1.4 + h * 0.2, life: 0.25, opacity: 0.9, z: 0.4 });
        }
      }
    }
    // ---- finalizador: pisão coletivo → rachadura ampliada com colunas até o alvo ----
    if (f.t === fin - 12) { model?.play?.('sweep', 14, false, undefined, 0.05); for (const g of this.ghosts) g.model.play('sweep', 14); }
    const dist = Math.abs(o.x - f.x), hit = f.ultRes[u.hits] === 'hit';
    const reach = f.t >= fin && !hit ? Math.max(1, dist - 1.2) : dist;
    if (f.t >= fin && !this.fired) {
      this.fired = true;
      this.crack.visible = true;
      this.crack.scale.set(reach, 1, 1); this.crack.position.set(f.x + f.facing * reach / 2, 0.021, 0.05); this.crack.rotation.z = f.facing > 0 ? 0 : Math.PI;
      this.crack.material.map.repeat.set(Math.max(1, reach / 1.4), 1); this.crack.material.map.needsUpdate = true;
      this.rings.spawn(f.x + f.facing * 0.4, 0.04, { from: 0.3, to: 3.0, life: 0.4, opacity: 1 });
      this.dust.burst(new THREE.Vector3(f.x + f.facing * 0.5, 0.2, 0.2), { count: 8, spread: 1.2, up: 2, speed: 2.4, size: 0.4, grow: 2.4, life: 0.5, z: 0 });
    }
    if (f.t >= fin) {
      const age = f.t - fin;
      this.crack.material.opacity = 0.95 * (1 - clamp01((age - 18) / 10));
      this.pillars.forEach((p, i) => {
        const t0 = i * 2, a = age - t0, q = i / (N_PILLAR - 1);
        p.visible = a >= 0 && a < 30;
        if (!p.visible) return;
        const x = f.x + f.facing * (0.9 + q * (reach - 0.9));
        const up = easeOut(clamp01(a / 5)), down = easeIn(clamp01((a - 16) / 14));
        p.position.set(x, -1.6 + (1.6 + 0.4 * i) * up - 2.2 * down, (i % 2 ? 0.3 : -0.3));
        p.scale.setScalar(0.8 + 0.1 * i);
        p.userData.glow.material.opacity = 0.5 * up * (1 - down);
        if (a === 0) {
          this.dust.burst(new THREE.Vector3(x, 0.3, 0), { count: 4, spread: 0.8, up: 2.2, speed: 2, size: 0.35, grow: 2.4, life: 0.5 });
          this.rocks.burst(new THREE.Vector3(x, 0.3, 0), { count: 4, speed: 3, up: 5, life: 0.8, size: 1 });
          if (i === N_PILLAR - 1) {
            this.rings.spawn(x, 0.05, { from: 0.4, to: 5, life: 0.5, opacity: 1, color: AMBER });
            this.rings.spawn(x, 1.0, { flat: false, from: 0.3, to: 4, life: 0.4, opacity: 0.9, z: 0.3, color: GOLD });
            this.rocks.burst(new THREE.Vector3(x, 0.4, 0), { count: 12, speed: 4, up: 7, life: 1.0, size: 1.2 });
            this.dust.burst(new THREE.Vector3(x, 0.8, 0), { count: 8, spread: 1.8, up: 3.2, speed: 3, size: 0.6, grow: 2.6, life: 0.7 });
          }
        }
      });
    }
  }

  dispose() {
    this.scene.remove(this.root, this.crack, ...this.pillars);
    if (this.ghosts) for (const g of this.ghosts) g.dispose();
  }
}
