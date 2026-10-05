// ULTIMATE do Capitão Brasa — "Efeito Colateral" (procedural, sem GLB).
// Cinemática: uma SERINGA GIGANTE cai do céu e espeta o braço dele → nuvem VERDE explode → ele incha em 3 pulsos
// e vira um JACARÉ bípede MUSCULOSO de terno preto rasgado, faixa verde-amarela com brasão, cabelo castanho penteado
// de lado, bocarra de dentes tortos e olhos amarelos esbugalhados (referência: references/capitao-brasa/ultimate/jacare_ref.png).
// Modelagem v3 orgânica, acabamento vinil/toy como o Polvão (nada de caixas) — ver makeJacare().
// Golpes: hits pares = MORDIDA (avança, abre a bocarra e fecha no alvo no frame do dano); ímpares = RABADA (gira 360°
// com a cauda esticada). Finalizador curto: morde e faz o "ROLO DA MORTE" (gira em torno do próprio eixo) e bate;
// água do espelho d'água espirra. Contato só quando a lógica confirma (f.ultRes[k] === 'hit').
// Fim: nova nuvem verde e o Capitão volta.
import * as THREE from 'three';
import { Tentacle } from '../fx/Tentacle.js';
import { Puffs, Rings, std, clamp01, smooth, easeIn, easeOut, mergeParts } from '../fx/common.js';
import { MeshyBody } from './meshyBody.js';

// paleta (ARTE.md §2: verde-pântano só no ultimate)
const GREEN = 0x4f8a38, DARK = 0x2f5f2a, BELLY = 0xd9c98c, BELLY_L = 0xe8dba4, SUIT = 0x1b1b21, SUIT_L = 0x2a2a33;
const HAIR = 0x5a3a1e, HAIR_L = 0x8a6440, TIE = 0x1fa34a, YEL = 0xffd400, WHITE = 0xf6f6f2, BLACK = 0x111111;
const EYE = 0xffcf1a, MOUTH = 0x5a1424, TONGUE = 0xd0607a, CLAW = 0xe9dfc2, GOLD = 0xd8a92a, SHOE = 0x141418;
const UP_DOWN = new THREE.Vector3(0, -1, 0);

// ---- modelagem "vinil/toy" (mesmo acabamento do Polvão): só formas lisas — esferas achatadas, cápsulas, torno (Lathe),
// toros — com segmentos suficientes. Cada parte rígida é UMA malha (geometria fundida com cor por vértice, mergeParts):
// ~16 draw calls no bicho inteiro.
const VINYL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.02 });
const solid = (parts, mat = VINYL) => { const m = new THREE.Mesh(mergeParts(parts), mat); m.castShadow = true; return m; };
const S = (r, ...a) => new THREE.SphereGeometry(r, a[0] ?? 24, a[1] ?? 16, ...a.slice(2));
const C = (r, len, rs = 16) => new THREE.CapsuleGeometry(r, len, 6, rs);
const CONE = (r, h, rs = 10) => new THREE.ConeGeometry(r, h, rs);
const lathe = (pts, phiStart = 0, phiLen = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 36, phiStart, phiLen);
const HALF = Math.PI / 2;
// pseudo-aleatório determinístico (dentes tortos iguais a cada build)
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// fileira de dentes TORTOS (cones de tamanhos variados, inclinados) de x0 a x1 nos dois lados (z = ±z)
function teethParts(out, { x0, x1, step, y, z, r = 0.06, h = 0.22, up = false, big = [] }) {
  let i = 0;
  for (let x = x0; x <= x1 + 1e-6; x += step, i++) for (const s of [-1, 1]) {
    const k = big.includes(i) ? 1.7 : 0.75 + rnd() * 0.6;
    out.push({ geo: CONE(r * k, h * k, 8), color: WHITE, p: [x + (rnd() - 0.5) * 0.05, y, s * z], r: [(up ? 0 : Math.PI) + s * (rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5] });
  }
}
// barra rasgada: pontas (cones de 3 lados, achatados) penduradas num círculo de raio r, no plano y, entre os ângulos
function tornHem(out, { r, y, color, n = 8, len = 0.26, from = 0, to = Math.PI * 2, sz = 1, down = true }) {
  for (let i = 0; i < n; i++) {
    const a = from + ((i + 0.5) / n) * (to - from), L = len * (0.7 + rnd() * 0.6);
    out.push({ geo: CONE(0.11 * sz, L, 3), color, p: [Math.sin(a) * r, y - (down ? L * 0.4 : -L * 0.4), Math.cos(a) * r * sz], r: [down ? Math.PI : 0, a, 0], s: [1, 1, 0.4] });
  }
}
// estrela de 5 pontas (brasão da faixa)
function starGeo(R = 0.1, r = 0.045) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = -HALF + (i / 10) * Math.PI * 2, rr = i % 2 ? r : R; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  sh.closePath();
  return new THREE.ShapeGeometry(sh); // indexada, como as outras (mergeParts exige o mesmo tipo)
}
// faixa diagonal: ponto do anel (ângulo t) depois das rotações usadas na faixa (Rz(a) → Rx(b))
const SASH = { R: 0.86, zs: 0.86, a: -0.45, b: -0.55 }; // passa por cima do ombro da câmera e desce ao quadril de trás
function sashPoint(t, rr = SASH.R) {
  const v = new THREE.Vector3(Math.cos(t) * rr, 0, Math.sin(t) * rr * SASH.zs);
  v.applyAxisAngle(new THREE.Vector3(0, 0, 1), SASH.a).applyAxisAngle(new THREE.Vector3(1, 0, 0), SASH.b);
  return v;
}

