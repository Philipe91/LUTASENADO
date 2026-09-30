export default {
  id: 'capitao-brasa',
  name: 'CAPITÃO BRASA',
  title: 'O Motociclista do Caos',
  archetype: 'Rushdown / Pressão',
  stats: { hp: 100, walk: 1.3, jump: 1.05, width: 0.75, height: 1.85, damage: 1.15 },
  passive: {
    name: 'Live Ligada',
    desc: 'Cada 3 acertos seguidos: VIRALIZOU! +15% velocidade e +10% dano por 3s.',
    comboBuff: { every: 3, frames: 180, speed: 1.15, damage: 1.1, text: 'VIRALIZOU!' },
  },
  moves: {},
  specials: {
    neutral: {
      name: 'Rajada do Dedo', kind: 'strike', startup: 6, active: 24, recovery: 14, rehit: 5,
      damage: 1.6, hitstun: 10, push: 0.03, cooldown: 110,
      box: { x: 0.2, y: 0.95, w: 0.85, h: 0.5 }, text: 'TALKEI?',
    },
    forward: {
      name: 'Motociata', kind: 'strike', startup: 10, active: 26, recovery: 18, rehit: 9, lunge: 0.2,
      damage: 3.5, hitstun: 16, push: 0.1, cooldown: 180,
      box: { x: -0.2, y: 0, w: 1.2, h: 1.3 }, text: 'MOTOCIATA!',
    },
    // PATRIOTA NO PARA-BRISA: grito → caminhão nasce atrás dele e atravessa a arena. 1 hit forte, knockback grande.
    down: {
      name: 'Patriota no Para-brisa', kind: 'projectile', startup: 22, recovery: 28, cooldown: 380,
      shout: 'SAI DA FRENTE!', fromBehind: 9, speed: 0.55, life: 40,
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
    transform: { id: 'jacare', model: 'assets/characters/capitao-brasa/ultimate.glb', height: 3.4, standInScale: 1.6, tint: 0x3f7d3a },
    placeholder: { skin: 0xf1c6a5, suit: 0x2b2f36, accent: 0x1fa34a, accent2: 0xffd400, hair: 0x6b5a4a, headScale: 1.3, girth: 0.85, sidePart: true, longFace: true },
  },
};
