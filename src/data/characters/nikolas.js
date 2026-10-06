// NIKOLAS / "NIKOLINHA" — rushdown troll: rápido, vida menor, barra enche provocando com selfie.
// Golpe meme: SELFIE DO DANO (flash + moldura de celular; PERFECT SELFIE se pegar o inimigo no meio do golpe).
const GUARDA = '01a0ef75-1fd9-7538-9154-0af77913ed07'; // guarda de boxe (GLB do Xandor)

export default {
  id: 'nikolas',
  name: 'NIKOLAS',
  title: 'O Nikolinha Viral',
  archetype: 'Rushdown / Troll',
  stats: { hp: 90, walk: 1.35, dash: 1.35, backdash: 1.2, jump: 1.1, gravity: 1.1, width: 0.72, height: 1.78, meterGain: 1.1 }, // rushdown/troll: o mais rápido, pulo curto e seco
  passive: {
    name: 'Engajamento',
    desc: 'Selfie do Dano sem tomar golpe enche a barra. Rápido, mas aguenta menos pancada.',
    engage: { dir: 'down', meter: 40, text: 'ENGAJOU!' },
  },
  moves: {},
  specials: {
    // CHUPETA TELEGUIADA: bumerangue rápido que corrige a altura; vai e volta (até 2 hits)
    neutral: {
      name: 'Chupeta Teleguiada', kind: 'projectile', startup: 9, recovery: 14, cooldown: 130,
      speed: 0.21, life: 70, turnAt: 22, homing: 0.025, hits: 2, rehit: 16, damage: 3.5, hitstun: 16, push: 0.08,
      box: { y: 0.9, w: 0.45, h: 0.45 }, visual: 'chupeta', color: 0x6ecbff, text: 'CHUPETA!',
    },
    // MAMADEIRA TURBO: mamadeira girando, hit médio e pesado; leite espirra ao acertar (visual)
    forward: {
      name: 'Mamadeira Turbo', kind: 'projectile', startup: 11, recovery: 18, cooldown: 170,
      speed: 0.24, life: 50, damage: 7, hitstun: 20, push: 0.18, heavy: true,
      box: { y: 0.7, w: 0.6, h: 0.6 }, visual: 'mamadeira', color: 0xfff5e6, text: 'MAMADEIRA!',
    },
    // SELFIE DO DANO (meme): levanta o celular → FLASH. Perto atordoa; no meio do golpe inimigo = PERFECT SELFIE
    down: {
      name: 'Selfie do Dano', kind: 'strike', startup: 8, active: 3, recovery: 18, cooldown: 140, screenFlash: 0.6,
      damage: 5, hitstun: 18, push: 0.12, box: { x: 0.1, y: 0.4, w: 1.5, h: 1.5 }, text: 'CLICK!',
      closeStun: { range: 1.3, stun: 22, text: 'CEGOU!' },
      counterBonus: { text: 'PERFECT SELFIE!', meter: 45, hit: { damage: 11, knockdown: true, push: 0.3, heavy: true, hitstop: 16, text: 'PERFECT SELFIE!' } },
    },
  },
  ultimate: { name: 'VIRALIZOU', hits: 6, interval: 12, damage: 3.5, finisher: 12, range: 4.5, text: '1 MILHÃO!' },
  ai: { aggression: 0.8, keepDistance: 1.3, specialBias: 0.4, throwBias: 0.12, blockChance: 0.3, jumpChance: 0.12 },
  lines: {
    intro: ['Olha o engajamento subindo!'],
    win: ['Isso vai dar 1 milhão de views!'],
  },
  koTexts: ['CANCELADO!'],
  visual: {
    model: 'assets/characters/nikolas/model.glb', // ainda não existe: placeholder entra sozinho
    height: 1.78,
    yaw: 0,
    // clips emprestados dos GLBs já rigados (entram quando o model.glb chegar)
    animations: ['assets/characters/xandor/model.glb', 'assets/characters/lulacio/model.glb'],
    clips: {
      idle: GUARDA, intro: 'Chest_Pound_Taunt', crouch: GUARDA, ultimate: 'Chest_Pound_Taunt',
      walk: 'Walk_Fight_Forward', walkBack: 'Walk_Fight_Back', jump: 'Regular_Jump',
      punch1: 'Left_Jab_from_Guard', punch2: 'Right_Jab_from_Guard', punch3: 'Right_Uppercut_from_Guard',
      crouchPunch: 'Left_Jab_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Grip_and_Throw_Down',
      kick: 'Simple_Kick', airKick: 'Simple_Kick', sweep: 'Sweep_Kick',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Face_Punch_Reaction', dizzy: 'Face_Punch_Reaction',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: 'Right_Jab_from_Guard', // chupeta (arremesso curto)
      special2: 'Heavy_Hammer_Swing',   // mamadeira (arremesso por cima)
      special3: 'Talk_Passionately',    // selfie (braço erguido)
      victory: 'Chest_Pound_Taunt',
    },
    // efeitos presos ao corpo: chupeta/mamadeira na mão até o arremesso; celular + flash + moldura na Selfie
    specialFx: {
      neutral: { type: 'propHand', visual: 'chupeta', hand: 'righthand' },
      forward: { type: 'propHand', visual: 'mamadeira', hand: 'righthand' },
      down: { type: 'selfie' },
    },
    ultimateFx: 'nikolasViral', // selfie → contadores 10K/100K/1M → overlays → parede de notificações
    transform: { standInScale: 1, tint: 0x3cc8ff, frameTop: 3.6 }, // sem GLB de transformação: ele continua ele mesmo (frameTop: contadores acima da cabeça)
    placeholder: { skin: 0xe9b995, suit: 0x1e2a6b, accent: 0x111111, hair: 0xf3dc6a, headScale: 1.3, girth: 0.82, longHair: true },
  },
};
