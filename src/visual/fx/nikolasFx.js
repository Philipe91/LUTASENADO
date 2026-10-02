// VFX do NIKOLAS / "NIKOLINHA" (interface do SpecialFx: update(dt, f, model, sp) com sp = especial ativo ou null)
//   selfie   — Selfie do Dano: celular sobe na mão → FLASH (clarão + estrela de brilho) → MOLDURA DE CELULAR com a "foto"
//              do alvo pipoca na frente dele; se foi PERFECT SELFIE (f.counterInfo), a moldura vira dourada com estrelas
//   visuais de Hitter: chupeta (bumerangue girando com rastro) e mamadeira (gira, pinga leite, espirra ao acertar)
// Cores: azul-bebê 0x6ecbff (chupeta), leite 0xfff5e6, ciano-notificação 0x3cc8ff (ultimate). Terno azul 0x1e2a6b.
import * as THREE from 'three';
import { Puffs, std, toon, canvasTex, clamp01, easeOut, smooth, add, bodyPoint } from './common.js';

export const CYAN = 0x3cc8ff, BABY = 0x6ecbff, MILK = 0xfff5e6;

// ---- celular (tela virada pra câmera, +Z) ----
export function screenTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#1b2a4a'); grd.addColorStop(1, '#3cc8ff');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e0262b'; roundRect(g, 10, 12, 54, 24, 10); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(24, 24, 5, 0, Math.PI * 2); g.fill();
    g.font = '900 15px Inter, Arial, sans-serif'; g.fillText('LIVE', 34, 30);
    g.fillStyle = '#fff'; g.font = '900 14px Inter, Arial, sans-serif'; g.fillText('1.2M', 70, 30);
    for (let i = 0; i < 3; i++) heart(g, 100, 110 + i * 42, 10, '#ff3fa4');
    g.fillStyle = '#ffffff'; roundRect(g, 10, h - 46, w - 20, 34, 8); g.fill();
    g.fillStyle = '#1b2a4a'; g.font = '900 13px Inter, Arial, sans-serif'; g.fillText('comentar...', 18, h - 24);
  });
}
export function makePhone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.025), std(0x151515, { roughness: 0.35, metalness: 0.3 })); body.castShadow = true;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.33), new THREE.MeshBasicMaterial({ map: screenTexture() })); screen.position.z = 0.0135;
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), std(0x333333)); cam.position.set(-0.05, 0.14, -0.0135); cam.rotation.y = Math.PI;
  const flashLed = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); flashLed.position.set(0.0, 0.14, -0.0135); flashLed.rotation.y = Math.PI;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.37, 0.02), std(0x6c7a8f, { metalness: 0.8, roughness: 0.25 })); edge.position.z = -0.001;
  g.add(edge, body, screen, cam, flashLed);
  g.scale.setScalar(1.5);
  g.userData.screen = screen;
  return g;
}

