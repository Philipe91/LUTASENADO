// ULTIMATE do Haddad — "TAXAÇÃO SUPREMA" (procedural; ele continua ele mesmo).
// Cinemática: chuva de BOLETOS começa a cair na arena e um carimbo "TAXAÇÃO SUPREMA" pulsa acima dele.
// Golpes: a cada hit uma ETIQUETA DE PREÇO ("+TAXA", "R$ 99,90"...) voa e GRUDA no rival (contato só se
// f.ultRes[k] === 'hit'; errou → a etiqueta cai no chão). Finalizador: o LEÃO DA RECEITA gigante (cabeça de
// primitivas com juba) surge atrás dele, avança e MORDE o rival — o golpe rouba a barra de ultimate dele (lógica).
import * as THREE from 'three';
import { swapToGLB, PROP_GLB } from '../propModel.js';
import { Rings, Puffs, Shards, std, canvasTex, clamp01, easeIn, easeOut, smooth, bodyPoint, textSprite } from '../fx/common.js';
import { stamp, SHEET } from '../fx/haddadFx.js';

const TAGS = ['+TAXA', 'R$ 99,90', '+IOF', '+20%', 'IMPOSTO!', '+ICMS'];
const tagTex = (text) => canvasTex(320, 150, (g, W, H) => {
  g.fillStyle = '#fff2b8'; g.strokeStyle = '#111'; g.lineWidth = 8;
  g.beginPath(); g.moveTo(50, 8); g.lineTo(W - 8, 8); g.lineTo(W - 8, H - 8); g.lineTo(50, H - 8); g.lineTo(8, H / 2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(46, H / 2, 12, 0, Math.PI * 2); g.fill(); g.stroke();
  g.font = 'bold 64px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#d62828'; g.fillText(text, W / 2 + 22, H / 2 + 3);
});
const boletoTex = () => canvasTex(256, 128, (g, W, H) => {
  g.fillStyle = '#fbfbf4'; g.fillRect(0, 0, W, H); g.strokeStyle = '#333'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
  g.font = 'bold 26px Arial'; g.fillStyle = '#333'; g.fillText('BOLETO', 12, 30);
  for (let x = 14; x < W - 14; x += 4) { g.fillRect(x, 50, Math.random() < 0.5 ? 2 : 3, 54); }
});

function makeLion() {
  const g = new THREE.Group();
  const mane = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 6), std(i % 2 ? 0xb5651d : 0xd9822b, { roughness: 0.9 }));
    c.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, -0.3); c.rotation.z = a - Math.PI / 2; mane.add(c);
  }
  const face = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 16), std(0xf2b33d, { roughness: 0.8 }));
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), std(0xfbe3a6)); muzzle.position.set(0, -0.3, 0.85); muzzle.scale.set(1.2, 0.8, 0.8);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), std(0x3a2414)); nose.position.set(0, -0.05, 1.3);
  const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), std(0x111111)); e.position.set(s * 0.38, 0.32, 0.92); return e; });
  const brows = [-1, 1].map((s) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.08), std(0x7a3e10)); b.position.set(s * 0.38, 0.52, 0.95); b.rotation.z = s * 0.35; return b; });
  // mandíbula (abre e fecha) com dentes
  const jaw = new THREE.Group(); jaw.position.set(0, -0.55, 0.55);
  const jawM = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.7), std(0xf2b33d)); jawM.position.set(0, -0.1, 0.25); jaw.add(jawM);
  const mouthIn = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), std(0x7a1a1a)); mouthIn.position.set(0, 0.02, 0.25); jaw.add(mouthIn);
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), std(0xffffff)); t.position.set(-0.3 + i * 0.2, 0.1, 0.5); jaw.add(t); }
  const upper = [];
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), std(0xffffff)); t.rotation.x = Math.PI; t.position.set(-0.3 + i * 0.2, -0.6, 1.05); upper.push(t); }
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshBasicMaterial({ map: stamp('RECEITA', '#1f8a3a'), transparent: true })); badge.position.set(0, 1.45, 0.2);
  g.add(mane, face, muzzle, nose, ...eyes, ...brows, jaw, ...upper, badge);
  for (const m of [face, muzzle]) m.castShadow = true;
  g.userData.jaw = jaw;
  // 2 peças: cabeça (juba, rosto, dentes de cima) + mandíbula móvel; o crachá RECEITA continua decal
  swapToGLB(g, PROP_GLB.leaoCabeca, { keep: [jaw, badge] });
  swapToGLB(jaw, PROP_GLB.leaoMandibula);
  return g;
}

