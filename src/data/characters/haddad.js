// HADDAD / "TAXADD" — controle / recursos. Versão paródica e de desenho animado dos memes públicos de "taxação"
// (taxa das blusinhas, arcabouço fiscal, Leão da Receita) — piada de fantasia, nada aqui afirma fato ou crime.
// Golpe meme: TAXA DAS BLUSINHAS (pacotes de encomenda com selo TAXADO!).
const GUARDA = '01a0fff8-e511-75af-a381-456ca0d8cb84'; // haddad_guarda (Texto para Motion, GLB próprio)
const CARIMBO = '01a0fff9-f9f2-72d5-84ce-5ba077e3441a'; // haddad_carimbo: punho alto e carimbada
const ARREMESSO = '01a0efe4-99e1-76ec-90af-8512dfe57528'; // arremesso por cima do ombro (Lulácio)
const CANETADA = '01a0ef6f-f255-734e-b234-53a83134aa3d'; // golpe de cima pra baixo (Xandor) → carimbada

export default {
  id: 'haddad',
  name: 'TAXADD',
  title: 'O Arrecadador',
  archetype: 'Controle / Recursos',
  stats: { hp: 100, walk: 0.95, jump: 0.95, width: 0.8, height: 1.8 },
  passive: {
    name: 'Arrecadação',
    desc: 'Todo golpe que acerta "taxa" um pouco da barra de Ultimate do rival para ele.',
    tax: { meter: 2, text: 'ARRECADOU!' },
  },
  moves: {},
  specials: {
    // TAXA DAS BLUSINHAS (meme): arremessa 1 pacote com selo TAXADO! — 2 hits (o 2º empurra)
    neutral: {
      name: 'Taxa das Blusinhas', kind: 'projectile', startup: 12, recovery: 18, cooldown: 160,
      speed: 0.17, vy: 0.04, g: 0.0011, life: 70, hits: 2, rehit: 5, damage: 3.5, hitstun: 18, push: 0.02,
      final: { damage: 4, push: 0.2, text: 'TAXADO!' },
      box: { y: 0.95, w: 0.7, h: 0.55 }, visual: 'pacote', color: 0xc8955a, text: 'TAXADO!',
    },
    // ARCABOUÇO FISCAL: ergue uma moldura de planilhas; golpe ou PROJÉTIL que bater nela é anulado e ele carimba de volta
    forward: {
      name: 'Arcabouço Fiscal', kind: 'counter', startup: 3, active: 26, recovery: 22, cooldown: 200, text: 'ARCABOUÇO!', freeze: 10,
      followup: {
        startup: 5, active: 8, recovery: 16, lunge: 0.22, damage: 10, knockdown: true, push: 0.3, heavy: true, hitstop: 12,
        box: { x: 0.0, y: 0.4, w: 1.4, h: 1.4 }, text: 'TETO DE GASTOS!',
      },
    },
    // CARIMBO DO IMPOSTO: avança com o carimbo gigante; quem leva fica +IMPOSTO (40% mais lento por 3 s)
    down: {
      name: 'Carimbo do Imposto', kind: 'strike', startup: 11, active: 5, recovery: 20, cooldown: 220, lunge: 0.16,
      damage: 5.5, hitstun: 20, push: 0.1, slow: { frames: 180, mult: 0.6, text: '+IMPOSTO' },
      box: { x: 0.1, y: 0.4, w: 1.25, h: 1.4 }, text: 'CARIMBADO!',
    },
  },
  // TAXAÇÃO SUPREMA: etiquetas de preço grudam, chuva de boletos, Leão da Receita gigante morde (finalizador
  // rouba boa parte da barra de ultimate do rival)
  ultimate: {
    name: 'TAXAÇÃO SUPREMA', hits: 6, interval: 12, damage: 3, finisher: 13, range: 5, text: 'LEÃO!',
    finalHit: { meterSteal: 80 },
  },
  ai: { aggression: 0.45, keepDistance: 2.6, specialBias: 0.5, throwBias: 0.12, blockChance: 0.5, jumpChance: 0.05 },
  lines: {
    intro: ['Tudo tem imposto. Inclusive essa surra.'],
    win: ['Arrecadação recorde!', 'Vitória declarada. Agora paga o carnê.'],
  },
  koTexts: ['TAXADO!', 'MALHA FINA!'],
  visual: {
    model: 'assets/characters/haddad/model.glb', // ainda não existe → placeholder entra sozinho
    height: 1.8,
    yaw: 0,
    animations: ['assets/characters/xandor/model.glb', 'assets/characters/lulacio/model.glb'],
    clips: {
      idle: GUARDA, intro: GUARDA, crouch: GUARDA, ultimate: 'Talk_Passionately',
      walk: 'Walk_Fight_Forward', walkBack: 'Walk_Fight_Back', jump: 'Regular_Jump',
      punch1: 'Left_Jab_from_Guard', punch2: 'Right_Jab_from_Guard', punch3: 'Punch_Forward_with_Both_Fists',
      crouchPunch: 'Left_Jab_from_Guard', airPunch: 'Right_Jab_from_Guard', throw: 'Punch_Forward_with_Both_Fists',
      kick: 'Spartan_Kick', airKick: 'Simple_Kick', sweep: 'Sweep_Kick',
      block: 'Block1', crouchBlock: 'Block1',
      hit: 'Face_Punch_Reaction', dizzy: 'Face_Punch_Reaction',
      knockdown: 'Fall_Down', down: 'Dead', ko: 'Dead', getup: 'Stand_Up1',
      special1: ARREMESSO, // pacote
      special2: 'Block1',  // arcabouço (pose) → contra-carimbo usa o mesmo clip
      special3: CARIMBO,  // carimbada (gesto próprio gerado no Meshy)
      victory: 'victory',
    },
    specialFx: {
      neutral: { type: 'propHand', visual: 'pacote', hand: 'righthand' },
      forward: { type: 'arcabouco' },
      down: { type: 'carimbo' },
    },
    ultimateFx: 'haddadTaxacao', // etiquetas de preço + chuva de boletos + Leão da Receita
    transform: { standInScale: 1, tint: 0x3aa35a, frameTop: 4.6 },
    placeholder: { skin: 0xe8c0a0, suit: 0x23283a, accent: 0x7a1e2a, shirt: 0xf2f2f2, hair: 0x9a9a9a, headScale: 1.28, girth: 0.95, glasses: true },
  },
};
