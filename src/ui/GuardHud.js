// Indicador mínimo da BARRA DE GUARDA (FEEL.guard): uma linha fina embaixo da barra de ultimate de cada lado.
// Arquivo separado do Hud.js (outros agentes mexem no visual): só lê fighter.guard. Esconde-se quando a mecânica
// está desligada (FEEL.guard = null). Pisca quando a guarda está acabando (FEEL.guard.low).
import { FEEL } from '../fight/constants.js';

const CSS = `
.guard { display: flex; align-items: center; gap: 4px; margin-top: 3px; width: 46%; }
.side.p2 .guard { margin-left: auto; flex-direction: row-reverse; }
.guard em { font: 900 10px/1 var(--display, sans-serif); font-style: normal; color: #7ec8ff; -webkit-text-stroke: 2px #000; paint-order: stroke fill; letter-spacing: 1px; }
.guard i { flex: 1; height: 5px; background: #0b0b12cc; border: 2px solid #000; border-radius: 2px; overflow: hidden; transform: skewX(var(--skew, -12deg)); }
.side.p2 .guard i { transform: skewX(calc(var(--skew, -12deg) * -1)); }
.guard b { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, #4aa8ff, #9fe0ff); transition: width .08s linear; }
.guard.low b { background: linear-gradient(90deg, #ff6a3d, #ffd080); animation: guardLow .35s steps(2) infinite; }
.guard.broken b { background: #ff2a2a; }
@keyframes guardLow { to { opacity: .35; } }
`;

export class GuardHud {
  constructor(hud) {
    this.hud = hud;
    this.els = [];
    if (!FEEL.guard) return;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    for (const side of hud.sides) {
      const g = document.createElement('div');
      g.className = 'guard';
      g.title = 'Guarda: defender gasta; zera = GUARDA QUEBRADA';
      g.innerHTML = '<em>GUARDA</em><i><b></b></i>';
      side.root.appendChild(g);
      this.els.push({ root: g, fill: g.querySelector('b') });
    }
  }
  update(match) {
    const G = FEEL.guard;
    if (!G || !this.els.length) return;
    match.fighters.forEach((f, i) => {
      const e = this.els[i], q = f.guard / G.max;
      e.fill.style.width = `${Math.max(0, Math.min(1, q)) * 100}%`;
      e.root.classList.toggle('low', q <= G.low && q > 0);
      e.root.classList.toggle('broken', f.state === 'hitstun' && f.animKey === 'dizzy' && q <= G.refill + 0.001);
    });
  }
}
