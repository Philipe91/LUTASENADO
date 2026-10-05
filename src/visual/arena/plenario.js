// ARENA 3 — PLENÁRIO da Câmara por dentro (?arena=plenario), caricatura colorida.
// A luta acontece no "poço" (piso de taco em frente à Mesa). De trás pra frente:
//   cúpula côncava de concreto com anéis de luz → parede de madeira com a galeria do público → PAINEL ELETRÔNICO
//   (placar SIM/NÃO/ABSTENÇÃO, combo, "VOTAÇÃO: NOCAUTE", reage a golpes) e dois painéis de nomes → Mesa Diretora
//   elevada com bandeiras e tribuna → deputados em pé no poço; nas laterais o LEQUE de bancadas em degraus de carpete
//   verde, mesas de madeira, cadeiras azuis e deputados (plaquinhas SIM/NÃO, celular), galerias no alto.
// Custo: ~9 draw calls de cenário (1 malha assada + 2 pisos + 2 plateias + painel + panos + halos) e ~20k tris.
// Slots opcionais: public/assets/arena/plenario_backdrop.webp (fundo pintado: some a casca do fundo) e
// public/assets/arena/crowd_atlas.webp (galeria). Sem eles fica tudo na geometria 3D.
import * as THREE from 'three';
import { Baker, makeCloth, makeCrowd, crowdSheet, CROWD_ATLAS_URL, makeBackdrop, makeGlows, clothAtlas, FLAG_DRAW, canvasTex, rng, lin } from './kit.js';
import { exists } from '../../platform/assets.js';
import { quality } from '../../platform/quality.js';

const FONT = "'Bangers', 'Arial Black', Impact, sans-serif";
const UIF = "'Inter', 'Arial', sans-serif";
const BACKDROP = 'assets/arena/plenario_backdrop.webp';

// paleta (caricatura: saturada, madeira quente, carpete verde, cadeiras azuis)
const C = {
  carpet: 0x2f8a4e, carpetDark: 0x236b3c, rail: 0x3a6a78, wood: 0x9a5a30, woodDark: 0x6e3a1e, woodLight: 0xc88a52,
  chair: 0x2a5cc0, concrete: 0xd9d0c2, ceilLight: 0xfff1cc, brass: 0xe0b040, panelFrame: 0x15151c, glass: 0x9ec8d8,
};
const HELD = [[-7.2, 2.25, -12.1], [7.4, 2.3, -12.2]]; // faixas erguidas por deputados no poço
const FAN = { cx: 0, cz: 6, r0: 16, step: 1.7, h: 0.42, tiers: 7, a0: 0.56, a1: 1.45 }; // leque: centro, raio, degrau
const WALL_R = 29, BACK_Z = -18.6, GAL = 8.3, TOP = 11.5; // parede curva, parede do fundo, galeria do fundo, início da cúpula
// painel principal (topo do canvas) e os 2 de nomes: [x, y, z, largura, altura, giro]
const PANELS = { main: [0, 4.55, BACK_Z + 0.42, 8.8, 3.3, 0], left: [-8.2, 4.1, BACK_Z + 0.9, 4.6, 2.3, 0.28], right: [8.2, 4.1, BACK_Z + 0.9, 4.6, 2.3, -0.28] };
function panelFrames(B, haze) {
  for (const k of ['main', 'left', 'right']) {
    const [x, y, z, w, h, ry] = PANELS[k];
    B.box(w + 0.6, h + 0.6, 0.3, C.panelFrame, { pos: [x, y, z - 0.18], rot: [0, ry, 0], haze, ao: 0 });
  }
  const [, y, z, , h] = PANELS.main;
  B.box(9.6, 0.25, 0.4, C.brass, { pos: [0, y + h / 2 + 0.42, z - 0.1], haze, ao: 0, emissive: 0.4 });
}

// setor de coroa circular (ângulo φ a partir de -z rumo a +x), extrudado para cima de y0 até y1
function sector(r0, r1, a0, a1, y0, y1, seg = 24) {
  const s = new THREE.Shape();
  const P = (r, a) => [r * Math.sin(a), r * Math.cos(a)];
  s.moveTo(...P(r1, a0));
  for (let i = 1; i <= seg; i++) s.lineTo(...P(r1, a0 + ((a1 - a0) * i) / seg));
  for (let i = seg; i >= 0; i--) s.lineTo(...P(r0, a0 + ((a1 - a0) * i) / seg));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); // forma XY → chão XZ (y da forma vira -z), extrusão vira +y
  g.translate(FAN.cx, y0, FAN.cz);
  return g;
}
const polar = (r, a) => [FAN.cx + r * Math.sin(a), FAN.cz - r * Math.cos(a)];

