// Mede cada especial isolado contra um boneco parado: duração total (ENTRA → IMPACTA → SOME), hits e dano.
// Uso: node tests/specials.mjs            (todos)   |   node tests/specials.mjs lulacio forward
import { Match } from '../src/fight/Match.js';
import { NEUTRAL } from '../src/fight/constants.js';
import { CHARACTERS, getCharacter } from '../src/data/characters/index.js';

function measure(char, dir, dist = 3.5) {
  let pressed = false;
  const caster = {
    read(self) {
      if (pressed || self.state !== 'idle') return NEUTRAL;
      pressed = true;
      const F = self.facing > 0 ? 'right' : 'left';
      return { ...NEUTRAL, special: true, [F]: dir === 'forward', down: dir === 'down' };
    },
  };
  const m = new Match(char, getCharacter('xandor'), [caster, { read: () => NEUTRAL }]);
  while (m.phase !== 'fight') { m.step(); m.drainEvents(); }
  m.fighters[0].x = -dist / 2; m.fighters[1].x = dist / 2;
  const target = m.fighters[1];
  let start = -1, end = -1, hits = 0, maxHitters = 0;
  const hp0 = target.hp;
  for (let f = 0; f < 600; f++) {
    m.step();
    for (const e of m.drainEvents()) {
      if (e.type === 'special') start = m.frame;
      if (e.type === 'hit' && e.fighter === target) hits++;
    }
    maxHitters = Math.max(maxHitters, m.hitters.length);
    const busy = m.fighters[0].state === 'special' || m.hitters.length > 0;
    if (start >= 0 && !busy && end < 0) { end = m.frame; break; }
  }
  return { frames: end - start, secs: ((end - start) / 60).toFixed(2), hits, dmg: (hp0 - target.hp).toFixed(1), knockdown: target.state, maxHitters };
}

const [only, onlyDir] = process.argv.slice(2);
for (const c of CHARACTERS) {
  if (only && c.id !== only) continue;
  for (const dir of ['neutral', 'forward', 'down']) {
    if (onlyDir && dir !== onlyDir) continue;
    const r = measure(c, dir);
    console.log(`${c.id.padEnd(14)} ${dir.padEnd(8)} ${c.specials[dir].name.padEnd(24)} ${r.secs}s  hits:${r.hits}  dano:${r.dmg}  alvo:${r.knockdown}  objetos simultâneos:${r.maxHitters}`);
  }
}
