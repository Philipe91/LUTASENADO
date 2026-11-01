// Diretor de som: traduz eventos da partida + observação do estado dos lutadores em "deixas" de áudio.
// 100% lógica, sem WebAudio: roda em Node (tests/audio_events.mjs) com uma saída que só registra.
// NÃO altera nada da partida — só lê.
//
// Saída esperada (out):
//   out.sfx(nome, { vol, pitch, pan, delay })   efeito sonoro (variação leve de pitch/volume fica no motor)
//   out.say(texto, { priority })                locutor (speechSynthesis)
//   out.music('start' | 'stop' | 'duck' | 'win')
//   out.voice(fighter, evento, { priority, pan, delay })   (opcional) grito do lutador: attack|hurt|jump|special|ultimate|ko|win|lose|taunt
import { METER_MAX, ARENA_HALF } from '../fight/constants.js';

const PUNCH_LIGHT = new Set(['punch1', 'punch2', 'crouchPunch', 'airPunch']);
const KICKS = new Set(['kick', 'airKick', 'sweep']);
// especial → assinatura sonora ao ser lançado (nome do golpe nos dados do personagem)
const SPECIAL_CUES = {
  'Discurso Interminável': ['mic'],
  'Picanha do Povo': ['throwWhoosh'],
  'Abraço do Palanque': ['whooshHeavy'],
  'Rajada do Dedo': ['finger'],
  'Motociata': ['motos'],
  'Patriota no Para-brisa': ['truck'],
  'Rugido Togado': ['roar'],
  'Meteoro Didático': ['throwWhoosh'],
  'Pisão Cretáceo': ['stomp'],
  'Intimação': ['paper'],
  'BLOQUEADO': ['whooshHeavy'],
  'Canetada': ['pen'],
  'Chupeta Teleguiada': ['throwWhoosh'],
  'Mamadeira Turbo': ['throwWhoosh'],
  'Selfie do Dano': ['paper'],
  'Discurso de Impacto': ['mic'],
  'Salto Agulha': ['whooshHeavy'],
  'Close Certo': ['buff'],
};
// Hitter (projétil/zona/onda) → som quando NASCE e quando fica ARMADO (zona caindo / carimbo batendo)
const HITTER_SPAWN = { civilCrowd: 'crowd', wave: 'rumble', book: 'whoosh', maleta: 'throwWhoosh', juros: 'whoosh', malaContatos: 'poof' };
const HITTER_ARMED = { stamp: 'stamp', pen: 'gavel', assist: 'poof' };
// ultimate → som de cada golpe da sequência
const ULT_HIT = { lulacio: 'tentacle', xandor: 'gavel', 'capitao-brasa': 'chomp', 'dino-supremo': 'roarHit', nikolas: 'buff', erika: 'mic', vorcaro: 'paper' };
const ULT_START = { lulacio: 'tentacle', xandor: 'gavel', 'capitao-brasa': 'motos', 'dino-supremo': 'roar', nikolas: 'cheer', erika: 'mic', vorcaro: 'bell' };

// vozes dos lutadores: cooldown (quadros) depois de cada fala e chance de falar (golpe normal não grita sempre)
const VOICE = {
  attack: { chance: 0.3, heavyChance: 0.6, cooldown: 40, priority: 1 },
  jump: { chance: 0.35, cooldown: 50, priority: 1 },
  hurt: { chance: 0.4, heavyChance: 0.75, cooldown: 45, priority: 2 },
  special: { chance: 0.8, cooldown: 60, priority: 2 },
  taunt: { chance: 1, cooldown: 0, priority: 2 },
  ultimate: { chance: 1, cooldown: 0, priority: 3 },
  win: { chance: 1, cooldown: 0, priority: 3 },
  lose: { chance: 1, cooldown: 0, priority: 3 },
  ko: { chance: 1, cooldown: 0, priority: 4 },
};

// nome do golpe → evento de voz próprio ("Picanha do Povo" → "sp-picanha-do-povo"; ver tools/voices/cortar_falas.py)
const specialEvent = (name) => 'sp-' + String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const panOf = (x) => clamp((x ?? 0) / ARENA_HALF, -1, 1) * 0.6;
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());

export class SoundDirector {
  constructor(out) {
    this.out = out;
    this.watch = new Map(); // fighter → estado observado
    this.hitters = new Map(); // id do Hitter → { armed }
    this.match = null;
    this.voiceT = new Map(); // fighter → quadro em que pode falar de novo
    this.rand = Math.random;
  }

  // Liga ao barramento do jogo (src/core/EventBus.js)
  attach(bus) {
    bus.on('*', (type, e, match) => {
      if (type === 'frame') this.observe(e);
      else if (type === 'matchStart') this.reset(e);
      else if (type === 'menu') this.reset(null);
      else this.onEvent(e, match);
    });
    return this;
  }

