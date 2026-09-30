// CONTRATO DE ANIMAÇÃO — a única ponte entre a lógica (Fighter.animKey) e o visual.
// Qualquer modelo (placeholder, GLB do Meshy/Mixamo, transformação) só precisa saber tocar estas chaves.
export const ANIM_KEYS = [
  'idle', 'walk', 'walkBack', 'jump', 'crouch',
  'punch1', 'punch2', 'punch3', 'kick', 'crouchPunch', 'sweep', 'airPunch', 'airKick', 'throw',
  'special1', 'special2', 'special3', 'ultimate',
  'block', 'crouchBlock', 'hit', 'dizzy', 'knockdown', 'down', 'getup', 'ko',
  'intro', 'victory',
];

export const LOOPING = new Set(['idle', 'walk', 'walkBack', 'crouch', 'dizzy', 'down', 'ko', 'intro', 'victory', 'block', 'crouchBlock', 'jump']);

// Se o GLB não tiver a animação, cai na próxima da cadeia (e no fim, 'idle').
export const ANIM_FALLBACK = {
  walkBack: 'walk', punch2: 'punch1', punch3: 'punch2', airPunch: 'punch1', airKick: 'kick',
  crouchPunch: 'punch1', sweep: 'kick', throw: 'punch3', crouchBlock: 'block',
  special1: 'special', special2: 'special', special3: 'special', special: 'punch3', ultimate: 'special',
  dizzy: 'hit', knockdown: 'hit', down: 'ko', getup: 'idle', ko: 'hit', intro: 'idle', victory: 'idle',
  block: 'idle', hit: 'idle', jump: 'idle', crouch: 'idle', kick: 'punch1', punch1: 'idle',
};

// Nomes de clip aceitos para cada chave (comparação sem maiúsculas). A 1ª opção é sempre a própria chave:
// o script tools/build_shared_anims.py nomeia cada clip exatamente com a chave.
export const CLIP_NAMES = {
  idle: ['idle', 'fighting idle', 'boxing idle', 'fight idle'],
  walk: ['walk', 'walking', 'walk forward'],
  walkBack: ['walkback', 'walk back', 'walking backwards', 'walking backward'],
  jump: ['jump'],
  crouch: ['crouch', 'crouching idle', 'crouch idle'],
  punch1: ['punch1', 'jab', 'lead jab', 'punching', 'punch'],
  punch2: ['punch2', 'cross', 'cross punch'],
  punch3: ['punch3', 'hook', 'uppercut'],
  kick: ['kick', 'mma kick', 'roundhouse kick', 'roundhouse'],
  sweep: ['sweep', 'leg sweep'],
  block: ['block', 'body block', 'center block'],
  hit: ['hit', 'hit reaction', 'head hit', 'reaction'],
  knockdown: ['knockdown', 'knocked down', 'falling back death', 'falling back'],
  ko: ['ko', 'death', 'dying'],
  getup: ['getup', 'getting up', 'get up', 'stand up'],
  victory: ['victory', 'victory idle', 'cheering', 'cheer'],
  special: ['special', 'fireball', 'hadouken'],
  throw: ['throw', 'grab'],
  intro: ['intro', 'taunt'],
  ultimate: ['ultimate', 'power up', 'roar'],
};
