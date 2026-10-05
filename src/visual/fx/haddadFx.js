// VFX do HADDAD / "TAXADD" (interface do SpecialFx: update(dt, f, model, sp))
//   arcabouco — Arcabouço Fiscal: moldura de planilha verde na frente dele durante a pose; se a lógica registrou o
//               counter (f.counterInfo) → clarão + carimbo "TETO DE GASTOS!" estampado no ar
//   carimbo   — Carimbo do Imposto: carimbo gigante na mão desce no frame ativo; anel + selo "+IMPOSTO" no chão
//   visual de Hitter: pacote (caixa de encomenda girando com selo TAXADO!)
// Cores: verde planilha 0x2fa64f, vermelho do carimbo 0xd62828, papelão 0xc8955a.
import * as THREE from 'three';
import { swapToGLB, PROP_GLB } from '../propModel.js';
import { Rings, Puffs, Shards, std, canvasTex, clamp01, easeOut, add, flat, bodyPoint } from './common.js';

export const SHEET = 0x2fa64f, STAMP_RED = 0xd62828, CARDBOARD = 0xc8955a;

function stampTex(text, color = '#d62828', w = 512, h = 200) {
  return canvasTex(w, h, (g, W, H) => {
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 14;
    g.strokeRect(10, 10, W - 20, H - 20);
    let px = Math.round(H * 0.5);
    g.font = `bold ${px}px Bangers, Impact, Arial Black, sans-serif`;
    const tw = g.measureText(text).width; // texto longo encolhe para caber na moldura
    if (tw > W - 60) { px = Math.floor(px * (W - 60) / tw); g.font = `bold ${px}px Bangers, Impact, Arial Black, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2 + 4);
  });
}
const _tex = {};
export const stamp = (text, color) => (_tex[text + color] ||= stampTex(text, color));

// pacote de encomenda: papelão + fita + selo vermelho TAXADO!
export function makePacote() {
  const g = new THREE.Group();
  const spin = new THREE.Group(); g.add(spin);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.38, 0.4), std(CARDBOARD, { roughness: 1 })); box.castShadow = true;
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.39, 0.08), std(0xe8d7a8, { roughness: 0.6 }));
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.17), new THREE.MeshBasicMaterial({ map: stamp('TAXADO!'), transparent: true }));
  seal.position.z = 0.205; seal.rotation.z = -0.15;
  const seal2 = seal.clone(); seal2.position.z = -0.205; seal2.rotation.y = Math.PI;
  spin.add(box, tape, seal, seal2);
  g.userData.spin = spin;
  swapToGLB(spin, PROP_GLB.pacote, { keep: [seal, seal2] }); // selo TAXADO! continua decal
  return g;
}

function sheetTex() {
  return canvasTex(512, 384, (g, W, H) => {
    g.fillStyle = 'rgba(230,255,236,0.85)'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2fa64f'; g.fillRect(0, 0, W, 54);
    g.font = 'bold 44px Bangers, Impact, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ARCABOUÇO FISCAL', W / 2, 29);
    g.strokeStyle = '#2fa64f'; g.lineWidth = 3;
    for (let x = 0; x <= W; x += 85) { g.beginPath(); g.moveTo(x, 54); g.lineTo(x, H); g.stroke(); }
    for (let y = 54; y <= H; y += 41) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.font = 'bold 26px monospace'; g.fillStyle = '#145a2a';
    const vals = ['R$', '0,00', '-1%', 'META', '+2,5', 'TETO', '=SOMA', '0,5%', 'Σ', '#REF!', '100%', '=DOBRA'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) g.fillText(vals[(r * 6 + c) % vals.length], c * 85 + 42, 54 + r * 41 + 22);
    g.strokeStyle = '#145a2a'; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
  });
}

// ---------------- ARCABOUÇO FISCAL: moldura de planilha (pose) → carimbo no counter ----------------
class ArcaboucoFx {
  constructor(scene) {
    this.scene = scene;
    this.frame = new THREE.Group();
    this.sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.95), new THREE.MeshBasicMaterial({ map: sheetTex(), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.15), add(SHEET, 0));
    this.glow.position.z = -0.02;
    this.frame.add(this.glow, this.sheet); this.frame.visible = false; scene.add(this.frame);
    this.mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: stamp('TETO DE GASTOS!'), transparent: true, depthWrite: false })); this.mark.visible = false; this.mark.renderOrder = 9; scene.add(this.mark);
    this.rings = new Rings(scene, 2, SHEET);
    this.cells = new Shards(scene, 14, new THREE.PlaneGeometry(0.14, 0.1), new THREE.MeshBasicMaterial({ color: 0xbff5cc, side: THREE.DoubleSide }));
    this.seenSeq = -1; this.shot = -1;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt); this.cells.update(dt);
    if (this.shot >= 0) {
      this.shot += dt; const q = this.shot / 0.9;
      this.mark.visible = q < 1;
      const pop = q < 0.12 ? 1.5 - 0.5 * easeOut(q / 0.12) : 1;
      this.mark.scale.set(1.6 * pop, 0.62 * pop, 1); this.mark.material.opacity = q > 0.75 ? (1 - q) / 0.25 : 1; this.mark.material.rotation = -0.12;
      this.mark.position.y = this.markY + q * 0.3;
      if (q >= 1) this.shot = -1;
    } else this.mark.visible = false;
    if (f.counterInfo && f.counterInfo.seq !== this.seenSeq) {
      this.seenSeq = f.counterInfo.seq; this.shot = 0;
      this.mark.position.set(f.x + f.facing * 0.7, this.markY = f.y + 2.05, 0.8);
      this.rings.spawn(f.x + f.facing * 0.65, f.y + 1.05, { flat: false, from: 0.3, to: 2.6, life: 0.32, opacity: 0.9, z: 0.5 });
      this.cells.burst(new THREE.Vector3(f.x + f.facing * 0.65, f.y + 1.1, 0.4), { count: 14, speed: 2.6, up: 3, life: 0.8, size: 1, gravity: 8 });
    }
    const posing = sp && !sp.countered && f.t >= sp.startup - 2 && f.t < sp.startup + sp.active;
    this.frame.visible = !!posing;
    if (!posing) return;
    const k = Math.min(1, (f.t - sp.startup + 2) / 4), out = clamp01((sp.startup + sp.active - f.t) / 5), now = performance.now() / 1000;
    this.frame.position.set(f.x + f.facing * 0.62, f.y + 1.05, 0.45);
    this.frame.rotation.y = f.facing * 0.35;
    this.frame.scale.set(k * 1.5, k * 1.5, 1);
    this.sheet.material.opacity = 0.9 * out; this.glow.material.opacity = (0.25 + 0.1 * Math.sin(now * 16)) * out;
  }
  dispose() { this.scene.remove(this.frame, this.mark); }
}

// ---------------- CARIMBO DO IMPOSTO: carimbo gigante desce ----------------
function makeStampTool() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.32, 10), std(0x5a3818, { roughness: 0.7 })); handle.position.y = 0.36;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(0x5a3818, { roughness: 0.7 })); knob.position.y = 0.55;
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.38), std(0x2a2a2a, { roughness: 0.5 })); block.position.y = 0.14;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.39), std(STAMP_RED, { roughness: 0.6 })); pad.position.y = 0.03;
  for (const m of [handle, knob, block]) m.castShadow = true;
  g.add(handle, knob, block, pad);
  swapToGLB(g, PROP_GLB.carimboImposto);
  return g;
}
class CarimboFx {
  constructor(scene) {
    this.scene = scene; this.v = new THREE.Vector3();
    this.tool = makeStampTool(); this.tool.visible = false; scene.add(this.tool);
    this.mark = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), new THREE.MeshBasicMaterial({ map: stamp('+IMPOSTO'), transparent: true, opacity: 0, depthWrite: false }));
    this.mark.rotation.x = -Math.PI / 2; this.mark.position.y = 0.025; this.mark.visible = false; scene.add(this.mark);
    this.rings = new Rings(scene, 2, STAMP_RED); this.dust = new Puffs(scene, 6, 0xe0d0c0, { opacity: 0.5 });
    this.slam = -1; this.markT = 0;
  }
  update(dt, f, model, sp) {
    this.rings.update(dt); this.dust.update(dt);
    if (this.markT > 0) { this.markT -= dt; this.mark.material.opacity = clamp01(this.markT / 0.3); if (this.markT <= 0) this.mark.visible = false; }
    this.tool.visible = false;
    if (!sp) { this.slam = -1; return; }
    const end = sp.startup + sp.active + 8;
    if (f.t > end) return;
    bodyPoint(this.v, f, model, 'righthand', { dx: 0.45, y: f.stats.height * 0.75 });
    // ergue (antecipação) → desce rápido no frame ativo → fica um instante no chão
    const up = f.t < sp.startup ? easeOut(f.t / sp.startup) : 1 - easeOut((f.t - sp.startup) / 3);
    const gx = f.x + f.facing * 1.0;
    this.tool.visible = true;
    this.tool.scale.setScalar(1.6);
    this.tool.position.set(gx + (this.v.x - gx) * 0.3 * up, Math.max(0, 0.15 + up * 1.6), 0.3);
    this.tool.rotation.z = f.facing * up * 0.5;
    if (f.t >= sp.startup + 2 && this.slam !== f.hitId) {
      this.slam = f.hitId;
      this.rings.spawn(gx, 0.04, { from: 0.3, to: 1.8, life: 0.35, opacity: 0.85 });
      this.dust.burst(new THREE.Vector3(gx, 0.12, 0.1), { count: 5, spread: 0.8, up: 1, speed: 1.6, size: 0.3, grow: 2, life: 0.45, z: 0 });
      this.mark.position.x = gx; this.mark.visible = true; this.markT = 0.9; this.mark.material.opacity = 1;
    }
  }
  dispose() { this.scene.remove(this.tool, this.mark); }
}

export const HADDAD_FX = { arcabouco: ArcaboucoFx, carimbo: CarimboFx };

export const HADDAD_VISUALS = {
  pacote: {
    build() { const g = makePacote(); g.userData.center = true; return g; },
    animate(v, h, dt) { const s = v.userData.spin; s.rotation.z -= dt * 9 * h.facing; s.rotation.y += dt * 3; v.visible = !h.spent; },
  },
};
