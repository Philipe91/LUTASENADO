export default {
  id: 'dino-supremo',
  name: 'DINO SUPREMO',
  title: 'O Jurássico Togado',
  archetype: 'Tank / Bruiser',
  stats: { hp: 115, walk: 0.72, jump: 0.85, width: 1.1, height: 1.8, damage: 1.0, defense: 0.95 },
  passive: {
    name: 'Couro Jurássico',
    desc: 'Toma 5% menos dano. Chute, soco forte e especiais aguentam 1 golpe sem parar.',
  },
  moves: { kick: { armor: true }, punch3: { armor: true } },
  specials: {
    neutral: {
      name: 'Rugido Togado', kind: 'strike', startup: 14, active: 10, recovery: 20,
      damage: 7, hitstun: 10, stun: 30, push: 0.3, armor: true, cooldown: 170,
      box: { x: -0.2, y: 0.3, w: 2.4, h: 1.6 }, text: 'ROAAAR!',
    },
    // METEORO: joga o Vade Mecum pro céu; uma SOMBRA marca onde o alvo estava e, 30 frames depois, o livro cai em
    // chamas ali (zona: dá pra sair de baixo). 1 hit forte, derruba.
    forward: {
      name: 'Meteoro Didático', kind: 'zone', startup: 16, recovery: 22, armor: true, cooldown: 300,
      atOpponent: true, delay: 30, activeFrames: 6, linger: 18, hits: 1,
      damage: 7, knockdown: true, push: 0.2, heavy: true,
      box: { y: 0, w: 1.3, h: 1.6 }, visual: 'meteor', color: 0xff7a1a, text: 'METEORO!',
    },
    // PISÃO: pisada que treme a tela (groundFx) e solta uma onda de terra rasteira (tem que pular)
    down: {
      name: 'Pisão Cretáceo', kind: 'projectile', startup: 16, recovery: 22, armor: true, cooldown: 170, groundFx: 1.6,
      speed: 0.14, damage: 6, knockdown: true, level: 'low', life: 60,
      box: { y: 0, w: 0.9, h: 0.4 }, visual: 'quake', color: 0x8a6a3a, text: 'PISÃO!',
    },
  },
  ultimate: { name: 'T-REX DE TERNO', hits: 4, interval: 20, damage: 6, finisher: 16, range: 4, text: 'EXTINÇÃO!' },
  ai: { aggression: 0.55, keepDistance: 1.6, specialBias: 0.35, throwBias: 0.2, blockChance: 0.3, jumpChance: 0.04 },
  lines: {
    intro: ['Vamos à aula de hoje: extinção.'],
    win: ['Extinção decretada. Próximo!'],
  },
  koTexts: ['EXTINTO!'],
  visual: {
    model: 'assets/characters/dino-supremo/model.glb', // Meshy v2 (de toga), rig 02/10
    height: 1.8,
    yaw: 0,
    // estilo tank: base larga de brigão, martelada, pisão, chute frontal pesado (Walking próprio do GLB, lento)
    animations: ['assets/characters/lulacio/model.glb', 'assets/characters/xandor/model.glb'],
    // personalidade: professor jurássico — curvado e lento, apoiado na bengala; vitória erguendo o Vade Mecum
    persona: {
      speed: { idle: 0.55, walk: 0.75 }, phase: 0.75,
      idle: { lean: 0.2, head: -0.15, breath: [0.04, 0.3], sway: [0.03, 0.3], stance: 0.08, guard: -0.1 },
      walk: { lean: 0.18, head: -0.12, roll: 0.08, bob: 0.03 },
      intro: { gesture: 'cane', say: 'Aula de hoje: extinção.' },
      victory: { gesture: 'raiseBook' },
    },
    clips: {
      idle: '01a0ef76-3fa8-73be-8e95-94acb4b40424', intro: '01a0ef76-3fa8-73be-8e95-94acb4b40424', crouch: '01a0efe2-f57c-765f-996c-8b479826fa21', // idle: guarda fechada (IA, GLB do Xandor), curvada pela persona
      walk: 'Walking', walkBack: 'Walking', jump: 'Jump_with_Arms_Open',
      punch1: 'Left_Hook_from_Guard', punch2: 'Right_Uppercut_from_Guard', punch3: 'Heavy_Hammer_Swing',
      crouchPunch: 'Left_Hook_from_Guard', airPunch: 'Heavy_Hammer_Swing', throw: 'Grip_and_Throw_Down',
      kick: 'Spartan_Kick', airKick: 'Spartan_Kick', sweep: 'Angry_Ground_Stomp',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Hit_Reaction_to_Waist', dizzy: 'Hit_Reaction_to_Waist',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: 'Chest_Pound_Taunt', // Rugido Togado
      special2: '01a0efe4-99e1-76ec-90af-8512dfe57528', // Meteoro Didático: arremesso por cima do ombro
      special3: 'Angry_Ground_Stomp', // Pisão Cretáceo
      ultimate: 'Chest_Pound_Taunt', victory: 'Talk_Passionately',
    },
    reverseKeys: ['walkBack'],
    jumpScrub: { from: 0.3, to: 0.64 },
    timing: {
      punch1: { start: 0.08, contact: 0.333, activeEnd: 0.356, end: 0.6 },
      crouchPunch: { start: 0.08, contact: 0.333, activeEnd: 0.356, end: 0.6 },
      punch2: { start: 0.45, contact: 0.7, activeEnd: 0.8, end: 1.0 },
      punch3: { start: 1.1, contact: 1.4, activeEnd: 1.47, end: 1.833 },
      kick: { start: 0.362, contact: 0.693, activeEnd: 0.756, end: 0.897 },
      sweep: { start: 0.2, contact: 0.5, activeEnd: 0.6, end: 1.0 },
    },
    // efeitos presos ao corpo: bocarra + ondas no Rugido; Vade Mecum voando pro céu no Meteoro; rachadura no Pisão
    specialFx: {
      neutral: { type: 'roar' },
      forward: { type: 'throwUp' },
      down: { type: 'stomp' },
    },
    ultimateFx: 'dinoTrex', // óculos crescem, botões voam → T-Rex de terno procedural (mordida, rabada, pisão, meteoro final)
    transform: { id: 'trex', model: 'assets/characters/dino-supremo/ultimate.glb', height: 4.0, standInScale: 1, tint: 0x4d7a3a, frameTop: 4.8 },
    placeholder: { skin: 0xe6b58e, suit: 0x55595f, accent: 0x4f6b3a, hair: 0xb9b9b9, headScale: 1.3, girth: 1.5, glasses: true },
  },
};
