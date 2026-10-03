// ULTIMATE do Boulos — "ATO GIGANTE" (procedural; ele continua ele mesmo, com o megafone).
// Cinemática: megafone na boca, faixa "ATO GIGANTE" sobe atrás dele, barracas brotam no fundo da arena.
// Golpes: a MULTIDÃO fictícia (silhuetas coloridas com bandeiras) avança atrás dele pela arena; a cada hit um anel
// de megafone sai em direção ao rival (contato só se f.ultRes[k] === 'hit'). Finalizador: a multidão inteira passa
// por cima do rival e o "DESPEJA" pra fora do quadro (a lógica empurra forte — push 0.6); confete vermelho/amarelo.
import * as THREE from 'three';
import { Rings, Puffs, Shards, std, clamp01, easeIn, easeOut, smooth, bodyPoint, textSprite } from '../fx/common.js';
import { makeTent, makeMegaphone, makeMarcher, bannerTex, PROTEST_RED, YELLOW, TARP, TENT } from '../fx/boulosFx.js';

const SHIRTS = [0xd6332a, 0xffd23a, 0x2f6bd6, 0x1fa34a, 0xff8a3a, 0xf2f2f2, 0x7a3cff];
const SKINS = [0xd9a87e, 0x8a5a3a, 0xf0c8a8, 0xb07a52, 0x6a4028];

