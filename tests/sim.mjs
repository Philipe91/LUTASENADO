// Simulação headless: CPU x CPU em todos os confrontos, sem navegador.
// Prova que a lógica de combate não depende do visual e serve para balancear.
// Uso: npm run sim   (ou node tests/sim.mjs 30  para 30 partidas por confronto · node tests/sim.mjs 10 hard  nível da IA)
// Determinista: semente fixa por partida (mesmo código = mesmos números).
import { Match } from '../src/fight/Match.js';
import { AIController } from '../src/fight/AI.js';
import { CHARACTERS } from '../src/data/characters/index.js';

const N = Number(process.argv[2] || 10);
const LEVEL = process.argv[3] || 'normal';
let seed = 1;
const stats = Object.fromEntries(CHARACTERS.map((c) => [c.id, { w: 0, l: 0 }]));
const pairs = {}; // vitórias de a contra b (os dois lados somados)
let totalFrames = 0, matches = 0, ultKOs = 0, timeUps = 0, ults = 0, specials = 0, rounds = 0, guardBreaks = 0, throws = 0, maxCombo = 0;

for (const a of CHARACTERS) for (const b of CHARACTERS) {
  if (a === b) continue;
  for (let i = 0; i < N; i++) {
    const m = new Match(a, b, [new AIController(a.ai, LEVEL), new AIController(b.ai, LEVEL)], seed++);
    let guard = 0;
    while (m.phase !== 'matchEnd' && guard++ < 60 * 60 * 8) {
      m.step();
      for (const e of m.drainEvents()) {
        if (e.type === 'ko' && e.byUltimate) ultKOs++;
        if (e.type === 'ko' && e.timeUp) timeUps++;
        if (e.type === 'ultimate') ults++;
        if (e.type === 'special') specials++;
        if (e.type === 'ko') rounds++;
        if (e.type === 'guardBreak') guardBreaks++;
        if (e.type === 'hit' && e.combo > maxCombo) maxCombo = e.combo;
      }
    }
    if (m.phase !== 'matchEnd') { console.error('PARTIDA TRAVOU', a.id, b.id); process.exit(1); }
    stats[m.winner.data.id].w++;
    stats[m.winner.opponent.data.id].l++;
    const key = [a.id, b.id].sort().join(' x ');
    pairs[key] ??= { [a.id]: 0, [b.id]: 0, n: 0 };
    pairs[key][m.winner.data.id]++; pairs[key].n++;
    totalFrames += m.frame; matches++;
  }
}

console.log(`\n${matches} partidas CPU x CPU`);
for (const [id, s] of Object.entries(stats)) {
  console.log(`${id.padEnd(15)} ${String(Math.round((100 * s.w) / (s.w + s.l))).padStart(3)}% vitórias (${s.w}V/${s.l}D)`);
}
console.log(`duração média: ${(totalFrames / matches / 60).toFixed(1)}s | ultimates/partida: ${(ults / matches).toFixed(2)} | especiais/partida: ${(specials / matches).toFixed(1)}`);
// pares mais desequilibrados (os dois lados somados: 2N partidas por par — com N=10 o ruído é de ±10 pontos)
const worst = Object.entries(pairs).map(([k, p]) => { const [x, y] = k.split(' x '); const pct = Math.round((100 * p[x]) / p.n); return { k, pct: Math.max(pct, 100 - pct), who: pct >= 50 ? x : y, n: p.n }; }).sort((a, b) => b.pct - a.pct);
console.log(`pares além de 70/30 (${worst[0]?.n} partidas por par): ${worst.filter((w) => w.pct > 70).map((w) => `${w.k} ${w.pct}% ${w.who}`).join(' · ') || 'nenhum'}`);
console.log(`rounds: ${rounds} (${(totalFrames / rounds / 60).toFixed(1)}s/round) | KOs por ultimate: ${ultKOs} (${Math.round((100 * ultKOs) / rounds)}%) | rounds por tempo: ${timeUps} | guardas quebradas/partida: ${(guardBreaks / matches).toFixed(2)} | maior combo: ${maxCombo}`);
