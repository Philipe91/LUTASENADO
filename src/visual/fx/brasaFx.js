// VFX presos ao corpo do CAPITÃO BRASA (interface do SpecialFx: update(dt, f, model, sp) com sp = especial ativo ou null)
//   rajada    — "Talkei Rajada": metralhadora de dedo: estrelas de impacto na área do golpe, linhas de velocidade
//               e balões "TALKEI?" saindo da boca
//   motociata — moto low-poly nasce embaixo dele (empinando) e mais 3 motos instanciadas atravessam a arena em faixas
//               de profundidade diferentes, com fumaça verde-amarela; no fim as motos seguem sozinhas e somem
import * as THREE from 'three';
import { Puffs, mergeParts, bodyPoint, textSprite, canvasTex, clamp01, easeOut, add } from './common.js';

const GREEN = 0x1fa34a, YELLOW = 0xffd400;

function starTexture() {
  return canvasTex(96, 96, (g) => {
    g.translate(48, 48); g.fillStyle = '#fff6b0'; g.strokeStyle = '#4a3a00'; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 12 : 44, a = (i / 8) * Math.PI * 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke();
  });
}

class RajadaFx {
  constructor(scene) {
    this.scene = scene; this.head = new THREE.Vector3();
    const tex = starTexture();
    this.stars = Array.from({ length: 12 }, (_, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: i % 3 === 0 ? 0x9af07a : 0xffffff }));
      s.visible = false; s.renderOrder = 7; scene.add(s);
      return { s, life: 0, max: 1 };
    });
    this.bubbles = Array.from({ length: 3 }, () => {
      const b = textSprite('TALKEI?', { bubble: '#ffffff', color: '#111', stroke: '#111', font: 'bold 70px Bangers, Impact, sans-serif', w: 1.5, h: 0.5 });
      b.visible = false; scene.add(b);
      return { s: b, life: 0, max: 1, born: -1 };
    });
    this.lines = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.05), add(0xfff0a0, 0));
      m.visible = false; scene.add(m); return m;
    });
    this.lastSpawn = -1; this.lastBubble = -1;
  }
  update(dt, f, model, sp) {
    const active = sp && f.t >= sp.startup && f.t < sp.startup + sp.active;
    if (!sp) { this.lastSpawn = -1; this.lastBubble = -1; }
    const box = sp?.box || { x: 0.2, y: 0.95, w: 0.85, h: 0.5 };
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    if (active && f.t !== this.lastSpawn && f.t % 2 === 0) {
      this.lastSpawn = f.t;
      for (let n = 0; n < 2; n++) {
        const st = this.stars.find((q) => q.life <= 0); if (!st) break;
        st.life = st.max = 0.14;
        st.s.position.set(f.x + f.facing * (box.x + 0.1 + Math.random() * box.w), f.y + box.y + Math.random() * box.h, 0.45);
        st.s.material.rotation = Math.random() * Math.PI;
        st.s.visible = true;
      }
      const k = Math.floor((f.t - sp.startup) / 8);
      if (k !== this.lastBubble && k < 3) {
        this.lastBubble = k;
        const b = this.bubbles[k];
        b.life = b.max = 0.6; b.s.visible = true;
        b.s.position.set(this.head.x + f.facing * (0.55 + k * 0.25), this.head.y + 0.45 + k * 0.28, 0.5);
      }
    }
    for (const st of this.stars) {
      if (st.life <= 0) continue;
      st.life -= dt;
      const q = 1 - st.life / st.max;
      const sc = 0.45 + easeOut(q) * 0.75;
      st.s.scale.set(sc, sc, 1); st.s.material.opacity = 1 - q * q;
      if (st.life <= 0) st.s.visible = false;
    }
    for (const b of this.bubbles) {
      if (b.life <= 0) continue;
      b.life -= dt;
      const q = 1 - b.life / b.max;
      const pop = Math.min(1, q / 0.12);
      b.s.scale.set(1.5 * pop, 0.5 * pop, 1);
      b.s.position.y += dt * 0.35;
      b.s.material.opacity = q > 0.75 ? (1 - q) / 0.25 : 1;
      if (b.life <= 0) b.s.visible = false;
    }
    this.lines.forEach((m, i) => {
      m.visible = !!active;
      if (!active) return;
      m.position.set(f.x + f.facing * (box.x + 0.2 + ((i * 0.37 + f.t * 0.13) % 1) * box.w), f.y + box.y + ((i * 0.61 + f.t * 0.07) % 1) * box.h, 0.35);
      m.material.opacity = 0.5 + 0.5 * Math.sin(f.t * 2.1 + i);
    });
  }
  dispose() { this.scene.remove(...this.stars.map((s) => s.s), ...this.bubbles.map((b) => b.s), ...this.lines); }
}

