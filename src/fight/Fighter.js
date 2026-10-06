// FighterController: estado, física e decisões de UM lutador.
// Não conhece Three.js nem modelo 3D. O visual só lê: x, y, facing, state, animKey, animLen, animSeq, flash.
import { BASE_MOVES } from '../data/baseMoves.js';
import { GRAVITY, ARENA_HALF, METER_MAX, BUFFER, NEUTRAL, FEEL } from './constants.js';
import { Hitter } from './Hitter.js';
import { Assist } from './Assist.js';
import { applyHit, overlap } from './Combat.js';

const DEFAULT_STATS = { hp: 100, walk: 1, jump: 1, width: 0.8, height: 1.8, damage: 1, defense: 1, meterGain: 1 };
const WALK = 0.055;
import { JUMP_V } from "./constants.js";
const JUMP_X = 0.075;
// DASH (toque duplo frente/trás): impulso curto com freio (rápido no início, desacelera no fim)
const DASH = {
  fwd: { frames: 18, v: 0.15, cancel: 6 },   // pode emendar golpe a partir do frame 6 (corrida curta + soco)
  back: { frames: 16, v: 0.13, cancel: 12 }, // recuo: só cancela no finalzinho (é fuga, não ataque)
};
const TAP_WINDOW = 14; // frames entre os dois toques
const TAP_MAX_HOLD = 10; // o 1º toque precisa ser curto (segurar = andar, não dash)
// knockdown NÃO está aqui: quem cai ainda pode tomar juggle (limitado por FEEL.juggle) — ver hurtbox()
const INVULNERABLE = new Set(['down', 'getup', 'ko', 'victory', 'intro', 'ultimate', 'held']);
const FRICTION = new Set(['hitstun', 'blockstun', 'down', 'getup', 'ko']);
const NOT_THROWABLE = new Set(['held', 'hitstun', 'blockstun', 'knockdown', 'down', 'getup', 'ko', 'ultimate', 'intro', 'victory']);
const BUTTONS = ['punch', 'kick', 'special', 'ultimate'];
const FREE_STATES = new Set(['idle', 'walk', 'crouch']);
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
    // recurso extra por dados (passive.resource = { name, max, perDamage }): ex. CAPITAL do Vorcaro. Dura a partida toda.
    this.resource = this.passive.resource || null;
    this.res = 0;
    this.opponent = null;
    this.frameCount = 0;
    this.cmd = NEUTRAL;
    this.prevCmd = NEUTRAL;
    this.pressedAt = {};
    this.pressedCmd = {};
    this.rawAt = {}; // último aperto de cada botão, mesmo se já usado por um golpe (tech de agarrão/queda)
    this.taps = { left: { at: -999, prev: -999, rel: -999, prevHeld: 99 }, right: { at: -999, prev: -999, rel: -999, prevHeld: 99 } };
    this.hitSeq = 0; this.hitInfo = null; // última reação de golpe (o visual lê: zona alta/média/baixa, força, direção)
    this.animSeq = 0;
    this.reset(0);
  }

  reset(x) {
    this.x = x; this.prevX = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.px = x; this.py = 0; // posição do frame lógico anterior (o visual interpola entre px e x)
    // juggle (hits tomados no ar nesta queda, gravidade extra) · queda dura (sem tech) · imunidade a agarrão ao levantar
    this.juggle = 0; this.juggleG = 1; this.hardKD = false; this.wakeT = 0; this.landedAt = -999;
    this.lastHitFrame = -999; this.counterHit = false;
    this.facing = this.slot === 0 ? 1 : -1;
    this.hp = this.stats.hp;
    this.move = null; this.sp = null; this.hitId = 0; this.lastLanded = 0;
    this.stun = 0; this.comboTaken = 0; this.comboCount = 0; this.likes = 0;
    this.buffT = 0; this.lockT = 0; this.flash = 0; this.armorUsed = false; this.airAttackUsed = false;
    this.cooldowns = { neutral: 0, forward: 0, down: 0 };
    this.held = null; this.heldBy = null; this.heldZ = 0; this.spinAng = 0; // Abraço giratório
    this.sinceHit = 0; // frames sem tomar golpe (passiva Presença)
    this.counterSeq = 0; this.counterInfo = null; // último contra-golpe (Close Certo / PERFECT SELFIE): o visual lê
    this.lowHpShown = false; this.dashV = 0;
    // debuffs genéricos por dados (Combat.applyHit): controles invertidos (hit.invert) e lentidão (hit.slow)
    this.invertT = 0; this.slowT = 0; this.slowMult = 1; this.slowText = '';
    this.doubleReady = false; this.charged = 0; // passiva doubleNext (DOBRAR A META) · carga do especial (charge)
    this.ultRes = []; // resultado de cada hit da ultimate ('hit'|'miss'): o visual só mostra contato quando acertou
    this.guard = FEEL.guard?.max ?? 100; this.guardCd = 0; // barra de guarda (FEEL.guard): zera → GUARDA QUEBRADA
    this.wallBounced = false; // quique na parede já usado nesta queda
    this.comebackOn = false; // DISCURSO DE REAÇÃO (FEEL.comeback) já disparou neste round
    this.dirHist = []; this.motion = null; // motion input opcional (↓↘→ etc.)
    this.setState('intro', 'intro');
  }

  // ---------- entrada ----------
  recordInput(cmd) {
    // CONFUSO (controles invertidos): esquerda ↔ direita enquanto invertT > 0 (Dilmês Total)
    if (this.invertT > 0) cmd = { ...cmd, left: cmd.right, right: cmd.left };
    this.prevCmd = this.cmd;
    this.cmd = cmd;
    for (const b of BUTTONS) {
      if (cmd[b] && !this.prevCmd[b]) { this.pressedAt[b] = this.rawAt[b] = this.frameCount; this.pressedCmd[b] = cmd; }
    }
    // toques nas direções (dash por toque duplo)
    for (const d of ['left', 'right']) {
      const tp = this.taps[d];
      if (cmd[d] && !this.prevCmd[d]) { tp.prev = tp.at; tp.prevHeld = tp.rel - tp.prev; tp.at = this.frameCount; }
      if (!cmd[d] && this.prevCmd[d]) tp.rel = this.frameCount;
    }
    this.readMotion(cmd);
  }
  // MOTION INPUT opcional (FEEL.motion): direções em notação numérica relativa ao lado que olha (2=↓ 3=↘ 6=→ 1=↙ 4=←).
  // ↓↘→ (ou ↓→) = 'forward' · ↓↙← (ou ↓←) = 'neutral' · ↓,solta,↓ = 'down'. O padrão fica "armado" `link` frames
  // esperando soco/chute (motionSpecial). Determinista: só lê o histórico de direções.
  readMotion(cmd) {
    const M = FEEL.motion;
    if (!M?.enabled) return;
    const fwd = this.facing > 0 ? cmd.right : cmd.left, back = this.facing > 0 ? cmd.left : cmd.right;
    const d = cmd.down ? (fwd ? 3 : back ? 1 : 2) : fwd ? 6 : back ? 4 : 5;
    const h = this.dirHist;
    if (h.length && h[h.length - 1].d === d) return;
    h.push({ d, f: this.frameCount });
    if (h.length > 6) h.shift();
    const p1 = h[h.length - 2], p2 = h[h.length - 3];
    const fresh = (e) => !!e && this.frameCount - e.f <= M.window;
    const from2 = (diag) => (p1?.d === 2 && fresh(p1)) || (p1?.d === diag && p2?.d === 2 && fresh(p2));
    let dir = null;
    if (d === 6 && from2(3)) dir = 'forward';
    else if (d === 4 && from2(1)) dir = 'neutral';
    else if (d === 2 && p1?.d === 5 && p2?.d === 2 && fresh(p2)) dir = 'down';
    if (dir) this.motion = { dir, at: this.frameCount };
  }
  // motion armado + soco/chute no buffer → { dir, button }
  motionSpecial() {
    const mo = this.motion, M = FEEL.motion;
    if (!mo || !M?.enabled) return null;
    if (this.frameCount - mo.at > M.link) { this.motion = null; return null; }
    const b = ['punch', 'kick'].find((k) => this.buffered(k) && (this.pressedAt[k] ?? -999) >= mo.at - 2);
    return b ? { dir: mo.dir, button: b } : null;
  }
  // direção valendo para um botão: a segurada agora OU a do instante do aperto (aperto no hitstop não perde a direção)
  dirFor(b, fwdNow) {
    const pc = this.pressedCmd[b] || NEUTRAL;
    const fwdThen = this.facing > 0 ? pc.right : pc.left;
    return { down: this.cmd.down || pc.down, fwd: fwdNow || fwdThen };
  }
  buffered(b) { return this.frameCount - (this.pressedAt[b] ?? -999) <= BUFFER; }
  consume(...bs) { for (const b of bs) this.pressedAt[b] = -999; }
  // toque duplo recente na direção absoluta d ('left'|'right')
  doubleTap(d) {
    const tp = this.taps[d];
    return this.cmd[d] && this.frameCount - tp.at <= 3 && tp.at - tp.prev <= TAP_WINDOW && tp.prevHeld >= 0 && tp.prevHeld <= TAP_MAX_HOLD;
  }

  // ---------- helpers ----------
  get grounded() { return this.y <= 0 && this.vy <= 0; }
  get maxHp() { return this.stats.hp; }
  get isLow() {
    return this.state === 'crouch' || (this.state === 'attack' && this.move?.crouch) ||
      (this.state === 'blockstun' && this.animKey === 'crouchBlock');
  }
  distTo(o) { return Math.abs(o.x - this.x); }
  closeEnoughToGrab(o, extra = 0.45) { return this.distTo(o) <= (this.stats.width + o.stats.width) / 2 + extra; }
  canBeThrown() { return this.grounded && this.wakeT <= 0 && !NOT_THROWABLE.has(this.state); }
  // apertou algum botão nos últimos n frames (tech de queda / tech de agarrão)
  pressedWithin(n, bs = BUTTONS) { return bs.some((b) => this.frameCount - (this.rawAt[b] ?? -999) <= n); }

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
    this.move = null; this.sp = null; this.comboTaken = 0; this.hardKD = false; this.juggle = 0; this.juggleG = 1; this.wallBounced = false;
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
    if (this.state === 'knockdown' && this.juggle >= FEEL.juggle.limit) return null; // anti-infinito: estourou o juggle
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
        let hit = n === last && s.final ? { ...s, ...s.final } : s;
        // de perto o golpe atordoa (Selfie do Dano: flash na cara)
        if (s.closeStun && this.distTo(this.opponent) <= s.closeStun.range) hit = { ...hit, stun: s.closeStun.stun, text: s.closeStun.text ?? hit.text };
        return { id: this.hitId * 100 + n, box: this.relBox(s.box), hit };
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
  get buffSpec() { return this.passive.comboBuff || this.passive.perfectBlock; }
  // Presença (Erika): N frames sem apanhar → bônus de velocidade até tomar o próximo golpe
  get presenceOn() { const p = this.passive.presence; return !!p && this.sinceHit >= p.after; }
  speedMult() { return (this.buffT > 0 ? (this.buffSpec?.speed ?? 1) : 1) * (this.presenceOn ? this.passive.presence.speed : 1) * (this.slowT > 0 ? this.slowMult : 1); }
  get lowHpOn() { const low = this.passive.lowHp; return !!low && this.hp / this.maxHp <= low.below; }
  damageMult() {
    let m = this.stats.damage;
    const low = this.passive.lowHp;
    if (low?.damage && this.lowHpOn) m *= low.damage;
    if (this.buffT > 0) m *= this.buffSpec?.damage ?? 1;
    if (this.comebackOn && FEEL.comeback) m *= FEEL.comeback.damage ?? 1;
    return m;
  }
  // multiplicador de dano RECEBIDO (<1 = aguenta mais): passiva de vida baixa com `defense` (ex.: CLÃ do Flavão)
  defenseMult() {
    const low = this.passive.lowHp;
    return low?.defense && this.lowHpOn ? low.defense : 1;
  }
  // está "fantasma": especial que atravessa o oponente (cadeira do Senador Express, Operação Tática) — separate() não empurra
  get ghost() { return this.state === 'special' && !!this.sp?.passThrough; }
  gainMeter(v) {
    let g = this.stats.meterGain;
    const aura = this.opponent?.passive?.aura;
    if (aura && this.distTo(this.opponent) <= aura.radius) g *= aura.enemyMeterMult;
    // passiva MOBILIZAÇÃO (Boulos): perto do rival a barra enche mais rápido
    const near = this.passive.nearMeter;
    if (near && this.opponent && this.distTo(this.opponent) <= near.radius) g *= near.mult;
    if (this.comebackOn && FEEL.comeback) g *= FEEL.comeback.meter ?? 1; // DISCURSO DE REAÇÃO: barra enche mais rápido
    this.meter = Math.min(METER_MAX, this.meter + v * g);
  }
  gainRes(v) { if (this.resource) this.res = Math.min(this.resource.max, this.res + v); }
  // especial com `capital: { cost, damage }` gasta até `cost` do recurso e ganha até +damage×100% de dano
  boostSpecial(s, match) {
    const cap = s.capital;
    if (!cap || !this.resource || this.res <= 0) return s;
    const pay = Math.min(this.res, cap.cost);
    this.res -= pay;
    const b = 1 + (pay / cap.cost) * cap.damage;
    if (b >= 1 + cap.damage * 0.5) match.emit({ type: 'text', fighter: this, text: `${this.resource.name} x${b.toFixed(1)}`, cls: 'buff' });
    return { ...boostHit(s, b), boost: b };
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
    if (this.invertT > 0) this.invertT--;
    if (this.slowT > 0) this.slowT--;
    if (this.wakeT > 0) this.wakeT--;
    this.sinceHit++;
    // barra de guarda regenera fora da defesa (FEEL.guard.regen por frame)
    const G = FEEL.guard;
    if (this.guardCd > 0) this.guardCd--;
    if (G && this.state !== 'blockstun' && this.guardCd <= 0 && this.guard < G.max) this.guard = Math.min(G.max, this.guard + G.regen);
    // DISCURSO DE REAÇÃO (comeback universal): ao cruzar FEEL.comeback.below da vida, avisa uma vez por round
    const CB = FEEL.comeback;
    if (CB && !this.comebackOn && this.hp > 0 && this.hp / this.maxHp <= CB.below) {
      this.comebackOn = true;
      match.emit({ type: 'comeback', fighter: this, text: CB.text });
      match.emit({ type: 'text', fighter: this, text: CB.text, cls: 'buff' });
    }
    // passiva de vida baixa com aviso: avisa UMA vez ao cruzar o limite (ex.: CLÃ!)
    const low = this.passive.lowHp;
    if (low?.text && !this.lowHpShown && this.lowHpOn && this.hp > 0) { this.lowHpShown = true; match.emit({ type: 'text', fighter: this, text: low.text, cls: 'buff' }); }
    // agarrão interrompido (tomou golpe, KO...): solta quem estava preso
    if (this.held && this.state !== 'special') this.releaseHeld();
    // golpe com impacto no chão (pisão, Pisão Cretáceo): poeira + tremor no 1º frame ativo, acertando ou não
    const gm = this.state === 'attack' ? this.move : this.state === 'special' ? this.sp : null;
    if (gm?.groundFx && this.t === gm.startup) {
      const hb = gm.hitbox || gm.box || { x: 0.2, w: 0.6 };
      match.emit({ type: 'dust', x: this.x + this.facing * ((hb.x ?? 0.2) + hb.w / 2), size: gm.groundFx });
    }
    const c = this.cmd;
    const fwd = this.facing > 0 ? c.right : c.left;
    const back = this.facing > 0 ? c.left : c.right;
    const hb = back && !fwd;
    if (hb && !this.holdingBack) this.backAt = this.frameCount; // início da defesa (passiva TÁ OK: defesa perfeita)
    this.holdingBack = hb;
    this.prevX = this.x;
    const st0 = this.state;

    switch (this.state) {
      case 'intro': case 'victory': this.vx = 0; break;
      case 'idle': case 'walk': case 'crouch': this.groundControl(match, fwd, back); break;
      case 'jump':
        this.airControl(fwd, back);
        if (!this.airAttackUsed && this.buffered('punch')) { this.consume('punch'); this.airAttackUsed = true; this.startMove('airPunch'); }
        else if (!this.airAttackUsed && this.buffered('kick')) { this.consume('kick'); this.airAttackUsed = true; this.startMove('airKick'); }
        break;
      case 'attack': this.updateAttack(match); break;
      case 'dash': this.updateDash(match, fwd, back); break;
      case 'special': this.updateSpecial(match); break;
      case 'ultimate': this.updateUltimate(match); break;
      case 'hitstun': case 'blockstun': if (this.t >= this.stun && this.grounded) this.toNeutral(); break;
      case 'held':
        // o agarrador controla a posição; se ele soltou sem arremessar, cai
        if (!this.heldBy) { this.heldZ = 0; this.setState('knockdown', 'knockdown'); this.vy = 0.1; this.y = 0.001; }
        break;
      case 'down': {
        // TECH de queda: botão apertado perto da hora de cair → levanta rápido (rolando para trás um pouco)
        const W = FEEL.wakeup;
        if (!this.hardKD && this.t <= W.techWindow && this.hp > 0 && this.pressedWithin(W.techWindow)) {
          this.consume(...BUTTONS);
          this.teched = true;
          this.vx = -this.facing * W.techRoll;
          this.setState('getup', 'getup', W.techGetup);
          match.emit({ type: 'tech', fighter: this, x: this.x });
          match.emit({ type: 'text', fighter: this, text: 'LEVANTOU!', cls: 'buff' });
        } else if (this.t >= W.down) { this.teched = false; this.setState('getup', 'getup', W.getup); }
        break;
      }
      case 'getup':
        if (this.t >= (this.teched ? FEEL.wakeup.techGetup : FEEL.wakeup.getup)) { this.teched = false; this.wakeT = FEEL.wakeup.throwInv; this.toNeutral(); }
        break;
      default: break; // knockdown / ko: física resolve
    }
    // 1º frame livre já age: golpe/pulo/especial que estava no buffer sai NESTE frame (sem 1 frame morto de "idle")
    if (!FREE_STATES.has(st0) && st0 !== 'intro' && st0 !== 'victory' && FREE_STATES.has(this.state) && this.t === 0 && match.phase === 'fight') {
      this.groundControl(match, fwd, back);
    }
    this.physics(match);
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
    const mo = this.motionSpecial(); // ↓↘→ + soco/chute (opcional)
    if (mo && this.canSpecial(mo.dir)) { this.consume(mo.button); this.motion = null; return this.startSpecial(mo.dir, match); }
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
      this.approachVx(0, FEEL.move.decel * 1.4); // agachar freia quase na hora
      if (this.state !== 'crouch') this.setState('crouch', 'crouch');
      return;
    }
    if (fwd || back) {
      const F = this.facing > 0 ? 'right' : 'left', B = this.facing > 0 ? 'left' : 'right';
      if (fwd && this.doubleTap(F)) return this.startDash(match, 1);
      if (back && this.doubleTap(B)) return this.startDash(match, -1);
      const speed = WALK * this.stats.walk * this.speedMult() * (back ? 0.75 : 1);
      this.approachVx((fwd ? 1 : -1) * speed * this.facing, FEEL.move.accel);
      if (this.state !== 'walk') this.setState('walk', fwd ? 'walk' : 'walkBack');
      else this.setAnim(fwd ? 'walk' : 'walkBack');
      return;
    }
    this.approachVx(0, FEEL.move.decel);
    if (this.state !== 'idle') this.setState('idle', 'idle');
  }
  // aceleração/freio curtos: a velocidade persegue o alvo (k = fração por frame); some o resíduo minúsculo
  approachVx(target, k) {
    // trocar de sentido não "patina": o freio vale em dobro quando o alvo é do lado oposto
    const kk = Math.sign(target) && Math.sign(this.vx) && Math.sign(target) !== Math.sign(this.vx) ? Math.min(1, k * 2) : k;
    this.vx += (target - this.vx) * kk;
    if (Math.abs(this.vx - target) < 0.002) this.vx = target;
  }
  // controle aéreo leve: dá para corrigir o arco do pulo um pouco, sem virar o pulo do avesso
  airControl(fwd, back) {
    const want = fwd ? 1 : back ? -1 : 0;
    if (!want) return;
    const cap = JUMP_X * FEEL.move.airMax * this.speedMult();
    this.vx = Math.max(-cap, Math.min(cap, this.vx + want * this.facing * FEEL.move.airAccel));
  }

  // ---------- dash ----------
  startDash(match, dir) {
    const d = dir > 0 ? DASH.fwd : DASH.back;
    this.dashDir = dir;
    this.taps.left.at = this.taps.right.at = -999; // consome o toque
    this.setState('dash', dir > 0 ? 'dash' : 'backdash', d.frames);
    this.vx = dir * d.v * this.dashMult(dir) * this.facing * this.speedMult();
    match.emit({ type: 'dash', fighter: this, dir, x: this.x });
  }
  // estilo por personagem: stats.dash (frente) e stats.backdash (recuo) multiplicam o dash; sem eles vale o andar
  dashMult(dir) { const s = this.stats; return dir > 0 ? (s.dash ?? s.walk) : (s.backdash ?? s.dash ?? s.walk); }
  updateDash(match, fwd, back) {
    const d = this.dashDir > 0 ? DASH.fwd : DASH.back;
    const k = this.t / d.frames;
    // perfil: arranque forte, freio no final (1 - k²)
    this.vx = this.dashDir * d.v * this.dashMult(this.dashDir) * this.facing * this.speedMult() * Math.max(0, 1 - k * k);
    if (this.t >= d.cancel && (this.buffered('punch') || this.buffered('kick') || this.buffered('special'))) {
      this.setState('idle', 'idle');
      return this.groundControl(match, fwd, back);
    }
    if (this.t >= d.frames) { this.vx = 0; this.toNeutral(); }
  }

  startMove(id) {
    const m = this.moves[id];
    this.move = m; this.hitId = uid(); this.armorUsed = false;
    if (!m.air) this.vx = (m.lunge || 0) * this.facing;
    this.setState('attack', m.anim, m.startup + m.active + m.recovery);
  }

  updateAttack(match) {
    const m = this.move, total = m.startup + m.active + m.recovery;
    if (m.air) {
      this.airControl(...this.fwdBack());
      if (this.t >= total) { this.move = null; this.setState('jump', 'jump'); }
      return;
    }
    this.vx *= 0.8;
    if (m.chain && this.t >= m.startup + m.active && this.buffered('punch')) {
      this.consume('punch');
      return this.startMove(m.chain);
    }
    if (this.tryCancel(match, m)) return;
    if (this.t >= total) this.toNeutral();
  }
  fwdBack() { const c = this.cmd; return this.facing > 0 ? [c.right, c.left] : [c.left, c.right]; }
  // CANCEL: normal que encostou (acerto/defesa) vira especial ou normal mais forte, na janela FEEL.cancel
  tryCancel(match, m) {
    const C = FEEL.cancel;
    if (m.throw || this.lastLanded !== this.hitId) return false; // só com contato (hit-confirm / block-string)
    if (this.t < m.startup || this.t > m.startup + m.active + C.window) return false;
    const [fwd] = this.fwdBack();
    if (C.special && this.buffered('special')) {
      const d = this.dirFor('special', fwd);
      const dir = d.down ? 'down' : d.fwd ? 'forward' : 'neutral';
      if (this.canSpecial(dir)) {
        this.consume('special');
        this.faceOpponent();
        this.startSpecial(dir, match);
        this.cancelInfo = { frame: match.frame, from: m.id, to: 'special' };
        return true;
      }
    }
    const mo = C.special ? this.motionSpecial() : null; // cancel por motion (↓↘→ + botão)
    if (mo && this.canSpecial(mo.dir)) {
      this.consume(mo.button); this.motion = null;
      this.faceOpponent();
      this.startSpecial(mo.dir, match);
      this.cancelInfo = { frame: match.frame, from: m.id, to: 'special' };
      return true;
    }
    const into = C.into[m.id];
    if (into && this.buffered('kick')) {
      const d = this.dirFor('kick', fwd);
      const next = d.down ? 'sweep' : 'kick';
      if (into.includes(next)) {
        this.consume('kick');
        this.startMove(next);
        this.cancelInfo = { frame: match.frame, from: m.id, to: next };
        return true;
      }
    }
    return false;
  }

  // ---------- especiais (dirigidos por dados) ----------
  startSpecial(dir, match) {
    const s = this.specials[dir];
    this.sp = this.boostSpecial({ level: 'mid', startup: 10, active: 0, recovery: 15, ...s, dir }, match);
    // passiva DOBRAR A META (Dilma): especial que acertou deixa o PRÓXIMO especial com dano ×mult (uma vez)
    const dn = this.passive.doubleNext;
    if (dn && this.doubleReady) {
      this.doubleReady = false;
      this.sp = { ...boostHit(this.sp, dn.mult ?? 2), doubled: true };
      match.emit({ type: 'text', fighter: this, text: dn.text || 'DOBROU!', cls: 'buff' });
    }
    this.charged = 0;
    this.cooldowns[dir] = s.cooldown ?? 120;
    this.hitId = uid(); this.armorUsed = false; this.vx = 0; this.spHitSeq = this.hitSeq;
    const total = this.sp.startup + this.sp.active + this.sp.recovery;
    this.setState('special', s.anim || SPECIAL_ANIM[dir], total);
    match.emit({ type: 'special', fighter: this, name: s.name, dir });
    if (s.shout) match.emit({ type: 'text', fighter: this, text: s.shout, cls: 'shout' });
  }

  updateSpecial(match) {
    let s = this.sp;
    const o = this.opponent;
    // CARGA (charge: { max, damage, grow, push }): segurando o botão de especial, o frame de disparo espera até `max`
    // frames; ao soltar, dano/tamanho/empurrão crescem com a fração carregada (Estocar Vento)
    if (s.charge && this.t === s.startup) {
      if (this.cmd.special && this.charged < s.charge.max) { this.t--; this.charged++; if (this.charged === 1) match.emit({ type: 'charge', fighter: this }); return; }
      if (this.charged > 0) {
        const c = s.charge, q = this.charged / c.max;
        s = this.sp = { ...boostHit(s, 1 + q * (c.damage ?? 0)), push: (s.push ?? 0.1) + q * (c.push ?? 0), chargeK: q,
          box: { ...s.box, w: s.box.w * (1 + q * (c.grow ?? 0)), h: s.box.h * (1 + q * (c.grow ?? 0)) } };
        if (q >= 0.5 && c.text) match.emit({ type: 'text', fighter: this, text: c.text, cls: 'shout' });
      }
    }
    const total = s.startup + s.active + s.recovery;
    if (s.kind === 'strike') {
      const active = this.t >= s.startup && this.t < s.startup + s.active;
      this.vx = active ? (s.lunge || 0) * this.facing * this.speedMult() : this.vx * 0.7;
    }
    // dash dentro do especial: { from, to, v, past } — anda `v` m/frame entre os frames from..to;
    // com `past`, a velocidade é calculada para parar `past` m DEPOIS do oponente (atravessa, com passThrough)
    if (s.dash) {
      const d = s.dash;
      if (this.t === d.from) this.dashV = d.past != null ? Math.min(d.v, (this.distTo(o) + d.past) / Math.max(1, d.to - d.from)) : d.v;
      if (this.t >= d.from && this.t < d.to) this.vx = this.dashV * this.facing * this.speedMult();
      else if (this.t === d.to) this.vx = 0;
    }
    if (s.faceAtActive && this.t === s.startup) this.faceOpponent(); // passou por trás → vira e golpeia
    if (s.reflect && this.t >= s.startup && this.t < s.startup + Math.max(1, s.active)) this.reflectProjectiles(match, s.reflect);
    // CLONE / ECO: cópia translúcida nasce a `offset` m na frente e repete um golpe (Hitter com visual 'clone')
    if (s.clone && this.t === (s.clone.at ?? s.startup)) {
      const c = s.clone, bx = c.box || { x: 0.3, y: 0.8, w: 1.0, h: 0.7 };
      const cx = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.x + this.facing * (c.offset ?? 1.5)));
      match.spawn(new Hitter({
        owner: this, hit: { ...s, ...(c.hit || {}) }, facing: this.facing,
        x: cx + this.facing * ((bx.x ?? 0) + bx.w / 2), y: this.y + (bx.y ?? 0), w: bx.w, h: bx.h,
        delay: c.delay ?? 8, life: c.life ?? 24, hitsLeft: 1, visual: c.visual ?? 'clone',
        clone: { data: this.data, anim: c.anim ?? 'punch3', x: cx, delay: c.delay ?? 8, life: c.life ?? 24 },
      }));
      match.emit({ type: 'clone', fighter: this, x: cx });
    }
    if (this.t === s.startup) {
      if (s.screenFlash) match.emit({ type: 'flash', fighter: this, strength: s.screenFlash }); // flash de câmera na tela (Selfie)
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
      } else if (s.kind === 'summon') {
        // maleta/portal (só visual, nunca machuca) + ajudantes que saem dela (src/fight/Assist.js)
        const cx = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.x + this.facing * (s.dist ?? 1.2)));
        if (s.visual) match.spawn(new Hitter({ owner: this, hit: s, x: cx, y: 0, w: 0, h: 0, life: s.life ?? 100, activeUntil: -1, visual: s.visual, facing: this.facing }));
        for (const a of s.assists || []) match.spawn(new Assist(this, a, cx));
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
    if (this.t >= total) {
      // Engajamento (Nikolas): terminou a provocação/selfie sem tomar golpe → enche a barra
      const en = this.passive.engage;
      if (en && s.dir === en.dir && !s.countered && this.hitSeq === this.spHitSeq) {
        this.gainMeter(en.meter);
        match.emit({ type: 'text', fighter: this, text: en.text || 'ENGAJOU!', cls: 'buff' });
      }
      this.toNeutral();
    }
  }

  // ---------- REFLETIR (Lacração Reversa): projéteis do rival que entram na caixa viram do lançador, voltam mais rápidos ----------
  // reflect: { box, speed (× velocidade), damage (× dano), text }
  reflectProjectiles(match, r) {
    const box = this.relBox(r.box || { x: -0.2, y: 0, w: 1.6, h: 2.2 });
    for (const h of match.hitters) {
      if (h.owner !== this.opponent || h.dead || h.spent || h.hit?.kind !== 'projectile' || !h.vx) continue;
      if (!overlap(box, h.box())) continue;
      h.owner = this; h.facing = this.facing;
      h.vx = Math.abs(h.vx) * (r.speed ?? 1.2) * this.facing; h.vy = Math.max(h.vy, 0);
      h.hit = { ...h.hit, damage: (h.hit.damage ?? 0) * (r.damage ?? 1.2), text: r.text ?? h.hit.text };
      h.returning = false; h.turnAt = null; h.homing = 0; h.x0 = h.x; h.cool = 0; h.reflected = true;
      h.life = h.t - h.delay + (h.hit.life ?? 90);
      this.counterInfo = { seq: ++this.counterSeq, frame: match.frame, text: r.text };
      match.hitstop = Math.max(match.hitstop, 6);
      match.emit({ type: 'counter', fighter: this, attacker: this.opponent, x: h.x, y: h.y + h.h / 2, text: r.text || 'REFLETIU!' });
    }
  }

  // ---------- counter (Close Certo): pose; se tomar um golpe na janela ativa, anula e dispara o contra-ataque ----------
  // Chamado pelo Combat.applyHit antes da defesa. kind: 'counter', followup: spec de strike que entra na hora.
  tryCounter(match, atk, hit) {
    const s = this.sp;
    if (this.state !== 'special' || s?.kind !== 'counter' || hit.throw || hit.ultimate) return false;
    if (this.t < s.startup || this.t >= s.startup + s.active) return false;
    const fu = s.followup || {};
    this.sp = { level: 'mid', startup: 4, active: 4, recovery: 14, ...fu, kind: 'strike', dir: s.dir, countered: true, name: s.name };
    this.hitId = uid(); this.armorUsed = false; this.vx = 0; this.faceOpponent();
    this.setState('special', fu.anim || s.anim || SPECIAL_ANIM[s.dir], this.sp.startup + this.sp.active + this.sp.recovery);
    this.counterInfo = { seq: ++this.counterSeq, frame: match.frame, text: s.text };
    atk.flash = 8;
    match.hitstop = Math.max(match.hitstop, s.freeze ?? 12); // congela: a pose "fotografa" o golpe
    match.emit({ type: 'counter', fighter: this, attacker: atk, x: this.x + this.facing * 0.4, y: this.y + this.stats.height * 0.7, text: s.text || 'COUNTER!' });
    return true;
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
      // finalHit: campos extras do finalizador (debuffs: invert, slow, meterSteal, lockSpecials...)
      this.ultRes[u.hits] = d <= u.range + 1 ? applyHit(match, this, o, {
        damage: u.finisher, knockdown: true, push: u.push ?? 0.25, unblockable: true, heavy: true, ultimate: true, text: u.text, ...(u.finalHit || {}),
      }, this.x) : 'miss';
    }
    if (this.t >= this.ultimateLength()) this.toNeutral();
  }

  // ---------- física ----------
  physics(match) {
    if (this.heldBy) return; // preso no Abraço: posição vem do agarrador
    const airborne = this.y > 0 || this.vy > 0;
    if (airborne) {
      // arco do pulo: flutua um pouco no ápice e cai mais firme (só pulo/golpe aéreo; queda de golpe segue a física pura)
      const jumping = this.state === 'jump' || (this.state === 'attack' && this.move?.air);
      // juggle: cada hit tomado no ar aumenta a gravidade da queda (juggleG) — combos aéreos curtos, nunca infinitos
      // stats.gravity: peso do pulo por personagem (tanque cai firme, zoner flutua) — só no pulo, não na queda de golpe
      const g = !jumping ? (this.state === 'knockdown' ? this.juggleG : 1) : (Math.abs(this.vy) < 0.05 ? 0.62 : this.vy < 0 ? 1.12 : 1) * (this.stats.gravity ?? 1);
      this.vy -= GRAVITY * g;
      this.y += this.vy;
      if (this.y <= 0) { const vLand = this.vy; this.y = 0; this.vy = 0; this.land(match, vLand); }
    }
    this.x += this.vx;
    if (!airborne && FRICTION.has(this.state)) this.vx *= 0.82;
    // QUIQUE NA PAREDE (FEEL.wallBounce): queda forte que bate na borda volta e sobe um pouco (1× por queda)
    const WB = FEEL.wallBounce;
    if (WB && this.state === 'knockdown' && !this.wallBounced && Math.abs(this.x) >= ARENA_HALF && Math.abs(this.vx) >= WB.minVx && Math.sign(this.vx) === Math.sign(this.x)) {
      this.wallBounced = true;
      this.vx = -this.vx * WB.bounce;
      this.vy = Math.max(this.vy, WB.launch); this.y = Math.max(this.y, 0.001);
      match?.emit({ type: 'wallBounce', fighter: this, x: this.x, y: this.y + this.stats.height * 0.5, text: WB.text });
      match?.emit({ type: 'text', fighter: this, text: WB.text, cls: 'lock' });
    }
    this.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.x));
  }
  land(match, vLand = 0) {
    match?.emit({ type: 'land', fighter: this, x: this.x, state: this.state, v: -vLand });
    if (this.state === 'jump' || (this.state === 'attack' && this.move?.air)) { this.vx = 0; this.toNeutral(); }
    else if (this.state === 'knockdown') { this.vx *= 0.5; this.juggle = 0; this.juggleG = 1; this.landedAt = this.frameCount; this.setState('down', 'down'); }
    else if (this.state === 'ko') { this.vx *= 0.4; }
  }
}

// multiplica o dano de um golpe e de tudo que ele gera (último hit, onda filha, ajudantes, dano por distância)
function boostHit(s, b) {
  if (!s) return s;
  const o = { ...s };
  if (o.damage !== undefined) o.damage *= b;
  if (o.final?.damage !== undefined) o.final = { ...o.final, damage: o.final.damage * b };
  if (o.distDamage) o.distDamage = { ...o.distDamage, per: o.distDamage.per * b, max: (o.distDamage.max ?? Infinity) * b };
  if (o.spawnOnEnd) o.spawnOnEnd = boostHit(o.spawnOnEnd, b);
  if (o.assists) o.assists = o.assists.map((a) => boostHit(a, b));
  return o;
}
