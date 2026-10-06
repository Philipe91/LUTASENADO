// PLACEHOLDER DE COMBATE — boneco de primitivas, só para testar a luta enquanto o GLB não chega.
// Não invista tempo aqui. Implementa a mesma interface do GLBModel: object, play(), update(), setFlash(), dispose().
import * as THREE from 'three';
import { PersonaState } from '../persona.js';

function nameSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.font = '64px Bangers, Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText(text, 256, 50);
  g.fillStyle = color; g.fillText(text, 256, 50);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(1.6, 0.3, 1);
  s.renderOrder = 10;
  return s;
}

// Alvos de pose por chave de animação. k = progresso 0..1 do golpe; time = segundos.
function targetPose(key, k, time) {
  const T = { armR: -1.2, armL: -1.0, armRz: 0, armLz: 0, legR: 0, legL: 0, legZ: 0, lean: 0.08, low: 0, lay: 0, twist: 0, side: 0, head: 0, headYaw: 0 };
  const strike = (a, b) => (k < 0.3 ? a + (a - b) * 0.25 * (k / 0.3) : k < 0.55 ? b : b + (a - b) * ((k - 0.55) / 0.45));
  switch (key) {
    case 'idle': case 'intro': T.low = Math.sin(time * 4) * 0.03; T.armR += Math.sin(time * 4) * 0.08; break;
    case 'walk': case 'walkBack': case 'dash': case 'backdash': { const s = Math.sin(time * 11) * 0.6; T.legR = s; T.legL = -s; T.low = Math.abs(s) * 0.05; break; }
    case 'crouch': T.low = -0.5; T.legR = -1.1; T.legL = -1.1; T.lean = 0.3; break;
    case 'jump': T.legR = -1.0; T.legL = -0.4; T.armR = -2.3; T.armL = -2.0; break;
    case 'punch1': case 'airPunch': T.armR = strike(-0.9, -1.6); T.twist = strike(0, 0.5); T.lean = strike(0.05, 0.25); break;
    case 'punch2': T.armL = strike(-0.9, -1.6); T.twist = strike(0, -0.5); T.lean = strike(0.05, 0.25); break;
    case 'punch3': T.armR = strike(-0.4, -2.7); T.low = strike(-0.15, 0.1); T.twist = strike(-0.3, 0.3); break;
    case 'kick': case 'airKick': T.legR = strike(0.4, -1.6); T.lean = strike(0, -0.35); break;
    case 'crouchPunch': T.low = -0.5; T.legR = -1.1; T.legL = -1.1; T.lean = 0.3; T.armR = strike(-0.6, -1.5); break;
    case 'sweep': T.low = -0.55; T.legL = -1.2; T.legR = strike(0, -1.5); T.twist = strike(0, 0.9); T.lean = 0.4; break;
    case 'throw': T.armR = strike(-1.0, -1.6); T.armL = strike(-1.0, -1.6); T.twist = strike(0, Math.PI * 0.9); break;
    case 'special1': T.armR = strike(-1.0, -1.7); T.armL = strike(-0.8, -1.4); T.lean = strike(0, 0.3); break;
    case 'special2': T.armR = strike(-0.5, -1.6); T.armL = strike(-0.5, -1.6); T.lean = strike(0, 0.45); T.legR = strike(0, -0.6); break;
    case 'special3': T.low = strike(0, -0.3); T.armR = strike(-2.5, -1.2); T.armL = strike(-2.5, -1.2); T.legR = strike(-0.9, 0); break;
    case 'ultimate': T.armR = -2.9; T.armL = -2.9; T.armRz = 0.4; T.armLz = -0.4; T.lean = -0.2 + Math.sin(time * 20) * 0.05; break;
    case 'block': T.armR = -1.9; T.armL = -1.9; T.armRz = 0.7; T.armLz = -0.7; T.lean = -0.1; break;
    case 'crouchBlock': T.low = -0.5; T.legR = -1.1; T.legL = -1.1; T.armR = -1.9; T.armL = -1.9; T.armRz = 0.7; T.armLz = -0.7; break;
    case 'hit': T.lean = -0.45; T.head = -0.4; T.armR = -0.4; T.armL = -0.3; break;
    case 'dizzy': T.lean = -0.1 + Math.sin(time * 8) * 0.15; T.head = Math.sin(time * 10) * 0.4; T.armR = -0.2; T.armL = -0.2; break;
    case 'knockdown': case 'down': case 'ko': T.lay = 1; T.armR = -2.8; T.armL = -2.6; T.legR = -0.3; break;
    case 'getup': T.lay = 1 - k; break;
    case 'victory': T.armR = -2.9; T.armL = -2.9; T.low = Math.abs(Math.sin(time * 6)) * 0.12; break;
    default: break;
  }
  return T;
}

