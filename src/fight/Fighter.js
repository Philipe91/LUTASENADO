// FighterController: estado, física e decisões de UM lutador.
// Não conhece Three.js nem modelo 3D. O visual só lê: x, y, facing, state, animKey, animLen, animSeq, flash.
import { BASE_MOVES } from '../data/baseMoves.js';
import { GRAVITY, ARENA_HALF, METER_MAX, BUFFER, NEUTRAL } from './constants.js';
import { Hitter } from './Hitter.js';
import { applyHit } from './Combat.js';

const DEFAULT_STATS = { hp: 100, walk: 1, jump: 1, width: 0.8, height: 1.8, damage: 1, defense: 1, meterGain: 1 };
const WALK = 0.055;
import { JUMP_V } from "./constants.js";
const JUMP_X = 0.075;
const INVULNERABLE = new Set(['knockdown', 'down', 'getup', 'ko', 'victory', 'intro', 'ultimate', 'held']);
const FRICTION = new Set(['hitstun', 'blockstun', 'down', 'getup', 'ko']);
const NOT_THROWABLE = new Set(['held', 'hitstun', 'blockstun', 'knockdown', 'down', 'getup', 'ko', 'ultimate', 'intro', 'victory']);
const BUTTONS = ['punch', 'kick', 'special', 'ultimate'];
export const SPECIAL_ANIM = { neutral: 'special1', forward: 'special2', down: 'special3' };

let nextId = 1;
export const uid = () => nextId++;

export class Fighter {
  constructor(data, slot) {
    this.data = data;
    this.slot = slot;
    this.stats = { ...DEFAULT_STATS, ...data.stats };
    this.passive = data.passive || {};
    this.specials = data.specials || {};
    this.ultimate = data.ultimate;
    this.moves = {};
    for (const [id, m] of Object.entries(BASE_MOVES)) this.moves[id] = { ...m, ...(data.moves?.[id] || {}), id };
    this.meter = 0;
    this.opponent = null;
    this.frameCount = 0;
    this.cmd = NEUTRAL;
    this.prevCmd = NEUTRAL;
    this.pressedAt = {};
    this.pressedCmd = {};
    this.animSeq = 0;
    this.reset(0);
  }

  reset(x) {
    this.x = x; this.prevX = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = this.slot === 0 ? 1 : -1;
    this.hp = this.stats.hp;
    this.move = null; this.sp = null; this.hitId = 0; this.lastLanded = 0;
    this.stun = 0; this.comboTaken = 0; this.comboCount = 0; this.likes = 0;
    this.buffT = 0; this.lockT = 0; this.flash = 0; this.armorUsed = false; this.airAttackUsed = false;
    this.cooldowns = { neutral: 0, forward: 0, down: 0 };
    this.held = null; this.heldBy = null; this.heldZ = 0; this.spinAng = 0; // Abraço giratório
    this.ultRes = []; // resultado de cada hit da ultimate ('hit'|'miss'): o visual só mostra contato quando acertou
    this.setState('intro', 'intro');
  }

  // ---------- entrada ----------
  recordInput(cmd) {
    this.prevCmd = this.cmd;
    this.cmd = cmd;
    for (const b of BUTTONS) {
      if (cmd[b] && !this.prevCmd[b]) { this.pressedAt[b] = this.frameCount; this.pressedCmd[b] = cmd; }
    }
  }
  // direção valendo para um botão: a segurada agora OU a do instante do aperto (aperto no hitstop não perde a direção)
  dirFor(b, fwdNow) {
    const pc = this.pressedCmd[b] || NEUTRAL;
    const fwdThen = this.facing > 0 ? pc.right : pc.left;
    return { down: this.cmd.down || pc.down, fwd: fwdNow || fwdThen };
  }
  buffered(b) { return this.frameCount - (this.pressedAt[b] ?? -999) <= BUFFER; }
  consume(...bs) { for (const b of bs) this.pressedAt[b] = -999; }

