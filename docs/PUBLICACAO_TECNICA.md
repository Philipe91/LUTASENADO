# Publicação técnica — República Kombat em portais HTML5 e na web

Preparação do jogo para ir ao ar com anúncios (Poki, CrazyGames, GameDistribution, Google H5 Games Ads) e no
site próprio (PWA). Este documento diz **o que foi feito**, **como gerar o build de cada portal** e o
**checklist de cada portal**, com os links das documentações oficiais consultadas (outubro/2026).

> Os adaptadores de portal são esqueletos escritos a partir da documentação oficial, **sem conta e sem SDK real
> testado**. Antes de enviar, valide cada um na ferramenta do portal (Poki Inspector, CrazyGames QA tool, etc.).

---

## 1. O que mudou

### 1.1 Carregamento em duas etapas (boot leve + jogo sob demanda)

| | antes | depois |
|---|---|---|
| JS para a 1ª tela | 1 arquivo de 1.059 kB (301 kB gzip), tela preta até baixar e rodar tudo | boot de 13,5 kB (5,6 kB gzip) + CSS 32 kB (7,4 kB gzip) |
| motor + lutas | junto do boot | `three` 661 kB (171 kB gzip, cache longo, muda raramente) + `game` 433 kB (141 kB gzip), baixados enquanto o título já está na tela |
| fontes | Google Fonts (requisição externa, proibida no Poki) | `public/fonts/` (Bangers + Inter latin, 72 kB, OFL) com `preload` |
| SDKs dos portais | — | um chunk de ~1 kB por adaptador, só o escolhido é baixado |
| tela de carregamento | nenhuma | `#boot` inline no `index.html` (aparece no 1º quadro, sem JS) → título com barra |

- `src/main.js` é o **boot**: guardas de celular, nível de qualidade, SDK do portal (máx. 4 s), título.
  Dispara `import('./game.js')` na primeira linha, em paralelo com tudo.
- `src/game.js` é o jogo de antes (palco, HUD, som, lutas). `init()` é assíncrono: cede a vez ao navegador entre
  as etapas e **pré-compila os shaders** (`renderer.compileAsync` com o mesmo alvo HDR do Look e o recorte já
  ligado) antes do 1º quadro — no celular com `KHR_parallel_shader_compile` isso sai da thread principal.
- O botão **JOGAR** funciona antes do jogo terminar de baixar: o clique fica "na fila" e a luta começa sozinha.

### 1.2 Modelos 3D sob demanda, leves e com prioridade

- **Só os 2 lutadores da luta** são baixados, numa tela "VS" com barra de progresso **em bytes**
  (`src/visual/preload.js`, tamanhos do catálogo `virtual:rk-assets`).
- **Pré-busca**: enquanto o jogador está no título, a luta rápida (1 toque) já baixa; na seleção, cada escolha
  pré-busca o par escolhido (`requestIdleCallback`).
- **Essencial x extra**: a tela de carregamento espera só modelo + animações. Forma da ultimate, props, multidão do
  Lulácio e invocações descem 2,5 s depois, com a luta rolando. (Antes a multidão de 1,5 MB baixava ao abrir o jogo,
  mesmo sem o Lulácio na luta.)
- **Variante leve `.m.glb`** (níveis baixo/médio e economia de dados/3G): texturas 2048 → 1024 px WebP, malha Draco.
  Total dos lutadores 17,9 MB → 11,7 MB; **memória de vídeo por lutador ~67 MB → ~17 MB** (3 texturas RGBA+mips).
- **Bibliotecas de animação `.anim.glb`**: todo lutador pegava emprestados os clips do Lulácio e do Xandor e,
  para isso, baixava **os dois modelos inteiros** (2 × ~2 MB). Agora vem só esqueleto + clips, comprimidos com
  `EXT_meshopt_compression` (quatérnios quantizados): 2.098 kB → 433 kB e 2.048 kB → 474 kB. Se o modelo inteiro
  já está na luta (é um dos lutadores), ele é reaproveitado.
- **Nada de 404**: o plugin `rk-assets` (vite.config.js) lista o que existe em `public/assets`; o jogo não pede
  `ultimate.glb`, `shared.glb`, `caminhao.glb`… que ainda não existem (antes cada um era um erro no console).
