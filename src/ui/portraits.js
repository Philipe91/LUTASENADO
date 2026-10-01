// Retrato de um lutador: public/assets/characters/<id>/portrait.png (gerado com art/PROMPTS_GPT.md §C).
// Enquanto o arquivo não existe, a UI mostra a paleta + inicial. Testa o carregamento uma vez por id.
const cache = new Map();
export function portrait(id, onReady) {
  const url = `assets/characters/${id}/portrait.png`;
  if (cache.has(id)) { if (cache.get(id)) onReady(url); return; }
  const img = new Image();
  img.onload = () => { cache.set(id, true); onReady(url); };
  img.onerror = () => cache.set(id, false);
  img.src = url;
}
export const hex = (n) => '#' + (n ?? 0x333333).toString(16).padStart(6, '0');
