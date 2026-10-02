// ?parry=1 — teste da passiva TÁ OK (defesa perfeita do Capitão Brasa): P2 anda até perto e dá socos em intervalos;
// P1 só começa a defender ~3 frames antes do soco ficar ativo (defesa perfeita → "TÁ OK!" + brilho + buff).
// Com ?parry=late o P1 segura a defesa desde cedo (defesa comum, sem buff) — para comparar.
import { NEUTRAL } from '../fight/constants.js';

export class ParryP1 {
  constructor(late = false) { this.late = late; }
  read(self) {
    const o = self.opponent;
    const back = self.facing > 0 ? 'left' : 'right';
    const soon = o.state === 'attack' && o.move && o.t >= o.move.startup - 3;
    const block = this.late ? o.state === 'attack' || self.distTo(o) < 1.8 : soon;
    return block || self.state === 'blockstun' ? { ...NEUTRAL, [back]: true } : NEUTRAL;
  }
}

export class ParryP2 {
  constructor() { this.t = 0; }
  read(self) {
    this.t++;
    const o = self.opponent, fwd = self.facing > 0 ? 'right' : 'left';
    if (self.state !== 'idle' && self.state !== 'walk') return NEUTRAL;
    if (self.distTo(o) > 1.3) return { ...NEUTRAL, [fwd]: true };
    return this.t % 45 < 2 ? { ...NEUTRAL, punch: true } : NEUTRAL;
  }
}
