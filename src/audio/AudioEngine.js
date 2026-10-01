// Motor de áudio WebAudio: mixer (master ← sfx / música / salão com reverb), banco de SFX sintetizados,
// desbloqueio no primeiro toque/tecla (regra dos navegadores de celular) e mudo.
// Seguro fora do navegador: sem AudioContext, tudo vira no-op.
import { render } from './synth.js';
import { SFX } from './sfxBank.js';

const RATE = 44100;
const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

export class AudioEngine {
  constructor({ muted = false, sfxVolume = 1, musicVolume = 0.32 } = {}) {
    this.available = !!AC;
    this.muted = muted;
    this.sfxVolume = sfxVolume;
    this.musicVolume = musicVolume;
    this.pcm = {};       // nome → Float32Array (renderizado em segundo plano)
    this.buffers = {};   // nome → AudioBuffer
    this.ctx = null;
    this.unlocked = false;
    this.lastPlay = {};  // anti-metralhadora: mesmo som repetido em < 30 ms vira um só
    this.listeners = new Set();
    if (this.available) this.prerender();
  }

  // Renderiza o banco aos poucos (um som por tarefa) para não travar o carregamento
  prerender() {
    const names = Object.keys(SFX);
    const idle = typeof requestIdleCallback === 'function' ? (fn) => requestIdleCallback(fn, { timeout: 250 }) : (fn) => setTimeout(fn, 16);
    const next = () => {
      const name = names.shift();
      if (!name) return;
      if (!this.pcm[name]) this.pcm[name] = render(SFX[name].layers, RATE);
      idle(next);
    };
    idle(next);
  }

  // Cria o contexto (só dentro de um gesto do usuário) e monta o mixer
  init() {
    if (this.ctx || !this.available) return;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.duckGain = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.duckGain).connect(this.master);
    // salão: reverb por convolução com resposta ao impulso gerada (ruído com decaimento exponencial)
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.4, 2.8);
    this.reverbBus = ctx.createGain();
    this.reverbBus.gain.value = 0.55;
    this.reverbBus.connect(this.reverb).connect(this.sfxBus); // o volume de SFX vale para o salão também
    this.applyVolumes();
  }

  impulse(seconds, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  // Chamado em pointerdown/touchend/keydown: resume() precisa acontecer dentro do gesto
  unlock() {
    if (!this.available) return;
    this.init();
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (!this.unlocked) {
      // toca 1 amostra de silêncio (iOS antigo só libera assim)
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      this.unlocked = true;
      for (const fn of this.listeners) fn();
    }
  }
  onUnlock(fn) { this.listeners.add(fn); if (this.unlocked) fn(); }
  get running() { return !!this.ctx && this.ctx.state === 'running'; }

  setMuted(m) { this.muted = m; this.applyVolumes(); }
  setSfxVolume(v) { this.sfxVolume = v; this.applyVolumes(); }
  setMusicVolume(v) { this.musicVolume = v; this.applyVolumes(); }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicVolume, t, 0.05);
  }
  // abaixa a música por um instante (ultimate, KO, locutor)
  duck(amount = 0.35, hold = 1.6) {
    if (!this.ctx) return;
    const g = this.duckGain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(amount, t, 0.05);
    g.setTargetAtTime(1, t + hold, 0.5);
  }

  buffer(name) {
    if (this.buffers[name]) return this.buffers[name];
    const def = SFX[name];
    if (!def) return null;
    const pcm = this.pcm[name] || (this.pcm[name] = render(def.layers, RATE));
    const buf = this.ctx.createBuffer(1, pcm.length, RATE);
    buf.getChannelData(0).set(pcm);
    return (this.buffers[name] = buf);
  }

  // Toca um SFX com leve variação de pitch e volume (cada soco soa um pouco diferente)
  play(name, { vol = 1, pitch = 1, pan = 0, delay = 0 } = {}) {
    if (!this.running || this.muted) return;
    const def = SFX[name];
    if (!def) return;
    const now = this.ctx.currentTime;
    if (!delay && now - (this.lastPlay[name] ?? -1) < 0.03) return;
    this.lastPlay[name] = now;
    const vary = def.vary ?? 0.06;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer(name);
    src.playbackRate.value = pitch * (1 + (Math.random() * 2 - 1) * vary);
    const g = this.ctx.createGain();
    g.gain.value = (def.gain ?? 1) * vol * (1 + (Math.random() * 2 - 1) * 0.12);
    let node = src.connect(g);
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node = node.connect(p);
    }
    node.connect(this.sfxBus);
    if (def.reverb) {
      const send = this.ctx.createGain();
      send.gain.value = def.reverb;
      node.connect(send).connect(this.reverbBus);
    }
    src.start(now + delay);
  }
}
