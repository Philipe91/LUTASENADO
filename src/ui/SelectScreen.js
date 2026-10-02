// Tela de seleção montada a partir do registro de personagens (personagem novo aparece sozinho).
// Grade compacta de "figuras de ação" (retrato ou inicial + paleta) para N lutadores + painel com os golpes dos dois
// escolhidos. Colunas: até 6 lutadores = 1 fileira; mais = 2 fileiras (9 → 5 colunas); celular em retrato = 3 colunas (CSS).
import { CHARACTERS, getCharacter } from '../data/characters/index.js';
import { portrait, hex } from './portraits.js';

export class SelectScreen {
  constructor(root, onStart) {
    this.onStart = onStart;
    this.p1 = CHARACTERS[0].id;
    this.p2 = CHARACTERS[1].id;
    this.mode = 'cpu';
    this.picking = 1;
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

  render() {
    const n = CHARACTERS.length;
    const cols = n <= 6 ? n : Math.ceil(n / 2); // 6 → 1 fileira; 9 → 5 + 4 (retrato: 3 colunas via CSS)
    const cards = CHARACTERS.map((c) => {
      const P = c.visual?.placeholder || {};
      const tag = [this.p1 === c.id ? '<span class="tag t1">P1</span>' : '', this.p2 === c.id ? `<span class="tag t2">${this.mode === 'cpu' ? 'CPU' : 'P2'}</span>` : ''].join('');
      return `
        <button class="char ${this.p1 === c.id ? 'sel1' : ''} ${this.p2 === c.id ? 'sel2' : ''}" data-id="${c.id}" title="${c.title}"
          style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
          ${tag}
          <div class="cardTop"><span class="ini">${c.name[0]}</span></div>
          <div class="cname">${c.name}</div>
          <div class="carch">${c.archetype}</div>
        </button>`;
    }).join('');
    const p2who = this.mode === 'cpu' ? 'ADVERSÁRIO (CPU)' : 'JOGADOR 2';
    this.el.innerHTML = `
      <div class="logo">REPÚBLICA <span>KOMBAT</span></div>
      <div class="pickhint ${this.picking === 2 ? 'two' : ''}">Escolhendo: <b>${this.picking === 1 ? 'JOGADOR 1' : p2who}</b> · ${n} lutadores</div>
      <div class="grid" style="--cols:${cols}">${cards}</div>
      <div class="picks">${this.pickPanel(this.p1, 'JOGADOR 1', 'one')}<div class="vs">VS</div>${this.pickPanel(this.p2, p2who, 'two')}</div>
      <div class="opts">
        <button class="mode"><span>${this.mode === 'cpu' ? '1 JOGADOR vs CPU' : '2 JOGADORES (mesmo teclado)'}</span></button>
        <button class="go"><span>LUTAR!</span></button>
      </div>
      <div class="keys">
        <div><b>P1</b> A/D andar · W pular · S agachar · J soco · K chute · L especial (+ direção) · U ultimate · segurar pra trás = defender</div>
        <div><b>P2</b> setas · 1 soco · 2 chute · 3 especial · 0 ultimate (teclado numérico)</div>
      </div>
      <div class="disclaimer">Obra de ficção e sátira. Personagens são caricaturas.</div>`;
    this.el.querySelectorAll('.char').forEach((b) => {
      const top = b.querySelector('.cardTop');
      portrait(b.dataset.id, (url) => { top.style.backgroundImage = `url(${url})`; top.querySelector('.ini').textContent = ''; });
      b.onclick = () => {
        if (this.picking === 1) { this.p1 = b.dataset.id; this.picking = 2; }
        else { this.p2 = b.dataset.id; this.picking = 1; }
        this.render();
      };
    });
    this.el.querySelector('.mode').onclick = () => { this.mode = this.mode === 'cpu' ? '2p' : 'cpu'; this.render(); };
    this.el.querySelector('.go').onclick = () => this.start();
  }

  start() { this.onStart({ p1: this.p1, p2: this.p2, mode: this.mode }); }
  show() { this.el.classList.remove('hidden'); this.render(); }
  hide() { this.el.classList.add('hidden'); }
  get visible() { return !this.el.classList.contains('hidden'); }
}
