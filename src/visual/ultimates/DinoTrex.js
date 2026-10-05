// ULTIMATE do Dino Supremo — "T-Rex de Terno" (procedural, sem GLB).
// Cinemática: os ÓCULOS saem do rosto, são limpos, voltam e CRESCEM; os botões do terno estouram voando pra câmera;
// nuvem de poeira cobre a troca e o T-REX cresce: GORDO, barrigona verde-clara saltando da camisa aberta, papada,
// toga preta de juiz rasgada pelos espinhos das costas, paletó escuro, gravata azul de bolinhas, óculos de aro fino
// escorregando no focinho, cabelo grisalho pra trás e BRACINHOS. Gag: tenta ajeitar os óculos e não alcança.
// Golpes: 0 e 3 = MORDIDA (avança e fecha a bocarra no alvo), 1 = RABADA (gira 360°), 2 = PISÃO (levanta a perna e
// bate; poeira). Finalizador: ruge pro céu e um METEORO cai no alvo (no chão à frente, se errou).
// Modelagem v3 orgânica, acabamento vinil/toy como o Polvão (nada de caixas) — ver makeTrex().
import * as THREE from 'three';
import { Tentacle } from '../fx/Tentacle.js';
import { Puffs, Rings, Shards, std, clamp01, smooth, easeIn, easeOut, canvasTex, add, flat, mergeParts } from '../fx/common.js';
import { MeshyBody } from './meshyBody.js';

const SKIN = 0x5f8a3e, SKIN_D = 0x3e5a28, BELLY = 0xc6dc9a, BELLY_L = 0xd9e8b0, SUIT = 0x23262e, SUIT_L = 0x30343f, TOGA = 0x121216;
const HAIR = 0xd2d2d2, HAIR_D = 0x9a9a9a, WHITE = 0xfffaf0, BLACK = 0x111111, MOUTH = 0x5a1424, TONGUE = 0xd0607a, CLAW = 0xe9dfc2;
const SHOE = 0x141418, RIM = 0x6a6e78, TIE_BLUE = 0x1e3a8a;
const UP_DOWN = new THREE.Vector3(0, -1, 0);

// ---- modelagem "vinil/toy" (acabamento do Polvão): esferas achatadas, cápsulas, toros, com segmentos suficientes.
// Cada parte rígida = UMA malha (mergeParts, cor por vértice) → poucas draw calls.
const VINYL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.02 });
const solid = (parts, mat = VINYL) => { const m = new THREE.Mesh(mergeParts(parts), mat); m.castShadow = true; return m; };
const S = (r, ...a) => new THREE.SphereGeometry(r, a[0] ?? 28, a[1] ?? 18, ...a.slice(2));
const C = (r, len, rs = 16) => new THREE.CapsuleGeometry(r, len, 6, rs);
const CONE = (r, h, rs = 10) => new THREE.ConeGeometry(r, h, rs);
const HALF = Math.PI / 2;
let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // dentes tortos iguais a cada build

