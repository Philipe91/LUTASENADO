// Simula partidas CPU x CPU em Node (sem navegador, sem AudioContext) e lista os eventos sonoros que
// disparariam: SFX, falas do locutor e comandos de música. Também confere que todo SFX pedido existe no banco.
// Uso: node tests/audio_events.mjs [p1] [p2] [--seed]   (padrão: todos os confrontos, 1 partida cada)
//      node tests/audio_events.mjs lulacio xandor --log   (imprime a linha do tempo de uma partida)
import { Match } from '../src/fight/Match.js';
import { AIController } from '../src/fight/AI.js';
import { CHARACTERS, getCharacter } from '../src/data/characters/index.js';
import { EventBus } from '../src/core/EventBus.js';
import { SoundDirector } from '../src/audio/SoundDirector.js';
import { SFX } from '../src/audio/sfxBank.js';
import { render } from '../src/audio/synth.js';

const args = process.argv.slice(2);
const log = args.includes('--log');
const ids = args.filter((a) => !a.startsWith('--'));
const pairs = ids.length >= 2
  ? [[getCharacter(ids[0]), getCharacter(ids[1])]]
  : CHARACTERS.flatMap((a) => CHARACTERS.filter((b) => b !== a).map((b) => [a, b]));

const total = { sfx: {}, say: {}, music: {} };
const missing = new Set();
let fails = 0;

for (const [a, b] of pairs) {
  const bus = new EventBus();
  const timeline = [];
  let m = null;
  const rec = (kind) => (x) => {
    const key = typeof x === 'string' ? x : String(x);
    total[kind][key] = (total[kind][key] || 0) + 1;
    if (kind === 'sfx' && !SFX[key]) missing.add(key);
    if (log) timeline.push(`${String(m?.frame ?? 0).padStart(5)}  ${kind.padEnd(5)} ${key}`);
  };
  new SoundDirector({ sfx: rec('sfx'), say: rec('say'), music: rec('music') }).attach(bus);

  // mesmo fluxo do main.js: matchStart → eventos drenados → 'frame'
  m = new Match(a, b, [new AIController(a.ai), new AIController(b.ai)]);
  bus.emit('matchStart', m);
  let guard = 0;
  while (m.phase !== 'matchEnd' && guard++ < 60 * 60 * 8) {
    m.step();
    for (const e of m.drainEvents()) bus.emit(e.type, e, m);
    bus.emit('frame', m);
  }
  if (m.phase !== 'matchEnd') { console.error('PARTIDA TRAVOU', a.id, b.id); fails++; }
  bus.emit('menu');
  if (log) console.log(`\n=== ${a.id} x ${b.id} ===\n` + timeline.join('\n'));
}

const show = (title, obj) => {
  console.log(`\n${title}`);
  for (const [k, v] of Object.entries(obj).sort((x, y) => y[1] - x[1])) console.log(`  ${String(v).padStart(6)}  ${k}`);
};
console.log(`${pairs.length} partida(s) simulada(s)`);
show('SFX disparados:', total.sfx);
show('Locutor:', total.say);
show('Música:', total.music);

const never = Object.keys(SFX).filter((k) => !total.sfx[k]);
if (never.length) console.log(`\nSFX do banco que não tocaram nesta simulação (dependem de situação/sorte da IA): ${never.join(', ')}`);

// todo som do banco renderiza sem NaN e com duração razoável
for (const [k, def] of Object.entries(SFX)) {
  const pcm = render(def.layers, 22050);
  if (!pcm.every(Number.isFinite) || pcm.length < 100 || pcm.length > 22050 * 4) { console.error('SFX inválido:', k); fails++; }
}
if (missing.size) { console.error('\nSFX pedidos que NÃO existem no banco:', [...missing].join(', ')); fails++; }
for (const need of ['PRIMEIRO TURNO', 'LUTEM!']) if (!total.say[need]) { console.error('locutor não falou', need); fails++; }
if (!Object.keys(total.say).some((s) => s.startsWith('VITÓRIA DE'))) { console.error('locutor não anunciou vitória'); fails++; }
console.log(fails ? `\nFALHOU (${fails})` : '\nOK');
process.exit(fails ? 1 : 0);