- Gerar as variantes depois de trocar um GLB: `npm run assets:optimize` (`tools/optimize_glb.mjs`, pula o que já
  está atualizado; `--force` refaz).

### 1.3 Níveis de qualidade automáticos (`src/platform/quality.js`)

| nível | teto do pixel ratio | MSAA (alvo HDR) | bloom | sombra | modelos |
|---|---|---|---|---|---|
| baixo | 1.0 | 0 | não | 512 | `.m.glb` |
| médio | 1.5 | 2 | sim | 1024 | `.m.glb` |
| alto | 2.0 | 4 | sim | 2048 | originais |

- Escolha inicial: `?quality=` > escolha salva (botão GRÁFICOS no título: AUTO/BAIXA/MÉDIA/ALTA) > rebaixamento
  automático salvo > detecção (celular, `deviceMemory`, núcleos, GPU por software).
- **Governador de FPS**: na luta, abaixo de ~40 fps por 2,5 s seguidos → desce um nível na hora (pixel ratio,
  bloom, MSAA, sombra) e avisa; a escolha fica salva para a próxima sessão. Nunca sobe sozinho.
- O canvas não tem mais MSAA próprio quando o Look está ligado (a cena já vai para um alvo HDR com MSAA; o MSAA do
  canvas era memória e banda jogadas fora, pesado no celular).

### 1.4 Robustez

- **Pausa e silêncio** (`setHold` em `game.js`, `audio.hold` em `src/audio/index.js`): motivos acumulam —
  `hidden` (aba escondida/`pagehide`), `user` (Esc/P/botão ⏸), `ad` (anúncio), `context` (WebGL perdido).
  Com qualquer motivo: a lógica e o desenho param, o `AudioContext` é suspenso, o locutor cala, teclas e toque
  são soltos. Ao voltar de uma aba escondida no meio da luta, o jogo fica no menu **PAUSA** esperando o jogador.
- **Contexto WebGL perdido**: `preventDefault` + pausa + aviso; no `webglcontextrestored` o three recria tudo e a
  luta segue (testado com `forceContextLoss/Restore`).
- **Celular**: sem pinça, duplo toque, ctrl+roda, menu de contexto ou rolagem por setas/espaço
  (`src/platform/system.js`); `viewport-fit=cover` + áreas seguras; `100dvh`; funciona em retrato e paisagem.
- **Tela cheia**: botão ao lado dos de som (tenta travar em paisagem no celular). Desligado no Poki e na
  CrazyGames, que têm o controle próprio.
- **Console limpo**: sem 404, sem requisição externa (fora o SDK do portal), sem erro — verificado em `tests/publish.mjs`.
- **PWA / cache**: `manifest.webmanifest`, ícones (`public/icons`, gerados por `tools/make_icons.mjs`) e
  `sw.js` (página: rede primeiro; JS/CSS com hash: cache primeiro; GLB/retratos/fontes: cache + atualização por
  trás). Registrado **só no site próprio** (não em iframe, não nos adaptadores de portal).

### 1.5 Pontos de anúncio — arquitetura (`src/platform/`)

```
src/platform/
  Platform.js           interface única + loadScript (SDK nunca derruba o jogo)
  index.js              PlatformService: escolhe o adaptador e aplica as regras do jogo
  adapters/null.js      padrão (site próprio/itch): tudo no-op
  adapters/dev.js       ?platform=dev: anúncio falso de 1,5 s + log de cada gancho (testes)
  adapters/poki.js      PokiSDK v2
  adapters/crazygames.js  CrazyGames SDK v3
  adapters/google.js    Google H5 Games Ads — Ad Placement API (adBreak/adConfig)
  adapters/gamedistribution.js  GD SDK
  storage.js · quality.js · assets.js · unlocks.js · system.js
```

Interface (`Platform.js`): `init`, `loadingProgress`, `gameLoadingFinished`, `gameplayStart`, `gameplayStop`,
`commercialBreak(lugar)`, `rewardedBreak(lugar)`, `happytime`, `shareUrl(params)`; capacidades `hasAds`,
`hasRewarded`, `fullscreenButton`, `serviceWorker`. O adaptador chama `adStarted()/adFinished()` e o jogo pausa e
silencia.

