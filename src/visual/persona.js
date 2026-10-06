// PERSONALIDADE DE MOVIMENTO — camada procedural por personagem por cima dos clips (só visual).
//
// Vários lutadores tocam os MESMOS clips emprestados (guarda do Xandor/Lulácio, Walk_Fight…); sem esta camada
// todo mundo "dança igual" no início do round. Configuração em visual.persona (dados do personagem):
//
//   persona: {
//     speed:  { idle: 0.8, walk: 1.2, intro: 0.7, victory: 1 },   // timeScale do clip por chave em loop
//     phase:  0.3,                                                 // fase inicial dos loops (0..1): não sincroniza com o rival
//     idle:   { bounce:[amp,hz], breath:[amp,hz], sway:[amp,hz], nod:[amp,hz], look:[amp,hz],
//               lean, twist, head, guard, elbows, stance, crouch, gesture, hand },
//     walk:   { lean, bob:[amp], swagger:[amp], head },
//     intro:  { gesture, hand, prop, say },                         // pose/gesto do meme antes do "LUTEM!"
//     victory:{ gesture, hand, prop },
//   }
//   amp de bounce/bob = fração da altura do quadril · ângulos em rad · hz = ciclos/s
//   lean + = curva pra frente · head + = olha pra baixo (− = queixo erguido) · guard + = ergue os braços
//   elbows + = abre os cotovelos · stance + = abre as pernas · crouch 0..1 = base baixa (agachamento parcial)
//
// Espaço do personagem (object space): +Z = frente, +Y = cima, +X = lado ESQUERDO do lutador.
// Gestos devolvem direções dos ossos do braço (braço e antebraço) em coordenadas relativas ao lado:
//   A(out, up, fwd): out = para fora do corpo daquele lado. Mão 'N' = a mais perto da câmera, 'F' = a de trás.
import * as THREE from 'three';
import { makePhone } from './fx/nikolasFx.js';
import { makeMic } from './fx/erikaFx.js';
import { makeMegaphone } from './fx/boulosFx.js';
import { makeMandioca } from './fx/dilmaFx.js';
import { makeVadeMecum } from './fx/dinoFx.js';
import { makePendrive } from './fx/duvalFx.js';
import { makeBriefcase } from './fx/vorcaroFx.js';
import { makePacote } from './fx/haddadFx.js';
import { bodyPoint, std } from './fx/common.js';

const S = Math.sin, abs = Math.abs;
const A = (out, up, fwd) => ({ out, up, fwd });
const PUMP = (t, hz) => 0.5 + 0.5 * S(t * hz * Math.PI * 2);