export class PlaceholderModel {
  constructor(data) {
    const P = { skin: 0xe8b48f, suit: 0x333333, accent: 0xcc2222, hair: 0x222222, shirt: 0xffffff, headScale: 1.3, girth: 1, ...data.visual?.placeholder };
    const H = data.stats?.height ?? 1.8;
    this.materials = [];
    const M = (c) => { const m = new THREE.MeshToonMaterial({ color: c }); this.materials.push(m); return m; };
    const mesh = (geo, c) => { const m = new THREE.Mesh(geo, M(c)); m.castShadow = true; return m; };
    const box = (w, h, d, c) => mesh(new THREE.BoxGeometry(w, h, d), c);

    const legLen = H * 0.42, torsoH = H * 0.3, W = 0.42 * P.girth, D = 0.28 * P.girth, headR = H * 0.1 * P.headScale;
    this.object = new THREE.Group();
    this.body = new THREE.Group(); this.object.add(this.body);
    this.hips = new THREE.Group(); this.hips.position.y = legLen; this.body.add(this.hips);
    this.baseHipY = legLen;

    const torso = box(W, torsoH, D, P.suit); torso.position.y = torsoH / 2; this.hips.add(torso);
    const shirt = box(W * 0.28, torsoH * 0.85, 0.02, P.shirt); shirt.position.set(0, torsoH * 0.55, D / 2 + 0.01); this.hips.add(shirt);
    const tie = box(W * 0.1, torsoH * 0.65, 0.03, P.accent); tie.position.set(0, torsoH * 0.5, D / 2 + 0.03); this.hips.add(tie);
    if (P.accent2) { const sash = box(W * 1.05, 0.08, D * 1.05, P.accent2); sash.position.y = torsoH * 0.62; sash.rotation.z = 0.5; this.hips.add(sash); }
    if (P.robe) { const robe = box(W * 1.25, torsoH + legLen * 0.8, D * 1.2, P.suit); robe.position.set(0, torsoH / 2 - legLen * 0.38, -0.02); this.hips.add(robe); }

    this.head = new THREE.Group(); this.head.position.y = torsoH + headR * 0.85; this.hips.add(this.head);
    const skull = mesh(new THREE.SphereGeometry(headR, 20, 16), P.skin);
    if (P.longFace) skull.scale.set(0.85, 1.15, 0.95);
    this.head.add(skull);
    for (const s of [-1, 1]) {
      const eye = mesh(new THREE.SphereGeometry(headR * 0.11, 8, 8), 0x111111); eye.position.set(s * headR * 0.33, headR * 0.12, headR * 0.9); this.head.add(eye);
      const brow = box(headR * 0.42, headR * 0.1, 0.03, P.bald ? 0x111111 : P.hair); brow.position.set(s * headR * 0.33, headR * 0.32, headR * 0.9);
      if (P.angryBrows) brow.rotation.z = s * 0.35;
      this.head.add(brow);
    }
    if (!P.bald) {
      const hair = mesh(new THREE.SphereGeometry(headR * 1.05, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), P.hair);
      if (P.sidePart) hair.rotation.z = 0.3;
      if (P.longFace) hair.scale.set(0.87, 1.15, 0.97);
      this.head.add(hair);
      if (P.longHair) { // cabelão caindo atrás da cabeça até os ombros (mullet do Nikolas, ondas da Erika)
        const back = mesh(new THREE.SphereGeometry(headR * 0.95, 16, 12), P.hair); back.scale.set(1.05, 1.5, 0.75); back.position.set(0, -headR * 0.45, -headR * 0.55); this.head.add(back);
      }
    }
    if (P.beard) { const beard = mesh(new THREE.SphereGeometry(headR * 0.8, 16, 12), P.hair); beard.position.set(0, -headR * 0.5, headR * 0.3); beard.scale.set(1.05, 0.85, 0.8); this.head.add(beard); }
    if (P.glasses) {
      for (const s of [-1, 1]) { const lens = box(headR * 0.5, headR * 0.3, 0.03, 0x111111); lens.position.set(s * headR * 0.33, headR * 0.12, headR * 0.98); this.head.add(lens); }
    }

    if (P.headset) { // fone de streamer: arco por cima + conchas + microfone de haste até a boca (Renan Santos)
      const dark = 0x161616;
      const band = mesh(new THREE.TorusGeometry(headR * 1.08, headR * 0.07, 6, 20, Math.PI), dark); band.position.y = headR * 0.05; this.head.add(band);
      for (const s of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(headR * 0.3, headR * 0.3, headR * 0.22, 14), dark); cup.rotation.z = Math.PI / 2; cup.position.set(s * headR * 1.05, 0, 0); this.head.add(cup); }
      const boom = mesh(new THREE.CylinderGeometry(headR * 0.04, headR * 0.04, headR * 1.0, 6), dark); boom.position.set(headR * 0.8, -headR * 0.4, headR * 0.45); boom.rotation.set(0.9, 0, 0.6); this.head.add(boom);
      const mic = mesh(new THREE.SphereGeometry(headR * 0.13, 10, 8), 0x9146ff); mic.position.set(headR * 0.42, -headR * 0.62, headR * 0.92); this.head.add(mic);
    }

