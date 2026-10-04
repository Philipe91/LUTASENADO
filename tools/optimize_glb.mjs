// Gera a versão "leve" (.m.glb) de cada GLB de personagem/prop: texturas reduzidas para 1024 px em WebP
// (normal map com qualidade maior), malha continua em Draco. Usada nos níveis de qualidade baixo/médio (celular).
// O jogo só pede o .m.glb se ele existir (lista gerada pelo plugin rk-assets do vite.config.js).
// Uso: node tools/optimize_glb.mjs            (todos em public/assets, pula os que já estão atualizados)
//      node tools/optimize_glb.mjs --force    (refaz todos)   ·  --size=768 muda o lado máximo
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, draco, prune, dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import draco3d from 'draco3dgltf';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const force = process.argv.includes('--force');
const size = Number(process.argv.find((a) => a.startsWith('--size='))?.slice(7) || 1024);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
  'meshopt.encoder': await MeshoptEncoder.ready.then(() => MeshoptEncoder),
  'meshopt.decoder': await MeshoptDecoder.ready.then(() => MeshoptDecoder),
});

const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.glb') && !/\.(m|anim)\.glb$/.test(f)) files.push(p); } };
walk('public/assets');

let before = 0, after = 0;
for (const src of files) {
  const out = src.replace(/\.glb$/, '.m.glb');
  const s0 = statSync(src).size;
  let fresh = false;
  try { fresh = statSync(out).mtimeMs > statSync(src).mtimeMs; } catch { /* não existe */ }
  if (fresh && !force) { before += s0; after += statSync(out).size; console.log('ok (atual)', out); continue; }
  const doc = await io.read(src);
  if (!doc.getRoot().listTextures().length) { console.log('sem textura, pulado', src); continue; }
  await doc.transform(
    dedup(), prune(),
    // cor/rugosidade: webp q80 · normal map: q90 (artefato de compressão no normal vira "ruído" de luz)
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 80, slots: /^(?!normal)/ }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 90, slots: /^normal/ }),
    draco(),
  );
  await io.write(out, doc);
  const s1 = statSync(out).size;
  before += s0; after += s1;
  console.log(`${src}  ${(s0 / 1024).toFixed(0)} KB → ${(s1 / 1024).toFixed(0)} KB`);
}
console.log(`TOTAL ${(before / 1048576).toFixed(2)} MB → ${(after / 1048576).toFixed(2)} MB (lado máx. ${size}px)`);

// Bibliotecas de animação (.anim.glb): Lulácio e Xandor emprestam os clips para TODOS os lutadores
// (visual.animations). Antes cada luta baixava os dois modelos inteiros (~2 MB cada) só pelos clips;
// aqui sai só esqueleto + clips (sem malha nem textura). A skin fica (o GLTFLoader marca os ossos por ela).
const ANIM_LIBS = ['public/assets/characters/lulacio/model.glb', 'public/assets/characters/xandor/model.glb'];
for (const src of ANIM_LIBS) {
  const out = src.replace(/\.glb$/, '.anim.glb');
  const doc = await io.read(src);
  const root = doc.getRoot();
  for (const node of root.listNodes()) if (node.getMesh()) node.setMesh(null);
  for (const m of root.listMeshes()) { for (const p of m.listPrimitives()) p.dispose(); m.dispose(); }
  for (const m of root.listMaterials()) m.dispose();
  for (const t of root.listTextures()) t.dispose();
  // prune sem mexer em Skin/Node: ossos sem malha continuam no arquivo
  await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.TEXTURE, PropertyType.MATERIAL, PropertyType.MESH] }));
  // EXT_meshopt_compression nível alto: quatérnios/translações quantizados + filtro (o jogo registra o MeshoptDecoder)
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  await io.write(out, doc);
  console.log(`${out}  ${(statSync(src).size / 1024).toFixed(0)} KB → ${(statSync(out).size / 1024).toFixed(0)} KB (só clips)`);
}
