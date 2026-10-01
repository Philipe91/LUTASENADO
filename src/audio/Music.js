// Trilha procedural em loop: batida de luta com sotaque de frevo/marchinha (caixa repicada, surdo, metais em
// "stab" e uma frase rápida de trompete). 8 compassos a 144 BPM ≈ 13 s. Tudo gerado com osciladores WebAudio.
// Agendamento com antecedência (lookahead) para não depender do framerate do jogo.

const BPM = 144;
const STEP = 60 / BPM / 4; // semicolcheia
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const _ = null;

// harmonia: 1 acorde por compasso (fundamental do baixo + tríade dos metais)
const BARS = [
  { root: 38, chord: [62, 65, 69] }, // Dm
  { root: 38, chord: [62, 65, 69] }, // Dm
  { root: 43, chord: [62, 67, 70] }, // Gm
  { root: 45, chord: [61, 64, 67] }, // A7
  { root: 38, chord: [62, 65, 69] }, // Dm
  { root: 46, chord: [62, 65, 70] }, // Bb
  { root: 43, chord: [61, 64, 67], root2: 45 }, // Gm → A7
  { root: 38, chord: [62, 65, 69] }, // Dm
];
// frase de trompete (seção B, compassos 5–8)
const MELODY = [
  74, _, 72, 74, 77, _, 74, _, 72, 70, 69, _, 69, 70, 72, 74,
  74, _, 72, 70, 69, _, 70, _, 72, _, 70, 69, 67, _, 65, _,
  67, _, 70, _, 74, _, 72, 70, 69, _, 73, _, 76, _, 73, _,
  74, _, 69, _, 74, _, _, _, 62, 64, 65, 67, 69, 70, 72, 73,
];
const BASS_STEPS = { 0: 0, 3: 0, 6: 7, 8: 12, 11: 7, 14: 0 }; // passo → intervalo sobre a fundamental
const STAB_A = new Set([3, 6, 11, 14]);
const STAB_B = new Set([6, 14]);
const KICK = new Set([0, 8, 10]);
const SNARE_ACC = new Set([4, 12]);
const SNARE_GHOST = new Set([2, 3, 7, 9, 11, 14, 15]);

export class Music {
  constructor(engine) {
    this.engine = engine;
    this.playing = false;
    this.step = 0;
    this.nextT = 0;
    this.timer = null;
  }

  get ctx() { return this.engine.ctx; }
  get out() { return this.engine.musicBus; }

  noise() {
    if (this._noise) return this._noise;
    const n = this.ctx.sampleRate, b = this.ctx.createBuffer(1, n, n), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (this._noise = b);
  }

  start() {
    if (!this.engine.running) return;
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
  }
  // vitória: para o loop e toca uma fanfarra curta
  fanfare() {
    this.stop();
    if (!this.engine.running) return;
    const t = this.ctx.currentTime + 0.1;
    [[62, 0], [66, 0.12], [69, 0.24], [74, 0.36], [74, 0.6], [78, 0.6], [81, 0.6]].forEach(([n, dt]) =>
      this.brass(midi(n), t + dt, dt >= 0.6 ? 1.1 : 0.1, 0.16));
    this.kick(t + 0.6, 1); this.crash(t + 0.6);
  }

  schedule() {
    if (!this.engine.running) return;
    const now = this.ctx.currentTime;
    if (this.nextT < now - 0.2) this.nextT = now + 0.05; // aba voltou de segundo plano: retoma sem rajada
    while (this.nextT < now + 0.12) {
      this.playStep(this.step, this.nextT);
      this.nextT += STEP;
      this.step = (this.step + 1) % (BARS.length * 16);
    }
  }

  playStep(i, t) {
    const bar = Math.floor(i / 16), s = i % 16, B = BARS[bar], sectionB = bar >= 4;
    const swing = s % 2 ? STEP * 0.08 : 0; // ginga leve
    t += swing;
    // bateria
    if (KICK.has(s) || (bar % 2 && s === 6)) this.kick(t, s === 0 ? 1 : 0.75);
    if (SNARE_ACC.has(s)) this.snare(t, 0.55);
    else if (SNARE_GHOST.has(s)) this.snare(t, 0.14);
    if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.16 : 0.09, 0.03);
    if (s === 14 && bar % 2) this.hat(t, 0.12, 0.18);
    if (i === 0) this.crash(t);
    // surdo de marcação
    if (s === 4 || s === 12) this.tom(t, 70, 0.5);
    // baixo
    if (s in BASS_STEPS) {
      const root = B.root2 && s >= 8 ? B.root2 : B.root;
      this.bass(midi(root + BASS_STEPS[s]), t, STEP * 1.6);
    }
    // metais
    if ((sectionB ? STAB_B : STAB_A).has(s)) for (const n of B.chord) this.brass(midi(n), t, STEP * 0.7, 0.07);
    if (sectionB) {
      const n = MELODY[(bar - 4) * 16 + s];
      if (n != null) {
        let len = 1;
        while (len < 4 && MELODY[(bar - 4) * 16 + s + len] === null && s + len < 16) len++;
        this.brass(midi(n), t, STEP * len * 0.9, 0.11, true);
      }
    }
  }

  // ---------- instrumentos ----------
  env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  }
  kick(t, v) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.9 * v, 0.002, 0.22);
    o.connect(g).connect(this.out);
    o.start(t); o.stop(t + 0.3);
  }
  tom(t, f, v) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(f * 1.4, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    this.env(g, t, v, 0.003, 0.3);
    o.connect(g).connect(this.out);
    o.start(t); o.stop(t + 0.35);
  }
  noiseHit(t, v, dur, type, freq, q = 1) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    this.env(g, t, v, 0.001, dur);
    s.connect(f).connect(g).connect(this.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  snare(t, v) {
    this.noiseHit(t, v, 0.12, 'bandpass', 1800, 0.7);
    if (v > 0.3) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
      this.env(g, t, v * 0.5, 0.001, 0.07);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.1);
    }
  }
  hat(t, v, dur) { this.noiseHit(t, v, dur, 'highpass', 7500); }
  crash(t) { this.noiseHit(t, 0.18, 1.2, 'highpass', 5000); }
  bass(f, t, dur) {
    const o = this.ctx.createOscillator(), flt = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    flt.type = 'lowpass'; flt.frequency.setValueAtTime(900, t); flt.frequency.exponentialRampToValueAtTime(220, t + dur);
    this.env(g, t, 0.32, 0.005, dur);
    o.connect(flt).connect(g).connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  brass(f, t, dur, v, lead = false) {
    const flt = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    flt.type = 'lowpass'; flt.Q.value = 2;
    flt.frequency.setValueAtTime(600, t);
    flt.frequency.exponentialRampToValueAtTime(lead ? 3200 : 2600, t + 0.03);
    flt.frequency.exponentialRampToValueAtTime(900, t + dur);
    this.env(g, t, v, 0.015, dur);
    flt.connect(g).connect(this.out);
    for (const det of lead ? [-6, 6] : [0]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      if (lead) { // vibrato de trompete
        const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
        lfo.frequency.value = 5.5; lg.gain.value = f * 0.006;
        lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
      }
      o.connect(flt); o.start(t); o.stop(t + dur + 0.05);
    }
  }
}
