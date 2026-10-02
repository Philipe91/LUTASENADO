// "Slot" visual de um lutador. Lê o Fighter (lógica) e desenha com o modelo que estiver disponível:
//   1. placeholder de primitivas (imediato)
//   2. GLB definitivo (troca sozinho quando termina de carregar; se não existir, fica o placeholder)
//   3. forma de ultimate (GLB da transformação, ou stand-in: modelo base escalado + tingido)
import * as THREE from 'three';
import { PlaceholderModel } from './models/PlaceholderModel.js';
import { GLBModel } from './models/GLBModel.js';
import { LOOPING } from './animKeys.js';
import { JUMP_V } from '../fight/constants.js';
import { XandorAvatar } from './ultimates/XandorAvatar.js';
import { LulacioPolvo } from './ultimates/LulacioPolvo.js';
import { BrasaJacare } from './ultimates/BrasaJacare.js';
import { DinoTrex } from './ultimates/DinoTrex.js';
import { NikolasViral } from './ultimates/NikolasViral.js';
import { ErikaPlenario } from './ultimates/ErikaPlenario.js';
import { VorcaroCapital } from './ultimates/VorcaroCapital.js';
import { FlavioDinastia } from './ultimates/FlavioDinastia.js';
import { DuvalBackup } from './ultimates/DuvalBackup.js';
import { SpecialFx } from './SpecialFx.js';
import { StatusFx } from './StatusFx.js';

const ULTIMATE_FX = { xandorAvatar: XandorAvatar, lulacioPolvo: LulacioPolvo, brasaJacare: BrasaJacare, dinoTrex: DinoTrex, nikolasViral: NikolasViral, erikaPlenario: ErikaPlenario, vorcaroCapital: VorcaroCapital, flavioDinastia: FlavioDinastia, duvalBackup: DuvalBackup };

const LYING = new Set(['knockdown', 'down', 'ko', 'getup']);

// PESO / GAME FEEL por personagem (só visual: a lógica e o balanceamento não mudam).
//   weight: inércia das molas (mais pesado = volta mais devagar) · lean: inclinação de antecipação/follow-through
//   squash: amassa/estica no pulo e na queda · react: quanto o corpo cede ao apanhar · turn: velocidade de virar
//   blendIn/blendOut: crossfade ao entrar num golpe / ao voltar pra guarda (s)
const FEEL = {
  default: { weight: 1, lean: 1, squash: 1, react: 1, turn: 16, blendIn: 0.07, blendOut: 0.18 },
  lulacio: { weight: 1.35, lean: 1.3, squash: 1.3, react: 0.85, turn: 11, blendIn: 0.09, blendOut: 0.24 }, // brigão pesado: carrega o golpe, assenta devagar
  xandor: { weight: 0.8, lean: 0.65, squash: 0.6, react: 1.1, turn: 22, blendIn: 0.045, blendOut: 0.12 }, // magistrado preciso: seco, contido, volta rápido
  'dino-supremo': { weight: 1.5, lean: 1.1, squash: 1.4, react: 0.7, turn: 10, blendIn: 0.1, blendOut: 0.26 },
  'capitao-brasa': { weight: 1, lean: 1.1, squash: 1.1, react: 1, turn: 17, blendIn: 0.06, blendOut: 0.16 },
};

