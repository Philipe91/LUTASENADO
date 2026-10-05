// Tela de seleção montada a partir do registro de personagens (personagem novo aparece sozinho).
// Grade compacta de "figuras de ação" (retrato ou inicial + paleta) para N lutadores + painel com os golpes dos dois
// escolhidos. Colunas: até 6 lutadores = 1 fileira; mais = 2 fileiras (9 → 5 colunas); celular em retrato = 3 colunas (CSS).
// opts: initial {p1,p2,mode,arena} (preferências salvas) · isLocked(id) · onUnlock(id) → Promise<bool> (anúncio com
// recompensa) · onPick(cfg) (salva + pré-busca os GLBs) · onBack() (volta ao título)
// · arenas [{id,name,sub}] (cartões de cenário; 'random' = sorteio a cada luta) · arenaLocked (a URL ?arena= manda)
// Cenário: clique/toque no cartão, Tab + Enter/Espaço, ou C (próximo) / Shift+C (anterior).
import { CHARACTERS, getCharacter } from '../data/characters/index.js';
import { portrait, hex } from './portraits.js';

export class SelectScreen {
  constructor(root, onStart, opts = {}) {
    this.onStart = onStart;
    this.opts = opts;
    const free = (id) => id && CHARACTERS.some((c) => c.id === id) && !opts.isLocked?.(id);
    this.p1 = free(opts.initial?.p1) ? opts.initial.p1 : CHARACTERS[0].id;
    this.p2 = free(opts.initial?.p2) ? opts.initial.p2 : CHARACTERS[1].id;
    this.mode = opts.initial?.mode === '2p' ? '2p' : 'cpu';
    this.arenas = opts.arenas || [];
    this.arena = this.arenas.some((a) => a.id === opts.initial?.arena) ? opts.initial.arena : this.arenas[0]?.id;
    addEventListener('keydown', (e) => {
      if (!this.visible || e.code !== 'KeyC' || e.repeat || !this.arenas.length || this.opts.arenaLocked) return;
      const i = this.arenas.findIndex((a) => a.id === this.arena), n = this.arenas.length;
      this.setArena(this.arenas[(i + (e.shiftKey ? n - 1 : 1)) % n].id, true);
    });
    this.picking = 1;
    this.asking = null;
    this.el = document.createElement('div');
    this.el.className = 'select';
    root.appendChild(this.el);
    this.render();
  }

  // painel de um lutador escolhido: passiva, 3 especiais e ultimate
  pickPanel(id, who, cls) {
    const c = getCharacter(id), sp = c.specials || {}, P = c.visual?.placeholder || {};
    return `
      <div class="pick ${cls}" style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
        <div class="pwho">${who}</div>
        <div class="pname">${c.name}</div>
        <div class="ptitle">${c.title} · <span>${c.archetype}</span></div>
        <ul>
          <li><em>PASSIVA</em> ${c.passive?.name ?? '-'}<small>${c.passive?.desc ?? ''}</small></li>
          <li><em>ESP</em> ${sp.neutral?.name ?? '-'}</li>
          <li><em>→ ESP</em> ${sp.forward?.name ?? '-'}</li>
          <li><em>↓ ESP</em> ${sp.down?.name ?? '-'}</li>
          <li class="ult"><em>★ ULT</em> ${c.ultimate?.name ?? '-'}</li>
        </ul>
      </div>`;
  }

  picked() { this.opts.onPick?.(this.cfg()); }
  cfg() { return { p1: this.p1, p2: this.p2, mode: this.mode, ...(this.arena ? { arena: this.arena } : {}) }; }
  setArena(id, focus = false) {
    this.arena = id;
    this.picked();
    this.render();
    if (focus) this.el.querySelector(`.arena[data-arena="${id}"]`)?.focus({ preventScroll: true });
  }

  // fileira de cartões de cenário (radiogroup: setas também navegam quando um cartão tem o foco)
  arenaRow() {
    if (!this.arenas.length) return '';
    const locked = this.opts.arenaLocked;
    const cards = this.arenas.map((a) => `
      <button class="arena a-${a.id} ${a.id === this.arena ? 'on' : ''}" data-arena="${a.id}" role="radio" aria-checked="${a.id === this.arena}"
        ${locked ? 'disabled' : ''} tabindex="${a.id === this.arena ? 0 : -1}" title="${a.name} (${a.sub})">
        <span class="athumb"></span><span class="aname">${a.name}</span><span class="asub">${a.sub}</span>
      </button>`).join('');
    return `<div class="arenas" role="radiogroup" aria-label="Cenário"><div class="alabel">CENÁRIO${locked ? ' <small>(URL)</small>' : ' <small>C troca</small>'}</div>${cards}</div>`;
  }
  choose(id) {
    if (this.picking === 1) { this.p1 = id; this.picking = 2; }
    else { this.p2 = id; this.picking = 1; }
    this.picked();
  }

