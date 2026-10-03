// VFX do BOULOS (interface do SpecialFx: update(dt, f, model, sp))
//   megafone — Megafone do Ato: megafone na mão perto da boca; a cada pulso (rehit) um cone de arcos sonoros varre a
//              caixa do golpe (2,7 m) — o último pulso é maior (o que empurra longe)
//   marcha   — Marcha: faixa "MARCHA!" erguida por cima + 4 manifestantes fictícios (silhuetas coloridas) atrás,
//              balançando bandeiras vermelhas
//   visual de Hitter: barraca (zona: marca no chão → barraca brota com placa OCUPADO! → some)
// Cores: vermelho 0xd6332a / laranja 0xe84b2a, lona azul 0x2f6bd6, amarelo 0xffd23a.
import * as THREE from 'three';
import { Rings, Puffs, Shards, std, canvasTex, clamp01, easeOut, add, flat, bodyPoint, mergeParts } from './common.js';

export const PROTEST_RED = 0xd6332a, TENT = 0xe84b2a, TARP = 0x2f6bd6, YELLOW = 0xffd23a;

export function bannerTex(text, bg = '#d6332a', fg = '#fff', w = 512, h = 128) {
  return canvasTex(w, h, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(8, 8, W - 16, H - 16);
    g.font = `bold ${Math.round(H * 0.62)}px Bangers, Impact, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#111'; g.strokeText(text, W / 2, H / 2 + 3); g.fillStyle = fg; g.fillText(text, W / 2, H / 2 + 3);
  });
}
const _t = {};
const banner = (text, bg, fg) => (_t[text + bg] ||= bannerTex(text, bg, fg));

// barraca de acampamento (pirâmide de lona) + placa OCUPADO! num pauzinho
export function makeTent(color = TENT, sign = true) {
  const g = new THREE.Group();
  const tent = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.35, 4, 1, false, Math.PI / 4), std(color, { roughness: 0.85, flatShading: true }));
  tent.position.y = 0.675; tent.castShadow = true;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.7), flat(0x2a1a12, 0.9, { side: THREE.DoubleSide }));
  door.position.set(0, 0.35, 0.61); door.rotation.x = -0.36;
  g.add(tent, door);
  if (sign) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), std(0x8a5a2b)); stick.position.set(0.75, 0.75, 0.35);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), new THREE.MeshBasicMaterial({ map: banner('OCUPADO!', '#ffd23a', '#d6332a'), side: THREE.DoubleSide }));
    plate.position.set(0.75, 1.55, 0.37); plate.rotation.z = -0.08;
    g.add(stick, plate); g.userData.plate = plate;
  }
  return g;
}

// megafone: cone branco + boca vermelha + cabo
export function makeMegaphone() {
  const g = new THREE.Group();
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.05, 0.38, 14, 1, true), std(0xf2f2f2, { side: THREE.DoubleSide, roughness: 0.4 }));
  horn.rotation.z = -Math.PI / 2; horn.position.x = 0.19;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 18), std(PROTEST_RED)); rim.rotation.y = Math.PI / 2; rim.position.x = 0.38;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), std(0x1a1a1a)); grip.position.set(0.05, -0.1, 0);
  g.add(horn, rim, grip);
  for (const m of g.children) m.castShadow = true;
  return g;
}

// manifestante fictício: silhueta simples (corpo + cabeça + braço erguido com bandeira). Corpo fundido em 1 malha
// com cor por vértice (mergeParts) e geometria em cache por combinação de cores → 1–2 draw calls por pessoa.
const _marcher = new Map();
const MARCHER_MAT = std(0xffffff, { vertexColors: true });
export function makeMarcher(shirt, skin = 0xd9a87e, flag = true) {
  const key = `${shirt}:${skin}:${flag}`;
  if (!_marcher.has(key)) {
    const parts = [
      { geo: new THREE.BoxGeometry(0.38, 0.62, 0.24), color: shirt, p: [0, 1.0, 0] },
      { geo: new THREE.BoxGeometry(0.32, 0.7, 0.2), color: 0x2b3550, p: [0, 0.35, 0] },
      { geo: new THREE.SphereGeometry(0.15, 10, 8), color: skin, p: [0, 1.45, 0] },
      { geo: new THREE.BoxGeometry(0.09, 0.5, 0.09), color: shirt, p: [0.2, 1.45, 0], r: [0, 0, -0.2] },
    ];
    if (flag) parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.015, 0.9, 5), color: 0x8a5a2b, p: [0.26, 1.9, 0] });
    _marcher.set(key, mergeParts(parts));
  }
  const g = new THREE.Group();
  const body = new THREE.Mesh(_marcher.get(key), MARCHER_MAT); body.castShadow = true; g.add(body);
  if (flag) {
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32, 4, 1), std(PROTEST_RED, { side: THREE.DoubleSide, roughness: 0.9 })); cloth.position.set(0.52, 2.18, 0);
    g.add(cloth); g.userData.cloth = cloth;
  }
  return g;
}
const wave = (cloth, t) => { if (!cloth) return; const p = cloth.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(t * 9 + x * 8) * 0.06 * (x + 0.25)); } p.needsUpdate = true; };

// ---------------- MEGAFONE DO ATO ----------------
class MegafoneFx {
  constructor(scene) {
    this.scene = scene; this.head = new THREE.Vector3();
    this.mega = makeMegaphone(); this.mega.visible = false; scene.add(this.mega);
    // arcos opacos com contorno escuro (aditivo some no chão claro da arena)
    this.arcs = Array.from({ length: 9 }, () => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 30, 1, -Math.PI / 4, Math.PI / 2), flat(YELLOW, 0, { side: THREE.DoubleSide }));
      const dark = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.45, 30, 1, -Math.PI / 4, Math.PI / 2), flat(0x5a2a00, 0.5, { side: THREE.DoubleSide })); dark.position.z = -0.01; m.add(dark); m.userData.dark = dark;
      m.visible = false; scene.add(m); return m;
    });
    this.rings = new Rings(scene, 2, YELLOW);
    this.last = -1;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt);
    this.mega.visible = false; for (const a of this.arcs) a.visible = false;
    if (!sp || f.t > sp.startup + sp.active + 6) { this.last = -1; return; }
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const mouth = new THREE.Vector3(this.head.x + f.facing * 0.2, this.head.y - 0.1, 0.4);
    this.mega.visible = true;
    this.mega.position.copy(mouth); this.mega.rotation.set(0, f.facing > 0 ? 0 : Math.PI, 0.05);
    this.mega.scale.setScalar(1.4 * Math.min(1, f.t / 4));
    if (f.t < sp.startup) return;
    const reach = (sp.box?.x ?? 0.3) + (sp.box?.w ?? 2.4), rh = sp.rehit || 6;
    const n = Math.floor((sp.active - 1) / rh);
    // cada pulso: 3 arcos que viajam da boca até o fim da caixa
    for (let p = 0; p <= n; p++) {
      const age = f.t - (sp.startup + p * rh);
      if (age < 0 || age > 10) continue;
      const big = p === n, q = age / 10;
      for (let j = 0; j < 3; j++) {
        const a = this.arcs[(p % 3) * 3 + j], qq = clamp01(q - j * 0.12);
        a.visible = qq > 0;
        a.position.set(mouth.x + f.facing * (0.4 + qq * reach), mouth.y - qq * 0.35, 0.4);
        a.rotation.set(0, 0, f.facing > 0 ? 0 : Math.PI);
        a.scale.setScalar((0.8 + qq * 2.4) * (big ? 1.35 : 1));
        a.material.color.setHex(big ? 0xffffff : YELLOW);
        a.material.opacity = 0.9 * (1 - qq); a.userData.dark.material.opacity = 0.5 * (1 - qq);
      }
      if (big && age === 0 && this.last !== f.hitId) { this.last = f.hitId; this.rings.spawn(mouth.x + f.facing * 0.5, mouth.y, { flat: false, from: 0.3, to: 2.2, life: 0.3, opacity: 0.9, z: 0.5 }); }
    }
  }
  dispose() { this.scene.remove(this.mega, ...this.arcs); }
}

// ---------------- MARCHA ----------------
const SHIRTS = [0xd6332a, 0xffd23a, 0x2f6bd6, 0x1fa34a];
class MarchaFx {
  constructor(scene) {
    this.scene = scene;
    this.crowd = SHIRTS.map((c, i) => { const m = makeMarcher(c, [0xd9a87e, 0x8a5a3a, 0xf0c8a8, 0xb07a52][i], i % 2 === 0); m.visible = false; scene.add(m); return m; });
    this.banner = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.5), new THREE.MeshBasicMaterial({ map: banner('MARCHA!', '#d6332a'), side: THREE.DoubleSide }));
    cloth.position.y = 2.25;
    const poles = [-1, 1].map((s) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 5), std(0x8a5a2b)); p.position.set(s * 1.02, 1.2, 0); return p; });
    this.banner.add(cloth, ...poles); this.banner.visible = false; scene.add(this.banner);
    this.dust = new Puffs(scene, 10, 0xd8c8a8, { opacity: 0.5 });
    this.confetti = new Shards(scene, 10, new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ color: YELLOW, side: THREE.DoubleSide }));
    this.last = -1;
  }
  update(dt, f, model, sp) {
    this.dust.update(dt); this.confetti.update(dt);
    const on = sp && f.t >= sp.startup - 6 && f.t < sp.startup + sp.active + 10;
    for (const m of this.crowd) m.visible = !!on;
    this.banner.visible = !!on;
    if (!on) return;
    const now = performance.now() / 1000;
    const k = Math.min(1, (f.t - sp.startup + 6) / 6, (sp.startup + sp.active + 10 - f.t) / 8);
    this.banner.position.set(f.x - f.facing * 0.55, 0, -0.35); this.banner.scale.set(1, Math.max(0.01, k), 1);
    this.crowd.forEach((m, i) => {
      const row = i % 2, col = Math.floor(i / 2);
      m.position.set(f.x - f.facing * (0.9 + col * 0.75 + row * 0.35), Math.abs(Math.sin(now * 10 + i)) * 0.06, -0.6 - row * 0.55);
      m.rotation.y = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
      m.scale.setScalar(0.9 * Math.max(0.01, k));
      wave(m.userData.cloth, now + i);
    });
    if (f.t !== this.last && f.t % 4 === 0 && f.t >= sp.startup) {
      this.last = f.t;
      this.dust.burst(new THREE.Vector3(f.x - f.facing * 1.2, 0.1, -0.3), { count: 2, spread: 0.8, up: 0.6, speed: 1.2, size: 0.35, grow: 2, life: 0.5, z: 0 });
      this.confetti.burst(new THREE.Vector3(f.x - f.facing * 0.6, 2.4, -0.3), { count: 1, speed: 1, up: 1.5, life: 1, size: 1, gravity: 3 });
    }
  }
  dispose() { this.scene.remove(...this.crowd, this.banner); }
}

export const BOULOS_FX = { megafone: MegafoneFx, marcha: MarchaFx };

// ---------------- visual de Hitter: BARRACA (zona) ----------------
export const BOULOS_VISUALS = {
  barraca: {
    build() {
      const g = new THREE.Group();
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 4, 1, Math.PI / 4), flat(TENT, 0.8, { side: THREE.DoubleSide }));
      marker.rotation.x = -Math.PI / 2; marker.position.y = 0.03;
      const tent = makeTent(TENT, true);
      const puffs = new Puffs(g, 8, 0xd8c8a8, { opacity: 0.6 });
      g.add(marker, tent);
      g.userData = { marker, tent, puffs, popped: false };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, now = performance.now() / 1000;
      u.puffs.update(dt);
      if (h.t <= 1) u.popped = false;
      const k = h.t - h.delay, end = h.delay + h.life;
      // aviso no chão durante o delay (pisca mais rápido perto de brotar)
      u.marker.visible = k < 4;
      u.marker.material.opacity = 0.5 + 0.4 * Math.sin(now * (10 + h.t * 0.6));
      u.marker.scale.setScalar(1 + 0.12 * Math.sin(now * 14));
      if (k <= 0) { u.tent.visible = false; return; }
      if (!u.popped) { u.popped = true; u.puffs.burst(new THREE.Vector3(0, 0.15, 0), { count: 8, spread: 1.4, up: 1.4, speed: 2.4, size: 0.4, grow: 2.2, life: 0.5, z: 0 }); }
      u.tent.visible = true;
      const pop = k < 5 ? easeOut(k / 5) * 1.25 : k < 9 ? 1.25 - 0.25 * ((k - 5) / 4) : 1;
      const fade = clamp01((end - h.t) / 8);
      u.tent.scale.set(fade, Math.max(0.01, pop * fade), fade);
      if (u.tent.userData.plate) u.tent.userData.plate.rotation.z = -0.08 + Math.sin(now * 6) * 0.05;
    },
  },
};