// ---- texturas da moldura (foto do golpe) ----
function frameTexture(perfect) {
  return canvasTex(512, 400, (g, w, h) => {
    g.fillStyle = perfect ? '#ffd400' : '#ffffff'; g.strokeStyle = '#111'; g.lineWidth = 12;
    roundRect(g, 14, 14, w - 28, h - 28, 34); g.fill(); g.stroke();
    // "foto": gradiente com um clarão
    const grd = g.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, 220);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.35, perfect ? '#ffe9a8' : '#bfe8ff'); grd.addColorStop(1, perfect ? '#ff7a2a' : '#3b6fd6');
    g.fillStyle = grd; roundRect(g, 44, 44, w - 88, h - 150, 16); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 8; roundRect(g, 44, 44, w - 88, h - 150, 16); g.stroke();
    // cantos de foco
    g.strokeStyle = perfect ? '#111' : '#ffd400'; g.lineWidth = 10;
    for (const [x, y, sx, sy] of [[70, 70, 1, 1], [w - 70, 70, -1, 1], [70, h - 176, 1, -1], [w - 70, h - 176, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y + sy * 44); g.lineTo(x, y); g.lineTo(x + sx * 44, y); g.stroke();
    }
    // legenda
    g.font = 'bold 64px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round';
    g.lineWidth = 10; g.strokeStyle = '#111'; g.strokeText(perfect ? 'PERFECT SELFIE' : 'SELFIE DO DANO', w / 2, h - 62);
    g.fillStyle = perfect ? '#ff3fa4' : '#1b2a4a'; g.fillText(perfect ? 'PERFECT SELFIE' : 'SELFIE DO DANO', w / 2, h - 62);
    if (perfect) for (let i = 0; i < 5; i++) star(g, 100 + i * 78, 70, 20, '#fff', '#111');
    else heart(g, w - 100, 100, 26, '#ff3fa4');
    g.fillStyle = '#e0262b'; roundRect(g, 60, h - 104, 110, 30, 8); g.fill();
    g.fillStyle = '#fff'; g.font = '900 20px Inter, Arial, sans-serif'; g.textAlign = 'left'; g.fillText('● REC', 72, h - 82);
  });
}
export function flashTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.9)'); r.addColorStop(0.6, 'rgba(200,240,255,0.35)'); r.addColorStop(1, 'rgba(120,200,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}
export function starTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.translate(w / 2, h / 2); g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 14 : 124, a = (i / 8) * Math.PI * 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
  });
}
export function heartTexture(color = '#ff3fa4') {
  return canvasTex(128, 128, (g, w, h) => { heart(g, w / 2, h / 2 + 6, 44, color, '#111'); });
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
export function heart(g, x, y, s, color, stroke = null) {
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.3, y - s * 0.1, x, y + s * 0.9); g.closePath();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = s * 0.18; g.lineJoin = 'round'; g.stroke(); }
  g.fillStyle = color; g.fill();
}
export function star(g, x, y, r, color, stroke = null) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = (i / 10) * Math.PI * 2 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = r * 0.2; g.lineJoin = 'round'; g.stroke(); }
  g.fillStyle = color; g.fill();
}

const sprite = (tex, w, h, extra = {}) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...extra })); s.scale.set(w, h, 1); s.visible = false; s.renderOrder = 8; return s; };