// ---- moto low-poly (geometria fundida, 1 draw call para as 4 motos) ----
function bikeGeometry() {
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const parts = [
    { geo: new THREE.TorusGeometry(0.3, 0.1, 8, 16), color: 0x151515, p: [0.66, 0.3, 0] },
    { geo: new THREE.TorusGeometry(0.3, 0.1, 8, 16), color: 0x151515, p: [-0.66, 0.3, 0] },
    { geo: new THREE.CylinderGeometry(0.13, 0.13, 0.14, 8), color: 0xa0a0a0, p: [0.66, 0.3, 0], r: [Math.PI / 2, 0, 0] },
    { geo: new THREE.CylinderGeometry(0.13, 0.13, 0.14, 8), color: 0xa0a0a0, p: [-0.66, 0.3, 0], r: [Math.PI / 2, 0, 0] },
    { geo: B(1.0, 0.12, 0.14), color: 0x2a2a2a, p: [0, 0.52, 0] },
    { geo: B(0.42, 0.32, 0.36), color: 0x6e6e6e, p: [0.02, 0.44, 0] },
    { geo: new THREE.SphereGeometry(0.27, 12, 8), color: GREEN, p: [0.15, 0.78, 0], s: [1.25, 0.8, 1] },
    { geo: B(0.55, 0.05, 0.3), color: YELLOW, p: [0.15, 0.96, 0] },
    { geo: B(0.42, 0.1, 0.3), color: 0x111111, p: [-0.32, 0.8, 0] },
    { geo: B(0.5, 0.06, 0.32), color: GREEN, p: [-0.64, 0.68, 0] },
    { geo: B(0.07, 0.62, 0.07), color: 0xa0a0a0, p: [0.52, 0.62, 0], r: [0, 0, 0.45] },
    { geo: B(0.06, 0.06, 0.72), color: 0x222222, p: [0.4, 0.98, 0] },
    { geo: new THREE.SphereGeometry(0.11, 10, 8), color: 0xffe680, p: [0.6, 0.88, 0] },
    { geo: new THREE.CylinderGeometry(0.05, 0.06, 0.8, 8), color: 0xd0d0d0, p: [-0.35, 0.36, 0.2], r: [0, 0, Math.PI / 2] },
  ];
  return mergeParts(parts);
}
function riderGeometry() {
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  return mergeParts([
    { geo: new THREE.CapsuleGeometry(0.16, 0.4, 3, 8), color: GREEN, p: [-0.12, 1.15, 0], r: [0, 0, -0.45] },
    { geo: new THREE.SphereGeometry(0.16, 10, 8), color: 0xf1c6a5, p: [0.05, 1.5, 0] },
    { geo: new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), color: YELLOW, p: [0.05, 1.52, 0] },
    { geo: B(0.5, 0.08, 0.08), color: GREEN, p: [0.2, 1.22, 0.2], r: [0, 0, -0.45] },
    { geo: B(0.5, 0.08, 0.08), color: GREEN, p: [0.2, 1.22, -0.2], r: [0, 0, -0.45] },
    { geo: B(0.12, 0.5, 0.12), color: 0x2b2f36, p: [-0.15, 0.72, 0.2], r: [0, 0, 0.35] },
    { geo: B(0.12, 0.5, 0.12), color: 0x2b2f36, p: [-0.15, 0.72, -0.2], r: [0, 0, 0.35] },
  ]);
}

const LANES = [{ z: -1.35, back: 2.4, delay: 2 }, { z: 1.05, back: 4.2, delay: 7 }, { z: -0.6, back: 6.0, delay: 12 }];
const SPEED = 0.34; // m/frame das motos de apoio

