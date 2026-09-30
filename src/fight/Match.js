// Partida: rounds, timer, KO, câmera lenta, cinemática de ultimate, projéteis.
// 100% lógica — roda no navegador e em Node (tests/sim.mjs).
import { Fighter } from './Fighter.js';
import { resolveHits } from './Combat.js';
import { Hitter } from './Hitter.js';
import { MAX_SEP, ARENA_HALF, ROUND_FRAMES, NEUTRAL } from './constants.js';

export const ROUND_NAMES = ['PRIMEIRO TURNO', 'SEGUNDO TURNO', 'TERCEIRO TURNO?!'];
const KO_TEXTS = ['CASSADO!', 'VETADO!', 'ARQUIVADO!', 'INELEGÍVEL!', 'RENUNCIOU!'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Match {
  constructor(dataA, dataB, controllers) {
    this.fighters = [new Fighter(dataA, 0), new Fighter(dataB, 1)];
    this.fighters[0].opponent = this.fighters[1];
    this.fighters[1].opponent = this.fighters[0];
    this.controllers = controllers;
    this.wins = [0, 0];
    this.round = 0;
    this.frame = 0;
    this.events = [];
    this.startRound();
  }

  emit(e) { this.events.push(e); }
  drainEvents() { const e = this.events; this.events = []; return e; }
  spawn(h) { this.hitters.push(h); }
  get roundName() { return ROUND_NAMES[Math.min(this.round - 1, 2)]; }

  startRound() {
    this.round++;
    this.hitters = [];
    this.fighters[0].reset(-2.6);
    this.fighters[1].reset(2.6);
    this.phase = 'intro';
    this.phaseT = 0;
    this.timer = ROUND_FRAMES;
    this.hitstop = 0;
    this.cinematic = null;
    this.timeScale = 1;
    this.winner = null;
    this.emit({ type: 'roundStart', round: this.round, name: this.roundName });
  }

  startCinematic(f) {
    this.cinematic = { fighter: f, t: 75 };
    this.hitters = this.hitters.filter((h) => h.owner === f);
    this.emit({ type: 'ultimate', fighter: f, name: f.ultimate.name });
  }

  onKO(atk, def, byUltimate) {
    if (this.phase !== 'fight') return;
    this.phase = 'ko'; this.phaseT = 0;
    this.winner = atk; this.loser = def;
    this.timeScale = 0.3;
    const text = byUltimate ? 'MEDIDA PROVISÓRIA!' : pick([...KO_TEXTS, ...(atk.data.koTexts || [])]);
    this.emit({ type: 'ko', text, winner: atk, loser: def, byUltimate });
  }

  timeUp() {
    const [a, b] = this.fighters;
    const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    const tie = Math.abs(ra - rb) < 0.001;
    this.winner = tie ? pick([a, b]) : ra > rb ? a : b;
    this.loser = this.winner.opponent;
    this.phase = 'ko'; this.phaseT = 40;
    this.emit({ type: 'ko', text: tie ? 'EMPATE TÉCNICO!' : 'FIM DO MANDATO!', winner: this.winner, loser: this.loser, timeUp: true });
  }

  step() {
    this.frame++;
    const fs = this.fighters;
    for (let i = 0; i < 2; i++) {
      const cmd = this.phase === 'fight' && !this.cinematic ? this.controllers[i].read(fs[i], fs[1 - i], this) : NEUTRAL;
      fs[i].recordInput(cmd);
    }
    if (this.cinematic) {
      if (--this.cinematic.t <= 0) { this.cinematic = null; this.emit({ type: 'cinematicEnd' }); }
      return;
    }
    if (this.hitstop > 0) { this.hitstop--; return; }

    this.phaseT++;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT === 80) this.emit({ type: 'banner', text: 'LUTEM!', cls: 'fight' });
        if (this.phaseT >= 100) { this.phase = 'fight'; fs.forEach((f) => f.toNeutral()); }
        break;
      case 'fight':
        if (--this.timer <= 0) this.timeUp();
        break;
      case 'ko':
        if (this.phaseT === 45) this.timeScale = 1;
        if (this.phaseT >= 75) {
          this.phase = 'roundEnd'; this.phaseT = 0; this.timeScale = 1;
          this.wins[this.winner.slot]++;
          this.winner.move = null; this.winner.sp = null;
          this.winner.setState('victory', 'victory');
          this.emit({ type: 'roundWin', winner: this.winner, wins: [...this.wins] });
        }
        break;
      case 'roundEnd':
        if (this.phaseT >= 150) {
          if (Math.max(...this.wins) >= 2) {
            this.phase = 'matchEnd';
            const lines = this.winner.data.lines?.win || ['...'];
            this.emit({ type: 'matchEnd', winner: this.winner, line: pick(lines) });
          } else this.startRound();
        }
        break;
      default: break;
    }

    for (const f of fs) f.update(this);
    this.separate();
    for (const h of this.hitters) {
      h.update();
      if (h.triggerRange && !h.dead && h.armed && Math.abs(h.x - h.owner.opponent.x) < h.triggerRange) h.dead = true;
    }
    if (this.phase === 'fight') resolveHits(this);
    const spawned = [];
    for (const h of this.hitters) {
      if (!h.dead || !h.spawnOnEnd) continue;
      const s = h.spawnOnEnd;
      let child;
      if (s.anchor === 'owner') {
        // nasce ATRÁS do dono (posição dele agora, sentido do lançamento), atravessa o dono e passa do alvo
        const start = Math.max(-ARENA_HALF - 1, Math.min(ARENA_HALF + 1, h.owner.x - h.facing * (s.back ?? 1.8)));
        child = Hitter.fromSpec(h.owner, s, start, s.box.y ?? 0, h.facing);
        const reach = Math.abs(h.owner.opponent.x - start) + (s.overshoot ?? 2.5);
        child.life = Math.min(s.maxLife ?? 150, Math.ceil(reach / Math.abs(child.vx || 0.1)));
      } else {
        child = Hitter.fromSpec(h.owner, s, h.x - h.facing * (s.back ?? 0), s.box.y ?? 0, h.facing);
      }
      spawned.push(child);
      // flash de surgimento onde a onda nasce (atrás do dono, no caso da Picanha) — não no alvo
      this.emit({ type: 'spawn', x: child.x, y: 0.2, visual: s.visual, owner: h.owner });
    }
    this.hitters = this.hitters.filter((h) => !h.dead).concat(spawned);
  }

  // Empurra corpos que se sobrepõem e limita a distância máxima (enquadramento da câmera)
  separate() {
    const [a, b] = this.fighters;
    if (a.heldBy || b.heldBy) return; // Abraço: o agarrador posiciona o preso
    for (let pass = 0; pass < 2; pass++) {
      const minD = (a.stats.width + b.stats.width) * 0.45;
      const dx = b.x - a.x;
      if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 1.3 && a.state !== 'ko' && b.state !== 'ko') {
        const s = dx === 0 ? (a.facing > 0 ? 1 : -1) : Math.sign(dx);
        const push = (minD - Math.abs(dx)) / 2;
        a.x -= s * push; b.x += s * push;
        for (const f of [a, b]) f.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, f.x));
      }
    }
    if (Math.abs(b.x - a.x) > MAX_SEP) {
      for (const f of [a, b]) {
        const away = Math.sign(f.x - f.opponent.x);
        if ((f.x - f.prevX) * away > 0) f.x = f.prevX;
      }
      const d = Math.abs(b.x - a.x);
      if (d > MAX_SEP) {
        const s = Math.sign(b.x - a.x), fix = (d - MAX_SEP) / 2;
        a.x += s * fix; b.x -= s * fix;
      }
    }
  }
}
