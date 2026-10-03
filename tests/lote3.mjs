// Mecânicas genéricas do lote 3 (sem navegador): carga, dobrar a meta, refletir projétil, controles invertidos,
// lentidão, roubo de barra, barra por proximidade e corte viral. Uso: node tests/lote3.mjs
import { Match } from '../src/fight/Match.js';
import { NEUTRAL } from '../src/fight/constants.js';
import { getCharacter } from '../src/data/characters/index.js';

let ok = true;
const check = (name, cond, extra = '') => { ok &&= !!cond; console.log(`${cond ? 'OK    ' : 'FALHOU'} ${name} ${extra}`); };
const idle = { read: () => NEUTRAL };
function setup(a, b, ca = idle, cb = idle, gap = 3) {
  const m = new Match(getCharacter(a), getCharacter(b), [ca, cb]);
  while (m.phase !== 'fight') { m.step(); m.drainEvents(); }
  m.fighters[0].x = -gap / 2; m.fighters[1].x = gap / 2;
  return m;
}
const run = (m, n, onEv) => { for (let i = 0; i < n; i++) { m.step(); for (const e of m.drainEvents()) onEv?.(e); } };
// aperta o especial (dir) uma vez e segura `hold` frames
function caster(dir, hold = 1, wait = 0) {
  let k = -wait;
  return { read(self) {
    k++;
    if (k < 1 || k > hold) return NEUTRAL;
    const F = self.facing > 0 ? 'right' : 'left';
    return { ...NEUTRAL, special: true, [F]: dir === 'forward', down: dir === 'down' };
  } };
}

// 1) carga: Estocar Vento segurado bate mais forte
{
  const dmg = (hold) => { const m = setup('dilma', 'xandor', caster('neutral', hold)); const t = m.fighters[1], h0 = t.hp; run(m, 200); return h0 - t.hp; };
  const a = dmg(1), b = dmg(60);
  check('carga (Estocar Vento)', b > a * 1.5, `toque=${a.toFixed(1)} carregado=${b.toFixed(1)}`);
}
// 2) DOBRAR A META: 2º especial depois de acertar causa ×2
{
  const m = setup('dilma', 'xandor', caster('neutral', 1));
  const [d, t] = m.fighters; run(m, 120);
  const armed = d.doubleReady;
  d.cooldowns.neutral = 0; const h0 = t.hp; let k = 0;
  m.controllers[0] = { read(self) { k++; return k === 1 ? { ...NEUTRAL, special: true } : NEUTRAL; } };
  t.x = d.x + 3; run(m, 150);
  check('dobrar a meta', armed && !d.doubleReady && Math.abs((h0 - t.hp) - 2 * getCharacter('dilma').specials.neutral.damage) < 0.6, `dano 2º=${(h0 - t.hp).toFixed(1)}`);
}
// 3) REFLETIR: Intimação do Xandor volta e acerta o Xandor
{
  const m = setup('renan', 'xandor', caster('neutral', 1, 22), caster('neutral', 1), 4);
  const [r, x] = m.fighters; const hr = r.hp, hx = x.hp; let lacrou = false;
  run(m, 200, (e) => { if (e.type === 'counter' && e.text === 'LACROU!') lacrou = true; });
  check('refletir projétil', lacrou && r.hp === hr && x.hp < hx, `renan ${hr}->${r.hp.toFixed(1)} xandor ${hx}->${x.hp.toFixed(1)}`);
}
// 3b) ARCABOUÇO FISCAL (counter) anula o projétil
{
  const m = setup('haddad', 'xandor', caster('forward', 1, 24), caster('neutral', 1), 4);
  const [h] = m.fighters; const h0 = h.hp; let blocked = false;
  run(m, 120, (e) => { if (e.type === 'counter' && e.fighter === h) blocked = true; });
  check('arcabouço anula projétil', blocked && h.hp === h0, `haddad ${h0}->${h.hp}`);
}
// 4) CONTROLES INVERTIDOS + 5) LENTIDÃO + 6) ROUBO DE BARRA (direto pelo applyHit genérico)
{
  const m = setup('haddad', 'xandor');
  const [h, x] = m.fighters;
  const hit = (spec) => import('../src/fight/Combat.js').then(({ applyHit }) => applyHit(m, h, x, spec, h.x));
  await hit({ damage: 1, invert: 60 });
  x.recordInput({ ...NEUTRAL, right: true });
  check('controles invertidos', x.cmd.left && !x.cmd.right, `invertT=${x.invertT}`);
  run(m, 40);
  await hit({ damage: 1, slow: { frames: 180, mult: 0.6, text: '+IMPOSTO' } });
  check('lentidão', x.slowT > 0 && Math.abs(x.speedMult() - 0.6) < 1e-6, `speedMult=${x.speedMult()}`);
  x.meter = 200; const m0 = h.meter;
  await hit({ damage: 1, meterSteal: 150 });
  check('roubo de barra (ult + passiva)', x.meter < 200 - 150 && h.meter > m0 + 150, `rival=${x.meter.toFixed(0)} haddad=${h.meter.toFixed(0)}`);
}
// 7) MOBILIZAÇÃO: perto ganha mais barra que longe
{
  const m = setup('boulos', 'dino-supremo'); const [b] = m.fighters;
  b.x = m.fighters[1].x - 1; b.meter = 0; b.gainMeter(10); const near = b.meter;
  b.x = m.fighters[1].x - 5; b.meter = 0; b.gainMeter(10); const far = b.meter;
  check('mobilização', near > far * 1.2, `perto=${near} longe=${far}`);
}
// 8) CORTE VIRAL: combo de 3 socos dá buff de velocidade
{
  let k = 0;
  const combo = { read() { k++; return (k % 4 < 2 && k < 50) ? { ...NEUTRAL, punch: true } : NEUTRAL; } };
  const m = setup('renan', 'xandor', combo, idle, 1.1); const r = m.fighters[0]; r.x = 6.4; m.fighters[1].x = 7.5; let corte = false;
  run(m, 60, (e) => { if (e.type === 'text' && e.text === 'CORTE VIRAL!') corte = true; });
  check('corte viral', corte && r.buffT > 0, `buffT=${r.buffT}`);
}
// 9) ultimates dos 4: hits reais = ultRes 'hit'; Dilma deixa CONFUSO, Renan trava especiais
for (const id of ['dilma', 'haddad', 'boulos', 'renan']) {
  const m = setup(id, 'dino-supremo', { read(self) { return self.state === 'idle' && self.meter >= 300 ? { ...NEUTRAL, ultimate: true } : NEUTRAL; } }, idle, 2);
  const [a, b] = m.fighters; a.meter = 300; let hits = 0;
  run(m, 400, (e) => { if (e.type === 'hit' && e.fighter === b) hits++; });
  const n = a.ultRes.filter((r) => r === 'hit').length;
  const extra = id === 'dilma' ? b.invertT >= 0 && a.ultRes.length === a.ultimate.hits + 1 : true;
  check(`ultimate ${id}`, n === hits && n === a.ultimate.hits + 1 && extra, `[${a.ultRes.join(',')}]`);
}
process.exit(ok ? 0 : 1);
