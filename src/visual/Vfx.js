// VFX leves: faíscas e anéis em pool + visuais dos Hitters (projéteis, zonas, veículos, multidões).
// Nada é criado/destruído durante a luta: tudo vem de pools e volta pra eles (ENTRA → IMPACTA → SOME).
import * as THREE from 'three';
import { PROJECTILE_VISUALS } from './projectiles.js';
import { XANDOR_VISUALS } from './xandorVisuals.js';
import { loadGLTF } from './models/GLBModel.js';

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
const VISUALS = { ...BASIC_VISUALS, ...PROJECTILE_VISUALS, ...XANDOR_VISUALS };

export class Vfx {
  constructor(scene) {
    this.scene = scene;
    this.tex = sparkTexture();
    this.sparks = [];
    for (let i = 0; i < 80; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      s.visible = false;
      scene.add(s);
      this.sparks.push({ s, life: 0, vx: 0, vy: 0 });
    }
    this.rings = [];
    for (let i = 0; i < 8; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      r.visible = false;
      scene.add(r);
      this.rings.push({ r, life: 0 });
    }
    // poeira no chão (pisão): discos achatados que abrem e somem — pool fixo
    this.dusts = [];
    for (let i = 0; i < 4; i++) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xc9b089, transparent: true, depthWrite: false }));
      d.rotation.x = -Math.PI / 2; d.visible = false;
      scene.add(d);
      this.dusts.push({ d, life: 0, max: 1 });
    }
    this.active = new Map();   // hitter.id -> view
    this.pools = new Map();    // visual -> [views livres]
    this.created = 0;
  }

  burst(x, y, { heavy = false, blocked = false, ultimate = false, color: forced } = {}) {
    const color = forced ?? (blocked ? 0x7fc8ff : ultimate ? 0xff5bd8 : 0xffe07a);
    const n = blocked ? 6 : heavy ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const p = this.sparks.find((q) => q.life <= 0);
      if (!p) break;
      const a = Math.random() * Math.PI * 2, v = (heavy ? 5 : 3) * (0.5 + Math.random());
      p.life = p.max = 0.22 + Math.random() * 0.15;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
      p.s.position.set(x, y, 0.4);
      p.s.material.color.setHex(color);
      const size = (heavy ? 0.5 : 0.35) * (0.6 + Math.random() * 0.6);
      p.s.scale.set(size, size, 1);
      p.s.visible = true;
    }
    if (heavy || ultimate) {
      const r = this.rings.find((q) => q.life <= 0);
      if (r) {
        r.life = r.max = 0.3;
        r.r.position.set(x, y, 0.5);
        r.r.material.color.setHex(color);
        r.r.visible = true;
      }
    }
  }

  dust(x, size = 1) {
    const q = this.dusts.find((o) => o.life <= 0) || this.dusts[0];
    q.life = q.max = 0.35; q.size = size;
    q.d.position.set(x, 0.03, 0);
    q.d.visible = true;
  }

  // ---------- pool de visuais de Hitter ----------
  acquire(h) {
    const key = VISUALS[h.visual] ? h.visual : 'orb';
    const pool = this.pools.get(key) || [];
    this.pools.set(key, pool);
    let v = pool.pop();
    if (!v) {
      v = VISUALS[key].build(h);
      v.userData.key = key;
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
    this.pools.get(v.userData.key).push(v);
  }

  // Gancho para assets melhores: se o GLB do prop existir, ele substitui o placeholder dentro do mesmo view
  tryModel(v, url) {
    v.userData.glbTried = true;
    loadGLTF(url).then((gltf) => {
      // mede o placeholder no espaço LOCAL do view (independe de onde/como ele está agora)
      const pos = v.position.clone(), rot = v.rotation.clone();
      v.position.set(0, 0, 0); v.rotation.set(0, 0, 0); v.updateMatrixWorld(true);
      const placeholder = new THREE.Box3().setFromObject(v);
      const want = placeholder.getSize(new THREE.Vector3());
      const m = gltf.scene.clone(true);
      const got = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
      m.scale.setScalar(Math.max(want.x, want.y) / Math.max(got.x, got.y, 1e-3));
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m);
      const c = box.getCenter(new THREE.Vector3()), pc = placeholder.getCenter(new THREE.Vector3());
      m.position.set(pc.x - c.x, placeholder.min.y - box.min.y, pc.z - c.z);
      for (const child of v.children) child.visible = false;
      v.add(m);
      v.position.copy(pos); v.rotation.copy(rot);
      v.userData.glb = m;
    }).catch(() => {});
  }

  update(dt, match) {
    for (const p of this.sparks) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt;
      p.vy -= 9 * dt;
      p.s.material.opacity = Math.max(0, p.life / p.max);
      if (p.life <= 0) p.s.visible = false;
    }
    for (const q of this.rings) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / q.max;
      q.r.scale.setScalar(0.5 + k * 2.5);
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
    const alive = new Set();
    for (const h of match?.hitters || []) {
      alive.add(h.id);
      let v = this.active.get(h.id);
      if (!v) { v = this.acquire(h); this.active.set(h.id, v); }
      const u = v.userData;
      v.position.set(h.x + (u.offX || 0) * h.facing, h.y + (u.center ? h.h / 2 : u.offY || 0), 0);
      VISUALS[u.key].animate?.(v, h, dt);
    }
    for (const [id, v] of this.active) {
      if (!alive.has(id)) { this.release(v); this.active.delete(id); }
    }
  }

  clear() {
    for (const [, v] of this.active) this.release(v);
    this.active.clear();
  }
}
