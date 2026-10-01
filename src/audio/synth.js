// Sintetizador de SFX "estilo ZzFX": cada som é uma lista de camadas descritas por números,
// renderizadas uma vez para um Float32Array (sem arquivos de áudio, sem licença de terceiros).
// Puro JS — roda em Node também (útil para testar que nenhum som explode/clipa).
//
// Camada:
//   wave   'sine' | 'tri' | 'saw' | 'square' | 'noise' | 'crackle'
//   f, f2  frequência inicial/final em Hz (deslize exponencial)   — ignorada no ruído branco
//   at     início da camada (s)          a, d, s, r   ataque, decaimento, sustentação, soltura (s)
//   sl     nível da sustentação (0..1)   vol          volume da camada
//   lp, lp2  passa-baixa (Hz) inicial/final         hp   passa-alta (Hz)
//   vib, vibF  vibrato (fração da freq) e taxa (Hz)  am, amF  tremolo (0..1) e taxa (Hz)
//   crush  bitcrush (nº de níveis; 0 = desligado)    dist  saturação (0 = limpo)
//   jitter  instabilidade aleatória da frequência (motores, rugido)
//   seed   semente do ruído (mesmo som sempre igual)

const TAU = Math.PI * 2;

function rng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
}

function env(t, L) {
  const a = L.a ?? 0.005, d = L.d ?? 0, s = L.s ?? 0, r = L.r ?? 0.1, sl = L.sl ?? 1;
  if (t < 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - sl) * ((t - a) / d);
  if (t < a + d + s) return sl;
  const k = t - a - d - s;
  return k < r ? sl * Math.pow(1 - k / r, 2) : 0;
}

export function layerLength(L) {
  return (L.at ?? 0) + (L.a ?? 0.005) + (L.d ?? 0) + (L.s ?? 0) + (L.r ?? 0.1);
}

export function render(layers, sampleRate = 44100) {
  const len = Math.max(...layers.map(layerLength)) + 0.02;
  const n = Math.ceil(len * sampleRate);
  const out = new Float32Array(n);
  layers.forEach((L, li) => {
    const rand = rng((L.seed ?? 1234) + li * 7919);
    const start = Math.floor((L.at ?? 0) * sampleRate);
    const dur = layerLength(L) - (L.at ?? 0);
    const m = Math.ceil(dur * sampleRate);
    const f0 = L.f ?? 440, f1 = L.f2 ?? f0;
    const lp0 = L.lp ?? 0, lp1 = L.lp2 ?? lp0;
    let phase = 0, lpState = 0, lpState2 = 0, hpState = 0, hpPrev = 0, held = 0, jit = 0;
    const vol = L.vol ?? 1;
    const fSlide = f1 !== f0, lpSlide = lp1 !== lp0;
    const lpK = (fc) => 1 - Math.exp(-TAU * fc / sampleRate);
    let kLp = lp0 ? lpK(lp0) : 0;
    const kHp = L.hp ? Math.exp(-TAU * L.hp / sampleRate) : 0;
    for (let i = 0; i < m && start + i < n; i++) {
      const t = i / sampleRate;
      const q = dur > 0 ? Math.min(1, t / dur) : 0;
      let f = fSlide ? f0 * Math.pow(f1 / f0, q) : f0;
      if (L.vib) f *= 1 + L.vib * Math.sin(TAU * (L.vibF ?? 6) * t);
      if (L.jitter) { if (i % 64 === 0) jit = rand() * L.jitter; f *= 1 + jit; }
      phase += f / sampleRate;
      phase -= Math.floor(phase);
      let v;
      switch (L.wave) {
        case 'sine': v = Math.sin(TAU * phase); break;
        case 'tri': v = 1 - 4 * Math.abs(phase - 0.5); break;
        case 'saw': v = 2 * phase - 1; break;
        case 'square': v = phase < (L.duty ?? 0.5) ? 1 : -1; break;
        case 'crackle': if (rand() > 0.96) held = rand(); else held *= 0.9; v = held; break;
        default: v = rand(); // noise
      }
      if (L.dist) v = Math.tanh(v * (1 + L.dist)) / Math.tanh(1 + L.dist);
      // passa-baixa de 2 polos (um-polo em cascata) com corte deslizante
      if (lp0) {
        if (lpSlide && (i & 31) === 0) kLp = lpK(lp0 * Math.pow(lp1 / lp0, q));
        lpState += kLp * (v - lpState);
        lpState2 += kLp * (lpState - lpState2);
        v = lpState2;
      }
      if (L.hp) {
        hpState = kHp * (hpState + v - hpPrev);
        hpPrev = v;
        v = hpState;
      }
      if (L.crush) v = Math.round(v * L.crush) / L.crush;
      let g = env(t, L) * vol;
      if (L.am) g *= 1 - L.am * (0.5 + 0.5 * Math.sin(TAU * (L.amF ?? 8) * t));
      out[start + i] += v * g;
    }
  });
  // normaliza o pico em 0.95 (o volume final de cada som é o `gain` do banco) e suaviza o fim
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const norm = peak > 0 ? 0.95 / peak : 1;
  const fade = Math.min(n, Math.floor(0.01 * sampleRate));
  for (let i = 0; i < n; i++) {
    out[i] *= norm;
    if (i >= n - fade) out[i] *= (n - i) / fade;
  }
  return out;
}