  render() {
    const n = CHARACTERS.length;
    const cols = n <= 6 ? n : Math.ceil(n / 2); // 6 → 1 fileira; 9 → 5 + 4 (retrato: 3 colunas via CSS)
    const cards = CHARACTERS.map((c) => {
      const P = c.visual?.placeholder || {};
      const locked = this.opts.isLocked?.(c.id);
      const tag = [this.p1 === c.id ? '<span class="tag t1">P1</span>' : '', this.p2 === c.id ? `<span class="tag t2">${this.mode === 'cpu' ? 'CPU' : 'P2'}</span>` : ''].join('');
      return `
        <button class="char ${this.p1 === c.id ? 'sel1' : ''} ${this.p2 === c.id ? 'sel2' : ''} ${locked ? 'locked' : ''}" data-id="${c.id}" title="${c.title}"
          style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
          ${tag}${locked ? '<span class="padlock">BLOQUEADO</span>' : ''}
          <div class="cardTop"><span class="ini">${c.name[0]}</span></div>
          <div class="cname">${c.name}</div>
          <div class="carch">${c.archetype}</div>
        </button>`;
    }).join('');
    const p2who = this.mode === 'cpu' ? 'ADVERSÁRIO (CPU)' : 'JOGADOR 2';
    const ask = this.asking ? getCharacter(this.asking) : null;
    this.el.innerHTML = `
      ${this.opts.onBack ? '<button class="sback" title="Voltar"><span>‹ VOLTAR</span></button>' : ''}
      <div class="logo">REPÚBLICA <span>KOMBAT</span></div>
      ${ask ? `<div class="unlockAsk"><div><b>${ask.name}</b> está bloqueado.</div>
        <div class="usub">Assista a um anúncio para liberar nesta sessão, ou vença uma luta contra a CPU para liberar de vez.</div>
        <div class="btns"><button class="uwatch"><span>ASSISTIR ANÚNCIO</span></button><button class="menu uno"><span>AGORA NÃO</span></button></div></div>` : ''}
      <div class="pickhint ${this.picking === 2 ? 'two' : ''}">Escolhendo: <b>${this.picking === 1 ? 'JOGADOR 1' : p2who}</b> · ${n} lutadores</div>
      <div class="grid" style="--cols:${cols}">${cards}</div>
      <div class="picks">${this.pickPanel(this.p1, 'JOGADOR 1', 'one')}<div class="vs">VS</div>${this.pickPanel(this.p2, p2who, 'two')}</div>
      ${this.arenaRow()}
      <div class="opts">
        <button class="mode"><span>${this.mode === 'cpu' ? '1 JOGADOR vs CPU' : '2 JOGADORES (mesmo teclado)'}</span></button>
        <button class="go"><span>LUTAR!</span></button>
      </div>
      <div class="keys">
        <div><b>P1</b> A/D andar · W pular · S agachar · J soco · K chute · L especial (+ direção) · U ultimate · segurar pra trás = defender</div>
        <div><b>P2</b> setas · 1 soco · 2 chute · 3 especial · 0 ultimate (teclado numérico)</div>
        <div><b>C</b> troca o cenário · <b>Enter</b> luta</div>
      </div>
      <div class="disclaimer">Obra de ficção e sátira. Personagens são caricaturas.</div>`;
    this.el.querySelectorAll('.char').forEach((b) => {
      const top = b.querySelector('.cardTop');
      portrait(b.dataset.id, (url) => { top.style.backgroundImage = `url(${url})`; top.querySelector('.ini').textContent = ''; });
      b.onclick = () => {
        if (this.opts.isLocked?.(b.dataset.id)) { this.asking = b.dataset.id; this.render(); return; }
        this.choose(b.dataset.id);
        this.render();
      };
    });
    if (this.opts.onBack) this.el.querySelector('.sback').onclick = () => this.opts.onBack();
    if (ask) {
      this.el.querySelector('.uno').onclick = () => { this.asking = null; this.render(); };
      this.el.querySelector('.uwatch').onclick = async (e) => {
        e.currentTarget.disabled = true;
        const ok = await this.opts.onUnlock?.(ask.id);
        this.asking = null;
        if (ok) this.choose(ask.id);
        this.render();
      };
    }
    this.el.querySelector('.mode').onclick = () => { this.mode = this.mode === 'cpu' ? '2p' : 'cpu'; this.picked(); this.render(); };
    this.el.querySelector('.go').onclick = () => this.start();
    this.el.querySelectorAll('.arena').forEach((b) => {
      b.onclick = () => this.setArena(b.dataset.arena, true);
      b.onkeydown = (e) => { // setas andam entre os cartões (padrão de radiogroup)
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const i = this.arenas.findIndex((a) => a.id === b.dataset.arena), n = this.arenas.length;
        this.setArena(this.arenas[(i + d + n) % n].id, true);
      };
    });
  }

  start() { this.onStart(this.cfg()); }
  show() { this.el.classList.remove('hidden'); this.render(); }
  hide() { this.el.classList.add('hidden'); }
  get visible() { return !this.el.classList.contains('hidden'); }
}
