const GUARDA = '01a0ef75-1fd9-7538-9154-0af77913ed07'; // movimento de IA "guarda"

export default {
  id: 'xandor',
  name: 'XANDOR',
  title: 'O Magistrado Supremo',
  archetype: 'Zoner / Controle',
  stats: { hp: 100, walk: 0.85, jump: 0.95, width: 0.8, height: 1.95 },
  passive: {
    name: 'Jurisdição',
    desc: 'Inimigo dentro do círculo ao redor dele enche a barra 30% mais devagar.',
    aura: { radius: 3.2, enemyMeterMult: 0.7 },
  },
  moves: {},
  specials: {
    neutral: {
      name: 'Intimação', kind: 'projectile', startup: 12, recovery: 18, cooldown: 150,
      speed: 0.16, damage: 4, hitstun: 18, pull: true, life: 70,
      box: { y: 1.0, w: 0.5, h: 0.4 }, visual: 'paper', color: 0xfaf6e8, text: 'INTIMADO!',
    },
    forward: {
      name: 'BLOQUEADO', kind: 'zone', atOpponent: true, startup: 14, recovery: 20, cooldown: 300,
      delay: 28, activeFrames: 6, damage: 6, hitstun: 20, lockSpecials: 240,
      box: { y: 0, w: 1.1, h: 2.0 }, visual: 'stamp', color: 0xd62828, text: 'BLOQUEADO!',
    },
    down: {
      name: 'Canetada', kind: 'zone', atOpponent: true, startup: 10, recovery: 16, cooldown: 180,
      delay: 36, activeFrames: 10, damage: 9, knockdown: true, push: 0.12,
      box: { y: 0, w: 0.8, h: 2.2 }, visual: 'pen', color: 0x1a1a1a, text: 'CANETADA!',
    },
  },
  ultimate: { name: 'AVATAR DA CONSTITUIÇÃO', hits: 5, interval: 16, damage: 5, finisher: 13, range: 6, text: 'SENTENÇA: DERROTA' },
  ai: { aggression: 0.3, keepDistance: 4, specialBias: 0.6, throwBias: 0.1, blockChance: 0.5 },
  lines: {
    intro: ['Isso não vai ficar assim.'],
    win: ['Caso encerrado. Arquive-se.'],
  },
  koTexts: ['SEM RECURSO!'],
  visual: {
    model: 'assets/characters/xandor/model.glb',
    height: 1.95,
    yaw: 0,
    // Meshy v4 (rig refeito: joelho abaixo da barra da toga, queixo no queixo) → chaves do jogo
    // movimentos de IA (Texto para Motion) vêm com o UUID como nome
    clips: {
      idle: GUARDA, intro: GUARDA, crouch: GUARDA,
      walk: 'Walking', walkBack: 'Walking', // andar original do Meshy (andar pra trás = mesmo clip de ré)
      jump: 'Regular_Jump',
      punch1: 'Left_Jab_from_Guard', punch2: 'Right_Jab_from_Guard', punch3: 'Punch_Forward_with_Both_Fists',
      crouchPunch: 'Left_Jab_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Punch_Forward_with_Both_Fists',
      kick: 'Simple_Kick', airKick: 'Simple_Kick', sweep: 'Sweep_Kick',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Face_Punch_Reaction', dizzy: 'Face_Punch_Reaction',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: '01a0ef6c-ccbe-7482-9941-fb408750d7e7', // intimação
      special2: '01a0ef6e-b376-7542-a92c-3e0c3d5c445a', // bloqueado
      special3: '01a0ef6f-f255-734e-b234-53a83134aa3d', // canetada
      ultimate: GUARDA, victory: 'victory',
    },
    reverseKeys: ['walkBack'],
    // contato sincronizado: segundos do clip (tools/_measure.mjs)
    timing: {
      punch1: { start: 0.292, contact: 0.467, activeEnd: 0.603, end: 1.108 },
      crouchPunch: { start: 0.292, contact: 0.467, activeEnd: 0.603, end: 1.108 },
      punch2: { start: 0.4, contact: 0.644, activeEnd: 0.711, end: 0.956 },
      punch3: { start: 0.622, contact: 0.894, activeEnd: 0.933, end: 1.128 },
      kick: { start: 0.544, contact: 0.933, activeEnd: 1.037, end: 1.659 },
      sweep: { start: 0.36, contact: 1.347, activeEnd: 1.392, end: 1.617 },
    },
    // correção de identidade (G-009/C-011): a guarda de IA tapava o rosto com a mão direita e afundava a cabeça.
    // Camada idempotente por cima do clip: tira a mão do queixo (antebraço) e ergue um pouco pescoço/cabeça.
    poseFix: {
      keys: ['idle', 'intro', 'crouch', 'ultimate'],
      rots: [
        { bone: 'neck', axis: [1, 0, 0], ang: -0.12 },
        { bone: 'head', axis: [1, 0, 0], ang: -0.08 },
        { bone: 'rightforearm', axis: [0, 0, 1], ang: -0.6 },
      ],
    },
    // robeFix DESLIGADO: nunca esteve ativo (bug de nome de osso "right…"→"ht…") e, ativo, prende as mãos ao quadril.
    // O Xandor foi aprovado sem ele (rig v5 resolveu as pernas).
    transform: { id: 'avatar', model: 'assets/characters/xandor/ultimate.glb', height: 3.6, standInScale: 1.6, tint: 0xffd36b },
    placeholder: { skin: 0xe8b894, suit: 0x121212, accent: 0xd4af37, hair: 0x121212, headScale: 1.35, girth: 1.05, bald: true, angryBrows: true, robe: true },
  },
};
