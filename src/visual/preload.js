// Pré-carga dos arquivos de uma luta (só os 2 lutadores escolhidos), com progresso em bytes.
// Usa o mesmo loadGLTF/cache do GLBModel: quando a luta começa, o FighterView acha tudo pronto e o boneco
// provisório (placeholder) nem chega a aparecer.
//   essencial (segura a tela de carregamento): modelo de cada lutador + bibliotecas de animação
//   extra (baixa em segundo plano já com a luta rolando): forma da ultimate, props dos golpes, multidão, invocações
import { loadGLTF, animLibUrl, loadedBytes, isCached } from './models/GLBModel.js';
import { exists, bytes, modelUrl } from '../platform/assets.js';
import { getCharacter } from '../data/characters/index.js';

const CIVIL_FILES = ['assets/props/civis/worker.glb', 'assets/props/civis/punk_f.glb']; // multidão do Lulácio (projectiles.js)

// todos os .glb citados pelo personagem fora do modelo/animações (props, ultimate, invocações)
function extrasOf(c) {
  const out = new Set();
  const walk = (o, skip) => {
    if (typeof o === 'string') {
      if (o.endsWith('.glb') && !skip) out.add(o);
      if (o === 'civilCrowd') CIVIL_FILES.forEach((f) => out.add(f));
    } else if (Array.isArray(o)) o.forEach((x) => walk(x, skip));
    else if (o && typeof o === 'object') for (const k in o) walk(o[k], skip || k === 'animations');
  };
  walk(c, false);
  return [...out].filter(exists).map(modelUrl);
}

// lista na ordem de download: modelos dos lutadores primeiro (decide se a biblioteca de animação reaproveita um deles)
export function fightFiles(ids) {
  const chars = ids.map((id) => getCharacter(id));
  const models = new Set(chars.map((c) => c.visual?.model).filter((u) => u && exists(u)).map(modelUrl));
  const anims = new Set(chars.flatMap((c) => c.visual?.animations || []).filter(exists));
  const animUrls = [...anims].map((u) => (models.has(modelUrl(u)) ? modelUrl(u) : animLibUrl(u)));
  const essential = [...new Set([...models, ...animUrls])];
  const extra = [...new Set(chars.flatMap(extrasOf))].filter((u) => !essential.includes(u));
  return { essential, extra };
}

// onProgress(0..1). Resolve quando o essencial baixou e foi decodificado (erros não travam: o placeholder cobre);
// os extras seguem baixando sem segurar a luta.
export function preloadFight(ids, onProgress = () => {}) {
  const { essential, extra } = fightFiles(ids);
  const total = essential.reduce((s, f) => s + (bytes(f) || 1), 0) || 1;
  const report = () => {
    const done = essential.reduce((s, f) => s + Math.min(bytes(f) || 1, loadedBytes.get(f) || 0), 0);
    onProgress(Math.min(1, done / total));
  };
  const timer = setInterval(report, 100);
  return Promise.all(essential.map((f) => loadGLTF(f).catch(() => loadedBytes.set(f, bytes(f)))))
    .finally(() => {
      clearInterval(timer); onProgress(1);
      // extras só depois que a luta montou (não disputam banda nem CPU com a troca placeholder → GLB)
      setTimeout(() => { for (const f of extra) loadGLTF(f).catch(() => {}); }, 2500);
    });
}

// pré-busca em segundo plano (tela de título / seleção): só o essencial, sem segurar nada
export function prefetchFight(ids) {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  idle(() => { for (const f of fightFiles(ids).essential) if (!isCached(f)) loadGLTF(f).catch(() => {}); });
}
