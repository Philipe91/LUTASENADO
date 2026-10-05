// Efeitos presos ao CORPO do lutador durante especiais (o que não é Hitter solto no mundo).
// Configurado por personagem em visual.specialFx = { <dir>: { type, ... } }. Cada tipo é uma classe com
// update(dt, f, model, sp) — `sp` é o especial ativo dessa direção ou null (aí o efeito termina de sumir).
//   speech   — pulsos de voz (arcos) saindo da boca na direção do golpe durante os frames ativos (Lulácio)
//   propHand — objeto na mão (ex.: picanha) do início do especial até o frame de spawn (startup), depois some
//   rajada / motociata — Capitão Brasa (fx/brasaFx.js)
//   roar / throwUp / stomp — Dino Supremo (fx/dinoFx.js)
import * as THREE from 'three';
import { PROJECTILE_VISUALS } from './projectiles.js';
import { BRASA_FX } from './fx/brasaFx.js';
import { DINO_FX } from './fx/dinoFx.js';
import { NIKOLAS_FX } from './fx/nikolasFx.js';
import { ERIKA_FX } from './fx/erikaFx.js';
import { VORCARO_FX } from './fx/vorcaroFx.js';
import { FLAVIO_FX } from './fx/flavioFx.js';
import { DUVAL_FX } from './fx/duvalFx.js';
import { DILMA_FX } from './fx/dilmaFx.js';
import { HADDAD_FX } from './fx/haddadFx.js';
import { BOULOS_FX } from './fx/boulosFx.js';
import { RENAN_FX } from './fx/renanFx.js';
import { bodyPoint, clamp01 } from './fx/common.js';

class SpeechFx {
  constructor(scene) {
    this.scene = scene; this.v = new THREE.Vector3();
    this.arcs = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.4, 32, 1, -Math.PI / 3, (Math.PI * 2) / 3),
        new THREE.MeshBasicMaterial({ color: 0xffc93a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      m.visible = false; scene.add(m);
      return m;
    });
  }
  update(dt, f, model, sp) {
    for (const a of this.arcs) a.visible = false;
    if (!sp) return;
    bodyPoint(this.v, f, model, 'head', { y: f.stats.height * 0.88 });
    const t0 = sp.startup, t1 = sp.startup + sp.active;
    const reach = (sp.box?.x ?? 0.3) + (sp.box?.w ?? 1.7);
    this.arcs.forEach((a, i) => {
      const born = t0 + i * 4, age = f.t - born;
      if (born >= t1 || age < 0 || age > 14) return;
      const q = age / 14;
      a.visible = true;
      a.position.set(this.v.x + f.facing * (0.25 + q * reach), this.v.y - 0.05 - q * 0.35, 0.3);
      a.rotation.set(0, 0, f.facing > 0 ? 0 : Math.PI);
      a.scale.setScalar(0.7 + q * 1.6);
      a.material.opacity = 0.9 * (1 - q);
    });
  }
  dispose() { this.scene.remove(...this.arcs); }
}

class PropHandFx {
  constructor(scene, c) {
    this.scene = scene; this.c = c; this.v = new THREE.Vector3();
    this.p = PROJECTILE_VISUALS[c.visual].build(); this.p.visible = false; scene.add(this.p);
    // prop com pegada (ex.: espeto da picanha): a mão fica no cabo, não no meio do objeto
    const u = this.p.userData, grip = u.skewer?.userData.grip;
    if (grip && u.spin) { u.spin.position.copy(grip).multiplyScalar(-(u.skewer.scale.x || 1)); u.spin.parent.rotation.set(0, 0, 0.9); }
  }
  update(dt, f, model, sp) {
    this.p.visible = false;
    if (!sp || f.t >= sp.startup) return; // no frame de spawn o objeto "sai" da mão (vira o projétil)
    bodyPoint(this.v, f, model, this.c.hand || 'righthand', { dx: 0.3, y: f.stats.height * 0.6 });
    this.p.visible = true;
    this.p.position.copy(this.v);
    this.p.scale.setScalar((this.p.userData.handScale ?? 0.5) * clamp01(f.t / 3));
    if (this.p.userData.skewer) this.p.rotation.y = f.facing > 0 ? 0 : Math.PI;
    this.p.userData.spin && (this.p.userData.spin.rotation.z = 0);
  }
  dispose() { this.scene.remove(this.p); }
}

const TYPES = { speech: SpeechFx, propHand: PropHandFx, ...BRASA_FX, ...DINO_FX, ...NIKOLAS_FX, ...ERIKA_FX, ...VORCARO_FX, ...FLAVIO_FX, ...DUVAL_FX, ...DILMA_FX, ...HADDAD_FX, ...BOULOS_FX, ...RENAN_FX };

export class SpecialFx {
  constructor(scene, cfg) {
    this.scene = scene;
    this.fx = {};
    for (const [dir, c] of Object.entries(cfg || {})) {
      if (TYPES[c.type]) this.fx[dir] = new TYPES[c.type](scene, c);
    }
  }

  update(dt, f, model) {
    const sp = f.state === 'special' ? f.sp : null;
    for (const [dir, fx] of Object.entries(this.fx)) fx.update(dt, f, model, sp && sp.dir === dir ? sp : null);
  }

  dispose() { for (const fx of Object.values(this.fx)) fx.dispose?.(); }
}
