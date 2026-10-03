// Mecânicas de GAME FEEL (sem navegador): input buffer, cancels, escala de dano, juggle com limite, tech de queda,
// throw tech, contra-golpe, pushback na quina, aceleração, controle aéreo, níveis da IA e interpolação.
// Uso: node tests/feel.mjs
import { Match } from '../src/fight/Match.js';
import { AIController, levelName } from '../src/fight/AI.js';
import { applyHit, comboScale } from '../src/fight/Combat.js';
import { NEUTRAL, FEEL, BUFFER, ARENA_HALF } from '../src/fight/constants.js';
import { getCharacter } from '../src/data/characters/index.js';

let ok = true;
const check = (name, cond, extra = '') => { ok &&= !!cond; console.log(`${cond ? 'OK    ' : 'FALHOU'} ${name} ${extra}`); };
const idle = { read: () => NEUTRAL };
// controlador por roteiro: fn(k, self, opp) → comando parcial (k = frames de luta desde o início do roteiro)
const script = (fn) => { let k = 0; return { read(self, opp) { k++; return { ...NEUTRAL, ...(fn(k, self, opp) || {}) }; } }; };
function setup(a, b, ca = idle, cb = idle, gap = 1.2, x0 = 0) {
  const m = new Match(getCharacter(a), getCharacter(b), [ca, cb]);
  while (m.phase !== 'fight') { m.step(); m.drainEvents(); }
  m.fighters[0].x = x0 - gap / 2; m.fighters[1].x = x0 + gap / 2;
  m.fighters.forEach((f) => f.faceOpponent());
  return m;
}
const run = (m, n, onEv) => { for (let i = 0; i < n; i++) { m.step(); for (const e of m.drainEvents()) onEv?.(e, m); } };
const runUntil = (m, pred, max = 400, onEv) => { for (let i = 0; i < max; i++) { if (pred(m)) return i; m.step(); for (const e of m.drainEvents()) onEv?.(e, m); } return -1; };

// 1) INPUT BUFFER: soco apertado 5 frames antes do chute acabar sai no 1º frame livre; apertado cedo demais, se perde
{
  const kick = getCharacter('xandor').moves?.kick;
  const at = (early) => {
    let kickEnd = -1, punchAt = -1;
    const m = setup('xandor', 'lulacio', script((k, s) => {
      if (k === 1) return { kick: true };
      if (s.state === 'attack' && s.move.id === 'kick') {
        const total = s.move.startup + s.move.active + s.move.recovery;
        if (s.t === total - early) return { punch: true };
      }
    }), idle, 4);
    for (let i = 0; i < 80; i++) {
      m.step(); m.drainEvents();
      const f = m.fighters[0];
      if (kickEnd < 0 && f.state !== 'attack' && i > 2) kickEnd = m.frame;
      if (f.state === 'attack' && f.move.id === 'punch1' && punchAt < 0) punchAt = m.frame;
      if (kickEnd < 0 && f.state === 'attack' && f.move.id === 'punch1') { kickEnd = m.frame; punchAt = m.frame; }
    }
    return { punchAt, kickEnd };
  };
  const a = at(5), b = at(BUFFER + 6);
  check('buffer: soco 5f antes sai no 1º frame livre', a.punchAt > 0 && a.punchAt === a.kickEnd, JSON.stringify(a));
  check(`buffer: soco ${BUFFER + 6}f antes se perde`, b.punchAt < 0, JSON.stringify(b));
  void kick;
}

// 2) CANCEL normal → especial: só com contato (acerto ou defesa)
{
  const cancelTest = (gap) => {
    let pressed = false;
    const m = setup('lulacio', 'xandor', script((k, s) => {
      if (k === 1) return { punch: true };
      if (s.state === 'attack' && s.t === s.move.startup + 2 && !pressed) { pressed = true; return { special: true }; }
    }), idle, gap);
    const f = m.fighters[0];
    // atT = frame do soco (relógio do lutador, sem hitstop) em que o especial entrou
    let atT = -1, prevT = 0;
    for (let i = 0; i < 60; i++) {
      const was = f.state;
      if (was === 'attack') prevT = f.t;
      m.step(); m.drainEvents();
      if (was === 'attack' && f.state === 'special' && atT < 0) atT = prevT + 1;
    }
    return { cancelled: !!f.cancelInfo, atT, punchTotal: f.moves.punch1.startup + f.moves.punch1.active + f.moves.punch1.recovery };
  };
  const hit = cancelTest(1.1), whiff = cancelTest(4);
  check('cancel: soco que acertou vira especial antes da recuperação', hit.cancelled && hit.atT > 0 && hit.atT < hit.punchTotal - 4, JSON.stringify(hit));
  check('cancel: soco no vento NÃO cancela', !whiff.cancelled, JSON.stringify(whiff));
}