export class HaddadTaxacao {
  constructor(scene) {
    this.scene = scene; this.hideBase = false; this.hand = new THREE.Vector3();
    this.title = new THREE.Sprite(new THREE.SpriteMaterial({ map: stamp('TAXAÇÃO SUPREMA', '#1f8a3a'), transparent: true, depthWrite: false })); this.title.visible = false; this.title.renderOrder = 9; scene.add(this.title);
    this.tags = TAGS.map((t) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(t), transparent: true, depthWrite: false })); s.scale.set(0.75, 0.35, 1); s.visible = false; s.renderOrder = 9; scene.add(s); return s; });
    const bt = boletoTex();
    this.boletos = Array.from({ length: 22 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: bt, side: THREE.DoubleSide })); m.visible = false; scene.add(m); return { m, x: 0, y: 0, vy: 0, w: 0 }; });
    this.lion = makeLion(); this.lion.visible = false; scene.add(this.lion);
    this.lionTxt = textSprite('LEÃO DA RECEITA!', { color: '#fff', stroke: '#5a2a00', w: 2.4, h: 0.8, bubble: '#d9822b' }); this.lionTxt.visible = false; this.lionTxt.renderOrder = 9; scene.add(this.lionTxt);
    this.rings = new Rings(scene, 4, SHEET); this.dust = new Puffs(scene, 12, 0xfff2b8, { opacity: 0.8 });
    this.coins = new Shards(scene, 16, new THREE.CylinderGeometry(0.09, 0.09, 0.02, 10), std(0xffc93a, { metalness: 0.7, roughness: 0.3 }));
    this.boomed = new Set(); this.wasOn = false; this.rainInit = false;
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    this.rings.update(dt); this.dust.update(dt); this.coins.update(dt);
    this.title.visible = this.lion.visible = this.lionTxt.visible = false;
    for (const s of this.tags) s.visible = false;
    if (!on) { if (this.wasOn) { this.boomed.clear(); for (const b of this.boletos) b.m.visible = false; this.rainInit = false; } this.wasOn = false; return; }
    this.wasOn = true;
    const u = f.ultimate, o = f.opponent, fac = f.facing, now = performance.now() / 1000;
    const hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    const mid = (f.x + o.x) / 2;

    // ---- chuva de boletos: a ultimate toda ----
    if (!this.rainInit) {
      this.rainInit = true;
      for (const b of this.boletos) { b.x = mid + (Math.random() - 0.5) * 9; b.y = 3 + Math.random() * 5; b.vy = 1.2 + Math.random() * 1.2; b.w = (Math.random() - 0.5) * 6; b.m.rotation.set(Math.random() * 3, Math.random() * 3, 0); }
    }
    const fadeOut = f.t > end - 10;
    for (const b of this.boletos) {
      b.y -= b.vy * dt; b.m.rotation.x += b.w * dt; b.m.rotation.z += b.w * 0.5 * dt;
      if (b.y < 0.05) { if (fadeOut) { b.m.visible = false; continue; } b.y = 5 + Math.random() * 2; b.x = mid + (Math.random() - 0.5) * 9; }
      b.m.visible = true; b.m.position.set(b.x + Math.sin(now * 2 + b.w) * 0.3, b.y, -0.5 + (b.w % 1));
    }

    // ---- cinemática: carimbo título ----
    if (cine >= 0) {
      const q = smooth((75 - cine) / 10);
      this.title.visible = true; this.title.position.set(f.x, f.y + f.stats.height + 0.9, 0.8);
      const pop = q < 1 ? 1.6 - 0.6 * q : 1; this.title.scale.set(2.8 * pop, 1.1 * pop, 1); this.title.material.rotation = -0.08;
      return;
    }

    // ---- golpes: etiquetas voam da mão dele e grudam no rival ----
    bodyPoint(this.hand, f, model, 'righthand', { dx: 0.3, y: f.stats.height * 0.6 });
    for (let h = 0; h < u.hits; h++) {
      const hitF = 12 + h * u.interval, born = hitF - 6, t = f.t - born;
      if (t < 0 || f.t > fin + 2) continue;
      const s = this.tags[h % this.tags.length], hit = f.ultRes[h] === 'hit';
      const stuck = new THREE.Vector3(o.x + (((h * 37) % 7) / 7 - 0.5) * 0.7, o.y + 0.5 + ((h * 53) % 9) / 9 * 1.1, 0.7);
      s.visible = true; s.material.opacity = 1;
      if (f.t <= hitF) { s.position.lerpVectors(this.hand, stuck, easeIn(t / 6)); s.material.rotation = t * 0.6; }
      else if (hit) { s.position.copy(stuck); s.material.rotation = -0.3 + h * 0.15; if (!this.boomed.has(h)) { this.boomed.add(h); this.coins.burst(stuck, { count: 2, speed: 2, up: 3, life: 0.7, size: 1, gravity: 10 }); } }
      else { const r = (f.t - hitF) / 12; s.visible = r < 1; s.position.set(stuck.x + fac * r, stuck.y * (1 - r), 0.7); s.material.opacity = 1 - r; }
    }

    // ---- finalizador: LEÃO DA RECEITA ----
    const lt = f.t - (fin - 18);
    if (lt >= 0 && f.t < end) {
      const hit = f.ultRes[u.hits] === 'hit';
      const k = Math.min(easeOut(lt / 10), clamp01((end - f.t) / 8));
      const tx = hit || f.t < fin ? o.x - fac * 0.6 : o.x - fac * 2.2;
      const x = f.t < fin ? f.x - fac * 1.5 + (tx - (f.x - fac * 1.5)) * easeIn(clamp01((lt - 6) / 12)) : tx;
      this.lion.visible = true;
      this.lion.position.set(x, 1.8, -0.4); this.lion.rotation.y = fac * 0.55; this.lion.scale.setScalar(Math.max(0.01, 1.05 * k));
      // boca: abre na aproximação, fecha (morde) no frame do finalizador
      const open = f.t < fin ? clamp01((lt - 4) / 10) : 1 - clamp01((f.t - fin) / 3);
      this.lion.userData.jaw.rotation.x = open * 0.7;
      this.lionTxt.visible = lt > 4; this.lionTxt.position.set(x, 3.6, 0.2);
      const ts = clamp01((lt - 4) / 6) * k; this.lionTxt.scale.set(2.4 * ts, 0.8 * ts, 1);
      if (f.t >= fin && !this.boomed.has('fin')) {
        this.boomed.add('fin');
        const at = new THREE.Vector3(o.x, o.y + 1, 0.5);
        this.rings.spawn(at.x, at.y, { flat: false, from: 0.3, to: 3.6, life: 0.4, opacity: 0.95, color: 0xffd23a, z: 0.6 });
        this.rings.spawn(o.x, 0.05, { from: 0.4, to: 4.5, life: 0.5, opacity: 0.8 });
        this.dust.burst(at, { count: 12, spread: 1.6, up: 2, speed: 3.5, size: 0.4, grow: 2.2, life: 0.6 });
        this.coins.burst(at, { count: 14, speed: 4, up: 5, life: 1.1, size: 1.2, gravity: 10 });
      }
    }
  }

  dispose() { this.scene.remove(this.title, this.lion, this.lionTxt, ...this.tags, ...this.boletos.map((b) => b.m)); }
}
