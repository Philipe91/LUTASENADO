// Constantes da simulação. Lógica roda em frames fixos de 60 Hz; distâncias em metros.
export const STEP = 1 / 60;
export const GRAVITY = 0.0135;
export const JUMP_V = 0.25;
export const ARENA_HALF = 7.5;
export const MAX_SEP = 8.2;
export const METER_MAX = 300;
export const ROUND_FRAMES = 60 * 60;
export const BUFFER = 8; // input buffer: aperto lembrado por 8 frames (no hitstop o relógio do lutador para, então ele "estica")

// GAME FEEL — tudo que deixa o combate "de jogo de luta" mora aqui, por dados (ver docs/JOGABILIDADE.md).
export const FEEL = {
  // movimento: aceleração/freio curtos (chega à velocidade em ~4 frames, para em ~3) e controle aéreo leve
  move: { accel: 0.4, decel: 0.55, airAccel: 0.0016, airMax: 1.05 },
  // cancels: golpe normal que ENCOSTOU (acerto ou defesa) pode virar especial ou um normal mais forte
  // até `window` frames depois do fim da janela ativa (fraco → forte → especial)
  cancel: { window: 10, special: true, into: { punch1: ['kick', 'sweep'], punch2: ['kick', 'sweep'], crouchPunch: ['sweep', 'kick'] } },
  // escala de dano por hit do combo (índice = hits já tomados no combo); depois do fim da tabela vale `min`
  scaling: { table: [1, 0.95, 0.85, 0.75, 0.65, 0.55], min: 0.45 },
  // contra-golpe: acertar o rival no startup/ativo do golpe dele (dano ×, hitstun +, hitstop +, barra +)
  // (janela: startup + os primeiros `active` frames ativos — golpe de ativo longo não fica "counterável" o tempo todo)
  counter: { damage: 1.2, hitstun: 4, hitstop: 3, meter: 10, active: 3, text: 'COUNTER!' },
  // juggle: quem está caindo (knockdown) ainda toma até `limit` hits; cada hit no ar pesa mais (gravidade ×)
  // e lança menos; depois do limite fica intocável até o chão (anti-infinito)
  juggle: { limit: 2, gravityStep: 0.3, launchDecay: 0.7, damage: 0.8 },
  // empurrão: na defesa o atacante recua um pouco; com o defensor na quina, o atacante recua NO LUGAR dele
  push: { blockSelf: 0.35, corner: 0.9, cornerZone: 0.35 },
  // queda e levantar: tech = apertar qualquer botão até `techWindow` frames antes de cair ou logo depois
  // (agarrão e ultimate = queda dura, sem tech). Ao levantar fica `throwInv` frames imune a agarrão.
  wakeup: { down: 34, getup: 18, techWindow: 10, techGetup: 12, techRoll: 0.09, throwInv: 6 },
  // agarrão comum: o defensor escapa apertando soco até `window` frames antes do agarrão pegar (throw tech)
  throwTech: { window: 7, push: 0.16 },

  // ---- novas mecânicas (docs/COMBATE_PESQUISA.md) ----
  // BARRA DE GUARDA (anti-tartaruga, estilo Guilty Gear/SF6 burnout): cada golpe defendido gasta `normal`/`heavy`/
  // `special` pontos; zera → GUARDA QUEBRADA (fica `breakStun` frames aberto, a barra volta a `refill`×max).
  // Regenera `regen`/frame fora do blockstun e só `pause` frames depois da última defesa (cheia em ~7 s de paz).
  // Sequência colada: ~9 jabs, ~6 chutes ou ~5 especiais defendidos seguidos quebram. `low`: fração em que a barra pisca.
  guard: { max: 100, normal: 11, heavy: 17, special: 22, regen: 0.25, pause: 20, breakStun: 42, refill: 0.5, low: 0.3, text: 'GUARDA QUEBRADA!' },
  // DANO DE RASPÃO (chip): só especial/ultimate raspa a guarda (normal não) — defender normal é seguro, defender
  // especial custa um pouco (SF). Nunca mata: fica em 1 de vida.
  chip: { normal: 0, special: 0.12 },
  // DEFESA NA HORA (just block, universal — a passiva TÁ OK do Brasa é a versão turbinada): começar a defender até
  // `window` frames antes do golpe encostar = sem raspão, sem gasto de guarda, blockstun −`stunCut`, +`meter`.
  justBlock: { window: 4, stunCut: 4, meter: 12, text: 'NA HORA!' },
  // ANTI-AÉREO: golpe de chão (com `antiAir`) acertando quem está no ar derruba com bônus (dano ×, barra +, lança)
  antiAir: { damage: 1.15, meter: 8, launch: 0.2, text: 'ANTI-AÉREO!' },
  // QUIQUE NA PAREDE (leve): queda forte (|vx| ≥ `minVx`) que bate na borda volta (`bounce`× a velocidade) e sobe
  // `launch` — uma vez por queda — dá tempo de emendar um hit no ar (entra no limite do juggle)
  wallBounce: { minVx: 0.3, bounce: 0.45, launch: 0.17, text: 'NA PAREDE!' },
  // DISCURSO DE REAÇÃO (comeback): abaixo de `below` da vida, a barra enche `meter`× e o dano sobe `damage`× (1× por round)
  comeback: { below: 0.3, meter: 1.35, damage: 1.06, text: 'DISCURSO DE REAÇÃO!' },
  // MOTION INPUT opcional (quem vem de Street Fighter): ↓↘→ + soco/chute = especial frente · ↓↙← + botão = especial neutro ·
  // ↓↓ + botão = especial baixo. O botão de especial + direção continua valendo (SF6 Modern).
  motion: { enabled: true, window: 14, link: 8 },
  // BARRA DE ULTIMATE: ganho por dano causado/recebido/defesa (antes 2.4/1.5/8+3 → ~5 ultimates por partida)
  meter: { dealt: 1.4, taken: 0.8, block: 5, blockAtk: 2 },
};

export const NEUTRAL = Object.freeze({
  left: false, right: false, up: false, down: false,
  punch: false, kick: false, special: false, ultimate: false,
});