    this.arms = {};
    for (const [name, s] of [['R', -1], ['L', 1]]) {
      const pivot = new THREE.Group(); pivot.position.set(s * (W / 2 + 0.08), torsoH - 0.06, 0); this.hips.add(pivot);
      const arm = box(0.15 * Math.sqrt(P.girth), H * 0.32, 0.15, P.suit); arm.position.y = -H * 0.16; pivot.add(arm);
      const fist = mesh(new THREE.SphereGeometry(0.09, 10, 8), P.skin); fist.position.y = -H * 0.34; pivot.add(fist);
      this.arms[name] = pivot; this.fists = { ...this.fists, [name]: fist };
    }
    this.legs = {};
    for (const [name, s] of [['R', -1], ['L', 1]]) {
      const pivot = new THREE.Group(); pivot.position.set(s * W * 0.25, 0, 0); this.hips.add(pivot);
      const leg = box(0.17 * Math.sqrt(P.girth), legLen, 0.18, P.pants || P.suit); leg.position.y = -legLen / 2; pivot.add(leg);
      const shoe = box(0.2, 0.09, 0.3, 0x151515); shoe.position.set(0, -legLen + 0.045, 0.06); pivot.add(shoe);
      this.legs[name] = pivot;
    }

    const label = nameSprite(data.name, '#ffd400');
    label.position.y = H + 0.45;
    this.object.add(label);