  // ---------- helpers ----------
  get grounded() { return this.y <= 0 && this.vy <= 0; }
  get maxHp() { return this.stats.hp; }
  get isLow() {
    return this.state === 'crouch' || (this.state === 'attack' && this.move?.crouch) ||
      (this.state === 'blockstun' && this.animKey === 'crouchBlock');
  }
  distTo(o) { return Math.abs(o.x - this.x); }
  closeEnoughToGrab(o, extra = 0.45) { return this.distTo(o) <= (this.stats.width + o.stats.width) / 2 + extra; }
  canBeThrown() { return this.grounded && !NOT_THROWABLE.has(this.state); }

  setState(state, anim, len = 0) {
    this.state = state; this.t = 0;
    this.animKey = anim || state; this.animLen = len; this.animSeq++;
  }
  setAnim(anim, len = 0) {
    if (anim !== this.animKey) { this.animKey = anim; this.animLen = len; this.animSeq++; }
  }
  faceOpponent() {
    const o = this.opponent;
    if (o && o.x !== this.x) this.facing = o.x > this.x ? 1 : -1;
  }
  toNeutral() {
    this.move = null; this.sp = null; this.comboTaken = 0;
    if (!this.grounded) return this.setState('jump', 'jump');
    this.setState(this.cmd.down ? 'crouch' : 'idle', this.cmd.down ? 'crouch' : 'idle');
  }

  // Box em coordenadas do mundo, espelhada pelo lado que o lutador olha
  relBox(hb) {
    const x = this.facing > 0 ? this.x + hb.x : this.x - hb.x - hb.w;
    return { x, y: this.y + hb.y, w: hb.w, h: hb.h };
  }
  hurtbox() {
    if (INVULNERABLE.has(this.state)) return null;
    const w = this.stats.width, h = this.stats.height * (this.isLow ? 0.62 : 1);
    return { x: this.x - w / 2, y: this.y, w, h };
  }
  // Hitbox ativa do próprio corpo neste frame (golpes normais e especiais do tipo strike)
  activeAttack() {
    if (this.state === 'attack') {
      const m = this.move;
      if (this.t >= m.startup && this.t < m.startup + m.active) return { id: this.hitId, box: this.relBox(m.hitbox), hit: m };
    } else if (this.state === 'special' && this.sp.kind === 'strike') {
      const s = this.sp;
      if (this.t >= s.startup && this.t < s.startup + s.active) {
        const n = Math.floor((this.t - s.startup) / (s.rehit || 999));
        // último pulso do multi-hit pode ter efeito próprio (ex.: Discurso atordoa no final)
        const last = Math.floor((s.active - 1) / (s.rehit || 999));
        return { id: this.hitId * 100 + n, box: this.relBox(s.box), hit: n === last && s.final ? { ...s, ...s.final } : s };
      }
    }
    return null;
  }
  hasArmor() {
    if (this.armorUsed) return false;
    if (this.state === 'attack') return !!this.move.armor && this.t < this.move.startup + this.move.active;
    if (this.state === 'special') return !!this.sp.armor && this.t < this.sp.startup + (this.sp.active || 1);
    return false;
  }

  // ---------- passiva / recursos ----------
  speedMult() { return this.buffT > 0 ? (this.passive.comboBuff?.speed ?? 1) : 1; }
  damageMult() {
    let m = this.stats.damage;
    const low = this.passive.lowHp;
    if (low && this.hp / this.maxHp <= low.below) m *= low.damage;
    if (this.buffT > 0) m *= this.passive.comboBuff?.damage ?? 1;
    return m;
  }
  gainMeter(v) {
    let g = this.stats.meterGain;
    const aura = this.opponent?.passive?.aura;
    if (aura && this.distTo(this.opponent) <= aura.radius) g *= aura.enemyMeterMult;
    this.meter = Math.min(METER_MAX, this.meter + v * g);
  }
  canSpecial(dir) { return !!this.specials[dir] && this.cooldowns[dir] <= 0 && this.lockT <= 0; }

