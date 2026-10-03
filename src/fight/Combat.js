// Resolução de golpes: colisão AABB 2D, defesa, armadura, dano, combo, barra e efeitos.
import { METER_MAX } from './constants.js';
const BLOCK_STATES = new Set(['idle', 'walk', 'crouch', 'blockstun']);
const COMBO_STATES = new Set(['hitstun', 'knockdown']);

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function resolveHits(match) {
  for (const f of match.fighters) {
    const o = f.opponent;
    const atk = f.activeAttack();
    if (!atk || f.lastLanded === atk.id) continue;
    const hurt = o.hurtbox();
    if (!hurt || !overlap(atk.box, hurt)) continue;
    if (atk.hit.throw && !o.canBeThrown()) continue;
    f.lastLanded = atk.id;
    applyHit(match, f, o, atk.hit, f.x);
  }
  for (const h of match.hitters) {
    if (!h.active) continue;
    const o = h.owner.opponent;
    const hurt = o.hurtbox();
    if (!hurt || !overlap(h.box(), hurt)) continue;
    const hit = h.currentHit();
    const r = applyHit(match, h.owner, o, hit, h.x - h.vx * 10);
    if (r === 'miss') continue;
    if (r === 'counter') { h.dead = true; continue; } // rebatido pela pose (Close Certo)
    h.cool = h.rehit;
    h.landed = (h.landed || 0) + 1; // o visual usa: contato confirmado (tinta no corpo) x erro (no chão)
    if (--h.hitsLeft <= 0) h.spend();
    if (h.hit.stopOnHit) h.stop(h.hit.stopOnHit);
  }
}

