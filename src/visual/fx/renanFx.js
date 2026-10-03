// VFX do RENAN SANTOS (interface do SpecialFx: update(dt, f, model, sp))
//   lacracao — Lacração Reversa: escudo roxo de "tapa de microfone" na frente durante a janela ativa; quando a lógica
//              registra um rebote (f.counterInfo) → selo LACROU! carimbado + anel
//   liveCam  — Live Polêmica: celular no bastão ao lado da cabeça com tag AO VIVO piscando + coraçõezinhos subindo
//   textao   — Debate Relâmpago: balão gigante "TEXTÃO" na frente dele durante a investida + linhas de velocidade
//   visual de Hitter: liveChat (nuvem de balões de comentário voando, com nomes coloridos)
// Cores: roxo de live 0x9146ff, vermelho AO VIVO 0xff2a3a, branco.
import * as THREE from 'three';
import { Rings, Puffs, std, canvasTex, clamp01, easeOut, add, flat, bodyPoint, textSprite } from './common.js';

export const LIVE = 0x9146ff, LIVE_RED = 0xff2a3a;
const sprite = (tex, w, h, extra = {}) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...extra })); s.scale.set(w, h, 1); s.visible = false; s.renderOrder = 8; return s; };

function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// balão de comentário de chat: nome colorido + mensagem
export function chatTex(user, msg, color = '#9146ff') {
  return canvasTex(512, 150, (g, W, H) => {
    g.fillStyle = 'rgba(24,18,40,0.92)'; g.strokeStyle = '#fff'; g.lineWidth = 6; rr(g, 6, 6, W - 12, H - 12, 28); g.fill(); g.stroke();
    g.font = 'bold 44px Arial Black, Impact, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(user + ':', 28, 50);
    g.font = 'bold 54px Bangers, Impact, sans-serif'; g.fillStyle = '#fff'; g.fillText(msg, 28, 106);
  });
}
const CHAT = [['zé_do_corte', 'KKKKKKK', '#ffd23a'], ['mod', 'CORTA ESSA!', '#3cff8a'], ['tia_do_zap', 'LACROU??', '#ff6fae'], ['anon', 'F NO CHAT', '#6ecbff'], ['clipador', 'VIRALIZOU!', '#ff8a3a']];
let _chat = null;
export const chatTextures = () => (_chat ||= CHAT.map(([u, m, c]) => chatTex(u, m, c)));
let _live = null;
export function liveTagTex() {
  return (_live ||= canvasTex(256, 96, (g, W, H) => {
    g.fillStyle = '#ff2a3a'; rr(g, 4, 4, W - 8, H - 8, 18); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(44, H / 2, 16, 0, Math.PI * 2); g.fill();
    g.font = 'bold 56px Bangers, Impact, sans-serif'; g.textBaseline = 'middle'; g.fillText('AO VIVO', 72, H / 2 + 3);
  }));
}

