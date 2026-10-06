// Tela de título (vem no pacote de boot, sem three.js): aparece em < 1 s enquanto o motor baixa por trás.
//   JOGAR            luta rápida em 1 toque (último lutador ou sorteio x CPU sorteada)
//   ESCOLHER LUTADOR tela de seleção completa (modo 2 jogadores fica lá)
//   dificuldade e gráficos (salvos), placar de vitórias/sequência
// Enquanto o jogo não terminou de carregar, a linha embaixo do menu anda e o JOGAR fica "na fila" (começa sozinho quando ficar pronto).
// Identidade (docs/UI_DIRECAO.md): logo em imagem, menu em lista com cursor (setas/Enter, toque, mouse), faixa de manchetes
// no topo (plantão), cenário 3D vivo aparece por trás quando o jogo termina de carregar.
import { getPrefs, setPrefs, getStats } from '../platform/storage.js';
import { quality, TIERS } from '../platform/quality.js';
import { ICON } from './icons.js';

const LEVELS = [['easy', 'FÁCIL'], ['normal', 'NORMAL'], ['hard', 'DIFÍCIL']];
// manchetes fictícias da faixa de plantão (sátira; nada é notícia real)
const HEADLINES = [
  'PLANTÃO: sessão extraordinária vira ringue', 'URGENTE: picanha do povo derruba motociata', 'CPI do golpe baixo instalada no plenário',
  'ÚLTIMA HORA: canetada anula round inteiro', 'ANÁLISE: quem leva o cinturão da República?', 'ENQUETE: torcida pede revanche ainda hoje',
];

export class TitleScreen {
  constructor(root, { onPlay, onChoose }) {
    this.onPlay = onPlay; this.onChoose = onChoose;
    this.ready = false; this.queued = null;
    this.el = document.createElement('div');
    this.el.className = 'title hidden';
    root.appendChild(this.el);
    this.render();
    // menu por teclado/controle: setas andam entre as opções, Enter/Espaço ativam (botão nativo)
    addEventListener('keydown', (e) => {
      if (!this.visible || e.repeat) return;
      const items = [...this.el.querySelectorAll('.mbtn, .chip')];
      // Enter/Espaço sem nada focado = ativa a opção sob o cursor ("press start")
      if ((e.key === 'Enter' || e.key === ' ') && !this.el.contains(document.activeElement)) { e.preventDefault(); this.el.querySelector('.hot')?.click(); return; }
      const d = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!d || !items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      items[(i < 0 ? (d > 0 ? 0 : items.length - 1) : (i + d + items.length) % items.length)].focus({ preventScroll: true });
    });
  }

  render() {
    const prefs = getPrefs(), st = getStats();
    const lv = LEVELS.find(([k]) => k === prefs.level) || LEVELS[1];
    const q = prefs.quality === 'auto' ? `AUTO · ${TIERS[quality.tier].label}` : TIERS[prefs.quality]?.label || 'AUTO';
    const ticker = HEADLINES.map((h) => `<span>${h}</span>`).join('');
    const focused = document.activeElement?.className;
    this.el.innerHTML = `
      <div class="tticker" aria-hidden="true"><div class="ttrack">${ticker}${ticker}</div></div>
      <div class="tbody">
        <div class="tlogo">
          <img src="assets/ui/logo.webp" srcset="assets/ui/logo_s.webp 512w, assets/ui/logo.webp 1024w" sizes="(max-width: 700px) 86vw, 520px" alt="República Kombat" decoding="async" fetchpriority="high" />
        </div>
        <div class="tsub">O ringue da política nacional</div>
        ${this.challenge ? `<div class="tchallenge"><small>Desafio recebido</small><b>${this.challenge}</b></div>` : ''}
        <nav class="tmenu" aria-label="Menu principal">
          <button class="mbtn primary tplay"><i class="cur">${ICON.caret}</i><span class="mlabel">${this.challenge ? 'ACEITAR DESAFIO' : 'JOGAR'}</span><em class="mhint">${this.challenge ? 'luta rápida contra o desafiante' : 'luta rápida · 1 toque'}</em></button>
          <button class="mbtn tchoose"><i class="cur">${ICON.caret}</i><span class="mlabel">ESCOLHER LUTADOR</span><em class="mhint">elenco completo · cenário · 2 jogadores</em></button>
        </nav>
        <div class="tload ${this.ready ? 'done' : ''}"><i style="width:${Math.round((this.progress || 0.05) * 100)}%"></i><em>${this.ready ? '' : this.msg || 'Carregando'}</em></div>
        <div class="topts">
          <button class="chip tlevel" title="Dificuldade da CPU"><small>CPU</small><b>${lv[1]}</b></button>
          <button class="chip tqual" title="Qualidade gráfica"><small>Gráficos</small><b>${q}</b></button>
        </div>
        ${st.played ? `<div class="tstats"><span><small>Vitórias</small><b>${st.wins}</b></span><span><small>Sequência</small><b>${st.streak}</b></span><span><small>Recorde</small><b>${st.best}</b></span></div>` : ''}
      </div>
      <div class="tfoot"><span class="disclaimer">Obra de ficção e sátira. Personagens são caricaturas.</span></div>`;
    this.el.querySelector('.tplay').onclick = () => this.go('play');
    this.el.querySelector('.tchoose').onclick = () => this.go('choose');
    this.el.querySelector('.tlevel').onclick = () => {
      const i = (LEVELS.findIndex(([k]) => k === getPrefs().level) + 1) % LEVELS.length;
      setPrefs({ level: LEVELS[i][0] }); this.render(); this.el.querySelector('.tlevel').focus({ preventScroll: true });
    };
    this.el.querySelector('.tqual').onclick = () => { quality.cycle(); this.render(); this.el.querySelector('.tqual').focus({ preventScroll: true }); };
    // cursor do menu (.hot): segue o foco de teclado/controle e o mouse/toque; começa no JOGAR
    const items = [...this.el.querySelectorAll('.mbtn, .chip')];
    const hot = (b) => { for (const x of items) x.classList.toggle('hot', x === b); };
    for (const b of items) {
      b.addEventListener('focus', () => hot(b));
      b.addEventListener('pointerenter', () => { hot(b); });
    }
    hot(this.el.querySelector(focused?.includes('tchoose') ? '.tchoose' : '.tplay'));
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
    this.el.classList.add('live'); // cenário 3D já desenha por trás: o fundo abre
    if (this.queued) { const q = this.queued; this.queued = null; this.go(q); }
  }
  setChallenge(text) { this.challenge = text; this.render(); }
  show() { this.el.classList.remove('hidden'); this.render(); }
  hide() { this.el.classList.add('hidden'); }
  get visible() { return !this.el.classList.contains('hidden'); }
}
