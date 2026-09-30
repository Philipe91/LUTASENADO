// ULTIMATE do Xandor — "Avatar da Constituição" (composição de VFX, sem ultimate.glb).
// Transformação (durante a cinemática): aura dourada sobe, selo judicial acende atrás dele, olhos brilham.
// Golpes: cada hit da ultimate é uma CANETA que sai da órbita e crava no alvo exatamente no frame do dano.
// Finalizador: MARTELO colossal desce sobre o alvo no frame do golpe final → onda de choque → tudo se dissipa.
// Os frames vêm dos mesmos números da lógica (Fighter.updateUltimate): hit k = 12 + k·interval; final = 12 + hits·interval + 6.
import * as THREE from 'three';

const GOLD = 0xffd36b;
const add = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...extra });
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeIn = (x) => x * x * x;

function sealTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); g.translate(256, 256);
  g.strokeStyle = '#ffe9a8'; g.fillStyle = '#ffe9a8';
  g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 236, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 176, 0, Math.PI * 2); g.stroke();
  g.font = 'bold 34px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = '★ CONSTITUIÇÃO ★ SUPREMA ★ CONSTITUIÇÃO ★ SUPREMA ';
  for (let i = 0; i < txt.length; i++) {
    g.save(); g.rotate((i / txt.length) * Math.PI * 2); g.fillText(txt[i], 0, -206); g.restore();
  }
  // balança da justiça no centro
  g.lineWidth = 8; g.beginPath(); g.moveTo(0, -120); g.lineTo(0, 110); g.moveTo(-60, 110); g.lineTo(60, 110);
  g.moveTo(-110, -70); g.lineTo(110, -70); g.stroke();
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * 110, -70); g.lineTo(s * 70, 10); g.moveTo(s * 110, -70); g.lineTo(s * 150, 10); g.stroke();
    g.beginPath(); g.arc(s * 110, 10, 42, 0, Math.PI); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePen() {
  const g = new THREE.Group();
  g.scale.setScalar(2.2); // legível na câmera do jogo
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), std(0x111111, { metalness: 0.4 }));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.06, 8), std(GOLD, { metalness: 0.8, roughness: 0.25 }));
  band.position.y = 0.12;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), std(GOLD, { metalness: 0.8, roughness: 0.25 }));
  tip.position.y = -0.31; tip.rotation.x = Math.PI;
  g.add(body, band, tip);
  return g;
}

function makeBook(color) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.26), std(color)));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.24), std(0xf5ecd4));
  pages.position.x = 0.03; g.add(pages);
  const seal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), std(GOLD, { metalness: 0.8 }));
  seal.rotation.x = -Math.PI / 2; seal.position.y = 0.036; g.add(seal);
  return g;
}

function makeGavel() {
  const g = new THREE.Group();
  const wood = std(0x5a3418, { roughness: 0.45 }), gold = std(GOLD, { metalness: 0.85, roughness: 0.25, emissive: 0x6a4a10 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 20), wood);
  head.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.14, 20), gold);
    ring.rotation.z = Math.PI / 2; ring.position.x = s * 0.55; g.add(ring);
  }
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 2.6, 10), wood);
  handle.position.y = 1.3;
  g.add(head, handle);
  return g;
}

