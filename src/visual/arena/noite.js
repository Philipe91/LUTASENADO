// ARENA 2 — Praça dos Três Poderes à noite (?arena=noite).
// Mesma estrutura da Esplanada (laje, gradil, plateia, panos), mas com Planalto e STF iluminados nas laterais,
// os Candangos, postes com halo, céu estrelado com lua e o Congresso aceso ao fundo.
import * as THREE from 'three';
import { buildEsplanada } from './brasilia.js';
import { makeGlows, congress } from './kit.js';

const GY = -0.6;

// coluna "vela" do Niemeyer (Planalto/STF): folha fina que toca o chão numa ponta
let _col = null;
function columnGeo() {
  if (_col) return _col;
  const h = 5.2, s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.95, 1.6, 0.32, h);
  s.lineTo(-0.32, h);
  s.quadraticCurveTo(-0.95, 1.6, 0, 0);
  _col = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false, curveSegments: 5 });
  _col.translate(0, 0, -0.11);
  return _col;
}

// palácio de colunata (Planalto grande, STF menor): laje de piso, caixa de vidro acesa, cobertura, colunas na frente
function palace(B, x, z, { len = 26, cols = 12, glass = 0xffd9a0, white = 0xf0ead8, haze = 0.2, ramp = false } = {}) {
  const wall = { emissive: 0.3, top: [0x6a76a8, 1.5, 6.5] }; // lavado de holofote embaixo, azul de noite em cima
  B.box(len, 0.5, 8, white, { ...wall, pos: [x, GY + 1.3, z], haze });                 // piso elevado
  B.box(len - 3, 3.6, 5.5, glass, { pos: [x, GY + 3.3, z - 0.6], haze: haze * 0.5, emissive: 0.85, ao: 0 }); // vidro aceso
  for (let i = 0; i < 6; i++) B.box(len - 2.9, 0.08, 5.56, 0x6a5a48, { pos: [x, GY + 1.9 + i * 0.6, z - 0.6], haze, emissive: 0.6, ao: 0 }); // caixilhos
  B.box(len + 1, 0.45, 8.4, white, { ...wall, pos: [x, GY + 5.4, z], haze });           // cobertura
  const g = columnGeo();
  for (let i = 0; i < cols; i++) {
    const cx = x - len / 2 + 0.8 + (i * (len - 1.6)) / (cols - 1);
    B.add(g, white, { ...wall, pos: [cx, GY, z + 4.1], haze, ao: 0 });
  }
  if (ramp) B.box(5, 0.25, 9, white, { ...wall, pos: [x + len * 0.18, GY + 0.75, z + 8], rot: [0.16, 0, 0], haze });
}

function noiteScenery({ root, far, cloth, hz, r, P }) {
  // morros baixos no horizonte + Congresso aceso ao fundo
  for (let i = 0; i < 16; i++) {
    const x = -340 + i * 46 + r() * 20, w = 50 + r() * 50;
    far.add(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), P.hill, { pos: [x, GY, -300 - r() * 30], scale: [w, 6 + r() * 9, 25], haze: 0.82, ao: 0, smooth: true });
  }
  congress(far, { z: -80, haze: P.congressHaze, win: P.win, winEmissive: 1, white: P.white, ...P.congress });
  // Planalto (esquerda) e STF (direita), de frente pra câmera, emoldurando o Congresso
  palace(far, -27, -40, { len: 28, cols: 13, haze: hz(-40) * 0.6 });
  palace(far, 27, -42, { len: 20, cols: 9, haze: hz(-42) * 0.6 });
  // Os Candangos (duas figuras esguias de bronze sobre pedestal)
  far.box(3, 1, 1.4, 0x9a94a0, { pos: [-13, GY + 0.5, -36], haze: 0.3, emissive: 0.2 });
  for (const s of [-1, 1]) {
    far.add(new THREE.CapsuleGeometry(0.22, 2.8, 3, 6), 0x9a7450, { pos: [-13 + s * 0.5, GY + 2.8, -36], rot: [0, 0, s * 0.06], haze: 0.3, ao: 0, emissive: 0.35 });
    far.add(new THREE.SphereGeometry(0.26, 6, 4), 0x9a7450, { pos: [-13 + s * 0.6, GY + 4.5, -36], haze: 0.3, ao: 0, emissive: 0.35 });
  }
  // mastro da Bandeira (iluminado)
  far.add(new THREE.CylinderGeometry(0.18, 0.35, 30, 8), 0xc9c4bc, { pos: [40, GY + 15, -58], haze: hz(-58) * 0.6, emissive: 0.4 });
  cloth.push({ type: 'flag', idx: 0, w: 7, h: 4.9, pos: [40.2, GY + 26.5, -58], amp: 0.6, haze: 0.25, tint: 0xb8b8c8 });
  // postes: haste + luminária
  const lamps = [];
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = side * (9 + i * 1.2), z = -18 - i * 6;
    far.box(0.12, 6, 0.12, 0x3a3a48, { pos: [x, GY + 3, z], haze: hz(z) * 0.5, ao: 0 });
    far.box(0.7, 0.18, 0.4, 0xfff0c8, { pos: [x, GY + 6, z], emissive: 1, haze: 0 });
    lamps.push({ pos: [x, GY + 6, z + 0.3], size: 3.4, color: 0xffb860, k: 0.55 });
  }
  // holofotes lavando o Congresso e os palácios
  const glows = [
    ...lamps,
    { pos: [0, GY + 3, -73], size: 46, stretch: 0.2, color: 0xff9a50, k: 0.18 },
    { pos: [-1.6, GY + 10, -83], size: 9, stretch: 2.2, color: 0xffcf80, k: 0.1 },
    { pos: [1.6, GY + 10, -83], size: 9, stretch: 2.2, color: 0xffcf80, k: 0.1 },
    { pos: [-27, GY + 3.5, -35], size: 30, stretch: 0.3, color: 0xffb060, k: 0.16 },
    { pos: [27, GY + 3.5, -37], size: 22, stretch: 0.3, color: 0xffb060, k: 0.16 },
  ];
  root.add(makeGlows(glows));
  return {};
}

export function buildNoite(scene) {
  return buildEsplanada(scene, {
    zenith: 0x050820, upper: 0x0c1240, mid: 0x1c2260, horizon: 0x3c2c62, below: 0x14142a,
    sunDir: [0, 0.0, -1], sunCol: 0xff8a50, glow: 0.14, sunSize: 0.0001,
    stars: 1.1, moon: [-0.28, 0.17, -1],
    haze: 0x262a52, fog: 0x1e2246,
    cloudLit: 0x5a6aa0, cloudShade: 0x1c2048, cloudRim: 0xb8c4f0, cloudOpacity: 0.55,
    hill: 0x1c2038, win: 0xffd27a, white: 0xe8d8c0, congressHaze: 0.2,
    congress: { wall: { emissive: 0.3, top: [0x5a6496, 3, 18] } },
    grass: { a: '#4a4c5e', b: '#43455a', dry: '#5a5c70' }, lawnTint: 0x8a8ca8,
    floor: '#8e8c98', joint: '#6c6a78', lines: '#ffd23f', accent: '#2a9a5e',
    shirts: [0xd23b3b, 0x2f8f4e, 0xf2c230, 0x2c55a8, 0xf3efe6, 0xe0703a],
    scenery: noiteScenery,
  }, { night: true });
}