Escolha: `?platform=<nome>` > `VITE_PLATFORM` > modo do build (`vite build --mode poki`) > `null`.

Onde cada gancho é chamado:

| gancho | quando |
|---|---|
| `gameLoadingFinished` | jogo pronto no título (uma vez) |
| `gameplayStart` | luta com humano começa / volta da pausa |
| `gameplayStop` | fim da luta, pausa, aba escondida, anúncio, menu |
| `commercialBreak` | **só entre lutas**: ao tocar REVANCHE ou TROCAR LUTADOR na tela de resultado |
| `rewardedBreak` | lutador bloqueado → "ASSISTIR ANÚNCIO" (libera **nesta sessão**) |
| `happytime` | vitória contra a CPU |
| `shareUrl` | botão COMPARTILHAR (Poki gera o link próprio) |

Regras do `PlatformService` (independentes do portal): anúncio com luta em andamento é **recusado**; intervalo
comercial nunca antes da 1ª luta terminar e no máximo 1 a cada 60 s (o portal ainda filtra por cima); SDK que não
avisa o fim do anúncio não deixa o jogo travado em pausa.

**Lutadores bloqueados** (`unlocks.js`): só existem quando o portal tem anúncio com recompensa (ou `?locks=1`).
Os 4 mais novos (Dilma, Haddad, Boulos, Renan) começam bloqueados; **vencer a CPU libera o próximo para sempre**
(localStorage); **assistir um anúncio libera um por esta sessão**. No site sem anúncios, todos ficam livres.

### 1.6 Retenção

- **Título** com JOGAR (luta rápida em 1 toque: último lutador ou sorteio x CPU sorteada), ESCOLHER LUTADOR,
  dificuldade da CPU e gráficos (salvos), placar de vitórias / sequência / recorde.
- **Preferências salvas** com try/catch (`storage.js`; aba anônima/iframe sem storage = só memória).
- **COMPARTILHAR** no resultado (vitória contra a CPU): Web Share no celular, senão copia texto + link de desafio
  `?vs=vencedor.perdedor` — quem abre vê "DESAFIO: X x Y" e o JOGAR vira ACEITAR DESAFIO.
- Seleção com VOLTAR; Esc volta da seleção ao título.

---

## 2. Ganhos medidos

Build `vite build`, servido por `vite preview` (sem gzip), Chrome headless com GPU por software, cache e service
worker desligados (1ª visita). Rede simulada pelo DevTools. Par: Lulácio x Capitão Brasa (o mais pesado).
Comando: `node tools/loadbench.mjs <url> new|base 4g|slow4g <larg> <alt>`.

| celular 540×960 | antes (main) | depois (nível médio) |
|---|---|---|
| 1ª tela interativa (4G 9 Mbit/s) | seleção em 2,90 s (2,41 MB, incl. multidão) | **título em 0,2–0,6 s** (0,04 MB) |
| jogo pronto para tocar | — | **2,0–2,5 s** |
| luta jogável **com os modelos 3D** (4G) | 11,5 s · 7,87 MB | **6,6 s · 4,05 MB** |
| luta jogável com os modelos 3D (4G lento 1,6 Mbit/s) | 41,7 s · 7,87 MB | **24,3 s · 4,11 MB** |
| desktop 1280×720, nível alto (4G) | 12,6 s · 7,87 MB | 12,4 s · 5,0 MB (texturas 2048) |

Com a pré-busca, quem passa ~4 s no título entra na luta **na hora** (a tela VS nem aparece). A meta "< 5 s em 4G"
é cumprida para o título interativo e o jogo pronto; a 1ª luta com o par mais pesado leva ~6,6 s se o jogador
tocar JOGAR no mesmo instante em que o botão libera.

Lighthouse 12 (mobile, 4G lento + CPU 4×, GPU por software — pessimista para WebGL):

