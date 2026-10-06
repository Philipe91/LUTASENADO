// Golpes base compartilhados por TODOS os lutadores.
// Um personagem só sobrescreve campos em `moves` do seu CharacterData.
//
// Frame data: startup / active / recovery em frames (60/s).
// hitbox: x = distância à frente do centro do lutador, y = altura a partir do pé, w/h = tamanho (metros).
// level: 'mid' (qualquer defesa), 'low' (defender agachado), 'high' (defender em pé).
// anim: chave de animação (ver visual/animKeys.js) — é o único elo entre lógica e visual.
// Vantagem em frames (acertando no 1º frame ativo): no hit = hitstun − (active−1 + recovery); na defesa idem com blockstun.
// Ver tests/framedata.mjs — soco +4/−2, soco 2 +4/−3, soco 3 −2/−9, chute +1/−7, baixo +3/−2, rasteira derruba/−15.
export const BASE_MOVES = {
  // chain soco→soco→soco: o jab empurra pouco (0.07 ≈ 0,4 m com o atrito) e o 2º/3º soco dão um passo (lunge) —
  // sem isso o 2º soco passava no vento fora da quina (medido em tests/framedata.mjs)
  punch1: {
    anim: 'punch1', startup: 5, active: 3, recovery: 9, damage: 4, hitstun: 15, blockstun: 9,
    push: 0.07, level: 'mid', hitbox: { x: 0.2, y: 1.1, w: 0.75, h: 0.4 }, chain: 'punch2',
  },
  punch2: {
    anim: 'punch2', startup: 5, active: 3, recovery: 10, damage: 4, hitstun: 16, blockstun: 9,
    push: 0.07, lunge: 0.06, level: 'mid', antiAir: true, hitbox: { x: 0.2, y: 1.1, w: 0.75, h: 0.6 }, chain: 'punch3',
  },
  punch3: {
    anim: 'punch3', startup: 8, active: 4, recovery: 18, damage: 7, hitstun: 22, blockstun: 12,
    push: 0.22, lunge: 0.1, level: 'mid', heavy: true, hitbox: { x: 0.2, y: 0.95, w: 0.9, h: 0.6 },
  },
  // ANTI-AÉREO: chute e soco 2 (gancho) marcados `antiAir` — pegando o rival no pulo derrubam com bônus (FEEL.antiAir)
  kick: {
    anim: 'kick', startup: 9, active: 4, recovery: 16, damage: 9, hitstun: 20, blockstun: 12,
    push: 0.2, level: 'mid', heavy: true, antiAir: true, hitbox: { x: 0.25, y: 0.65, w: 1.05, h: 0.75 },
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
