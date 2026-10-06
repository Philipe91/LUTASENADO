// MARCOS DUVAL / "AGENTE DUVALL" — trap / técnico / contra-ataque. Sátira absurda: arquivos digitais, nada real.
// Clips emprestados dos GLBs do Xandor (preciso) e do Lulácio (arremesso) até o model.glb próprio chegar.
const GUARDA = '01a0ef75-1fd9-7538-9154-0af77913ed07'; // guarda de boxe (GLB do Xandor)
const FECHADA = '01a0ef76-3fa8-73be-8e95-94acb4b40424'; // guarda fechada, mãos no rosto (IA, GLB do Xandor)
const ARREMESSO = '01a0efe4-99e1-76ec-90af-8512dfe57528'; // lula_picanha: arremesso por cima do ombro (GLB do Lulácio)

export default {
  id: 'duval',
  name: 'AGENTE DUVALL',
  title: 'O Operador de Arquivos',
  archetype: 'Trap / Técnico',
  stats: { hp: 100, walk: 1.0, jump: 1.0, width: 0.8, height: 1.82 },
  passive: {
    name: 'Arquivo Confidencial',
    desc: 'Bloquear um especial enche bem mais a barra de Ultimate.',
    blockSpecialMeter: { gain: 24, text: 'CONFIDENCIAL!' },
  },
  moves: {},
  specials: {
    // PENDRIVE EXPLOSIVO (meme): joga o pendrive; ao acertar, "ARQUIVO CORROMPIDO" + stun curto (tonto) e ele explode ali
    neutral: {
      name: 'Pendrive Explosivo', kind: 'projectile', startup: 12, recovery: 18, cooldown: 190,
      speed: 0.2, vy: 0.03, g: 0.0015, life: 70, linger: true, stopOnSpent: true, spentLife: 26,
      damage: 4, hitstun: 10, stun: 26, push: 0.08,
      box: { y: 1.0, w: 0.45, h: 0.4 }, visual: 'pendrive', color: 0x35c4ff, text: 'ARQUIVO CORROMPIDO!',
    },
    // VAZAMENTO DE DADOS: zona no alvo — pasta abre no ar e os arquivos caem em sequência (multi-hit leve, dá pra sair)
    forward: {
      name: 'Vazamento de Dados', kind: 'zone', atOpponent: true, startup: 12, recovery: 18, cooldown: 270,
      delay: 20, activeFrames: 30, linger: 14, hits: 5, rehit: 6,
      damage: 1.4, hitstun: 12, push: 0.02, final: { damage: 2.5, hitstun: 22, push: 0.2, text: 'VAZOU!' },
      box: { y: 0, w: 1.3, h: 2.4 }, visual: 'vazamento', color: 0x35c4ff,
    },
    // OPERAÇÃO TÁTICA: dash curto que ATRAVESSA e para atrás do inimigo, vira e termina em rasteira (golpe baixo)
    down: {
      name: 'Operação Tática', kind: 'strike', anim: 'sweep', startup: 18, active: 4, recovery: 20, cooldown: 220,
      passThrough: true, dash: { from: 3, to: 15, v: 0.34, past: 0.9 }, faceAtActive: true, // alcance ≈4,7 m
      damage: 6, knockdown: true, push: 0.14, level: 'low', heavy: true,
      box: { x: -0.2, y: 0, w: 1.3, h: 0.4 }, text: 'OPERAÇÃO TÁTICA!',
    },
  },
  // BACKUP COMPLETO: pendrive gigante conecta; "COPIANDO... 99%" → cada hit uma rajada de arquivos; 100% → explosão de documentos
  ultimate: { name: 'BACKUP COMPLETO', hits: 4, interval: 16, damage: 5, finisher: 15, range: 4.5, text: 'BACKUP 100%!' },
  ai: { aggression: 0.45, keepDistance: 2.8, specialBias: 0.5, throwBias: 0.1, blockChance: 0.55, jumpChance: 0.06 },
  lines: {
    intro: ['Operação iniciada. Sem rastros.'],
    win: ['Arquivo encerrado. Backup feito.'],
  },
  koTexts: ['DELETADO!'],
  visual: {
    model: 'assets/characters/duval/model.glb', // ainda não existe → placeholder entra sozinho
    animations: ['assets/characters/xandor/model.glb', 'assets/characters/lulacio/model.glb'],
    height: 1.82,
    yaw: 0,
    // personalidade: agente tático — base baixa, cabeça varrendo o ambiente; ponto no ouvido na entrada
    persona: {
      speed: { idle: 1, walk: 1.15 }, phase: 0.65,
      idle: { crouch: 0.22, lean: 0.12, look: [0.35, 0.3], breath: [0.02, 0.6], stance: 0.07 },
      walk: { crouch: 0.25, lean: 0.15, bob: 0.01 },
      intro: { gesture: 'earpiece', say: 'Sem rastros.' },
      victory: { gesture: 'pendriveUp' },
    },
    clips: {
      idle: FECHADA, intro: FECHADA, crouch: GUARDA, ultimate: GUARDA,
      walk: 'Walking', walkBack: 'Walking', jump: 'Regular_Jump',
      punch1: 'Left_Jab_from_Guard', punch2: 'Right_Jab_from_Guard', punch3: 'Punch_Forward_with_Both_Fists',
      crouchPunch: 'Left_Jab_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Punch_Forward_with_Both_Fists',
      kick: 'Simple_Kick', airKick: 'Simple_Kick', sweep: 'Sweep_Kick',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Face_Punch_Reaction', dizzy: 'Face_Punch_Reaction',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: ARREMESSO, // Pendrive Explosivo: arremesso
      special2: 'Talk_Passionately', // Vazamento de Dados: comanda o vazamento
      special3: 'Sweep_Kick', // Operação Tática termina em rasteira (anim: 'sweep')
      victory: 'victory',
    },
    reverseKeys: ['walkBack'],
    jumpScrub: { from: 0.28, to: 0.62 },
    timing: {
      punch1: { start: 0.292, contact: 0.467, activeEnd: 0.603, end: 1.108 },
      crouchPunch: { start: 0.292, contact: 0.467, activeEnd: 0.603, end: 1.108 },
      punch2: { start: 0.4, contact: 0.644, activeEnd: 0.711, end: 0.956 },
      punch3: { start: 0.622, contact: 0.894, activeEnd: 0.933, end: 1.128 },
      kick: { start: 0.544, contact: 0.933, activeEnd: 1.037, end: 1.659 },
      sweep: { start: 0.36, contact: 1.347, activeEnd: 1.392, end: 1.617 },
      special1: { start: 0.2, contact: 0.95, activeEnd: 1.05, end: 1.9 },
    },
    // efeitos presos ao corpo: pendrive na mão até o arremesso; rastro tático (sombras) na Operação Tática
    specialFx: {
      neutral: { type: 'pendriveHand' },
      down: { type: 'tatica' },
    },
    ultimateFx: 'duvalBackup', // pendrive gigante conecta, COPIANDO... 99% → 100%, explosão de documentos
    transform: { id: 'backup', height: 1.82, standInScale: 1, tint: 0x35c4ff, frameTop: 4.6 },
    placeholder: { skin: 0xe3b08c, suit: 0x16181d, accent: 0x9aa3ad, pants: 0x1f3a7a, shirt: 0x24262c, hair: 0x1a1a1a, headScale: 1.3, girth: 1.1, beard: true, angryBrows: true },
  },
};
