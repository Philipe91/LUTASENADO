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

// QUEDA / CHÃO / LEVANTAR guiados pela lógica (segundos do clip). Os clips padrão do Meshy são longos e começam
// em pé (Dead fica 1,8s parado antes de cair; Fall_Down leva 4,7s; Stand_Up1 8,3s), então a queda de 0,4s do jogo
// mostrava o lutador EM PÉ no ar e "morrendo de novo" no chão. Aqui cada chave raspa só o trecho útil:
//   knockdown: tomba no ar (progresso do voo) · ko: tomba e assenta · down: pose deitada parada · getup: só a subida
// visual.timeline[clip][chave] = [de, até] sobrescreve.
const POSE_TIMELINES = {
  dead: { knockdown: [1.2, 2.1], ko: [1.2, 2.95], down: [2.95, 2.95] },
  'stand up1': { getup: [1.85, 6.2] },
};

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
      this.resolvedKey = k; // chave que realmente achou o clip (ex.: backdash → walkBack, que pode tocar de ré)
      for (const name of names) {
        const n = normClip(name);
        if (this.clips.has(n)) return this.clips.get(n);
      }
      for (const name of names) {
        const n = normClip(name);
        for (const [cn, c] of this.clips) if (cn.includes(n)) return c;
      }
    }
    this.resolvedKey = 'idle';
    return this.clips.get('idle') || this.clips.values().next().value || null;
  }

  timelineFor(clip, key) {
    const n = normClip(clip.name);
    return this.visual.timeline?.[n]?.[key] || POSE_TIMELINES[n]?.[key] || null;
  }

  // true se existe clip próprio para a chave (sem cair na cadeia de fallback)
  hasClip(key) {
    const override = this.visual.clips?.[key];
    const names = override ? [override] : (CLIP_NAMES[key] || [key]);
    return names.some((n) => this.clips.has(normClip(n)));
  }

  // phases: { startup, active, recovery } (frames da lógica) — com visual.timing[key] = { start, contact, activeEnd, end }
  // (segundos do clip) o clip é "raspado" pelo frame da lógica: preparação→contato cai no 1º frame ativo.
  // fade: duração do crossfade (s) escolhida pelo FighterView por tipo de transição (golpe entra seco, volta pra guarda suave)
  play(key, lenFrames, loop, phases, fade = 0.1) {
    let clip0 = this.findClip(key);
    if (!clip0) return;
    // knockdown usa o trecho de queda do clip de KO (Dead), se houver — o Fall_Down do Meshy é lento demais
    if (key === 'knockdown') {
      const dead = this.findClip('ko');
      if (dead && this.timelineFor(dead, 'knockdown')) clip0 = dead;
    }
    const tl = this.timelineFor(clip0, key);
    // mesmo clip tocando de novo (hit em sequência, jab → soco agachado): usa uma 2ª ação do mesmo clip
    // para poder fazer crossfade entre as duas — sem isso o reset() "teleporta" a pose (pop)
    let clip = clip0;
    if (this.current && this.current.getClip() === clip0) {
      this.alt ||= new Map();
      if (!this.alt.has(clip0)) { const c = clip0.clone(); c.name = clip0.name + '#b'; this.alt.set(clip0, c); }
      clip = this.alt.get(clip0);
    } else if (this.current && this.alt?.get(clip0) === this.current.getClip()) {
      clip = clip0;
    }
    const tm = this.visual.timing?.[key];
    this.scrub = tm && phases && !loop ? { tm, ...phases } : null;
    // pulo: clip raspado pelo progresso do voo (subida→ápice→descida), não em loop; volta de golpe aéreo não reinicia
    const js = key === 'jump' && this.visual.jumpScrub;
    this.jumpScrub = js ? { ...js, dur: clip.duration } : null;
    if (js) loop = false;
    const action = this.mixer.clipAction(clip);
    const prev = this.current;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.timeScale = !loop && lenFrames ? clip.duration / (lenFrames / 60) : 1;
    // chaves tocadas de ré (ex.: andar pra trás usando o clip de andar)
    if (this.visual.reverseKeys?.includes(key) || this.visual.reverseKeys?.includes(this.resolvedKey)) {
      action.timeScale *= -1;
      if (!loop) action.time = clip.duration; // de ré, tocando 1×: começa do fim (senão termina na hora)
    }
    if (this.scrub) { action.timeScale = 0; action.time = this.scrub.tm.start; }
    if (this.jumpScrub) { action.timeScale = 0; action.clampWhenFinished = true; }
    this.timeline = tl;
    if (tl) { action.timeScale = 0; action.clampWhenFinished = true; action.time = tl[0]; }
    action.setEffectiveWeight(1);
    action.play();
    if (prev && prev !== action && fade > 0) action.crossFadeFrom(prev, fade, false);
    else if (prev && prev !== action) prev.stop();
    this.current = action;
  }

  // pose: { low } — agachado (hurtbox a 62%): pose procedural por cima do clip, serve para qualquer personagem
  update(dt, pose = {}) {
    // camada procedural IDEMPOTENTE: desfaz o delta do frame anterior antes do mixer
    // (osso sem track volta à base; com track o mixer reescreve) e aplica de novo 1× — não acumula em hitstop/dt=0
    this.undoCrouch();
    if (this.scrub && pose.moveT !== undefined && this.current) this.current.time = this.scrubTime(pose.moveT);
    if (this.timeline && pose.prog !== undefined && this.current) {
      const [a, b] = this.timeline, p = Math.max(0, Math.min(1, pose.prog));
      this.current.time = a + (b - a) * (1 - (1 - p) * (1 - p)); // ease-out: tomba rápido, assenta devagar
    }
    if (this.jumpScrub && pose.airP !== undefined && this.current) {
      const j = this.jumpScrub;
      this.current.time = (j.from + (j.to - j.from) * pose.airP) * j.dur;
    }
    this.mixer.update(dt);
    this.lowAmt = (this.lowAmt || 0) + ((pose.low ? 1 : 0) - (this.lowAmt || 0)) * Math.min(1, dt * 14);
    // correção de pose por chave (ex.: guarda do Xandor): visual.poseFix = { keys:[...], rots:[{bone, axis:[x,y,z], ang}] }
    const pf = this.visual.poseFix;
    const want = pf && (pf.keys.includes('*') || pf.keys.includes(pose.key)) ? 1 : 0;
    this.fixAmt = (this.fixAmt || 0) + (want - (this.fixAmt || 0)) * Math.min(1, dt * 12);
    const rots = [];
    let dy = 0;
    if (pf && this.fixAmt > 0.01) for (const r of pf.rots) this.rotBone(rots, r.bone, new THREE.Vector3(...r.axis).normalize(), r.ang * this.fixAmt);
    const pi = this.visual.poseFixIdle; // 2ª camada, só em algumas chaves (blend próprio)
    this.fixIdle = (this.fixIdle || 0) + ((pi && pi.keys.includes(pose.key) ? 1 : 0) - (this.fixIdle || 0)) * Math.min(1, dt * 12);
    if (pi && this.fixIdle > 0.01) for (const r of pi.rots) this.rotBone(rots, r.bone, new THREE.Vector3(...r.axis).normalize(), r.ang * this.fixIdle);
    if (this.lowAmt > 0.01) dy = this.applyCrouch(rots, this.lowAmt, pose.key);
    this.crouchApplied = rots.length || dy ? { rots, hips: this.bones.get('hips'), dy } : null;
  }

  scrubTime(f) {
    const { tm, startup: s, active: a, recovery: r } = this.scrub;
    const lerp = (x, y, k) => x + (y - x) * Math.max(0, Math.min(1, k));
    if (f < s) return lerp(tm.start, tm.contact, f / Math.max(1, s));
    if (f < s + a) return lerp(tm.contact, tm.activeEnd, (f - s) / Math.max(1, a));
    return lerp(tm.activeEnd, tm.end, (f - s - a) / Math.max(1, r));
  }

  rotBone(rots, name, axis, ang) {
    const bone = this.bones.get(name);
    if (!bone || !ang) return;
    const q = new THREE.Quaternion().setFromAxisAngle(axis, ang);
    bone.quaternion.multiply(q);
    rots.push({ bone, q });
  }

  undoCrouch() {
    const a = this.crouchApplied;
    if (!a) return;
    for (let i = a.rots.length - 1; i >= 0; i--) a.rots[i].bone.quaternion.multiply(a.rots[i].q.invert()); // ordem inversa
    if (a.hips) a.hips.position.y += a.dy;
    this.crouchApplied = null;
  }

  // clips que já abaixam o corpo (rasteira) recebem só um pouco da pose — não dobrar a perna duas vezes
  static CROUCH_SCALE = { sweep: 0.25 };

  applyCrouch(rots, t, key) {
    const b = this.bones;
    const hips = b.get('hips');
    if (!hips) return 0;
    if (this.hipsRest === undefined) this.hipsRest = hipsRestY(b);
    const scale = this.visual.crouch?.scale?.[key] ?? GLBModel.CROUCH_SCALE[key] ?? 1;
    const flex = (this.visual.crouch?.flex ?? 1.25) * t * scale; // flexão do quadril (rad)
    const ax = new THREE.Vector3(1, 0, 0);
    for (const s of ['left', 'right']) {
      this.rotBone(rots, `${s}upleg`, ax, -flex);       // coxa para frente
      this.rotBone(rots, `${s}leg`, ax, flex * 2);      // joelho dobra
      this.rotBone(rots, `${s}foot`, ax, -flex * 0.9);  // pé volta a ficar no chão
    }
    this.rotBone(rots, 'spine', ax, flex * 0.25);       // tronco inclina um pouco à frente
    const dy = this.hipsRest * (1 - Math.cos(flex)) * 0.95;
    hips.position.y -= dy;
    return dy;
  }


  // skin dourada (ultimate do Xandor): k 0→1 mistura cor/metal/brilho do material para OURO (mantém a textura)
  setGold(k) {
    if (Math.abs((this.goldK ?? 0) - k) < 0.005) return;
    this.goldK = k;
    const gold = new THREE.Color(0xffc94a);
    for (const m of this.materials) {
      const u = m.userData;
      if (!u.baseColor) { u.baseColor = m.color.clone(); u.baseMetal = m.metalness ?? 0; u.baseRough = m.roughness ?? 1; }
      m.color.copy(u.baseColor).lerp(gold, k * 0.85);
      if (m.metalness !== undefined) m.metalness = u.baseMetal + (0.95 - u.baseMetal) * k;
      if (m.roughness !== undefined) m.roughness = u.baseRough + (0.28 - u.baseRough) * k;
    }
    this.flashing = null; // força reaplicar o emissive
  }

  // on: flash branco de hit; glow: cor de brilho fixo (ultimate) quando não há flash
  setFlash(on, glow = null) {
    const st = on ? 'f' : glow ? 'g' + glow : '';
    if (st === this.flashing) return;
    this.flashing = st;
    for (const m of this.materials) {
      const u = m.userData;
      if (u.baseEmissive === undefined) { u.baseEmissive = m.emissive.getHex(); u.baseIntensity = m.emissiveIntensity; }
      m.emissive.setHex(on ? 0xffffff : glow ?? u.baseEmissive);
      m.emissiveIntensity = on ? 0.6 : glow ? 0.12 + 0.35 * (this.goldK || 0) : u.baseIntensity; // brilho do ouro
    }
  }

  dispose() { this.mixer.stopAllAction(); }
}
