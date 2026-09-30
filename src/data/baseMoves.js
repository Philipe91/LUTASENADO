// Golpes base compartilhados por TODOS os lutadores.
// Um personagem só sobrescreve campos em `moves` do seu CharacterData.
//
// Frame data: startup / active / recovery em frames (60/s).
// hitbox: x = distância à frente do centro do lutador, y = altura a partir do pé, w/h = tamanho (metros).
// level: 'mid' (qualquer defesa), 'low' (defender agachado), 'high' (defender em pé).
// anim: chave de animação (ver visual/animKeys.js) — é o único elo entre lógica e visual.
export const BASE_MOVES = {
  punch1: {
    anim: 'punch1', startup: 5, active: 3, recovery: 9, damage: 4, hitstun: 15, blockstun: 9,
    push: 0.1, level: 'mid', hitbox: { x: 0.2, y: 1.1, w: 0.75, h: 0.4 }, chain: 'punch2',
  },
  punch2: {
    anim: 'punch2', startup: 5, active: 3, recovery: 10, damage: 4, hitstun: 16, blockstun: 9,
    push: 0.1, level: 'mid', hitbox: { x: 0.2, y: 1.1, w: 0.75, h: 0.4 }, chain: 'punch3',
  },
  punch3: {
    anim: 'punch3', startup: 8, active: 4, recovery: 18, damage: 7, hitstun: 22, blockstun: 12,
    push: 0.22, level: 'mid', heavy: true, hitbox: { x: 0.2, y: 0.95, w: 0.9, h: 0.6 },
  },
  kick: {
    anim: 'kick', startup: 9, active: 4, recovery: 16, damage: 9, hitstun: 20, blockstun: 12,
    push: 0.2, level: 'mid', heavy: true, hitbox: { x: 0.25, y: 0.65, w: 1.05, h: 0.5 },
  },
  crouchPunch: {
    anim: 'crouchPunch', startup: 5, active: 3, recovery: 8, damage: 3, hitstun: 13, blockstun: 8,
    push: 0.08, level: 'low', crouch: true, hitbox: { x: 0.2, y: 0.3, w: 0.75, h: 0.4 },
  },
  sweep: {
    anim: 'sweep', startup: 10, active: 4, recovery: 24, damage: 7, hitstun: 0, blockstun: 12,
    push: 0.12, level: 'low', crouch: true, knockdown: true, heavy: true,
    hitbox: { x: 0.25, y: 0, w: 1.1, h: 0.35 },
  },
  airPunch: {
    anim: 'airPunch', startup: 4, active: 7, recovery: 6, damage: 6, hitstun: 16, blockstun: 10,
    push: 0.1, level: 'high', air: true, hitbox: { x: 0.15, y: 0.6, w: 0.75, h: 0.55 },
  },
  airKick: {
    anim: 'airKick', startup: 6, active: 9, recovery: 6, damage: 8, hitstun: 18, blockstun: 10,
    push: 0.14, level: 'high', air: true, heavy: true, hitbox: { x: 0.2, y: 0.25, w: 0.95, h: 0.55 },
  },
  throw: {
    anim: 'throw', startup: 4, active: 2, recovery: 22, damage: 12, push: 0.2,
    throw: true, knockdown: true, heavy: true, hitbox: { x: 0.1, y: 0.4, w: 0.6, h: 1.0 },
  },
};
