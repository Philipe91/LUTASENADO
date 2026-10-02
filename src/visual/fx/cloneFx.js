// CLONE / ECO / SOMBRA — cópia translúcida de um lutador (holograma do Zero Um, rastro da Operação Tática,
// sombras da DINASTIA). Usa o PlaceholderModel do personagem com material de holograma: funciona para qualquer
// lutador (é "modelo simplificado" por definição, mesmo quando o GLB existir). Interface do Hitter: visual 'clone'
// com h.clone = { data, anim, x, delay, life } (criado em Fighter.updateSpecial a partir de special.clone).
import * as THREE from 'three';
import { PlaceholderModel } from '../models/PlaceholderModel.js';
import { Rings, clamp01 } from './common.js';

// fantasma: PlaceholderModel com um único material translúcido e sem etiqueta de nome
export function makeGhost(data, { color = 0x5fe08a, emissive = 0x1aff8a, opacity = 0.6, intensity = 0.7 } = {}) {
  const model = new PlaceholderModel(data);
  const mat = new THREE.MeshToonMaterial({ color, emissive, emissiveIntensity: intensity, transparent: true, opacity, depthWrite: false });
  model.object.traverse((o) => {
    if (o.isMesh) { o.material = mat; o.castShadow = false; o.renderOrder = 4; }
    if (o.isSprite) o.visible = false;
  });
  return { model, mat, object: model.object, dispose() { model.dispose(); mat.dispose(); } };
}

export const CLONE_VISUALS = {
  clone: {
    build() {
      const g = new THREE.Group();
      const holder = new THREE.Group(); g.add(holder);
      const rings = new Rings(g, 2, 0x8cff9a, { inner: 0.75, outer: 0.95 });
      g.userData = { holder, rings, of: null, ghost: null, offY: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, c = h.clone;
      if (!c) return;
      if (u.of !== c.data) { // reuso do pool com outro personagem: refaz o fantasma
        if (u.ghost) { u.holder.remove(u.ghost.object); u.ghost.dispose(); }
        u.ghost = makeGhost(c.data); u.of = c.data;
        u.ghost.object.rotation.y = Math.PI / 2; // olha para +x local
        u.holder.add(u.ghost.object);
      }
      if (u.lastId !== h.id) {
        u.lastId = h.id;
        u.ghost.model.play('idle', 0); u.ghost.model.update(0.5);
        u.ghost.model.play(c.anim || 'punch3', (c.delay ?? 8) + 10);
        u.rings.spawn(0, 0.03, { from: 0.2, to: 1.8, life: 0.3, opacity: 0.8 });
      }
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      u.holder.position.x = (c.x - h.x) * h.facing; // pés do clone (o Hitter fica onde o soco acerta)
      const inK = clamp01(h.t / 4), outK = clamp01((h.delay + h.life - h.t) / 6), k = Math.min(inK, outK);
      // "liga" como TV: cresce em altura, pisca como holograma
      u.holder.scale.set(1, Math.max(0.01, k), 1);
      u.ghost.mat.opacity = (0.45 + 0.25 * Math.abs(Math.sin(h.t * 1.9))) * k;
      u.ghost.model.update(dt);
      u.rings.update(dt);
    },
  },
};