// fileira de dentes TORTOS (tamanhos variados, inclinados) de x0 a x1 nos dois lados (z = ±z)
function teethParts(out, { x0, x1, step, y, z, r = 0.08, h = 0.28, up = false, big = [] }) {
  let i = 0;
  for (let x = x0; x <= x1 + 1e-6; x += step, i++) for (const s of [-1, 1]) {
    const k = big.includes(i) ? 1.6 : 0.75 + rnd() * 0.55;
    out.push({ geo: CONE(r * k, h * k, 8), color: WHITE, p: [x + (rnd() - 0.5) * 0.06, y, s * z], r: [(up ? 0 : Math.PI) + s * (rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5] });
  }
}
// pontas rasgadas penduradas na barra de uma esfera parcial (phi entre from/to, theta TH) — paletó e toga
function tornSphereHem(out, { R, sx, sy, sz, TH, from, to, n, color, len = 0.4 }) {
  for (let i = 0; i < n; i++) {
    const phi = from + ((i + 0.5) / n) * (to - from);
    const x = -Math.cos(phi) * Math.sin(TH) * R * sx, z = Math.sin(phi) * Math.sin(TH) * R * sz, y = Math.cos(TH) * R * sy;
    const L = len * (0.6 + rnd() * 0.8);
    out.push({ geo: CONE(0.2, L, 3), color, p: [x * 0.99, y - L * 0.42, z * 0.99], r: [Math.PI, phi, 0], s: [1, 1, 0.35] });
  }
}
function tieTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#1e3a8a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8eefc';
    for (let j = 0; j < 9; j++) for (let i = 0; i < 3; i++) { const y = 14 + j * 28, x = 12 + i * 20 + (j % 2 ? 10 : 0); g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  });
}
// óculos retangulares GROSSOS (base do Dino; usados na cinemática: saem do rosto, são limpos e crescem)
export function makeGlasses(scale = 1, half = 0.5) {
  const g = new THREE.Group();
  const parts = [];
  for (const s of [-1, 1]) {
    const z = s * half;
    parts.push(
      { geo: new THREE.BoxGeometry(0.68, 0.11, 0.09), color: BLACK, p: [0, 0.25, z] },
      { geo: new THREE.BoxGeometry(0.68, 0.11, 0.09), color: BLACK, p: [0, -0.25, z] },
      { geo: new THREE.BoxGeometry(0.11, 0.6, 0.09), color: BLACK, p: [-0.3, 0, z] },
      { geo: new THREE.BoxGeometry(0.11, 0.6, 0.09), color: BLACK, p: [0.3, 0, z] },
      { geo: new THREE.BoxGeometry(0.75, 0.07, 0.07), color: BLACK, p: [-0.68, 0.2, z * 0.92] }, // haste até a orelha
    );
  }
  parts.push({ geo: new THREE.BoxGeometry(0.1, 0.09, half * 2), color: BLACK, p: [0.3, 0.2, 0] }); // ponte
  g.add(solid(parts));
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.35, roughness: 0.05 });
  for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), lensMat); lens.position.z = s * (half + 0.01); lens.rotation.y = s > 0 ? 0 : Math.PI; g.add(lens);
  }
  g.scale.setScalar(scale);
  return g;
}
// óculos de ARO FINO (metal) do T-Rex: aros ovais, ponte e hastes finas, escorregando no focinho
function makeThinGlasses(half = 0.62) {
  const g = new THREE.Group();
  const parts = [];
  for (const s of [-1, 1]) {
    const z = s * half;
    parts.push(
      { geo: new THREE.TorusGeometry(0.3, 0.04, 8, 28), color: RIM, p: [0, 0, z], s: [1, 0.85, 1] },                      // aro (plano x-y, olha pro lado)
      { geo: new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8), color: RIM, p: [-0.6, 0.2, z * 0.97], r: [0, 0, HALF] }, // haste
    );
  }
  parts.push({ geo: new THREE.TorusGeometry(half - 0.3, 0.025, 8, 20, Math.PI), color: RIM, p: [0.02, 0.05, 0], r: [0, HALF, HALF] }); // ponte arqueada
  g.add(solid(parts, std(RIM, { metalness: 0.7, roughness: 0.3, vertexColors: true })));
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.5, roughness: 0.05, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.29, 24), lensMat); lens.scale.set(1, 0.85, 1);
    lens.position.z = s * (half + 0.005); g.add(lens);
  }
  return g;
}

