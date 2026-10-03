// BOOT: pacote mínimo (sem three.js). Mostra a tela de título no 1º segundo e baixa o jogo por trás.
//   1. guardas de celular/portal, nível de qualidade (sem WebGL pesado), SDK da plataforma (máx. 4 s)
//   2. import('./game.js') em paralelo → three.js + lutas num pacote separado (cache longo)
//   3. título interativo já durante o download; JOGAR fica na fila até o jogo ficar pronto
// URL com p1=/mode=demo (testes, gravações, links antigos) pula o título e vai direto para a luta.
import './style.css';
import { platform } from './platform/index.js';
import { quality } from './platform/quality.js';
import { unlocks } from './platform/unlocks.js';
import { installGuards, registerServiceWorker } from './platform/system.js';
import { TitleScreen } from './ui/TitleScreen.js';

const params = new URLSearchParams(location.search);
const bootEl = document.getElementById('boot');
const hideBoot = () => { bootEl?.classList.add('out'); setTimeout(() => bootEl?.remove(), 400); };
installGuards();
quality.init(params);
const direct = !!(params.get('p1') || params.get('mode') === 'demo');

// o download do jogo começa já (em paralelo com o SDK do portal)
const gameModule = import('./game.js');

async function main() {
  const t0 = performance.now();
  const ui = document.getElementById('ui');
  let title = null;
  if (!direct) {
    title = new TitleScreen(ui, { onPlay: () => game?.quickPlay(), onChoose: () => game?.openSelect() });
    title.show();
    hideBoot();
  }
  // barra "andando" enquanto o pacote do jogo baixa (import() não dá bytes; o tempo de 4G típico guia a curva)
  let p = 0.08;
  const creep = setInterval(() => { p += (0.85 - p) * 0.06; title?.setProgress(p, 'Carregando o ringue…'); platform.loadingProgress(p); }, 120);

  await platform.init(params);
  unlocks.init(params, platform.hasRewarded);
  registerServiceWorker();

  let game = null;
  try {
    const mod = await gameModule;
    game = await mod.init({ params, platform, title });
  } catch (e) {
    clearInterval(creep);
    console.error(e);
    title?.setProgress(1, 'Falha ao carregar. Verifique a conexão e recarregue a página.');
    return;
  }
  clearInterval(creep);
  if (direct) { game.autostart(); hideBoot(); return; }

  // pré-busca a luta rápida (1 toque) enquanto o jogador olha o título
  game.prefetchQuick();
  const ch = game.challengeText();
  if (ch) title.setChallenge(ch);
  title.setProgress(1);
  title.setReady();
  platform.gameLoadingFinished();
  console.info(`[boot] pronto em ${Math.round(performance.now() - t0)} ms · plataforma ${platform.name} · qualidade ${quality.tier}`);
}
main();
