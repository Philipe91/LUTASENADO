// Passiva TÁ OK (Capitão Brasa): defender no último instante = defesa perfeita (buff); segurar a defesa desde cedo = comum.
import { Match } from '../src/fight/Match.js';
import { getCharacter } from '../src/data/characters/index.js';
import { ParryP1, ParryP2 } from '../src/dev/parrytest.js';

function run(late) {
  const m = new Match(getCharacter('capitao-brasa'), getCharacter('xandor'), [new ParryP1(late), new ParryP2()]);
  let blocks = 0, perfect = 0, hits = 0, buffed = 0;
  for (let i = 0; i < 900; i++) {
    m.step();
    if (m.fighters[0].buffT > 0) buffed++;
    for (const e of m.drainEvents()) {
      if (e.type === 'block' && e.fighter === m.fighters[0]) blocks++;
      if (e.type === 'perfect') perfect++;
      if (e.type === 'hit' && e.fighter === m.fighters[0]) hits++;
    }
  }
  return { blocks, perfect, hits, buffed };
}
const a = run(false), b = run(true);
console.log(`no último instante: ${a.blocks} defesas, ${a.perfect} perfeitas, ${a.hits} hits tomados, ${a.buffed} frames com buff`);
console.log(`segurando cedo:     ${b.blocks} defesas, ${b.perfect} perfeitas, ${b.hits} hits tomados, ${b.buffed} frames com buff`);
const ok = a.perfect > 0 && a.perfect === a.blocks && a.buffed > 0 && b.blocks > 0 && b.perfect === 0;
console.log(ok ? 'OK' : 'FALHOU');
process.exit(ok ? 0 : 1);
