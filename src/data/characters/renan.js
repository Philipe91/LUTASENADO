// RENAN SANTOS — streamer polêmico / contra-ataque. Versão paródica de desenho animado da cultura de live/"corte"/
// "lacração" — pura fantasia de luta, nada aqui afirma fato ou crime. Golpe meme: LACRAÇÃO REVERSA (devolve projéteis).
const GUARDA = '01a0ef75-1fd9-7538-9154-0af77913ed07';
const INTIMACAO = '01a0ef6c-ccbe-7482-9941-fb408750d7e7'; // golpe rápido de braço (Xandor) → rebate

export default {
  id: 'renan',
  name: 'RENAN SANTOS',
  title: 'O Streamer do Caos',
  archetype: 'Contra-ataque / Streamer',
  stats: { hp: 102, walk: 1.12, dash: 1.15, backdash: 1.15, jump: 1.05, gravity: 1.0, width: 0.78, height: 1.8 }, // contra-ataque: ágil
  passive: {
    name: 'Corte Viral',
    desc: 'Combo de 3 hits vira "corte": +25% de velocidade por 2,5 s.',
    comboBuff: { every: 3, comboOnly: true, frames: 150, speed: 1.25, damage: 1.15, text: 'CORTE VIRAL!' },
  },
  moves: {},
  specials: {
    // LACRAÇÃO REVERSA (meme): tapa de microfone; projétil do rival que entra na frente volta pra ele (+40% dano) com
    // selo LACROU! — de perto também bate
    neutral: {
      name: 'Lacração Reversa', kind: 'strike', startup: 4, active: 18, recovery: 8, cooldown: 150,
      damage: 6, hitstun: 27, push: 0.15, box: { x: 0.1, y: 0.45, w: 1.0, h: 1.3 }, // +2 no acerto (antes −11: acertava e ainda apanhava)
      reflect: { box: { x: -0.2, y: 0, w: 1.9, h: 2.3 }, speed: 1.3, damage: 1.4, text: 'LACROU!' }, text: 'LACROU!',
    },
    // LIVE POLÊMICA: liga a live; o chat de comentários voa até o rival (3 hits) e o último ATORDOA
    forward: {
      name: 'Live Polêmica', kind: 'projectile', startup: 12, recovery: 18, cooldown: 200,
      speed: 0.13, life: 60, hits: 3, rehit: 7, damage: 1.5, hitstun: 12, push: 0.02,
      final: { damage: 2.5, hitstun: 10, stun: 34, push: 0.06, text: 'CHAT TÓXICO!' },
      box: { y: 0.55, w: 1.0, h: 1.4 }, visual: 'liveChat', color: 0x9146ff, text: 'AO VIVO!',
    },
    // DEBATE RELÂMPAGO: dash com o microfone; empurra longe com o balão TEXTÃO
    down: {
      name: 'Debate Relâmpago', kind: 'strike', startup: 6, active: 12, recovery: 14, cooldown: 190,
      dash: { from: 4, to: 16, v: 0.3 },
      damage: 9, hitstun: 22, push: 0.36, heavy: true, knockdown: true, launch: 0.12, box: { x: 0, y: 0.6, w: 1.1, h: 1.0 }, text: 'TEXTÃO!', // TEXTÃO derruba (antes −4 no acerto)
    },
  },
  // CANCELAMENTO EM MASSA: avalanche de hashtags, notificações e DISLIKE soterra o rival; finalizador trava os
  // especiais dele por 3 s (CANCELADO)
  ultimate: {
    name: 'CANCELAMENTO EM MASSA', hits: 6, interval: 12, damage: 3.2, finisher: 12, range: 6, text: 'CANCELADO!',
    finalHit: { lockSpecials: 180 },
  },
  ai: { aggression: 0.65, keepDistance: 1.8, specialBias: 0.45, throwBias: 0.12, blockChance: 0.5, jumpChance: 0.08 },
  lines: {
    intro: ['Tá gravando? Isso vai virar corte.'],
    win: ['Clipa isso aí, chat!', 'Lacrou? Lacrei de volta.'],
  },
  koTexts: ['CANCELADO!', 'DESMONETIZADO!'],
  visual: {
    model: 'assets/characters/renan/model.glb', // ainda não existe → placeholder entra sozinho
    height: 1.8,
    yaw: 0,
    animations: ['assets/characters/xandor/model.glb', 'assets/characters/lulacio/model.glb'],
    clips: {
      idle: GUARDA, intro: 'Talk_Passionately', crouch: GUARDA, ultimate: 'Chest_Pound_Taunt',
      walk: 'Walking', walkBack: 'Walking', jump: 'Regular_Jump',
      punch1: 'Left_Jab_from_Guard', punch2: 'Right_Uppercut_from_Guard', punch3: 'Punch_Forward_with_Both_Fists',
      crouchPunch: 'Left_Jab_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Grip_and_Throw_Down',
      kick: 'Simple_Kick', airKick: 'Spartan_Kick', sweep: 'Sweep_Kick',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Face_Punch_Reaction', dizzy: 'Face_Punch_Reaction',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: INTIMACAO,                       // tapa de microfone (rebate)
      special2: 'Talk_Passionately',             // live
      special3: 'Punch_Forward_with_Both_Fists', // debate (investida)
      victory: 'victory',
    },
    reverseKeys: ['walkBack'],
    specialFx: {
      neutral: { type: 'lacracao' },
      forward: { type: 'liveCam' },
      down: { type: 'textao' },
    },
    ultimateFx: 'renanCancelamento', // hashtags + notificações + DISLIKE soterram
    transform: { standInScale: 1, tint: 0x9146ff, frameTop: 4.4 },
    placeholder: { skin: 0xe8bf9c, suit: 0xf2f2f2, accent: 0x1b2a55, shirt: 0xf2f2f2, pants: 0x2a3550, hair: 0x2a1d14, headScale: 1.3, girth: 0.95, beard: true, headset: true },
  },
};
