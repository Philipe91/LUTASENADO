// IA: decide por distância e "aperta os mesmos botões" que um humano (passa pelo mesmo buffer/cancel/tech).
// O perfil (pesos) vem do CharacterData.ai — cada personagem luta com a sua personalidade.
// Camadas: (1) reflexos de frame (tech de agarrão/queda, anti-aéreo, punição, meaty ao levantar) com chance por
// dificuldade; (2) decisão a cada `react` frames; (3) planos curtos (combo com hit-confirm). Anti-spam: evita repetir
// a mesma ação. Todo sorteio passa por match.rng (determinista: mesma semente = mesma luta).
import { NEUTRAL, METER_MAX, FEEL } from './constants.js';

// ?level=easy|normal|hard ou ?ai=1|2|3
//   react: frames entre decisões · block: × chance de defender · punish: pune golpe no vento · confirm: cancela só se acertou
//   tech: escapa agarrão · wakeTech: levanta rápido · antiAir: derruba pulo · idle: hesita · oki: ataca na hora que o
//   rival levanta (meaty) · throwTurtle: agarra quem só defende · guardCare: sai da defesa quando a guarda está acabando
export const LEVELS = {
  easy: { react: 30, block: 0.5, punish: 0.12, confirm: 0.15, tech: 0.08, wakeTech: 0.15, antiAir: 0.08, idle: 0.25, oki: 0.05, throwTurtle: 0.05, guardCare: 0.1 },
  normal: { react: 17, block: 1, punish: 0.45, confirm: 0.5, tech: 0.3, wakeTech: 0.45, antiAir: 0.3, idle: 0.08, oki: 0.35, throwTurtle: 0.2, guardCare: 0.4 },
  hard: { react: 9, block: 1.5, punish: 0.85, confirm: 0.85, tech: 0.6, wakeTech: 0.8, antiAir: 0.6, idle: 0, oki: 0.7, throwTurtle: 0.45, guardCare: 0.7 },
};
const BY_NUMBER = { 1: 'easy', 2: 'normal', 3: 'hard' };
export const levelName = (l) => BY_NUMBER[l] || (LEVELS[l] ? l : 'normal');
const FREE = new Set(['idle', 'walk', 'crouch']);

export class AIController {
  constructor(profile = {}, level = 'normal') {
    this.p = { aggression: 0.5, keepDistance: 1.6, specialBias: 0.3, throwBias: 0.15, blockChance: 0.4, jumpChance: 0.08, ...profile };
    this.level = levelName(level);
    this.lv = LEVELS[this.level];
    this.plan = [];
    this.hold = NEUTRAL;
    this.wait = 0;
    this.recent = []; // últimas ações (anti-spam)
    this.seen = { throwId: 0, kd: 0, punishId: 0, airId: 0, oki: 0 };
    this.rng = null;
  }
  rnd() { return this.rng ? this.rng.next() : Math.random(); }
  pick(arr) { return arr[Math.floor(this.rnd() * arr.length)]; }

  read(self, opp, match) {
    if (match?.rng) this.rng = match.rng;
    const r = this.reflex(self, opp);
    if (r) return r;
    while (this.plan.length) {
      const s = this.plan[0];
      if (s.when && !s.when(self, opp)) { this.plan.shift(); continue; } // passo condicional (hit-confirm)
      if (--s.f <= 0) this.plan.shift();
      return s.c;
    }
    if (--this.wait > 0) return this.blockHold(self) ?? this.hold;
    this.decide(self, opp, match);
    if (this.plan.length) return this.read(self, opp, match);
    return this.blockHold(self) ?? this.hold;
  }
  // defesa segurada: recalcula o lado TODO frame (golpe que passa por trás — Operação Tática — exige virar a defesa)
  blockHold(self) {
    if (!this.holdBlock) return null;
    const B = self.facing > 0 ? 'left' : 'right';
    return { ...NEUTRAL, [B]: true, down: this.holdBlock.low };
  }

