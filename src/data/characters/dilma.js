// DILMA — zoner confusa ("dilmês"). Versão paródica de memes/gafes PÚBLICAS (estocar vento, saudação à mandioca,
// "dobrar a meta", cachorro atrás da criança) — pura fantasia de desenho animado, nada aqui afirma fato ou crime.
// Golpe meme: ESTOCAR VENTO (segura o especial para "estocar" vento num pote; a rajada cresce com a carga).
const GUARDA = '01a0fff6-26a6-7504-b92e-9ff1b071c1ce'; // dilma_guarda (Texto para Motion, GLB próprio)
const VENTO = '01a0fff7-85b5-7639-9251-7699f213fbf0';  // dilma_vento: junta o ar e empurra com as duas mãos
const ARREMESSO = '01a0efe4-99e1-76ec-90af-8512dfe57528'; // arremesso por cima do ombro (GLB do Lulácio)

export default {
  id: 'dilma',
  name: 'DILMA',
  title: 'A Estocadora de Vento',
  archetype: 'Zoner / Confusa',
  stats: { hp: 100, walk: 0.92, dash: 0.95, backdash: 1.2, jump: 0.95, gravity: 0.9, width: 0.8, height: 1.68 }, // zoner: recuo bom, flutua
  passive: {
    name: 'Dobrar a Meta',
    desc: 'Acertar um especial deixa o PRÓXIMO especial com dano dobrado (uma vez).',
    doubleNext: { mult: 2, armText: 'META BATIDA!', text: 'DOBROU A META!' },
  },
  moves: {},
  specials: {
    // ESTOCAR VENTO (meme): abre o pote e "estoca" vento enquanto segura; solta uma rajada que empurra.
    // charge: até 50 frames segurando → até +80% de dano, +70% de tamanho e mais empurrão
    neutral: {
      name: 'Estocar Vento', kind: 'projectile', startup: 14, recovery: 20, cooldown: 170,
      speed: 0.15, life: 70, damage: 4.5, hitstun: 18, push: 0.2,
      charge: { max: 50, damage: 0.8, grow: 0.7, push: 0.16, text: 'VENTO ESTOCADO!' },
      box: { y: 0.55, w: 0.75, h: 0.95 }, visual: 'ventoEstocado', color: 0xbfe8ff, text: 'ESTOCOU!',
    },
    // SAUDAÇÃO À MANDIOCA: mandioca gigante girando que vai e volta (bumerangue, até 2 hits)
    forward: {
      name: 'Saudação à Mandioca', kind: 'projectile', startup: 11, recovery: 18, cooldown: 180,
      speed: 0.17, life: 80, turnAt: 26, hits: 2, rehit: 16, damage: 3, hitstun: 16, push: 0.08,
      box: { y: 0.8, w: 0.85, h: 0.5 }, visual: 'mandioca', color: 0xc98b4a, text: 'MANDIOCADA!',
    },
    // PEDALADA FISCAL: monta na bicicleta e atropela pedalando (dash multi-hit, 3 hits; o último derruba)
    down: {
      name: 'Pedalada Fiscal', kind: 'strike', startup: 8, active: 24, recovery: 20, cooldown: 230, rehit: 8,
      dash: { from: 6, to: 30, v: 0.22 },
      damage: 2.5, hitstun: 14, push: 0.04, final: { damage: 3.5, knockdown: true, push: 0.25, text: 'PEDALADA!' },
      box: { x: -0.2, y: 0, w: 1.4, h: 1.4 }, text: 'PEDALOU!',
    },
  },
  // DILMÊS TOTAL: balões de frases embaralhadas cercam o rival; o finalizador (mandioca colossal) não derruba:
  // deixa o rival CONFUSO (esquerda/direita invertidas por 2,5 s)
  ultimate: {
    name: 'DILMÊS TOTAL', hits: 5, interval: 14, damage: 3.5, finisher: 12, range: 5.5, text: 'DILMÊS TOTAL!',
    finalHit: { knockdown: false, hitstun: 34, push: 0.18, invert: 150, invertText: 'CONFUSO!' },
  },
  ai: { aggression: 0.4, keepDistance: 3.2, specialBias: 0.55, throwBias: 0.1, blockChance: 0.45, jumpChance: 0.06 },
  lines: {
    intro: ['Não vamos colocar meta. Quando atingir a meta, a gente dobra a meta.'],
    win: ['Eu saúdo a vitória. E saúdo a mandioca.', 'Atrás de toda luta tem um cachorro.'],
  },
  koTexts: ['ESTOCADO!', 'META DOBRADA!'],
  visual: {
    model: 'assets/characters/dilma/model.glb', // ainda não existe → placeholder; quando o GLB chegar entra sozinho
    height: 1.68,
    yaw: 0,
    animations: ['assets/characters/xandor/model.glb', 'assets/characters/lulacio/model.glb'],
    clips: {
      idle: GUARDA, intro: 'Talk_Passionately', crouch: GUARDA, ultimate: 'Talk_Passionately',
      walk: 'Walking', walkBack: 'Walking', jump: 'Regular_Jump',
      punch1: 'Left_Hook_from_Guard', punch2: 'Right_Jab_from_Guard', punch3: 'Heavy_Hammer_Swing',
      crouchPunch: 'Left_Hook_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Grip_and_Throw_Down',
      kick: 'Simple_Kick', airKick: 'Simple_Kick', sweep: 'Sweep_Kick',
      block: 'Block2', crouchBlock: 'Block2',
      hit: 'Hit_Reaction_to_Waist', dizzy: 'Hit_Reaction_to_Waist',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: VENTO, // estocar vento (gesto próprio gerado no Meshy)
      special2: ARREMESSO,           // mandioca (arremesso por cima)
      special3: 'Running',           // pedalada
      victory: 'Chest_Pound_Taunt',
    },
    reverseKeys: ['walkBack'],
    specialFx: {
      neutral: { type: 'potVento' },
      forward: { type: 'propHand', visual: 'mandioca', hand: 'righthand' },
      down: { type: 'pedalada' },
    },
    ultimateFx: 'dilmaDilmes', // balões embaralhados + cachorro atrás da criança + mandioca colossal
    transform: { standInScale: 1, tint: 0xff3b3b, frameTop: 4.2 },
    placeholder: { skin: 0xf0c8a8, suit: 0xc81e1e, accent: 0xc81e1e, shirt: 0xf3e6d6, pants: 0x2a2a2a, hair: 0x8a3c22, headScale: 1.3, girth: 1.12 },
  },
};