// Retorna 'hit' | 'block' | 'armor' | 'miss' | 'counter'
export function applyHit(match, atk, def, hit, sourceX) {
  if (!def.hurtbox()) return 'miss';
  const dir = Math.sign(def.x - sourceX) || atk.facing;
  const fx = def.x - dir * 0.25, fy = def.y + def.stats.height * 0.62;

  // ---- pose de counter (Close Certo): o golpe é anulado e vira contra-ataque automático ----
  if (def.tryCounter(match, atk, hit)) return 'counter';
  // ---- bônus de contra-golpe (PERFECT SELFIE): acertar o inimigo no meio do golpe dele ----
  const cb = hit.counterBonus;
  if (cb && (def.state === 'attack' || def.state === 'special')) {
    hit = { ...hit, ...cb.hit };
    atk.counterInfo = { seq: ++atk.counterSeq, frame: match.frame, text: cb.text };
    if (cb.meter) atk.gainMeter(cb.meter);
    match.emit({ type: 'counter', fighter: atk, attacker: def, x: fx, y: fy, text: cb.text || 'COUNTER!' });
  }

  // ---- defesa ----
  const lowOk = hit.level !== 'low' || def.cmd.down;
  const highOk = hit.level !== 'high' || !def.cmd.down;
  if (!hit.unblockable && !hit.throw && BLOCK_STATES.has(def.state) && def.holdingBack && lowOk && highOk) {
    // passiva TÁ OK (Capitão Brasa): defesa começada no último instante = perfeita (sem raspão, sai antes, buff curto)
    const pb = def.passive.perfectBlock;
    const perfect = !!pb && def.frameCount - (def.backAt ?? -999) <= pb.window;
    const chip = perfect ? 0 : hit.damage * 0.15 * atk.damageMult() * def.stats.defense * def.defenseMult();
    def.hp = Math.max(1, def.hp - chip);
    def.stun = Math.max(2, (hit.blockstun ?? 10) - (perfect ? pb.stunCut ?? 0 : 0));
    def.setState('blockstun', def.cmd.down ? 'crouchBlock' : 'block', def.stun);
    def.vx = dir * (hit.push ?? 0.1) * 0.8;
    def.gainMeter(8); atk.gainMeter(3);
    // passiva: bloquear um ESPECIAL (hit.kind) enche mais a barra de ultimate (ARQUIVO CONFIDENCIAL do Duval)
    const bm = def.passive.blockSpecialMeter;
    if (bm && hit.kind) { def.gainMeter(bm.gain ?? 30); if (bm.text) match.emit({ type: 'text', fighter: def, text: bm.text, cls: 'buff' }); }
    match.hitstop = hit.heavy ? 6 : 4;
    match.emit({ type: 'block', x: fx, y: fy, fighter: def, dir, heavy: !!hit.heavy });
    if (perfect) {
      def.buffT = pb.frames;
      match.emit({ type: 'perfect', x: fx, y: fy, fighter: def });
      match.emit({ type: 'text', fighter: def, text: pb.text, cls: 'buff' });
    }
    return 'block';
  }

  // ---- dano ----
  const scaling = hit.ultimate ? 1 : Math.max(0.5, 1 - 0.1 * def.comboTaken);
  const dmg = hit.damage * atk.damageMult() * def.stats.defense * def.defenseMult() * scaling;

  // ---- super armor (Dino) ----
  if (!hit.throw && !hit.ultimate && def.hasArmor()) {
    def.armorUsed = true;
    def.hp = Math.max(1, def.hp - dmg * 0.8);
    def.flash = 6;
    match.hitstop = 6;
    match.emit({ type: 'armor', x: fx, y: fy, fighter: def, text: 'COURO JURÁSSICO!' });
    return 'armor';
  }

  const inCombo = COMBO_STATES.has(def.state);
  def.comboTaken = inCombo ? def.comboTaken + 1 : 1;
  atk.comboCount = def.comboTaken;
  def.hp -= dmg;
  def.flash = 8;
  def.likes = 0;
  def.sinceHit = 0;

  // passiva do Capitão Brasa: likes viram buff
  // comboOnly: conta só hits do MESMO combo (CORTE VIRAL do Renan: 3 hits seguidos)
  const buff = atk.passive.comboBuff;
  if (buff && !(buff.comboOnly && hit.ultimate)) {
    atk.likes++;
    if (buff.comboOnly ? def.comboTaken % buff.every === 0 : atk.likes % buff.every === 0) {
      atk.buffT = buff.frames;
      match.emit({ type: 'text', fighter: atk, text: buff.text || 'VIRALIZOU!', cls: 'buff' });
    }
  }

  // recurso extra por dano causado (passiva LIQUIDEZ do Vorcaro: barra de CAPITAL)
  if (atk.resource) atk.gainRes(dmg * (atk.resource.perDamage ?? 1));
  atk.gainMeter(dmg * 2.4);
  def.gainMeter(dmg * 1.5);

  if (hit.lockSpecials) { def.lockT = def.lockMax = hit.lockSpecials; match.emit({ type: 'locked', fighter: def }); }
  applyDebuffs(match, atk, def, hit);
  if (hit.pull) def.x = atk.x + atk.facing * ((atk.stats.width + def.stats.width) / 2 + 0.35);

  // reação visual: zona do golpe (alta = cabeça, média = corpo, baixa = pernas) e força (dano + empurrão + pesado)
  const hb = hit.hitbox || hit.box;
  const yc = hb ? (hb.y ?? 0) + (hb.h ?? 1) / 2 + (hit.air ? atk.y - def.y : 0) : def.stats.height * 0.6;
  const r = yc / def.stats.height;
  const zone = hit.level === 'low' || r < 0.36 ? 'low' : r > 0.62 ? 'high' : 'mid';
  const force = Math.max(0.25, Math.min(1.6, dmg / 9 + (hit.heavy ? 0.3 : 0) + (hit.push ?? 0.1) * 1.5 + (hit.knockdown ? 0.25 : 0)));
  def.hitInfo = { seq: ++def.hitSeq, zone, force, dir, heavy: !!hit.heavy, frame: match.frame };

  if (def.hp <= 0) {
    def.hp = 0; def.move = null; def.sp = null;
    def.setState('ko', 'ko');
    def.vy = 0.2; def.y = Math.max(def.y, 0.001); def.vx = dir * 0.1;
    match.onKO(atk, def, !!hit.ultimate);
  } else if (hit.knockdown || !def.grounded) {
    def.move = null; def.sp = null;
    def.setState('knockdown', 'knockdown');
    def.vy = Math.max(def.vy, hit.launch ?? 0.17); def.y = Math.max(def.y, 0.001); // launch: knock-UP (voa alto)
    def.vx = dir * (hit.push ?? 0.12) * 1.2;
  } else {
    def.move = null; def.sp = null;
    def.stun = (hit.hitstun ?? 14) + (hit.stun ?? 0);
    def.setState('hitstun', hit.stun ? 'dizzy' : 'hit', def.stun);
    def.vx = dir * (hit.push ?? 0.1);
  }

  // hitstop escalado pela força: jab ≈ 7, golpe pesado ≈ 12–14. No KO a câmera lenta (0.3) já estica o congelamento
  // ~3×, então usa metade (≈0,5s real de pose congelada antes do voo em câmera lenta)
  const stop = hit.hitstop ?? Math.round(Math.max(6, Math.min(14, 4 + dmg * 0.75)) + (hit.heavy ? 3 : 0));
  match.hitstop = Math.max(match.hitstop, def.hp <= 0 ? Math.max(5, Math.round(stop * 0.5)) : stop);
  match.emit({ type: 'hit', x: fx, y: fy, dmg, heavy: !!hit.heavy, ultimate: !!hit.ultimate, text: hit.text, attacker: atk, fighter: def, dir, zone, force, ko: def.hp <= 0 });
  return 'hit';
}