// mola amortecida (subpassos fixos: estável com dt grande e parada com dt = 0 no hitstop)
class Spring {
  constructor(k, zeta) { this.x = 0; this.v = 0; this.k = k; this.c = 2 * zeta * Math.sqrt(k); }
  step(target, dt) {
    const n = Math.ceil(dt / 0.008);
    const h = dt / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      this.v += (this.k * (target - this.x) - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}
const ATTACKING = new Set(['attack', 'special', 'ultimate']);
const REACT = new Set(['hitstun', 'blockstun', 'held']);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const model0HasFall = (m) => !!m?.hasClip?.('ko'); // GLB com clip de queda (o placeholder deita sozinho, para trás)

// Animações compartilhadas pelos lutadores: public/assets/animations/manifest.json
//   { "idle": "lib/idle.glb", "punch1": "lib/punch1.glb", ... }  (chave do jogo → GLB só com armature, do Meshy)
// Opcional: shared.glb com vários clips já nomeados pelas chaves (caminho Mixamo/Blender).
let sharedAnims = null;
export function sharedAnimations() {
  sharedAnims ||= fetch('assets/animations/manifest.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((man) => [
      ...Object.entries(man).filter(([k]) => !k.startsWith('_')).map(([key, file]) => ({ key, url: `assets/animations/${file}` })),
      'assets/animations/shared.glb',
    ]);
  return sharedAnims;
}

export class FighterView {
  constructor(scene, fighter, opts = {}) {
    this.f = fighter;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.lastSeq = -1;
    this.lay = 0;
    this.form = 'base';
    this.formScale = 1;
    this.turn = fighter.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    const fe = this.feel = { ...FEEL.default, ...(FEEL[fighter.data.id] || {}), ...(fighter.data.visual?.feel || {}) };
    this.lean = new Spring(170 / fe.weight, 0.42);   // inclinação frente/trás (rad)
    this.push = new Spring(210 / fe.weight, 0.5);    // deslocamento para frente/trás (m, eixo do golpe)
    this.hop = new Spring(230 / fe.weight, 0.55);    // pulinho do corpo (m) — arco de knockback / quique no chão
    this.squash = new Spring(260 / fe.weight, 0.33); // amassa (<0) / estica (>0)
    this.hitSeen = fighter.hitSeq; this.prevState = fighter.state; this.prevKey = fighter.animKey; this.wasAir = false;

    const visual = fighter.data.visual || {};
    this.base = new PlaceholderModel(fighter.data);
    this.group.add(this.base.object);
    this.source = 'placeholder';

    if (visual.model && !opts.placeholderOnly) {
      sharedAnimations().then((anims) => GLBModel.create(visual, anims))
        .then((m) => { this.swapBase(m); this.source = 'glb'; console.info(`[visual] ${fighter.data.id}: GLB carregado`); })
        .catch(() => console.info(`[visual] ${fighter.data.id}: sem GLB em ${visual.model}, usando placeholder`));
    }
    if (visual.specialFx) this.spFx = new SpecialFx(scene, visual.specialFx);
    this.status = new StatusFx(scene); // estrelinhas (atordoado) e cadeado (BLOQUEADO)
    // VFX da ultimate (composição por personagem)
    if (visual.ultimateFx && ULTIMATE_FX[visual.ultimateFx]) this.ultFx = new ULTIMATE_FX[visual.ultimateFx](scene);
    const tr = visual.transform;
    if (tr?.model && !opts.placeholderOnly) {
      GLBModel.create({ ...tr, clips: tr.clips || {} })
        .then((m) => { this.ultimateModel = m; m.object.visible = false; this.group.add(m.object); })
        .catch(() => {});
    }

    // sombra "blob" barata (as sombras reais ficam por conta da luz direcional)
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.55 * (fighter.stats.width / 0.8), 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.012;
    this.blob = blob;
    scene.add(blob);

    // passiva do Xandor: círculo de jurisdição no chão
    const aura = fighter.passive.aura;
    if (aura) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(aura.radius - 0.05, aura.radius, 64),
        new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.35, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      this.aura = ring;
      scene.add(ring);
    }
  }

  swapBase(model) {
    this.group.remove(this.base.object);
    this.base.dispose();
    this.base = model;
    this.group.add(model.object);
    this.lastSeq = -1;
  }

  get active() { return this.form === 'ultimate' && this.ultimateModel ? this.ultimateModel : this.base; }

