// Locutor: voz sintética GENÉRICA do sistema (speechSynthesis) em pt-BR. Nunca imita voz real.
// Fallback silencioso: sem API, sem voz em português ou mudo → não fala nada (e não dá erro).
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const Utter = typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null;

export class Announcer {
  constructor({ muted = false } = {}) {
    this.muted = muted;
    this.voice = null;
    this.volume = 1;
    this.busyUntil = 0;
    this.priority = 0;
    this.available = !!(synth && Utter);
    if (!this.available) return;
    this.pickVoice();
    synth.addEventListener?.('voiceschanged', () => this.pickVoice());
  }

  pickVoice() {
    const voices = synth.getVoices() || [];
    const pt = voices.filter((v) => /^pt/i.test(v.lang));
    // prefere pt-BR; entre elas, vozes masculinas/"locutor" conhecidas, senão a primeira
    const br = pt.filter((v) => /pt[-_]BR/i.test(v.lang));
    const pool = br.length ? br : pt;
    this.voice = pool.find((v) => /daniel|antonio|ant[oô]nio|felipe|male|masculin/i.test(v.name)) || pool[0] || null;
  }

  // gesto do usuário: alguns navegadores (iOS) só liberam a fala se a primeira chamada vier de um toque
  unlock() {
    if (!this.available || this.warmed) return;
    this.warmed = true;
    try { const u = new Utter(' '); u.volume = 0; u.lang = 'pt-BR'; synth.speak(u); } catch { /* sem fala */ }
  }

  setMuted(m) { this.muted = m; if (m && this.available) synth.cancel(); }

  // priority: 3 = KO/ultimate/vitória interrompe o que estiver falando; menor que a atual é descartada
  say(text, { priority = 1 } = {}) {
    if (!this.available || this.muted || !this.voice || !text) return;
    const now = performance.now();
    const speaking = now < this.busyUntil;
    if (speaking && priority < this.priority) return;
    if (speaking) synth.cancel();
    try {
      const u = new Utter(text);
      u.voice = this.voice;
      u.lang = this.voice.lang || 'pt-BR';
      u.rate = 1.08; u.pitch = 0.75; u.volume = this.volume;
      u.onend = u.onerror = () => { this.busyUntil = 0; };
      synth.speak(u);
      this.priority = priority;
      this.busyUntil = now + 400 + text.length * 90;
    } catch { /* fallback silencioso */ }
  }
}
