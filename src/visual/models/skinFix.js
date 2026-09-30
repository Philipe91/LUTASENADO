// Correção de pesos de skin feita no carregamento (sem Blender).
// Problema típico do image-to-3D: a mão encosta na roupa/coxa na pose original, e o auto-rig
// divide os vértices dos dedos entre o osso da mão e o do quadril/perna → os dedos "esticam" até a perna.
// Solução: todo vértice dentro de um raio do osso da mão passa a seguir 100% esse osso.
import * as THREE from 'three';
import { normBone } from './retarget.js';

// Toga/casaco longo: o auto-rig divide o tecido entre as duas pernas → ao andar a toga "rasga" (perna quebrada).
// Vértices abaixo do quadril que estão LONGE dos ossos da perna (tecido solto, não a calça) passam a seguir o quadril.
// maxDist: distância ao eixo da perna (unid. do modelo) a partir da qual é tecido solto.
export function robeToHips(root, { maxDist = 0.1 } = {}) {
  let changed = 0;
  const done = new Set();
  root.traverse((mesh) => {
    if (!mesh.isSkinnedMesh || done.has(mesh.geometry)) return;
    done.add(mesh.geometry);
    const { skeleton, geometry, bindMatrix } = mesh;
    const bindPos = (name) => {
      const i = skeleton.bones.findIndex((b) => normBone(b.name) === name);
      return i < 0 ? null : { i, p: new THREE.Vector3().setFromMatrixPosition(skeleton.boneInverses[i].clone().invert()) };
    };
    const hips = bindPos('hips');
    const chain = ['leftupleg', 'leftleg', 'leftfoot', 'rightupleg', 'rightleg', 'rightfoot'].map(bindPos);
    if (!hips || chain.some((c) => !c)) return;
    const segs = [[chain[0], chain[1]], [chain[1], chain[2]], [chain[3], chain[4]], [chain[4], chain[5]]]
      .map(([a, b]) => new THREE.Line3(a.p, b.p));
    const pos = geometry.attributes.position, si = geometry.attributes.skinIndex, sw = geometry.attributes.skinWeight;
    const v = new THREE.Vector3(), c = new THREE.Vector3();
    const top = hips.p.y, bottom = Math.min(chain[2].p.y, chain[5].p.y);
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(bindMatrix);
      if (v.y > top || v.y < bottom) continue;
      let d = Infinity;
      for (const s of segs) d = Math.min(d, s.closestPointToPoint(v, true, c).distanceTo(v));
      if (d < maxDist) continue;
      si.setXYZW(k, hips.i, 0, 0, 0);
      sw.setXYZW(k, 1, 0, 0, 0);
      changed++;
    }
    si.needsUpdate = true;
    sw.needsUpdate = true;
  });
  return changed;
}

// fixes: [{ bone: 'lefthand', radius: 0.12 }] — raio em unidades do modelo original (antes da normalização)
export function rigidifyNearBones(root, fixes) {
  if (!fixes?.length) return 0;
  let changed = 0;
  const done = new Set();
  root.traverse((mesh) => {
    if (!mesh.isSkinnedMesh || done.has(mesh.geometry)) return;
    done.add(mesh.geometry);
    const { skeleton, geometry, bindMatrix } = mesh;
    const pos = geometry.attributes.position;
    const si = geometry.attributes.skinIndex, sw = geometry.attributes.skinWeight;
    const targets = [];
    for (const f of fixes) {
      const idx = skeleton.bones.findIndex((b) => normBone(b.name) === f.bone);
      if (idx < 0) continue;
      const bindPos = new THREE.Vector3().setFromMatrixPosition(skeleton.boneInverses[idx].clone().invert());
      targets.push({ idx, bindPos, r2: f.radius * f.radius });
    }
    if (!targets.length) return;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(bindMatrix);
      for (const t of targets) {
        if (v.distanceToSquared(t.bindPos) > t.r2) continue;
        si.setXYZW(i, t.idx, 0, 0, 0);
        sw.setXYZW(i, 1, 0, 0, 0);
        changed++;
        break;
      }
    }
    si.needsUpdate = true;
    sw.needsUpdate = true;
  });
  return changed;
}
