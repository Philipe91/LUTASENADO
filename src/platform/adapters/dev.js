// Adaptador de TESTE (?platform=dev): finge anúncios com uma tela de 1,5 s e loga cada gancho no console.
// Serve para ver, sem SDK, se os ganchos caem nos momentos certos e se o jogo pausa/silencia durante o "anúncio".
import { Platform } from '../Platform.js';

export default class DevPlatform extends Platform {
  constructor() {
    super('dev');
    this.hasAds = true;
    this.hasRewarded = true;
    this.log = [];
  }
  note(what) { this.log.push(what); console.info(`[platform:dev] ${what}`); }
  async init() { this.note('init'); }
  gameLoadingFinished() { this.note('gameLoadingFinished'); }
  gameplayStart() { this.note('gameplayStart'); }
  gameplayStop() { this.note('gameplayStop'); }
  happytime() { this.note('happytime'); }
  fake(label, ms = 1500) {
    return new Promise((resolve) => {
      this.adStarted();
      const el = document.createElement('div');
      el.className = 'fakead';
      el.innerHTML = `<div><b>ANÚNCIO DE TESTE</b><small>${label}</small></div>`;
      document.body.appendChild(el);
      setTimeout(() => { el.remove(); this.adFinished(); resolve(); }, ms);
    });
  }
  async commercialBreak(where) { this.note(`commercialBreak(${where})`); await this.fake(`intervalo · ${where}`); return true; }
  async rewardedBreak(where) { this.note(`rewardedBreak(${where})`); await this.fake(`recompensa · ${where}`); return true; }
}
