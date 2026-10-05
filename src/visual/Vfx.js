// VFX leves: faíscas e anéis em pool + visuais dos Hitters (projéteis, zonas, veículos, multidões).
// Nada é criado/destruído durante a luta: tudo vem de pools e volta pra eles (ENTRA → IMPACTA → SOME).
import * as THREE from 'three';
import { PROJECTILE_VISUALS } from './projectiles.js';
import { XANDOR_VISUALS } from './xandorVisuals.js';
import { VORCARO_VISUALS } from './fx/vorcaroFx.js';
import { CLONE_VISUALS } from './fx/cloneFx.js';
import { FLAVIO_VISUALS } from './fx/flavioFx.js';
import { DUVAL_VISUALS } from './fx/duvalFx.js';
import { swapToGLB } from './propModel.js';
import { Puffs, Shards } from './fx/common.js';

function sparkTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,240,180,0.9)');
  grd.addColorStop(1, 'rgba(255,160,40,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// estrela de impacto (4 pontas, centro branco, pontas quentes) — o "clarão" seco do golpe forte
function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(64, 64);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, 60);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,250,210,0.9)'); grd.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? 14 : 62, a = (i / 8) * Math.PI * 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill();
  g.beginPath(); // segunda estrela menor girada 45°
  for (let i = 0; i < 8; i++) { const r = i % 2 ? 9 : 34, a = (i / 8) * Math.PI * 2 + Math.PI / 8; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
}
// rastro de projétil: disco macio
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...extra });

// visuais simples dos especiais antigos (mesma interface dos PROJECTILE_VISUALS)
const BASIC_VISUALS = {
  flash: { build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }))); g.userData.center = true; return g; } },
  paper: { build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.32), std(0xfaf6e8))); g.userData.center = true; return g; }, animate: (v, h, dt) => { v.rotation.z += dt * 14 * h.facing; } },
  book: { build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.4), std(0x6b3f1d))); g.userData.center = true; return g; }, animate: (v, h, dt) => { v.rotation.z += dt * 14 * h.facing; } },
  wave: { build: () => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.5, 5), std(0x8a6a3a)); m.position.y = 0.25; g.add(m); return g; } },
  stamp: { build: () => dropper(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.8), std(0xd62828)), 0xd62828, 5) , animate: animateDrop },
  pen: { build: () => dropper(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.02, 2.4, 10), std(0x111111, { metalness: 0.4 })), 0x111111, 6), animate: animateDrop },
  orb: { build: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffcc33 }))); g.userData.center = true; return g; } },
};
function dropper(obj, color, fromY) {
  const g = new THREE.Group();
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2; marker.position.y = 0.03;
  g.add(marker, obj);
  g.userData.drop = obj; g.userData.fromY = fromY;
  return g;
}
function animateDrop(v, h) {
  const k = Math.min(1, h.t / Math.max(1, h.delay));
  const d = v.userData.drop;
  d.position.y = v.userData.fromY - (v.userData.fromY - 0.25) * k * k;
  d.visible = k > 0.35;
}
const VISUALS = { ...BASIC_VISUALS, ...PROJECTILE_VISUALS, ...XANDOR_VISUALS, ...VORCARO_VISUALS, ...CLONE_VISUALS, ...FLAVIO_VISUALS, ...DUVAL_VISUALS };

