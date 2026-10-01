// Utilidades compartilhadas pelos VFX: materiais, texturas de canvas, sprites de texto e POOLS
// de nuvens (Puffs), anéis (Rings) e estilhaços (Shards). Tudo criado uma vez; ENTRA → IMPACTA → SOME.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- geometria fundida com cor por vértice (1 draw call; serve pra InstancedMesh) ----
// parts: [{ geo, color, p: [x,y,z], r: [x,y,z], s: [x,y,z] | número }]
export function mergeParts(parts) {
  const geos = parts.map(({ geo, color, p = [0, 0, 0], r = [0, 0, 0], s = 1 }) => {
    const g = geo.clone();
    const sc = typeof s === 'number' ? [s, s, s] : s;
    g.scale(sc[0], sc[1], sc[2]);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[0], r[1], r[2])));
    g.translate(p[0], p[1], p[2]);
    const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}

// ponto do corpo: osso do GLB se existir, senão estimativa a partir da lógica (placeholder não tem ossos)
const _bp = new THREE.Vector3();
export function bodyPoint(out, f, model, bone, { dx = 0, y = 1 } = {}) {
  const b = model?.bones?.get(bone);
  if (b) { b.getWorldPosition(_bp); return out.copy(_bp); }
  return out.set(f.x + f.facing * dx, f.y + y, f.heldZ || 0);
}

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const easeIn = (x) => clamp01(x) ** 3;
export const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;
export const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...extra });
export const toon = (c, extra = {}) => new THREE.MeshToonMaterial({ color: c, ...extra });
export const flat = (c, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity, depthWrite: false, ...extra });
export const add = (c, opacity = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// sprite de texto estilo quadrinho (contorno grosso). w/h em metros.
export function textSprite(text, { color = '#fff', stroke = '#000', font = 'bold 72px Bangers, Impact, sans-serif', w = 1.2, h = 0.4, bubble = null } = {}) {
  const tex = canvasTex(512, 170, (g, W, H) => {
    if (bubble) {
      g.fillStyle = bubble; g.strokeStyle = stroke; g.lineWidth = 8;
      roundRect(g, 10, 14, W - 20, H - 44, 36); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(W * 0.3, H - 32); g.lineTo(W * 0.22, H - 4); g.lineTo(W * 0.42, H - 32); g.closePath(); g.fill(); g.stroke();
    }
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(text, W / 2, H / 2 - (bubble ? 14 : 0));
    g.fillStyle = color; g.fillText(text, W / 2, H / 2 - (bubble ? 14 : 0));
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(w, h, 1); s.renderOrder = 8;
  return s;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

// nuvens: esferas chapadas que nascem num ponto, se afastam, crescem e somem
export class Puffs {
  constructor(parent, n = 16, color = 0x2b1245, { lit = false, opacity = 0.9 } = {}) {
    this.items = [];
    this.baseOpacity = opacity;
    const geo = new THREE.SphereGeometry(0.5, 10, 8);
    for (let i = 0; i < n; i++) {
      const mat = lit ? new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0, roughness: 1, depthWrite: false })
        : new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false; parent.add(m);
      this.items.push({ m, life: 0, max: 1, v: new THREE.Vector3(), s0: 1, s1: 2, g: 0 });
    }
  }
  // dispara `count` nuvens a partir de `at` (Vector3), espalhadas em `spread`, subindo `up` m/s
  burst(at, { count = 8, spread = 1.2, up = 1.2, speed = 2.2, size = 0.8, grow = 2.2, life = 0.9, gravity = 0, color = null, z = 0.2 } = {}) {
    for (let i = 0; i < count; i++) {
      const p = this.items.find((q) => q.life <= 0);
      if (!p) break;
      const a = Math.random() * Math.PI * 2, r = Math.random();
      p.life = p.max = life * (0.75 + Math.random() * 0.5);
      p.m.position.set(at.x + Math.cos(a) * spread * r * 0.4, at.y + (Math.random() - 0.3) * spread * 0.3, at.z + z + Math.sin(a) * spread * r * 0.3);
      p.v.set(Math.cos(a) * speed * (0.4 + r), up * (0.5 + Math.random()), Math.sin(a) * speed * 0.6 * r);
      p.s0 = size * (0.6 + Math.random() * 0.6); p.s1 = p.s0 * grow; p.g = gravity;
      if (color !== null) p.m.material.color.setHex(color);
      p.m.visible = true;
    }
  }
  update(dt) {
    for (const p of this.items) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const k = 1 - p.life / p.max;
      p.v.y -= p.g * dt; p.v.multiplyScalar(1 - dt * 2.5);
      p.m.position.addScaledVector(p.v, dt);
      p.m.scale.setScalar(p.s0 + (p.s1 - p.s0) * easeOut(k));
      p.m.material.opacity = this.baseOpacity * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      if (p.life <= 0) p.m.visible = false;
    }
  }
  clear() { for (const p of this.items) { p.life = 0; p.m.visible = false; } }
}

// anéis de choque (no chão ou de pé) que abrem e somem
export class Rings {
  constructor(parent, n = 6, color = 0xffffff, { additive = true, inner = 0.7, outer = 1.0, segs = 48 } = {}) {
    this.items = [];
    const geo = new THREE.RingGeometry(inner, outer, segs);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, additive ? add(color, 0) : flat(color, 0, { side: THREE.DoubleSide }));
      m.visible = false; parent.add(m);
      this.items.push({ m, life: 0, max: 1, from: 1, to: 3, op: 1 });
    }
  }
  // flat=true: deitado no chão; z = profundidade
  spawn(x, y, { flat: lie = true, from = 0.3, to = 3, life = 0.4, opacity = 0.9, color = null, z = 0.1, tilt = 0 } = {}) {
    const q = this.items.find((o) => o.life <= 0) || this.items[0];
    q.life = q.max = life; q.from = from; q.to = to; q.op = opacity;
    q.m.position.set(x, y, z);
    q.m.rotation.set(lie ? -Math.PI / 2 : tilt, 0, 0);
    if (color !== null) q.m.material.color.setHex(color);
    q.m.visible = true;
  }
  update(dt) {
    for (const q of this.items) {
      if (q.life <= 0) continue;
      q.life -= dt;
      const k = 1 - q.life / q.max;
      q.m.scale.setScalar(q.from + (q.to - q.from) * easeOut(k));
      q.m.material.opacity = q.op * (1 - k);
      if (q.life <= 0) q.m.visible = false;
    }
  }
}