  reset(match) {
    this.match = match;
    this.watch.clear();
    this.hitters.clear();
    this.voiceT.clear();
    this.out.music(match ? 'start' : 'stop');
  }

  sfx(name, opts = {}) { this.out.sfx(name, opts); }
  say(text, priority = 1) { this.out.say(text, { priority }); }

  // grito do lutador f (com chance e cooldown por lutador; prioridade alta fura o cooldown)
  voice(f, event, { heavy = false, delay = 0, sub = null } = {}) {
    if (!f || !this.out.voice) return;
    const r = VOICE[event];
    const chance = heavy && r.heavyChance != null ? r.heavyChance : r.chance;
    if (chance < 1 && this.rand() >= chance) return;
    const now = this.match?.frame ?? 0;
    const until = this.voiceT.get(f);
    if (until && now < until.t && r.priority <= until.priority) return;
    this.voiceT.set(f, { t: now + r.cooldown, priority: r.priority });
    this.out.voice(f, event, { priority: r.priority, pan: panOf(f.x), delay, sub });
  }

  // ---------- eventos emitidos pela partida ----------
  onEvent(e, match) {
    switch (e.type) {
      case 'roundStart':
        this.watch.clear(); this.hitters.clear();
        this.say(e.name.replace('?!', '!'), 2);
        this.sfx('cheer', { vol: 0.5 });
        break;
      case 'banner':
        if (e.cls === 'fight') {
          this.say(e.text, 2); this.sfx('bell');
          // provocação curta de um dos lutadores (alterna por round), logo depois do "LUTEM!"
          const fs = (match || this.match)?.fighters;
          if (fs) this.voice(fs[((match || this.match).round + 1) % 2], 'taunt', { delay: 0.75 });
        }
        break;
      case 'hit': this.onHit(e); break;
      case 'block': this.sfx('block', { pan: panOf(e.x) }); this.markLanded(e.fighter?.opponent); break;
      case 'armor': this.sfx('armor', { pan: panOf(e.x) }); this.markLanded(e.fighter?.opponent); break;
      case 'dust': this.sfx('stomp', { pan: panOf(e.x), vol: 0.8 }); break;
      case 'grab': this.sfx('grab', { pan: panOf(e.fighter?.x) }); this.sfx('ooh', { vol: 0.6 }); break;
      case 'special': {
        const cues = SPECIAL_CUES[e.name] || ['whooshHeavy'];
        for (const c of cues) this.sfx(c, { pan: panOf(e.fighter?.x) });
        this.voice(e.fighter, 'special', { sub: specialEvent(e.name) }); // fala do golpe (sp-<golpe>), senão grito genérico
        break;
      }
      case 'spawn': // o som do que nasceu (multidão...) vem da observação dos Hitters; aqui só o "puf" + torcida
        this.sfx('poof', { pan: panOf(e.x) });
        if (e.visual === 'civilCrowd') this.sfx('cheer', { vol: 0.7 });
        break;
      case 'text':
        if (e.cls === 'buff') this.sfx('buff');
        else if (e.cls === 'lock') this.sfx('denied');
        else if (e.cls === 'miss') this.sfx('whoosh', { pan: panOf(e.fighter?.x) });
        break;
      case 'locked': this.sfx('denied', { vol: 0.7 }); break;
      case 'counter': this.sfx('stamp', { pan: panOf(e.x) }); this.sfx('cheer', { vol: 0.7, delay: 0.15 }); break; // Close Certo / PERFECT SELFIE
      case 'flash': this.sfx('paper', { vol: 0.5 }); break;
      case 'ultimate': {
        const id = e.fighter?.data?.id;
        this.sfx('ultActivate');
        if (ULT_START[id]) this.sfx(ULT_START[id], { delay: 0.45 });
        this.sfx('cheer', { vol: 0.9, delay: 0.2 });
        this.say(e.name, 3);
        this.voice(e.fighter, 'ultimate', { delay: 0.1 });
        this.out.music('duck');
        break;
      }
      case 'ko':
        if (e.timeUp) { this.sfx('bell'); this.say(e.text.replace('!', ''), 3); }
        else { this.sfx('ko'); this.say('K.O.!', 3); }
        this.sfx('cheer', { vol: 1, delay: 0.35 });
        if (e.timeUp) { if (e.loser) this.voice(e.loser, 'lose', { delay: 0.3 }); }
        else this.voice(e.loser, 'ko');
        this.out.music('duck');
        break;
      case 'roundWin': this.sfx('cheer', { vol: 0.6 }); this.voice(e.winner, 'win'); break;
      case 'matchEnd':
        this.say(`VITÓRIA DE ${titleCase(e.winner?.data?.name || '')}!`, 3);
        this.voice(e.winner?.opponent, 'lose', { delay: 1.6 });
        this.out.music('win');
        break;
      default: break;
    }
  }

