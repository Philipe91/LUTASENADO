// Resolução de golpes: colisão AABB 2D, defesa, armadura, dano, combo, barra e efeitos.
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
    const hit = h.hitsLeft === 1 && h.hit.final ? { ...h.hit, ...h.hit.final } : h.hit;
    const r = applyHit(match, h.owner, o, hit, h.x - h.vx * 10);
    if (r === 'miss') continue;
    h.cool = h.rehit;
    if (--h.hitsLeft <= 0) h.dead = true;
  }
}

// Retorna 'hit' | 'block' | 'armor' | 'miss'
export function applyHit(match, atk, def, hit, sourceX) {
  if (!def.hurtbox()) return 'miss';
  const dir = Math.sign(def.x - sourceX) || atk.facing;
  const fx = def.x - dir * 0.25, fy = def.y + def.stats.height * 0.62;

  // ---- defesa ----
  const lowOk = hit.level !== 'low' || def.cmd.down;
  const highOk = hit.level !== 'high' || !def.cmd.down;
  if (!hit.unblockable && !hit.throw && BLOCK_STATES.has(def.state) && def.holdingBack && lowOk && highOk) {
    const chip = hit.damage * 0.15 * atk.damageMult() * def.stats.defense;
    def.hp = Math.max(1, def.hp - chip);
    def.stun = hit.blockstun ?? 10;
    def.setState('blockstun', def.cmd.down ? 'crouchBlock' : 'block', def.stun);
    def.vx = dir * (hit.push ?? 0.1) * 0.8;
    def.gainMeter(8); atk.gainMeter(3);
    match.hitstop = 4;
    match.emit({ type: 'block', x: fx, y: fy, fighter: def });
    return 'block';
  }

  // ---- dano ----
  const scaling = hit.ultimate ? 1 : Math.max(0.5, 1 - 0.1 * def.comboTaken);
  const dmg = hit.damage * atk.damageMult() * def.stats.defense * scaling;

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

  // passiva do Capitão Brasa: likes viram buff
  const buff = atk.passive.comboBuff;
  if (buff) {
    atk.likes++;
    if (atk.likes % buff.every === 0) {
      atk.buffT = buff.frames;
      match.emit({ type: 'text', fighter: atk, text: buff.text || 'VIRALIZOU!', cls: 'buff' });
    }
  }

  atk.gainMeter(dmg * 2.4);
  def.gainMeter(dmg * 1.5);

  if (hit.lockSpecials) { def.lockT = hit.lockSpecials; match.emit({ type: 'locked', fighter: def }); }
  if (hit.pull) def.x = atk.x + atk.facing * ((atk.stats.width + def.stats.width) / 2 + 0.35);

  if (def.hp <= 0) {
    def.hp = 0; def.move = null; def.sp = null;
    def.setState('ko', 'ko');
    def.vy = 0.2; def.y = Math.max(def.y, 0.001); def.vx = dir * 0.1;
    match.onKO(atk, def, !!hit.ultimate);
  } else if (hit.knockdown || !def.grounded) {
    def.move = null; def.sp = null;
    def.setState('knockdown', 'knockdown');
    def.vy = Math.max(def.vy, 0.17); def.y = Math.max(def.y, 0.001);
    def.vx = dir * (hit.push ?? 0.12) * 1.2;
  } else {
    def.move = null; def.sp = null;
    def.stun = (hit.hitstun ?? 14) + (hit.stun ?? 0);
    def.setState('hitstun', hit.stun ? 'dizzy' : 'hit', def.stun);
    def.vx = dir * (hit.push ?? 0.1);
  }

  match.hitstop = Math.max(match.hitstop, hit.heavy ? 11 : 7);
  match.emit({ type: 'hit', x: fx, y: fy, dmg, heavy: !!hit.heavy, ultimate: !!hit.ultimate, text: hit.text, attacker: atk, fighter: def });
  return 'hit';
}
