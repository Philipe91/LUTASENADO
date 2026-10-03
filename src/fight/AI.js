// IA: decide por distância e "aperta os mesmos botões" que um humano (passa pelo mesmo buffer/cancel/tech).
// O perfil (pesos) vem do CharacterData.ai — cada personagem luta com a sua personalidade.
// Camadas: (1) reflexos de frame (tech de agarrão/queda, anti-aéreo, punição) com chance por dificuldade;
// (2) decisão a cada `react` frames; (3) planos curtos (combo com hit-confirm). Anti-spam: evita repetir a mesma ação.
import { NEUTRAL, METER_MAX } from './constants.js';

// ?level=easy|normal|hard ou ?ai=1|2|3
export const LEVELS = {
  easy: { react: 30, block: 0.5, punish: 0.12, confirm: 0.15, tech: 0.08, wakeTech: 0.15, antiAir: 0.08, idle: 0.25 },
  normal: { react: 17, block: 1, punish: 0.45, confirm: 0.5, tech: 0.3, wakeTech: 0.45, antiAir: 0.3, idle: 0.08 },
  hard: { react: 9, block: 1.5, punish: 0.85, confirm: 0.85, tech: 0.6, wakeTech: 0.8, antiAir: 0.6, idle: 0 },
};
const BY_NUMBER = { 1: 'easy', 2: 'normal', 3: 'hard' };
export const levelName = (l) => BY_NUMBER[l] || (LEVELS[l] ? l : 'normal');
const FREE = new Set(['idle', 'walk', 'crouch']);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class AIController {
  constructor(profile = {}, level = 'normal') {
    this.p = { aggression: 0.5, keepDistance: 1.6, specialBias: 0.3, throwBias: 0.15, blockChance: 0.4, jumpChance: 0.08, ...profile };
    this.level = levelName(level);
    this.lv = LEVELS[this.level];
    this.plan = [];
    this.hold = NEUTRAL;
    this.wait = 0;
    this.recent = []; // últimas ações (anti-spam)
    this.seen = { throwId: 0, kd: 0, punishId: 0, airId: 0 };
  }

  read(self, opp, match) {
    const r = this.reflex(self, opp);
    if (r) return r;
    while (this.plan.length) {
      const s = this.plan[0];
      if (s.when && !s.when(self, opp)) { this.plan.shift(); continue; } // passo condicional (hit-confirm)
      if (--s.f <= 0) this.plan.shift();
      return s.c;
    }
    if (--this.wait > 0) return this.hold;
    this.decide(self, opp, match);
    if (this.plan.length) return this.read(self, opp, match);
    return this.hold;
  }

  // ---------- reflexos (avaliados todo frame, uma chance por situação) ----------
  reflex(self, opp) {
    const lv = this.lv;
    // tech de agarrão: o rival começou um agarrão colado → aperta soco
    if (opp.state === 'attack' && opp.move?.throw && opp.t <= 2 && this.seen.throwId !== opp.hitId) {
      this.seen.throwId = opp.hitId;
      if (Math.random() < lv.tech) { this.plan = []; return { ...NEUTRAL, punch: true }; }
    }
    // tech de queda: caindo perto do chão → aperta um botão (uma tentativa por queda)
    if (self.state === 'knockdown' && self.vy < 0 && self.y < 0.5 && this.seen.kd !== self.animSeq) {
      this.seen.kd = self.animSeq;
      if (Math.random() < lv.wakeTech) return { ...NEUTRAL, kick: true };
    }
    if (!FREE.has(self.state) || this.plan.length) return null;
    const d = self.distTo(opp);
    const F = self.facing > 0 ? 'right' : 'left';
    // anti-aéreo: rival pulando por cima/na direção → chute (ou defesa)
    if (opp.state === 'jump' || (opp.state === 'attack' && opp.move?.air)) {
      const id = opp.animSeq;
      if (this.seen.airId !== id && d < 2.4 && opp.vy < 0.05) {
        this.seen.airId = id;
        if (Math.random() < lv.antiAir) { this.remember('antiair'); this.press({ kick: true }); return this.read(self, opp, { hitters: [] }); }
      }
    }
    // punição: rival errou um golpe e está na recuperação, perto → castiga
    const rec = recoveryLeft(opp);
    if (rec >= 10 && d < 2.2) {
      const id = opp.hitId;
      if (this.seen.punishId !== id) {
        this.seen.punishId = id;
        if (Math.random() < lv.punish) {
          const strike = Object.entries(self.specials).find(([dir, s]) => s.kind === 'strike' && self.canSpecial(dir) && (s.startup ?? 10) < rec);
          if (strike && Math.random() < 0.5) this.special(strike[0], F);
          else if (d < 1.4 && rec >= 14) this.combo(true);
          else this.press({ kick: true });
          this.remember('punish');
          return this.read(self, opp, { hitters: [] });
        }
      }
    }
    return null;
  }

  decide(self, opp, match) {
    const p = this.p, lv = this.lv;
    this.self = self;
    const d = self.distTo(opp);
    const F = self.facing > 0 ? 'right' : 'left';
    const B = self.facing > 0 ? 'left' : 'right';
    this.wait = lv.react + Math.floor(Math.random() * 8);
    this.hold = NEUTRAL;

    if (!FREE.has(self.state)) return;
    if (Math.random() < lv.idle) { this.wait += 6; return; } // fácil: hesita (dá respiro ao jogador)

    const threat = ((opp.state === 'attack' || opp.state === 'special') && d < 2.8) ||
      match.hitters.some((h) => h.owner === opp && h.dangerous && Math.abs(h.x - self.x) < 2.6);
    // projétil do rival chegando perto: especial que reflete (Lacração Reversa) ou pose de counter (Arcabouço) absorve
    const shot = match.hitters.find((h) => h.owner === opp && h.dangerous && h.hit?.kind === 'projectile' && h.vx && Math.abs(h.x - self.x) < 2.2 && Math.sign(self.x - h.x) === Math.sign(h.vx));
    if (shot) {
      const answer = Object.entries(self.specials).find(([dir, s]) => (s.reflect || s.kind === 'counter') && self.canSpecial(dir));
      if (answer && Math.random() < p.blockChance * lv.block) return this.special(answer[0], F);
    }
    if (threat) {
      // pose de counter (Close Certo) no lugar da defesa, quando o golpe vem de perto
      const counter = Object.entries(self.specials).find(([dir, s]) => s.kind === 'counter' && self.canSpecial(dir));
      if (counter && d < 2.4 && Math.random() < p.blockChance * lv.block * 0.7) return this.special(counter[0], F);
    }
    if (threat && Math.random() < p.blockChance * lv.block) {
      const low = (opp.move?.level || opp.sp?.level) === 'low';
      this.hold = { ...NEUTRAL, [B]: true, down: low };
      this.wait += 8;
      this.remember('block');
      return;
    }

    if (self.meter >= METER_MAX && d < (self.ultimate?.range ?? 3) && Math.random() < 0.6) return this.press({ ultimate: true });

    const specials = Object.entries(self.specials).filter(([dir]) => self.canSpecial(dir));
    const want = (pred) => specials.filter(([, s]) => pred(s));

    if (d > 3.8) {
      const ranged = want((s) => s.kind === 'projectile' || s.kind === 'zone' || (s.kind === 'strike' && s.lunge));
      if (ranged.length && Math.random() < p.specialBias && this.fresh('ranged')) { this.remember('ranged'); return this.special(pick(ranged)[0], F); }
      if (Math.random() < p.jumpChance && this.fresh('jump')) { this.remember('jump'); return this.press({ up: true, [F]: true }, 3); }
      if (p.keepDistance > 3 && Math.random() < 0.5) return;
      // aproxima andando ou, às vezes, de dash (toque duplo)
      if (Math.random() < 0.18 * p.aggression + 0.04 && this.fresh('dash')) { this.remember('dash'); return this.dash(F); }
      this.hold = { ...NEUTRAL, [F]: true };
      return;
    }
    if (p.keepDistance > 2.5 && d < p.keepDistance && Math.random() < 0.45) {
      if (Math.random() < 0.3) return this.press({ up: true, [B]: true }, 3);
      this.hold = { ...NEUTRAL, [B]: true };
      return;
    }
    if (d > 1.7) {
      const mids = want((s) => s.kind !== 'grab' && s.kind !== 'counter');
      if (mids.length && Math.random() < p.specialBias && this.fresh('mid')) { this.remember('mid'); return this.special(pick(mids)[0], F); }
      if (d < 2.3 && Math.random() < 0.35 && this.fresh('kick')) { this.remember('kick'); return this.press({ kick: true }); }
      if (Math.random() < p.aggression) { this.hold = { ...NEUTRAL, [F]: true }; this.wait = 10; }
      return;
    }

    const grab = want((s) => s.kind === 'grab');
    if (Math.random() < p.throwBias && this.fresh('throw')) {
      this.remember('throw');
      return grab.length && Math.random() < 0.6 ? this.special(grab[0][0], F) : this.press({ [F]: true, punch: true });
    }
    // escolhe uma ação perto, evitando repetir a mesma 3x seguidas
    const opts = [['combo', 0.45], ['low', 0.13], ['kick', 0.12], ['close', 0.1], ['back', 0.2]];
    let act = roll(opts);
    if (!this.fresh(act)) act = roll(opts.filter(([a]) => a !== act));
    this.remember(act);
    if (act === 'combo') return this.combo();
    if (act === 'low') return this.lowCombo();
    if (act === 'kick') return this.press({ kick: true });
    if (act === 'close') {
      const close = want((s) => s.kind === 'strike');
      if (close.length) return this.special(pick(close)[0], F);
    }
    this.hold = { ...NEUTRAL, [B]: true };
    this.wait = 12;
  }

  // ---------- memória curta (anti-spam) ----------
  remember(a) { this.recent.push(a); if (this.recent.length > 3) this.recent.shift(); }
  fresh(a) { return this.recent.filter((x) => x === a).length < 2; }

  press(c, frames = 2) { this.plan.push({ c: { ...NEUTRAL, ...c }, f: frames }, { c: NEUTRAL, f: 3 }); }
  dash(F) { this.plan.push({ c: { ...NEUTRAL, [F]: true }, f: 3 }, { c: NEUTRAL, f: 3 }, { c: { ...NEUTRAL, [F]: true }, f: 8 }); }
  special(dir, F) {
    const c = { special: true };
    if (dir === 'forward') c[F] = true;
    if (dir === 'down') c.down = true;
    // especial com carga (charge): a IA segura o botão um tempo aleatório
    const ch = this.self?.specials?.[dir]?.charge;
    this.press(c, ch ? 2 + Math.floor(Math.random() * ch.max) : 2);
  }
  // soco, soco e, com hit-confirm (rival em hitstun), cancela em especial de golpe ou chute; senão termina no 3º soco
  combo(forceConfirm = false) {
    const self = this.self;
    const P = { ...NEUTRAL, punch: true };
    this.plan.push({ c: P, f: 2 }, { c: NEUTRAL, f: 7 }, { c: P, f: 2 }, { c: NEUTRAL, f: 6 });
    const confirm = forceConfirm || Math.random() < this.lv.confirm;
    const stunned = (s, o) => o.state === 'hitstun';
    if (confirm && self) {
      const F = self.facing > 0 ? 'right' : 'left';
      const strike = Object.entries(self.specials).find(([dir, s]) => s.kind === 'strike' && self.canSpecial(dir));
      const fin = strike && Math.random() < 0.6
        ? { ...NEUTRAL, special: true, [F]: strike[0] === 'forward', down: strike[0] === 'down' }
        : { ...NEUTRAL, kick: true };
      this.plan.push({ c: fin, f: 2, when: stunned }, { c: NEUTRAL, f: 3 });
    }
    this.plan.push({ c: P, f: 2, when: (s, o) => !confirm || o.state !== 'hitstun' }, { c: NEUTRAL, f: 3 });
  }
  // agachado: soco baixo → rasteira (cancel), derruba
  lowCombo() {
    this.plan.push({ c: { ...NEUTRAL, down: true, punch: true }, f: 2 }, { c: { ...NEUTRAL, down: true }, f: 5 },
      { c: { ...NEUTRAL, down: true, kick: true }, f: 2 }, { c: NEUTRAL, f: 3 });
  }
}

// frames de recuperação que ainda faltam ao rival (golpe que já passou da janela ativa)
function recoveryLeft(o) {
  const m = o.state === 'attack' ? o.move : o.state === 'special' ? o.sp : null;
  if (!m || m.air) return 0;
  const end = m.startup + (m.active || 0);
  if (o.t < end) return 0;
  return m.startup + (m.active || 0) + (m.recovery || 0) - o.t;
}
function roll(opts) {
  const tot = opts.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * tot;
  for (const [a, w] of opts) { if ((r -= w) < 0) return a; }
  return opts[opts.length - 1][0];
}