// ---------------- LACRAÇÃO REVERSA ----------------
class LacracaoFx {
  constructor(scene) {
    this.scene = scene; this.hand = new THREE.Vector3();
    this.shield = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 36, 1, -Math.PI / 2.2, Math.PI / 1.1), add(LIVE, 0)); this.shield.visible = false; scene.add(this.shield);
    this.inner = new THREE.Mesh(new THREE.CircleGeometry(0.8, 30, -Math.PI / 2.2, Math.PI / 1.1), add(0xc9a8ff, 0)); this.inner.visible = false; scene.add(this.inner);
    this.seal = textSprite('LACROU!', { color: '#fff', stroke: '#3a0f8a', w: 1.7, h: 0.57, bubble: '#9146ff' }); this.seal.visible = false; this.seal.renderOrder = 9; scene.add(this.seal);
    this.rings = new Rings(scene, 3, LIVE); this.sparks = new Puffs(scene, 10, 0xe0ccff, { opacity: 0.9 });
    this.seenSeq = -1; this.shot = -1;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt); this.sparks.update(dt);
    if (this.shot >= 0) {
      this.shot += dt; const q = this.shot / 0.9;
      this.seal.visible = q < 1;
      const pop = q < 0.1 ? 0.4 + 1.0 * easeOut(q / 0.1) : q < 0.18 ? 1.4 - 0.4 * ((q - 0.1) / 0.08) : 1;
      this.seal.scale.set(1.7 * pop, 0.57 * pop, 1); this.seal.material.rotation = -0.12; this.seal.material.opacity = q > 0.75 ? (1 - q) / 0.25 : 1;
      this.seal.position.y = this.sealY + q * 0.35;
      if (q >= 1) this.shot = -1;
    } else this.seal.visible = false;
    if (f.counterInfo && f.counterInfo.seq !== this.seenSeq) {
      this.seenSeq = f.counterInfo.seq; this.shot = 0;
      this.seal.position.set(f.x + f.facing * 0.8, this.sealY = f.y + 2.1, 0.8);
      this.rings.spawn(f.x + f.facing * 0.7, f.y + 1.1, { flat: false, from: 0.3, to: 2.4, life: 0.3, opacity: 0.95, z: 0.5 });
      this.sparks.burst(new THREE.Vector3(f.x + f.facing * 0.8, f.y + 1.1, 0.4), { count: 10, spread: 1, up: 2, speed: 3, size: 0.2, grow: 2, life: 0.4 });
    }
    const on = sp && f.t >= sp.startup && f.t < sp.startup + sp.active;
    this.shield.visible = this.inner.visible = !!on;
    if (!on) return;
    const k = (f.t - sp.startup) / sp.active, now = performance.now() / 1000;
    for (const m of [this.shield, this.inner]) {
      m.position.set(f.x + f.facing * 0.55, f.y + 1.1, 0.42);
      m.rotation.set(0, 0, f.facing > 0 ? 0 : Math.PI);
      m.scale.set(1 + 0.08 * Math.sin(now * 25), 1.25, 1);
    }
    this.shield.material.opacity = 0.85 * (1 - k * 0.5); this.inner.material.opacity = 0.18 * (1 - k);
  }
  dispose() { this.scene.remove(this.shield, this.inner, this.seal); }
}

// ---------------- LIVE POLÊMICA: celular no bastão + AO VIVO ----------------
class LiveCamFx {
  constructor(scene) {
    this.scene = scene; this.head = new THREE.Vector3();
    this.cam = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), std(0x1a1a1a)); stick.rotation.z = 0.9; stick.position.set(-0.25, -0.2, 0);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.02), std(0x111111, { metalness: 0.5, roughness: 0.3 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.26), add(LIVE, 0.9)); screen.position.z = 0.012;
    this.cam.add(stick, phone, screen); this.cam.visible = false; scene.add(this.cam);
    this.tag = sprite(liveTagTex(), 0.62, 0.23); this.tag.renderOrder = 9; scene.add(this.tag);
    this.hearts = Array.from({ length: 6 }, () => { const s = textSprite('♥', { color: '#ff3a6a', w: 0.32, h: 0.11 }); s.visible = false; scene.add(s); return { s, life: 0 }; });
    this.last = -1;
  }
  update(dt, f, model, sp) {
    for (const q of this.hearts) { if (q.life <= 0) continue; q.life -= dt; q.s.position.y += dt * 1.2; q.s.material.opacity = clamp01(q.life / 0.3); if (q.life <= 0) q.s.visible = false; }
    const on = sp && f.t < sp.startup + 16;
    this.cam.visible = this.tag.visible = !!on;
    if (!on) return;
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const now = performance.now() / 1000, k = Math.min(1, f.t / 4, (sp.startup + 16 - f.t) / 4);
    this.cam.position.set(this.head.x + f.facing * 0.55, this.head.y + 0.15, 0.45);
    this.cam.rotation.set(0, f.facing > 0 ? -0.3 : Math.PI + 0.3, 0); this.cam.scale.setScalar(1.3 * k);
    this.tag.position.set(this.head.x + f.facing * 0.55, this.head.y + 0.6, 0.6);
    this.tag.material.opacity = Math.floor(now * 4) % 2 ? 1 : 0.55; this.tag.scale.set(0.62 * k, 0.23 * k, 1);
    if (f.t !== this.last && f.t % 4 === 0) {
      this.last = f.t; const q = this.hearts.find((h) => h.life <= 0);
      if (q) { q.life = 0.8; q.s.visible = true; q.s.position.set(this.head.x + f.facing * (0.4 + Math.random() * 0.4), this.head.y + 0.3, 0.6); }
    }
  }
  dispose() { this.scene.remove(this.cam, this.tag, ...this.hearts.map((h) => h.s)); }
}

