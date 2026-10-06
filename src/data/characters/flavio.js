// FLÁVIO / "FLAVÃO" — bruiser de impacto e pressão. Sátira absurda: tudo aqui é trocadilho visual/fantasia.
// Clips emprestados dos GLBs do Lulácio (brigão) e do Xandor até o model.glb próprio chegar.
const GUARDA = '01a0efe2-f57c-765f-996c-8b479826fa21'; // lula_guarda2 (GLB do Lulácio)

export default {
  id: 'flavio',
  name: 'FLAVÃO',
  title: 'O Herdeiro Sísmico',
  archetype: 'Bruiser / Impacto',
  stats: { hp: 100, walk: 0.95, jump: 0.95, width: 0.9, height: 1.85 },
  passive: {
    name: 'Clã',
    desc: 'Abaixo de 30% de vida o clã fecha em volta dele: toma 20% menos dano.',
    lowHp: { below: 0.3, defense: 0.8, text: 'CLÃ!' },
  },
  moves: {
    punch3: { push: 0.26 }, // martelada do bruiser empurra mais
  },
  specials: {
    // RACHADINHA SÍSMICA (meme): pisão → rachadura corre pelo chão (passa por baixo de projéteis) → ao chegar no
    // inimigo o chão EXPLODE: knock-up alto. A rachadura em si não machuca (caixa enterrada); quem bate é a erupção.
    neutral: {
      name: 'Rachadinha Sísmica', kind: 'projectile', startup: 14, recovery: 22, cooldown: 240, groundFx: 1.4,
      speed: 0.24, life: 64, damage: 0, triggerRange: 0.9,
      box: { y: -1, w: 0.3, h: 0.5 }, visual: 'crack', color: 0xd9a441,
      spawnOnEnd: {
        kind: 'eruption', back: 0, speed: 0, life: 30, activeUntil: 8, linger: true, hits: 1, // machuca só nos 8 primeiros frames; o resto é o visual terminando
        damage: 7, knockdown: true, launch: 0.3, push: 0.1, heavy: true, hitstop: 12,
        box: { y: 0, w: 1.4, h: 2.4 }, visual: 'eruption', color: 0xd9a441, text: 'RACHADINHA!',
      },
    },
    // ZERO UM: soco + clone holográfico "01" nasce 1,5 m à frente e repete o soco em sincronia → alcance dobrado
    forward: {
      name: 'Zero Um', kind: 'strike', startup: 10, active: 4, recovery: 20, cooldown: 180,
      damage: 5, hitstun: 18, push: 0.12, box: { x: 0.2, y: 0.9, w: 1.0, h: 0.6 }, text: 'ZERO UM!',
      clone: { at: 4, offset: 2.0, delay: 7, life: 22, anim: 'punch3', box: { x: 0.25, y: 0.85, w: 1.2, h: 0.65 }, hit: { damage: 6, hitstun: 20, push: 0.22, heavy: true, text: 'ZERO UM!' } },
    },
    // SENADOR EXPRESS: cadeira institucional com rodinhas entra embaixo dele e ele ATRAVESSA o inimigo em alta
    // velocidade (passThrough + dash até 1,8 m depois do alvo); 1 hit pesado que derruba.
    down: {
      name: 'Senador Express', kind: 'strike', startup: 8, active: 18, recovery: 22, cooldown: 230,
      passThrough: true, dash: { from: 6, to: 26, v: 0.3, past: 1.8 },
      damage: 7, knockdown: true, push: 0.1, heavy: true, blockstun: 16,
      box: { x: -0.3, y: 0, w: 1.3, h: 1.5 }, text: 'SENADOR EXPRESS!',
    },
  },
  // DINASTIA: sombras fictícias da "família" surgem atrás e repetem cada golpe; finaliza com Rachadinha ampliada
  ultimate: { name: 'DINASTIA', hits: 5, interval: 14, damage: 4, finisher: 14, range: 4, text: 'DINASTIA!' },
  ai: { aggression: 0.7, keepDistance: 1.5, specialBias: 0.4, throwBias: 0.2, blockChance: 0.3, jumpChance: 0.06 },
  lines: {
    intro: ['Isso aqui é coisa de família.'],
    win: ['Tá tudo em família. Próximo!'],
  },
  koTexts: ['RACHOU!'],
  visual: {
    model: 'assets/characters/flavio/model.glb', // ainda não existe → placeholder entra sozinho
    animations: ['assets/characters/lulacio/model.glb', 'assets/characters/xandor/model.glb'],
    height: 1.85,
    yaw: 0,
    // personalidade: brigão de clã — base larga e baixa, cotovelos abertos; entra pisando (Rachadinha)
    persona: {
      speed: { idle: 1.1, walk: 0.85, intro: 0.6 }, phase: 0.45,
      idle: { lean: 0.14, stance: 0.12, elbows: 0.15, crouch: 0.12, sway: [0.06, 0.9], breath: [0.04, 0.7] },
      walk: { lean: 0.1, swagger: 0.15, roll: 0.08, bob: 0.02, crouch: 0.1 },
      intro: { say: 'Coisa de família.' },
    },
    clips: {
      idle: GUARDA, intro: 'Angry_Ground_Stomp', crouch: GUARDA, // entrada: pisão (Rachadinha) em câmera lenta ultimate: 'Chest_Pound_Taunt',
      walk: 'Walk_Fight_Forward', walkBack: 'Walk_Fight_Back', jump: 'Jump_with_Arms_Open',
      punch1: 'Left_Hook_from_Guard', punch2: 'Right_Uppercut_from_Guard', punch3: 'Heavy_Hammer_Swing',
      crouchPunch: 'Left_Hook_from_Guard', airPunch: 'Heavy_Hammer_Swing', throw: 'Grip_and_Throw_Down',
      kick: 'Spartan_Kick', airKick: 'Spartan_Kick', sweep: 'Angry_Ground_Stomp',
      block: 'Block2', crouchBlock: 'Block2',
      hit: 'Hit_Reaction_to_Waist', dizzy: 'Hit_Reaction_to_Waist',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: 'Angry_Ground_Stomp', // Rachadinha Sísmica: pisão
      special2: 'Heavy_Hammer_Swing', // Zero Um: soco pesado (o clone repete)
      special3: 'Walk_Fight_Forward', // Senador Express: sentado na cadeira (o FX desenha a cadeira)
      victory: 'Chest_Pound_Taunt',
    },
    jumpScrub: { from: 0.3, to: 0.64 },
    timing: {
      punch1: { start: 0.08, contact: 0.333, activeEnd: 0.356, end: 0.6 },
      crouchPunch: { start: 0.08, contact: 0.333, activeEnd: 0.356, end: 0.6 },
      punch2: { start: 0.45, contact: 0.7, activeEnd: 0.8, end: 1.0 },
      punch3: { start: 1.1, contact: 1.4, activeEnd: 1.47, end: 1.833 },
      kick: { start: 0.362, contact: 0.693, activeEnd: 0.756, end: 0.897 },
      sweep: { start: 0.2, contact: 0.5, activeEnd: 0.6, end: 1.0 },
      special1: { start: 0.2, contact: 0.5, activeEnd: 0.6, end: 1.0 },
      special2: { start: 1.1, contact: 1.4, activeEnd: 1.47, end: 1.833 },
    },
    // efeitos presos ao corpo: pisão + rachadura inicial; holograma piscando na mão no Zero Um; cadeira no Senador Express
    specialFx: {
      neutral: { type: 'rachadinha' },
      forward: { type: 'zeroUm' },
      down: { type: 'cadeira' },
    },
    ultimateFx: 'flavioDinastia', // sombras da família atrás dele repetem os golpes; Rachadinha ampliada no final
    transform: { id: 'dinastia', height: 1.85, standInScale: 1.08, tint: 0x4fd07a, frameTop: 3.2 },
    placeholder: { skin: 0xe8b48f, suit: 0xf0c419, accent: 0x1f8a3c, pants: 0x2b3340, shirt: 0x1f8a3c, hair: 0x3a2a1e, headScale: 1.3, girth: 1.12, sidePart: true },
  },
};
