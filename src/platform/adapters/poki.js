// Adaptador POKI (build: npm run build:poki · teste: ?platform=poki).
// Docs: https://developers.poki.com/guide/sdk-html5 · requisitos: https://developers.poki.com/guide/requirements-quality
// Esqueleto com as chamadas documentadas; NÃO testado com conta/jogo real — validar no Poki Inspector
// (https://inspector.poki.dev/) antes de enviar. Se o SDK não carregar (bloqueador, offline), vira no-op.
import { Platform, loadScript } from '../Platform.js';

export default class PokiPlatform extends Platform {
  constructor() {
    super('poki');
    this.fullscreenButton = false; // o Poki tem o próprio controle de tela cheia
    this.serviceWorker = false;    // roda dentro do iframe do portal
  }
  get sdk() { return this.ready ? window.PokiSDK : null; }

  async init() {
    if (!(await loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js'))) return;
    try { await window.PokiSDK.init(); } catch { /* bloqueador de anúncio: o Poki pede para seguir jogando */ }
    this.ready = !!window.PokiSDK;
    this.hasAds = this.hasRewarded = this.ready;
  }
  gameLoadingFinished() { this.sdk?.gameLoadingFinished(); }
  gameplayStart() { this.sdk?.gameplayStart(); }
  gameplayStop() { this.sdk?.gameplayStop(); }

  // commercialBreak(cb): cb roda só se um anúncio for mesmo exibir → pausa/silêncio só nesse caso
  async commercialBreak() {
    if (!this.sdk) return false;
    let shown = false;
    await this.sdk.commercialBreak(() => { shown = true; this.adStarted(); }).catch(() => {});
    if (shown) this.adFinished();
    return shown;
  }
  async rewardedBreak() {
    if (!this.sdk) return false;
    let shown = false;
    const ok = await this.sdk.rewardedBreak(() => { shown = true; this.adStarted(); }).catch(() => false);
    if (shown) this.adFinished();
    return !!ok;
  }
  async shareUrl(params) {
    if (!this.sdk?.shareableURL) return super.shareUrl(params);
    try { return await this.sdk.shareableURL(params); } catch { return super.shareUrl(params); }
  }
}