// estilhaços: pedacinhos (pedra, botão, vidro) voando com gravidade e girando
export class Shards {
  constructor(parent, n = 20, geo = new THREE.DodecahedronGeometry(0.1, 0), mat = std(0x8a6a3a)) {
    this.items = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat); m.visible = false; m.castShadow = true; parent.add(m);
      this.items.push({ m, life: 0, max: 1, v: new THREE.Vector3(), w: new THREE.Vector3(), s: 1 });
    }
  }
  burst(at, { count = 8, speed = 4, up = 4, life = 0.8, size = 1, spreadZ = 1, gravity = 12, dirX = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const p = this.items.find((q) => q.life <= 0);
      if (!p) break;
      p.life = p.max = life * (0.7 + Math.random() * 0.6);
      p.m.position.copy(at);
      p.v.set((Math.random() - 0.5 + dirX * 0.6) * speed * 2, up * (0.5 + Math.random()), (Math.random() - 0.3) * spreadZ * speed);
      p.w.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
      p.s = size * (0.5 + Math.random()); p.g = gravity;
      p.m.scale.setScalar(p.s); p.m.visible = true;
    }
  }
  update(dt) {
    for (const p of this.items) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.05) { p.m.position.y = 0.05; p.v.y *= -0.3; p.v.x *= 0.7; }
      p.m.rotation.x += p.w.x * dt; p.m.rotation.y += p.w.y * dt; p.m.rotation.z += p.w.z * dt;
      const k = p.life / p.max;
      p.m.scale.setScalar(p.s * Math.min(1, k * 4));
      if (p.life <= 0) p.m.visible = false;
    }
  }
}