  onHit(e) {
    const atk = e.attacker;
    const pan = panOf(e.x);
    this.markLanded(atk);
    if (!e.ko) this.voice(e.fighter, 'hurt', { heavy: e.heavy || e.ultimate });
    if (e.ultimate) {
      this.sfx(ULT_HIT[atk?.data?.id] || 'punchHeavy', { pan });
      this.sfx('punchHeavy', { pan, vol: 0.55 });
      if (e.text) this.sfx('ko', { vol: 0.5 }); // finalizador da ultimate
      return;
    }
    let cue = e.heavy ? 'punchHeavy' : 'punchLight';
    if (atk?.state === 'attack' && atk.move) {
      const id = atk.move.id;
      if (PUNCH_LIGHT.has(id)) cue = 'punchLight';
      else if (KICKS.has(id)) cue = 'kick';
      else if (id === 'throw') cue = 'slam';
      else if (id === 'punch3') cue = 'punchHeavy';
    } else if (atk?.state === 'special' && atk.sp?.kind === 'grab') cue = 'slam';
    this.sfx(cue, { pan });
    // torcida reage aos golpes fortes (nem sempre, para não virar ruído)
    if (e.heavy && Math.random() < 0.45) this.sfx('ooh', { vol: 0.5, delay: 0.08 });
    if ((atk?.comboCount ?? 0) >= 4 && Math.random() < 0.5) this.sfx('cheer', { vol: 0.45 });
  }

  markLanded(f) {
    const w = f && this.watch.get(f);
    if (w) w.landedHit = f.hitId; // contato confirmado para o golpe atual (não toca whoosh de erro)
  }

  // ---------- observação por quadro (pulo, aterrissagem, queda, whoosh de golpe errado, barra cheia) ----------
  observe(match) {
    if (!match) return;
    if (match !== this.match) { this.match = match; this.watch.clear(); this.hitters.clear(); }
    for (const f of match.fighters) {
      let w = this.watch.get(f);
      if (!w) {
        w = { state: f.state, grounded: f.y <= 0, hitId: f.hitId, landedHit: -1, whooshed: true, full: f.meter >= METER_MAX };
        this.watch.set(f, w);
        continue;
      }
      const pan = panOf(f.x);
      const grounded = f.y <= 0;
      // novo golpe normal
      if (f.state === 'attack' && f.hitId !== w.hitId) {
        w.hitId = f.hitId; w.whooshed = false;
        this.voice(f, 'attack', { heavy: !!f.move?.heavy }); // esforço "rá!" (nem todo golpe)
      }
      if (f.state === 'attack' && f.move && !w.whooshed && f.t >= f.move.startup + f.move.active) {
        w.whooshed = true;
        if (w.landedHit !== f.hitId) this.sfx(f.move.heavy ? 'whooshHeavy' : 'whoosh', { pan, vol: 0.8 });
      }
      if (f.state !== w.state) {
        if (f.state === 'jump' && w.state !== 'attack' && w.grounded) { this.sfx('jump', { pan, vol: 0.7 }); this.voice(f, 'jump'); }
        if (f.state === 'down' && w.state === 'knockdown') this.sfx('fall', { pan });
      }
      if (grounded && !w.grounded) {
        if (f.state === 'ko') this.sfx('fall', { pan, vol: 1.1 });
        else if (f.state !== 'down' && f.state !== 'knockdown' && f.state !== 'held') this.sfx('land', { pan, vol: 0.6 });
      }
      const full = f.meter >= METER_MAX;
      if (full && !w.full) this.sfx('ultReady', { pan });
      w.full = full; w.state = f.state; w.grounded = grounded;
    }
    // projéteis / zonas: som quando a zona "cai" (carimbo, canetada)
    const alive = new Set();
    for (const h of match.hitters) {
      alive.add(h.id);
      let s = this.hitters.get(h.id);
      if (!s) {
        s = { armed: h.armed };
        this.hitters.set(h.id, s);
        const cue = HITTER_SPAWN[h.visual];
        if (cue) this.sfx(cue, { pan: panOf(h.x) });
      }
      if (!s.armed && h.armed) {
        s.armed = true;
        const cue = HITTER_ARMED[h.visual];
        if (cue) this.sfx(cue, { pan: panOf(h.x) });
      }
    }
    for (const id of this.hitters.keys()) if (!alive.has(id)) this.hitters.delete(id);
  }
}
