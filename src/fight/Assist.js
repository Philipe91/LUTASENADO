// AJUDANTE TEMPORÁRIO (assist): surge num ponto, corre/salta até o oponente, dá 1 golpe e some.
// Genérico e dirigido por dados — é um Hitter (entra no mesmo loop de colisão/visual da partida).
// Spec (CharacterData, especial kind 'summon' → assists: [...]):
//   who      — id visual do ajudante (o visual escolhe modelo/placeholder por ele)
//   delay    — frames depois do especial até aparecer · enter — frames de surgir + chegar no alvo (persegue o alvo)
//   active   — frames com hitbox ativa · exit — frames sumindo · stand — distância em que para na frente do alvo
//   hop      — altura do salto de chegada · anim — chave de animação do golpe · fx — efeito visual do golpe
//   box      — hitbox relativa ao ajudante ({ x à frente, y, w, h }) · + campos normais de golpe (damage, hitstun...)
import { Hitter } from './Hitter.js';
import { ARENA_HALF } from './constants.js';

const easeOut = (q) => 1 - (1 - q) ** 2;

export class Assist extends Hitter {
  constructor(owner, a, x) {
    const enter = a.enter ?? 12, active = a.active ?? 4, exit = a.exit ?? 12, delay = a.delay ?? 0;
    super({
      owner, hit: a, x, y: 0, w: a.box.w, h: a.box.h, delay, life: enter + active + exit,
      activeUntil: delay + enter + active, hitsLeft: 1, rehit: 99, linger: true,
      visual: 'assist', variant: a.who, facing: owner.facing,
    });
    this.who = a.who; this.enter = enter; this.strikeN = active; this.exitN = exit; this.from = x;
  }
  get k() { return this.t - this.delay; } // frames desde que apareceu
  get phase() { const k = this.k; return k <= 0 ? 'wait' : k <= this.enter ? 'enter' : k <= this.enter + this.strikeN ? 'strike' : 'exit'; }
  get active() { return super.active && this.phase === 'strike'; }
  update() {
    this.t++;
    const k = this.k;
    if (k <= 0) return;
    if (k <= this.enter) { // persegue o alvo enquanto chega (arco de salto)
      const o = this.owner.opponent;
      this.facing = o.x >= this.from ? 1 : -1;
      const tx = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, o.x - this.facing * (this.hit.stand ?? 0.9)));
      const q = k / this.enter;
      this.x = this.from + (tx - this.from) * easeOut(q);
      this.y = 4 * q * (1 - q) * (this.hit.hop ?? 0.6);
    } else this.y = 0;
    if (k > this.life) this.dead = true;
  }
  box() {
    const b = this.hit.box;
    return { x: this.facing > 0 ? this.x + (b.x ?? 0) : this.x - (b.x ?? 0) - b.w, y: b.y ?? 0, w: b.w, h: b.h };
  }
}
