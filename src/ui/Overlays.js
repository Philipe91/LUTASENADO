// Camadas de sistema por cima do jogo: carregando a luta (VS + barra), pausa, aviso rápido (toast)
// e os botões de sistema (pausa no toque, tela cheia) ao lado dos de som.
import { portrait, hex } from './portraits.js';

const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };

export class FightLoading {
  constructor(root) { this.el = el('fightload hidden'); root.appendChild(this.el); }
  show(a, b) {
    const side = (c, cls) => {
      const P = c.visual?.placeholder || {};
      return `<div class="flside ${cls}" style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}"><div class="flpic" data-id="${c.id}"></div><b>${c.name}</b></div>`;
    };
    this.el.innerHTML = `<div class="flvs">${side(a, 'one')}<div class="flx">VS</div>${side(b, 'two')}</div>
      <div class="flbar"><i></i></div><div class="flmsg">Preparando o ringue…</div>`;
    for (const pic of this.el.querySelectorAll('.flpic')) portrait(pic.dataset.id, (url) => { pic.style.backgroundImage = `url(${url})`; });
    this.bar = this.el.querySelector('.flbar i');
    this.el.classList.remove('hidden');
  }
  set(p) { if (this.bar) this.bar.style.width = `${Math.round(p * 100)}%`; }
  hide() { this.el.classList.add('hidden'); }
}

export class PauseMenu {
  constructor(root, { onResume, onMenu }) {
    this.el = el('pausemenu hidden', `<div class="pcard"><div class="ptit">PAUSA</div>
      <div class="btns"><button class="presume"><span>CONTINUAR</span></button><button class="menu pmenu"><span>SAIR DA LUTA</span></button></div>
      <div class="phint">Esc / P continua</div></div>`);
    root.appendChild(this.el);
    this.el.querySelector('.presume').onclick = onResume;
    this.el.querySelector('.pmenu').onclick = onMenu;
  }
  show() { this.el.classList.remove('hidden'); }
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
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
const ICON_FS = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
export function systemButtons(box, { onPause, fullscreen, allowFullscreen }) {
  const mk = (title, html, cls) => {
    const b = document.createElement('button');
    b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.className = cls; b.innerHTML = html;
    b.style.cssText = 'width:38px;height:38px;border-radius:50%;border:2px solid #000;background:#ffd23fdd;color:#140d24;display:grid;place-items:center;cursor:pointer;padding:0;box-shadow:2px 2px 0 #000;';
    b.addEventListener('keydown', (e) => e.preventDefault());
    box.appendChild(b);
    return b;
  };
  const pause = mk('Pausa (Esc)', ICON_PAUSE, 'rk-pause hidden');
  pause.onclick = () => { pause.blur(); onPause(); };
  if (allowFullscreen && fullscreen.supported) {
    const fs = mk('Tela cheia', ICON_FS, 'rk-fs');
    fs.onclick = () => { fs.blur(); fullscreen.toggle(); };
  }
  return { pause };
}