// ---------------- SELFIE DO DANO ----------------
class SelfieFx {
  constructor(scene) {
    this.scene = scene; this.hand = new THREE.Vector3(); this.head = new THREE.Vector3();
    this.phone = makePhone(); this.phone.visible = false; scene.add(this.phone);
    this.flash = sprite(flashTexture(), 1, 1, { blending: THREE.AdditiveBlending }); scene.add(this.flash);
    this.starS = sprite(starTexture(), 1, 1, { blending: THREE.AdditiveBlending }); scene.add(this.starS);
    this.frames = { normal: frameTexture(false), perfect: frameTexture(true) };
    this.frame = sprite(this.frames.normal, 1.6, 1.25); this.frame.renderOrder = 9; scene.add(this.frame);
    this.hearts = Array.from({ length: 4 }, () => { const s = sprite(heartTexture(), 0.3, 0.3); scene.add(s); return { s, life: 0 }; });
    this.seenSeq = -1; this.perfect = false;
  }
  update(dt, f, model, sp) {
    for (const h of this.hearts) {
      if (h.life <= 0) continue;
      h.life -= dt; h.s.position.y += dt * 1.4; h.s.position.x += Math.sin(h.life * 9) * dt * 0.6;
      h.s.material.opacity = clamp01(h.life / 0.3); if (h.life <= 0) h.s.visible = false;
    }
    if (!sp) { this.phone.visible = this.flash.visible = this.starS.visible = this.frame.visible = false; this.perfect = false; return; }
    const t = f.t, s0 = sp.startup;
    // PERFECT SELFIE registrado pela lógica neste especial?
    if (f.counterInfo && f.counterInfo.seq !== this.seenSeq) {
      this.seenSeq = f.counterInfo.seq; this.perfect = true;
      this.hearts.forEach((h, i) => { h.life = 0.7 + i * 0.1; h.s.visible = true; h.s.position.set(f.x + f.facing * (0.9 + i * 0.25), f.y + 1.2 + i * 0.15, 0.6); h.s.material.opacity = 1; });
    }
    // celular: sobe do peito até acima da cabeça, de frente pra câmera, inclinado pro alvo
    bodyPoint(this.hand, f, model, 'righthand', { dx: 0.3, y: f.stats.height * 0.6 });
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.9 });
    const up = smooth(t / Math.max(1, s0 - 1));
    const fade = clamp01((sp.startup + sp.active + sp.recovery - t) / 6);
    this.phone.visible = true;
    this.phone.position.set(this.hand.x + f.facing * 0.35 * up, this.hand.y + (this.head.y + 0.45 - this.hand.y) * up, 0.35);
    this.phone.rotation.set(0.15, f.facing * 0.5, -f.facing * 0.18);
    this.phone.scale.setScalar(1.5 * Math.min(fade, clamp01(t / 3)));
    // FLASH no frame do golpe: clarão + estrela que gira
    const fl = t - s0;
    const flOn = fl >= 0 && fl < 10;
    this.flash.visible = this.starS.visible = flOn;
    if (flOn) {
      const q = fl / 10;
      const sz = 1.2 + easeOut(q) * 3.2;
      this.flash.position.copy(this.phone.position).add(new THREE.Vector3(f.facing * 0.2, 0, 0.1));
      this.flash.scale.set(sz, sz, 1); this.flash.material.opacity = 1 - q * q;
      this.starS.position.copy(this.flash.position);
      const ss = 1.0 + easeOut(q) * 2.4;
      this.starS.scale.set(ss, ss, 1); this.starS.material.opacity = 0.9 * (1 - q) * (1 - q); this.starS.material.rotation = q * 1.2;
    }
    // MOLDURA: a "foto" do alvo pipoca na área do golpe
    const fr = t - s0 - 1;
    const frOn = fr >= 0 && fr < 20;
    this.frame.visible = frOn;
    if (frOn) {
      const pop = fr < 4 ? 1.35 * easeOut(fr / 4) : fr < 7 ? 1.35 - 0.35 * ((fr - 4) / 3) : 1;
      const out = fr > 15 ? 1 - (fr - 15) / 5 : 1;
      this.frame.material.map = this.perfect ? this.frames.perfect : this.frames.normal;
      // acima do alvo (não tapa quem apanha): cabe no quadro de retrato
      const box = sp.box || { x: 0.1, w: 1.5 };
      this.frame.position.set(f.x + f.facing * (box.x + box.w * 0.6), f.y + 1.7 + fr * 0.012, 0.7);
      this.frame.scale.set((this.perfect ? 1.5 : 1.15) * pop, (this.perfect ? 1.17 : 0.9) * pop, 1);
      this.frame.material.rotation = f.facing * (this.perfect ? -0.12 : 0.08);
      this.frame.material.opacity = out;
    }
  }
  dispose() { this.scene.remove(this.phone, this.flash, this.starS, this.frame, ...this.hearts.map((h) => h.s)); }
}

export const NIKOLAS_FX = { selfie: SelfieFx };

