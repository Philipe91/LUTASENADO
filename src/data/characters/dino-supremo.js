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
      name: 'Meteoro Didático', kind: 'zone', startup: 16, recovery: 22, armor: true, cooldown: 270,
      atOpponent: true, delay: 30, activeFrames: 6, linger: 18, hits: 1,
      damage: 8, knockdown: true, push: 0.2, heavy: true,
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
    model: 'assets/characters/dino-supremo/model.glb',
    height: 1.8,
    yaw: 0,
    clips: {},
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
