// INTERFACE ÚNICA DE PLATAFORMA (portais / anúncios). O jogo só conversa com isto; cada portal é um adaptador.
//
//   init()                    carrega o SDK (nunca rejeita: sem SDK o jogo segue como o adaptador nulo)
//   loadingProgress(0..1)     progresso do carregamento inicial (portais que mostram barra própria)
//   gameLoadingFinished()     o jogo está pronto para jogar (Poki: obrigatório)
//   gameplayStart()           o jogador está LUTANDO (após carregar a luta, ao voltar da pausa)
//   gameplayStop()            parou de lutar (fim da luta, pausa, menu, aba escondida)
//   commercialBreak(lugar)    intervalo comercial (interstitial). Só ENTRE lutas. Promise<boolean anúncio exibido>
//   rewardedBreak(lugar)      anúncio com recompensa escolhido pelo jogador. Promise<boolean recompensa ganha>
//   happytime()               momento de alegria (vitória) — CrazyGames usa para métricas
//   shareUrl(params)          link compartilhável (Poki tem o próprio); Promise<string>
//
// Durante um anúncio o adaptador chama this.adStarted() / this.adFinished(): o PlatformService pausa o jogo,
// silencia o som e solta os controles (exigência de todos os portais).
//
// Capacidades (o jogo adapta a UI):
//   hasAds          há interstitial (senão commercialBreak resolve na hora, sem nada)
//   hasRewarded     há anúncio com recompensa (senão o botão "assistir para liberar" não aparece)
//   fullscreenButton  o jogo pode mostrar o próprio botão de tela cheia (Poki/CrazyGames têm o deles)
//   serviceWorker   pode registrar service worker/PWA (não dentro do iframe de portal)
export class Platform {
  constructor(name = 'null') {
    this.name = name;
    this.hasAds = false;
    this.hasRewarded = false;
    this.fullscreenButton = true;
    this.serviceWorker = true;
    this.onAd = null; // (true|false) → PlatformService
  }
  async init() {}
  loadingProgress() {}
  gameLoadingFinished() {}
  gameplayStart() {}
  gameplayStop() {}
  async commercialBreak() { return false; }
  async rewardedBreak() { return false; }
  happytime() {}
  async shareUrl(params) {
    const u = new URL(location.href.split('?')[0]);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  }
  adStarted() { this.onAd?.(true); }
  adFinished() { this.onAd?.(false); }
}

// injeta o <script> do SDK; resolve false (sem quebrar) em erro, bloqueador de anúncio ou demora
export function loadScript(src, attrs = {}, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    const t = setTimeout(() => resolve(false), timeoutMs);
    s.onload = () => { clearTimeout(t); resolve(true); };
    s.onerror = () => { clearTimeout(t); resolve(false); };
    document.head.appendChild(s);
  });
}
