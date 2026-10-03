// Adaptador GOOGLE H5 GAMES ADS — Ad Placement API (adBreak / adConfig) para o próprio site (AdSense/Ad Manager).
// Docs: https://developers.google.com/ad-placement/apis · https://developers.google.com/ad-placement/docs/ad-rules
// Build: VITE_ADSENSE_CLIENT=ca-pub-XXXX npm run build:google  (sem o id o adaptador fica inerte)
// Teste: ?platform=google&adtest=1 (data-adbreak-test="on": anúncios de teste do Google, sem receita).
// Esqueleto com as chamadas documentadas; NÃO testado com conta real.
import { Platform, loadScript } from '../Platform.js';

export default class GooglePlatform extends Platform {
  constructor() {
    super('google');
    this.client = import.meta.env.VITE_ADSENSE_CLIENT || new URLSearchParams(location.search).get('adclient') || '';
  }

  async init() {
    if (!this.client) { console.info('[platform:google] sem VITE_ADSENSE_CLIENT: anúncios desligados'); return; }
    window.adsbygoogle = window.adsbygoogle || [];
    window.adBreak = window.adConfig = (o) => window.adsbygoogle.push(o);
    const attrs = { 'data-ad-client': this.client, crossorigin: 'anonymous' };
    if (new URLSearchParams(location.search).has('adtest')) attrs['data-adbreak-test'] = 'on';
    if (!(await loadScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.client}`, attrs))) return;
    this.ready = true;
    this.hasAds = this.hasRewarded = true;
    // preload automático e o estado do som (o Google não toca anúncio com som se o jogo está mudo)
    window.adConfig({ preloadAdBreaks: 'auto', sound: 'on' });
    // 'preroll': antes da primeira tela (sem pausar nada, o jogo ainda não começou)
    window.adBreak({ type: 'preroll', adBreakDone: () => {} });
  }
  setSound(on) { if (this.ready) window.adConfig({ sound: on ? 'on' : 'off' }); }

  // tipo 'next' = entre fases/lutas. adBreakDone sempre chega (mostrou ou não: placementInfo.breakStatus)
  commercialBreak(where = 'next') {
    if (!this.ready) return Promise.resolve(false);
    return new Promise((resolve) => {
      window.adBreak({
        type: 'next', name: String(where),
        beforeAd: () => this.adStarted(),
        afterAd: () => this.adFinished(),
        adBreakDone: (info) => resolve(info?.breakStatus === 'viewed'),
      });
    });
  }
  // 'reward': beforeReward(showAdFn) só é chamado se houver anúncio; o jogo já perguntou ao jogador, então mostra direto
  rewardedBreak(where = 'reward') {
    if (!this.ready) return Promise.resolve(false);
    return new Promise((resolve) => {
      let earned = false;
      window.adBreak({
        type: 'reward', name: String(where),
        beforeAd: () => this.adStarted(),
        afterAd: () => this.adFinished(),
        beforeReward: (showAdFn) => showAdFn(),
        adDismissed: () => { earned = false; },
        adViewed: () => { earned = true; },
        adBreakDone: () => resolve(earned),
      });
    });
  }
}
