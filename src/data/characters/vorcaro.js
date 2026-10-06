// VORCARO / "VORCASH" — summoner / recursos / assist. Versão paródica e absurda (sátira de fantasia: nada aqui
// representa compra, suborno ou fato real — a maleta é um "portal mágico de contatos" de desenho animado).
// Passiva LIQUIDEZ: todo dano causado enche a barra de CAPITAL (HUD: medidor $ sob a barra de ultimate).
// Especiais com `capital` gastam CAPITAL e batem mais forte (Fighter.boostSpecial).
const XANDOR_GUARDA = '01a0ef75-1fd9-7538-9154-0af77913ed07';
const LULA_ARREMESSO = '01a0efe4-99e1-76ec-90af-8512dfe57528'; // arremesso por cima do ombro (maleta)
const XANDOR_INTIMACAO = '01a0ef6c-ccbe-7482-9941-fb408750d7e7'; // lançamento rápido (moeda)

export default {
  id: 'vorcaro',
  name: 'VORCASH',
  title: 'O Banqueiro do Caos',
  archetype: 'Summoner / Recursos',
  stats: { hp: 100, walk: 0.88, dash: 0.85, backdash: 1.0, jump: 0.9, gravity: 1.0, width: 0.95, height: 1.85, damage: 1.0 }, // summoner: lento, joga de longe
  passive: {
    name: 'Liquidez',
    desc: 'Todo dano causado enche a barra de CAPITAL. Especiais gastam CAPITAL para bater até +35% mais forte.',
    resource: { name: 'CAPITAL', max: 100, perDamage: 1.6 },
  },
  moves: {},
  specials: {
    // MALETA VOADORA: arremessa a maleta em arco; ao acertar (ou cair no chão) ela PARA e abre — notas voam
    neutral: {
      name: 'Maleta Voadora', kind: 'projectile', startup: 13, recovery: 20, cooldown: 200,
      speed: 0.15, vy: 0.05, g: 0.003, life: 75, damage: 4.5, hitstun: 20, push: 0.14,
      linger: true, stopOnHit: 22, stopOnGround: 18,
      box: { y: 1.0, w: 0.6, h: 0.5 }, visual: 'maleta', text: 'LIQUIDEZ!',
      capital: { cost: 40, damage: 0.35 },
    },
    // JUROS COMPOSTOS: moedinha que quica 3× crescendo a cada quique; quanto mais longe acertar, mais dano
    forward: {
      name: 'Juros Compostos', kind: 'projectile', startup: 11, recovery: 20, cooldown: 200,
      speed: 0.12, vy: 0.09, g: 0.009, bounces: 3, bounceV: 0.1, grow: 1.32, life: 110,
      damage: 2, distDamage: { per: 1.0, max: 6 }, hitstun: 18, push: 0.12,
      box: { y: 0.3, w: 0.34, h: 0.34 }, visual: 'juros', text: 'JUROS!',
      capital: { cost: 35, damage: 0.35 },
    },
    // MALA DE CONTATOS (golpe meme): joga a maleta no chão, ela abre e saem versões paródicas de Flavão, Xandor
    // e Nikolas — 1 golpe cada, em sequência (combo), e somem. Vorcaro fica livre enquanto eles batem.
    down: {
      name: 'Mala de Contatos', kind: 'summon', startup: 16, recovery: 26, cooldown: 480,
      shout: 'TENHO CONTATOS!', dist: 1.3, life: 118, visual: 'malaContatos',
      capital: { cost: 45, damage: 0.35 },
      assists: [
        { who: 'flavio', delay: 12, enter: 13, active: 4, exit: 12, stand: 0.85, hop: 0.7, anim: 'special1', fx: 'crack',
          damage: 4, hitstun: 30, push: 0.05, level: 'low', box: { x: 0, w: 1.3, h: 0.9 }, text: 'RACHADINHA!' },
        { who: 'xandor', delay: 34, enter: 13, active: 4, exit: 12, stand: 0.9, hop: 0.9, anim: 'special3', fx: 'stamp',
          damage: 4.5, hitstun: 30, push: 0.05, lockSpecials: 90, box: { x: 0, w: 1.2, h: 2.0 }, text: 'BLOQUEADO!' },
        { who: 'nikolas', delay: 56, enter: 12, active: 4, exit: 14, stand: 0.95, hop: 0.6, anim: 'special3', fx: 'selfie',
          damage: 5.5, knockdown: true, push: 0.22, heavy: true, box: { x: 0, w: 1.3, h: 1.9 }, text: 'SELFIE DO DANO!' },
      ],
    },
  },
  ultimate: { name: 'CAPITAL INFINITO', hits: 6, interval: 12, damage: 3, finisher: 12, range: 6.5, text: 'FALIU!' },
  ai: { aggression: 0.5, keepDistance: 2.4, specialBias: 0.5, throwBias: 0.12, blockChance: 0.42, jumpChance: 0.05 },
  lines: {
    intro: ['Tudo tem um preço. O seu é baixo.'],
    win: ['Lucro líquido. Próximo cliente!', 'Rendeu bem essa luta.'],
  },
  koTexts: ['FALIDO!', 'SEM FUNDOS!'],
  visual: {
    model: 'assets/characters/vorcaro/model.glb', // ainda não existe → placeholder; quando o GLB chegar entra sozinho
    height: 1.85,
    yaw: 0,
    animations: ['assets/characters/xandor/model.glb', 'assets/characters/lulacio/model.glb'],
    clips: {
      idle: XANDOR_GUARDA, intro: 'Talk_Passionately', crouch: XANDOR_GUARDA,
      walk: 'Walk_Fight_Forward', walkBack: 'Walk_Fight_Back', jump: 'Regular_Jump',
      punch1: 'Left_Jab_from_Guard', punch2: 'Right_Jab_from_Guard', punch3: 'Heavy_Hammer_Swing',
      crouchPunch: 'Left_Jab_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Grip_and_Throw_Down',
      kick: 'Simple_Kick', airKick: 'Simple_Kick', sweep: 'Sweep_Kick',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Face_Punch_Reaction', dizzy: 'Face_Punch_Reaction',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: LULA_ARREMESSO, special2: XANDOR_INTIMACAO, special3: 'Grip_and_Throw_Down',
      ultimate: 'Chest_Pound_Taunt', victory: 'Chest_Pound_Taunt',
    },
    // efeitos presos ao corpo: maleta na mão (Maleta Voadora / Mala de Contatos), moeda no polegar (Juros)
    specialFx: {
      neutral: { type: 'caseHand' },
      forward: { type: 'coinFlick' },
      down: { type: 'caseHand', big: true },
    },
    ultimateFx: 'vorcaroCapital', // maleta-portal no céu → chuva de moedas/cartões/maletas/gráficos → soterra → SALDO: 0
    transform: { id: 'capital', standInScale: 1, tint: 0x8a6a10, frameTop: 4.6 }, // sem forma nova: só enquadra a maleta no céu
    // aparência dos ajudantes da Mala de Contatos quando o personagem ainda não está no elenco.
    // Se existir CharacterData com esse id (ex.: 'flavio'), o visual usa o dele; o GLB entra sozinho quando existir.
    assistLooks: {
      flavio: {
        name: 'FLAVÃO', height: 1.85, model: 'assets/characters/flavio/model.glb',
        placeholder: { skin: 0xf0c4a0, suit: 0xffd400, pants: 0x1fa34a, accent: 0x1fa34a, shirt: 0xffd400, hair: 0x2a2018, headScale: 1.3, girth: 1.25 },
      },
      nikolas: {
        name: 'NIKOLAS', height: 1.8, model: 'assets/characters/nikolas/model.glb',
        placeholder: { skin: 0xf3cfb0, suit: 0x1f4fb8, accent: 0x0d1a3a, hair: 0xf0d878, headScale: 1.3, girth: 0.82 },
      },
    },
    placeholder: { skin: 0xe2ad88, suit: 0x1b2444, accent: 0x4a6fc4, hair: 0x5a3a22, headScale: 1.3, girth: 1.35, beard: true },
  },
};