// ---- biblioteca de gestos: (t em s desde o início da pose, h = { N, F } lados resolvidos) → pose ----
// arms[lado] = [dirBraço, dirAntebraço]; head = [pitch, yaw, roll]; spine = [lean, twist, side]; bob = fração do quadril
const hip = () => [A(0.75, -0.55, -0.2), A(-0.55, -0.65, 0.3)];
export const GESTURES = {
  // comício: acena alto com a mão da câmera
  wave: (t) => ({ arms: { N: [A(0.35, 0.8, 0.35), A(0.15, 1, 0.1 + 0.6 * S(t * 7))] }, spine: [0, 0, 0.06], head: [-0.12, 0, 0] }),
  // braços em V, pulando de alegria
  raiseBoth: (t) => { const p = PUMP(t, 1.6); return { arms: { N: [A(0.42, 0.9, 0.12), A(0.25 - 0.15 * p, 1, 0.05)], F: [A(0.42, 0.9, 0.12), A(0.25 - 0.15 * (1 - p), 1, 0.05)] }, head: [-0.28, 0, 0], bob: 0.035 * abs(S(t * 5)) }; },
  // aponta o dedo pro rival (frente), a outra mão ajeita a toga/gola
  point: (t) => ({ arms: { N: [A(0.12, 0.35, 1), A(0.05, 0.3 + 0.12 * S(t * 6), 1)], F: [A(0.15, -0.9, 0.2), A(-0.35, 0.7, 0.45 + 0.1 * S(t * 9))] }, head: [-0.14, 0, 0], spine: [-0.05, 0, 0] }),
  // continência militar
  salute: (t) => ({ arms: { N: [A(0.8, 0.22, 0.42), A(-0.75, 0.58, 0.22)], F: [A(0.12, -1, 0), A(0.06, -1, 0.06)] }, spine: [-0.06, 0, 0], head: [-0.1, 0, 0], bob: t < 0.25 ? 0.03 * S(t * 12.5) : 0 }),
  // "arminha" com as duas mãos pro alto, coice alternado
  arminhaSky: (t) => { const r = PUMP(t, 2.2); return { arms: { N: [A(0.28, 0.95, 0.3), A(0.12, 1, 0.45 - 0.35 * r)], F: [A(0.28, 0.95, 0.3), A(0.12, 1, 0.1 + 0.35 * r)] }, head: [-0.3, 0, 0], bob: 0.03 * abs(S(t * 7)) }; },
  // arminha apontada pro rival (frente), coice
  arminha: (t) => { const r = PUMP(t, 1.8); return { arms: { N: [A(0.1, 0.25, 1), A(0.03, 0.2 + 0.5 * r * r, 1)], F: [A(0.1, 0.2, 1), A(0.03, 0.2 + 0.5 * (1 - r) * (1 - r), 1)] }, spine: [0.06, 0, 0] }; },
  // velho apoiado na bengala (as duas mãos no castão, à frente)
  cane: (t) => ({ arms: { N: [A(0.12, -0.55, 0.8), A(-0.32, -0.62, 0.72)], F: [A(0.14, -0.5, 0.82), A(-0.4, -0.5, 0.75)] }, spine: [0.2, 0, 0], head: [-0.22, 0, 0.05 * S(t * 2)], prop: { name: 'cane', hand: 'N' } }),
  // ergue o livro (Vade Mecum) pra plateia, outra mão na cintura
  raiseBook: (t) => ({ arms: { N: [A(0.22, 0.95, 0.2), A(0.05, 1, 0.12)], F: hip() }, head: [-0.2, 0, 0], bob: 0.02 * abs(S(t * 4)), prop: { name: 'book', hand: 'N' } }),
  // selfie: celular no alto à frente, "V" com a outra mão, cabeça inclinada pro celular
  selfie: (t) => ({ arms: { N: [A(0.38, 0.5, 0.8), A(0.18, 0.62, 0.78)], F: [A(0.35, -0.15, 0.55), A(-0.25, 0.95, 0.15)] }, head: [-0.22, 'N0.35', 0.16], spine: [-0.04, 0, 0.05], bob: t % 0.9 < 0.08 ? 0.015 : 0, prop: { name: 'phone', hand: 'N' } }),
  // filmando o "corte" com o celular no alto
  selfieHigh: (t) => ({ arms: { N: [A(0.3, 0.92, 0.3), A(0.15, 0.95, 0.35)], F: [A(0.4, 0.35, 0.6), A(0.2, 0.8, 0.5 + 0.2 * S(t * 5))] }, head: [-0.35, 'N0.2', 0.1], prop: { name: 'phone', hand: 'N' } }),
  // agente: mão no ponto do ouvido, cabeça varrendo o ambiente
  earpiece: (t) => ({ arms: { N: [A(0.85, 0.22, 0.3), A(-0.55, 0.82, -0.1)] }, head: [0.05, 0.45 * S(t * 2.4), 0], spine: [0.1, 0, 0] }),
  // microfone na boca, a outra mão gesticula aberta
  micSpeech: (t) => ({ arms: { N: [A(0.2, -0.6, 0.6), A(-0.1, 0.85, 0.5)], F: [A(0.45, 0.35, 0.75), A(0.3, 0.75, 0.55 + 0.3 * S(t * 4))] }, head: [-0.1, 0, 0.08 * S(t * 2)], prop: { name: 'mic', hand: 'N' } }),
  // mão na cintura (só um braço — combina com o clip)
  handOnHip: () => ({ arms: { F: hip() } }),
  // pose de capa de revista: mão na cintura + braço erguido elegante
  pose: (t) => ({ arms: { F: hip(), N: [A(0.55, 0.8, 0.15), A(-0.2, 0.95, 0.1)] }, head: [-0.15, 'N0.3', 0.14], spine: [-0.05, 0, -0.06], bob: 0.012 * S(t * 3) }),
  // braços cruzados (superioridade)
  crossArms: () => ({ arms: { N: [A(0.3, -0.7, 0.5), A(-1, 0.12, 0.22)], F: [A(0.3, -0.7, 0.45), A(-1, 0.22, 0.3)] }, head: [-0.2, 'N0.25', 0], spine: [-0.06, 'N0.6', 0] }), // virado pra câmera: os braços cruzados aparecem
  // ajeita a gravata / colarinho com as duas mãos
  adjustTie: (t) => { const w = 0.1 * S(t * 10); return { arms: { N: [A(0.25, -0.6 + w, 0.6), A(-0.45, 0.85, 0.3)], F: [A(0.25, -0.6 - w, 0.6), A(-0.45, 0.85, 0.3)] }, head: [-0.18, 0, 0] }; },
  // braços abertos, gargalhada de rico
  openArms: (t) => ({ arms: { N: [A(0.95, 0.15, 0.3), A(0.85, 0.45, 0.35)], F: [A(0.95, 0.15, 0.3), A(0.85, 0.45, 0.35)] }, head: [-0.4, 0, 0], spine: [-0.1, 0, 0], bob: 0.03 * abs(S(t * 9)) }),
  // megafone na boca + punho erguido
  megafone: (t) => ({ arms: { N: [A(0.4, -0.1, 0.9), A(-0.25, 0.55, 0.8)], F: [A(0.2, 1, 0.15), A(0.1, 1, 0.1 + 0.25 * PUMP(t, 1.8))] }, spine: [0.04, 0, 0], prop: { name: 'megaphone', hand: 'N' } }),
  // punho erguido batendo no ar (ato)
  fistPump: (t) => { const p = PUMP(t, 2); return { arms: { N: [A(0.2, 0.9 - 0.4 * p, 0.25), A(0.08, 1, 0.1)], F: [A(0.2, 0.5 + 0.4 * p, 0.25), A(0.08, 1, 0.1)] }, head: [-0.25, 0, 0], bob: 0.03 * p }; },
  // palmas
  clap: (t) => { const o = PUMP(t, 2.2); return { arms: { N: [A(0.35, -0.35, 0.85), A(-(0.12 + 0.45 * o), 0.35, 0.9)], F: [A(0.35, -0.35, 0.85), A(-(0.12 + 0.45 * o), 0.35, 0.9)] }, head: [-0.12, 0, 0], bob: 0.012 * o }; },
  // explicando com o dedo em riste ("dilmês")
  lecture: (t) => ({ arms: { N: [A(0.35, -0.3, 0.65), A(0.1, 1, 0.2 + 0.35 * S(t * 6))], F: hip() }, head: [0, 0, 0.12 * S(t * 1.7)] }),
  // saudação à mandioca: ergue a mandioca
  mandioca: (t) => ({ arms: { N: [A(0.2, 0.95, 0.22), A(0.05, 1, 0.25)], F: [A(0.6, 0.25, 0.5), A(0.5, 0.6, 0.5)] }, head: [-0.3, 0, 0], bob: 0.015 * abs(S(t * 3)), prop: { name: 'mandioca', hand: 'N' } }),
  // esfrega as mãos (contando o lucro / a arrecadação)
  rubHands: (t) => ({ arms: { N: [A(0.3, -0.55, 0.75), A(-0.6, 0.32 + 0.14 * S(t * 9), 0.75)], F: [A(0.3, -0.55, 0.75), A(-0.6, 0.32 - 0.14 * S(t * 9), 0.75)] }, head: [0.05, 0, 0.1], spine: [0.08, 0, 0] }),
  // mostra a maleta à frente do peito, outra mão ajeita a gravata
  showCase: (t) => ({ arms: { N: [A(0.4, -0.25, 0.85), A(0.1, 0.1 + 0.05 * S(t * 4), 1)], F: [A(0.25, -0.6, 0.6), A(-0.45, 0.85, 0.3)] }, head: [-0.15, 0, 0], prop: { name: 'case', hand: 'N' } }),
  // ergue o pendrive como troféu
  pendriveUp: (t) => ({ arms: { N: [A(0.2, 0.95, 0.25), A(0.05, 1, 0.2)], F: [A(0.12, -1, 0), A(0.06, -1, 0.06)] }, head: [-0.25, 0.3 * S(t * 2), 0], prop: { name: 'pendrive', hand: 'N' } }),
  // aponta pra câmera ("fala, chat!") inclinado pra frente
  pointCamera: (t) => ({ arms: { N: [A(0.55, 0.3, 0.8), A(0.5, 0.35 + 0.12 * S(t * 7), 0.8)], F: hip() }, head: [0, 'N0.5', 0], spine: [0.1, 'N0.25', 0] }),
  // coração com as mãos acima da cabeça ("valeu, chat!")
  heartHands: (t) => ({ arms: { N: [A(0.5, 0.78, 0.22), A(-0.7, 0.62, 0.15)], F: [A(0.5, 0.78, 0.22), A(-0.7, 0.62, 0.15)] }, head: [-0.1, 0, 0.12 * S(t * 3)], bob: 0.02 * abs(S(t * 4)) }),
  // carimba no ar: punho sobe e desce (Taxadd)
  stampAir: (t) => { const p = PUMP(t, 1.5); return { arms: { N: [A(0.3, 0.2 + 0.6 * p, 0.7), A(0.1, -0.4 + 1.2 * p, 0.6)], F: hip() }, spine: [0.08 * (1 - p), 0, 0], head: [0.05, 0, 0] }; },
};