// ---------------- visuais de Hitter ----------------
export const NIKOLAS_VISUALS = {
  // CHUPETA TELEGUIADA: anel + escudo + bico, gira, rastro azul-bebê; volta como bumerangue
  chupeta: {
    build() {
      const g = new THREE.Group();
      const spin = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 20), toon(BABY)); ring.position.y = -0.12;
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 20), toon(0x2f8fd6)); shield.rotation.x = Math.PI / 2;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), toon(0xffffff)); knob.position.z = -0.03;
      const teat = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), toon(0xf7d6c1)); teat.position.z = 0.11; teat.scale.set(1, 1, 1.4);
      for (const m of [ring, shield, teat]) m.castShadow = true;
      spin.add(ring, shield, knob, teat); spin.scale.setScalar(1.7); g.add(spin);
      const trail = [];
      for (let i = 0; i < 5; i++) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), add(BABY, 0.45 - i * 0.08)); trail.push(t); g.add(t);
      }
      g.userData = { spin, trail, hist: [], center: true };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      u.spin.rotation.z -= dt * 16 * Math.sign(h.vx || h.facing);
      u.spin.rotation.y += dt * 4;
      if (u.lastId !== h.id) { u.lastId = h.id; u.hist.length = 0; }
      u.hist.unshift([h.x, h.y + h.h / 2]); if (u.hist.length > 20) u.hist.pop();
      u.trail.forEach((t, i) => {
        const p = u.hist[Math.min(u.hist.length - 1, (i + 1) * 3)] || u.hist[0];
        t.position.set(p[0] - h.x, p[1] - h.y - h.h / 2, 0); t.visible = u.hist.length > (i + 1) * 3;
        t.scale.setScalar(1 - i * 0.15);
      });
    },
  },
  // MAMADEIRA TURBO: gira de ponta-cabeça, pinga leite; ao acertar o leite espirra
  mamadeira: {
    build() {
      const g = new THREE.Group();
      const spin = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.42, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.15 }));
      const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.3, 14), std(MILK, { roughness: 0.8 })); milk.position.y = -0.05;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.09, 14), toon(0xff8a3a)); cap.position.y = 0.25;
      const teat = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), toon(0xf7d6c1)); teat.position.y = 0.36; teat.scale.set(1, 1.3, 1);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.14), new THREE.MeshBasicMaterial({ map: canvasTex(128, 112, (c, w, hh) => {
        c.fillStyle = '#3cc8ff'; roundRect(c, 4, 4, w - 8, hh - 8, 16); c.fill();
        c.fillStyle = '#fff'; c.font = 'bold 40px Bangers, Impact, sans-serif'; c.textAlign = 'center'; c.fillText('TURBO', w / 2, 70);
      }), transparent: true })); label.position.set(0, -0.02, 0.112);
      for (const m of [glass, cap, teat]) m.castShadow = true;
      spin.add(glass, milk, cap, teat, label); spin.scale.setScalar(1.6); g.add(spin);
      const drops = new Puffs(g, 14, MILK, { opacity: 0.9 });
      const lines = Array.from({ length: 3 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.04), add(0xffffff, 0.5)); m.position.set(-0.7, -0.2 + i * 0.2, 0.2); g.add(m); return m; });
      g.userData = { spin, drops, lines, center: true, lastX: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      u.spin.rotation.z -= dt * 22 * h.facing;
      if (u.lastId !== h.id) { u.lastId = h.id; u.lastX = h.x; u.lastLanded = 0; u.lastDrip = -1; u.drops.clear(); }
      // gotas e espirro ficam no MUNDO: compensa o deslocamento do grupo
      const dxLocal = h.x - u.lastX; u.lastX = h.x;
      for (const p of u.drops.items) if (p.life > 0) p.m.position.x -= dxLocal;
      if (h.t % 4 === 0 && h.t !== u.lastDrip && !h.spent) { u.lastDrip = h.t; u.drops.burst(new THREE.Vector3(0, -0.1, 0.1), { count: 1, spread: 0.2, up: -0.4, speed: 0.4, size: 0.12, grow: 1.4, life: 0.35, gravity: 6, z: 0 }); }
      if ((h.landed || 0) !== u.lastLanded) { // ACERTOU: leite espirra
        u.lastLanded = h.landed || 0;
        u.drops.burst(new THREE.Vector3(h.facing * 0.3, 0.1, 0.2), { count: 10, spread: 1.2, up: 2.6, speed: 2.4, size: 0.28, grow: 2.0, life: 0.5, gravity: 7, z: 0 });
      }
      u.drops.update(dt);
      u.lines.forEach((m, i) => { m.position.x = -h.facing * (0.6 + ((h.t * 0.17 + i * 0.33) % 1) * 0.6); m.material.opacity = h.spent ? 0 : 0.35 + 0.3 * Math.sin(h.t * 1.7 + i); m.rotation.y = h.facing > 0 ? 0 : Math.PI; });
      u.spin.visible = !h.spent || h.t % 2 === 0;
    },
  },
};
