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
import { SpecialFx } from './SpecialFx.js';

const ULTIMATE_FX = { xandorAvatar: XandorAvatar, lulacioPolvo: LulacioPolvo };

const LYING = new Set(['knockdown', 'down', 'ko', 'getup']);

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
    this.group.position.set(f.x, f.y, 0);
    const targetTurn = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.turn += (targetTurn - this.turn) * Math.min(1, dt * 18);
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
      model.play(f.animKey, f.animLen, LOOPING.has(f.animKey), mv && { startup: mv.startup, active: mv.active, recovery: mv.recovery });
    }
    const vy0 = JUMP_V * (f.stats.jump || 1);
    const airP = f.y > 0 ? Math.max(0, Math.min(1, (vy0 - f.vy) / (2 * vy0))) : 1;
    model.update(dt, { low: f.isLow, key: f.animKey, moveT: f.state === 'attack' || f.state === 'special' ? f.t : undefined, airP });
    // GLB sem animação de queda/KO: deita o modelo proceduralmente (nunca fica em pé nocauteado)
    const lying = LYING.has(f.animKey) && model.hasClip && !model.hasClip(f.animKey === 'getup' ? 'getup' : 'ko');
    const layTarget = lying ? (f.animKey === 'getup' ? Math.max(0, 1 - f.t / 18) : 1) : 0;
    this.lay += (layTarget - this.lay) * Math.min(1, dt * 12);
    model.object.rotation.x = -this.lay * Math.PI / 2;
    // ultimate com VFX próprio: brilho dourado FIXO (sem piscar); sem VFX: stand-in piscando (antigo)
    const ultBlink = this.form === 'ultimate' && !this.ultimateModel && !this.ultFx && Math.floor(performance.now() / 90) % 2 === 0;
    model.setFlash(f.flash > 0 || ultBlink, this.form === 'ultimate' && this.ultFx ? tr.tint : null);
    this.ultFx?.update(dt, f, match, model);
    this.spFx?.update(dt, f, model);
    if (this.ultFx) model.object.visible = !this.ultFx.hideBase; // polvo substitui o corpo

    this.blob.position.x = f.x;
    const s = Math.max(0.4, 1 - f.y * 0.25) * this.formScale;
    this.blob.scale.set(s, s, s);
    if (this.aura) {
      this.aura.position.x = f.x;
      this.aura.material.opacity = 0.18 + Math.sin(performance.now() / 300) * 0.08;
    }
  }

  setForm(form) {
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
  }
}
