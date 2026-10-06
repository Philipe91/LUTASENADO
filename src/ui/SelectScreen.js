// Tela de seleção montada a partir do registro de personagens (personagem novo aparece sozinho).
// Layout "jogo grande" (docs/UI_DIRECAO.md §5.3): ficha do Jogador 1 à esquerda (retrato grande, nome enorme, arquétipo,
// barras de atributos, golpes), grade de retratos no centro, ficha do adversário à direita; cenário + LUTAR no rodapé.
// Em retrato (celular) as duas fichas viram uma fileira compacta em cima e a grade tem 4 colunas.
// opts: initial {p1,p2,mode,arena} (preferências salvas) · isLocked(id) · onUnlock(id) → Promise<bool> (anúncio com
// recompensa) · onPick(cfg) (salva + pré-busca os GLBs) · onBack() (volta ao título) · sfx(nome) (sons de UI, opcional)
// · arenas [{id,name,sub}] (cartões de cenário; 'random' = sorteio a cada luta) · arenaLocked (a URL ?arena= manda)
// Teclado/controle: setas andam na grade, Enter escolhe, C / Shift+C trocam o cenário, Esc volta, Enter fora da grade = LUTAR.
import { CHARACTERS, getCharacter } from '../data/characters/index.js';
import { portrait, hex } from './portraits.js';
import { ICON } from './icons.js';