    // "ossos" para efeitos presos ao corpo (bodyPoint: props na mão, estrelinhas na cabeça)
    this.bones = new Map([['righthand', this.fists.R], ['lefthand', this.fists.L], ['rightforearm', this.arms.R], ['leftforearm', this.arms.L], ['head', this.head]]);
    if (data.visual?.persona) this.ps = new PersonaState(data.visual.persona);
    this.cur = targetPose('idle', 0, 0);
    this.key = 'idle'; this.len = 0; this.elapsed = 0; this.time = 0;
  }

  play(key, len) { this.key = key; this.len = len; this.elapsed = 0; }

  update(dt, pose = {}) {
    this.time += dt; this.elapsed += dt;
    const k = this.len ? Math.min(1, this.elapsed / (this.len / 60)) : 0;
    const T = targetPose(this.key, k, this.time);
    if (this.ps) this.applyPersona(T, dt, pose.facing ?? 1);
    const a = dt > 0 ? 1 - Math.pow(0.0005, dt) : 0;
    for (const p in T) this.cur[p] += (T[p] - this.cur[p]) * a;
    const c = this.cur;
    this.arms.R.rotation.set(c.armR, 0, c.armRz);
    this.arms.L.rotation.set(c.armL, 0, c.armLz);
    this.legs.R.rotation.set(c.legR, 0, -c.legZ);
    this.legs.L.rotation.set(c.legL, 0, c.legZ);
    this.hips.position.y = this.baseHipY + c.low;
    this.hips.rotation.set(c.lean, c.twist, c.side);
    this.head.rotation.set(c.head, c.headYaw, 0);
    this.body.rotation.x = -c.lay * Math.PI / 2;
  }

  // mesma personalidade do GLB (persona.js) traduzida para o boneco: guarda, respiração, gingado e gestos
  applyPersona(T, dt, fc) {
    const ps = this.ps.update(dt, this.key, fc);
    const io = ps.idleOffsets(), wi = io.w;
    if (wi > 0.01) {
      T.low += (io.bob * this.baseHipY - io.crouch * 0.18) * wi;
      T.lean += io.lean * wi; T.twist += io.twist * wi; T.side += io.side * wi;
      T.head += (io.head - io.chest * 0.5) * wi; T.headYaw += io.look * wi;
      T.armR -= io.guard * wi; T.armL -= io.guard * wi;
      T.armRz -= io.elbows * wi; T.armLz += io.elbows * wi;
      T.legZ += io.stance * wi;
    }
    const W = ps.p.walk, ww = ps.w.walk;
    if (W && ww > 0.01) {
      const ph = this.time * 5.5;
      T.lean += (W.lean || 0) * ww; T.twist += (W.swagger || 0) * Math.sin(ph) * ww; T.side += (W.roll || 0) * Math.sin(ph) * ww;
      T.head += (W.head || 0) * ww; T.low -= (W.bob || 0) * this.baseHipY * Math.abs(Math.cos(ph)) * ww + (W.crouch || 0) * 0.18 * ww;
    }
    const g = ps.g, wg = ps.w.g;
    if (!g || wg < 0.01) return;
    if (g.spine) { T.lean += g.spine[0] * wg; T.twist += g.spine[1] * wg; T.side += g.spine[2] * wg; }
    if (g.head) { T.head += g.head[0] * wg; T.headYaw += g.head[1] * wg; }
    T.low += g.bob * this.baseHipY * wg;
    for (const [s, [up, fore]] of Object.entries(g.arms)) {
      // braço inteiro (sem cotovelo): direção média braço/antebraço → ângulos do pivô do ombro (ordem XYZ)
      const d = up.clone().add(fore).normalize();
      const phi = Math.asin(Math.max(-1, Math.min(1, d.x)));
      let th = Math.atan2(-d.z, -d.y);
      if (th > 0.5) th -= Math.PI * 2; // contínuo com a guarda (−1.2): erguer passa pela frente, não por trás
      const kx = `arm${s}`, kz = `arm${s}z`;
      T[kx] += (th - T[kx]) * wg; T[kz] += (phi - T[kz]) * wg;
    }
  }

  personaProp() {
    const g = this.ps?.g;
    return g?.prop ? { ...g.prop, w: this.ps.w.g } : null;
  }

  setFlash(on) {
    if (on === this.flashing) return;
    this.flashing = on;
    for (const m of this.materials) m.emissive.setHex(on ? 0x999999 : 0x000000);
  }

  dispose() {
    this.object.traverse((o) => { o.geometry?.dispose(); });
    for (const m of this.materials) m.dispose();
  }
}
