// AUDITORIA DE COMBATE (sem navegador): frame data de cada normal e especial de golpe por personagem (vantagem no
// acerto/na defesa, medida de verdade na simulação), golpes inseguros, determinismo (mesma semente = mesma luta),
// taxa de vitória da IA difícil contra a normal e o fácil, duração dos rounds e maior combo.
// Uso: node tests/framedata.mjs            (resumo)   |   node tests/framedata.mjs --all   (tabela de todos os personagens)
import { Match } from '../src/fight/Match.js';
import { AIController } from '../src/fight/AI.js';
import { NEUTRAL } from '../src/fight/constants.js';
import { CHARACTERS, getCharacter } from '../src/data/characters/index.js';

const all = process.argv.includes('--all');
const idle = { read: () => NEUTRAL };
const PUNISH = 5; // soco mais rápido do jogo (startup) — golpe com −5 ou pior na defesa é punível de perto

function setup(a, b, ca, cb, gap) {
  const m = new Match(getCharacter(a), getCharacter(b), [ca, cb], 7);
  while (m.phase !== 'fight') { m.step(); m.drainEvents(); }
  m.fighters[0].x = -gap / 2; m.fighters[1].x = gap / 2;
  m.fighters.forEach((f) => f.faceOpponent());
  return m;
}
// mede na simulação: A solta o golpe colado em B (parado ou defendendo); quantos frames cada um leva para ficar livre
function measure(id, move, block, special = false) {
  let fired = false;
  const chainN = move === 'punch2' ? 2 : move === 'punch3' ? 3 : 1; // soco 2/3 só saem emendando (chain) o soco 1/2
  const caster = { read(self) {
    // emenda: aperta soco de novo no fim da janela ativa do soco anterior
    if (chainN > 1 && self.state === 'attack' && self.move.chain && self.t === self.move.startup + self.move.active && self.move.id !== move) return { ...NEUTRAL, punch: true };
    if (fired || self.state !== 'idle') return NEUTRAL;
    fired = true;
    const F = self.facing > 0 ? 'right' : 'left';
    if (special) return { ...NEUTRAL, special: true, [F]: move === 'forward', down: move === 'down' };
    return { ...NEUTRAL, punch: move.startsWith('punch') || move === 'crouchPunch', kick: move === 'kick' || move === 'sweep', down: move === 'crouchPunch' || move === 'sweep' };
  } };
  const defender = { read(self) { const B = self.facing > 0 ? 'left' : 'right'; return block ? { ...NEUTRAL, [B]: true, down: block === 'low' } : NEUTRAL; } };
  const m = setup(id, 'xandor', caster, defender, 1.0);
  const [a, b] = m.fighters;
  let contact = -1, aFree = -1, bFree = -1, result = 'whiff', kd = false;
  for (let i = 0; i < 240; i++) {
    m.step();
    for (const e of m.drainEvents()) {
      const mine = special ? a.state === 'special' : a.move?.id === move;
      if ((e.type === 'hit' || e.type === 'block') && e.fighter === b && mine) { contact = m.frame; result = e.type; aFree = bFree = -1; if (b.state === 'knockdown') kd = true; }
    }
    if (contact >= 0) {
      if (aFree < 0 && (a.state === 'idle' || a.state === 'walk' || a.state === 'crouch')) aFree = m.frame;
      if (bFree < 0 && (b.state === 'idle' || b.state === 'walk' || b.state === 'crouch')) bFree = m.frame;
      if (aFree >= 0 && bFree >= 0 && (special || chainN === 1 || a.move?.id !== move)) break;
    }
  }
  return { result, adv: contact < 0 ? null : bFree - aFree, kd };
}