  update(dt, match) {
    const f = this.f;
    // Abraço: o preso orbita em Z (a lógica é 2D) e fica um pouco erguido; os dois se encaram durante o giro
    const heldZ = f.heldZ || 0;
    this.group.position.set(f.x, f.y + (f.heldBy ? 0.3 : 0), heldZ);
    const other = f.held || f.heldBy;
    if (other) {
      this.turn = Math.atan2(other.x - f.x, (other.heldZ || 0) - heldZ);
    } else {
      let targetTurn = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
      // golpe alto/médio que derruba: o clip de queda deita com a cabeça para o lado do atacante — gira o corpo
      // no voo para cair de costas PARA LONGE de quem bateu (rasteira mantém: as pernas é que foram varridas)
      const fallAway = (f.state === 'knockdown' || f.state === 'down' || f.state === 'ko') && f.hitInfo && f.hitInfo.zone !== 'low';
      if (fallAway && model0HasFall(this.base)) targetTurn += Math.PI;
      let d = targetTurn - this.turn;
      d = Math.atan2(Math.sin(d), Math.cos(d)); // volta pelo caminho curto depois do giro
      this.turn += d * Math.min(1, dt * this.feel.turn);
    }
    this.group.rotation.y = this.turn;

    // forma de ultimate: entra depois da cinemática de ativação
    const wantUlt = f.state === 'ultimate';
    if (wantUlt && this.form !== 'ultimate') this.setForm('ultimate');
    if (!wantUlt && this.form === 'ultimate') this.setForm('base');
    const tr = f.data.visual?.transform || {};
    const targetScale = this.form === 'ultimate' && !this.ultimateModel ? (tr.standInScale || 1.6) : 1;
    this.formScale += (targetScale - this.formScale) * Math.min(1, dt * 8);
    this.group.scale.setScalar(this.formScale);

    const model = this.active;
    if (f.animSeq !== this.lastSeq) {
      this.lastSeq = f.animSeq;
      const mv = f.state === 'attack' ? f.move : f.state === 'special' ? f.sp : null;
      model.play(f.animKey, f.animLen, LOOPING.has(f.animKey), mv && { startup: mv.startup, active: mv.active, recovery: mv.recovery }, this.fadeFor(f));
      this.prevState = f.state; this.prevKey = f.animKey;
    }
    const vy0 = JUMP_V * (f.stats.jump || 1);
    const airP = f.y > 0 ? Math.max(0, Math.min(1, (vy0 - f.vy) / (2 * vy0))) : 1;
    // progresso de queda/levantar (frames da lógica): knockdown ≈ duração do voo, ko tomba em ~40, getup = animLen
    const prog = f.animKey === 'knockdown' ? f.t / 24 : f.animKey === 'ko' ? f.t / 40 : f.animKey === 'down' ? 1
      : f.animKey === 'getup' ? f.t / Math.max(1, f.animLen || 18) : undefined;
    model.update(dt, { low: f.isLow, key: f.animKey, moveT: f.state === 'attack' || f.state === 'special' ? f.t : undefined, airP, prog });
    // GLB sem animação de queda/KO: deita o modelo proceduralmente (nunca fica em pé nocauteado)
    const lying = LYING.has(f.animKey) && model.hasClip && !model.hasClip(f.animKey === 'getup' ? 'getup' : 'ko');
    let layTarget = lying ? (f.animKey === 'getup' ? Math.max(0, 1 - f.t / 18) : 1) : 0;
    // Abraço: o preso vai deitando pra fora conforme o giro acelera (força centrífuga), pés fora do chão
    const g = f.heldBy, gsp = g?.sp?.spin ? g.sp : null;
    if (gsp) layTarget = Math.min(0.8, ((g.t - gsp.startup) / gsp.spin.frames) * 1.3);
    this.group.position.y += this.lay * 0.5 * (gsp ? 1 : 0);
    this.lay += (layTarget - this.lay) * Math.min(1, dt * 12);
    this.updateFeel(dt, f, match, model);
    // atordoado: corpo balança de tonto (lado a lado)
    const dz = f.state === 'hitstun' && f.animKey === 'dizzy' ? Math.sin(performance.now() / 160) * 0.1 : 0;
    model.object.rotation.z += (dz - model.object.rotation.z) * Math.min(1, dt * 10);
    // ultimate com VFX próprio: brilho dourado FIXO (sem piscar); sem VFX: stand-in piscando (antigo)
    const ultBlink = this.form === 'ultimate' && !this.ultimateModel && !this.ultFx && Math.floor(performance.now() / 90) % 2 === 0;
    // buff curto da passiva (TÁ OK do Brasa): brilho verde-amarelo pulsando enquanto dura
    const buffGlow = f.buffT > 0 && f.passive.perfectBlock ? (Math.floor(performance.now() / 120) % 2 ? 0x7be04a : 0xffd400) : null;
    model.setFlash(f.flash > 0 || ultBlink, this.form === 'ultimate' && this.ultFx ? tr.tint : buffGlow, buffGlow ? 0.45 : null);
    // skin dourada na forma ultimate (visual.transform.gold)
    if (tr.gold && model.setGold) {
      this.goldK = (this.goldK || 0) + ((this.form === 'ultimate' ? 1 : 0) - (this.goldK || 0)) * Math.min(1, dt * 6);
      model.setGold(this.goldK < 0.01 ? 0 : this.goldK);
    }
    this.ultFx?.update(dt, f, match, model);
    this.spFx?.update(dt, f, model);
    this.status.update(dt, f, model, this.formScale);
    if (this.ultFx) model.object.visible = !this.ultFx.hideBase; // polvo substitui o corpo

    this.blob.position.set(f.x, 0.012, heldZ);
    const s = Math.max(0.4, 1 - f.y * 0.25) * this.formScale;
    this.blob.scale.set(s, s, s);
    if (this.aura) {
      this.aura.position.x = f.x;
      this.aura.material.opacity = 0.18 + Math.sin(performance.now() / 300) * 0.08;
    }
  }