| | antes | depois |
|---|---|---|
| First Contentful Paint | 7,1 s | **2,1 s** |
| Largest Contentful Paint | 14,8 s | **4,1 s** |
| Speed Index | 7,1 s | **4,7 s** |
| Time to Interactive | 15,0 s | **7,2 s** |
| bytes até carregar | 2.649 KiB | **431 KiB** |
| Best Practices | 93 | 96 |

O Total Blocking Time subiu (270 ms → ~3,8 s) porque agora a montagem do motor e a compilação de shaders
acontecem durante a medição (antes ainda estavam esperando a rede). Com GPU por software não há compilação
paralela; em aparelho real o `compileAsync` tira a maior parte disso da thread principal.

Tamanho do deploy: `dist/` 22 MB → 36 MB (as variantes `.m.glb`/`.anim.glb` ficam ao lado das originais).
Cada sessão baixa menos; o total está bem abaixo dos limites (CrazyGames: 250 MB, 1.500 arquivos).

---

## 3. Como gerar o build de cada portal

```bash
npm run build                    # site próprio / itch.io (adaptador nulo, PWA) → dist/
npm run build:poki               # → dist-poki/
npm run build:crazygames         # → dist-crazygames/
VITE_ADSENSE_CLIENT=ca-pub-XXXX npm run build:google         # → dist-google/  (site próprio com AdSense H5)
VITE_GD_GAME_ID=<id> npm run build:gamedistribution          # → dist-gamedistribution/
```

No Windows (PowerShell): `$env:VITE_ADSENSE_CLIENT='ca-pub-XXXX'; npm run build:google`.
Empacotar para upload: `Compress-Archive -Path dist-poki\* -DestinationPath republica-kombat-poki.zip`
(o `index.html` precisa ficar na raiz do zip; todos os caminhos já são relativos — `base: './'`).

Testar sem build: `npm run dev` e abrir `?platform=dev` (anúncios falsos), `?platform=dev&locks=1` (com
bloqueio), `?platform=crazygames&useLocalSdk=true` (SDK local da CrazyGames), `?platform=google&adtest=1&adclient=ca-pub-XXXX`.
Testar o build: `npx vite preview --port 5228` e `RK_URL=http://localhost:5228/ npm run test:publish`.

Antes de cada envio: `npm run assets:optimize` (se algum GLB mudou), `npm run build:<portal>`,
`npm run sim`, `node tests/feel.mjs`, `node tests/specials.mjs`, `npm run test:publish`.

---

## 4. Checklists por portal

