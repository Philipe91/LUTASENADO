// BOULOS — mobilização / zona. Versão paródica de desenho animado (acampamento, megafone, marcha, ato) — pura
// fantasia de luta, nada aqui afirma fato ou crime. Golpe meme: OCUPAÇÃO RELÂMPAGO (barraca brota embaixo do rival).
const GUARDA = '01a0efe2-f57c-765f-996c-8b479826fa21'; // guarda de brigão (Lulácio)

export default {
  id: 'boulos',
  name: 'BOULOS',
  title: 'O Mobilizador',
  archetype: 'Zona / Mobilização',
  stats: { hp: 112, walk: 1.0, dash: 1.05, backdash: 0.95, jump: 1.0, gravity: 1.0, width: 0.82, height: 1.82 }, // mobilização: avança
  passive: {
    name: 'Mobilização',
    desc: 'Perto do rival (até 2,2 m) a barra de Ultimate enche 25% mais rápido.',
    nearMeter: { radius: 2.2, mult: 1.25 },
  },
  moves: {},
  specials: {
    // OCUPAÇÃO RELÂMPAGO (meme): barraca de acampamento brota onde o rival está, com placa OCUPADO! — joga pra cima
    neutral: {
      name: 'Ocupação Relâmpago', kind: 'zone', atOpponent: true, startup: 12, recovery: 18, cooldown: 230,
      delay: 26, activeFrames: 8, linger: 30, damage: 6, knockdown: true, launch: 0.24, push: 0.05, heavy: true,
      box: { y: 0, w: 1.3, h: 2.0 }, visual: 'barraca', color: 0xe84b2a, text: 'OCUPADO!',
    },
    // MEGAFONE DO ATO: cone de onda sonora na frente (2,7 m) — 3 pulsos; o último empurra longe
    forward: {
      name: 'Megafone do Ato', kind: 'strike', startup: 10, active: 18, rehit: 6, recovery: 13, cooldown: 140,
      damage: 1.8, hitstun: 12, push: 0.12, final: { damage: 3, hitstun: 22, push: 0.42, text: 'ATO!' },
      box: { x: 0.3, y: 0.45, w: 2.4, h: 1.35 }, text: 'MEGAFONE!',
    },
    // MARCHA: avança com faixa e bandeiras, multidão fictícia atrás (dash com armadura: aguenta 1 golpe)
    down: {
      name: 'Marcha', kind: 'strike', startup: 8, active: 22, rehit: 11, recovery: 18, cooldown: 240, armor: true,
      dash: { from: 6, to: 28, v: 0.2 },
      damage: 3.5, hitstun: 16, push: 0.05, final: { damage: 5, knockdown: true, push: 0.3, heavy: true, text: 'MARCHOU!' },
      box: { x: -0.1, y: 0, w: 1.3, h: 1.8 }, text: 'MARCHA!',
    },
  },
  // ATO GIGANTE: multidão com barracas e faixas toma a arena e "despeja" o rival pra fora do quadro
  ultimate: { name: 'ATO GIGANTE', hits: 5, interval: 14, damage: 4, finisher: 13, range: 5, push: 0.6, text: 'DESPEJADO!' },
  ai: { aggression: 0.6, keepDistance: 1.8, specialBias: 0.45, throwBias: 0.15, blockChance: 0.4, jumpChance: 0.06 },
  lines: {
    intro: ['O ringue é de quem luta nele!'],
    win: ['Ocupamos a vitória!', 'O ato foi um sucesso. Ninguém se machucou. Só você.'],
  },
  koTexts: ['DESPEJADO!', 'OCUPADO!'],
  visual: {
    model: 'assets/characters/boulos/model.glb', // ainda não existe → placeholder entra sozinho
    height: 1.82,
    yaw: 0,
    animations: ['assets/characters/lulacio/model.glb', 'assets/characters/xandor/model.glb'],
    clips: {
      idle: GUARDA, intro: 'Chest_Pound_Taunt', crouch: GUARDA, ultimate: 'Chest_Pound_Taunt',
      walk: 'Walk_Fight_Forward', walkBack: 'Walk_Fight_Back', jump: 'Jump_with_Arms_Open',
      punch1: 'Left_Hook_from_Guard', punch2: 'Right_Uppercut_from_Guard', punch3: 'Heavy_Hammer_Swing',
      crouchPunch: 'Left_Hook_from_Guard', airPunch: 'Heavy_Hammer_Swing', throw: 'Grip_and_Throw_Down',
      kick: 'Spartan_Kick', airKick: 'Spartan_Kick', sweep: 'Angry_Ground_Stomp',
      block: 'Block2', crouchBlock: 'Block2',
      hit: 'Hit_Reaction_to_Waist', dizzy: 'Hit_Reaction_to_Waist',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: 'Angry_Ground_Stomp', // pisa → barraca brota
      special2: 'Talk_Passionately',  // megafone
      special3: 'Running',            // marcha
      victory: 'Chest_Pound_Taunt',
    },
    specialFx: {
      forward: { type: 'megafone' },
      down: { type: 'marcha' },
    },
    ultimateFx: 'boulosAto', // multidão + barracas + faixas varrem a arena
    transform: { standInScale: 1, tint: 0xe84b2a, frameTop: 4.0 },
    placeholder: { skin: 0xe6bc98, suit: 0x3a4a3a, accent: 0xd6332a, shirt: 0xd6332a, pants: 0x2b3550, hair: 0x2a1e16, headScale: 1.3, girth: 1.0, beard: true },
  },
};
