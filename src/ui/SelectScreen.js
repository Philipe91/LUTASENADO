// Tela de seleção montada a partir do registro de personagens (personagem novo aparece sozinho).
import { CHARACTERS } from '../data/characters/index.js';
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

  render() {
    const cards = CHARACTERS.map((c) => {
      const P = c.visual?.placeholder || {};
      const sp = c.specials;
      const tag = [this.p1 === c.id ? '<span class="tag t1">P1</span>' : '', this.p2 === c.id ? `<span class="tag t2">${this.mode === 'cpu' ? 'CPU' : 'P2'}</span>` : ''].join('');
      return `
        <button class="char ${this.p1 === c.id ? 'sel1' : ''} ${this.p2 === c.id ? 'sel2' : ''}" data-id="${c.id}"
          style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
          ${tag}
          <div class="cardTop"><span class="ini">${c.name[0]}</span></div>
          <div class="cbody">
            <div class="cname">${c.name}</div>
            <div class="ctitle">${c.title}</div>
            <div class="carch">${c.archetype}</div>
            <ul>
              <li><b>Passiva:</b> ${c.passive?.name ?? '-'}</li>
              <li>${sp.neutral?.name ?? '-'}</li>
              <li>→ ${sp.forward?.name ?? '-'}</li>
              <li>↓ ${sp.down?.name ?? '-'}</li>
              <li class="ult">★ ${c.ultimate?.name ?? '-'}</li>
            </ul>
          </div>
        </button>`;
    }).join('');
    this.el.innerHTML = `
      <div class="logo">REPÚBLICA <span>KOMBAT</span></div>
      <div class="pickhint ${this.picking === 2 ? 'two' : ''}">Escolhendo: <b>${this.picking === 1 ? 'JOGADOR 1' : this.mode === 'cpu' ? 'ADVERSÁRIO (CPU)' : 'JOGADOR 2'}</b></div>
      <div class="grid">${cards}</div>
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