### Poki — [SDK HTML5](https://developers.poki.com/guide/sdk-html5) · [requisitos](https://developers.poki.com/guide/requirements-quality) · [Inspector](https://inspector.poki.dev/)
- [x] `PokiSDK.init()` com `catch` (bloqueador de anúncio não impede o jogo)
- [x] `gameLoadingFinished()` quando o título fica pronto
- [x] `gameplayStart()`/`gameplayStop()` na luta, pausa, fim e menu
- [x] `commercialBreak()` só em pausa natural (entre lutas); `rewardedBreak()` opcional (desbloqueio)
- [x] áudio pausado e teclado desligado durante o anúncio; setas/espaço não rolam a página
- [x] Esc / espaço-equivalente pausa (Esc ou P)
- [x] localStorage com try/catch (aba anônima)
- [x] nenhuma requisição externa (fontes locais; sem service worker no iframe)
- [x] tela inteira em retrato e paisagem; controles por toque no celular/tablet
- [x] links compartilháveis via `PokiSDK.shareableURL`
- [ ] carregamento < 10 s em rede comum (medir no Inspector com a URL real)
- [ ] remover/ocultar atalhos de depuração (F1/F2, `?debug`) se o Poki pedir build "limpa"
- [ ] links externos (se surgirem) via `PokiSDK.openExternalLink`
- [ ] revisão de conteúdo: sátira política — conferir a política de conteúdo do portal ([Content & player safety](https://developers.poki.com/guide/content-player-safety))

### CrazyGames — [SDK v3](https://docs.crazygames.com/sdk/intro/) · [eventos de jogo](https://docs.crazygames.com/sdk/game/) · [anúncios em vídeo](https://docs.crazygames.com/sdk/video-ads/) · [requisitos técnicos](https://docs.crazygames.com/requirements/technical/) · [requisitos de anúncio](https://docs.crazygames.com/requirements/ads/)
- [x] `await SDK.init()`; checa `SDK.environment` (fora do domínio = `disabled` → no-op)
- [x] `loadingStart()` no início, `loadingStop()` quando pronto
- [x] `gameplayStart()` obrigatório (o download inicial é medido até ele: ~0,4 MB de JS + 3–4 MB de modelos, abaixo dos 20 MB do celular e 50 MB do desktop)
- [x] `requestAd('midgame')` entre lutas, `requestAd('rewarded')` no desbloqueio; pausa/silêncio em `adStarted`
- [x] `happytime()` na vitória
- [x] `user-select: none`, caminhos relativos, mouse + teclado + toque, áreas seguras
- [x] áudio retomado só dentro de gesto do usuário (iOS)
- [ ] testar no QA tool da CrazyGames e em Chromebook (4 GB)
- [ ] sem botão de tela cheia próprio (já desligado no adaptador)

### Google H5 Games Ads — [Ad Placement API](https://developers.google.com/ad-placement/apis)
- [x] `adsbygoogle.js` com `data-ad-client` (do build: `VITE_ADSENSE_CLIENT`), `adBreak`/`adConfig` definidos
- [x] `adConfig({ preloadAdBreaks: 'auto', sound: 'on' })`; `preroll` antes da 1ª tela
- [x] `type: 'next'` entre lutas com `beforeAd`/`afterAd` (pausa e silêncio) e `adBreakDone` (sempre chega)
- [x] `type: 'reward'` com `beforeReward(showAdFn)`, `adViewed` (recompensa) e `adDismissed`
- [x] `data-adbreak-test="on"` com `?adtest=1` para desenvolvimento
- [x] `adConfig({ sound })` acompanha o botão de som (evento `mute` do gameBus → `platform.setSound`)
- [ ] conta AdSense aprovada para H5 Games e `ads.txt` no domínio

### GameDistribution — [SDK HTML5](https://github.com/GameDistribution/GD-HTML5/wiki/SDK-Implementation)
- [x] `GD_OPTIONS` com `gameId` (`VITE_GD_GAME_ID`) e `onEvent`: `SDK_GAME_PAUSE` → pausa/silêncio, `SDK_GAME_START` → volta
- [x] `gdsdk.showAd()` entre lutas (a partir de clique do jogador) e `showAd('rewarded')` + `SDK_REWARDED_WATCH_COMPLETE`
- [ ] testar no ambiente do GD e conferir os requisitos de envio do painel

### Site próprio / itch.io (adaptador nulo)
- [x] PWA (manifest, ícones 192/512/maskable, service worker com cache por versão)
- [x] todos os lutadores livres, sem anúncio
- [ ] servir com gzip/brotli (JS cai para ~0,3 MB) e cache longo em `assets/*` (nomes com hash)

---

## 5. Arquivos

- Novos: `src/main.js` (boot), `src/game.js` (jogo), `src/platform/*`, `src/ui/TitleScreen.js`,
  `src/ui/Overlays.js`, `src/visual/preload.js`, `public/sw.js`, `public/manifest.webmanifest`, `public/icons/*`,
  `public/fonts/*`, `public/assets/characters/*/model.m.glb`, `.../model.anim.glb`, `tools/optimize_glb.mjs`,
  `tools/make_icons.mjs`, `tools/loadbench.mjs`, `tests/publish.mjs`.
- Alterados: `vite.config.js` (plugins `rk-assets` e `rk-sw`, chunk `three`), `index.html`, `package.json`,
  `GLBModel.js` (catálogo, variantes, meshopt), `projectiles.js` (multidão sob demanda), `Look.js`
  (`applyQuality`), `Stage.js` (teto de pixel ratio, MSAA do canvas opcional), `audio/index.js` (`hold`),
  `Hud.js` (resultado com aviso e compartilhar), `SelectScreen.js` (bloqueio, voltar, preferências), `style.css`.
- Ferramentas de teste continuam iguais: URL com `p1=`/`mode=demo` pula o título e a tela de carregamento
  (`tools/snap.mjs`, `tools/record.mjs`, `?manual=1`).