export class XandorAvatar {
  constructor(scene) {
    this.scene = scene;
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    this.root = root;
    // aura: coluna dourada + anel no chão
    // só a metade de trás da coluna (BackSide): não cobre o rosto/corpo
    const auraMat = add(GOLD, 0); auraMat.side = THREE.BackSide;
    this.aura = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 5, 24, 1, true), auraMat);
    this.aura.position.y = 2.5; root.add(this.aura);
    this.floor = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.9, 48), add(GOLD, 0));
    this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = 0.03; root.add(this.floor);
    // selo judicial atrás
    this.seal = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: sealTexture(), color: GOLD, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.seal.position.set(0, 3.4, -1.2); root.add(this.seal);
    // olhos
    const eyeMat = new THREE.SpriteMaterial({ color: 0xfff4c0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.eyes = [new THREE.Sprite(eyeMat), new THREE.Sprite(eyeMat)];
    for (const e of this.eyes) { e.scale.set(0.22, 0.12, 1); scene.add(e); e.visible = false; }
    // livros orbitando
    this.books = [0x7a1f1f, 0x1f3a7a, 0x2f5a2a].map((c) => { const b = makeBook(c); root.add(b); return b; });
    // canetas (uma por hit) — vivem no espaço do mundo
    this.pens = Array.from({ length: 8 }, () => { const p = makePen(); p.visible = false; scene.add(p); return p; });
    // manchas de tinta no impacto
    this.inks = Array.from({ length: 8 }, () => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: 0x14143a, transparent: true, opacity: 0, depthWrite: false }));
      m.scale.set(1.8, 0.35, 1); // risco de tinta (canetada), não disco
      m.visible = false; scene.add(m); return m;
    });
    // martelo colossal + onda de choque
    this.gavel = makeGavel(); this.gavel.visible = false; scene.add(this.gavel);
    this.shock = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 48), add(GOLD, 0));
    this.shock.rotation.x = -Math.PI / 2; this.shock.visible = false; scene.add(this.shock);
    this.k = 0; this.head = new THREE.Vector3();
  }

  // f: Fighter; match; model: GLBModel ativo (ossos p/ olhos). cine = frames restantes da cinemática (75→0) ou -1.
  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    // intensidade: sobe durante a cinemática, cai no fim da ultimate
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = 12 + u.hits * u.interval + 40;
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 45) : clamp01((end - f.t) / 14);
    this.k += (target - this.k) * Math.min(1, dt * 10);
    const k = this.k, now = performance.now() / 1000;
    const vis = k > 0.01;
    this.root.visible = vis;
    this.root.position.set(f.x, 0, 0);
    this.aura.material.opacity = 0.16 * k * (0.85 + 0.15 * Math.sin(now * 8));
    this.aura.scale.set(1, clamp01(k * 1.3), 1); this.aura.position.y = 2.5 * clamp01(k * 1.3);
    this.floor.material.opacity = 0.6 * k; this.floor.rotation.z = now * 0.8;
    this.seal.material.opacity = 0.75 * k; this.seal.rotation.z = -now * 0.35; this.seal.scale.setScalar(0.6 + 0.4 * k);
    this.seal.position.x = -0.3 * f.facing;
    this.books.forEach((b, i) => {
      const a = now * 1.6 + (i * Math.PI * 2) / 3;
      b.position.set(Math.cos(a) * 1.5, 2.6 + Math.sin(now * 2 + i) * 0.25, Math.sin(a) * 0.9);
      b.rotation.set(0.3, a * 1.5, 0.2);
      b.scale.setScalar(k);
    });
    // olhos brilhando na frente da cabeça
    const hb = model?.bones?.get('head');
    for (const [i, e] of this.eyes.entries()) {
      e.visible = vis && !!hb;
      if (!hb) continue;
      hb.getWorldPosition(this.head);
      e.position.set(this.head.x + f.facing * 0.2, this.head.y + 0.12, (i ? 0.09 : -0.09));
      e.material.opacity = k;
    }

    // canetas: saem da órbita 8 frames antes do hit e cravam no peito do alvo NO frame do dano
    const o = f.opponent, tgt = new THREE.Vector3(o.x, o.y + o.stats.height * 0.62, 0);
    for (let i = 0; i < this.pens.length; i++) {
      const p = this.pens[i], hitF = 12 + i * u.interval, s = hitF - 8;
      const live = on && cine < 0 && i < u.hits && f.t >= s && f.t < hitF + 10;
      p.visible = live;
      const ink = this.inks[i];
      if (!live) { if (!on) ink.visible = false; continue; }
      const q = clamp01((f.t - s) / 8);
      const from = new THREE.Vector3(f.x + Math.cos(i * 2.1) * 1.3, 3.2 + (i % 2) * 0.4, 0.3);
      if (f.t < hitF) {
        p.position.lerpVectors(from, tgt, easeIn(q));
        p.lookAt(tgt); p.rotateX(Math.PI / 2);
      } else {
        p.position.copy(tgt).add(new THREE.Vector3(-f.facing * 0.1, 0.05 * i, 0.3));
        ink.visible = true; ink.position.set(tgt.x, tgt.y, 0.45);
        ink.material.opacity = 0.8 * (1 - (f.t - hitF) / 10);
        ink.rotation.z = (i % 2 ? 0.6 : -0.6);
        ink.scale.set(1.2 + (f.t - hitF) * 0.12, 0.3, 1);
      }
    }
    // martelo: aparece 14 frames antes do golpe final bem acima do alvo e desce girando até a cabeça no frame do dano
    const gs = fin - 14, gt = f.t;
    const gOn = on && cine < 0 && gt >= gs && gt < fin + 16;
    this.gavel.visible = gOn;
    if (gOn) {
      const q = clamp01((gt - gs) / 14);
      const headY = o.y + o.stats.height + 0.6;
      this.gavel.position.set(o.x - f.facing * 1.0, headY + (1 - easeIn(q)) * 6, 0);
      this.gavel.rotation.set(0, 0, f.facing * (-1.4 + easeIn(q) * 1.4));
      this.gavel.scale.setScalar(gt >= fin ? Math.max(0.01, 1 - (gt - fin) / 16) : 1);
    }
    const sOn = on && gt >= fin && gt < fin + 20;
    this.shock.visible = sOn;
    if (sOn) {
      const q = (gt - fin) / 20;
      this.shock.position.set(o.x, 0.05, 0);
      this.shock.scale.setScalar(1 + q * 5);
      this.shock.material.opacity = 0.9 * (1 - q);
    }
  }

  dispose() {
    this.scene.remove(this.root, this.gavel, this.shock, ...this.eyes, ...this.pens, ...this.inks);
  }
}
