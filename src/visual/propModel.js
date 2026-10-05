// Troca de PROP procedural por GLB (Meshy) — genérico para projéteis, props na mão e props das ultimates.
//
//   swapToGLB(target, 'assets/props/<nome>.glb', { height | size, fit, yaw, pitch, roll, offset, keep, all, onReady })
//
// - Só pede o arquivo se ele está no catálogo (exists() de platform/assets.js): sem arquivo → nada acontece,
//   nenhum 404, o procedural continua exatamente igual.
// - Mede o "corpo" procedural no espaço LOCAL do target (na hora da chamada) e encaixa o GLB no mesmo lugar e
//   tamanho: centro com centro, maior dimensão com maior dimensão (fit 'max', padrão), ou altura ('height'),
//   ou valores fixos (height / size em unidades do target).
// - Quando o GLB chega, esconde SÓ as malhas procedurais do corpo: o que estiver em `keep` (ou marcado com
//   userData.keep = true) fica — rodas girando, tela de celular, decal "BLOQUEADO", mandíbula móvel, rastro…
//   Malhas de efeito (material transparente sem depthWrite: fumaça, rastros, brilhos) e sprites nunca somem.
// - O GLB entra como filho do target: herda a animação procedural (giro, squash, posição) sem código extra.
// - Idempotente por target (chamar 2× com a mesma url não duplica).
import * as THREE from 'three';
import { loadGLTF } from './models/GLBModel.js';
import { exists, modelUrl } from '../platform/assets.js';

// Nomes padronizados (public/assets/props/<arquivo>) — lista única, documentada em docs/ASSETS_PENDENTES.md
export const PROP_GLB = {
  picanha: 'assets/props/picanha.glb',
  caminhao: 'assets/props/caminhao.glb',
  carimboBloqueado: 'assets/props/carimbo_bloqueado.glb',
  canetaXandor: 'assets/props/caneta_xandor.glb',
  martelo: 'assets/props/martelo.glb',
  leaoCabeca: 'assets/props/leao_cabeca.glb',
  leaoMandibula: 'assets/props/leao_mandibula.glb',
  mandioca: 'assets/props/mandioca.glb',
  pote: 'assets/props/pote_vento.glb',
  bicicleta: 'assets/props/bicicleta.glb',
  cachorro: 'assets/props/cachorro.glb',
  crianca: 'assets/props/crianca.glb',
  maletaCorpo: 'assets/props/maleta_corpo.glb',
  maletaTampa: 'assets/props/maleta_tampa.glb',
  celular: 'assets/props/celular.glb',
  chupeta: 'assets/props/chupeta.glb',
  mamadeira: 'assets/props/mamadeira.glb',
  megafone: 'assets/props/megafone.glb',
  barraca: 'assets/props/barraca.glb',
  vadeMecum: 'assets/props/vade_mecum.glb',
  seringa: 'assets/props/seringa.glb',
  pendrive: 'assets/props/pendrive.glb',
  microfoneErika: 'assets/props/microfone_erika.glb',
  microfonePolvo: 'assets/props/microfone_polvo.glb',
  cadeira: 'assets/props/cadeira.glb',
  pacote: 'assets/props/pacote.glb',
  carimboImposto: 'assets/props/carimbo_imposto.glb',
};

const isEffect = (o) => o.isSprite || o.isPoints || o.isLine
  || (o.material && !Array.isArray(o.material) && o.material.transparent && o.material.depthWrite === false);

// percorre as malhas do corpo (pula kept e efeitos, e não entra em subárvores kept)
// all: true → malhas transparentes também são corpo (ex.: vidro do pote)
function eachBodyMesh(root, keep, fn, all = false) {
  const body = (o) => o.isMesh && !o.isSprite && (all || !isEffect(o));
  if (body(root)) fn(root); // target pode ser a própria malha (ex.: carimbo básico)
  (function walk(o) {
    for (const c of o.children) {
      if (keep.has(c) || c.userData.keep || c.userData.isGLB) continue;
      if (body(c)) fn(c);
      walk(c);
    }
  })(root);
}

const _m = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _b = new THREE.Box3();
function localBox(root, keep, all) {
  root.updateMatrixWorld(true);
  _inv.copy(root.matrixWorld).invert();
  const box = new THREE.Box3();
  eachBodyMesh(root, keep, (o) => {
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _m.multiplyMatrices(_inv, o.matrixWorld);
    box.union(_b.copy(o.geometry.boundingBox).applyMatrix4(_m));
  }, all);
  return box;
}

export function hasPropGLB(url) { return !!url && exists(modelUrl(url)); }

export function swapToGLB(target, url, opts = {}) {
  if (!target || !hasPropGLB(url)) return null;
  const tried = (target.userData.glbUrls ||= new Set());
  if (tried.has(url)) return null;
  tried.add(url);
  const { fit = 'max', height, size, yaw = 0, pitch = 0, roll = 0, offset, shadow = true, all = false, onReady } = opts;
  const keep = new Set(opts.keep || []);
  // medida agora (antes do chamador escalar/posicionar o grupo); escala 0 no target não estraga a conta
  let want = null;
  try { want = localBox(target, keep, all); } catch { want = null; }
  return loadGLTF(url).then((gltf) => {
    const m = gltf.scene.clone(true);
    m.rotation.set(pitch, yaw, roll);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = shadow; o.receiveShadow = false; } });
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m), got = box.getSize(new THREE.Vector3());
    const ok = want && !want.isEmpty() && isFinite(want.min.x);
    const ws = ok ? want.getSize(new THREE.Vector3()) : new THREE.Vector3(1, 1, 1);
    let s;
    if (height) s = height / Math.max(got.y, 1e-3);
    else if (size) s = size / Math.max(got.x, got.y, got.z, 1e-3);
    else if (fit === 'height') s = ws.y / Math.max(got.y, 1e-3);
    else if (fit === 'width') s = ws.x / Math.max(got.x, 1e-3);
    else s = Math.max(ws.x, ws.y, ws.z) / Math.max(got.x, got.y, got.z, 1e-3);
    const holder = new THREE.Group(); holder.userData.isGLB = true;
    m.scale.multiplyScalar(s);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
    const pc = ok ? want.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    m.position.set(pc.x - c.x, pc.y - c.y, pc.z - c.z);
    if (offset) m.position.add(offset);
    holder.add(m);
    // esconde só o corpo procedural (camadas zeradas: nem câmera nem sombra; código que mexe em .visible não "ressuscita")
    eachBodyMesh(target, keep, (o) => o.layers.disableAll(), all);
    target.add(holder);
    target.userData.glb = holder;
    onReady?.(holder, m);
    return holder;
  }).catch(() => null);
}