// ---- props das poses (criados sob demanda, um por lutador) ----
function makeCane() {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1, 8), std(0x2a1a10, { roughness: 0.5 }));
  stick.position.y = -0.5; stick.castShadow = true;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), std(0xd4af37, { metalness: 0.8, roughness: 0.3 }));
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.04, 8), std(0x111111)); tip.position.y = -0.98;
  g.add(stick, knob, tip);
  g.userData.stick = stick; g.userData.tip = tip;
  return g;
}
// build: cria · scale · align: eixo local do prop → direção no mundo ('toHead' | 'fwd' | 'arm' | 'camera' | 'cane' | 'hang')
const PROPS = {
  phone: { build: makePhone, scale: 0.85, axis: [0, 0, 1], align: 'toHead' },
  mic: { build: makeMic, scale: 0.55, axis: [0, 1, 0], align: 'toHead', back: 0.12 },
  megaphone: { build: makeMegaphone, scale: 0.9, axis: [1, 0, 0], align: 'fwd' },
  mandioca: { build: () => makeMandioca(0.6), scale: 1, axis: [1, 0, 0], align: 'arm' },
  book: { build: makeVadeMecum, scale: 0.6, axis: [0, 1, 0], align: 'camera', lift: 0.12 },
  pendrive: { build: () => makePendrive(1), scale: 0.55, axis: [1, 0, 0], align: 'arm' },
  case: { build: () => makeBriefcase(), scale: 0.62, axis: [0, 1, 0], align: 'hang' },
  pacote: { build: makePacote, scale: 0.45, axis: [0, 1, 0], align: 'hang' },
  cane: { build: makeCane, scale: 1, axis: [0, 1, 0], align: 'cane' },
};

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _ax = new THREE.Vector3();