// 3) CANCEL fraco → forte: soco baixo que acertou emenda na rasteira (derruba)
{
  let step = 0;
  const m = setup('xandor', 'lulacio', script((k, s) => {
    if (k === 1) return { down: true, punch: true };
    if (s.state === 'attack' && s.move.id === 'crouchPunch' && s.t === s.move.startup + 1 && !step) { step = 1; return { down: true, kick: true }; }
    return { down: s.state === 'attack' };
  }), idle, 1.1);
  const target = m.fighters[1];
  let fell = false;
  run(m, 60, () => { if (target.state === 'knockdown' || target.state === 'down') fell = true; });
  check('cancel: soco baixo → rasteira (combo derruba)', m.fighters[0].cancelInfo?.to === 'sweep' && fell, JSON.stringify(m.fighters[0].cancelInfo));
}

// 4) ESCALA DE DANO: tabela FEEL.scaling, sem cair abaixo do mínimo
{
  const t = FEEL.scaling.table;
  check('escala: 1º hit 100%, depois cai', comboScale(0) === 1 && comboScale(2) < comboScale(1) && comboScale(1) <= 1, t.join(' '));
  check('escala: nunca abaixo do mínimo', comboScale(50) === FEEL.scaling.min && Math.min(...t) >= FEEL.scaling.min);
  const m = setup('xandor', 'lulacio');
  const [a, d] = m.fighters;
  const dmgAt = (n) => { d.hp = 100; d.comboTaken = n; d.setState(n ? 'hitstun' : 'idle', 'hit', 20); d.stun = 20; d.holdingBack = false; applyHit(m, a, d, { damage: 10, hitstun: 10 }, a.x); return 100 - d.hp; };
  const d0 = dmgAt(0), d4 = dmgAt(4);
  check('escala: 5º hit do combo bate ~65%', Math.abs(d4 / d0 - comboScale(4)) < 0.01, `${d0.toFixed(2)} → ${d4.toFixed(2)}`);
}

// 5) JUGGLE: quem cai toma no máximo FEEL.juggle.limit hits; cada um pesa mais e lança menos
{
  const m = setup('xandor', 'lulacio');
  const [a, d] = m.fighters;
  applyHit(m, a, d, { damage: 5, knockdown: true, launch: 0.2 }, a.x);
  const g0 = d.juggleG, vys = [];
  let hits = 0;
  for (let i = 0; i < 6; i++) {
    d.y = Math.max(d.y, 0.8); d.vy = -0.01; // segura no ar para testar só o limite
    if (!d.hurtbox()) break;
    const r = applyHit(m, a, d, { damage: 5, hitstun: 10 }, a.x);
    if (r === 'hit') { hits++; vys.push(d.vy.toFixed(3)); }
  }
  check(`juggle: limite de ${FEEL.juggle.limit} hits no ar`, hits === FEEL.juggle.limit && !d.hurtbox(), `hits=${hits}`);
  check('juggle: gravidade cresce e lançamento cai', d.juggleG > g0 && vys.length >= 2 && Number(vys[1]) < Number(vys[0]), `g=${d.juggleG.toFixed(2)} vy=${vys.join(',')}`);
  run(m, 120);
  check('juggle: ao levantar zera o contador', d.juggle === 0 && d.juggleG === 1, d.state);
}

// 6) TECH DE QUEDA: apertar botão ao cair levanta bem antes; agarrão = queda dura (sem tech)
{
  const wake = (mash, viaThrow = false) => {
    const m = setup('xandor', 'lulacio', idle, script((k, s) => (mash && s.state === 'knockdown' && s.y < 0.4 ? { kick: k % 2 === 0 } : {})));
    const [a, d] = m.fighters;
    applyHit(m, a, d, viaThrow ? { damage: 5, knockdown: true, throw: true, unblockable: true } : { damage: 5, knockdown: true }, a.x);
    let teched = false;
    const n = runUntil(m, () => d.state === 'idle' || d.state === 'crouch', 300, (e) => { if (e.type === 'tech') teched = true; });
    return { n, teched };
  };
  const slow = wake(false), fast = wake(true), hard = wake(true, true);
  check('tech de queda: levanta mais rápido', fast.teched && fast.n < slow.n - 20, `normal=${slow.n}f tech=${fast.n}f`);
  check('queda dura (agarrão): sem tech', !hard.teched, `${hard.n}f`);
}

// 7) THROW TECH: apertar soco logo antes do agarrão pegar escapa (sem dano)
{
  const tryThrow = (tech) => {
    const m = setup('xandor', 'lulacio', script((k, s) => (k === 3 ? { [s.facing > 0 ? 'right' : 'left']: true, punch: true } : {})),
      script((k) => (tech && k === 3 ? { punch: true } : {})), 0.9);
    const d = m.fighters[1], h0 = d.hp;
    let techEv = false;
    run(m, 60, (e) => { if (e.type === 'tech' && e.throw) techEv = true; });
    return { dmg: h0 - d.hp, techEv };
  };
  const plain = tryThrow(false), teched = tryThrow(true);
  check('throw tech: agarrão normal machuca', plain.dmg > 5 && !plain.techEv, JSON.stringify(plain));
  check('throw tech: soco na hora escapa', teched.techEv && teched.dmg === 0, JSON.stringify(teched));
}