  // ---------- reflexos (avaliados todo frame, uma chance por situação) ----------
  reflex(self, opp) {
    const lv = this.lv;
    // tech de agarrão: o rival começou um agarrão colado → aperta soco
    if (opp.state === 'attack' && opp.move?.throw && opp.t <= 2 && this.seen.throwId !== opp.hitId) {
      this.seen.throwId = opp.hitId;
      if (this.rnd() < lv.tech) { this.plan = []; return { ...NEUTRAL, punch: true }; }
    }
    // tech de queda: caindo perto do chão → aperta um botão (uma tentativa por queda)
    if (self.state === 'knockdown' && self.vy < 0 && self.y < 0.5 && this.seen.kd !== self.animSeq) {
      this.seen.kd = self.animSeq;
      if (this.rnd() < lv.wakeTech) return { ...NEUTRAL, kick: true };
    }
    if (!FREE.has(self.state) || this.plan.length) return null;
    const d = self.distTo(opp);
    const F = self.facing > 0 ? 'right' : 'left';
    // anti-aéreo: rival pulando por cima/na direção → chute (ou defesa)
    if (opp.state === 'jump' || (opp.state === 'attack' && opp.move?.air)) {
      const id = opp.animSeq;
      const coming = Math.sign(opp.vx || (self.x - opp.x)) === Math.sign(self.x - opp.x);
      // espera o rival passar do ápice: o chute leva ~9 frames para ficar ativo e o pulo desce rápido
      if (this.seen.airId !== id && d < 2.4 && opp.vy < -0.01 && coming) {
        this.seen.airId = id;
        if (this.rnd() < lv.antiAir) { this.remember('antiair'); this.press({ kick: true }); return this.read(self, opp, { hitters: [] }); }
      }
    }
    // MEATY / OKI: rival levantando → golpe que fica ativo no 1º frame dele livre (força defesa ou pega acordando)
    if (opp.state === 'getup' && d < 1.9 && this.seen.oki !== opp.animSeq) {
      const total = opp.teched ? FEEL.wakeup.techGetup : FEEL.wakeup.getup;
      const left = total - opp.t;
      const kick = self.moves.kick, low = self.moves.sweep;
      const useLow = this.rnd() < 0.35 && left === low.startup - 1;
      if (useLow || left === kick.startup - 1) {
        this.seen.oki = opp.animSeq;
        if (this.rnd() < lv.oki) {
          this.remember('oki');
          if (useLow) this.press({ down: true, kick: true }); else this.press({ kick: true });
          return this.read(self, opp, { hitters: [] });
        }
      }
    }
    // punição: rival errou um golpe e está na recuperação, perto → castiga
    const rec = recoveryLeft(opp);
    if (rec >= 10 && d < 2.2) {
      const id = opp.hitId;
      if (this.seen.punishId !== id) {
        this.seen.punishId = id;
        if (this.rnd() < lv.punish) {
          const strike = Object.entries(self.specials).find(([dir, s]) => s.kind === 'strike' && self.canSpecial(dir) && (s.startup ?? 10) < rec);
          if (strike && this.rnd() < 0.5) this.special(strike[0], F);
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
    this.wait = lv.react + Math.floor(this.rnd() * 8);
    this.hold = NEUTRAL; this.holdBlock = null;

    if (!FREE.has(self.state)) return;
    if (this.rnd() < lv.idle) { this.wait += 6; return; } // fácil: hesita (dá respiro ao jogador)

    const threat = ((opp.state === 'attack' || opp.state === 'special') && d < 2.8) ||
      match.hitters.some((h) => h.owner === opp && h.dangerous && Math.abs(h.x - self.x) < 2.6);
    // projétil do rival chegando perto: especial que reflete (Lacração Reversa) ou pose de counter (Arcabouço) absorve
    const shot = match.hitters.find((h) => h.owner === opp && h.dangerous && h.hit?.kind === 'projectile' && h.vx && Math.abs(h.x - self.x) < 2.2 && Math.sign(self.x - h.x) === Math.sign(h.vx));
    if (shot) {
      const answer = Object.entries(self.specials).find(([dir, s]) => (s.reflect || s.kind === 'counter') && self.canSpecial(dir));
      if (answer && this.rnd() < p.blockChance * lv.block) return this.special(answer[0], F);
    }
    if (threat) {
      // pose de counter (Close Certo) no lugar da defesa, quando o golpe vem de perto
      const counter = Object.entries(self.specials).find(([dir, s]) => s.kind === 'counter' && self.canSpecial(dir));
      if (counter && d < 2.4 && this.rnd() < p.blockChance * lv.block * 0.7) return this.special(counter[0], F);
    }
    // guarda acabando: em vez de defender mais um (e quebrar), recua de dash ou pula para trás
    const G = FEEL.guard;
    if (threat && G && self.guard < G.max * G.low && this.rnd() < lv.guardCare && this.fresh('escape')) {
      this.remember('escape');
      return this.rnd() < 0.5 ? this.dash(B) : this.press({ up: true, [B]: true }, 3);
    }
    if (threat && this.rnd() < p.blockChance * lv.block) {
      const low = (opp.move?.level || opp.sp?.level) === 'low';
      this.hold = { ...NEUTRAL, [B]: true, down: low }; this.holdBlock = { low };
      this.wait += 8;
      this.remember('block');
      return;
    }

    if (self.meter >= METER_MAX && d < (self.ultimate?.range ?? 3) && this.rnd() < 0.6) return this.press({ ultimate: true });

    const specials = Object.entries(self.specials).filter(([dir]) => self.canSpecial(dir));
    const want = (pred) => specials.filter(([, s]) => pred(s));

    if (d > 3.8) {
      const ranged = want((s) => s.kind === 'projectile' || s.kind === 'zone' || (s.kind === 'strike' && s.lunge));
      if (ranged.length && this.rnd() < p.specialBias && this.fresh('ranged')) { this.remember('ranged'); return this.special(this.pick(ranged)[0], F); }
      if (this.rnd() < p.jumpChance && this.fresh('jump')) { this.remember('jump'); return this.press({ up: true, [F]: true }, 3); }
      if (p.keepDistance > 3 && this.rnd() < 0.5) return;
      // aproxima andando ou, às vezes, de dash (toque duplo)
      if (this.rnd() < 0.18 * p.aggression + 0.04 && this.fresh('dash')) { this.remember('dash'); return this.dash(F); }
      this.hold = { ...NEUTRAL, [F]: true };
      return;
    }
    if (p.keepDistance > 2.5 && d < p.keepDistance && this.rnd() < 0.45) {
      if (this.rnd() < 0.3) return this.press({ up: true, [B]: true }, 3);
      this.hold = { ...NEUTRAL, [B]: true };
      return;
    }
    // rival caído longe: chega perto para o oki (meaty) em vez de esperar
    if ((opp.state === 'down' || opp.state === 'getup') && d > 1.4 && this.rnd() < lv.oki) { this.hold = { ...NEUTRAL, [F]: true }; this.wait = 6; return; }
    if (d > 1.7) {
      const mids = want((s) => s.kind !== 'grab' && s.kind !== 'counter');
      if (mids.length && this.rnd() < p.specialBias && this.fresh('mid')) { this.remember('mid'); return this.special(this.pick(mids)[0], F); }
      if (d < 2.3 && this.rnd() < 0.35 && this.fresh('kick')) { this.remember('kick'); return this.press({ kick: true }); }
      if (this.rnd() < p.aggression) { this.hold = { ...NEUTRAL, [F]: true }; this.wait = 10; }
      return;
    }

    // TARTARUGA: rival só defendendo (ou em blockstun) colado → agarrão (vence a defesa) ou golpe pesado (gasta guarda)
    const turtle = opp.state === 'blockstun' || (FREE.has(opp.state) && opp.holdingBack && opp.frameCount - (opp.backAt ?? 0) > 20);
    const grab = want((s) => s.kind === 'grab');
    if (turtle && this.rnd() < lv.throwTurtle && this.fresh('throw')) {
      this.remember('throw');
      if (G && opp.guard < G.max * 0.45 && this.rnd() < 0.5) return this.press({ kick: true }); // guarda quase quebrando: pesado
      return this.press({ [F]: true, punch: true });
    }
    if (this.rnd() < p.throwBias && this.fresh('throw')) {
      this.remember('throw');
      return grab.length && this.rnd() < 0.6 ? this.special(grab[0][0], F) : this.press({ [F]: true, punch: true });
    }
    // escolhe uma ação perto, evitando repetir a mesma 3x seguidas
    const opts = [['combo', 0.45], ['low', 0.13], ['kick', 0.12], ['close', 0.1], ['back', 0.2]];
    let act = this.roll(opts);
    if (!this.fresh(act)) act = this.roll(opts.filter(([a]) => a !== act));
    this.remember(act);
    if (act === 'combo') return this.combo();
    if (act === 'low') return this.lowCombo();
    if (act === 'kick') return this.press({ kick: true });
    if (act === 'close') {
      const close = want((s) => s.kind === 'strike');
      if (close.length) return this.special(this.pick(close)[0], F);
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
    this.press(c, ch ? 2 + Math.floor(this.rnd() * ch.max) : 2);
  }
  // soco, soco e, com hit-confirm (rival em hitstun), cancela em especial de golpe ou chute; senão termina no 3º soco
  combo(forceConfirm = false) {
    const self = this.self;
    const P = { ...NEUTRAL, punch: true };
    this.plan.push({ c: P, f: 2 }, { c: NEUTRAL, f: 7 }, { c: P, f: 2 }, { c: NEUTRAL, f: 6 });
    const confirm = forceConfirm || this.rnd() < this.lv.confirm;
    const stunned = (s, o) => o.state === 'hitstun';
    if (confirm && self) {
      const F = self.facing > 0 ? 'right' : 'left';
      const strike = Object.entries(self.specials).find(([dir, s]) => s.kind === 'strike' && self.canSpecial(dir));
      const fin = strike && this.rnd() < 0.6
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
  roll(opts) {
    const tot = opts.reduce((s, [, w]) => s + w, 0);
    let r = this.rnd() * tot;
    for (const [a, w] of opts) { if ((r -= w) < 0) return a; }
    return opts[opts.length - 1][0];
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