// atributos mostrados em barras (normalizados pelo elenco: o mais fraco ≈ 25 %, o mais forte = 100 %)
const STATS = [
  ['VIDA', (c) => c.stats.hp, ICON.heart], ['VELOCIDADE', (c) => c.stats.walk, ICON.run], ['PULO', (c) => c.stats.jump, ICON.jump],
  ['FORÇA', (c) => c.stats.damage ?? 1, ICON.bolt], ['BARRA', (c) => c.stats.meterGain ?? 1, ICON.star],
];
const ARENA_ICON = { brasilia: ICON.sun, noite: ICON.moon, plenario: ICON.dome, random: ICON.dice };

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
    this.range = STATS.map(([, get]) => { const v = CHARACTERS.map(get); return [Math.min(...v), Math.max(...v)]; });
    addEventListener('keydown', (e) => this.onKey(e));
    this.picking = 1;
    this.asking = null;
    this.cursor = this.p1; // retrato sob o cursor (foco/mouse): a ficha de quem está escolhendo mostra ele
    this.el = document.createElement('div');
    this.el.className = 'select';
    root.appendChild(this.el);
    this.render();
  }

  sfx(name) { this.opts.sfx?.(name); }

  onKey(e) {
    if (!this.visible || e.repeat) return;
    if (e.code === 'KeyC' && this.arenas.length && !this.opts.arenaLocked) {
      const i = this.arenas.findIndex((a) => a.id === this.arena), n = this.arenas.length;
      this.setArena(this.arenas[(i + (e.shiftKey ? n - 1 : 1)) % n].id, true);
      return;
    }
    // setas: andam na grade (quando o foco não está num cartão de cenário, que tem o próprio radiogroup)
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 'down', ArrowUp: 'up' }[e.key];
    if (!d || e.target?.closest?.('.arena') || this.asking) return;
    const cards = [...this.el.querySelectorAll('.char')];
    const cols = Number(getComputedStyle(this.el.querySelector('.grid')).getPropertyValue('--cols-now')) || Number(this.el.querySelector('.grid').style.getPropertyValue('--cols')) || 5;
    let i = cards.indexOf(document.activeElement);
    if (i < 0) i = cards.findIndex((c) => c.dataset.id === this.cursor);
    e.preventDefault();
    const n = cards.length;
    let j = typeof d === 'number' ? (i + d + n) % n : d === 'down' ? i + cols : i - cols;
    if (j < 0 || j >= n) { j = d === 'down' ? j % cols : Math.min(n - 1, (Math.floor((n - 1) / cols)) * cols + (i % cols)); }
    cards[j]?.focus({ preventScroll: true });
    cards[j]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  // ficha de um lutador escolhido: retrato grande, nome, arquétipo, atributos, passiva, 3 especiais e ultimate
  pickPanel(id, who, cls) {
    const c = getCharacter(id), sp = c.specials || {}, P = c.visual?.placeholder || {};
    const bars = STATS.map(([label, get, icon], k) => {
      const [lo, hi] = this.range[k], v = get(c);
      const pct = hi > lo ? 25 + 75 * (v - lo) / (hi - lo) : 70;
      return `<li><em>${icon}${label}</em><i><b style="width:${pct.toFixed(0)}%"></b></i></li>`;
    }).join('');
    return `
      <aside class="pick ${cls}" style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
        <div class="pwho"><b>${who}</b></div>
        <div class="pportrait" data-id="${c.id}"><span class="ini">${c.name[0]}</span></div>
        <div class="pname">${c.name}</div>
        <div class="ptitle">${c.title}</div>
        <div class="parch">${c.archetype}</div>
        <ul class="pstats">${bars}</ul>
        <ul class="pmoves">
          <li class="pas"><em>PASSIVA</em><span>${c.passive?.name ?? '-'}</span><small>${c.passive?.desc ?? ''}</small></li>
          <li><em>ESP</em><span>${sp.neutral?.name ?? '-'}</span></li>
          <li><em>→ ESP</em><span>${sp.forward?.name ?? '-'}</span></li>
          <li><em>↓ ESP</em><span>${sp.down?.name ?? '-'}</span></li>
          <li class="ult"><em>ULT</em><span>${c.ultimate?.name ?? '-'}</span></li>
        </ul>
      </aside>`;
  }

  picked() { this.opts.onPick?.(this.cfg()); }
  cfg() { return { p1: this.p1, p2: this.p2, mode: this.mode, ...(this.arena ? { arena: this.arena } : {}) }; }
  setArena(id, focus = false) {
    if (id !== this.arena) this.sfx('paper');
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
        <span class="athumb">${ARENA_ICON[a.id] || ICON.dome}</span><span class="aname">${a.name}</span><span class="asub">${a.sub}</span>
      </button>`).join('');
    return `<div class="arenas" role="radiogroup" aria-label="Cenário"><div class="alabel">Cenário${locked ? '<small>fixado pela URL</small>' : '<small>C troca</small>'}</div><div class="alist">${cards}</div></div>`;
  }
  choose(id) {
    if (this.picking === 1) { this.p1 = id; this.picking = 2; }
    else { this.p2 = id; this.picking = 1; }
    this.cursor = id;
    this.sfx('stamp');
    this.picked();
  }

  render() {
    const n = CHARACTERS.length;
    const cols = n <= 6 ? n : Math.min(5, Math.ceil(n / 2)); // 13 → 5 colunas (3 fileiras); retrato = 4 colunas (CSS)
    const p2who = this.mode === 'cpu' ? 'CPU' : 'JOGADOR 2';
    const cards = CHARACTERS.map((c) => {
      const P = c.visual?.placeholder || {};
      const locked = this.opts.isLocked?.(c.id);
      const tag = [this.p1 === c.id ? '<span class="tag t1">1P</span>' : '', this.p2 === c.id ? `<span class="tag t2">${this.mode === 'cpu' ? 'CPU' : '2P'}</span>` : ''].join('');
      return `
        <button class="char ${this.p1 === c.id ? 'sel1' : ''} ${this.p2 === c.id ? 'sel2' : ''} ${locked ? 'locked' : ''}" data-id="${c.id}" title="${c.title}" aria-label="${c.name}${locked ? ' (bloqueado)' : ''}"
          style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
          <span class="cpic"><span class="ini">${c.name[0]}</span></span>
          <span class="cname">${c.name}</span>
          ${tag}${locked ? `<span class="padlock">${ICON.lock}</span>` : ''}
        </button>`;
    }).join('');
    const ask = this.asking ? getCharacter(this.asking) : null;
    // a ficha do lado que está escolhendo mostra quem está sob o cursor (pré-visualização), como nos jogos grandes
    const show1 = this.picking === 1 && this.cursor ? this.cursor : this.p1;
    const show2 = this.picking === 2 && this.cursor ? this.cursor : this.p2;
    this.el.innerHTML = `
      <header class="shead">
        ${this.opts.onBack ? `<button class="sback" title="Voltar (Esc)">${ICON.back}<span>Voltar</span></button>` : '<span></span>'}
        <div class="stitle"><small class="kicker ${this.picking === 2 ? 'two' : ''}">Escolhendo <b>${this.picking === 1 ? 'JOGADOR 1' : p2who}</b> · ${n} lutadores</small><h1>Seleção de lutador</h1></div>
        <button class="chip mode" title="Modo de jogo"><small>Modo</small><b>${this.mode === 'cpu' ? `${ICON.cpu} 1P vs CPU` : `${ICON.users} 2 jogadores`}</b></button>
      </header>
      ${ask ? `<div class="unlockAsk" role="dialog"><div class="ulock">${ICON.lock}</div><div class="utit"><b>${ask.name}</b> está bloqueado</div>
        <div class="usub">Assista a um anúncio para liberar nesta sessão, ou vença uma luta contra a CPU para liberar de vez.</div>
        <div class="btns"><button class="mbtn primary uwatch"><i class="cur">${ICON.caret}</i><span class="mlabel">ASSISTIR ANÚNCIO</span></button><button class="mbtn uno"><i class="cur">${ICON.caret}</i><span class="mlabel">AGORA NÃO</span></button></div></div>` : ''}
      ${this.pickPanel(show1, 'Jogador 1', 'one')}
      <div class="grid" style="--cols:${cols}" role="listbox" aria-label="Lutadores">${cards}</div>
      ${this.pickPanel(show2, p2who === 'CPU' ? 'Adversário · CPU' : 'Jogador 2', 'two')}
      <footer class="sfoot">${this.arenaRow()}
        <div class="opts"><button class="go"><span>LUTAR</span>${ICON.play}</button></div>
      </footer>
      <div class="keys">
        <span><b>P1</b> A/D anda · W pula · S agacha · J soco · K chute · L especial (+direção) · U ultimate · segurar para trás defende</span>
        <span><b>P2</b> setas · 1 soco · 2 chute · 3 especial · 0 ultimate</span>
        <span><b>C</b> cenário · <b>Enter</b> luta</span>
      </div>
      <div class="disclaimer">Obra de ficção e sátira. Personagens são caricaturas.</div>`;
    for (const pic of this.el.querySelectorAll('.pportrait')) portrait(pic.dataset.id, (url) => { pic.style.backgroundImage = `url(${url})`; pic.querySelector('.ini').textContent = ''; });
    this.el.querySelectorAll('.char').forEach((b) => {
      const top = b.querySelector('.cpic');
      portrait(b.dataset.id, (url) => { top.style.backgroundImage = `url(${url})`; top.querySelector('.ini').textContent = ''; });
      b.onclick = () => {
        if (this.opts.isLocked?.(b.dataset.id)) { this.sfx('denied'); this.asking = b.dataset.id; this.render(); this.el.querySelector('.uwatch')?.focus({ preventScroll: true }); return; }
        this.choose(b.dataset.id);
        this.render();
        this.el.querySelector(`.char[data-id="${b.dataset.id}"]`)?.focus({ preventScroll: true });
      };
      // cursor (foco de teclado ou mouse) atualiza a ficha do lado que está escolhendo, sem re-render inteiro
      const peek = () => { if (this.cursor === b.dataset.id) return; this.cursor = b.dataset.id; this.sfx('pen'); this.peek(); };
      b.addEventListener('focus', peek);
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') peek(); });
    });
    if (this.opts.onBack) this.el.querySelector('.sback').onclick = () => { this.sfx('paper'); this.opts.onBack(); };
    if (ask) {
      this.el.querySelector('.uno').onclick = () => { this.asking = null; this.render(); };
      this.el.querySelector('.uwatch').onclick = async (e) => {
        e.currentTarget.disabled = true;
        const ok = await this.opts.onUnlock?.(ask.id);
        this.asking = null;
        if (ok) this.choose(ask.id);
        this.render();
      };
      for (const b of this.el.querySelectorAll('.unlockAsk .mbtn')) { b.addEventListener('focus', () => { for (const x of this.el.querySelectorAll('.unlockAsk .mbtn')) x.classList.toggle('hot', x === b); }); b.addEventListener('pointerenter', () => b.focus({ preventScroll: true })); }
    }
    this.el.querySelector('.mode').onclick = () => { this.mode = this.mode === 'cpu' ? '2p' : 'cpu'; this.sfx('paper'); this.picked(); this.render(); };
    this.el.querySelector('.go').onclick = () => this.start();
    this.el.querySelectorAll('.arena').forEach((b) => {
      b.onclick = () => this.setArena(b.dataset.arena, true);
      b.onkeydown = (e) => { // setas andam entre os cartões (padrão de radiogroup)
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault(); e.stopPropagation();
        const i = this.arenas.findIndex((a) => a.id === b.dataset.arena), n = this.arenas.length;
        this.setArena(this.arenas[(i + d + n) % n].id, true);
      };
    });
  }

  // troca só a ficha do lado que está escolhendo (pré-visualização do lutador sob o cursor)
  peek() {
    const side = this.picking === 1 ? 'one' : 'two';
    const old = this.el.querySelector(`.pick.${side}`);
    if (!old) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = this.pickPanel(this.cursor, this.picking === 1 ? 'Jogador 1' : (this.mode === 'cpu' ? 'Adversário · CPU' : 'Jogador 2'), side);
    const fresh = tmp.firstElementChild;
    old.replaceWith(fresh);
    const pic = fresh.querySelector('.pportrait');
    portrait(pic.dataset.id, (url) => { pic.style.backgroundImage = `url(${url})`; pic.querySelector('.ini').textContent = ''; });
    fresh.classList.add('swap'); // animação curta de entrada
  }

  start() { this.sfx('gavel'); this.onStart(this.cfg()); }
  show() { this.el.classList.remove('hidden'); this.render(); }
  hide() { this.el.classList.add('hidden'); }
  get visible() { return !this.el.classList.contains('hidden'); }
}