export class Vfx {
  constructor(scene) {
    this.scene = scene;
    this.tex = sparkTexture();
    this.sparks = [];
    for (let i = 0; i < 80; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      s.visible = false;
      scene.add(s);
      this.sparks.push({ s, life: 0, vx: 0, vy: 0, streak: 1 });
    }
    // clarão em estrela (golpe pesado / ultimate): nasce pequeno, estoura e some em ~6 quadros
    this.starTex = starTexture();
    this.stars = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.starTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      s.visible = false; s.renderOrder = 6;
      scene.add(s);
      this.stars.push({ s, life: 0, max: 1, size: 1 });
    }
    this.rings = [];
    for (let i = 0; i < 8; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      r.visible = false;
      scene.add(r);
      this.rings.push({ r, life: 0, max: 1, to: 3 });
    }
    // poeira no chão (pisão/queda): disco achatado que abre + nuvens iluminadas + torrões — pools fixos
    this.dusts = [];
    for (let i = 0; i < 4; i++) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xc9b089, transparent: true, depthWrite: false }));
      d.rotation.x = -Math.PI / 2; d.visible = false;
      scene.add(d);
      this.dusts.push({ d, life: 0, max: 1 });
    }
    this.puffs = new Puffs(scene, 18, 0xd2c3a2, { lit: true, opacity: 0.7 });
    this.clods = new Shards(scene, 10, new THREE.DodecahedronGeometry(0.045, 0), std(0x8a7355));
    // rastro de projéteis: fantasmas aditivos deixados pelo caminho (ENTRA → SOME em ~0,2 s)
    this.dotTex = dotTexture();
    this.trail = [];
    for (let i = 0; i < 48; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dotTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      s.visible = false;
      scene.add(s);
      this.trail.push({ s, life: 0, max: 1, size: 0.3 });
    }
    this.trailLast = new Map(); // hitter.id -> última posição onde deixou fantasma
    this.active = new Map();   // hitter.id -> view
    this.pools = new Map();    // visual -> [views livres]
    this.created = 0;
    this.v3 = new THREE.Vector3();
  }

  // IMPACTA: faíscas (riscos no golpe forte, empurradas no sentido do golpe), estrela de clarão e anel de choque.
  // Peso cresce com a força: normal 9 faíscas · pesado 18 + estrela + anel · ultimate 24 + estrela grande + 2 anéis
  burst(x, y, { heavy = false, blocked = false, ultimate = false, color: forced, dir = 0, force = 1 } = {}) {
    const color = forced ?? (blocked ? 0x7fc8ff : ultimate ? 0xff5bd8 : 0xffe07a);
    const strong = heavy || ultimate, F = Math.min(1.6, Math.max(0.6, force || 1));
    const n = blocked ? 6 : ultimate ? 24 : heavy ? 18 : 9;
    for (let i = 0; i < n; i++) {
      const p = this.sparks.find((q) => q.life <= 0);
      if (!p) break;
      const a = Math.random() * Math.PI * 2, v = (strong ? 6 * F : 3) * (0.5 + Math.random());
      p.life = p.max = (strong ? 0.26 : 0.22) + Math.random() * 0.15;
      p.vx = Math.cos(a) * v + dir * (strong ? 2.5 : 0.8); p.vy = Math.sin(a) * v + (strong ? 1.2 : 0);
      p.s.position.set(x, y, 0.4);
      p.s.material.color.setHex(color);
      const size = (strong ? 0.42 : 0.35) * (0.6 + Math.random() * 0.6);
      p.streak = strong ? 2.2 + Math.random() * 1.5 : 1; // risco alongado no sentido do voo
      p.size = size;
      p.s.scale.set(size * p.streak, size, 1);
      p.s.visible = true;
    }
    if (strong) {
      const st = this.stars.find((q) => q.life <= 0) || this.stars[0];
      st.life = st.max = ultimate ? 0.16 : 0.12; st.size = (ultimate ? 2.6 : 1.5) * F;
      st.s.position.set(x, y, 0.55); st.s.material.color.setHex(blocked ? 0xbfe4ff : 0xffffff);
      st.s.material.rotation = Math.random() * Math.PI; st.s.visible = true;
      const rings = ultimate ? 2 : 1;
      for (let i = 0; i < rings; i++) {
        const r = this.rings.find((q) => q.life <= 0);
        if (!r) break;
        r.life = r.max = (ultimate ? 0.34 : 0.28) + i * 0.06; r.to = (ultimate ? 2.8 : 2.1) * F + i * 0.8;
        r.r.position.set(x, y, 0.5 - i * 0.05);
        r.r.material.color.setHex(i ? 0xffffff : color);
        r.r.visible = true;
      }
    }
  }

  // SOME no chão: disco que abre + nuvens iluminadas + torrões (queda, pisão, dash). size ≥ 0.6 = queda de corpo
  dust(x, size = 1) {
    const q = this.dusts.find((o) => o.life <= 0) || this.dusts[0];
    q.life = q.max = 0.35; q.size = size;
    q.d.position.set(x, 0.03, 0);
    q.d.visible = true;
    if (size >= 0.6) {
      const s = Math.min(1.2, size);
      this.puffs.burst(this.v3.set(x, 0.1, 0.25), { count: Math.round(4 + s * 4), spread: 1.2 * s, up: 0.9, speed: 2.0 * s, size: 0.14 + 0.12 * s, grow: 2.0, life: 0.4 });
      this.clods.burst(this.v3.set(x, 0.1, 0.25), { count: 4, speed: 2.2, up: 3.0, life: 0.45, size: 0.8, spreadZ: 0.6 });
    }
  }

  // ---------- pool de visuais de Hitter ----------
  acquire(h) {
    const key = VISUALS[h.visual] ? h.visual : 'orb';
    const pk = h.variant ? `${key}:${h.variant}` : key; // variante (ex.: ajudante 'flavio') tem pool próprio
    const pool = this.pools.get(pk) || [];
    this.pools.set(pk, pool);
    let v = pool.pop();
    if (!v) {
      v = VISUALS[key].build(h);
      v.userData.key = key; v.userData.pool = pk;
      this.scene.add(v);
      this.created++;
    }
    v.visible = true;
    v.rotation.set(0, 0, 0);
    if (h.model && !v.userData.glbTried) this.tryModel(v, h.model);
    return v;
  }

  release(v) {
    v.visible = false;
    this.pools.get(v.userData.pool || v.userData.key).push(v);
  }

  // Gancho para assets melhores: se o GLB do prop existir, ele substitui SÓ o corpo procedural do view
  // (userData.glbBody → body → spin → drop → o grupo todo). Fumaça, rastro, poeira, textos ("FOM FOM!") e o que
  // estiver marcado userData.keep continuam; o GLB herda a animação do corpo (giro, balanço, queda).
  tryModel(v, url) {
    v.userData.glbTried = true;
    const u = v.userData;
    swapToGLB(u.glbBody || u.body || u.spin || u.drop || v, url, { keep: u.glbKeep });
  }

  update(dt, match) {
    for (const p of this.sparks) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt;
      p.vy -= 9 * dt;
      const k = p.life / p.max;
      p.s.material.opacity = Math.max(0, k);
      if (p.streak > 1) { p.s.material.rotation = Math.atan2(p.vy, p.vx); p.s.scale.set(p.size * (1 + (p.streak - 1) * k), p.size * (0.6 + 0.4 * k), 1); } // risco encolhe ao morrer
      if (p.life <= 0) p.s.visible = false;
    }
    for (const q of this.stars) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / q.max;
      const sc = q.size * (k < 0.3 ? 0.4 + (k / 0.3) * 0.6 : 1 + (k - 0.3) * 0.5); // estoura e cresce um pouco enquanto some
      q.s.scale.set(sc, sc, 1);
      q.s.material.opacity = k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7;
      if (q.life <= 0) q.s.visible = false;
    }
    for (const q of this.rings) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / q.max;
      const e = 1 - (1 - k) * (1 - k); // abre rápido, assenta
      q.r.scale.setScalar(0.4 + e * (q.to || 3));
      q.r.material.opacity = 1 - k;
      if (q.life <= 0) q.r.visible = false;
    }

    for (const q of this.dusts) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / q.max;
      q.d.scale.set(q.size * (0.6 + k * 1.6), q.size * (0.35 + k * 0.6), 1);
      q.d.material.opacity = 0.7 * (1 - k);
      if (q.life <= 0) q.d.visible = false;
    }
    this.puffs.update(dt); this.clods.update(dt);
    for (const t of this.trail) {
      if (t.life <= 0) continue;
      t.life -= dt;
      const k = Math.max(0, t.life / t.max);
      t.s.material.opacity = 0.75 * k; t.s.scale.setScalar(t.size * (0.3 + 0.7 * k));
      if (t.life <= 0) t.s.visible = false;
    }
    const alive = new Set();
    for (const h of match?.hitters || []) {
      alive.add(h.id);
      let v = this.active.get(h.id);
      if (!v) { v = this.acquire(h); this.active.set(h.id, v); }
      const u = v.userData;
      v.position.set(h.x + (u.offX || 0) * h.facing, h.y + (u.center ? h.h / 2 : u.offY || 0), 0);
      VISUALS[u.key].animate?.(v, h, dt);
      // rastro: projétil em voo (anda em x) deixa fantasmas a cada ~0,18 m
      if (h.armed && !h.spent && !h.dead && Math.abs(h.vx) > 0.03 && h.w <= 1.4) {
        const cx = v.position.x, cy = h.y + h.h / 2;
        const last = this.trailLast.get(h.id);
        if (!last || Math.hypot(cx - last.x, cy - last.y) > 0.18) {
          this.trailLast.set(h.id, { x: cx, y: cy });
          const t = this.trail.find((q) => q.life <= 0);
          if (t) {
            t.life = t.max = 0.2; t.size = Math.min(0.55, Math.max(0.2, h.h * 0.55));
            t.s.position.set(cx, cy, -0.1); t.s.material.color.setHex(h.color ?? 0xffcc33); t.s.visible = true;
          }
        }
      }
    }
    for (const [id, v] of this.active) {
      if (!alive.has(id)) { this.release(v); this.active.delete(id); this.trailLast.delete(id); }
    }
  }

  clear() {
    for (const [, v] of this.active) this.release(v);
    this.active.clear();
    this.trailLast.clear();
    for (const t of this.trail) { t.life = 0; t.s.visible = false; }
  }
}