export class BoulosAto {
  constructor(scene) {
    this.scene = scene; this.hideBase = false; this.head = new THREE.Vector3();
    this.mega = makeMegaphone(); this.mega.visible = false; scene.add(this.mega);
    this.crowd = Array.from({ length: 14 }, (_, i) => { const m = makeMarcher(SHIRTS[i % SHIRTS.length], SKINS[i % SKINS.length], i % 3 === 0); m.visible = false; scene.add(m); return m; });
    this.tents = [TENT, TARP, YELLOW, TENT].map((c, i) => { const t = makeTent(c, i === 0); t.visible = false; scene.add(t); return t; });
    this.banner = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshBasicMaterial({ map: bannerTex('ATO GIGANTE', '#d6332a', '#ffd23a', 1024, 220), side: THREE.DoubleSide }));
    cloth.position.y = 2.9;
    const poles = [-1, 1].map((s) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.3, 6), std(0x8a5a2b)); p.position.set(s * 2.05, 1.65, 0); return p; });
    this.banner.add(cloth, ...poles); this.banner.visible = false; scene.add(this.banner);
    this.waves = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 30, 1, -Math.PI / 4, Math.PI / 2), new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; scene.add(m); return m; });
    this.out = textSprite('DESPEJADO!', { color: '#ffd23a', stroke: '#7a0e0e', w: 2.6, h: 0.87, bubble: '#d6332a' }); this.out.visible = false; this.out.renderOrder = 9; scene.add(this.out);
    this.rings = new Rings(scene, 4, YELLOW); this.dust = new Puffs(scene, 18, 0xd8c8a8, { opacity: 0.6 });
    this.confR = new Shards(scene, 18, new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: PROTEST_RED, side: THREE.DoubleSide }));
    this.confY = new Shards(scene, 18, new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: YELLOW, side: THREE.DoubleSide }));
    this.boomed = new Set(); this.wasOn = false; this.x0 = 0; this.lastDust = -1;
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    this.rings.update(dt); this.dust.update(dt); this.confR.update(dt); this.confY.update(dt);
    this.mega.visible = this.banner.visible = this.out.visible = false;
    for (const m of [...this.crowd, ...this.tents, ...this.waves]) m.visible = false;
    if (!on) { if (this.wasOn) this.boomed.clear(); this.wasOn = false; return; }
    if (!this.wasOn) this.x0 = f.x;
    this.wasOn = true;
    const u = f.ultimate, o = f.opponent, fac = f.facing, now = performance.now() / 1000;
    const hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const mouth = new THREE.Vector3(this.head.x + fac * 0.2, this.head.y - 0.1, 0.45);
    const ck = cine >= 0 ? smooth((75 - cine) / 15) : 1; // entrada na cinemática
    const outK = clamp01((end - f.t) / 10);

    // megafone na boca
    this.mega.visible = true; this.mega.position.copy(mouth); this.mega.rotation.set(0, fac > 0 ? 0 : Math.PI, 0.05); this.mega.scale.setScalar(1.4 * ck);
    // faixa + barracas no fundo
    this.banner.visible = true; this.banner.position.set(this.x0 + fac * 1.0, 0, -2.2); this.banner.scale.set(1, Math.max(0.01, ck * outK), 1);
    this.tents.forEach((t, i) => {
      const d = clamp01(ck * 4 - i * 0.6);
      t.visible = d > 0; t.position.set(this.x0 + fac * (-3 + i * 2.2), 0, -3 - (i % 2) * 0.8);
      const pop = d < 1 ? easeOut(d) * 1.15 : 1; t.scale.set(outK, Math.max(0.01, pop * outK), outK);
    });

    // multidão: na cinemática aparece atrás dele; durante os hits avança; no finalizador passa por cima do rival
    const go = cine >= 0 ? 0 : clamp01(f.t / fin);
    const sweep = cine >= 0 || f.t < fin ? 0 : easeIn(clamp01((f.t - fin) / 22));
    const front = this.x0 - fac * 0.8 + fac * (Math.abs(o.x - this.x0) - 0.4) * easeOut(go) * 0.85 + fac * sweep * 9;
    this.crowd.forEach((m, i) => {
      const row = i % 3, col = Math.floor(i / 3);
      const appear = clamp01(ck * 3 - col * 0.4);
      m.visible = appear > 0 && outK > 0;
      m.position.set(front - fac * (col * 0.75 + row * 0.3), Math.abs(Math.sin(now * 10 + i * 1.3)) * 0.08 * (cine >= 0 ? 0.3 : 1), -0.3 - row * 0.7);
      m.rotation.y = fac > 0 ? Math.PI / 2 : -Math.PI / 2;
      m.scale.setScalar(0.92 * appear * outK);
      const c = m.userData.cloth; if (c) { const p = c.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(now * 9 + i + p.getX(k) * 8) * 0.06 * (p.getX(k) + 0.25)); p.needsUpdate = true; }
    });
    if (cine >= 0) return;
    if (f.t !== this.lastDust && f.t % 5 === 0 && f.t < end - 6) { this.lastDust = f.t; this.dust.burst(new THREE.Vector3(front - fac * 1.2, 0.1, -0.8), { count: 2, spread: 1.6, up: 0.7, speed: 1.4, size: 0.45, grow: 2, life: 0.6, z: 0 }); }

    // ---- golpes: pulso de megafone até o rival ----
    for (let h = 0; h < u.hits; h++) {
      const hitF = 12 + h * u.interval, t = f.t - (hitF - 6);
      if (t < 0 || t > 12) continue;
      const w = this.waves[h % this.waves.length], q = clamp01(t / 6);
      const hit = f.ultRes[h] === 'hit';
      w.visible = true;
      const tx = o.x - fac * 0.2;
      w.position.set(mouth.x + (tx - mouth.x) * easeIn(q) + (t > 6 && !hit ? fac * (t - 6) * 0.3 : 0), mouth.y - q * 0.3, 0.5);
      w.rotation.set(0, 0, fac > 0 ? 0 : Math.PI);
      w.scale.setScalar(1 + q * 2.2 + (t > 6 ? (t - 6) * 0.2 : 0)); w.material.opacity = t <= 6 ? 0.9 : 0.9 * (1 - (t - 6) / 6);
      if (t === 6 && hit && !this.boomed.has(h)) { this.boomed.add(h); this.rings.spawn(tx, o.y + 1.1, { flat: false, from: 0.2, to: 1.3, life: 0.25, opacity: 0.9, z: 0.6 }); }
    }

    // ---- finalizador: DESPEJADO! ----
    if (f.t >= fin && !this.boomed.has('fin')) {
      this.boomed.add('fin');
      const hit = f.ultRes[u.hits] === 'hit';
      const at = new THREE.Vector3(hit ? o.x : f.x + fac * 2.5, 1.2, 0.4);
      this.rings.spawn(at.x, 0.05, { from: 0.4, to: 6, life: 0.6, opacity: 0.8, color: PROTEST_RED });
      this.confR.burst(at, { count: 18, speed: 3.5, up: 5, life: 1.4, size: 1, gravity: 6, spreadZ: 1.5 });
      this.confY.burst(at, { count: 18, speed: 3.5, up: 5, life: 1.4, size: 1, gravity: 6, spreadZ: 1.5 });
      this.dust.burst(new THREE.Vector3(at.x, 0.2, 0), { count: 10, spread: 2.5, up: 1.4, speed: 3.5, size: 0.6, grow: 2.2, life: 0.7, z: 0 });
    }
    if (f.t >= fin && f.ultRes[u.hits] === 'hit') {
      const q = clamp01((f.t - fin) / 30);
      this.out.visible = q < 1; this.out.position.set(f.x + fac * 2.4, 2.9, 0.8);
      const pop = q < 0.12 ? easeOut(q / 0.12) * 1.25 : 1; this.out.scale.set(2.6 * pop, 0.87 * pop, 1); this.out.material.opacity = q > 0.8 ? (1 - q) / 0.2 : 1;
    }
  }

  dispose() { this.scene.remove(this.mega, this.banner, this.out, ...this.crowd, ...this.tents, ...this.waves); }
}
