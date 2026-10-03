// Robustez de navegador/celular: sem zoom ou rolagem acidental, tela cheia, service worker (PWA).
import { platform } from './index.js';

// pinça, duplo toque, ctrl+roda e teclas de rolagem não podem mexer na página (exigência dos portais)
export function installGuards() {
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  // dois dedos na tela (pinça) fora dos controles
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || !e.target.closest?.('.select, .title')) e.preventDefault(); }, { passive: false });
  addEventListener('contextmenu', (e) => e.preventDefault());
  const SCROLL = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);
  addEventListener('keydown', (e) => { if (SCROLL.has(e.code) && !e.target.closest?.('input, textarea')) e.preventDefault(); });
}

const doc = document;
export const fullscreen = {
  get supported() { return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled); },
  get on() { return !!(doc.fullscreenElement || doc.webkitFullscreenElement); },
  async toggle() {
    try {
      if (this.on) await (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      else {
        const el = doc.documentElement;
        await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
        // celular: tenta deitar a tela (luta é melhor em paisagem); recusado em muitos aparelhos, sem problema
        await screen.orientation?.lock?.('landscape').catch(() => {});
      }
    } catch { /* navegador recusou */ }
  },
};

// PWA: só no site próprio (fora de iframe e em adaptador que permite), só no build de produção
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !platform.serviceWorker || !('serviceWorker' in navigator)) return;
  let framed = true;
  try { framed = window.self !== window.top; } catch { /* iframe de outro domínio */ }
  if (framed || location.protocol === 'file:') return;
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