// 8) CONTRA-GOLPE: acertar no startup do golpe do rival dá dano extra, hitstun extra e evento COUNTER
{
  const m = setup('xandor', 'lulacio');
  const [a, d] = m.fighters;
  const base = () => { d.hp = 100; d.toNeutral(); applyHit(m, a, d, { damage: 10, hitstun: 12 }, a.x); return { dmg: 100 - d.hp, stun: d.stun }; };
  const n = base();
  d.hp = 100; d.startMove('kick'); d.t = 2; // no startup do chute
  let ev = false;
  applyHit(m, a, d, { damage: 10, hitstun: 12 }, a.x);
  for (const e of m.drainEvents()) if (e.type === 'counterHit') ev = true;
  const c = { dmg: 100 - d.hp, stun: d.stun };
  check('contra-golpe: +dano, +hitstun e aviso COUNTER', ev && c.dmg > n.dmg * 1.15 && c.stun === n.stun + FEEL.counter.hitstun, `${JSON.stringify(n)} → ${JSON.stringify(c)}`);
}

// 9) PUSHBACK NA QUINA: com o defensor encostado na parede, quem bate é que recua
{
  const m = setup('xandor', 'lulacio', script((k) => (k === 1 ? { punch: true } : {})), idle, 1.0, ARENA_HALF - 0.5);
  const [a, d] = m.fighters;
  d.x = ARENA_HALF; a.x = ARENA_HALF - 1.0;
  const x0 = a.x;
  run(m, 30);
  check('pushback: atacante recua na quina', a.x < x0 - 0.2 && d.x >= ARENA_HALF - 0.01, `atacante ${x0.toFixed(2)} → ${a.x.toFixed(2)}`);
  const m2 = setup('xandor', 'lulacio', script((k) => (k === 1 ? { punch: true } : {})), idle, 1.0);
  const a2 = m2.fighters[0], x2 = a2.x;
  run(m2, 30);
  check('pushback: no meio da arena o atacante fica (quem voa é o defensor)', Math.abs(a2.x - x2) < 0.05, `${x2.toFixed(2)} → ${a2.x.toFixed(2)}`);
}

// 10) MOVIMENTO: aceleração curta, freio curto e controle aéreo leve
{
  const m = setup('xandor', 'lulacio', script((k, s) => (k <= 12 ? { [s.facing > 0 ? 'right' : 'left']: true } : {})), idle, 5);
  const f = m.fighters[0], vs = [];
  for (let i = 0; i < 18; i++) { m.step(); m.drainEvents(); vs.push(Math.abs(f.vx)); }
  const top = Math.max(...vs);
  check('andar: acelera em poucos frames', vs[0] < top * 0.6 && vs[4] > top * 0.9, vs.slice(0, 6).map((v) => v.toFixed(3)).join(' '));
  check('andar: freia em poucos frames', vs[17] < top * 0.05, vs.slice(12).map((v) => v.toFixed(3)).join(' '));
  const air = (steer) => {
    const m3 = setup('xandor', 'lulacio', script((k, s) => (k <= 2 ? { up: true } : steer && s.state === 'jump' ? { [s.facing > 0 ? 'right' : 'left']: true } : {})), idle, 5);
    const g = m3.fighters[0], x0 = g.x;
    runUntil(m3, () => g.state !== 'jump' && g.t > 1 && g.y === 0, 120);
    return Math.abs(g.x - x0);
  };
  const still = air(false), steered = air(true);
  check('pulo: controle aéreo leve (corrige, não voa)', steered > still + 0.2 && steered < 1.6, `parado=${still.toFixed(2)}m corrigido=${steered.toFixed(2)}m`);
}

// 11) IA: ?ai=1..3 e difícil vence fácil
{
  check('IA: ?ai=1|2|3 → fácil/normal/difícil', levelName('1') === 'easy' && levelName('2') === 'normal' && levelName('3') === 'hard' && levelName('x') === 'normal');
  let hardWins = 0, N = 0;
  for (const id of ['xandor', 'lulacio', 'erika', 'boulos']) {
    for (let i = 0; i < 5; i++) {
      const c = getCharacter(id);
      const m = new Match(c, c, [new AIController(c.ai, 'hard'), new AIController(c.ai, 'easy')]);
      while (m.phase !== 'matchEnd' && m.frame < 60 * 60 * 8) { m.step(); m.drainEvents(); }
      N++; if (m.winner?.slot === 0) hardWins++;
    }
  }
  check('IA: difícil vence o fácil na maioria (espelho)', hardWins / N >= 0.65, `${hardWins}/${N}`);
}

// 12) INTERPOLAÇÃO: Match guarda a posição do frame anterior (px/py) para o visual interpolar
{
  const m = setup('xandor', 'lulacio', script((k, s) => ({ [s.facing > 0 ? 'right' : 'left']: true })), idle, 5);
  run(m, 10);
  const f = m.fighters[0];
  check('interpolação: px/py = frame lógico anterior', f.px !== undefined && Math.abs(f.x - f.px - f.vx) < 1e-9, `px=${f.px.toFixed(3)} x=${f.x.toFixed(3)}`);
}

console.log(ok ? '\nOK' : '\nFALHOU');
process.exit(ok ? 0 : 1);