function makeTrex() {
  seed = 11;
  const root = new THREE.Group(); // +X = frente
  // ---- pernas GROSSAS (pivô no quadril): coxa de calça escura rasgada, canela verde bojuda, sapato preto
  // estourado pelas garras ----
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(-0.2, 2.1, s * 0.66); root.add(leg);
    const lp = [
      { geo: S(0.66), color: SUIT, p: [0, -0.45, 0], s: [1.12, 1.25, 0.86] },                 // coxa (calça)
      { geo: S(0.4), color: SKIN, p: [0.12, -1.18, 0], s: [1.05, 1.2, 1.0] },                  // joelho/panturrilha
      { geo: C(0.3, 0.5), color: SKIN, p: [0.22, -1.5, 0], r: [0, 0, 0.18] },                 // canela
      { geo: S(0.36), color: SHOE, p: [0.45, -1.98, 0], s: [1.85, 0.5, 1.15] },                // sapato
      { geo: S(0.24), color: SHOE, p: [0.0, -1.95, 0], s: [1, 0.85, 1.1] },                   // calcanhar
      { geo: S(0.1), color: SKIN_D, p: [-0.1, -1.12, s * 0.3], s: [1, 1.5, 0.6] },            // escamas
    ];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, L = 0.3 + rnd() * 0.2; lp.push({ geo: CONE(0.14, L, 3), color: SUIT, p: [Math.sin(a) * 0.62, -1.1 - L * 0.4, Math.cos(a) * 0.52], r: [Math.PI, a, 0], s: [1, 1, 0.35] }); } // barra rasgada
    for (let i = -1; i <= 1; i++) {
      lp.push({ geo: S(0.14), color: SKIN, p: [1.05, -2.0, i * 0.2], s: [1.3, 0.8, 1] });              // dedos rompendo o bico
      lp.push({ geo: CONE(0.08, 0.3), color: CLAW, p: [1.3, -2.02, i * 0.2], r: [0, 0, -HALF - 0.15] });
    }
    leg.add(solid(lp));
    legs.push(leg);
  }
  // ---- corpo GORDO: tronco ovalado + BARRIGONA verde-clara saltando da camisa aberta, paletó escuro por cima,
  // TOGA preta de juiz por fora rasgada pelos espinhos das costas, colarinho e gravata azul de bolinhas ----
  const bodyG = new THREE.Group(); bodyG.position.y = 2.45; root.add(bodyG);
  const gapS = 0.75, gapJ = 0.62, gapT = 1.0; // abertura na frente (+X ⇔ phi = π na SphereGeometry)
  const bp = [
    { geo: S(1.0, 36, 24), color: SKIN, s: [1.6, 1.1, 1.1] },
    { geo: S(1.0, 36, 24), color: BELLY, p: [0.55, -0.42, 0], s: [1.3, 0.95, 1.08] },                             // barrigona
    { geo: S(1.0, 36, 18, Math.PI + gapS, Math.PI * 2 - gapS * 2, 0, Math.PI * 0.62), color: WHITE, s: [1.64, 1.12, 1.13] }, // camisa (aberta na frente)
    { geo: S(1.0, 36, 18, Math.PI + gapJ, Math.PI * 2 - gapJ * 2, 0, Math.PI * 0.6), color: SUIT, s: [1.72, 1.16, 1.2] },  // paletó
    { geo: S(1.0, 36, 18, Math.PI + gapT, Math.PI * 2 - gapT * 2, 0.12 * Math.PI, Math.PI * 0.64), color: TOGA, s: [1.82, 1.3, 1.3] }, // toga
    { geo: new THREE.TorusGeometry(0.66, 0.11, 10, 28), color: 0xffffff, p: [1.3, 0.6, 0], r: [HALF, 0, -0.55] },   // colarinho
    { geo: C(0.6, 0.7, 18), color: SKIN, p: [1.38, 0.62, 0], r: [0, 0, -0.75] },                                   // pescoço
    { geo: new THREE.TorusGeometry(0.58, 0.14, 10, 24), color: BELLY_L, p: [1.15, 0.3, 0], r: [HALF, 0, -0.6] },   // papada (dobra do pescoço)
    { geo: new THREE.TorusGeometry(0.5, 0.11, 10, 24), color: BELLY_L, p: [1.25, 0.56, 0], r: [HALF, 0, -0.6] },
  ];
  for (let i = 0; i < 4; i++) bp.push({ geo: S(0.5), color: BELLY_L, p: [1.45 - i * 0.02, -0.15 - i * 0.3, 0], s: [0.4, 0.3, 1.2] }); // dobras da barriga
  tornSphereHem(bp, { R: 1.0, sx: 1.72, sy: 1.16, sz: 1.2, TH: Math.PI * 0.6, from: Math.PI + gapJ + 0.2, to: Math.PI * 3 - gapJ - 0.2, n: 11, color: SUIT, len: 0.4 });
  tornSphereHem(bp, { R: 1.0, sx: 1.82, sy: 1.3, sz: 1.3, TH: Math.PI * 0.76, from: Math.PI + gapT + 0.15, to: Math.PI * 3 - gapT - 0.15, n: 13, color: TOGA, len: 0.55 });
  for (const s of [-1, 1]) {
    bp.push({ geo: C(0.13, 0.85, 10), color: SUIT_L, p: [1.42, 0.1, s * 0.66], r: [s * 0.35, 0, -1.0], s: [0.4, 1, 1] }); // lapelas
    bp.push({ geo: C(0.16, 1.0, 10), color: 0x1c1c22, p: [1.1, 0.25, s * 1.05], r: [s * 0.3, 0, -0.8], s: [0.4, 1, 1] }); // gola da toga
    bp.push({ geo: S(0.12), color: SKIN_D, p: [-0.3, 0.9, s * 0.75], s: [1, 1.4, 0.7] });                              // escamas
  }
  // espinhos das costas rasgando a toga (do alto das costas até o rabo) + rasgos em volta de cada um
  for (let i = 0; i < 6; i++) {
    const a = 0.35 + i * 0.22, sz = 1 - i * 0.08;
    const px = -1.82 * Math.sin(a) * 0.98, py = 1.3 * Math.cos(a) * 0.98;
    bp.push({ geo: CONE(0.17 * sz, 0.6 * sz, 8), color: SKIN_D, p: [px, py, 0], r: [0, 0, a + 0.15] });
    for (const s of [-1, 1]) bp.push({ geo: CONE(0.14, 0.3, 3), color: TOGA, p: [px + 0.05, py - 0.05, s * 0.2], r: [a + 0.15 + s * 0.6, 0, 0], s: [1, 1, 0.35] });
  }
  bodyG.add(solid(bp));
  // gravata de bolinhas: tubo seguindo a barriga (pendurada por cima da pança)
  const tieCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(1.62, 0.45, 0), new THREE.Vector3(1.78, 0.1, 0), new THREE.Vector3(1.86, -0.35, 0), new THREE.Vector3(1.78, -0.8, 0), new THREE.Vector3(1.55, -1.15, 0)]);
  const tieGeo = new THREE.TubeGeometry(tieCurve, 16, 0.15, 10, false); tieGeo.scale(1, 1, 0.45);
  const tie = new THREE.Mesh(tieGeo, new THREE.MeshStandardMaterial({ map: tieTexture(), roughness: 0.6 })); tie.castShadow = true;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), std(TIE_BLUE)); knot.position.set(1.58, 0.5, 0); knot.scale.set(0.8, 1, 1);
  bodyG.add(tie, knot);
  // ---- BRACINHOS (pivô no ombro): manga curtinha + punho + mãozinha com 2 garras ----
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(1.35, -0.2, s * 1.05); bodyG.add(arm);
    arm.add(solid([
      { geo: S(0.2), color: SUIT, p: [0, 0, 0] },
      { geo: C(0.15, 0.28), color: SUIT, p: [0, -0.25, 0] },
      { geo: new THREE.TorusGeometry(0.14, 0.045, 8, 16), color: 0xffffff, p: [0, -0.46, 0], r: [HALF, 0, 0] },
    ]));
    const fore = new THREE.Group(); fore.position.y = -0.5; arm.add(fore);
    fore.add(solid([
      { geo: C(0.11, 0.18), color: SKIN, p: [0, -0.15, 0] },
      { geo: S(0.12), color: SKIN, p: [0.02, -0.33, 0] },
      { geo: CONE(0.045, 0.17, 8), color: CLAW, p: [0.1, -0.44, 0.05], r: [0, 0, HALF + 0.6] },
      { geo: CONE(0.045, 0.17, 8), color: CLAW, p: [0.1, -0.44, -0.05], r: [0, 0, HALF + 0.6] },
    ]));
    arms.push({ arm, fore });
  }
  // ---- CABEÇÃO: crânio largo, focinho redondo, PAPADA, dentões tortos, olhos cansados de juiz com bolsas,
  // sobrancelhas grossas, cabelo grisalho penteado pra trás; óculos de aro fino escorregando no focinho ----
  const head = new THREE.Group(); head.position.set(1.85, 1.15, 0); bodyG.add(head);
  const hp = [
    { geo: S(0.78), color: SKIN, p: [0.05, 0.12, 0], s: [1.2, 0.95, 1.05] },                                 // crânio
    { geo: C(0.46, 1.0, 20), color: SKIN, p: [1.05, -0.12, 0], r: [0, 0, HALF], s: [0.9, 0.95, 1.05] },     // focinho
    { geo: S(0.48), color: SKIN, p: [1.72, -0.1, 0], s: [1, 0.85, 1.0] },                                   // ponta arredondada
    { geo: S(0.55), color: MOUTH, p: [1.05, -0.5, 0], s: [1.5, 0.3, 0.9] },                                 // céu da boca
    { geo: S(0.55), color: BELLY_L, p: [0.1, -0.62, 0], s: [1.25, 0.55, 1.25] },                            // PAPADA
    { geo: S(0.72, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.46), color: HAIR, p: [-0.2, 0.46, 0], s: [1.25, 0.62, 1.08] }, // cabelo
  ];
  for (let i = -2; i <= 2; i++) hp.push({ geo: C(0.13, 0.55), color: i % 2 ? HAIR_D : HAIR, p: [-0.9, 0.5 - Math.abs(i) * 0.1, i * 0.26], r: [0, 0, HALF + 0.35] }); // topete pra trás
  for (const s of [-1, 1]) hp.push(
    { geo: S(0.09), color: SKIN_D, p: [2.08, 0.12, s * 0.2] },                                   // narinas
    { geo: S(0.34), color: SKIN, p: [0.5, 0.3, s * 0.5], s: [1.1, 0.8, 1] },                     // órbita/bolsa
    { geo: S(0.27), color: 0xffffff, p: [0.56, 0.38, s * 0.6] },                                 // olho
    { geo: S(0.12), color: BLACK, p: [0.66, 0.36, s * 0.8] },                                    // pupila
    { geo: S(0.05, 10, 8), color: 0xffffff, p: [0.7, 0.45, s * 0.86] },                           // brilho
    { geo: S(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.3), color: SKIN, p: [0.56, 0.42, s * 0.6], r: [s * 0.2, 0, -0.3] }, // pálpebra caída (cansado)
    { geo: S(0.2), color: 0x4e7232, p: [0.62, 0.12, s * 0.66], s: [1.2, 0.45, 1] },                // bolsa embaixo do olho
    { geo: C(0.09, 0.4, 8), color: HAIR_D, p: [0.6, 0.68, s * 0.58], r: [0, s * 0.3, HALF + 0.15] }, // sobrancelha grossa grisalha
  );
  teethParts(hp, { x0: 0.62, x1: 2.0, step: 0.2, y: -0.46, z: 0.36, r: 0.085, h: 0.32, big: [1, 6] });
  head.add(solid(hp));
  const glasses = makeThinGlasses(0.62); glasses.position.set(1.0, 0.1, 0); glasses.rotation.z = -0.25; head.add(glasses); // escorregados no focinho
  const jaw = new THREE.Group(); jaw.position.set(0.35, -0.5, 0); head.add(jaw);
  const jp = [
    { geo: C(0.36, 1.0, 18), color: SKIN, p: [0.82, -0.08, 0], r: [0, 0, HALF], s: [0.75, 1, 0.95] },
    { geo: S(0.44), color: BELLY_L, p: [0.2, -0.15, 0], s: [1.4, 0.6, 1] },
    { geo: C(0.3, 0.9, 16), color: BELLY_L, p: [0.82, -0.22, 0], r: [0, 0, HALF], s: [0.75, 0.5, 0.9] },
    { geo: S(0.28), color: TONGUE, p: [0.75, 0.12, 0], s: [2.2, 0.3, 1.0] },
  ];
  teethParts(jp, { x0: 0.42, x1: 1.5, step: 0.22, y: 0.14, z: 0.28, r: 0.075, h: 0.27, up: true, big: [0, 4] });
  jaw.add(solid(jp));
  // cauda GROSSA afinando, com espinhos
  const tail = new Tentacle({ length: 4.4, radius: 0.66, tipRadius: 0.07, segments: 10, radial: 16, suckers: false, color: SKIN, under: BELLY, roughness: 0.4 });
  tail.curve = new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()));
  root.add(tail.object);
  const crest = std(SKIN_D, { roughness: 0.4 });
  for (let k = 1; k < 9; k += 1) {
    const sz = 1 - k / 11;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.15 * sz, 0.42 * sz, 8), crest);
    c.position.set(0, tail.segLen * 0.5, -(0.66 * sz) - 0.02); c.rotation.x = -Math.PI / 2; tail.bones[k].add(c);
  }
  return { root, bodyG, head, jaw, arms, legs, tail, glasses };
}