// ---------------- DEBATE RELÂMPAGO: balão TEXTÃO ----------------
class TextaoFx {
  constructor(scene) {
    this.scene = scene;
    this.bubble = textSprite('TEXTÃO', { color: '#111', stroke: '#fff', w: 1.8, h: 0.6, bubble: '#ffffff', font: 'bold 100px Bangers, Impact, sans-serif' }); this.bubble.visible = false; this.bubble.renderOrder = 9; scene.add(this.bubble);
    this.lines = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.03), add(0xffffff, 0)); m.visible = false; scene.add(m); return m; });
  }
  update(dt, f, model, sp) {
    const on = sp && f.t >= sp.startup - 3 && f.t < sp.startup + sp.active + 6;
    this.bubble.visible = !!on; for (const l of this.lines) l.visible = false;
    if (!on) return;
    const k = f.t - sp.startup + 3, pop = k < 4 ? easeOut(k / 4) * 1.2 : k < 7 ? 1.2 - 0.2 * ((k - 4) / 3) : 1;
    const out = clamp01((sp.startup + sp.active + 6 - f.t) / 5);
    this.bubble.position.set(f.x + f.facing * 0.9, f.y + 1.75, 0.7);
    this.bubble.scale.set(1.8 * pop * out, 0.6 * pop * out, 1); this.bubble.material.rotation = f.facing * 0.06;
    if (f.t < sp.startup + sp.active) this.lines.forEach((l, i) => {
      l.visible = true; const ph = (performance.now() / 1000 * 4 + i * 0.17) % 1;
      l.position.set(f.x - f.facing * (0.4 + ph * 1.4), f.y + 0.4 + i * 0.25, 0.3); l.material.opacity = 0.7 * (1 - ph);
    });
  }
  dispose() { this.scene.remove(this.bubble, ...this.lines); }
}

export const RENAN_FX = { lacracao: LacracaoFx, liveCam: LiveCamFx, textao: TextaoFx };

// ---------------- visual de Hitter: LIVE CHAT (comentários voando) ----------------
export const RENAN_VISUALS = {
  liveChat: {
    build() {
      const g = new THREE.Group();
      const tex = chatTextures();
      const msgs = tex.slice(0, 4).map((t, i) => { const s = sprite(t, 0.95, 0.28); s.visible = true; s.position.set(-i * 0.22, 0.5 - i * 0.33, 0.1 + i * 0.02); g.add(s); return s; });
      const tag = sprite(liveTagTex(), 0.45, 0.17); tag.visible = true; tag.position.set(0.35, 0.78, 0.2); g.add(tag);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), add(LIVE, 0.18)); g.add(glow);
      g.userData = { msgs, tag, glow, center: true };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, now = performance.now() / 1000;
      const k = Math.min(clamp01(h.t / 5), clamp01((h.delay + h.life - h.t) / 8)) * (h.spent ? 0 : 1);
      u.msgs.forEach((s, i) => {
        s.position.y = 0.5 - i * 0.33 + Math.sin(now * 9 + i * 1.7) * 0.05;
        s.position.x = -i * 0.22 * h.facing + Math.sin(now * 6 + i) * 0.04;
        s.material.opacity = k; s.scale.set(0.95 * k, 0.28 * k, 1);
      });
      u.tag.material.opacity = k * (Math.floor(now * 5) % 2 ? 1 : 0.6);
      u.glow.material.opacity = 0.18 * k;
    },
  },
};
