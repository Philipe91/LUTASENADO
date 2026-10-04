// Escolhe o adaptador de plataforma e embrulha com as regras do jogo:
//   ?platform=null|dev|poki|crazygames|google|gamedistribution  >  VITE_PLATFORM  >  modo do build (vite build --mode poki)
//   · anúncio NUNCA durante a luta: commercialBreak/rewardedBreak com gameplay ativo são recusados (e avisam no console)
//   · intervalo comercial no máximo a cada MIN_GAP_S e nunca antes da 1ª luta terminar (o portal ainda filtra por cima)
//   · durante o anúncio: hold('ad') → o jogo pausa, o som cala e os controles soltam (listeners de onHold)
//   · gameplayStart/Stop idempotentes (os portais contam sessão de jogo por esses eventos)
import NullPlatform from './adapters/null.js';

const ADAPTERS = {
  dev: () => import('./adapters/dev.js'),
  poki: () => import('./adapters/poki.js'),
  crazygames: () => import('./adapters/crazygames.js'),
  google: () => import('./adapters/google.js'),
  gamedistribution: () => import('./adapters/gamedistribution.js'),
};
const MIN_GAP_S = 60;

export function platformName(params = new URLSearchParams(location.search)) {
  const env = import.meta.env || {};
  const name = params.get('platform') || env.VITE_PLATFORM || (ADAPTERS[env.MODE] ? env.MODE : 'null');
  return ADAPTERS[name] ? name : 'null';
}

class PlatformService {
  constructor() {
    this.adapter = new NullPlatform();
    this.playing = false;
    this.lastBreak = 0;
    this.matchesDone = 0;
    this.holdListeners = new Set();
    this.adRunning = false;
  }
  get name() { return this.adapter.name; }
  get hasAds() { return this.adapter.hasAds; }
  get hasRewarded() { return this.adapter.hasRewarded; }
  get fullscreenButton() { return this.adapter.fullscreenButton; }
  get serviceWorker() { return this.adapter.serviceWorker; }

  async init(params) {
    const name = platformName(params);
    if (name !== 'null') {
      try { this.adapter = new (await ADAPTERS[name]()).default(); } catch (e) { console.warn('[platform] adaptador falhou, usando nulo', e); }
    }
    this.adapter.onAd = (on) => { this.adRunning = on; for (const fn of this.holdListeners) fn(on); };
    // init nunca segura o jogo por mais de 4 s (SDK lento ou bloqueado)
    await Promise.race([this.adapter.init().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
    return this;
  }
  // fn(true) no começo do anúncio, fn(false) no fim
  onHold(fn) { this.holdListeners.add(fn); }

  loadingProgress(p) { try { this.adapter.loadingProgress(p); } catch { /* */ } }
  gameLoadingFinished() { if (this.loaded) return; this.loaded = true; try { this.adapter.gameLoadingFinished(); } catch { /* */ } }
  gameplayStart() { if (this.playing) return; this.playing = true; try { this.adapter.gameplayStart(); } catch { /* */ } }
  gameplayStop() { if (!this.playing) return; this.playing = false; try { this.adapter.gameplayStop(); } catch { /* */ } }
  setSound(on) { try { this.adapter.setSound?.(on); } catch { /* */ } }
  happytime() { try { this.adapter.happytime(); } catch { /* */ } }
  matchFinished() { this.matchesDone++; }
  shareUrl(params) { return this.adapter.shareUrl(params).catch(() => location.href); }

  // intervalo comercial entre lutas (revanche / trocar lutador). Resolve quando o jogo pode seguir.
  async commercialBreak(where) {
    if (this.playing) { console.warn('[platform] commercialBreak recusado: luta em andamento'); return false; }
    if (!this.hasAds || this.matchesDone < 1) return false;
    const now = performance.now() / 1000;
    if (this.lastBreak && now - this.lastBreak < MIN_GAP_S) return false;
    this.lastBreak = now;
    try { return await this.adapter.commercialBreak(where); } catch { return false; } finally { this.ensureReleased(); }
  }
  // recompensa escolhida pelo jogador (desbloquear lutador nesta sessão). true = ganhou
  async rewardedBreak(where) {
    if (this.playing) { console.warn('[platform] rewardedBreak recusado: luta em andamento'); return false; }
    if (!this.hasRewarded) return false;
    try { return await this.adapter.rewardedBreak(where); } catch { return false; } finally { this.ensureReleased(); }
  }
  // SDK que esqueceu de avisar o fim do anúncio não pode deixar o jogo travado em pausa
  ensureReleased() { if (this.adRunning) this.adapter.onAd(false); }
}

export const platform = new PlatformService();