export class DinoTrex {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root); this.root = root;
    this.body = new THREE.Group(); root.add(this.body);
    this.T = makeTrex(); this.body.add(this.T.root);
    // T-Rex esculpido no Meshy: quando carrega, substitui o boneco procedural (que fica de reserva)
    this.mesh = new MeshyBody(this.T.root, 'assets/characters/dino-supremo/trex.glb', {
      height: 4.6, onReady: (m) => { for (const c of this.T.root.children) if (c !== m.group) c.visible = false; },
    });
    // óculos "soltos" da cinemática (saem do rosto, são limpos, voltam e crescem)
    this.bigGlasses = makeGlasses(0.55); this.bigGlasses.visible = false; scene.add(this.bigGlasses);
    this.dust = new Puffs(root, 22, 0xb9a98a, { lit: true, opacity: 0.85 });
    this.dustDark = new Puffs(root, 10, 0x6e604e, { lit: true, opacity: 0.8 });
    this.buttons = new Shards(scene, 8, new THREE.CylinderGeometry(0.09, 0.09, 0.04, 10), std(0x222222));
    this.rings = new Rings(scene, 4, 0xffe0a0);
    this.stompDust = new Puffs(scene, 10, 0xcdbda0, { lit: true, opacity: 0.7 });
    // meteoro do finalizador
    this.meteor = new THREE.Group();
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), std(0x4a3a30, { emissive: 0xff5a1a, emissiveIntensity: 0.6 }));
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), add(0xff7a1a, 0.55));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.0, 10, 1, true), add(0xffb040, 0.5)); flame.position.y = 1.6;
    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4.0, 8, 1, true), add(0xfff0a0, 0.45)); flame2.position.y = 2.2;
    this.meteor.add(core, shell, flame, flame2); this.meteor.visible = false; scene.add(this.meteor);
    this.fire = new Puffs(scene, 12, 0xff8a2a, { opacity: 0.9 });
    this.smoke = new Puffs(scene, 10, 0x4a4a4a, { lit: true, opacity: 0.7 });
    this.rocks = new Shards(scene, 12, new THREE.DodecahedronGeometry(0.16, 0), std(0x6a5a48));
    this.scorch = new THREE.Mesh(new THREE.CircleGeometry(1.2, 28), flat(0x2a1a0a, 0)); this.scorch.rotation.x = -Math.PI / 2; this.scorch.position.y = 0.028; this.scorch.visible = false; scene.add(this.scorch);
    this.k = 0; this.dusted = false; this.dustedOut = true; this.lunge = 0; this.jawOpen = 0; this.boomed = -1; this.stomped = -1; this.scorchT = -1; this.landed = -1;
    this.tmp = new THREE.Vector3();
  }

  tailPose(now, stiff) {
    const P = this.T.tail.curve.points;
    for (let j = 0; j < 5; j++) {
      const sway = stiff ? 0 : Math.sin(now * 1.8 + j * 0.8) * 0.3 * j;
      P[j].set(-1.5 - j * 1.0, stiff ? 2.3 - j * 0.05 : [2.3, 2.25, 2.0, 1.55, 1.1][j], sway);
    }
    this.T.tail.curve.needsUpdate = true;
    this.T.tail.setCurve(this.T.tail.curve, UP_DOWN);
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 42) : clamp01((end - f.t) / 14);
    this.k += (target - this.k) * Math.min(1, dt * 8);
    const k = clamp01(this.k), now = performance.now() / 1000;
    this.hideBase = this.k > 0.5;
    this.root.position.set(f.x, f.y, 0);
    this.root.visible = true;
    const o = f.opponent, d = Math.abs(o.x - f.x);

    // ---- cinemática: óculos saem, são limpos, voltam e crescem; botões estouram ----
    const gOn = on && cine >= 0 && cine > 36;
    this.bigGlasses.visible = gOn;
    if (gOn) {
      const hb = model?.bones?.get('head');
      if (hb) hb.getWorldPosition(this.tmp); else this.tmp.set(f.x, f.y + f.stats.height * 0.9, 0);
      const faceX = this.tmp.x + f.facing * 0.2, faceY = this.tmp.y, handX = this.tmp.x + f.facing * 0.75, handY = this.tmp.y - 0.35;
      let x = faceX, y = faceY, rot = 0, s = 0.55;
      if (cine > 66) { const q = clamp01((75 - cine) / 9); x = faceX + (handX - faceX) * easeOut(q); y = faceY + (handY - faceY) * easeOut(q); }
      else if (cine > 56) { x = handX; y = handY; rot = Math.sin(now * 40) * 0.35; }                 // limpa (esfrega)
      else if (cine > 50) { const q = clamp01((56 - cine) / 6); x = handX + (faceX - handX) * easeOut(q); y = handY + (faceY - handY) * easeOut(q); }
      else { const q = clamp01((50 - cine) / 14); s = 0.55 + easeIn(q) * 2.0; rot = Math.sin(now * 50) * 0.08 * q; } // crescem tremendo
      this.bigGlasses.position.set(x, y, 0.1); this.bigGlasses.rotation.set(0, 0, rot); this.bigGlasses.scale.setScalar(s); // lente de frente pra câmera
    }
    const at = this.tmp.set(0, 1.5, 0);
    if (!this.dusted && this.k > 0.42 && target > this.k) {
      this.dusted = true; this.dustedOut = false;
      this.dust.burst(at, { count: 20, spread: 2.8, up: 1.6, speed: 3.0, size: 1.0, grow: 2.6, life: 1.0 });
      this.dustDark.burst(at, { count: 10, spread: 2.2, up: 1.0, speed: 2.4, size: 0.8, grow: 2.4, life: 0.85 });
      this.buttons.burst(new THREE.Vector3(f.x, f.y + 1.2, 0.3), { count: 6, speed: 3, up: 4, life: 1.2, spreadZ: 3, gravity: 8 });
      this.rings.spawn(f.x, 0.04, { from: 0.4, to: 4.5, life: 0.6, opacity: 0.8 });
    }
    if (!this.dustedOut && this.k < 0.42 && target < this.k) {
      this.dustedOut = true; this.dusted = false;
      this.dust.burst(at, { count: 12, spread: 2.0, up: 1.2, speed: 2.4, size: 0.9, grow: 2.2, life: 0.9 });
    }
    if (!on) { this.dusted = false; this.dustedOut = true; this.boomed = -1; this.stomped = -1; this.landed = -1; }
    this.dust.update(dt); this.dustDark.update(dt); this.buttons.update(dt); this.rings.update(dt); this.stompDust.update(dt);
    this.fire.update(dt); this.smoke.update(dt); this.rocks.update(dt);
    if (this.scorchT >= 0) { this.scorchT += dt; this.scorch.material.opacity = 0.75 * (1 - clamp01(this.scorchT / 1.4)); if (this.scorchT > 1.4) { this.scorchT = -1; this.scorch.visible = false; } }

    const g = clamp01((k - 0.4) / 0.6);
    const vis = g > 0.001;
    this.body.visible = vis;
    if (!vis) { this.root.visible = this.bigGlasses.visible || this.dust.items.some((p) => p.life > 0); return; }
    const pulse = 1 + 0.12 * Math.abs(Math.sin(g * Math.PI * 3)) * (1 - g); // incha em 3 pulsos
    this.body.scale.setScalar(Math.max(0.01, 0.25 + 0.75 * smooth(g)) * pulse);
    // o peso assenta: poeira nos pés quando termina de crescer
    if (g > 0.98 && this.landed < 0 && cine < 0) { this.landed = f.t; this.stompDust.burst(new THREE.Vector3(f.x, 0.15, 0.3), { count: 10, spread: 2.2, up: 1.5, speed: 3, size: 0.5, grow: 2.6, life: 0.55 }); }
    const yaw = f.facing > 0 ? 0 : Math.PI, T = this.T;

    // ---- golpes ----
    let lunge = 0, jaw = 0.15 + Math.sin(now * 1.8) * 0.05, spin = 0, headUp = 0, stiff = false, legLift = 0, bodyDip = 0;
    if (on && cine < 0) {
      for (let h = 0; h < u.hits; h++) {
        const hitF = 12 + h * u.interval;
        if (f.t < hitF - 9 || f.t > hitF + 8) continue;
        const kind = h === 1 ? 'tail' : h === 2 ? 'stomp' : 'bite';
        if (kind === 'bite') {
          const q = clamp01((f.t - (hitF - 9)) / 9);
          const reach = clamp01((d - 3.0) / 2.5) * 2.0;
          lunge = f.t <= hitF ? easeIn(q) * reach : reach * (1 - smooth((f.t - hitF) / 8));
          jaw = f.t < hitF ? 0.2 + q * 0.8 : 0.04;
          bodyDip = f.t <= hitF ? q * 0.5 : 0.5 * (1 - (f.t - hitF) / 8);
        } else if (kind === 'tail') {
          const q = clamp01((f.t - (hitF - 7)) / 14);
          spin = -f.facing * Math.PI * 2 * smooth(q); stiff = q > 0 && q < 1;
        } else {
          const q = clamp01((f.t - (hitF - 9)) / 9);
          legLift = f.t < hitF ? Math.sin(q * Math.PI * 0.5) * 1.1 : 0;
          if (f.t >= hitF && this.stomped !== hitF) {
            this.stomped = hitF;
            const sx = f.x + f.facing * 1.2;
            this.rings.spawn(sx, 0.05, { from: 0.3, to: 3.5, life: 0.45, opacity: 0.9, color: 0xd8b070 });
            this.stompDust.burst(new THREE.Vector3(sx, 0.2, 0.3), { count: 10, spread: 1.6, up: 2.0, speed: 2.8, size: 0.45, grow: 2.6, life: 0.6, z: 0 });
          }
        }
      }
      // finalizador: ruge pro céu e um meteoro cai
      if (f.t >= fin - 16 && f.t <= fin + 20) {
        const q = clamp01((f.t - (fin - 16)) / 8);
        headUp = f.t < fin + 6 ? 0.9 * q : 0.9 * (1 - clamp01((f.t - fin - 6) / 10));
        jaw = f.t < fin + 4 ? 0.2 + q * 0.95 : 0.1;
        const hit = f.ultRes[u.hits] === 'hit';
        const landX = f.t < fin || hit ? o.x : f.x + f.facing * (u.range + 1.5), landY = f.t < fin || hit ? o.y + 0.4 : 0.4;
        const fallOn = f.t >= fin - 10 && f.t < fin;
        this.meteor.visible = fallOn;
        if (fallOn) {
          const r = (f.t - (fin - 10)) / 10, kk = r * r;
          this.meteor.position.set(landX - f.facing * 3.5 * (1 - r), landY + (1 - kk) * 11, 0);
          this.meteor.rotation.set(0, now * 2, -f.facing * 0.35); this.meteor.scale.setScalar(1.1);
        }
        if (f.t >= fin && this.boomed !== fin) {
          this.boomed = fin;
          this.rings.spawn(landX, 0.05, { from: 0.3, to: 5, life: 0.5, opacity: 1, color: 0xffa040 });
          this.rings.spawn(landX, 0.8, { flat: false, from: 0.3, to: 3.5, life: 0.4, opacity: 0.8, z: 0.5, color: 0xffd080 });
          this.fire.burst(new THREE.Vector3(landX, 0.6, 0.2), { count: 12, spread: 1.8, up: 4, speed: 3.6, size: 0.6, grow: 2.2, life: 0.6 });
          this.smoke.burst(new THREE.Vector3(landX, 1.0, 0.2), { count: 10, spread: 1.6, up: 2.6, speed: 1.8, size: 0.7, grow: 2.8, life: 1.1 });
          this.rocks.burst(new THREE.Vector3(landX, 0.4, 0.2), { count: 12, speed: 4, up: 6.5, life: 1.0, size: 1.1 });
          this.scorch.visible = true; this.scorch.position.set(landX, 0.028, 0); this.scorchT = 0;
        }
      } else this.meteor.visible = false;
    } else this.meteor.visible = false;
    this.lunge += (lunge - this.lunge) * Math.min(1, dt * 18);
    this.jawOpen += (jaw - this.jawOpen) * Math.min(1, dt * 22);
    T.root.position.set(this.lunge, 0, 0);
    T.root.rotation.set(0, yaw + spin, 0);
    T.bodyG.position.y = 2.45 - bodyDip + Math.sin(now * 2) * 0.03;
    T.bodyG.rotation.z = -bodyDip * 0.35 + headUp * 0.15;
    T.jaw.rotation.z = -this.jawOpen;
    T.head.rotation.z = -0.1 + this.jawOpen * 0.2 + headUp;
    T.legs[0].rotation.z = legLift; T.legs[1].rotation.z = 0;
    // respiração da pança (gordo ofegante)
    T.bodyG.scale.set(1, 1 + Math.sin(now * 3.1) * 0.012, 1 + Math.sin(now * 3.1) * 0.015);
    // gag: a cada ~3 s tenta ajeitar os óculos com o bracinho e não alcança (os óculos escorregam no focinho)
    const ph = (now % 3.2) / 3.2;
    const tryK = ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) : 0;
    T.arms[1].arm.rotation.set(0, 0, -0.4 - tryK * 2.3); T.arms[1].fore.rotation.z = -0.8 - tryK * 0.6;
    T.arms[0].arm.rotation.set(0, 0, -0.3 + Math.sin(now * 2.4) * 0.2); T.arms[0].fore.rotation.z = -0.9;
    T.glasses.position.set(1.0 + tryK * 0.16, 0.1 - tryK * 0.1, 0); T.glasses.rotation.z = -0.25 - tryK * 0.12; // escorregam mais quando ele tenta
    this.tailPose(now, stiff);
    // corpo Meshy: mergulha no bote/pisão, levanta a cabeça no rugido, respira ofegante
    if (this.mesh.ready) this.mesh.pose({ lean: bodyDip * 0.35 - headUp * 0.4, squash: -bodyDip * 0.08 + (this.jawOpen - 0.2) * 0.1 + Math.sin(now * 3.1) * 0.014, facing: f.facing, turn: spin ? 0 : 0.6 });
  }

  dispose() { this.scene.remove(this.root, this.bigGlasses, this.meteor, this.scorch); this.T.tail.dispose(); }
}