// Efeitos extras de um golpe que ACERTOU, todos por dados (sem visual):
//   hit.invert      — frames com esquerda/direita invertidas (CONFUSO)
//   hit.slow        — { frames, mult, text }: velocidade de andar/pular/dash ×mult (+IMPOSTO)
//   hit.meterSteal  — rouba até N da barra de ultimate do alvo (TAXAÇÃO SUPREMA)
//   passive.tax     — { meter, text }: todo golpe que acerta "taxa" N da barra do rival (ARRECADAÇÃO do Haddad)
//   passive.doubleNext — especial que acertou arma o dano dobrado do próximo (DOBRAR A META da Dilma)
function applyDebuffs(match, atk, def, hit) {
  if (hit.invert) {
    if (def.invertT <= 0) match.emit({ type: 'text', fighter: def, text: hit.invertText || 'CONFUSO!', cls: 'lock' });
    def.invertT = Math.max(def.invertT, hit.invert);
  }
  if (hit.slow) {
    def.slowT = Math.max(def.slowT, hit.slow.frames ?? 180); def.slowMult = hit.slow.mult ?? 0.6; def.slowText = hit.slow.text || 'LENTO';
    match.emit({ type: 'text', fighter: def, text: def.slowText, cls: 'lock' });
  }
  const tax = atk.passive.tax;
  const steal = (hit.meterSteal ?? 0) + (tax?.meter ?? 0);
  if (steal > 0 && def.meter > 0) {
    const take = Math.min(def.meter, steal);
    def.meter -= take; atk.meter = Math.min(METER_MAX, atk.meter + take);
    if (tax?.text && (hit.kind || hit.meterSteal)) match.emit({ type: 'text', fighter: atk, text: tax.text, cls: 'buff' });
  }
  const dn = atk.passive.doubleNext;
  if (dn && hit.kind && !hit.doubled && !atk.doubleReady) {
    atk.doubleReady = true;
    match.emit({ type: 'text', fighter: atk, text: dn.armText || 'META BATIDA!', cls: 'buff' });
  }
}
