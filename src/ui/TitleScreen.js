// Tela de título (vem no pacote de boot, sem three.js): aparece em < 1 s enquanto o motor baixa por trás.
//   JOGAR            luta rápida em 1 toque (último lutador ou sorteio x CPU sorteada)
//   ESCOLHER LUTADOR tela de seleção completa (modo 2 jogadores fica lá)
//   dificuldade e gráficos (salvos), placar de vitórias/sequência
// Enquanto o jogo não terminou de carregar, a barra embaixo anda e o JOGAR fica "na fila" (começa sozinho quando ficar pronto).
import { getPrefs, setPrefs, getStats } from '../platform/storage.js';
import { quality, TIERS } from '../platform/quality.js';

const LEVELS = [['easy', 'FÁCIL'], ['normal', 'NORMAL'], ['hard', 'DIFÍCIL']];

export class TitleScreen {
  constructor(root, { onPlay, onChoose }) {
    this.onPlay = onPlay; this.onChoose = onChoose;
    this.ready = false; this.queued = null;
    this.el = document.createElement('div');
    this.el.className = 'title hidden';
    root.appendChild(this.el);
    this.render();
  }

  render() {
    const prefs = getPrefs(), st = getStats();
    const lv = LEVELS.find(([k]) => k === prefs.level) || LEVELS[1];
    const q = prefs.quality === 'auto' ? `AUTO (${TIERS[quality.tier].label})` : TIERS[prefs.quality]?.label || 'AUTO';
    this.el.innerHTML = `
      <div class="logo">REPÚBLICA <span>KOMBAT</span></div>
      <div class="tsub">O ringue da política nacional</div>
      ${this.challenge ? `<div class="tchallenge">DESAFIO: <b>${this.challenge}</b></div>` : ''}
      <div class="tmain">
        <button class="tplay"><span>${this.challenge ? 'ACEITAR DESAFIO' : 'JOGAR'}</span></button>
        <button class="tchoose"><span>ESCOLHER LUTADOR</span></button>
      </div>
      <div class="tload ${this.ready ? 'done' : ''}"><i style="width:${Math.round((this.progress || 0.05) * 100)}%"></i><em>${this.ready ? '' : this.msg || 'Carregando…'}</em></div>
      <div class="topts">
        <button class="tlevel" title="Dificuldade da CPU">CPU: <b>${lv[1]}</b></button>
        <button class="tqual" title="Qualidade gráfica">GRÁFICOS: <b>${q}</b></button>
      </div>
      ${st.played ? `<div class="tstats"><span>VITÓRIAS <b>${st.wins}</b></span><span>SEQUÊNCIA <b>${st.streak}</b></span><span>RECORDE <b>${st.best}</b></span></div>` : ''}
      <div class="disclaimer">Obra de ficção e sátira. Personagens são caricaturas.</div>`;
    this.el.querySelector('.tplay').onclick = () => this.go('play');
    this.el.querySelector('.tchoose').onclick = () => this.go('choose');
    this.el.querySelector('.tlevel').onclick = () => {
      const i = (LEVELS.findIndex(([k]) => k === getPrefs().level) + 1) % LEVELS.length;
      setPrefs({ level: LEVELS[i][0] }); this.render();
    };
    this.el.querySelector('.tqual').onclick = () => { quality.cycle(); this.render(); };
  }

  go(what) {
    if (!this.ready) { this.queued = what; this.el.querySelector('.tplay').classList.toggle('wait', what === 'play'); return; }
    this.hide();
    (what === 'play' ? this.onPlay : this.onChoose)();
  }
  setProgress(p, msg) {
    this.progress = p; this.msg = msg;
    const bar = this.el.querySelector('.tload i'), em = this.el.querySelector('.tload em');
    if (bar) bar.style.width = `${Math.round(p * 100)}%`;
    if (em && msg) em.textContent = msg;
  }
  setReady() {
    this.ready = true;
    this.el.querySelector('.tload')?.classList.add('done');
    if (this.queued) { const q = this.queued; this.queued = null; this.go(q); }
  }
  setChallenge(text) { this.challenge = text; this.render(); }
  show() { this.el.classList.remove('hidden'); this.render(); }
  hide() { this.el.classList.add('hidden'); }
  get visible() { return !this.el.classList.contains('hidden'); }
}
