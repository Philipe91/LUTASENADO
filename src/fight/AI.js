// IA básica: decide por distância e "aperta os mesmos botões" que um humano.
// O perfil (pesos) vem do CharacterData.ai — cada personagem luta com a sua personalidade.
import { NEUTRAL, METER_MAX } from './constants.js';

const LEVELS = {
  easy: { react: 30, block: 0.5 },
  normal: { react: 17, block: 1 },
  hard: { react: 8, block: 1.5 },
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class AIController {
  constructor(profile = {}, level = 'normal') {
    this.p = { aggression: 0.5, keepDistance: 1.6, specialBias: 0.3, throwBias: 0.15, blockChance: 0.4, jumpChance: 0.08, ...profile };
    this.lv = LEVELS[level] || LEVELS.normal;
    this.plan = [];
    this.hold = NEUTRAL;
    this.wait = 0;
  }

  read(self, opp, match) {
    if (this.plan.length) {
      const s = this.plan[0];
      if (--s.f <= 0) this.plan.shift();
      return s.c;
    }
    if (--this.wait > 0) return this.hold;
    this.decide(self, opp, match);
    if (this.plan.length) return this.read(self, opp, match);
    return this.hold;
  }

  decide(self, opp, match) {
    const p = this.p;
    const d = self.distTo(opp);
    const F = self.facing > 0 ? 'right' : 'left';
    const B = self.facing > 0 ? 'left' : 'right';
    this.wait = this.lv.react + Math.floor(Math.random() * 8);
    this.hold = NEUTRAL;

    if (!['idle', 'walk', 'crouch'].includes(self.state)) return;

    const threat = ((opp.state === 'attack' || opp.state === 'special') && d < 2.8) ||
      match.hitters.some((h) => h.owner === opp && Math.abs(h.x - self.x) < 2.6);
    if (threat && Math.random() < p.blockChance * this.lv.block) {
      const low = (opp.move?.level || opp.sp?.level) === 'low';
      this.hold = { ...NEUTRAL, [B]: true, down: low };
      this.wait += 8;
      return;
    }

    if (self.meter >= METER_MAX && d < (self.ultimate?.range ?? 3) && Math.random() < 0.6) return this.press({ ultimate: true });

    const specials = Object.entries(self.specials).filter(([dir]) => self.canSpecial(dir));
    const want = (pred) => specials.filter(([, s]) => pred(s));

    if (d > 3.8) {
      const ranged = want((s) => s.kind === 'projectile' || s.kind === 'zone' || (s.kind === 'strike' && s.lunge));
      if (ranged.length && Math.random() < p.specialBias) return this.special(pick(ranged)[0], F);
      if (Math.random() < p.jumpChance) return this.press({ up: true, [F]: true }, 3);
      if (p.keepDistance > 3 && Math.random() < 0.5) return;
      this.hold = { ...NEUTRAL, [F]: true };
      return;
    }
    if (p.keepDistance > 2.5 && d < p.keepDistance && Math.random() < 0.45) {
      if (Math.random() < 0.3) return this.press({ up: true, [B]: true }, 3);
      this.hold = { ...NEUTRAL, [B]: true };
      return;
    }
    if (d > 1.7) {
      const mids = want((s) => s.kind !== 'grab');
      if (mids.length && Math.random() < p.specialBias) return this.special(pick(mids)[0], F);
      if (d < 2.3 && Math.random() < 0.35) return this.press({ kick: true });
      if (Math.random() < p.aggression) { this.hold = { ...NEUTRAL, [F]: true }; this.wait = 10; }
      return;
    }

    const grab = want((s) => s.kind === 'grab');
    if (Math.random() < p.throwBias) {
      return grab.length && Math.random() < 0.6 ? this.special(grab[0][0], F) : this.press({ [F]: true, punch: true });
    }
    const x = Math.random();
    if (x < 0.45) return this.combo();
    if (x < 0.58) return this.press({ down: true, kick: true });
    if (x < 0.7) return this.press({ kick: true });
    if (x < 0.8) {
      const close = want((s) => s.kind === 'strike');
      if (close.length) return this.special(pick(close)[0], F);
    }
    this.hold = { ...NEUTRAL, [B]: true };
    this.wait = 12;
  }

  press(c, frames = 2) { this.plan.push({ c: { ...NEUTRAL, ...c }, f: frames }, { c: NEUTRAL, f: 3 }); }
  special(dir, F) {
    const c = { special: true };
    if (dir === 'forward') c[F] = true;
    if (dir === 'down') c.down = true;
    this.press(c);
  }
  combo() {
    for (let i = 0; i < 3; i++) this.plan.push({ c: { ...NEUTRAL, punch: true }, f: 2 }, { c: NEUTRAL, f: 7 });
  }
}