  // ---------- loop ----------
  update(match) {
    this.frameCount++;
    this.t++;
    for (const k in this.cooldowns) if (this.cooldowns[k] > 0) this.cooldowns[k]--;
    if (this.lockT > 0) this.lockT--;
    if (this.buffT > 0) this.buffT--;
    if (this.flash > 0) this.flash--;
    // agarrão interrompido (tomou golpe, KO...): solta quem estava preso
    if (this.held && this.state !== 'special') this.releaseHeld();
    // golpe com impacto no chão (pisão): poeira no 1º frame ativo, acertando ou não
    if (this.state === 'attack' && this.move?.groundFx && this.t === this.move.startup) {
      match.emit({ type: 'dust', x: this.x + this.facing * (this.move.hitbox.x + this.move.hitbox.w / 2), size: this.move.groundFx });
    }
    const c = this.cmd;
    const fwd = this.facing > 0 ? c.right : c.left;
    const back = this.facing > 0 ? c.left : c.right;
    this.holdingBack = back && !fwd;
    this.prevX = this.x;

    switch (this.state) {
      case 'intro': case 'victory': this.vx = 0; break;
      case 'idle': case 'walk': case 'crouch': this.groundControl(match, fwd, back); break;
      case 'jump':
        if (!this.airAttackUsed && this.buffered('punch')) { this.consume('punch'); this.airAttackUsed = true; this.startMove('airPunch'); }
        else if (!this.airAttackUsed && this.buffered('kick')) { this.consume('kick'); this.airAttackUsed = true; this.startMove('airKick'); }
        break;
      case 'attack': this.updateAttack(); break;
      case 'special': this.updateSpecial(match); break;
      case 'ultimate': this.updateUltimate(match); break;
      case 'hitstun': case 'blockstun': if (this.t >= this.stun && this.grounded) this.toNeutral(); break;
      case 'held':
        // o agarrador controla a posição; se ele soltou sem arremessar, cai
        if (!this.heldBy) { this.heldZ = 0; this.setState('knockdown', 'knockdown'); this.vy = 0.1; this.y = 0.001; }
        break;
      case 'down': if (this.t >= 34) this.setState('getup', 'getup', 18); break;
      case 'getup': if (this.t >= 18) this.toNeutral(); break;
      default: break; // knockdown / ko: física resolve
    }
    this.physics();
  }

  groundControl(match, fwd, back) {
    const c = this.cmd;
    this.faceOpponent();
    if (this.tryUltimate(match)) return;
    if (this.buffered('special')) {
      const d = this.dirFor('special', fwd);
      const dir = d.down ? 'down' : d.fwd ? 'forward' : 'neutral';
      this.consume('special');
      if (this.canSpecial(dir)) return this.startSpecial(dir, match);
      if (this.lockT > 0) match.emit({ type: 'text', fighter: this, text: 'BLOQUEADO!', cls: 'lock' });
    }
    if (this.buffered('punch')) {
      const d = this.dirFor('punch', fwd);
      this.consume('punch');
      const o = this.opponent;
      if (d.fwd && this.closeEnoughToGrab(o) && o.canBeThrown()) return this.startMove('throw');
      return this.startMove(d.down ? 'crouchPunch' : 'punch1');
    }
    if (this.buffered('kick')) { const d = this.dirFor('kick', fwd); this.consume('kick'); return this.startMove(d.down ? 'sweep' : 'kick'); }
    if (c.up) {
      this.vy = JUMP_V * this.stats.jump;
      this.vx = (fwd ? 1 : back ? -1 : 0) * JUMP_X * this.facing * this.speedMult();
      this.y = 0.001;
      this.airAttackUsed = false;
      return this.setState('jump', 'jump');
    }
    if (c.down) {
      this.vx = 0;
      if (this.state !== 'crouch') this.setState('crouch', 'crouch');
      return;
    }
    if (fwd || back) {
      const speed = WALK * this.stats.walk * this.speedMult() * (back ? 0.75 : 1);
      this.vx = (fwd ? 1 : -1) * speed * this.facing;
      if (this.state !== 'walk') this.setState('walk', fwd ? 'walk' : 'walkBack');
      else this.setAnim(fwd ? 'walk' : 'walkBack');
      return;
    }
    this.vx = 0;
    if (this.state !== 'idle') this.setState('idle', 'idle');
  }