// Props visíveis nas poses de entrada/vitória (presos ao osso da mão; placeholder usa os "ossos" dele)
export class PersonaFx {
  constructor(scene) { this.scene = scene; this.props = {}; }
  get(name) {
    if (!(name in this.props)) {
      const c = PROPS[name];
      const p = c ? c.build() : null;
      if (p) { p.visible = false; this.scene.add(p); }
      this.props[name] = p;
    }
    return this.props[name];
  }
  update(dt, f, model) {
    const want = model.personaProp?.(); // { name, side, w } da pose ativa
    for (const p of Object.values(this.props)) if (p) p.visible = false;
    if (!want || want.w < 0.5) return;
    const c = PROPS[want.name], p = this.get(want.name);
    if (!c || !p) return;
    const hand = want.side === 'L' ? 'lefthand' : 'righthand', arm = want.side === 'L' ? 'leftforearm' : 'rightforearm';
    bodyPoint(_a, f, model, hand, { dx: 0.35, y: f.stats.height * 0.6 });
    p.visible = true;
    p.position.copy(_a);
    p.scale.setScalar(c.scale);
    let dir = _c;
    if (c.align === 'toHead') { bodyPoint(_b, f, model, 'head', { y: f.stats.height * 0.9 }); dir.subVectors(_b, _a); }
    else if (c.align === 'fwd') dir.set(f.facing, 0.25, 0);
    else if (c.align === 'camera') dir.set(0, 0, 1);
    else if (c.align === 'arm') { bodyPoint(_b, f, model, arm, { dx: 0.2, y: f.stats.height * 0.5 }); dir.subVectors(_a, _b); if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0); }
    else dir.set(0, 1, 0); // hang / cane: em pé
    dir.normalize();
    p.quaternion.setFromUnitVectors(_ax.set(...c.axis), dir);
    if (c.back) p.position.addScaledVector(dir, -c.back); // microfone: cabo na mão, globo na boca
    if (c.lift) p.position.y += c.lift;
    if (c.align === 'hang') p.position.y -= 0.2 * c.scale;
    if (c.align === 'cane') { // bengala do castão (mão) até o chão
      const h = Math.max(0.3, _a.y - f.y);
      p.userData.stick.scale.y = h; p.userData.stick.position.y = -h / 2; p.userData.tip.position.y = -h + 0.02;
      p.quaternion.identity();
    }
  }
  dispose() { for (const p of Object.values(this.props)) if (p) this.scene.remove(p); }
}

