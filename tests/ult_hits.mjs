// Confere que a ultimate registra o resultado REAL de cada hit (f.ultRes) — nº de 'hit' = nº de danos aplicados.
// O visual (canetas/martelo do Xandor, tentáculos do Polvão) só mostra contato quando é 'hit'.
import { Match } from '../src/fight/Match.js';
import { NEUTRAL } from '../src/fight/constants.js';
import { getCharacter } from '../src/data/characters/index.js';

function run(id, gap, range) {
  const data = getCharacter(id);
  const c = { ...data, ultimate: { ...data.ultimate, ...(range ? { range } : {}) } };
  let sent = false;
  const caster = { read(self) { if (sent || self.state !== 'idle') return NEUTRAL; sent = true; return { ...NEUTRAL, ultimate: true }; } };
  const m = new Match(c, getCharacter('dino-supremo'), [caster, { read: () => NEUTRAL }]);
  while (m.phase !== 'fight') { m.step(); m.drainEvents(); }
  const [a, b] = m.fighters; a.meter = 300; a.x = -gap / 2; b.x = gap / 2;
  let hits = 0;
  for (let i = 0; i < 400; i++) { m.step(); for (const e of m.drainEvents()) if (e.type === 'hit' && e.fighter === b) hits++; }
  return { res: a.ultRes.join(','), hits };
}
let ok = true;
for (const id of ['xandor', 'lulacio']) {
  const near = run(id, 2), far = run(id, 6, 0.5);
  // o que importa: cada 'hit' registrado = 1 dano real (e 'miss' = nenhum). Longe, os primeiros hits têm que errar.
  const count = (r) => r.res.split(',').filter((x) => x === 'hit').length;
  const good = count(near) === near.hits && count(far) === far.hits && far.res.startsWith('miss,miss');
  ok &&= good;
  console.log(`${id.padEnd(8)} perto: [${near.res}] ${near.hits} hits · fora do alcance: [${far.res}] ${far.hits} hits ${good ? 'OK' : 'FALHOU'}`);
}
process.exit(ok ? 0 : 1);
