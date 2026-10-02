// ?feeltest=1 — roteiro de GAME FEEL (vídeo de validação de movimento): P1 dá dash, combo, chute, recua com
// back-dash, pula com chute aéreo, rasteira (queda/levantar), toma golpes alto/baixo e fecha o round com o KO
// em câmera lenta. P2 é sparring: fica parado e revida em momentos fixos.
import { NEUTRAL } from '../fight/constants.js';

// cada passo: [rótulo, ação]. Ações: { press: cmd, f } aperta por f frames · { wait: f } · { ready: true } espera os
// dois voltarem à guarda · { near: d } anda até a distância d · { tap: 'fwd'|'back' } toque duplo · { fn } efeito
const SCRIPT = [
  ['guarda', { wait: 30 }],
  ['dash →', { tap: 'fwd' }], ['dash →', { wait: 24 }],
  ['encosta', { near: 0.85 }],
  ['soco x3', { press: { punch: true }, f: 2 }], ['soco x3', { wait: 9 }], ['soco x3', { press: { punch: true }, f: 2 }], ['soco x3', { wait: 10 }], ['soco x3', { press: { punch: true }, f: 2 }],
  ['soco x3', { ready: true }],
  ['encosta', { near: 1.45 }], ['chute', { press: { kick: true }, f: 2 }], ['chute', { ready: true }],
  ['back-dash ←', { tap: 'back' }], ['back-dash ←', { wait: 30 }],
  ['dash → + soco', { tap: 'fwd' }], ['dash → + soco', { wait: 8 }], ['dash → + soco', { press: { punch: true }, f: 2 }], ['dash → + soco', { ready: true }],
  ['pulo + chute aéreo', { near: 2.4 }], ['pulo + chute aéreo', { press: { up: true, fwd: true }, f: 3 }], ['pulo + chute aéreo', { wait: 14 }],
  ['pulo + chute aéreo', { press: { kick: true }, f: 2 }], ['pulo + chute aéreo', { ready: true }],
  ['rasteira (queda)', { near: 0.95 }], ['rasteira (queda)', { press: { down: true, kick: true }, f: 2 }], ['rasteira (queda)', { wait: 20 }], ['levantar', { ready: true }],
  ['tomar golpe alto', { fn: (s, o, ctl) => { ctl.p2cmd = 'punch'; } }], ['tomar golpe alto', { wait: 40 }], ['tomar golpe alto', { ready: true }],
  ['tomar golpe baixo', { fn: (s, o, ctl) => { ctl.p2cmd = 'low'; } }], ['tomar golpe baixo', { wait: 40 }], ['tomar golpe baixo', { ready: true }],
  ['pulo parado', { press: { up: true }, f: 3 }], ['pulo parado', { ready: true }],
  ['K.O. (câmera lenta)', { near: 1.4 }], ['K.O. (câmera lenta)', { fn: (s, o) => { o.hp = Math.min(o.hp, 5); } }], ['K.O. (câmera lenta)', { press: { kick: true }, f: 2 }],
  ['K.O. (câmera lenta)', { wait: 400 }],
];

const FREE = new Set(['idle', 'walk', 'crouch']);

export class FeelTestP1 {
  constructor() { this.i = 0; this.k = 0; this.label = ''; this.p2cmd = null; this.t = 0; }
  read(self, opp) {
    this.t++;
    const st = SCRIPT[this.i];
    if (!st) return NEUTRAL;
    this.label = st[0];
    const a = st[1];
    const F = self.facing > 0 ? 'right' : 'left', B = self.facing > 0 ? 'left' : 'right';
    const next = () => { this.i++; this.k = 0; };
    this.k++;
    if (a.wait !== undefined) { if (this.k >= a.wait) next(); return NEUTRAL; }
    if (a.ready) { if (this.k > 4 && FREE.has(self.state) && FREE.has(opp.state)) next(); return NEUTRAL; }
    if (a.near !== undefined) {
      if (!FREE.has(self.state)) return NEUTRAL;
      const d = self.distTo(opp);
      if (Math.abs(d - a.near) < 0.12 || this.k > 150) { next(); return NEUTRAL; }
      return { ...NEUTRAL, [d > a.near ? F : B]: true };
    }
    if (a.tap) {
      const dir = a.tap === 'fwd' ? F : B; // aperta 3, solta 3, aperta 3
      const on = this.k <= 3 || (this.k > 6 && this.k <= 9);
      if (this.k >= 9) next();
      return { ...NEUTRAL, [dir]: on };
    }
    if (a.fn) { a.fn(self, opp, this); next(); return NEUTRAL; }
    if (a.press) {
      const c = { ...NEUTRAL, ...a.press };
      if (c.fwd) c[F] = true;
      delete c.fwd;
      if (this.k >= a.f) next();
      return c;
    }
    next();
    return NEUTRAL;
  }
}

export class FeelTestP2 {
  constructor(p1) { this.p1 = p1; }
  read(self, opp) {
    const want = this.p1.p2cmd;
    if (!want || !FREE.has(self.state)) return NEUTRAL;
    const F = self.facing > 0 ? 'right' : 'left';
    if (self.distTo(opp) > 1.3) return { ...NEUTRAL, [F]: true }; // encosta para bater
    this.p1.p2cmd = null;
    return want === 'low' ? { ...NEUTRAL, down: true, punch: true } : { ...NEUTRAL, punch: true }; // soco = alto (cabeça) · soco agachado = baixo
  }
}
