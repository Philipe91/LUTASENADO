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
    forward: {
      name: 'Meteoro Didático', kind: 'projectile', startup: 16, recovery: 20, armor: true, cooldown: 180,
      speed: 0.12, vy: 0.2, g: 0.011, damage: 10, knockdown: true, push: 0.15, life: 90,
      box: { y: 1.4, w: 0.7, h: 0.7 }, visual: 'book', color: 0x6b3f1d, text: 'METEORO!',
    },
    down: {
      name: 'Pisão Cretáceo', kind: 'projectile', startup: 16, recovery: 22, armor: true, cooldown: 170,
      speed: 0.14, damage: 6, knockdown: true, level: 'low', life: 60,
      box: { y: 0, w: 0.9, h: 0.4 }, visual: 'wave', color: 0x8a6a3a, text: 'PISÃO!',
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
    transform: { id: 'trex', model: 'assets/characters/dino-supremo/ultimate.glb', height: 4.0, standInScale: 1.75, tint: 0x4d7a3a },
    placeholder: { skin: 0xe6b58e, suit: 0x55595f, accent: 0x4f6b3a, hair: 0xb9b9b9, headScale: 1.3, girth: 1.5, glasses: true },
  },
};