class MotociataFx {
  constructor(scene) {
    this.scene = scene;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
    this.bikes = new THREE.InstancedMesh(bikeGeometry(), mat, 4);
    this.riders = new THREE.InstancedMesh(riderGeometry(), mat, 3);
    for (const m of [this.bikes, this.riders]) { m.castShadow = true; m.frustumCulled = false; scene.add(m); }
    this.smoke = new Puffs(scene, 30, 0x8fd66a, { opacity: 0.6 });
    this.dummy = new THREE.Object3D(); this.tilt = new THREE.Quaternion();
    this.xs = 0; this.xEnd = 0; this.lastPuff = -1;
    this.hideAll();
  }
  hideAll() {
    this.dummy.scale.setScalar(0); this.dummy.updateMatrix();
    for (let i = 0; i < 4; i++) this.bikes.setMatrixAt(i, this.dummy.matrix);
    for (let i = 0; i < 3; i++) this.riders.setMatrixAt(i, this.dummy.matrix);
    this.bikes.instanceMatrix.needsUpdate = true; this.riders.instanceMatrix.needsUpdate = true;
  }
  place(mesh, i, x, y, z, yaw, tilt, s) {
    const d = this.dummy;
    d.position.set(x, y, z);
    d.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0)).multiply(this.tilt.setFromAxisAngle(AXIS_Z, tilt));
    d.scale.setScalar(Math.max(0, s)); d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  update(dt, f, model, sp) {
    this.smoke.update(dt);
    if (!sp) { if (this.wasOn) { this.hideAll(); this.wasOn = false; } this.lastPuff = -1; return; }
    this.wasOn = true;
    const t = f.t, yaw = f.facing > 0 ? 0 : Math.PI, fac = f.facing;
    if (t <= 1) { this.xs = f.x; }
    const aEnd = sp.startup + sp.active;
    if (t <= aEnd) this.xEnd = f.x;
    // moto principal: nasce embaixo dele, empina na arrancada, segue sozinha e some na recuperação
    let lx = f.x, ls = clamp01(t / 6), lt = 0;
    if (t >= sp.startup && t < aEnd) lt = 0.42 * clamp01((t - sp.startup) / 4);
    if (t >= aEnd) { const r = t - aEnd; lx = this.xEnd + fac * SPEED * r; ls = 1 - clamp01(r / 12); lt = 0.1; }
    this.place(this.bikes, 0, lx, f.y + Math.abs(Math.sin(t * 1.3)) * 0.03, 0.05, yaw, lt, ls);
    // motos de apoio: vêm de trás em 3 faixas de profundidade, atravessam e vão embora
    const puff = t !== this.lastPuff && t % 2 === 0;
    LANES.forEach((L, i) => {
      const k = t - L.delay;
      const x = this.xs - fac * L.back + fac * SPEED * Math.max(0, k);
      const vis = k > 0 && Math.abs(x - this.xs) < 16;
      const s = vis ? 1 : 0;
      this.place(this.bikes, i + 1, x, Math.abs(Math.sin(t * 1.1 + i)) * 0.04, L.z, yaw, 0.25, s);
      this.place(this.riders, i, x, Math.abs(Math.sin(t * 1.1 + i)) * 0.04, L.z, yaw, 0.25, s);
      if (vis && puff) this.smoke.burst(new THREE.Vector3(x - fac * 0.9, 0.35, L.z), { count: 1, spread: 0.2, up: 0.9, speed: 0.5, size: 0.22, grow: 2.6, life: 0.5, color: i % 2 ? YELLOW : 0x8fd66a, z: 0 });
    });
    if (puff && ls > 0.5) this.smoke.burst(new THREE.Vector3(lx - fac * 0.9, 0.3, 0.1), { count: 2, spread: 0.3, up: 1.2, speed: 0.7, size: 0.3, grow: 2.8, life: 0.55, color: t % 4 ? 0x8fd66a : YELLOW, z: 0 });
    if (puff) this.lastPuff = t;
    this.bikes.instanceMatrix.needsUpdate = true; this.riders.instanceMatrix.needsUpdate = true;
  }
  dispose() { this.scene.remove(this.bikes, this.riders); this.bikes.geometry.dispose(); this.riders.geometry.dispose(); }
}
const AXIS_Z = new THREE.Vector3(0, 0, 1);

export const BRASA_FX = { rajada: RajadaFx, motociata: MotociataFx };
