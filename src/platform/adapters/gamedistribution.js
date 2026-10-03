// Adaptador GAMEDISTRIBUTION (build: VITE_GD_GAME_ID=<id> npm run build:gamedistribution).
// Docs: https://github.com/GameDistribution/GD-HTML5/wiki/SDK-Implementation
// Esqueleto com as chamadas documentadas; NÃO testado com conta real. Sem gameId fica inerte.
// O GD pausa/retoma o jogo pelos eventos SDK_GAME_PAUSE / SDK_GAME_START.
import { Platform, loadScript } from '../Platform.js';

export default class GameDistributionPlatform extends Platform {
  constructor() {
    super('gamedistribution');
    this.serviceWorker = false;
    this.gameId = import.meta.env.VITE_GD_GAME_ID || '';
  }
  async init() {
    if (!this.gameId) { console.info('[platform:gamedistribution] sem VITE_GD_GAME_ID: anúncios desligados'); return; }
    window.GD_OPTIONS = {
      gameId: this.gameId,
      onEvent: (e) => {
        if (e.name === 'SDK_GAME_PAUSE') this.adStarted();
        else if (e.name === 'SDK_GAME_START') this.adFinished();
        else if (e.name === 'SDK_REWARDED_WATCH_COMPLETE') this.rewardOk = true;
      },
    };
    if (!(await loadScript('https://html5.api.gamedistribution.com/main.min.js', { id: 'gamedistribution-jssdk' }))) return;
    this.ready = true;
    this.hasAds = this.hasRewarded = true;
  }
  async show(type) {
    if (!this.ready || !window.gdsdk?.showAd) return false;
    this.rewardOk = false;
    try { await window.gdsdk.showAd(type); } catch { return false; }
    return type === 'rewarded' ? this.rewardOk : true;
  }
  commercialBreak() { return this.show(); }
  rewardedBreak() { return this.show('rewarded'); }
}
