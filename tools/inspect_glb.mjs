// Raio-X de um GLB antes de entrar no jogo: triângulos, materiais, texturas, esqueleto, animações, tamanho.
// Uso: node tools/inspect_glb.mjs public/assets/characters/xandor/model.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { statSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.log('uso: node tools/inspect_glb.mjs <arquivo.glb>'); process.exit(1); }

const draco3d = (await import('draco3dgltf')).default;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read(file);
const root = doc.getRoot();

let tris = 0;
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const idx = p.getIndices(), pos = p.getAttribute('POSITION');
  tris += idx ? idx.getCount() / 3 : (pos?.getCount() ?? 0) / 3;
}
const scene = root.getDefaultScene() || root.listScenes()[0];
const b = getBounds(scene);
const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(3));

const REQUIRED = ['hips', 'spine', 'neck', 'head', 'leftarm', 'leftforearm', 'lefthand', 'rightarm', 'rightforearm', 'righthand',
  'leftupleg', 'leftleg', 'leftfoot', 'rightupleg', 'rightleg', 'rightfoot'];
const norm = (n) => n.toLowerCase().replace(/^mixamorig\d*[:_]?/, '').replace(/_\d+$/, '').replace(/[^a-z0-9]/g, '');
const joints = new Set(root.listSkins().flatMap((s) => s.listJoints().map((j) => j.getName())));
const normJoints = new Set([...joints].map(norm));

console.log(`\n${file}  (${(statSync(file).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`triângulos: ${Math.round(tris).toLocaleString('pt-BR')}   ${tris > 30000 ? '⚠ acima de 30k — reduzir (Remesh)' : 'ok'}`);
console.log(`tamanho (x,y,z): ${size.join(' × ')}   altura=${size[1]}  (o jogo normaliza a altura sozinho)`);
console.log(`orientação: ${size[2] > size[0] * 1.3 ? '⚠ mais fundo que largo — confira se está de lado (ajuste visual.yaw)' : 'ok (frente em ±Z)'}`);
console.log(`materiais: ${root.listMaterials().length}   ${root.listMaterials().map((m) => m.getName() || '(sem nome)').join(', ')}`);
for (const t of root.listTextures()) {
  const s = t.getSize();
  console.log(`  textura ${t.getName() || t.getURI() || '(embutida)'} ${s ? s.join('×') : '?'} ${t.getMimeType()} ${(t.getImage()?.byteLength / 1024).toFixed(0)} KB${s && Math.max(...s) > 2048 ? '  ⚠ >2K' : ''}`);
}
console.log(`skins: ${root.listSkins().length}   ossos: ${joints.size}`);
if (joints.size) {
  const missing = REQUIRED.filter((r) => !normJoints.has(r));
  console.log(`ossos humanoides essenciais: ${missing.length ? '⚠ faltando ' + missing.join(', ') : 'todos presentes (compatível com o retarget)'}`);
  console.log(`  exemplo de nomes: ${[...joints].slice(0, 8).join(', ')}…`);
}
const anims = root.listAnimations();
console.log(`animações: ${anims.length}${anims.length ? '  → ' + anims.map((a) => a.getName()).join(', ') : ''}`);
