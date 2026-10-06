// Lista os clips (nome e duração em s) de um ou mais GLBs — inventário de animação.
// Uso: node tools/list_clips.mjs public/assets/characters/*/model.glb public/assets/characters/*/model.anim.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const draco3d = (await import('draco3dgltf')).default;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  try {
    const doc = await io.read(f);
    const anims = doc.getRoot().listAnimations().map((a) => {
      let d = 0;
      for (const s of a.listSamplers()) { const t = s.getInput(); if (t) d = Math.max(d, t.getMax([])[0]); }
      return `${a.getName()} (${d.toFixed(2)}s)`;
    });
    console.log(`${f}  [${anims.length}]\n  ${anims.join('\n  ')}`);
  } catch (e) { console.log(f, 'ERRO', e.message); }
}