  startMove(id) {
    const m = this.moves[id];
    this.move = m; this.hitId = uid(); this.armorUsed = false;
    if (!m.air) this.vx = (m.lunge || 0) * this.facing;
    this.setState('attack', m.anim, m.startup + m.active + m.recovery);
  }

  updateAttack() {
    const m = this.move, total = m.startup + m.active + m.recovery;
    if (m.air) {
      if (this.t >= total) { this.move = null; this.setState('jump', 'jump'); }
      return;
    }
    this.vx *= 0.8;
    if (m.chain && this.t >= m.startup + m.active && this.buffered('punch')) {
      this.consume('punch');
      return this.startMove(m.chain);
    }
    if (this.t >= total) this.toNeutral();
  }

  // ---------- especiais (dirigidos por dados) ----------
  startSpecial(dir, match) {
    const s = this.specials[dir];
    this.sp = { level: 'mid', startup: 10, active: 0, recovery: 15, ...s, dir };
    this.cooldowns[dir] = s.cooldown ?? 120;
    this.hitId = uid(); this.armorUsed = false; this.vx = 0;
    const total = this.sp.startup + this.sp.active + this.sp.recovery;
    this.setState('special', s.anim || SPECIAL_ANIM[dir], total);
    match.emit({ type: 'special', fighter: this, name: s.name, dir });
    if (s.shout) match.emit({ type: 'text', fighter: this, text: s.shout, cls: 'shout' });
  }

  updateSpecial(match) {
    const s = this.sp, o = this.opponent;
    const total = s.startup + s.active + s.recovery;
    if (s.kind === 'strike') {
      const active = this.t >= s.startup && this.t < s.startup + s.active;
      this.vx = active ? (s.lunge || 0) * this.facing * this.speedMult() : this.vx * 0.7;
    }
    if (this.t === s.startup) {
      if (s.kind === 'projectile') {
        // fromBehind: nasce atrás do lançador e atravessa a arena (ex.: caminhão)
        const x = s.fromBehind ? this.x - this.facing * s.fromBehind : this.x + this.facing * 0.6;
        match.spawn(Hitter.fromSpec(this, s, x, this.y + (s.box.y ?? 0.8), this.facing));
      } else if (s.kind === 'zone') {
        const tx = s.atOpponent ? o.x : this.x + this.facing * (s.dist ?? 2.5);
        match.spawn(new Hitter({
          owner: this, hit: s, x: tx, y: s.box.y ?? 0, w: s.box.w, h: s.box.h, delay: s.delay ?? 30,
          life: (s.activeFrames ?? 8) + (s.linger ?? 0), activeUntil: (s.delay ?? 30) + (s.activeFrames ?? 8), linger: !!s.linger, hitsLeft: s.hits ?? 1, rehit: s.rehit ?? 10, visual: s.visual, color: s.color, facing: this.facing,
        }));
      } else if (s.kind === 'grab') {
        if (this.distTo(o) <= s.range && o.canBeThrown()) {
          if (s.spin) this.startSpin(o, match);
          else applyHit(match, this, o, { ...s, throw: true, unblockable: true, knockdown: true, heavy: true }, this.x);
        } else {
          match.emit({ type: 'text', fighter: this, text: 'ERROU!', cls: 'miss' });
        }
      }
    }
    if (this.held) this.updateSpin(match);
    if (this.t >= total) this.toNeutral();
  }