function makeJacare() {
  seed = 7;
  const root = new THREE.Group(); // +X = frente
  // ---- pernas: coxa GROSSA de calça preta rasgada no joelho, panturrilha verde bojuda, sapato preto estourado
  // pelas garras ----
  const legParts = [];
  for (const s of [-1, 1]) {
    const z = s * 0.5;
    legParts.push(
      { geo: S(0.46), color: SUIT, p: [-0.04, 1.02, z], s: [1.05, 1.32, 0.95] },               // coxa (calça)
      { geo: S(0.31), color: GREEN, p: [0.0, 0.56, z], s: [1.05, 1.25, 1.0] },                 // joelho/panturrilha
      { geo: C(0.24, 0.3), color: GREEN, p: [0.1, 0.4, z], r: [0, 0, 0.12] },                  // canela
      { geo: S(0.3), color: SHOE, p: [0.32, 0.15, z], s: [1.75, 0.5, 1.15] },                  // sapato
      { geo: S(0.2), color: SHOE, p: [-0.02, 0.17, z], s: [1, 0.85, 1.1] },                    // calcanhar
      { geo: S(0.09), color: DARK, p: [-0.12, 0.6, z + s * 0.2], s: [1, 1.4, 0.6] },           // escamas
      { geo: S(0.07), color: DARK, p: [0.02, 0.78, z + s * 0.24], s: [1, 1.3, 0.6] },
    );
    tornHem(legParts, { r: 0.42, y: 0.68, color: SUIT, n: 7, len: 0.24, sz: 0.95 });
    for (let i = -1; i <= 1; i++) { // dedos verdes rompendo o bico do sapato + garras
      legParts.push({ geo: S(0.11), color: GREEN, p: [0.8, 0.13, z + i * 0.16], s: [1.3, 0.8, 1] });
      legParts.push({ geo: CONE(0.06, 0.24, 8), color: CLAW, p: [1.0, 0.11, z + i * 0.16], r: [0, 0, -HALF - 0.15] });
    }
  }
  root.add(solid(legParts));
  // ---- tronco EM PÉ: barriga clara em placas, paletó preto aberto na frente (lapelas, barra rasgada), colarinho,
  // gravata listrada verde-amarela, ombros de armário e a FAIXA presidencial em diagonal com brasão ----
  const torso = new THREE.Group(); torso.position.set(0, 1.3, 0); torso.rotation.z = -0.12; root.add(torso);
  const prof = [[0, 0], [0.5, 0.02], [0.68, 0.3], [0.76, 0.7], [0.74, 1.1], [0.68, 1.45], [0.56, 1.7], [0.34, 1.85], [0, 1.9]];
  const jacketProf = prof.slice(1, 8).map(([r, y]) => [r * 1.08 + 0.03, y]);
  const gap = 0.52; // meia-abertura do paletó na frente (+X = phi π/2)
  const tp = [
    { geo: lathe(prof), color: BELLY, s: [1, 1, 0.86] },
    { geo: lathe(jacketProf, HALF + gap, Math.PI * 2 - gap * 2), color: SUIT, s: [1, 1, 0.86] },
    { geo: S(0.5), color: WHITE, p: [0.42, 1.6, 0], s: [0.55, 0.5, 0.62] },                                   // camisa (peito)
    { geo: new THREE.TorusGeometry(0.36, 0.08, 10, 28), color: WHITE, p: [0.12, 1.82, 0], r: [HALF, 0.3, 0] }, // colarinho
    { geo: S(0.12), color: TIE, p: [0.66, 1.66, 0], s: [0.8, 1, 1] },                                           // nó
    { geo: C(0.1, 0.62, 10), color: TIE, p: [0.76, 1.3, 0], r: [0, 0, -0.1], s: [0.5, 1, 1.1] },               // gravata
    { geo: C(0.33, 0.3), color: GREEN, p: [0.22, 1.9, 0], r: [0, 0, -0.5] },                                    // pescoço
    { geo: new THREE.TorusGeometry(0.3, 0.07, 8, 24), color: DARK, p: [0.3, 1.98, 0], r: [HALF, 0, 0], s: [1.1, 1, 1] }, // papada escamosa
  ];
  for (let i = 0; i < 4; i++) tp.push({ geo: S(0.07), color: YEL, p: [0.805, 1.52 - i * 0.16, 0], r: [0.8, 0, 0], s: [0.3, 1.6, 0.35] }); // listras
  for (let i = 0; i < 5; i++) { // placas da barriga (segmentos horizontais)
    const y = 0.22 + i * 0.27, rr = i < 3 ? 0.76 : 0.72 - (i - 3) * 0.05;
    tp.push({ geo: S(0.34), color: BELLY_L, p: [rr - 0.08, y, 0], s: [0.42, 0.33, 1.05] });
  }
  for (const s of [-1, 1]) {
    tp.push({ geo: S(0.34), color: SUIT_L, p: [0.0, 1.68, s * 0.8], s: [1.1, 0.9, 1] });                              // ombreiras
    tp.push({ geo: C(0.1, 0.8, 10), color: SUIT_L, p: [0.64, 1.3, s * 0.38], r: [s * 0.3, 0, -0.22], s: [0.42, 1, 1] }); // lapelas
    tp.push({ geo: S(0.1), color: DARK, p: [-0.2, 1.7, s * 0.6], s: [1, 1.5, 0.6] });                                   // escamas rompendo
  }
  tornHem(tp, { r: 0.8, y: 0.06, color: SUIT, n: 12, len: 0.3, from: HALF + gap + 0.15, to: HALF + Math.PI * 2 - gap - 0.15, sz: 0.86 });
  for (let i = 0; i < 4; i++) tp.push({ geo: CONE(0.12, 0.3, 8), color: DARK, p: [-0.84 + i * 0.03, 0.5 + i * 0.36, 0], r: [0, 0, HALF + 0.3] }); // cristas das costas
  // faixa (anel inclinado): verde largo + listra amarela por cima, descendo do ombro de trás ao quadril da frente
  const ring = (R, tube) => { const g = new THREE.TorusGeometry(R, tube, 10, 56); g.rotateX(HALF); return g; };
  tp.push({ geo: ring(SASH.R, 0.11), color: TIE, p: [0, 1.0, 0], r: [SASH.b, 0, SASH.a], s: [1, 1, SASH.zs] });
  tp.push({ geo: ring(SASH.R + 0.085, 0.05), color: YEL, p: [0, 1.0, 0], r: [SASH.b, 0, SASH.a], s: [1, 1, SASH.zs] });
  torso.add(solid(tp));
  // brasão dourado onde a faixa cruza o peito (lado da câmera)
  const sp = sashPoint(0.6, SASH.R + 0.1), nrm = sashPoint(0.6, 1).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm), e = new THREE.Euler().setFromQuaternion(q);
  const badge = solid([
    { geo: new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), color: GOLD, r: [HALF, 0, 0] },
    { geo: new THREE.CylinderGeometry(0.15, 0.15, 0.06, 24), color: 0x1d6b3a, r: [HALF, 0, 0] },
    { geo: starGeo(0.11, 0.05), color: GOLD, p: [0, 0, 0.035] },
  ], std(GOLD, { metalness: 0.55, roughness: 0.35, vertexColors: true }));
  badge.position.set(sp.x, 1.0 + sp.y, sp.z); badge.rotation.copy(e); torso.add(badge);
  // ---- braços de armário (pivô no ombro): manga preta rasgada no bíceps, antebraço verde escamoso, punho branco
  // rasgado e PUNHO fechado com garras ----
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(0.02, 1.62, s * 0.84); torso.add(arm);
    const ap = [
      { geo: S(0.3), color: SUIT, p: [0, -0.02, 0], s: [1.05, 1, 1.05] },
      { geo: C(0.27, 0.4), color: SUIT, p: [0, -0.3, 0] },
    ];
    tornHem(ap, { r: 0.27, y: -0.52, color: SUIT, n: 6, len: 0.2 });
    arm.add(solid(ap));
    const fore = new THREE.Group(); fore.position.y = -0.7; arm.add(fore);
    const fp = [
      { geo: S(0.28), color: GREEN, p: [0, -0.1, 0], s: [1.1, 1.05, 1.1] },                                  // bíceps/cotovelo
      { geo: C(0.23, 0.42), color: GREEN, p: [0, -0.36, 0] },
      { geo: new THREE.TorusGeometry(0.2, 0.06, 8, 20), color: WHITE, p: [0, -0.64, 0], r: [HALF, 0, 0] },     // punho da camisa
      { geo: S(0.31), color: GREEN, p: [0.03, -0.9, 0], s: [1.05, 0.9, 1.05] },                               // punho fechado
      { geo: S(0.11), color: GREEN, p: [0.3, -0.82, 0], s: [0.8, 1.2, 0.9] },                                  // polegar
    ];
    for (let i = -1; i <= 1; i++) { fp.push({ geo: S(0.12), color: GREEN, p: [0.22, -0.98, i * 0.17], s: [1.1, 0.9, 1] }); fp.push({ geo: CONE(0.045, 0.16, 8), color: CLAW, p: [0.2, -1.14, i * 0.17], r: [0, 0, Math.PI] }); } // nós dos dedos + garras
    for (let i = 0; i < 3; i++) fp.push({ geo: S(0.08), color: DARK, p: [0.17, -0.2 - i * 0.16, s * 0.06], s: [0.5, 1, 1.3] });  // escamas
    fore.add(solid(fp));
    arms.push({ arm, fore, s });
  }
  // ---- CABEÇÃO: crânio largo, focinho COMPRIDO e largo, OLHOS AMARELOS esbugalhados com pálpebra brava,
  // sobrancelhas em V, cabelo castanho penteado de lado com risca, bocarra de dentes tortos ----
  const head = new THREE.Group(); head.position.set(0.3, 1.95, 0); head.scale.setScalar(1.15); torso.add(head); // CABEÇÃO
  const hp = [
    { geo: S(0.6), color: GREEN, p: [0, 0.14, 0], s: [1.15, 0.86, 1.05] },                                        // crânio
    { geo: C(0.42, 1.15), color: GREEN, p: [1.05, -0.06, 0], r: [0, 0, HALF], s: [1, 0.76, 1.1] },               // focinho
    { geo: S(0.44), color: GREEN, p: [1.72, -0.02, 0], s: [0.9, 0.68, 1.1] },                                   // ponta
    { geo: S(0.5), color: MOUTH, p: [1.05, -0.3, 0], s: [1.5, 0.3, 0.9] },                                      // céu da boca
    { geo: S(0.62, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), color: HAIR, p: [-0.12, 0.3, 0], s: [1.12, 0.78, 1.02] }, // cabelo
    { geo: S(0.42), color: HAIR, p: [0.22, 0.66, -0.06], r: [0.1, 0, 0.15], s: [1.4, 0.46, 1.1] },               // penteado de lado
    { geo: S(0.3), color: HAIR, p: [0.58, 0.62, 0.12], r: [0.2, 0, -0.5], s: [1.25, 0.42, 0.9] },                // franja jogada
    { geo: C(0.02, 0.6, 6), color: HAIR_L, p: [-0.02, 0.73, 0.24], r: [0.3, 0, HALF] },                         // risca
  ];
  for (let i = 0; i < 4; i++) hp.push({ geo: S(0.09), color: DARK, p: [0.85 + i * 0.25, 0.26 - i * 0.02, 0], s: [1.3, 0.6, 0.9] }); // cristas do focinho
  for (const s of [-1, 1]) hp.push(
    { geo: S(0.08), color: DARK, p: [2.05, 0.2, s * 0.16] },                                                  // narinas
    { geo: S(0.31), color: GREEN, p: [0.32, 0.4, s * 0.3], s: [1.2, 0.75, 1] },                                // órbita
    { geo: S(0.27), color: EYE, p: [0.44, 0.5, s * 0.38] },                                                   // olho amarelo
    { geo: S(0.11), color: BLACK, p: [0.56, 0.5, s * 0.58], s: [0.6, 1.4, 0.6] },                               // pupila em fenda
    { geo: S(0.05, 10, 8), color: 0xffffff, p: [0.6, 0.6, s * 0.62] },                                         // brilho
    { geo: S(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.28), color: GREEN, p: [0.44, 0.54, s * 0.38], r: [s * 0.25, 0, -0.55] }, // pálpebra brava
    { geo: C(0.08, 0.4, 8), color: DARK, p: [0.52, 0.74, s * 0.38], r: [0, s * 0.45, HALF + 0.4] },             // sobrancelha em V
  );
  teethParts(hp, { x0: 0.55, x1: 1.9, step: 0.19, y: -0.26, z: 0.37, r: 0.075, h: 0.3, big: [1, 6] });
  head.add(solid(hp));
  // mandíbula articulada
  const jaw = new THREE.Group(); jaw.position.set(0.3, -0.3, 0); head.add(jaw);
  const jp = [
    { geo: C(0.34, 1.15), color: GREEN, p: [0.78, -0.04, 0], r: [0, 0, HALF], s: [1, 0.62, 1.08] },
    { geo: S(0.36), color: BELLY, p: [0.12, -0.1, 0], s: [1.3, 0.7, 1.05] },
    { geo: C(0.28, 1.05), color: BELLY, p: [0.78, -0.17, 0], r: [0, 0, HALF], s: [1, 0.5, 1.0] },
    { geo: S(0.3), color: TONGUE, p: [0.7, 0.12, 0], s: [1.9, 0.26, 0.9] },
  ];
  teethParts(jp, { x0: 0.42, x1: 1.45, step: 0.21, y: 0.12, z: 0.3, r: 0.07, h: 0.27, up: true, big: [0, 4] });
  jaw.add(solid(jp));
  // cauda GROSSA (cadeia de ossos) afinando, com espinhos
  const tail = new Tentacle({ length: 3.8, radius: 0.5, tipRadius: 0.06, segments: 10, radial: 16, suckers: false, color: GREEN, under: BELLY, roughness: 0.38 });
  tail.curve = new THREE.CatmullRomCurve3(Array.from({ length: 5 }, () => new THREE.Vector3()));
  root.add(tail.object);
  const crest = std(DARK, { roughness: 0.4 });
  for (let k = 1; k < 9; k += 1) {
    const sz = 1 - k / 11;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.13 * sz, 0.34 * sz, 8), crest);
    c.position.set(0, tail.segLen * 0.5, -(0.5 * sz) - 0.02); c.rotation.x = -Math.PI / 2; tail.bones[k].add(c);
  }
  root.scale.setScalar(0.92); // topo do cabelo ≈ 3,8 m (frameTop 4.0)
  return { root, torso, head, jaw, arms, tail };
}

