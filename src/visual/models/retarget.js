// Retarget por NOME de osso: permite que um único pacote de animações (shared.glb)
// sirva para todos os personagens rigados com o mesmo esqueleto (Mixamo / Meshy humanoide).
import * as THREE from 'three';

export function normBone(name) {
  return name.toLowerCase()
    .replace(/_\d+$/, '') // GLTFLoader renomeia nós duplicados para "Nome_1"
    .replace(/^mixamorig\d*[:_]?/, '')
    .replace(/^(armature|rig|skeleton)[|_:.]?/, '')
    .replace(/[^a-z0-9]/g, '');
}

// Índice: nome normalizado -> nome real do nó no modelo. `aliases` resolve esqueletos com nomes diferentes.
export function buildBoneIndex(root, aliases = {}) {
  const idx = new Map();
  root.traverse((o) => {
    if (!o.isBone) return;
    const n = normBone(o.name);
    if (n && !idx.has(n)) idx.set(n, o);
  });
  for (const [from, to] of Object.entries(aliases)) {
    const target = idx.get(normBone(to));
    if (target) idx.set(normBone(from), target);
  }
  return idx;
}

export function hipsRestY(idx) {
  return idx.get('hips')?.position.y ?? null;
}

// - troca o nome dos tracks para os ossos do modelo
// - descarta position/scale de todos os ossos exceto hips (proporções diferentes não quebram)
// - hips fica "in place" (x/z travados) e com a altura reescalada para o corpo do modelo
export function retargetClip(clip, idx, hipsScale = 1, lockY = false) {
  const tracks = [];
  for (const tr of clip.tracks) {
    const dot = tr.name.lastIndexOf('.');
    const n = normBone(tr.name.slice(0, dot));
    const prop = tr.name.slice(dot + 1);
    const bone = idx.get(n);
    if (!bone || prop === 'scale') continue;
    const t = tr.clone();
    t.name = `${bone.name}.${prop}`;
    if (prop === 'position') {
      if (n !== 'hips') continue;
      // lockY: a física do jogo já sobe/desce o lutador (pulo, arremesso) → a animação não pode somar altura
      const v = t.values, x0 = v[0], y0 = v[1], z0 = v[2];
      for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 1] = (lockY ? y0 : v[i + 1]) * hipsScale; v[i + 2] = z0; }
    }
    tracks.push(t);
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
