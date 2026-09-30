// Efeitos presos ao CORPO do lutador durante especiais (o que não é Hitter solto no mundo).
// Configurado por personagem em visual.specialFx = { <dir>: { type, ... } }:
//   speech  — pulsos de voz (arcos) saindo da boca na direção do golpe durante os frames ativos
//   propHand — objeto na mão (ex.: picanha) do início do especial até o frame de spawn (startup), depois some
import * as THREE from 'three';
import { PROJECTILE_VISUALS } from './projectiles.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class SpecialFx {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg || {};
    this.v = new THREE.Vector3();
    // pulsos de voz: 6 arcos reciclados
    this.arcs = Array.from({ length: 6 }, () => {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.4, 32, 1, -Math.PI / 3, (Math.PI * 2) / 3),
        // arco sólido amarelo-quente (aditivo sumia no chão claro)
        new THREE.MeshBasicMaterial({ color: 0xffc93a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      m.visible = false; scene.add(m);
      return m;
    });
    this.props = {};
  }

  prop(dir, c) {
    if (!this.props[dir]) {
      const p = PROJECTILE_VISUALS[c.visual].build();
      p.visible = false; this.scene.add(p);
      this.props[dir] = p;
    }
    return this.props[dir];
  }

  update(dt, f, model) {
    const sp = f.state === 'special' ? f.sp : null;
    const c = sp ? this.cfg[sp.dir] : null;
    for (const a of this.arcs) a.visible = false;
    for (const p of Object.values(this.props)) p.visible = false;
    if (!c || !model?.bones) return;

    if (c.type === 'speech') {
      const head = model.bones.get('head');
      if (!head) return;
      head.getWorldPosition(this.v);
      const t0 = sp.startup, t1 = sp.startup + sp.active;
      const reach = (sp.box?.x ?? 0.3) + (sp.box?.w ?? 1.7);
      // um arco nasce a cada 4 frames na janela ativa e viaja até o fim do alcance do golpe
      this.arcs.forEach((a, i) => {
        const born = t0 + i * 4;
        const age = f.t - born;
        if (born >= t1 || age < 0 || age > 14) return;
        const q = age / 14;
        a.visible = true;
        a.position.set(this.v.x + f.facing * (0.25 + q * reach), this.v.y - 0.05 - q * 0.35, 0.3);
        a.rotation.set(0, 0, f.facing > 0 ? 0 : Math.PI); // arco de frente pra câmera, abrindo na direção do golpe
        a.scale.setScalar(0.7 + q * 1.6);
        a.material.opacity = 0.9 * (1 - q);
      });
    } else if (c.type === 'propHand') {
      if (f.t >= sp.startup) return; // no frame de spawn a picanha "sai" da mão (vira o projétil)
      const hand = model.bones.get(c.hand || 'righthand');
      if (!hand) return;
      const p = this.prop(sp.dir, c);
      hand.getWorldPosition(this.v);
      p.visible = true;
      p.position.copy(this.v);
      p.scale.setScalar(0.8 * clamp01(f.t / 3));
      p.userData.spin && (p.userData.spin.rotation.z = 0);
    }
  }

  dispose() {
    this.scene.remove(...this.arcs, ...Object.values(this.props));
  }
}
