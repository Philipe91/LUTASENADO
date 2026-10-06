// Registro de arenas. Escolha: ?arena=<id> (prioridade) > preferência salva na seleção (prefs.arena) > Esplanada.
// 'random' sorteia uma a cada luta. Troca entre lutas: disposeArena() libera geometrias/materiais/texturas/luzes.
import { buildBrasilia } from './brasilia.js';
import { buildNoite } from './noite.js';
import { buildPlenario } from './plenario.js';

export const ARENAS = { brasilia: buildBrasilia, noite: buildNoite, plenario: buildPlenario };

// cartões da tela de seleção (ordem de exibição)
export const ARENA_LIST = [
  { id: 'brasilia', name: 'ESPLANADA', sub: 'pôr do sol' },
  { id: 'noite', name: 'ESPLANADA', sub: 'noite' },
  { id: 'plenario', name: 'PLENÁRIO', sub: 'Câmara' },
  { id: 'random', name: 'ALEATÓRIO', sub: 'a cada luta' },
];

// escolha → id concreto ('random' sorteia, de preferência diferente da arena atual)
export function resolveArena(choice, current = null) {
  if (ARENAS[choice]) return choice;
  if (choice === 'random') {
    const ids = Object.keys(ARENAS), pool = ids.length > 1 ? ids.filter((id) => id !== current) : ids;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return 'brasilia';
}

export function buildArena(scene, id) {
  const key = ARENAS[id] ? id : 'brasilia';
  const arena = ARENAS[key](scene);
  arena.id = key;
  return arena;
}

// tira a arena da cena e devolve a memória de vídeo (geometria, material, textura — inclusive em uniforms — e shadow map)
export function disposeArena(scene, arena) {
  if (!arena?.root) return;
  arena.dispose?.();
  const seen = new Set();
  const tex = (t) => { if (t?.isTexture && !seen.has(t)) { seen.add(t); t.dispose(); } };
  arena.root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) {
      for (const v of Object.values(m)) tex(v);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) tex(u?.value);
      m.dispose();
    }
    if (o.isLight) { o.shadow?.map?.dispose(); o.dispose?.(); }
    tex(o.userData?.texture);
  });
  arena.root.removeFromParent();
  if (scene.background?.isTexture) scene.background.dispose();
  scene.background = null;
  scene.fog = null;
}