// ---------- texturas ----------
// piso de taco do poço + linhas de luta (mesmas marcas da laje da Esplanada: faixa central, largadas, selo)
function parquetTex({ W, D, lite }) {
  const px = lite ? 1024 : 2048, py = Math.round((px * D) / W / 4) * 4;
  return canvasTex(px, py, (g) => {
    const r = rng(21);
    const sx = px / W, sz = py / D;
    g.fillStyle = '#c99a68'; g.fillRect(0, 0, px, py);
    const pw = 0.42; // largura da tábua (em z)
    for (let z = 0; z < D; z += pw) {
      let x = -r() * 2;
      while (x < W) {
        const len = 1.6 + r() * 2.2, k = r();
        const col = k < 0.33 ? '#bf8e5e' : k < 0.66 ? '#d3a574' : '#c69766';
        g.fillStyle = col; g.fillRect(x * sx, z * sz, len * sx, pw * sz);
        // veio da madeira
        g.globalAlpha = 0.12; g.fillStyle = '#7a4a24';
        for (let v = 0; v < 3; v++) g.fillRect(x * sx, (z + pw * (0.2 + r() * 0.6)) * sz, len * sx, 1.5);
        g.globalAlpha = 1;
        g.fillStyle = '#6e4222'; g.fillRect(x * sx, z * sz, 2, pw * sz); // emenda
        x += len;
      }
      g.fillStyle = '#7a4a26'; g.fillRect(0, z * sz, px, 2);
    }
    // verniz: brilho suave no meio
    const sh = g.createRadialGradient(px / 2, py * 0.5, 0, px / 2, py * 0.5, px * 0.45);
    sh.addColorStop(0, 'rgba(255,236,200,0.16)'); sh.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = sh; g.fillRect(0, 0, px, py);
    // tapete verde (passadeira) com borda dourada atravessando o poço atrás dos lutadores
    const zc = 0.5 * py, band = 1.1 * sz;
    g.globalAlpha = 0.9;
    g.fillStyle = '#e8b830'; g.fillRect(0, zc - band - 8, px, 10); g.fillRect(0, zc + band - 2, px, 10);
    g.fillStyle = '#1f7a44'; g.fillRect(0, zc - band - 22, px, 9); g.fillRect(0, zc + band + 12, px, 9);
    g.fillStyle = '#e8b830';
    for (let z = zc - band; z < zc + band; z += 26) g.fillRect(px / 2 - 5, z, 10, 14);
    for (const side of [-1, 1]) {
      const x = px / 2 + side * 2.6 * sx;
      g.fillRect(x - 5, zc - band * 0.55, 10, band * 1.1);
      g.fillRect(x - 24, zc - 5, 48, 10);
    }
    // selo no centro (estrela de 5 pontas dentro do círculo)
    g.globalAlpha = 0.35; g.strokeStyle = '#1f7a44'; g.lineWidth = 9;
    g.beginPath(); g.arc(px / 2, zc, band * 0.92, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e8b830'; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = (i % 2 ? 0.3 : 0.7) * band; g.lineTo(px / 2 + Math.cos(a) * rr * 1.6, zc + Math.sin(a) * rr); }
    g.closePath(); g.fill();
    g.globalAlpha = 1;
  });
}

// carpete verde do plenário (repete): fibra + losangos discretos
function carpetTex() {
  return canvasTex(256, 256, (g) => {
    const r = rng(33);
    g.fillStyle = '#2f8a4e'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = r() < 0.5 ? '#2a7d46' : '#36955a';
      g.globalAlpha = 0.5; g.fillRect(r() * 256, r() * 256, 1.5, 1.5);
    }
    g.globalAlpha = 0.18; g.strokeStyle = '#9ad08a'; g.lineWidth = 2;
    for (const [x, y] of [[64, 64], [192, 192], [64, 192], [192, 64]]) {
      g.beginPath(); g.moveTo(x, y - 18); g.lineTo(x + 18, y); g.lineTo(x, y + 18); g.lineTo(x - 18, y); g.closePath(); g.stroke();
    }
    g.globalAlpha = 1;
  }, { repeat: [1, 1] });
}

