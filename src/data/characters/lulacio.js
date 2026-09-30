// movimentos de IA exclusivos do Lulácio (Meshy Texto para Motion)
const GUARDA = '01a0efe2-f57c-765f-996c-8b479826fa21'; // lula_guarda2: brigão, punhos no peito, cotovelos abertos
const PICANHA = '01a0efe4-99e1-76ec-90af-8512dfe57528'; // lula_picanha: arremesso por cima do ombro

export default {
  id: 'lulacio',
  name: 'LULÁCIO',
  title: 'O Companheiro de Aço',
  archetype: 'Grappler / Brawler',
  stats: { hp: 100, walk: 0.9, jump: 0.95, width: 0.95, height: 1.72, meterGain: 1.3 },
  passive: {
    name: 'Carisma de Palanque',
    desc: 'Enche a barra 30% mais rápido. Abaixo de 30% de vida: +15% de dano.',
    lowHp: { below: 0.3, damage: 1.15 },
  },
  moves: {
    throw: { damage: 15 },
    // PISÃO (↓+chute): curto e pesado, em pé (hurtbox alta), hitbox só na frente do pé; derruba só quem está ali
    sweep: {
      startup: 13, active: 3, recovery: 22, crouch: false, groundFx: 1,
      hitbox: { x: 0.2, y: 0, w: 0.55, h: 0.3 },
    },
  },
  specials: {
    // DISCURSO: 3 pulsos de voz em cone (empurram pouco, prendem o alvo) → o ÚLTIMO atordoa (estrelinhas na cabeça)
    neutral: {
      name: 'Discurso Interminável', kind: 'strike', startup: 10, active: 30, recovery: 18, rehit: 10,
      damage: 2, hitstun: 14, push: 0.03, cooldown: 150,
      box: { x: 0.3, y: 0.5, w: 1.9, h: 1.3 },
      final: { damage: 4, stun: 55, push: 0.1, text: 'ATORDOADO!' },
    },
    // PICANHA DO POVO: picanha em arco → ao acertar / chegar perto / cair, vira uma onda de apoiadores
    forward: {
      name: 'Picanha do Povo', kind: 'projectile', startup: 12, recovery: 20, cooldown: 220,
      speed: 0.12, vy: 0.13, g: 0.0065, damage: 2, hitstun: 16, life: 60, triggerRange: 1.3, // arco mais alto e lento: dá pra ver voando
      box: { y: 1.1, w: 0.5, h: 0.35 }, visual: 'picanha', model: 'assets/props/picanha.glb',
      // ao acertar/chegar perto/cair: civis surgem ATRÁS do Lulácio e correm até passar do alvo
      spawnOnEnd: {
        kind: 'wave', anchor: 'owner', back: 1.8, overshoot: 2.5, maxLife: 150, speed: 0.13, hits: 4, rehit: 6,
        damage: 2.5, hitstun: 14, push: 0.05, final: { damage: 4, push: 0.28, knockdown: true, text: 'O POVO CHEGOU!' },
        box: { y: 0, w: 1.6, h: 1.6 }, visual: 'civilCrowd', color: 0xd62828,
      },
    },
    // ABRAÇO: agarra, gira 3 voltas com o alvo (acelerando) e arremessa longe
    down: {
      name: 'Abraço do Palanque', kind: 'grab', startup: 7, recovery: 26, cooldown: 160,
      range: 1.5, damage: 16, push: 0.24, text: 'ABRAÇO!', throwText: 'VOOU!',
      spin: { turns: 3, frames: 54, radius: 0.95 },
    },
  },
  ultimate: { name: 'O POLVÃO DO POVO', hits: 6, interval: 14, damage: 4, finisher: 12, range: 4.5, text: 'POLVÃO!' },
  ai: { aggression: 0.65, keepDistance: 1.3, specialBias: 0.35, throwBias: 0.3, blockChance: 0.35 },
  lines: {
    intro: ['Companheiros e companheiras... hoje vai ter porrada!'],
    win: ['Nunca antes na história desse ringue!'],
  },
  koTexts: ['COMPANHEIRADA!'],
  visual: {
    model: 'assets/characters/lulacio/model.glb',
    height: 1.72,
    yaw: 0,
    // Meshy v2 (punhos fechados na imagem de origem) — estilo BRIGÃO DE PALANQUE, diferente do Xandor
    clips: {
      idle: GUARDA, intro: 'Talk_Passionately', crouch: GUARDA, ultimate: 'Chest_Pound_Taunt',
      walk: 'Walk_Fight_Forward', walkBack: 'Walk_Fight_Back', jump: 'Jump_with_Arms_Open',
      punch1: 'Left_Hook_from_Guard', punch2: 'Right_Uppercut_from_Guard', punch3: 'Heavy_Hammer_Swing',
      crouchPunch: 'Left_Hook_from_Guard', airPunch: 'Heavy_Hammer_Swing', throw: 'Grip_and_Throw_Down',
      kick: 'Spartan_Kick', airKick: 'Spartan_Kick', sweep: 'Angry_Ground_Stomp',
      block: 'Block2', crouchBlock: 'Block2',
      hit: 'Hit_Reaction_to_Waist', dizzy: 'Hit_Reaction_to_Waist',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: 'Talk_Passionately', // Discurso Interminável
      special2: PICANHA, // Picanha do Povo
      special3: 'Grip_and_Throw_Down', // Abraço do Palanque
      victory: 'Chest_Pound_Taunt',
    },
    // pulo: fração do clip do impulso (0.3) até a aterrissagem (0.64), guiada pela física (subida/ápice/descida)
    jumpScrub: { from: 0.3, to: 0.64 },
    timing: {
      punch1: { start: 0.08, contact: 0.333, activeEnd: 0.356, end: 0.6 },
      crouchPunch: { start: 0.08, contact: 0.333, activeEnd: 0.356, end: 0.6 },
      punch2: { start: 0.45, contact: 0.7, activeEnd: 0.8, end: 1.0 },
      punch3: { start: 1.1, contact: 1.4, activeEnd: 1.47, end: 1.833 }, // martelada: braços na altura do peito (não no chão)
      kick: { start: 0.362, contact: 0.693, activeEnd: 0.756, end: 0.897 },
      sweep: { start: 0.2, contact: 0.5, activeEnd: 0.6, end: 1.0 },
      special2: { start: 0.2, contact: 0.95, activeEnd: 1.05, end: 1.9 }, // picanha: solta a mão no frame de spawn
      special1: { start: 1.0, contact: 1.6, activeEnd: 4.3, end: 5.2 },   // discurso: gesticula durante a janela ativa
      special3: { start: 0.4, contact: 1.2, activeEnd: 2.5, end: 3.6 },   // abraço: agarra → segura durante o giro → joga
    },
    // efeitos presos ao corpo: pulsos de voz no Discurso; picanha na mão até o arremesso
    specialFx: {
      neutral: { type: 'speech' },
      forward: { type: 'propHand', visual: 'picanha', hand: 'righthand' },
    },
    ultimateFx: 'lulacioPolvo', // PROTÓTIPO procedural (não arte final): polvo com chapéu, barba, gravata e microfone
    transform: { id: 'polvo', model: 'assets/characters/lulacio/ultimate.glb', height: 4.2, standInScale: 1, tint: 0x7a4fd6 },
    placeholder: { skin: 0xf0c8a0, suit: 0x1d3a8a, accent: 0xd62828, hair: 0xf2f2f2, headScale: 1.35, girth: 1.3, beard: true },
  },
};
