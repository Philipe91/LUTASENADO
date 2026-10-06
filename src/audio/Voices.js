// Vozes dos lutadores: gritos/interjeições de ARQUÉTIPO genérico (senhor rouco, grave autoritário, jovem animado...).
// Nunca imitam a voz de pessoa real — ver public/assets/audio/voices/CREDITOS.md e tools/voices/gen_voices.py.
//
// Dados: personagem.audio.voice = { set: '<arquétipo>', pitch: 1.0 }  (pasta public/assets/audio/voices/<set>/<evento>_<n>.ogg|mp3)
// Carrega SÓ os arquétipos dos 2 lutadores da luta (load(ids)); só pede arquivo que está no catálogo (exists → sem 404).
// Toca pelo mixer do AudioEngine (barramento de SFX: volume de efeitos e mudo valem), uma voz por lutador por vez:
// voz nova de prioridade menor que a que está tocando é descartada; maior/igual corta a anterior.
import { exists } from '../platform/assets.js';
import { getCharacter } from '../data/characters/index.js';

export const VOICE_EVENTS = ['attack', 'hurt', 'jump', 'special', 'ultimate', 'ko', 'win', 'lose', 'taunt'];
const DIR = 'assets/audio/voices';
const MAX_VARIANTS = 6;
export const DEFAULT_VOICE = { set: 'meia_idade_calmo', pitch: 1 };

export function voiceOf(charOrId) {
  const c = typeof charOrId === 'string' ? getCharacter(charOrId) : charOrId;
  const v = c?.audio?.voice;
  return { set: v?.set || DEFAULT_VOICE.set, pitch: v?.pitch || 1 };
}

// formato: Opus em OGG onde o navegador decodifica; senão MP3 (Safari antigo)
function pickExt() {
  try {
    const a = typeof Audio !== 'undefined' ? new Audio() : null;
    if (a && a.canPlayType('audio/ogg; codecs="opus"')) return 'ogg';
  } catch { /* sem Audio */ }
  return 'mp3';
}

// arquivos de um arquétipo que existem no catálogo: { evento: [url, ...] }
export function filesOf(set, ext = 'ogg') {
  const out = {};
  for (const ev of VOICE_EVENTS) {
    const list = [];
    for (let n = 1; n <= MAX_VARIANTS; n++) {
      const u = `${DIR}/${set}/${ev}_${n}.${ext}`;
      if (exists(u)) list.push(u);
    }
    if (list.length) out[ev] = list;
  }
  return out;
}

export class VoiceBank {
  constructor(engine) {
    this.engine = engine;
    this.ext = pickExt();
    this.raw = new Map();     // url → Promise<ArrayBuffer>
    this.buffers = new Map(); // url → AudioBuffer
    this.decoding = new Map();
    this.sets = new Map();    // set → { evento: [url] }
    this.playing = new Map(); // chave do lutador → { src, priority, end }
    this.lastIdx = new Map(); // set/evento → último índice (não repete a mesma variação seguida)
    this.played = 0;
    this.volume = 0.9;
    engine.onUnlock?.(() => this.decodeAll());
  }

  // baixa (e decodifica, se o áudio já foi liberado) as vozes dos lutadores informados
  load(ids) {
    if (!this.engine.available) return Promise.resolve();
    const jobs = [];
    for (const id of ids) {
      const { set } = voiceOf(id);
      if (!this.sets.has(set)) {
        let files = filesOf(set, this.ext);
        if (!Object.keys(files).length && this.ext !== 'mp3') files = filesOf(set, 'mp3');
        this.sets.set(set, files);
      }
      for (const list of Object.values(this.sets.get(set))) for (const u of list) jobs.push(this.fetch(u));
    }
    return Promise.all(jobs).then(() => this.decodeAll());
  }

  fetch(url) {
    if (!this.raw.has(url)) {
      this.raw.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null));
    }
    return this.raw.get(url);
  }

  decodeAll() {
    const ctx = this.engine.ctx;
    if (!ctx) return Promise.resolve();
    return Promise.all([...this.raw.keys()].map((u) => this.decode(u)));
  }

  decode(url) {
    const ctx = this.engine.ctx;
    if (!ctx || this.buffers.has(url)) return Promise.resolve(this.buffers.get(url));
    if (!this.decoding.has(url)) {
      this.decoding.set(url, this.raw.get(url).then((ab) => {
        if (!ab) return null;
        // decodeAudioData "consome" o ArrayBuffer: decodifica uma cópia
        return new Promise((res) => ctx.decodeAudioData(ab.slice(0), res, () => res(null)));
      }).then((buf) => { if (buf) this.buffers.set(url, buf); return buf; }).catch(() => null));
    }
    return this.decoding.get(url);
  }

  // escolhe uma variação (não repete a última)
  pick(set, event) {
    const list = this.sets.get(set)?.[event];
    if (!list?.length) return null;
    const key = set + '/' + event;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.lastIdx.get(key)) i = (i + 1) % list.length;
    this.lastIdx.set(key, i);
    return list[i];
  }

  // key: identifica o lutador (1 voz por vez); voice: { set, pitch }
  play(key, voice, event, { priority = 1, pan = 0, delay = 0, vol = 1 } = {}) {
    const eng = this.engine;
    if (!eng.running || eng.muted) return false;
    const url = this.pick(voice.set, event);
    const buf = url && this.buffers.get(url);
    if (!buf) return false;
    const ctx = eng.ctx, now = ctx.currentTime, start = now + delay;
    const cur = this.playing.get(key);
    if (cur && cur.end > start) {
      if (priority < cur.priority) return false;
      try { cur.gain.gain.setTargetAtTime(0, start, 0.015); cur.src.stop(start + 0.06); } catch { /* já parou */ }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const rate = (voice.pitch || 1) * (1 + (Math.random() * 2 - 1) * 0.04); // ±4%
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = this.volume * vol;
    let node = src.connect(g);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node = node.connect(p);
    }
    node.connect(eng.sfxBus);
    if (eng.reverbBus) { const s = ctx.createGain(); s.gain.value = 0.12; node.connect(s).connect(eng.reverbBus); }
    src.start(start);
    const end = start + buf.duration / rate;
    this.playing.set(key, { src, gain: g, priority, end });
    src.onended = () => { if (this.playing.get(key)?.src === src) this.playing.delete(key); };
    // ducking leve da música (não desfaz um duck mais forte de KO/ultimate em andamento)
    const dg = eng.duckGain?.gain;
    if (dg && dg.value > 0.75) eng.duck(0.75, Math.min(1.2, buf.duration / rate + 0.1));
    this.played++;
    return true;
  }
}