// ---------- deputados: folha de sprites própria (6 poses × 3 tipos), terno cinza-claro tingido por instância ----------
// poses: 0 braços baixos · 1 celular (selfie) · 2 plaquinha SIM · 3 plaquinha NÃO · 4 acenando · 5 comemorando
// tipos: 0 homem de gravata vermelha · 1 mulher de blazer · 2 senhor grisalho de gravata azul
function deputyAtlas() {
  const CW = 128, CH = 256;
  return canvasTex(CW * 6, CH * 3, (g) => {
    g.clearRect(0, 0, CW * 6, CH * 3);
    for (let v = 0; v < 3; v++) for (let p = 0; p < 6; p++) {
      g.save(); g.translate(p * CW, v * CH); drawDeputy(g, p, v); g.restore();
    }
  });
}
function drawDeputy(g, pose, v) {
  const skin = ['#f2c49c', '#e7b088', '#a8693e'][v], hair = ['#3a2416', '#7a3a1c', '#d8c8a8'][v];
  const suit = g.createLinearGradient(0, 86, 0, 256);
  suit.addColorStop(0, '#ececec'); suit.addColorStop(0.5, '#cfcfcf'); suit.addColorStop(1, '#8e8e8e');
  const ink = '#1c1414';
  g.lineJoin = 'round'; g.lineCap = 'round';
  // pernas + sapatos
  g.fillStyle = suit; g.strokeStyle = ink; g.lineWidth = 4;
  if (v === 1) { g.fillStyle = '#e6e6e6'; g.beginPath(); g.moveTo(38, 176); g.lineTo(90, 176); g.lineTo(94, 214); g.lineTo(34, 214); g.closePath(); g.fill(); g.stroke(); g.fillStyle = skin; g.fillRect(44, 212, 14, 36); g.fillRect(70, 212, 14, 36); }
  else { g.beginPath(); g.rect(41, 172, 20, 78); g.rect(67, 172, 20, 78); g.fill(); g.stroke(); }
  g.fillStyle = '#2a1810'; g.beginPath(); g.ellipse(50, 250, 14, 6, 0, 0, Math.PI * 2); g.ellipse(80, 250, 14, 6, 0, 0, Math.PI * 2); g.fill();
  // braços (atrás do tronco quando baixos)
  const arm = (pts, hand = true) => {
    g.strokeStyle = ink; g.lineWidth = 19; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke();
    g.strokeStyle = '#d8d8d8'; g.lineWidth = 13; g.stroke();
    if (hand) { const n = pts.length; g.fillStyle = skin; g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(pts[n - 2], pts[n - 1], 7.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
  };
  const L = { down: [36, 102, 28, 140, 30, 172], up: [36, 102, 22, 66, 26, 34], wave: [36, 102, 18, 70, 14, 34] };
  const R = { down: [92, 102, 100, 140, 98, 172], up: [92, 102, 106, 66, 102, 34], wave: [92, 102, 110, 70, 114, 34], phone: [92, 102, 112, 84, 100, 56] };
  const arms = [[L.down, R.down], [L.down, R.phone], [L.up, R.up], [L.up, R.up], [L.down, R.wave], [L.wave, R.wave]][pose];
  // tronco (paletó)
  g.fillStyle = suit; g.strokeStyle = ink; g.lineWidth = 4;
  g.beginPath(); g.moveTo(30, 100); g.quadraticCurveTo(64, 84, 98, 100); g.lineTo(92, 182); g.lineTo(36, 182); g.closePath(); g.fill(); g.stroke();
  // camisa + gravata (cores saturadas não são tingidas)
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(52, 92); g.lineTo(76, 92); g.lineTo(64, 134); g.closePath(); g.fill();
  if (v === 1) { g.fillStyle = '#e8a020'; g.beginPath(); g.arc(78, 112, 5, 0, Math.PI * 2); g.fill(); }
  else { g.fillStyle = v === 0 ? '#d42030' : '#2050c8'; g.beginPath(); g.moveTo(61, 96); g.lineTo(67, 96); g.lineTo(70, 128); g.lineTo(64, 136); g.lineTo(58, 128); g.closePath(); g.fill(); }
  g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(50, 92); g.lineTo(64, 136); g.lineTo(78, 92); g.stroke(); // lapela
  arms.forEach((a) => arm(a));
  // cabeça
  g.fillStyle = skin; g.strokeStyle = ink; g.lineWidth = 4;
  if (v === 1) { g.fillStyle = hair; g.beginPath(); g.ellipse(64, 66, 25, 30, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = skin; }
  g.beginPath(); g.arc(64, 64, 20, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = hair;
  if (v === 1) { g.beginPath(); g.arc(64, 58, 21, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
  else if (v === 2) { g.beginPath(); g.arc(46, 58, 7, 0, Math.PI * 2); g.arc(82, 58, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = skin; }
  else { g.beginPath(); g.arc(64, 60, 21, Math.PI * 1.08, Math.PI * 1.92); g.lineTo(64, 50); g.fill(); }
  g.fillStyle = ink; g.beginPath(); g.arc(57, 64, 2.6, 0, Math.PI * 2); g.arc(71, 64, 2.6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink; g.lineWidth = 2.5; g.beginPath(); g.arc(64, 70, 7, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  if (v === 2) { g.strokeStyle = hair; g.lineWidth = 5; g.beginPath(); g.moveTo(56, 76); g.quadraticCurveTo(64, 72, 72, 76); g.stroke(); } // bigode
  // objetos
  if (pose === 1) { // celular
    g.fillStyle = '#16161c'; g.fillRect(88, 26, 20, 32); g.fillStyle = '#5ad0ff'; g.fillRect(91, 29, 14, 24);
    g.fillStyle = '#ffffff'; g.fillRect(94, 33, 8, 3);
  }
  if (pose === 2 || pose === 3) { // plaquinha
    const sim = pose === 2;
    g.fillStyle = '#6a4a2a'; g.fillRect(61, 34, 6, 22);
    g.fillStyle = sim ? '#12a04a' : '#d42828'; g.strokeStyle = ink; g.lineWidth = 4;
    g.beginPath(); g.rect(10, 2, 108, 38); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.font = `34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(sim ? 'SIM' : 'NÃO', 64, 23);
  }
}

// ---------- painel eletrônico: canvas redesenhado só quando o conteúdo muda (≤ 10 vezes/s) ----------
const NAMES = [
  'ZÉ DA EMENDA', 'TIA DO ZAP', 'CORONEL PIX', 'JUCA CENTRÃO', 'LEILA LIVE', 'NONATO NADA', 'DR. RECESSO', 'PASTOR WI-FI',
  'BIA BANCADA', 'TONHO TRATOR', 'KIKO KOMBO', 'MARGÔ MESÁRIA', 'VAL VAI-VOLTA', 'GERSON GAVETA', 'DUDA DESTAQUE', 'RUI RECURSO',
  'NENÊ NOMINAL', 'QUITÉRIA QUÓRUM', 'BETO BOLSÃO', 'SUELI SESSÃO', 'LULU LIDERANÇA', 'TICO TRIBUNA', 'ZEZÉ ZAPZAP', 'MAURO MOÇÃO',
];
const PARTIES = ['PKB', 'PVZ', 'PDT?', 'PQP', 'PFF', 'PSS', 'PZM', 'PRK'];
const TICKER = ['ORDEM DO DIA: PANCADARIA', 'SESSÃO DELIBERATIVA EXTRAORDINÁRIA', 'PEDIDO DE VISTA NEGADO', 'QUESTÃO DE ORDEM: SOCO OU CHUTE?'];

function makePanel({ lite }) {
  const S = lite ? 0.5 : 1, W = 1024, H = 640, MAIN = 384;
  const st = { mode: 'idle', sim: 0, nao: 0, abs: 513, t: 0, p1: '', p2: '', combo: 0, comboWho: 0, ult: '', blink: 0, tick: 0, msg: 0, votes: NAMES.map(() => 2) };
  const tex = canvasTex(W * S, H * S, (g) => drawPanel(g, st, S), { mips: false });
  tex.minFilter = THREE.LinearFilter;
  // geometria: painel principal (topo do canvas) + 2 painéis de nomes (metades de baixo), 1 malha só
  const geos = [];
  const quad = (w, h, u0, v0, u1, v1, pos, ry = 0) => {
    const q = new THREE.PlaneGeometry(w, h);
    const uv = q.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    q.rotateY(ry); q.translate(...pos); q.deleteAttribute('normal');
    geos.push(q);
  };
  const vm = 1 - MAIN / H; // v (de baixo) onde começa o painel principal
  const pq = (k, u0, v0, u1, v1) => { const [x, y, z, w, h, ry] = PANELS[k]; quad(w, h, u0, v0, u1, v1, [x, y, z], ry); };
  pq('main', 0, vm, 1, 1);
  pq('left', 0, 0, 0.5, vm);
  pq('right', 0.5, 0, 1, vm);
  const geo = new THREE.BufferGeometry();
  // junta à mão (só posição + uv)
  const n = geos.reduce((a, q) => a + q.index.count, 0);
  const pos = new Float32Array(n * 3), uvs = new Float32Array(n * 2);
  let o = 0;
  for (const q of geos) {
    const P = q.attributes.position, U = q.attributes.uv;
    for (const i of q.index.array) { pos.set([P.getX(i), P.getY(i), P.getZ(i)], o * 3); uvs.set([U.getX(i), U.getY(i)], o * 2); o++; }
    q.dispose();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false });
  const BASE = 1.15; // um pouco acima de 1: o painel "acende" (pega bloom de leve)
  mat.color.setScalar(BASE);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;

  let acc = 1, key = '', flash = 0, modeT = 0, tickAcc = 0;
  const r = rng(77);
  return {
    mesh,
    kick(v) { if (v >= 0.75) flash = 1; },
    update(dt, time, energy, match) {
      flash = Math.max(0, flash - dt * 0.9);
      // estado vindo da luta
      let mode = 'idle';
      if (match) {
        const [a, b] = match.fighters;
        const ko = match.phase === 'ko' || match.phase === 'roundEnd' || a.hp <= 0 || b.hp <= 0;
        const ultF = match.fighters.find((f) => f.state === 'ultimate');
        mode = ko ? 'ko' : ultF ? 'ult' : 'vote';
        if (ultF) st.ult = (ultF.data.ultimate?.name || 'ULTIMATE').toUpperCase();
        st.p1 = a.data.name.toUpperCase(); st.p2 = b.data.name.toUpperCase();
        st.sim = Math.round(256 * (1 - Math.max(0, b.hp) / b.maxHp));
        st.nao = Math.round(256 * (1 - Math.max(0, a.hp) / a.maxHp));
        st.abs = 513 - st.sim - st.nao;
        st.t = Math.max(0, Math.ceil(match.timer / 60));
        const c1 = b.comboTaken >= 2 ? b.comboTaken : 0, c2 = a.comboTaken >= 2 ? a.comboTaken : 0;
        st.combo = Math.max(c1, c2); st.comboWho = c1 >= c2 ? 1 : 2;
      }
      if (mode !== st.mode) { st.mode = mode; modeT = 0; if (mode === 'ko' || mode === 'ult') flash = 1; }
      modeT += dt;
      // pisca-pisca do KO/ultimate (no canvas: 4 Hz) e luzinhas dos nomes trocando (mais rápido com a plateia agitada)
      st.blink = mode === 'ko' || mode === 'ult' ? Math.floor(modeT * 4) % 2 : 0;
      tickAcc += dt * (0.6 + energy * 5);
      if (tickAcc >= 1) {
        tickAcc = 0; st.tick++;
        const pSim = (st.sim + 40) / (st.sim + st.nao + 80);
        for (let i = 0; i < 3; i++) { const k = Math.floor(r() * NAMES.length); const x = r(); st.votes[k] = x < 0.12 ? 2 : x < 0.12 + 0.88 * pSim ? 0 : 1; }
      }
      st.msg = Math.floor(time / 4) % TICKER.length;
      const k2 = `${st.mode}|${st.sim}|${st.nao}|${st.t}|${st.combo}|${st.comboWho}|${st.blink}|${st.tick}|${st.msg}|${st.p1}|${st.ult}`;
      acc += dt;
      if (k2 !== key && acc >= 0.1) { key = k2; acc = 0; tex.userData.redraw(); }
      // brilho do material: clarão no KO/ultimate (passa do limiar do bloom)
      const pulse = mode === 'ko' || mode === 'ult' ? 0.25 + 0.25 * Math.sin(time * 18) : 0;
      mat.color.setScalar(BASE + flash * 1.4 + pulse + energy * 0.15);
    },
  };
}

function drawPanel(g, st, S) {
  g.setTransform(S, 0, 0, S, 0, 0);
  const W = 1024, MAIN = 384;
  const txt = (s, x, y, size, col, font = FONT, align = 'center', maxW) => {
    g.font = `${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y, maxW);
  };
  // ---- principal ----
  const flashBg = st.mode === 'ko' ? (st.blink ? '#ffd400' : '#c8102e') : st.mode === 'ult' ? (st.blink ? '#7c3aed' : '#ff3fa0') : '#061331';
  g.fillStyle = flashBg; g.fillRect(0, 0, W, MAIN);
  if (st.mode === 'vote' || st.mode === 'idle') {
    g.globalAlpha = 0.08; g.fillStyle = '#6aa0ff';
    for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 2, MAIN);
    for (let y = 0; y < MAIN; y += 8) g.fillRect(0, y, W, 2);
    g.globalAlpha = 1;
  }
  g.fillStyle = '#0d2a66'; g.fillRect(0, 0, W, 58);
  txt('PLENÁRIO KOMBAT · VOTAÇÃO NOMINAL', 24, 31, 38, '#ffd23f', FONT, 'left');
  txt(st.mode === 'idle' ? 'SESSÃO' : `TEMPO ${String(st.t).padStart(2, '0')}`, W - 24, 31, 38, '#7dffb0', FONT, 'right');
  if (st.mode === 'ko') {
    const fg = st.blink ? '#c8102e' : '#ffd400';
    txt('VOTAÇÃO:', W / 2, 112, 70, fg);
    txt('NOCAUTE!', W / 2, 220, 160, fg);
    txt('APROVADO POR ACLAMAÇÃO', W / 2, 330, 40, st.blink ? '#1b1b1b' : '#ffffff');
  } else if (st.mode === 'ult') {
    const fg = st.blink ? '#ffd400' : '#ffffff';
    txt('REGIME DE URGÊNCIA!', W / 2, 120, 76, fg);
    txt(st.ult, W / 2, 228, 92, '#ffffff', FONT, 'center', W - 60);
    txt('VOTAÇÃO SIMBÓLICA EM ANDAMENTO', W / 2, 330, 36, fg);
  } else if (st.mode === 'idle') {
    txt('SESSÃO ABERTA', W / 2, 180, 120, '#ffd23f');
    txt('AGUARDANDO OS LUTADORES', W / 2, 290, 44, '#9fd0ff');
  } else {
    const col = (x, w, label, n, name, c, dark) => {
      g.fillStyle = c; g.fillRect(x, 74, w, 236);
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, 74, w, 50);
      txt(label, x + w / 2, 100, 44, dark ? '#1b1b1b' : '#ffffff');
      txt(String(n), x + w / 2, 200, 128, dark ? '#1b1b1b' : '#ffffff');
      txt(name, x + w / 2, 284, 34, dark ? '#1b1b1b' : '#ffffff', FONT, 'center', w - 16);
    };
    col(24, 360, 'SIM', st.sim, st.p1, '#13a24b');
    col(400, 224, 'ABSTENÇÃO', st.abs, 'QUÓRUM 513', '#f2c230', true);
    col(640, 360, 'NÃO', st.nao, st.p2, '#d42828');
    if (st.combo) {
      g.fillStyle = '#ffd400'; g.fillRect(0, 322, W, 56);
      txt(`COMBO ${st.combo} HITS! ${st.comboWho === 1 ? st.p1 : st.p2} NA TRIBUNA`, W / 2, 351, 42, '#1b1b1b', FONT, 'center', W - 40);
    } else txt(TICKER[st.msg], W / 2, 350, 36, '#9fd0ff', FONT, 'center', W - 40);
  }
  g.strokeStyle = '#2a4a9a'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, MAIN - 6);
  // ---- nomes (2 painéis: metade esquerda/direita da faixa de baixo) ----
  const VC = ['#19e05a', '#ff3030', '#ffd400'], VT = ['SIM', 'NÃO', 'ABST'];
  for (let half = 0; half < 2; half++) {
    const x0 = half * 512, y0 = MAIN;
    g.fillStyle = '#040b1e'; g.fillRect(x0, y0, 512, 256);
    for (let i = 0; i < 12; i++) {
      const k = half * 12 + i, cx = x0 + (i % 2) * 256, cy = y0 + 22 + Math.floor(i / 2) * 41;
      const vote = st.mode === 'idle' ? 2 : st.votes[k];
      g.fillStyle = VC[vote]; g.beginPath(); g.arc(cx + 18, cy, 9, 0, Math.PI * 2); g.fill();
      txt(NAMES[k], cx + 34, cy - 1, 21, '#e8eefc', UIF, 'left', 150);
      txt(`${PARTIES[k % PARTIES.length]} ${VT[vote]}`, cx + 248, cy - 1, 17, VC[vote], UIF, 'right');
    }
    g.strokeStyle = '#2a4a9a'; g.lineWidth = 5; g.strokeRect(x0 + 3, y0 + 3, 506, 250);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}

export function buildPlenario(scene) {
  const lite = !!quality.cfg.lite;
  const root = new THREE.Group();
  root.name = 'arena-plenario';
  scene.add(root);
  const U = { time: { value: 0 } };
  const r = rng(1988);
  const painted = exists(BACKDROP);

  scene.background = new THREE.Color(0x2a1c18);
  scene.fog = new THREE.Fog(0x2a1c18, 70, 420);

  // ---- luzes: refletores do teto (chave quente de cima/frente) + recorte frio vindo da Mesa ----
  const hemi = new THREE.HemisphereLight(0xfff0dc, 0x4a3a34, 1.15);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(-4, 11, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -2, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(0x9ec0ff, 1.1);
  rim.position.set(4, 6, -8);
  root.add(hemi, sun, rim);

  // ---- malha assada: tudo o que é estático ----
  const B = new Baker({ L: [0.25, 0.85, 0.5], sun: 0xffe6c0, amb: 0x5a4a50, haze: 0x3a2a26, sky: 0x4a4048 });
  const hz = (z) => THREE.MathUtils.clamp((-z - 12) / 90, 0, 0.35);

  // leque de bancadas (dois lados): degrau de carpete, espelho de madeira, mesa contínua e cadeiras azuis
  const deputies = [];
  const suitCols = [0x2c3e6a, 0x3a3a46, 0x5a5f6e, 0x7a6450, 0x24324e, 0x8a8f9a, 0x4a2a3a, 0x2f4a3a];
  for (const side of [-1, 1]) {
    for (let i = 0; i < FAN.tiers; i++) {
      const R = FAN.r0 + i * FAN.step, y = FAN.h * (i + 1);
      const a0 = side > 0 ? FAN.a0 : -FAN.a1, a1 = side > 0 ? FAN.a1 : -FAN.a0;
      const zMid = polar(R, (a0 + a1) / 2)[1], haze = hz(zMid) * 0.5;
      B.add(sector(R, R + FAN.step, a0, a1, 0, y), i % 2 ? C.carpet : C.carpetDark, { haze, ao: 0 });
      B.add(sector(R - 0.03, R + 0.03, a0, a1, 0, y), C.woodDark, { haze, ao: 0 });           // espelho do degrau
      B.add(sector(R + 0.15, R + 0.6, a0, a1, y, y + 0.78), C.wood, { haze, ao: 0 });          // mesa da bancada
      B.add(sector(R + 0.1, R + 0.65, a0, a1, y + 0.78, y + 0.84), C.woodLight, { haze, ao: 0 }); // tampo
      // cadeiras e deputados
      const nSeats = Math.round(((a1 - a0) * (R + 1)) / 1.15);
      for (let k = 0; k < nSeats; k++) {
        const a = a0 + ((k + 0.5) * (a1 - a0)) / nSeats;
        const [x, z] = polar(R + 1.15, a);
        B.box(0.62, 0.95, 0.14, C.chair, { pos: [x, y + 0.75, z], rot: [0, -a, 0], haze, ao: 0 });
        B.box(0.62, 0.1, 0.5, C.chair, { pos: [x, y + 0.42, z], rot: [0, -a, 0], haze, ao: 0 });
        if (r() < 0.78) deputies.push({ x: x + (r() - 0.5) * 0.2, y, z: z - 0.05, row: i, haze: haze + i * 0.02 });
      }
    }
  }

  // Mesa Diretora (dois níveis de bancada de madeira) + tribuna do orador + bandeiras
  const mz = -13.4;
  const MP = 0.8; // altura da plataforma da Mesa
  B.box(17, 0.9, 1.3, C.wood, { pos: [0, 0.45, mz], haze: hz(mz) });
  for (let i = -8; i <= 8; i++) B.box(0.06, 0.72, 0.04, C.woodDark, { pos: [i, 0.45, mz + 0.67], haze: hz(mz), ao: 0 }); // frisos
  B.box(17.2, 0.08, 1.4, C.woodLight, { pos: [0, 0.92, mz], haze: hz(mz), ao: 0 });
  B.box(17, MP, 4, C.woodDark, { pos: [0, MP / 2, mz - 2.6], haze: hz(mz - 2.6) });                // plataforma
  B.box(13, 0.95, 1.2, C.wood, { pos: [0, MP + 0.47, mz - 1.4], haze: hz(mz - 1.4) });           // bancada de cima
  B.box(13.2, 0.08, 1.3, C.woodLight, { pos: [0, MP + 0.98, mz - 1.4], haze: hz(mz - 1.4), ao: 0 });
  B.box(13.04, 0.4, 0.05, C.brass, { pos: [0, MP + 0.6, mz - 0.78], haze: hz(mz), ao: 0, emissive: 0.35 }); // faixa dourada
  for (let i = 0; i < 9; i++) { // cadeiras altas da Mesa
    const x = -5.6 + i * 1.4, tall = i === 4 ? 1.8 : 1.35;
    B.box(0.8, tall, 0.18, i === 4 ? 0x1f4aa0 : C.chair, { pos: [x, MP + tall / 2 + 0.3, mz - 2.6], haze: hz(mz - 2.6), ao: 0 });
  }
  // tribuna (púlpito) com microfones e selo
  B.box(1.5, 1.2, 0.85, C.wood, { pos: [0, 0.6, -11.4], haze: hz(-11.4) });
  B.box(1.6, 0.1, 1.0, C.woodLight, { pos: [0, 1.22, -11.45], rot: [0.2, 0, 0], haze: hz(-11.4), ao: 0 });
  B.box(1.1, 0.7, 0.04, C.carpet, { pos: [0, 0.65, -10.96], haze: 0, ao: 0 });
  B.add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), C.brass, { pos: [0, 0.68, -10.93], rot: [Math.PI / 2, 0, 0], ao: 0, emissive: 0.4 });
  for (const s of [-1, 1]) B.add(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 5), 0x222228, { pos: [s * 0.18, 1.5, -11.2], rot: [-0.5, 0, s * 0.25], ao: 0 });
  // mastros das bandeiras (dos lados da Mesa)
  for (const s of [-1, 1]) {
    B.add(new THREE.CylinderGeometry(0.05, 0.06, 3.9, 6), C.brass, { pos: [s * 6.6, 1.95, mz - 3.6], haze: hz(mz - 3.6), ao: 0, emissive: 0.25 });
    B.add(new THREE.SphereGeometry(0.12, 8, 6), C.brass, { pos: [s * 6.6, 3.95, mz - 3.6], ao: 0, emissive: 0.5 });
  }

  // casca: parede do fundo, paredes curvas, galerias, cúpula (some quando há fundo pintado)
  const galleryPeople = [];
  if (!painted) {
    // parede do fundo: lambri de madeira (ripas) + moldura escura do painel
    const bz = BACK_Z;
    B.box(32, GAL, 0.3, C.woodDark, { pos: [0, GAL / 2, bz - 0.15], haze: hz(bz), ao: 0 });
    for (let x = -15.6; x <= 15.6; x += 0.6) B.box(0.34, GAL - 0.3, 0.1, (Math.round(x / 0.6) % 2) ? C.wood : 0x8a4c28, { pos: [x, GAL / 2 - 0.15, bz + 0.03], haze: hz(bz), ao: 0 });
    panelFrames(B, hz(bz) * 0.3);
    // galeria do fundo (em cima do painel): laje, parapeito de vidro e público
    B.box(32, 0.4, 3, C.concrete, { pos: [0, GAL, bz - 1.2], haze: hz(bz) + 0.05 });
    B.box(32, 0.75, 0.12, C.rail, { pos: [0, GAL + 0.57, bz + 0.25], haze: hz(bz) + 0.05, ao: 0 });
    for (let x = -13; x <= 13; x += 6.5) B.box(0.5, 0.14, 0.3, C.ceilLight, { pos: [x, GAL - 0.27, bz + 0.3], emissive: 1, ao: 0 }); // luminárias sob a galeria
    B.box(32, 0.12, 0.2, C.brass, { pos: [0, GAL + 1.0, bz + 0.25], haze: hz(bz), ao: 0, emissive: 0.3 });
    B.box(32, TOP - GAL + 0.5, 0.3, C.concrete, { pos: [0, (TOP + GAL) / 2, bz - 2.8], haze: hz(bz) + 0.06, ao: 0 });
    for (let x = -15; x <= 15; x += 2.5) B.box(0.5, TOP - GAL + 0.5, 0.5, 0xeae2d4, { pos: [x, (TOP + GAL) / 2, bz - 2.5], haze: hz(bz) + 0.04, ao: 0 }); // nervuras de concreto
    B.box(32, 0.3, 0.4, C.ceilLight, { pos: [0, TOP - 0.3, bz - 2.4], emissive: 1, ao: 0 }); // sanca de luz
    for (let x = -14.5; x <= 14.5; x += 0.8) if (r() < 0.85) galleryPeople.push({ x: x + (r() - 0.5) * 0.3, y: GAL + 0.2, z: bz - 0.7 - r() * 0.9, haze: 0.22 });
    // paredes curvas (lambri) com galerias laterais
    for (const side of [-1, 1]) {
      const a0 = side > 0 ? 0.5 : -1.75, a1 = side > 0 ? 1.75 : -0.5;
      const zz = polar(WALL_R, (a0 + a1) / 2)[1];
      const G2 = 5.4; // laje da galeria lateral
      B.add(sector(WALL_R, WALL_R + 0.4, a0, a1, 0, TOP, 28), C.wood, { haze: hz(zz) + 0.1, ao: 0 });
      B.add(sector(WALL_R - 2.6, WALL_R, a0, a1, G2, G2 + 0.4, 28), C.concrete, { haze: hz(zz) + 0.1 });         // laje da galeria
      B.add(sector(WALL_R - 2.6, WALL_R - 2.5, a0, a1, G2 + 0.4, G2 + 1.4, 28), C.rail, { haze: hz(zz) + 0.1, ao: 0 }); // parapeito
      B.add(sector(WALL_R - 2.65, WALL_R - 2.45, a0, a1, G2 + 1.4, G2 + 1.52, 28), C.brass, { haze: hz(zz), ao: 0, emissive: 0.3 });
      B.add(sector(WALL_R - 0.05, WALL_R, a0, a1, G2 + 3, TOP, 28), C.concrete, { haze: hz(zz) + 0.12, ao: 0 });
      const n = lite ? 22 : 40;
      for (let k = 0; k < n; k++) {
        const a = a0 + ((k + r() * 0.6) * (a1 - a0)) / n;
        const [x, z] = polar(WALL_R - 1.5 - r() * 0.6, a);
        if (z < BACK_Z + 0.5) continue; // atrás da parede do fundo
        galleryPeople.push({ x, y: G2 + 0.4, z, haze: 0.25 });
      }
    }
    // cúpula côncava de concreto (vista por dentro) com anéis de luz e nervuras
    const capR = WALL_R + 1, hD = 6, Rd = (capR * capR + hD * hD) / (2 * hD), yc = TOP + hD - Rd, thMax = Math.asin(capR / Rd);
    const dome = new THREE.SphereGeometry(Rd, 40, 10, 0, Math.PI * 2, 0, thMax);
    B.add(dome, C.concrete, { pos: [FAN.cx, yc, FAN.cz], scale: [-1, 1, 1], haze: 0.12, ao: 0, emissive: 0.55, top: [0xf2ece2, TOP, TOP + hD] });
    for (const rr of [6, 11, 16, 21, 26]) {
      const th = Math.asin(rr / Rd);
      B.add(new THREE.SphereGeometry(Rd - 0.2, 40, 1, 0, Math.PI * 2, th, 0.01), C.ceilLight, { pos: [FAN.cx, yc, FAN.cz], scale: [-1, 1, 1], emissive: 1, haze: 0, ao: 0 });
    }
  } else {
    root.add(makeBackdrop(BACKDROP, { D: 210, horizonV: 0.5, centerU: 0.5, sat: 0.9, bright: 0.95 }));
    panelFrames(B, 0); // sem a casca, o painel fica com a moldura própria
  }
  for (const [x, y, z] of HELD) for (const s of [-1, 1]) B.box(0.04, 1.3, 0.04, 0x6a4a2a, { pos: [x + s * 2.0, y - 0.4, z - 0.02], ao: 0 }); // varetas das faixas
  // friso de latão separando o poço (taco) do carpete
  for (const z of [-9.02, 9.02]) B.box(60, 0.05, 0.12, C.brass, { pos: [0, 0.02, z], ao: 0, emissive: 0.25 });
  root.add(B.build());

  // ---- carpete em volta do poço (MeshBasic, escurece perto da câmera = vinheta) ----
  const cTex = carpetTex();
  const cz0 = -19, cz1 = 40;
  cTex.repeat.set(90 / 3, (cz1 - cz0) / 3);
  const cGeo = new THREE.PlaneGeometry(90, cz1 - cz0, 1, 16);
  const cc = new Float32Array(cGeo.attributes.position.count * 3);
  for (let i = 0; i < cGeo.attributes.position.count; i++) {
    const z = (cz0 + cz1) / 2 - cGeo.attributes.position.getY(i);
    const k = 0.85 * (1 - 0.45 * THREE.MathUtils.smoothstep(z, 9, 22));
    cc[i * 3] = cc[i * 3 + 1] = cc[i * 3 + 2] = k;
  }
  cGeo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  const carpet = new THREE.Mesh(cGeo, new THREE.MeshBasicMaterial({ map: cTex, vertexColors: true }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, -0.03, (cz0 + cz1) / 2);
  root.add(carpet);

  // ---- poço de luta: piso de taco (único que recebe sombra) ----
  const FW = 60, FD = 18;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshLambertMaterial({ map: parquetTex({ W: FW, D: FD, lite }) }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // ---- deputados: bancadas + em pé no poço + Mesa ----
  const hazeC = lin(0x3a2a26);
  const seat = (p, extra = {}) => {
    const c = lin(suitCols[Math.floor(r() * suitCols.length)]).lerp(hazeC, p.haze ?? 0);
    return { x: p.x, y: p.y, z: p.z, s: 0.92 + r() * 0.14, color: c, flip: r() < 0.5, dim: 1 - (p.haze ?? 0) * 0.8, variant: Math.floor(r() * 3), ...extra };
  };
  const seats = deputies.map((p) => seat(p));
  // em pé no poço, na frente da Mesa (respiro no meio para a tribuna)
  for (let row = 0; row < 3; row++) {
    const z = -9.9 - row * 0.75;
    for (let x = -9.5; x <= 9.5; x += 0.95 + r() * 0.3) {
      if (Math.abs(x) < 1.5 + row * 0.25) continue;
      seats.push(seat({ x: x + (r() - 0.5) * 0.25, y: 0, z: z - r() * 0.3, haze: row * 0.03 }));
    }
  }
  // Mesa Diretora (atrás da bancada de cima; o presidente no meio, de gravata azul)
  for (let i = 0; i < 9; i++) if (i === 4 || r() < 0.75) seats.push(seat({ x: -5.6 + i * 1.4, y: MP, z: mz - 2.35, haze: 0.04 }, i === 4 ? { variant: 2, pose: 0, s: 1.02 } : {}));
  const deputySheet = {
    tex: deputyAtlas(), cols: 6, rows: 3, poseRows: false, cheer: 5, variants: 3, tint: 0.95, aspect: 0.5,
    poses: (pr, rr) => (pr < 0.45 ? 0 : pr < 0.6 ? 1 : pr < 0.74 ? 2 : pr < 0.86 ? 3 : 4 + (rr() < 0.5 ? 0 : -4)),
  };
  document.fonts?.ready.then(() => deputySheet.tex.userData.redraw());
  const crowd = makeCrowd(seats, U, { sheet: deputySheet });
  root.add(crowd.mesh);
  // galeria: público de roupa colorida — com crowd_atlas.webp usa a folha pintada; senão a mesma folha dos deputados
  let gallery = null;
  if (galleryPeople.length) {
    const shirts = [0xd23b3b, 0x2f8f4e, 0xf2c230, 0x2c55a8, 0xf3efe6, 0xe0703a, 0x7a4ab0];
    const sheet = exists(CROWD_ATLAS_URL) ? crowdSheet() : { ...deputySheet, poses: (pr) => (pr < 0.35 ? 0 : pr < 0.6 ? 1 : pr < 0.85 ? 4 : 5) };
    gallery = makeCrowd(galleryPeople.map((p) => ({
      x: p.x, y: p.y, z: p.z, s: 0.85 + r() * 0.15, flip: r() < 0.5, dim: 0.8,
      color: lin(shirts[Math.floor(r() * shirts.length)]).lerp(hazeC, p.haze),
    })), U, { sheet });
    root.add(gallery.mesh);
  }

  // ---- painel eletrônico ----
  const panel = makePanel({ lite });
  root.add(panel.mesh);

  // ---- panos: bandeiras do Brasil dos lados da Mesa + faixas na galeria ----
  const atlas = clothAtlas([FLAG_DRAW.brasil, FLAG_DRAW.partidoEstrela, FLAG_DRAW.amarela], [
    { text: 'VOTA LOGO!', bg: '#c8102e', fg: '#fff3d6', stripe: '#ffd23f' },
    { text: 'QUÓRUM ATINGIDO', bg: '#1f3f8f', fg: '#ffffff', stripe: '#ffd23f' },
    { text: 'SESSÃO EXTRAORDINÁRIA', bg: '#f4ecd8', fg: '#1b1b1b', stripe: '#1a8a3d' },
    { text: 'REPÚBLICA KOMBAT', bg: '#11823b', fg: '#ffe14d', stripe: '#ffffff' },
  ]);
  document.fonts?.ready.then(() => atlas.userData.redraw());
  const cloth = [];
  for (const s of [-1, 1]) cloth.push({ type: 'flag', idx: 0, w: s < 0 ? 1.9 : -1.9, h: 1.33, pos: [s * 6.6, 3.1, mz - 3.55], amp: 0.12, haze: 0.05, tint: 0xe8e2da });
  if (!painted) {
    cloth.push({ type: 'banner', idx: 0, w: 6, h: 0.75, pos: [-9.5, GAL + 0.65, BACK_Z + 0.36], amp: 0.03, haze: 0.12 });
    cloth.push({ type: 'banner', idx: 1, w: 6, h: 0.75, pos: [9.5, GAL + 0.65, BACK_Z + 0.36], amp: 0.03, haze: 0.12 });
  }
  // faixas seguradas por deputados nas pontas do poço
  for (const [x, y, z] of HELD) cloth.push({ type: 'banner', idx: x < 0 ? 2 : 3, w: 4.2, h: 0.55, pos: [x, y, z], amp: 0.1, haze: 0.04 });
  root.add(makeCloth(cloth, atlas, U));

  // ---- halos: brilho do painel, luminárias da galeria e refletores sobre a Mesa ----
  const glows = [
    { pos: [0, PANELS.main[1], BACK_Z + 0.6], size: 14, stretch: 0.5, color: 0x4a8aff, k: 0.22 },
    { pos: [-8.2, PANELS.left[1], BACK_Z + 1.1], size: 6.5, stretch: 0.6, color: 0x4a8aff, k: 0.14 },
    { pos: [8.2, PANELS.right[1], BACK_Z + 1.1], size: 6.5, stretch: 0.6, color: 0x4a8aff, k: 0.14 },
    { pos: [0, 2.2, mz - 1], size: 16, stretch: 0.35, color: 0xffd08a, k: 0.12 },
  ];
  if (!painted) for (let x = -13; x <= 13; x += 6.5) glows.push({ pos: [x, GAL - 0.45, BACK_Z + 0.5], size: 1.6, color: 0xffe0a0, k: 0.35 });
  const glowMesh = makeGlows(glows);
  root.add(glowMesh);
  const glowMat = glowMesh.material;

  // ---- vida ----
  let energy = 0;
  const api = {
    root,
    U,
    id: 'plenario',
    // 0..1 (golpe forte ~0.3, KO/ultimate 1): deputados pulam em onda, levantam plaquinhas; painel pisca
    react(v = 0.3) {
      energy = Math.min(1.2, energy + v);
      if (v >= 0.2) {
        for (const c of [crowd, gallery]) if (c) { c.uni.uKickT.value = U.time.value; c.uni.uKick.value = Math.min(1, 0.35 + v); }
      }
      panel.kick(v);
    },
    excite(v) { api.react(v); },
    update(dt, time, match) {
      U.time.value = time;
      energy = Math.max(0, energy - dt * 0.35);
      crowd.uni.uEnergy.value = energy;
      if (gallery) gallery.uni.uEnergy.value = energy * 0.8;
      panel.update(dt, time, energy, match);
      glowMat.color.setScalar(1 + energy * 0.5);
    },
  };
  return api;
}
