// ?animtest=1 — roteiro fixo que passa por TODAS as animações do P1 (checklist de validação de modelo importado).
// P2 vira "sparring": se aproxima e bate nos momentos certos para mostrar defesa, hit, queda e KO.
// Legenda do passo atual aparece na tela (útil no vídeo de validação).
import { NEUTRAL } from '../fight/constants.js';

const STEPS = [
  [0, 70, 'idle', {}],
  [70, 150, 'andar →', { fwd: true }],
  [150, 210, 'andar ←', { back: true }],
  [210, 212, 'soco 1', { punch: true }], [219, 221, 'soco 2', { punch: true }], [229, 231, 'soco 3', { punch: true }],
  [270, 272, 'chute', { kick: true }],
  [320, 370, 'agachar', { down: true }],
  [370, 372, 'rasteira', { down: true, kick: true }],
  [420, 423, 'pular', { up: true }],
  [480, 483, 'pular + chute aéreo', { up: true }], [492, 494, 'pular + chute aéreo', { kick: true }],
  [540, 640, 'defender (alto)', { back: true }],
  [640, 700, 'tomar hit', {}],
  [700, 820, 'cair / levantar', {}],
  [820, 980, 'K.O.', {}],
];

export function animTestLabel(frame) {
  const s = [...STEPS].reverse().find(([a]) => frame >= a);
  return s ? s[2] : '';
}

export class AnimTestP1 {
  constructor() { this.t = -1; }
  read(self) {
    this.t++;
    const s = STEPS.find(([a, b]) => this.t >= a && this.t < b);
    if (!s) return NEUTRAL;
    const F = self.facing > 0 ? 'right' : 'left', B = self.facing > 0 ? 'left' : 'right';
    const c = { ...NEUTRAL, ...s[3] };
    if (c.fwd) c[F] = true;
    if (c.back) c[B] = true;
    delete c.fwd; delete c.back;
    return c;
  }
}

export class AnimTestP2 {
  constructor(p1ctl) { this.p1 = p1ctl; }
  read(self, opp) {
    const t = this.p1.t;
    const F = self.facing > 0 ? 'right' : 'left';
    const d = Math.abs(opp.x - self.x);
    if (t < 440) return NEUTRAL;
    const close = d <= 1.35;
    // cada ataque tem uma janela e sai UMA vez, assim que estiver colado no P1
    const once = (from, to, key, cmd, before) => {
      if (t < from || t >= to || this[key] || !close || self.state !== 'idle' && self.state !== 'walk') return null;
      this[key] = true;
      before?.();
      return { ...NEUTRAL, ...cmd };
    };
    if (t >= 560 && t < 640 && t % 24 === 0 && close) return { ...NEUTRAL, kick: true };   // P1 defende
    const a = once(650, 700, '_hit', { punch: true })                                       // hit
      || once(705, 790, '_sweep', { down: true, kick: true })                               // rasteira → queda
      || once(830, 960, '_ko', { kick: true }, () => { opp.hp = Math.min(opp.hp, 4); });    // K.O.
    if (a) return a;
    return { ...NEUTRAL, [F]: d > 1.2 };                                                    // encosta no P1
  }
}
