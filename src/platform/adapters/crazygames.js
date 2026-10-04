// Adaptador CRAZYGAMES — SDK v3 (build: npm run build:crazygames · teste: ?platform=crazygames&useLocalSdk=true).
// Docs: https://docs.crazygames.com/sdk/intro/ · anúncios: https://docs.crazygames.com/sdk/video-ads/
// Requisitos: https://docs.crazygames.com/requirements/technical/ e https://docs.crazygames.com/requirements/ads/
// Esqueleto com as chamadas documentadas; NÃO testado com conta real. Em domínio que não é da CrazyGames o SDK
// fica "disabled" e qualquer chamada lança erro → aqui vira no-op.
import { Platform, loadScript } from '../Platform.js';

export default class CrazyGamesPlatform extends Platform {
  constructor() {
    super('crazygames');
    this.fullscreenButton = false; // o portal tem tela cheia própria
    this.serviceWorker = false;
  }
  get sdk() { return this.ready ? window.CrazyGames.SDK : null; }
  call(fn) { try { fn(this.sdk); } catch { /* ambiente disabled */ } }

  async init() {
    if (!(await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js'))) return;
    try {
      await window.CrazyGames.SDK.init();
      this.ready = window.CrazyGames.SDK.environment !== 'disabled';
    } catch { this.ready = false; }
    this.hasAds = this.hasRewarded = this.ready;
    if (this.ready) this.call((s) => s.game.loadingStart());
  }
  gameLoadingFinished() { if (this.sdk) this.call((s) => s.game.loadingStop()); }
  gameplayStart() { if (this.sdk) this.call((s) => s.game.gameplayStart()); }
  gameplayStop() { if (this.sdk) this.call((s) => s.game.gameplayStop()); }
  happytime() { if (this.sdk) this.call((s) => s.game.happytime()); }

  // requestAd('midgame' | 'rewarded', { adStarted, adFinished, adError })
  request(type) {
    if (!this.sdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      let started = false;
      const done = (ok) => { if (started) this.adFinished(); resolve(ok); };
      try {
        this.sdk.ad.requestAd(type, {
          adStarted: () => { started = true; this.adStarted(); },
          adFinished: () => done(true),
          adError: () => done(false),
        });
      } catch { resolve(false); }
    });
  }
  commercialBreak() { return this.request('midgame'); }
  rewardedBreak() { return this.request('rewarded'); }
}