  // ---------- Abraço giratório (grab com spin): prende, gira N voltas em volta de si e arremessa ----------
  startSpin(o, match) {
    const s = this.sp;
    this.held = o; o.heldBy = this;
    o.move = null; o.sp = null; o.comboTaken = 0; o.vx = 0; o.vy = 0; o.y = 0;
    o.setState('held', 'hit');
    s.active = s.spin.frames; // o giro vira a janela "ativa" do especial
    this.animLen = s.startup + s.active + s.recovery; this.animSeq++; // replay com as fases novas (scrub)
    match.emit({ type: 'grab', fighter: this, target: o });
    if (s.text) match.emit({ type: 'text', fighter: this, text: s.text, cls: 'shout' });
  }
  updateSpin(match) {
    const s = this.sp, sp = s.spin, o = this.held;
    const k = this.t - s.startup;
    if (k < sp.frames) {
      const q = k / sp.frames;
      this.spinAng = sp.turns * Math.PI * 2 * q * q; // acelera: começa pesado, termina girando rápido
      o.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.x + this.facing * sp.radius * Math.cos(this.spinAng)));
      o.heldZ = sp.radius * Math.sin(this.spinAng);
      o.y = 0; o.vx = 0; o.vy = 0;
      return;
    }
    // soltou: arremesso na frente (ângulo final = N voltas completas)
    this.releaseHeld();
    o.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.x + this.facing * sp.radius));
    o.setState('hitstun', 'hit', 1); // volta a ter hurtbox para receber o arremesso
    applyHit(match, this, o, { ...s, text: s.throwText, throw: true, unblockable: true, knockdown: true, heavy: true, hitstop: 16 }, this.x);
  }
  releaseHeld() {
    if (this.held) { this.held.heldBy = null; this.held.heldZ = 0; }
    this.held = null; this.spinAng = 0;
  }

  // ---------- ultimate ----------
  tryUltimate(match) {
    if (!this.ultimate || this.meter < METER_MAX) return false;
    const wants = this.buffered('ultimate') || (this.buffered('special') && this.buffered('kick'));
    if (!wants) return false;
    this.consume('ultimate', 'special', 'kick');
    this.meter = 0; this.vx = 0;
    this.hitId = uid();
    this.ultHits = 0;
    this.ultRes = [];
    this.setState('ultimate', 'ultimate', this.ultimateLength());
    match.startCinematic(this);
    return true;
  }
  ultimateLength() { const u = this.ultimate; return 12 + u.hits * u.interval + 40; }

  updateUltimate(match) {
    const u = this.ultimate, o = this.opponent;
    const start = 12, hitsEnd = start + u.hits * u.interval;
    const d = this.distTo(o);
    this.faceOpponent();
    this.vx = this.t < hitsEnd && d > u.range * 0.7 ? 0.1 * this.facing : 0;
    // ultRes[i] = resultado REAL de cada hit (i = u.hits é o finalizador). O visual lê isso para decidir
    // entre contato (caneta crava / tentáculo encosta) e erro (passa direto / bate no chão).
    if (this.t >= start && this.t < hitsEnd && (this.t - start) % u.interval === 0) {
      const i = (this.t - start) / u.interval;
      this.ultRes[i] = d <= u.range ? applyHit(match, this, o, {
        damage: u.damage, hitstun: u.interval + 8, push: 0.02, unblockable: true, heavy: true, ultimate: true,
      }, this.x) : 'miss';
    }
    if (this.t === hitsEnd + 6) {
      this.ultRes[u.hits] = d <= u.range + 1 ? applyHit(match, this, o, {
        damage: u.finisher, knockdown: true, push: 0.25, unblockable: true, heavy: true, ultimate: true, text: u.text,
      }, this.x) : 'miss';
    }
    if (this.t >= this.ultimateLength()) this.toNeutral();
  }

  // ---------- física ----------
  physics() {
    if (this.heldBy) return; // preso no Abraço: posição vem do agarrador
    const airborne = this.y > 0 || this.vy > 0;
    if (airborne) {
      this.vy -= GRAVITY;
      this.y += this.vy;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.land(); }
    }
    this.x += this.vx;
    if (!airborne && FRICTION.has(this.state)) this.vx *= 0.82;
    this.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.x));
  }
  land() {
    if (this.state === 'jump' || (this.state === 'attack' && this.move?.air)) { this.vx = 0; this.toNeutral(); }
    else if (this.state === 'knockdown') { this.vx *= 0.5; this.setState('down', 'down'); }
    else if (this.state === 'ko') { this.vx *= 0.4; }
  }
}