function makeSyringe() {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 14), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.4, roughness: 0.1 }));
  glass.position.y = 1.0;
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 12), std(0x5ef08a, { emissive: 0x1f7a3a, emissiveIntensity: 0.4 }));
  liquid.position.y = 0.8;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), std(0x888888)); rod.position.y = 2.1;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), std(0xdddddd)); cap.position.y = 2.6;
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), std(0xdddddd)); flange.position.y = 1.7;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.005, 0.7, 6), std(0xd8d8d8, { metalness: 0.8, roughness: 0.2 })); needle.position.y = -0.05;
  g.add(glass, liquid, rod, cap, flange, needle);
  g.scale.setScalar(1.5);
  g.userData = { liquid, rod, cap };
  return g;
}

export class BrasaJacare {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root); this.root = root;
    this.body = new THREE.Group(); root.add(this.body);
    this.J = makeJacare(); this.body.add(this.J.root);
    // jacaré esculpido no Meshy: quando carrega, substitui o boneco procedural (que fica de reserva)
    this.mesh = new MeshyBody(this.J.root, 'assets/characters/capitao-brasa/jacare.glb', {
      height: 4.15, onReady: (m) => { for (const c of this.J.root.children) if (c !== m.group) c.visible = false; },
    });
    this.syringe = makeSyringe(); this.syringe.visible = false; scene.add(this.syringe);
    this.gas = new Puffs(root, 24, 0x6ee05a, { opacity: 0.8 });
    this.gasDark = new Puffs(root, 10, 0x2e7d32, { opacity: 0.75 });
    this.water = new Puffs(scene, 18, 0xcfefff, { lit: true, opacity: 0.85 });
    this.rings = new Rings(scene, 4, 0x8ff07a);
    this.stomp = new Puffs(scene, 10, 0xcdbda0, { lit: true, opacity: 0.7 });
    this.k = 0; this.gassed = false; this.gassedOut = true; this.lunge = 0; this.jawOpen = 0; this.lastSplash = -1; this.lastStomp = -1;
    this.pose = { open: 0, tuck: 0 }; // braços: 0 = guarda de boxe · open = abertos (mordida/rugido) · tuck = colados (rolo)
    this.tmp = new THREE.Vector3();
  }

  tailPose(now, stiff) {
    const P = this.J.tail.curve.points;
    for (let j = 0; j < 5; j++) {
      const sway = stiff ? 0 : Math.sin(now * 2.2 + j * 0.9) * 0.22 * j;
      const y = stiff ? 1.3 - j * 0.06 : [1.3, 1.05, 0.62, 0.38, 0.3][j];
      P[j].set(-0.5 - j * 0.85, y, sway);
    }
    this.J.tail.curve.needsUpdate = true;
    this.J.tail.setCurve(this.J.tail.curve, UP_DOWN);
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

    // ---- seringa (só na cinemática, antes da nuvem) ----
    const sOn = on && cine >= 0 && cine > 38;
    this.syringe.visible = sOn;
    if (sOn) {
      const armX = f.x - f.facing * 0.1, armY = f.y + f.stats.height * 0.62;
      const fall = clamp01((75 - cine) / 14);              // 14 frames caindo
      const stuck = cine <= 61;
      const out = clamp01((46 - cine) / 8);                 // sai e some
      const y = stuck ? armY + 0.05 : armY + (1 - easeIn(fall)) * 7.5;
      this.syringe.position.set(armX + f.facing * 0.55 * (1 - out * 0.3), y + out * 3, 0.35);
      this.syringe.rotation.z = f.facing * 0.5 + (stuck ? Math.sin(now * 60) * 0.03 : 0);
      this.syringe.scale.setScalar(1.5 * (1 - out));
      const inj = stuck ? clamp01((61 - cine) / 12) : 0;   // êmbolo desce, líquido some
      this.syringe.userData.liquid.scale.y = 1 - inj * 0.95; this.syringe.userData.liquid.position.y = 0.8 - inj * 0.45;
      this.syringe.userData.rod.position.y = 2.1 - inj * 0.9; this.syringe.userData.cap.position.y = 2.6 - inj * 0.9;
    }
    // ---- nuvem verde na virada (ida e volta) ----
    const at = this.tmp.set(0, 1.3, 0);
    if (!this.gassed && this.k > 0.42 && target > this.k) {
      this.gassed = true; this.gassedOut = false;
      this.gas.burst(at, { count: 20, spread: 2.4, up: 1.8, speed: 2.8, size: 0.9, grow: 2.6, life: 0.95 });
      this.gasDark.burst(at, { count: 10, spread: 2.0, up: 1.2, speed: 2.2, size: 0.8, grow: 2.4, life: 0.8 });
      this.rings.spawn(f.x, 0.04, { from: 0.4, to: 4, life: 0.6, opacity: 0.8 });
    }
    if (!this.gassedOut && this.k < 0.42 && target < this.k) {
      this.gassedOut = true; this.gassed = false;
      this.gas.burst(at, { count: 12, spread: 2.0, up: 1.2, speed: 2.2, size: 0.8, grow: 2.2, life: 0.9 });
    }
    if (!on) { this.gassed = false; this.gassedOut = true; this.lastSplash = -1; this.lastStomp = -1; }
    this.gas.update(dt); this.gasDark.update(dt); this.water.update(dt); this.rings.update(dt); this.stomp.update(dt);

    // só aparece quando a nuvem já cobre a troca (k > 0.4); cresce em 3 pulsos cartunescos
    const g = clamp01((k - 0.4) / 0.6);
    const vis = g > 0.001;
    this.body.visible = vis;
    if (!vis) { this.root.visible = this.syringe.visible || this.gas.items.some((p) => p.life > 0); return; }
    const pulse = 1 + 0.16 * Math.abs(Math.sin(g * Math.PI * 3)) * (1 - g);
    this.body.scale.setScalar(Math.max(0.01, 0.25 + 0.75 * smooth(g)) * pulse);
    // pisão no chão ao terminar de crescer (peso)
    if (g > 0.98 && this.lastStomp < 0 && cine < 0) { this.lastStomp = f.t; this.stomp.burst(new THREE.Vector3(f.x, 0.15, 0.3), { count: 8, spread: 1.8, up: 1.4, speed: 2.6, size: 0.4, grow: 2.4, life: 0.5 }); }
    const yaw = f.facing > 0 ? 0 : Math.PI;
    const o = f.opponent, d = Math.abs(o.x - f.x);
    const J = this.J;

    // ---- golpes ----
    let lunge = 0, jaw = 0.16 + Math.sin(now * 2) * 0.05, spin = 0, roll = 0, lean = -0.12, lift = 0, stiff = false, open = 0, tuck = 0;
    if (on && cine < 0) {
      for (let h = 0; h < u.hits; h++) {
        const hitF = 12 + h * u.interval;
        if (f.t < hitF - 8 || f.t > hitF + 7) continue;
        if (h % 2 === 0) { // MORDIDA: braços abrem, corpo mergulha
          const q = clamp01((f.t - (hitF - 8)) / 8);
          const reach = clamp01((d - 2.2) / 2.5) * 2.2;
          lunge = f.t <= hitF ? easeIn(q) * reach : reach * (1 - smooth((f.t - hitF) / 7));
          jaw = f.t < hitF ? 0.2 + q * 0.8 : 0.04;
          lean = -0.12 - 0.5 * (f.t <= hitF ? q : 1 - (f.t - hitF) / 7);
          open = f.t <= hitF ? q : 1 - (f.t - hitF) / 7;
        } else { // RABADA: gira 360° com a cauda dura, braços abertos
          const q = clamp01((f.t - (hitF - 6)) / 12);
          spin = -f.facing * Math.PI * 2 * smooth(q); stiff = q > 0 && q < 1; lean = -0.05; open = Math.sin(q * Math.PI);
        }
      }
      // finalizador: morde e faz o rolo da morte
      if (f.t >= fin - 10 && f.t <= fin + 18) {
        const q = clamp01((f.t - (fin - 10)) / 10);
        const reach = clamp01((d - 2.2) / 2.5) * 2.2;
        lunge = f.t <= fin ? easeIn(q) * reach : reach;
        jaw = f.t < fin ? 0.2 + q * 0.95 : 0.03;
        lean = -0.12 - 0.6 * q;
        open = f.t <= fin ? q : 0;
        if (f.t > fin) {
          const r = clamp01((f.t - fin) / 12);
          roll = Math.PI * 2 * smooth(r); lift = Math.sin(r * Math.PI) * 0.9; tuck = Math.sin(r * Math.PI);
          if (f.t >= fin + 12 && this.lastSplash !== fin) {
            this.lastSplash = fin;
            const sx = f.ultRes[u.hits] === 'hit' ? o.x : f.x + f.facing * 2.2;
            this.water.burst(new THREE.Vector3(sx, 0.2, 0.3), { count: 16, spread: 1.6, up: 4.5, speed: 2.5, size: 0.35, grow: 2.2, life: 0.8, gravity: 9 });
            this.rings.spawn(sx, 0.05, { from: 0.3, to: 4.5, life: 0.5, opacity: 0.9, color: 0xbfe9ff });
          }
        }
        if (f.t > fin + 12) lunge = reach * (1 - smooth((f.t - fin - 12) / 6));
      }
    }
    this.lunge += (lunge - this.lunge) * Math.min(1, dt * 18);
    this.jawOpen += (jaw - this.jawOpen) * Math.min(1, dt * 22);
    this.pose.open += (open - this.pose.open) * Math.min(1, dt * 16);
    this.pose.tuck += (tuck - this.pose.tuck) * Math.min(1, dt * 16);
    J.root.position.set(this.lunge * 0.9, lift, 0);
    J.root.rotation.set(0, 0, 0); J.root.rotation.y = yaw + spin; J.root.rotateX(roll);
    J.torso.rotation.z = lean + Math.sin(now * 2.2) * 0.02;
    J.jaw.rotation.z = -this.jawOpen;
    J.head.rotation.z = -0.08 + this.jawOpen * 0.28; // cabeça levanta ao abrir a boca
    // braços: guarda de boxe pulsando (punhos na altura do queixo) → abertos em leque na mordida/rabada → colados no rolo
    const { open: op, tuck: tk } = this.pose;
    for (const { arm, fore, s } of J.arms) {
      const bob = Math.sin(now * 2.6 + s) * 0.08;
      const guardZ = 0.12 + bob, guardX = -s * 0.38, foreZ = 0.3; // braços caídos e abertos, punhos cerrados (ref.)
      const openZ = 0.35, openX = -s * 1.4, openFore = 0.5;
      const tuckZ = 0.6, tuckX = s * 0.1, tuckFore = 1.9;
      const az = guardZ * (1 - op) * (1 - tk) + openZ * op * (1 - tk) + tuckZ * tk;
      const ax = guardX * (1 - op) * (1 - tk) + openX * op * (1 - tk) + tuckX * tk;
      const fz = foreZ * (1 - op) * (1 - tk) + openFore * op * (1 - tk) + tuckFore * tk;
      arm.rotation.set(ax, 0, az); fore.rotation.set(0, 0, fz);
    }
    this.tailPose(now, stiff);
    // corpo Meshy: inclina no bote, estica ao abrir a bocarra, amassa no fechamento, respira parado
    if (this.mesh.ready) this.mesh.pose({ lean: -(J.torso.rotation.z + 0.12) * 0.7, squash: (this.jawOpen - 0.2) * 0.12 + Math.sin(now * 2.6) * 0.012 - tk * 0.1, facing: f.facing, turn: spin || roll ? 0 : 0.5 });
  }

  dispose() { this.scene.remove(this.root, this.syringe); this.J.tail.dispose(); }
}
