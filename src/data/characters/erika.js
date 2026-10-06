// ERIKA HILTON — counter / elegante / sônica. Golpe meme: CLOSE CERTO (pose de fração de segundo; se o inimigo
// atacar, flash de câmera e contra-ataque automático). Ultimate PLENÁRIO É MEU: luz apaga, spotlight, ondas sonoras.
const GUARDA = '01a0ef75-1fd9-7538-9154-0af77913ed07'; // guarda de boxe (GLB do Xandor)

export default {
  id: 'erika',
  name: 'ERIKA HILTON',
  title: 'A Voz do Plenário',
  audio: { voice: { set: 'mulher_jovem', pitch: 0.97 } }, // grito de ARQUÉTIPO genérico (src/audio/Voices.js) — não imita voz real
  archetype: 'Counter / Elegante',
  stats: { hp: 92, walk: 1.15, dash: 1.2, backdash: 1.25, jump: 1.05, gravity: 0.95, width: 0.72, height: 1.8 }, // counter/ágil: entra e sai
  passive: {
    name: 'Presença',
    desc: '3 s sem tomar golpe: +18% de velocidade até apanhar.',
    presence: { after: 180, speed: 1.18 },
  },
  moves: {},
  specials: {
    // DISCURSO DE IMPACTO: onda sonora frontal rosa/dourada (projétil largo, alcance médio)
    neutral: {
      name: 'Discurso de Impacto', kind: 'projectile', startup: 12, recovery: 18, cooldown: 150,
      speed: 0.2, life: 45, damage: 6, hitstun: 20, push: 0.16,
      box: { y: 0.35, w: 1.0, h: 1.4 }, visual: 'sonicWave', color: 0xff5fa8, text: 'IMPACTO!',
    },
    // SALTO AGULHA: dash curto + chute giratório (limpo e rápido)
    forward: {
      name: 'Salto Agulha', kind: 'strike', startup: 7, active: 10, recovery: 14, lunge: 0.2, cooldown: 150,
      damage: 8, hitstun: 24, push: 0.22, heavy: true, // +3 no acerto (antes −6), −12 na defesa
      box: { x: 0.0, y: 0.45, w: 1.25, h: 1.05 }, text: 'AGULHA!',
    },
    // CLOSE CERTO (meme): pose por 22 frames. Se tomar um golpe → flash, o golpe é anulado e o contra-ataque sai sozinho
    down: {
      name: 'Close Certo', kind: 'counter', startup: 2, active: 22, recovery: 16, cooldown: 170, text: 'CLOSE CERTO!', freeze: 12,
      followup: {
        startup: 5, active: 4, recovery: 16, lunge: 0.18, damage: 13, knockdown: true, push: 0.32, heavy: true, hitstop: 14, unblockable: true,
        box: { x: 0.0, y: 0.4, w: 1.5, h: 1.3 }, text: 'CLOSE CERTO!',
      },
    },
  },
  ultimate: { name: 'PLENÁRIO É MEU', hits: 4, interval: 14, damage: 4.5, finisher: 15, range: 5, push: 0.45, text: 'PLENÁRIO É MEU!' },
  ai: { aggression: 0.5, keepDistance: 2.0, specialBias: 0.4, throwBias: 0.12, blockChance: 0.55, jumpChance: 0.08 },
  lines: {
    intro: ['O plenário é meu. E o ringue também.'],
    win: ['Questão de ordem: encerrada.'],
  },
  koTexts: ['SILENCIADO!'],
  visual: {
    model: 'assets/characters/erika/model.glb', // ainda não existe: placeholder entra sozinho
    height: 1.8,
    yaw: 0,
    animations: ['assets/characters/xandor/model.glb', 'assets/characters/lulacio/model.glb'],
    // personalidade: elegante — mão na cintura, quadril gingando; discurso ao microfone na entrada, pose de capa na vitória
    persona: {
      speed: { idle: 0.8, walk: 1.05 }, phase: 0.9,
      idle: { gesture: 'handOnHip', sway: [0.08, 0.5], twist: -0.08, head: -0.1, lean: -0.04, breath: [0.02, 0.5] },
      walk: { roll: 0.12, swagger: 0.06, lean: -0.04, head: -0.08 },
      intro: { gesture: 'micSpeech', say: 'O plenário é meu.' },
      victory: { gesture: 'pose' },
    },
    clips: {
      idle: GUARDA, intro: 'Talk_Passionately', crouch: GUARDA, ultimate: 'Talk_Passionately',
      walk: 'Walking', walkBack: 'Walking', jump: 'Regular_Jump',
      punch1: 'Left_Jab_from_Guard', punch2: 'Right_Jab_from_Guard', punch3: 'Punch_Forward_with_Both_Fists',
      crouchPunch: 'Left_Jab_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Grip_and_Throw_Down',
      kick: 'Spartan_Kick', airKick: 'Simple_Kick', sweep: 'Sweep_Kick',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Face_Punch_Reaction', dizzy: 'Face_Punch_Reaction',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: 'Talk_Passionately', // discurso
      special2: 'Spartan_Kick',      // salto agulha
      special3: 'Block1',            // close certo (pose) → o contra-ataque usa o mesmo clip
      victory: 'victory',
    },
    reverseKeys: ['walkBack'],
    // efeitos presos ao corpo: microfone no Discurso; rastro rosa/dourado no Salto Agulha; pose, flash e foto no Close Certo
    specialFx: {
      neutral: { type: 'micHand' },
      forward: { type: 'agulha' },
      down: { type: 'closeCerto' },
    },
    ultimateFx: 'erikaPlenario', // luzes apagam → spotlight → ondas sonoras → onda final que arremessa pra fora do quadro
    transform: { standInScale: 1, tint: 0xff6fae, frameTop: 3.4 },
    placeholder: { skin: 0xc48a5a, suit: 0x151515, accent: 0xff5fa8, hair: 0xc99a5b, shirt: 0x151515, headScale: 1.25, girth: 0.78, longHair: true },
  },
};
