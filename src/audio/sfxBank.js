// Banco de efeitos sonoros do República Kombat — tudo sintetizado (ver synth.js).
// gain = volume base · reverb = quanto vai para o salão (0..1) · vary = variação de pitch por disparo
// Para criar/ajustar: mude números, abra o jogo com ?sfxtest=1 e clique nos botões.

const hitBody = (f, dur, vol = 1) => ({ wave: 'sine', f, f2: f * 0.35, a: 0.001, r: dur, vol });
const snap = (lp, dur, vol = 0.8, seed = 1) => ({ wave: 'noise', lp, lp2: lp * 0.3, a: 0.001, r: dur, vol, seed });

export const SFX = {
  // ---- golpes ----
  punchLight: { gain: 0.75, vary: 0.08, reverb: 0.05, layers: [
    snap(5200, 0.05, 0.9, 11), hitBody(190, 0.09, 0.9), { wave: 'noise', hp: 1800, a: 0.001, r: 0.03, vol: 0.4, seed: 3 },
  ] },
  punchHeavy: { gain: 0.95, vary: 0.07, reverb: 0.12, layers: [
    snap(3800, 0.09, 1, 21), hitBody(140, 0.22, 1.1), { wave: 'saw', f: 90, f2: 40, lp: 600, a: 0.001, r: 0.18, vol: 0.5, dist: 2 },
  ] },
  kick: { gain: 0.9, vary: 0.08, reverb: 0.08, layers: [
    { wave: 'noise', lp: 2400, lp2: 600, a: 0.001, r: 0.12, vol: 0.9, seed: 31 }, hitBody(110, 0.2, 1.2),
    { wave: 'noise', hp: 2500, a: 0.001, r: 0.02, vol: 0.5, seed: 32 },
  ] },
  slam: { gain: 1, vary: 0.05, reverb: 0.25, layers: [
    hitBody(90, 0.4, 1.3), { wave: 'noise', lp: 1500, lp2: 200, a: 0.002, r: 0.35, vol: 0.9, seed: 41 },
    { wave: 'crackle', lp: 3000, a: 0.001, r: 0.2, vol: 0.5, seed: 42 },
  ] },
  block: { gain: 0.6, vary: 0.06, reverb: 0.06, layers: [
    { wave: 'square', f: 820, f2: 600, a: 0.001, r: 0.06, vol: 0.25, duty: 0.3 },
    { wave: 'noise', lp: 2600, lp2: 900, a: 0.001, r: 0.08, vol: 0.7, seed: 51 }, hitBody(260, 0.07, 0.5),
  ] },
  armor: { gain: 0.7, vary: 0.04, reverb: 0.2, layers: [
    { wave: 'tri', f: 340, f2: 300, a: 0.001, r: 0.35, vol: 0.5, vib: 0.01, vibF: 9 },
    { wave: 'square', f: 1250, a: 0.001, r: 0.18, vol: 0.12 }, snap(4000, 0.06, 0.8, 52),
  ] },
  whoosh: { gain: 0.3, vary: 0.12, reverb: 0, layers: [
    { wave: 'noise', lp: 600, lp2: 3200, hp: 300, a: 0.04, r: 0.12, vol: 1, seed: 61 },
  ] },
  whooshHeavy: { gain: 0.35, vary: 0.1, reverb: 0.05, layers: [
    { wave: 'noise', lp: 300, lp2: 2200, hp: 120, a: 0.08, r: 0.2, vol: 1, seed: 62 },
  ] },
  throwWhoosh: { gain: 0.35, vary: 0.1, reverb: 0.05, layers: [
    { wave: 'noise', lp: 2400, lp2: 500, hp: 200, a: 0.02, s: 0.1, r: 0.25, vol: 1, seed: 63 },
  ] },
  grab: { gain: 0.7, vary: 0.06, reverb: 0.1, layers: [
    { wave: 'noise', lp: 900, a: 0.005, r: 0.15, vol: 0.8, seed: 71 }, hitBody(160, 0.15, 0.7),
    { wave: 'saw', f: 160, f2: 120, lp: 900, a: 0.03, s: 0.12, r: 0.12, vol: 0.25, vib: 0.03, vibF: 7 }, // "uhh!"
  ] },

  // ---- movimento ----
  jump: { gain: 0.25, vary: 0.1, reverb: 0, layers: [
    { wave: 'noise', lp: 1400, hp: 200, a: 0.002, r: 0.06, vol: 0.8, seed: 81 }, { wave: 'sine', f: 180, f2: 320, a: 0.002, r: 0.08, vol: 0.4 },
  ] },
  land: { gain: 0.35, vary: 0.1, reverb: 0.02, layers: [
    { wave: 'noise', lp: 900, lp2: 200, a: 0.001, r: 0.08, vol: 0.9, seed: 82 }, hitBody(90, 0.08, 0.6),
  ] },
  fall: { gain: 0.95, vary: 0.06, reverb: 0.2, layers: [
    hitBody(70, 0.35, 1.3), { wave: 'noise', lp: 1200, lp2: 150, a: 0.002, r: 0.4, vol: 1, seed: 83 },
    { wave: 'crackle', lp: 2500, a: 0.001, r: 0.25, vol: 0.4, seed: 84 },
  ] },
  stomp: { gain: 0.9, vary: 0.05, reverb: 0.25, layers: [
    hitBody(60, 0.45, 1.4), { wave: 'noise', lp: 700, lp2: 80, a: 0.002, r: 0.5, vol: 1, seed: 85 },
  ] },
  rumble: { gain: 0.5, vary: 0.05, reverb: 0.1, layers: [
    { wave: 'noise', lp: 300, a: 0.05, s: 0.4, r: 0.4, vol: 1, seed: 86, am: 0.5, amF: 11 }, { wave: 'sine', f: 50, a: 0.05, s: 0.4, r: 0.4, vol: 0.5 },
  ] },

  // ---- KO e ultimate ----
  ko: { gain: 1.1, vary: 0.02, reverb: 0.75, layers: [
    { wave: 'sine', f: 95, f2: 28, a: 0.002, r: 1.3, vol: 1.4 },
    { wave: 'noise', lp: 2500, lp2: 80, a: 0.001, r: 0.9, vol: 1, seed: 91 },
    { wave: 'saw', f: 55, f2: 30, lp: 400, a: 0.002, r: 0.8, vol: 0.5, dist: 3 },
    { wave: 'crackle', lp: 4000, a: 0.001, r: 0.4, vol: 0.5, seed: 92 },
  ] },
  ultReady: { gain: 0.45, vary: 0, reverb: 0.35, layers: [
    ...[523, 659, 784, 1047].map((f, i) => ({ wave: 'square', f, at: i * 0.07, a: 0.002, d: 0.05, sl: 0.4, s: 0.03, r: 0.25, vol: 0.35, duty: 0.25 })),
    { wave: 'sine', f: 2093, at: 0.28, a: 0.002, r: 0.6, vol: 0.3, vib: 0.004, vibF: 7 },
  ] },
  ultActivate: { gain: 0.95, vary: 0, reverb: 0.5, layers: [
    { wave: 'saw', f: 110, f2: 1400, lp: 400, lp2: 6000, a: 0.02, s: 0.5, r: 0.05, vol: 0.45, vib: 0.02, vibF: 12 },
    { wave: 'noise', lp: 500, lp2: 9000, a: 0.5, r: 0.05, vol: 0.5, seed: 93 },
    { wave: 'sine', f: 120, f2: 30, at: 0.55, a: 0.002, r: 0.9, vol: 1.3 },
    { wave: 'noise', lp: 3000, lp2: 100, at: 0.55, a: 0.001, r: 0.7, vol: 0.9, seed: 94 },
  ] },

  // ---- assinaturas dos personagens ----
  stamp: { gain: 1, vary: 0.04, reverb: 0.3, layers: [ // carimbo do Xandor: pancada seca + papel
    hitBody(150, 0.25, 1.3), { wave: 'noise', lp: 5000, lp2: 1500, a: 0.001, r: 0.06, vol: 1, seed: 101 },
    { wave: 'noise', hp: 3000, at: 0.02, a: 0.003, r: 0.12, vol: 0.35, seed: 102 },
  ] },
  gavel: { gain: 0.95, vary: 0.05, reverb: 0.4, layers: [ // martelo de juiz: toc-toc-TOC de madeira
    ...[0, 0.13].map((at, i) => ({ wave: 'tri', f: 820, f2: 700, at, a: 0.001, r: 0.07, vol: 0.6 })),
    { wave: 'tri', f: 600, f2: 480, at: 0.29, a: 0.001, r: 0.16, vol: 0.9 },
    ...[0, 0.13, 0.29].map((at, i) => ({ wave: 'noise', lp: 3500, hp: 400, at, a: 0.001, r: 0.03, vol: 0.8, seed: 103 + i })),
    { ...hitBody(180, 0.2, 0.7), at: 0.29 },
  ] },
  paper: { gain: 0.35, vary: 0.1, reverb: 0.05, layers: [
    { wave: 'crackle', hp: 1500, a: 0.01, s: 0.12, r: 0.1, vol: 1, seed: 111 }, { wave: 'noise', lp: 3000, lp2: 6000, hp: 800, a: 0.04, r: 0.12, vol: 0.4, seed: 112 },
  ] },
  pen: { gain: 0.3, vary: 0.06, reverb: 0.05, layers: [ // rabisco de caneta
    { wave: 'noise', hp: 2500, lp: 6000, a: 0.01, s: 0.18, r: 0.06, vol: 1, am: 0.9, amF: 22, seed: 113 },
  ] },
  tentacle: { gain: 0.9, vary: 0.1, reverb: 0.2, layers: [ // tentáculo do Polvão: chicote molhado + "plof"
    { wave: 'noise', lp: 400, lp2: 5000, hp: 200, a: 0.05, r: 0.04, vol: 0.7, seed: 121 },
    { wave: 'noise', lp: 1800, lp2: 300, at: 0.08, a: 0.001, r: 0.15, vol: 1, seed: 122 },
    { wave: 'sine', f: 420, f2: 90, at: 0.08, a: 0.001, r: 0.14, vol: 0.9, vib: 0.15, vibF: 35 },
    { wave: 'sine', f: 900, f2: 300, at: 0.12, a: 0.005, r: 0.1, vol: 0.25, vib: 0.2, vibF: 50 },
  ] },
  motos: { gain: 0.75, vary: 0.05, reverb: 0.15, layers: [ // Motociata: 3 motos acelerando e passando
    ...[0, 0.12, 0.26].map((at, i) => ({ wave: 'saw', f: 70 + i * 9, f2: 150 + i * 12, lp: 700, lp2: 1800, at, a: 0.15, s: 0.35, r: 0.35, vol: 0.55, am: 0.6, amF: 32 + i * 4, jitter: 0.03, dist: 1.5, seed: 131 + i })),
    { wave: 'noise', lp: 800, a: 0.15, s: 0.4, r: 0.4, vol: 0.35, seed: 134 },
    { wave: 'square', f: 440, at: 0.05, a: 0.01, s: 0.12, r: 0.03, vol: 0.12 }, { wave: 'square', f: 554, at: 0.22, a: 0.01, s: 0.12, r: 0.03, vol: 0.12 }, // buzininha
  ] },
  truck: { gain: 0.8, vary: 0.03, reverb: 0.2, layers: [ // caminhão: buzina a ar + motor
    { wave: 'saw', f: 233, a: 0.02, s: 0.5, r: 0.12, vol: 0.4, lp: 2200 }, { wave: 'saw', f: 277, a: 0.02, s: 0.5, r: 0.12, vol: 0.35, lp: 2200 },
    { wave: 'saw', f: 55, f2: 75, lp: 400, a: 0.1, s: 0.6, r: 0.4, vol: 0.5, am: 0.5, amF: 25, jitter: 0.02 },
  ] },
  roar: { gain: 1, vary: 0.05, reverb: 0.45, layers: [ // rugido do Dino
    { wave: 'saw', f: 140, f2: 70, lp: 1500, lp2: 500, a: 0.06, d: 0.2, sl: 0.7, s: 0.4, r: 0.5, vol: 0.8, vib: 0.06, vibF: 17, jitter: 0.08, dist: 3, seed: 141 },
    { wave: 'noise', lp: 1200, lp2: 400, a: 0.06, s: 0.6, r: 0.5, vol: 0.6, am: 0.4, amF: 23, seed: 142 },
    { wave: 'sine', f: 60, f2: 40, a: 0.05, s: 0.5, r: 0.5, vol: 0.6 },
  ] },
  roarHit: { gain: 0.9, vary: 0.08, reverb: 0.3, layers: [ // mordida/pisada do T-Rex
    hitBody(80, 0.3, 1.2), { wave: 'saw', f: 120, f2: 70, lp: 1000, a: 0.02, s: 0.1, r: 0.2, vol: 0.5, jitter: 0.1, dist: 2 },
    { wave: 'noise', lp: 1500, lp2: 200, a: 0.001, r: 0.25, vol: 0.8, seed: 143 },
  ] },
  chomp: { gain: 0.9, vary: 0.08, reverb: 0.2, layers: [ // jacaré do Capitão Brasa: bocada
    { wave: 'noise', hp: 1500, a: 0.001, r: 0.03, vol: 0.9, seed: 151 }, hitBody(130, 0.15, 1), { wave: 'square', f: 300, f2: 120, a: 0.001, r: 0.08, vol: 0.2 },
  ] },
  finger: { gain: 0.3, vary: 0.1, reverb: 0.05, layers: [ // Rajada do Dedo: "pew pew pew"
    ...[0, 0.08, 0.16].map((at) => ({ wave: 'square', f: 1600, f2: 400, at, a: 0.001, r: 0.07, vol: 0.4, duty: 0.25 })),
  ] },
  mic: { gain: 0.35, vary: 0.04, reverb: 0.4, layers: [ // Discurso: microfonia + "blá-blá" de palanque
    { wave: 'sine', f: 2200, f2: 2600, a: 0.1, s: 0.15, r: 0.15, vol: 0.25, vib: 0.01, vibF: 5 },
    ...[0, 0.14, 0.28, 0.42].map((at, i) => ({ wave: 'saw', f: 150 + (i % 2) * 30, f2: 130, lp: 1200, at, a: 0.01, s: 0.06, r: 0.04, vol: 0.4, vib: 0.05, vibF: 9 })),
  ] },
  crowd: { gain: 0.6, vary: 0.04, reverb: 0.3, layers: [ // multidão (Picanha do Povo): passos + vozes
    { wave: 'noise', lp: 700, a: 0.2, s: 0.9, r: 0.6, vol: 0.7, am: 0.7, amF: 9, seed: 161 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ wave: 'saw', f: 180 + i * 37, f2: 200 + i * 31, lp: 1100, at: i * 0.05, a: 0.15, s: 0.7, r: 0.5, vol: 0.14, vib: 0.04, vibF: 4 + i, jitter: 0.05, seed: 162 + i })),
    { wave: 'noise', lp: 3000, hp: 600, a: 0.3, s: 0.6, r: 0.6, vol: 0.4, seed: 169 },
  ] },
  cheer: { gain: 0.4, vary: 0.06, reverb: 0.5, layers: [ // torcida: "ÊÊÊÊ!"
    { wave: 'noise', lp: 2400, hp: 400, a: 0.25, s: 0.7, r: 1.0, vol: 0.8, am: 0.25, amF: 6, seed: 171 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ wave: 'saw', f: 230 + i * 29, f2: 260 + i * 33, lp: 1700, at: i * 0.03, a: 0.2, s: 0.6, r: 0.9, vol: 0.09, vib: 0.03, vibF: 5 + i * 0.7, jitter: 0.04, seed: 172 + i })),
  ] },
  ooh: { gain: 0.35, vary: 0.08, reverb: 0.45, layers: [ // torcida reagindo: "UUUH!"
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ wave: 'tri', f: 260 + i * 23, f2: 170 + i * 15, lp: 900, at: i * 0.02, a: 0.08, s: 0.25, r: 0.5, vol: 0.18, vib: 0.03, vibF: 5 + i, jitter: 0.03, seed: 181 + i })),
    { wave: 'noise', lp: 900, hp: 200, a: 0.08, s: 0.25, r: 0.5, vol: 0.4, seed: 188 },
  ] },
  bell: { gain: 0.6, vary: 0, reverb: 0.4, layers: [ // gongo/sino do ringue
    ...[1, 2.76, 5.4].map((m, i) => ({ wave: 'sine', f: 620 * m, a: 0.001, r: 1.2 / (i + 1), vol: 0.5 / (i + 1) })),
    { wave: 'noise', hp: 3000, a: 0.001, r: 0.02, vol: 0.4, seed: 191 },
  ] },
  buff: { gain: 0.3, vary: 0, reverb: 0.2, layers: [ // VIRALIZOU! (notificação)
    { wave: 'sine', f: 988, a: 0.002, r: 0.12, vol: 0.6 }, { wave: 'sine', f: 1319, at: 0.09, a: 0.002, r: 0.25, vol: 0.6 },
  ] },
  denied: { gain: 0.22, vary: 0, reverb: 0.1, layers: [ // especial bloqueado: buzina de "negado"
    { wave: 'square', f: 140, a: 0.005, s: 0.22, r: 0.05, vol: 0.5, lp: 1500 }, { wave: 'square', f: 147, a: 0.005, s: 0.22, r: 0.05, vol: 0.5, lp: 1500 },
  ] },
  poof: { gain: 0.5, vary: 0.1, reverb: 0.15, layers: [snap(2000, 0.15, 1, 201), hitBody(200, 0.1, 0.5)] },
};

export const SFX_NAMES = Object.keys(SFX);
