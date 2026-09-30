// Constantes da simulação. Lógica roda em frames fixos de 60 Hz; distâncias em metros.
export const STEP = 1 / 60;
export const GRAVITY = 0.0135;
export const JUMP_V = 0.25;
export const ARENA_HALF = 7.5;
export const MAX_SEP = 8.2;
export const METER_MAX = 300;
export const ROUND_FRAMES = 60 * 60;
export const BUFFER = 8;

export const NEUTRAL = Object.freeze({
  left: false, right: false, up: false, down: false,
  punch: false, kick: false, special: false, ultimate: false,
});
