export default {
  id: 'capitao-brasa',
  name: 'CAPITÃO BRASA',
  title: 'O Motociclista do Caos',
  archetype: 'Rushdown / Pressão',
  stats: { hp: 100, walk: 1.3, jump: 1.05, width: 0.75, height: 1.85, damage: 1.1 },
  // TÁ OK: defesa PERFEITA = começar a segurar pra trás no máximo `window` frames antes do golpe chegar.
  // Prêmio: sem dano de raspão, sai do blockstun 4 frames antes e ganha +10% velocidade/dano por 2s (brilho verde).
  passive: {
    name: 'Tá OK',
    desc: 'Defesa perfeita (defender no último instante): TÁ OK! +10% velocidade e dano por 2s.',
    perfectBlock: { window: 8, frames: 120, speed: 1.1, damage: 1.1, stunCut: 4, text: 'TÁ OK!' },
  },
  moves: {},
  specials: {
    // ARMINHA DE ENERGIA: aponta o dedo (clip de jab) e sai um tiro de energia verde-amarelo arcade. Curto (≈6 m) e rápido.
    neutral: {
      name: 'Arminha de Energia', kind: 'projectile', anim: 'punch1', startup: 10, recovery: 20, cooldown: 190,
      speed: 0.3, life: 18, damage: 3, hitstun: 12, blockstun: 9, push: 0.1,
      box: { y: 1.12, w: 0.55, h: 0.36 }, visual: 'energyShot', text: 'PÁ!',
    },
    forward: {
      name: 'Motociata', kind: 'strike', startup: 10, active: 24, recovery: 18, rehit: 9, lunge: 0.27, // arrancada forte: ≈6,5 m
      damage: 2.6, hitstun: 16, push: 0.1, cooldown: 200,
      box: { x: -0.2, y: 0, w: 1.2, h: 1.3 }, text: 'MOTOCIATA!',
    },
    // PATRIOTA NO PARA-BRISA: grito → caminhão nasce atrás dele e atravessa a arena. 1 hit forte, knockback grande.
    down: {
      name: 'Patriota no Para-brisa', kind: 'projectile', startup: 22, recovery: 28, cooldown: 380,
      shout: 'SAI DA FRENTE!', fromBehind: 9, speed: 0.5, life: 40, linger: true, // atravessa rápido e segue após o impacto (some fora da tela)
      damage: 11, hitstun: 24, blockstun: 18, push: 0.26, knockdown: true, heavy: true,
      box: { y: 0, w: 2.8, h: 2.3 }, visual: 'truck', model: 'assets/props/caminhao.glb', text: 'PATRIOTA NO PARA-BRISA!',
    },
  },
  ultimate: { name: 'EFEITO COLATERAL', hits: 5, interval: 16, damage: 5, finisher: 12, range: 3.5, text: 'NÃO É FAKE!' },
  ai: { aggression: 0.85, keepDistance: 1.2, specialBias: 0.4, throwBias: 0.15, blockChance: 0.4, jumpChance: 0.12 },
  lines: {
    intro: ['Chegou o capitão, talkei?'],
    win: ['E daí? Ganhei, pô!'],
  },
  koTexts: ['DERRUBADO NA LIVE!'],
  visual: {
    model: 'assets/characters/capitao-brasa/model.glb',
    height: 1.85,
    yaw: 0,
    clips: {},
    ultimateFx: 'brasaJacare', // seringa → nuvem verde → jacaré de terno procedural (mordida, rabada, rolo da morte)
    transform: { id: 'jacare', model: 'assets/characters/capitao-brasa/ultimate.glb', height: 3.4, standInScale: 1, tint: 0x3f7d3a, frameTop: 4.0 },
    // efeitos presos ao corpo: clarão no dedo na Arminha; motos instanciadas na Motociata
    specialFx: {
      neutral: { type: 'arminha' },
      forward: { type: 'motociata' },
    },
    placeholder: { skin: 0xf1c6a5, suit: 0x2b2f36, accent: 0x1fa34a, accent2: 0xffd400, hair: 0x6b5a4a, headScale: 1.3, girth: 0.85, sidePart: true, longFace: true },
  },
};
