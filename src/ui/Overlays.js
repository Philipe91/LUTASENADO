// Camadas de sistema por cima do jogo: carregando a luta (tela VS + barra), pausa, aviso rápido (toast)
// e os botões de sistema (pausa no toque, tela cheia) ao lado dos de som.
import { portrait, hex } from './portraits.js';
import { ICON } from './icons.js';

const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };

// Tela VS (docs/UI_DIRECAO.md §5.4): dois painéis em diagonal com o retrato grande de cada lado, nome enorme no rodapé
// de cada painel, "VS" carimbado no centro, nome do cenário e linha de progresso embaixo.
export class FightLoading {
  constructor(root) { this.el = el('fightload hidden'); root.appendChild(this.el); }
  show(a, b, info = {}) {
    const side = (c, cls, who) => {
      const P = c.visual?.placeholder || {};
      return `<div class="flside ${cls}" style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
        <div class="flpic" data-id="${c.id}"><span class="ini">${c.name[0]}</span></div>
        <div class="flname"><small>${who}</small><b>${c.name}</b><em>${c.title || ''}</em></div></div>`;
    };
    this.el.innerHTML = `${side(a, 'one', 'Jogador 1')}<div class="flx"><span>VS</span></div>${side(b, 'two', info.p2who || 'CPU')}
      <div class="flfoot">${info.arena ? `<div class="flarena"><small>Cenário</small><b>${info.arena}</b></div>` : ''}<div class="flbar"><i></i></div><div class="flmsg">Preparando o ringue</div></div>`;
    for (const pic of this.el.querySelectorAll('.flpic')) portrait(pic.dataset.id, (url) => { pic.style.backgroundImage = `url(${url})`; pic.querySelector('.ini').textContent = ''; });
    this.bar = this.el.querySelector('.flbar i');
    this.el.classList.remove('hidden');
  }
  set(p) { if (this.bar) this.bar.style.width = `${Math.round(p * 100)}%`; }
  hide() { this.el.classList.add('hidden'); }
}

export class PauseMenu {
  constructor(root, { onResume, onMenu }) {
    this.el = el('pausemenu hidden', `<div class="pcard">
      <small class="kicker">Sessão suspensa</small><div class="ptit">PAUSA</div>
      <div class="plist">
        <button class="mbtn primary presume"><i class="cur">${ICON.caret}</i><span class="mlabel">CONTINUAR</span></button>
        <button class="mbtn pmenu"><i class="cur">${ICON.caret}</i><span class="mlabel">SAIR DA LUTA</span><em class="mhint">volta para a seleção</em></button>
      </div>
      <div class="phint">ESC / P continua · M som · N música</div></div>`);
    root.appendChild(this.el);
    this.el.querySelector('.presume').onclick = onResume;
    this.el.querySelector('.pmenu').onclick = onMenu;
    const items = [...this.el.querySelectorAll('.mbtn')];
    const hot = (b) => { for (const x of items) x.classList.toggle('hot', x === b); };
    for (const b of items) { b.addEventListener('focus', () => hot(b)); b.addEventListener('pointerenter', () => hot(b)); }
    addEventListener('keydown', (e) => {
      if (!this.visible || e.repeat) return;
      const d = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      items[(i < 0 ? 0 : (i + d + items.length) % items.length)].focus({ preventScroll: true });
    });
    this.hot = hot;
  }
  show() { this.el.classList.remove('hidden'); this.hot(this.el.querySelector('.presume')); }
  hide() { this.el.classList.add('hidden'); }
  get visible() { return !this.el.classList.contains('hidden'); }
}

export class Toast {
  constructor(root) { this.el = el('toast'); root.appendChild(this.el); }
  show(text, ms = 2200) {
    this.el.textContent = text;
    this.el.classList.remove('on'); void this.el.offsetWidth; this.el.classList.add('on');
    clearTimeout(this.t); this.t = setTimeout(() => this.el.classList.remove('on'), ms);
  }
}

// cola botões na caixa de som (canto inferior esquerdo) para não disputar espaço com o HUD
export function systemButtons(box, { onPause, fullscreen, allowFullscreen }) {
  const mk = (title, html, cls) => {
    const b = document.createElement('button');
    b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.className = `sysbtn ${cls}`; b.innerHTML = html;
    b.addEventListener('keydown', (e) => e.preventDefault());
    box.appendChild(b);
    return b;
  };
  const pause = mk('Pausa (Esc)', ICON.pause, 'rk-pause hidden');
  pause.onclick = () => { pause.blur(); onPause(); };
  if (allowFullscreen && fullscreen.supported) {
    const fs = mk('Tela cheia', ICON.fullscreen, 'rk-fs');
    fs.onclick = () => { fs.blur(); fullscreen.toggle(); };
  }
  return { pause };
}
