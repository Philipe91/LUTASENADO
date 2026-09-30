// Modelo definitivo: GLB externo (Meshy → rig humanoide → GLB).
// Normaliza escala/pé no chão/orientação, clona materiais por instância e toca clips por chave de animação.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { buildBoneIndex, hipsRestY, retargetClip } from './retarget.js';
import { rigidifyNearBones, robeToHips } from './skinFix.js';
import { CLIP_NAMES, ANIM_FALLBACK } from '../animKeys.js';

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('draco/'); // decodificador local (public/draco), sem depender de CDN
loader.setDRACOLoader(draco);
const cache = new Map();

export function loadGLTF(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

// chaves em que a física controla a altura: a animação fica sem subir/descer o quadril
const LOCK_Y_KEYS = new Set(['jump', 'airPunch', 'airKick', 'knockdown']);

const normClip =(s) => s.toLowerCase().replace(/^.*\|/, '').replace(/mixamo\.com/g, '').replace(/[_-]+/g, ' ').trim();

export class GLBModel {
  // visual: { model, height, yaw, clips, boneAliases, animations? }
  // animSources: [{ key, url }] (clip vira exatamente `key`) ou 'url' (mantém os nomes dos clips do arquivo)
  static async create(visual, animSources = []) {
    const gltf = await loadGLTF(visual.model);
    const m = new GLBModel(gltf, visual);
    // animações que vieram dentro do próprio modelo têm prioridade (setClips mantém a 1ª de cada nome)
    const lockY = new Set(Object.entries(visual.clips || {}).filter(([k]) => LOCK_Y_KEYS.has(k)).map(([, n]) => n));
    const clips = gltf.animations.map((c) => retargetClip(c, m.bones, 1, lockY.has(c.name)));
    const sources = [...(visual.animations || []), ...animSources].map((s) => (typeof s === 'string' ? { url: s } : s));
    await Promise.all(sources.map(async (src) => {
      try {
        const lib = await loadGLTF(src.url);
        const libBones = buildBoneIndex(lib.scene);
        const srcY = hipsRestY(libBones), dstY = hipsRestY(m.bones);
        const scale = srcY && dstY ? dstY / srcY : 1;
        const list = src.key ? lib.animations.slice(0, 1) : lib.animations;
        for (const c of list) {
          const r = retargetClip(c, m.bones, scale);
          if (src.key) r.name = src.key;
          clips.push(r);
        }
      } catch (e) {
        console.info('[visual] animação indisponível:', src.url);
      }
    }));
    m.setClips(clips);
    return m;
  }

  constructor(gltf, visual) {
    this.visual = visual;
    this.object = new THREE.Group();
    const model = cloneSkinned(gltf.scene);
    model.rotation.y = visual.yaw || 0;
    this.materials = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = Array.isArray(o.material) ? o.material.map((mm) => mm.clone()) : o.material.clone();
      for (const mm of [].concat(o.material)) if (mm.emissive) this.materials.push(mm);
    });
    // correção de skin (ex.: dedos colados na coxa) — ver skinFix.js
    if (visual.rigidBones) {
      const n = rigidifyNearBones(model, visual.rigidBones);
      console.info(`[visual] skinFix: ${n} vértices presos ao osso da mão`);
    }
    if (visual.robeFix) {
      const n = robeToHips(model, visual.robeFix);
      console.info(`[visual] robeFix: ${n} vértices da toga presos ao quadril`);
    }
    // normaliza altura e coloca o pé no chão
    model.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0) model.scale.multiplyScalar((visual.height || 1.8) / size.y);
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
    this.object.add(model);
    this.model = model;
    this.bones = buildBoneIndex(model, visual.boneAliases);
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = new Map();
    this.current = null;
  }

  setClips(clips) {
    for (const c of clips) {
      const n = normClip(c.name);
      if (!this.clips.has(n)) this.clips.set(n, c);
    }
  }

  findClip(key) {
    const seen = new Set();
    for (let k = key; k && !seen.has(k); k = ANIM_FALLBACK[k]) {
      seen.add(k);
      const override = this.visual.clips?.[k];
      const names = override ? [override] : (CLIP_NAMES[k] || [k]);
      for (const name of names) {
        const n = normClip(name);
        if (this.clips.has(n)) return this.clips.get(n);
      }
      for (const name of names) {
        const n = normClip(name);
        for (const [cn, c] of this.clips) if (cn.includes(n)) return c;
      }
    }
    return this.clips.get('idle') || this.clips.values().next().value || null;
  }

  // true se existe clip próprio para a chave (sem cair na cadeia de fallback)
  hasClip(key) {
    const override = this.visual.clips?.[key];
    const names = override ? [override] : (CLIP_NAMES[key] || [key]);
    return names.some((n) => this.clips.has(normClip(n)));
  }

  play(key, lenFrames, loop) {
    const clip = this.findClip(key);
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    const prev = this.current;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.timeScale = !loop && lenFrames ? clip.duration / (lenFrames / 60) : 1;
    // chaves tocadas de ré (ex.: andar pra trás usando o clip de andar)
    if (this.visual.reverseKeys?.includes(key)) action.timeScale *= -1;
    action.setEffectiveWeight(1);
    action.play();
    if (prev && prev !== action) action.crossFadeFrom(prev, 0.08, false);
    this.current = action;
  }

  update(dt) { this.mixer.update(dt); }

  setFlash(on) {
    if (on === this.flashing) return;
    this.flashing = on;
    for (const m of this.materials) {
      const u = m.userData;
      if (u.baseEmissive === undefined) { u.baseEmissive = m.emissive.getHex(); u.baseIntensity = m.emissiveIntensity; }
      m.emissive.setHex(on ? 0xffffff : u.baseEmissive);
      m.emissiveIntensity = on ? 0.6 : u.baseIntensity;
    }
  }

  dispose() { this.mixer.stopAllAction(); }
}