  // crossfade por tipo de transição: reação entra na hora, golpe entra seco, volta pra guarda assenta suave
  fadeFor(f) {
    const fe = this.feel, st = f.state, ps = this.prevState, k = f.animKey;
    if (REACT.has(st)) return 0.04;
    if (st === 'knockdown' || st === 'ko') return 0.07;
    if (st === 'attack' || st === 'special') return ps === 'attack' ? 0.05 : ps === 'dash' ? 0.04 : fe.blendIn;
    if (st === 'ultimate') return 0.12;
    if (st === 'dash') return 0.05;
    if (st === 'jump') return ps === 'attack' ? 0.12 : 0.06; // volta do golpe aéreo assenta, decolagem é seca
    if (st === 'down') return 0.15;
    if (st === 'getup') return 0.18;
    if (ATTACKING.has(ps)) return fe.blendOut;
    if (ps === 'getup') return 0.28;
    if (ps === 'jump') return 0.1; // aterrissagem
    if (REACT.has(ps)) return 0.16 * fe.weight;
    if (ps === 'dash') return 0.14;
    if (k === 'walk' || k === 'walkBack' || ps === 'walk') return 0.2 * fe.weight;
    return 0.12;
  }

  // camada procedural de peso por cima do clip: antecipação → follow-through nos golpes, reação ao apanhar
  // (alta = cabeça vai pra trás, média = dobra o corpo, baixa = pernas cedem), squash no pulo/queda, tremida no hitstop
  updateFeel(dt, f, match, model) {
    const fe = this.feel, L = fe.lean, S = fe.squash;
    const air = f.y > 0.001;
    let leanT = 0, pushT = 0;
    const mv = f.state === 'attack' ? f.move : f.state === 'special' ? f.sp : null;
    if (mv && !mv.air) {
      const s = mv.startup, a = Math.min(mv.active || 2, 6), hm = mv.heavy || f.state === 'special' ? 1.5 : 1;
      if (f.t < s) { const p = Math.min(1, f.t / Math.max(1, s * 0.8)); leanT = -0.06 * L * hm * p; pushT = -0.035 * L * hm * p; } // antecipação: recua o peso
      else if (f.t < s + a + 4) { leanT = 0.1 * L * hm; pushT = 0.07 * L * hm; } // impacto: corpo entra no golpe
      // recuperação: alvo 0 → a mola passa um pouco do ponto (follow-through) e assenta
    } else if (f.state === 'walk') {
      leanT = f.animKey === 'walkBack' ? -0.035 * L : 0.045 * L;
    } else if (f.state === 'dash') {
      const k = f.t / Math.max(1, f.animLen);
      leanT = (f.dashDir > 0 ? 0.17 : -0.12) * L * (1 - k * k);
    } else if (f.state === 'blockstun') {
      leanT = -0.07;
    }
    // golpe recebido: pose de impacto na hora (aparece já congelada no hitstop) e a mola devolve depois
    const hi = f.hitInfo;
    if (hi && hi.seq !== this.hitSeen) {
      this.hitSeen = hi.seq;
      const R = fe.react * hi.force;
      if (hi.zone === 'high') { this.lean.x = -0.32 * R; this.push.x = -0.12 * R; this.squash.x = 0.03 * R; }
      else if (hi.zone === 'mid') { this.lean.x = 0.24 * R; this.push.x = -0.1 * R; this.squash.x = -0.06 * R; }
      else { this.lean.x = 0.1 * R; this.push.x = -0.06 * R; this.squash.x = -0.13 * R; }
      this.lean.v = this.push.v = this.squash.v = 0;
      if (hi.heavy && f.state === 'hitstun' && !air) this.hop.v += 1.3 * R; // golpe pesado tira o pé do chão (arco curto)
      this.hitShake = 0.035 * Math.min(1.4, hi.force) * fe.react;
    }
    // decolagem (estica) e aterrissagem (amassa); queda de knockdown quica
    if (air && !this.wasAir && f.state === 'jump') { this.squash.x = 0.1 * S; this.squash.v = 0; }
    if (!air && this.wasAir) {
      if (f.state === 'down' || f.state === 'ko') { this.hop.v += 1.1; this.squash.x = -0.12; }
      else { this.squash.x = -0.14 * S; this.squash.v = 0; this.lean.v += 0.6 * L; }
    }
    if (f.state === 'dash' && this.prevFeelState !== 'dash') { this.lean.v += (f.dashDir > 0 ? 2 : -1.6) * L; this.squash.x = -0.06 * S; }
    this.prevFeelState = f.state;
    this.wasAir = air;

    const lean = clamp(this.lean.step(leanT, dt), -0.5, 0.5);
    const push = clamp(this.push.step(pushT, dt), -0.3, 0.3);
    this.hop.step(0, dt);
    if (this.hop.x < 0) { this.hop.x = 0; this.hop.v = Math.abs(this.hop.v) * 0.3; } // não afunda no chão
    const hop = this.hop.x;
    const sq = clamp(this.squash.step(0, dt), -0.2, 0.2);
    // hitstop: o corpo de quem apanhou treme no lugar enquanto tudo está congelado
    const frozen = match && match.hitstop > 0 && hi && match.frame - hi.frame < 24;
    const jitter = frozen ? Math.sin(performance.now() * 0.09) * (this.hitShake || 0) : 0;
    const standing = 1 - this.lay;
    const o = model.object;
    o.rotation.x = -this.lay * Math.PI / 2 + lean * standing;
    o.position.set(0, hop, push * standing + jitter);
    const sy = 1 + sq, sxz = 1 / Math.sqrt(sy);
    o.scale.set(sxz, sy, sxz);
  }

  resetFeel(m) {
    if (!m) return;
    m.object.position.set(0, 0, 0); m.object.scale.set(1, 1, 1); m.object.rotation.x = 0;
  }

  setForm(form) {
    this.resetFeel(this.base); this.resetFeel(this.ultimateModel);
    this.form = form;
    if (this.ultimateModel) {
      this.base.object.visible = form !== 'ultimate';
      this.ultimateModel.object.visible = form === 'ultimate';
    }
    this.lastSeq = -1;
  }

  dispose() {
    this.scene.remove(this.group, this.blob);
    if (this.aura) this.scene.remove(this.aura);
    this.base.dispose();
    this.ultimateModel?.dispose();
    this.ultFx?.dispose();
    this.spFx?.dispose();
    this.status.dispose();
  }
}
