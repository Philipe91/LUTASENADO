// Simulação headless: CPU x CPU em todos os confrontos, sem navegador.
// Prova que a lógica de combate não depende do visual e serve para balancear.
// Uso: npm run sim   (ou node tests/sim.mjs 30  para 30 partidas por confronto)
import { Match } from '../src/fight/Match.js';
import { AIController } from '../src/fight/AI.js';
import { CHARACTERS } from '../src/data/characters/index.js';

const N = Number(process.argv[2] || 10);
const stats = Object.fromEntries(CHARACTERS.map((c) => [c.id, { w: 0, l: 0 }]));
let totalFrames = 0, matches = 0, ultKOs = 0, timeUps = 0, ults = 0, specials = 0;

for (const a of CHARACTERS) for (const b of CHARACTERS) {
  if (a === b) continue;
  for (let i = 0; i < N; i++) {
    const m = new Match(a, b, [new AIController(a.ai), new AIController(b.ai)]);
    let guard = 0;
    while (m.phase !== 'matchEnd' && guard++ < 60 * 60 * 8) {
      m.step();
      for (const e of m.drainEvents()) {
        if (e.type === 'ko' && e.byUltimate) ultKOs++;
        if (e.type === 'ko' && e.timeUp) timeUps++;
        if (e.type === 'ultimate') ults++;
        if (e.type === 'special') specials++;
      }
    }
    if (m.phase !== 'matchEnd') { console.error('PARTIDA TRAVOU', a.id, b.id); process.exit(1); }
    stats[m.winner.data.id].w++;
    stats[m.winner.opponent.data.id].l++;
    totalFrames += m.frame; matches++;
  }
}

console.log(`\n${matches} partidas CPU x CPU`);
for (const [id, s] of Object.entries(stats)) {
  console.log(`${id.padEnd(15)} ${String(Math.round((100 * s.w) / (s.w + s.l))).padStart(3)}% vitórias (${s.w}V/${s.l}D)`);
}
console.log(`duração média: ${(totalFrames / matches / 60).toFixed(1)}s | ultimates/partida: ${(ults / matches).toFixed(2)} | especiais/partida: ${(specials / matches).toFixed(1)}`);
console.log(`KOs por ultimate: ${ultKOs} | rounds por tempo: ${timeUps}`);