// Resolve um gesto em pose no espaço do personagem (direções já como Vector3 por lado R/L).
// fc = facing (+1: mão direita perto da câmera). Ângulos 'N0.3' = 0.3 rad virado para o lado da câmera.
export function resolveGesture(name, t, fc, hand) {
  const g = GESTURES[name];
  if (!g) return null;
  const raw = g(t);
  const N = hand === 'R' || hand === 'L' ? hand : fc > 0 ? 'R' : 'L';
  const F = N === 'R' ? 'L' : 'R';
  const side = (k) => (k === 'N' ? N : k === 'F' ? F : k);
  const yawTo = (v, s) => (typeof v === 'string' ? (side(v[0]) === 'L' ? 1 : -1) * Number(v.slice(1)) : v);
  const arms = {};
  for (const [k, v] of Object.entries(raw.arms || {})) {
    const s = side(k), sx = s === 'L' ? 1 : -1;
    arms[s] = v.map((d) => new THREE.Vector3(d.out * sx, d.up, d.fwd).normalize());
  }
  const head = raw.head ? [raw.head[0], yawTo(raw.head[1], N), raw.head[2] * (N === 'R' ? 1 : -1)] : null;
  const spine = raw.spine ? [raw.spine[0], yawTo(raw.spine[1], N), raw.spine[2] * (N === 'R' ? 1 : -1)] : null;
  const prop = raw.prop ? { name: raw.prop.name, side: side(raw.prop.hand || 'N') } : null;
  return { arms, head, spine, bob: raw.bob || 0, prop };
}

// Pose procedural do personagem para a chave atual (idle/walk/intro/victory) — usada pelo GLB e pelo placeholder.
// Devolve { w: {idle, walk, gesture}, idle, walk, gesture } com pesos suavizados (sem estalo ao trocar de estado).
export class PersonaState {
  constructor(persona = {}) { this.p = persona; this.w = { idle: 0, walk: 0, g: 0 }; this.gName = null; this.gT = 0; this.t = Math.random() * 10; this.key = null; this.g = null; }
  update(dt, key, fc) {
    const P = this.p;
    this.t += dt;
    if (key !== this.key) { this.key = key; if (key === 'intro' || key === 'victory') this.gT = 0; }
    this.gT += dt;
    const spec = key === 'intro' ? P.intro : key === 'victory' ? P.victory : key === 'idle' ? P.idle : null;
    const gname = spec?.gesture || null;
    if (gname && gname !== this.gName && (this.w.g < 0.05 || key !== 'idle')) { this.gName = gname; this.gHand = spec.hand; }
    const k = Math.min(1, dt * 9);
    this.w.idle += ((key === 'idle' ? 1 : 0) - this.w.idle) * k;
    this.w.walk += ((key === 'walk' || key === 'walkBack' ? 1 : 0) - this.w.walk) * k;
    this.w.g += ((gname && gname === this.gName ? 1 : 0) - this.w.g) * k;
    this.g = this.w.g > 0.01 && this.gName ? resolveGesture(this.gName, key === 'idle' ? this.t : this.gT, fc, this.gHand) : null;
    return this;
  }
  // camada de guarda/respiração (idle): ângulos no espaço do personagem
  idleOffsets() {
    const I = this.p.idle || {}, t = this.t, w = this.w.idle, TAU = Math.PI * 2;
    const osc = (v, ph = 0) => (v ? v[0] * S(t * v[1] * TAU + ph) : 0);
    return {
      w,
      lean: (I.lean || 0) + osc(I.breath) * 0.6,
      chest: osc(I.breath), // respiração: peito sobe/desce
      side: osc(I.sway),
      twist: (I.twist || 0) + osc(I.sway, 1.3) * 0.5,
      head: (I.head || 0) + osc(I.nod),
      look: osc(I.look),
      guard: (I.guard || 0) + osc(I.breath, 0.7) * 0.5,
      elbows: I.elbows || 0,
      stance: I.stance || 0,
      crouch: I.crouch || 0,
      bob: I.bounce ? I.bounce[0] * (I.bounceAbs === false ? S(t * I.bounce[1] * TAU) : abs(S(t * I.bounce[1] * Math.PI))) : 0,
    };
  }
}
