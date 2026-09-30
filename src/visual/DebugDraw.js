// F1: mostra hurtboxes (verde), hitboxes ativas (vermelho) e projéteis (laranja).
import * as THREE from 'three';

const unit = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.05));

export class DebugDraw {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.pool = [];
  }
  box(i, b, color) {
    let l = this.pool[i];
    if (!l) {
      l = new THREE.LineSegments(unit, new THREE.LineBasicMaterial({ color, depthTest: false }));
      l.renderOrder = 20;
      this.scene.add(l);
      this.pool[i] = l;
    }
    l.material.color.setHex(color);
    l.visible = true;
    l.scale.set(b.w, b.h, 1);
    l.position.set(b.x + b.w / 2, b.y + b.h / 2, 0.6);
  }
  update(match) {
    let i = 0;
    if (this.enabled && match) {
      for (const f of match.fighters) {
        const h = f.hurtbox();
        if (h) this.box(i++, h, 0x3cff6a);
        const a = f.activeAttack();
        if (a) this.box(i++, a.box, 0xff2d2d);
      }
      for (const h of match.hitters) if (h.armed) this.box(i++, h.box(), 0xffa020);
    }
    for (; i < this.pool.length; i++) this.pool[i].visible = false;
  }
}
