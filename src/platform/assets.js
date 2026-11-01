// Catálogo dos arquivos de public/assets (gerado pelo plugin rk-assets do vite.config.js: caminho → bytes).
//   exists(url)       o arquivo existe? (o jogo não pede o que não existe → console sem 404)
//   modelUrl(url)     troca model.glb pela variante leve model.m.glb nos níveis de qualidade com `lite`
//   bytes(url)        tamanho, para a barra de progresso
import LIST from 'virtual:rk-assets';
import { quality } from './quality.js';

const clean = (url) => String(url || '').replace(/^\.?\//, '').split('?')[0];
export const exists = (url) => clean(url) in LIST;
export const bytes = (url) => LIST[clean(url)] || 0;
export const listDir = (dir) => { const p = clean(dir).replace(/\/?$/, '/'); return Object.keys(LIST).filter((k) => k.startsWith(p)); };
// economia de dados ligada ou rede 2G/3G: modelos leves mesmo no nível alto
const slowNet = () => { const c = navigator.connection; return !!c && (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '')); };
export function modelUrl(url) {
  const u = clean(url);
  if (quality.cfg.lite || slowNet()) {
    const lite = u.replace(/\.glb$/, '.m.glb');
    if (lite in LIST) return lite;
  }
  return u;
}