const NORMALS = ['punch1', 'punch2', 'punch3', 'kick', 'crouchPunch', 'sweep'];
const unsafe = [], broken = [];
const ids = all ? CHARACTERS.map((c) => c.id) : ['xandor', 'lulacio', 'dino-supremo', 'nikolas'];
console.log('FRAME DATA (vantagem medida na simulação; "KD" = derruba, então a vantagem é o tempo até ele levantar)');
for (const id of ids) {
  const c = getCharacter(id);
  const rows = [];
  for (const mv of NORMALS) {
    const h = measure(id, mv, false), bl = measure(id, mv, mv === 'crouchPunch' || mv === 'sweep' ? 'low' : 'high');
    const onHit = h.result === 'hit' ? (h.kd ? `KD(+${h.adv})` : `${h.adv >= 0 ? '+' : ''}${h.adv}`) : 'ERRA';
    const onBlock = bl.result === 'block' ? `${bl.adv >= 0 ? '+' : ''}${bl.adv}` : bl.result === 'hit' ? 'VAZOU' : 'ERRA';
    rows.push(`${mv.padEnd(12)} hit ${onHit.padEnd(9)} def ${onBlock}`);
    if (h.result !== 'hit') broken.push(`${id}.${mv}: não acerta colado (${h.result})`);
    if (bl.result === 'block' && bl.adv <= -PUNISH - 6 && !h.kd) unsafe.push(`${id}.${mv} ${bl.adv} na defesa (sem derrubar)`);
  }
  for (const dir of ['neutral', 'forward', 'down']) {
    const s = c.specials[dir];
    if (!s || s.kind !== 'strike') continue;
    const h = measure(id, dir, false, true), bl = measure(id, dir, 'high', true);
    const onHit = h.result === 'hit' ? (h.kd ? `KD(+${h.adv})` : `${h.adv >= 0 ? '+' : ''}${h.adv}`) : 'ERRA';
    const onBlock = bl.result === 'block' ? `${bl.adv >= 0 ? '+' : ''}${bl.adv}` : bl.result === 'hit' ? 'VAZOU' : bl.result === 'counter' ? 'counter' : 'ERRA';
    rows.push(`${('esp:' + dir).padEnd(12)} hit ${onHit.padEnd(9)} def ${onBlock}  (${s.name})`);
    if (h.result === 'hit' && !h.kd && h.adv < 0) unsafe.push(`${id}.${s.name} ${h.adv} NO ACERTO (acerta e ainda apanha)`);
    if (bl.result === 'block' && bl.adv <= -PUNISH - 10 && !h.kd) unsafe.push(`${id}.${s.name} ${bl.adv} na defesa (sem derrubar)`);
  }
  console.log(`\n${c.name}`); rows.forEach((r) => console.log('  ' + r));
}
console.log(`\nGolpes muito inseguros na defesa (≤ −${PUNISH + 6} normal / ≤ −${PUNISH + 10} especial, sem derrubar): ${unsafe.length ? '' : 'nenhum'}`);
unsafe.forEach((u) => console.log('  ' + u));
console.log(`Golpes que não acertam colado: ${broken.length ? '' : 'nenhum'}`);
broken.forEach((u) => console.log('  ' + u));

// ---- determinismo: mesma semente + mesmos controladores = mesma luta ----
const replay = () => {
  const a = getCharacter('lulacio'), b = getCharacter('xandor');
  const m = new Match(a, b, [new AIController(a.ai, 'hard'), new AIController(b.ai, 'hard')], 42);
  const log = [];
  while (m.phase !== 'matchEnd' && m.frame < 60 * 60 * 8) { m.step(); for (const e of m.drainEvents()) if (e.type === 'hit') log.push(`${m.frame}:${e.dmg.toFixed(3)}`); }
  return `${log.join(',')}|${m.frame}`;
};
const det = replay() === replay();
console.log(`\nDeterminismo (semente 42, 2 execuções iguais): ${det ? 'OK' : 'FALHOU'}`);

// ---- IA: difícil × normal e difícil × fácil (espelho, todos os personagens), duração e combos ----
function series(levelA, levelB, n = 3) {
  let wins = 0, N = 0, frames = 0, rounds = 0, maxCombo = 0, combos = 0, comboSum = 0;
  let seed = 100;
  for (const c of CHARACTERS) for (let i = 0; i < n; i++) {
    const m = new Match(c, c, [new AIController(c.ai, levelA), new AIController(c.ai, levelB)], seed++);
    let last = 0;
    while (m.phase !== 'matchEnd' && m.frame < 60 * 60 * 8) {
      m.step();
      for (const e of m.drainEvents()) {
        if (e.type === 'ko') rounds++;
        if (e.type === 'hit') { maxCombo = Math.max(maxCombo, e.combo); if (e.combo >= 2 && e.combo > last) { if (e.combo === 2) combos++; comboSum++; } last = e.combo; }
      }
    }
    N++; frames += m.frame; if (m.winner?.slot === 0) wins++;
  }
  return { pct: Math.round((100 * wins) / N), roundSecs: (frames / rounds / 60).toFixed(1), maxCombo, avgCombo: combos ? (comboSum / combos + 1).toFixed(1) : '-' };
}
const hn = series('hard', 'normal'), he = series('hard', 'easy'), nn = series('normal', 'normal');
console.log(`IA difícil × normal: ${hn.pct}% vitórias · difícil × fácil: ${he.pct}% · normal × normal (espelho, ref. 50%): ${nn.pct}%`);
console.log(`Round médio: normal ${nn.roundSecs}s · difícil ${hn.roundSecs}s | maior combo: ${Math.max(hn.maxCombo, nn.maxCombo)} hits | combo médio (≥2): ${nn.avgCombo}`);
const ok = det && broken.length === 0 && he.pct >= 65;
console.log(ok ? '\nOK' : '\nFALHOU');
process.exit(ok ? 0 : 1);
