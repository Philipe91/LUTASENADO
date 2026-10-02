# Brief comum para agentes de personagem (01/10)

- Repo principal: D:\projetos\GAMELUTA (main). Você trabalha numa worktree isolada.
- Setup: `cmd /c mklink /J node_modules D:\projetos\GAMELUTA\node_modules`; vite numa porta própria (`npx vite --port <P>`); snaps/vídeos com `RK_URL=http://localhost:<P>/` em tools/snap.mjs e tools/record.mjs, sempre com `&msaa=0`. Não edite arquivos durante uma gravação (HMR derruba).
- Leia: MOVESET_PLANO.md (seção do(s) seu(s) personagem(ns) + Regras), CHATGPT_DESIGN.md, ARTE.md, um personagem completo como modelo (src/data/characters/lulacio.js + src/visual/ultimates/LulacioPolvo.js + src/visual/fx/*), src/fight/Fighter.js (especiais/passivas), tests/specials.mjs, tests/ult_hits.mjs.
- Crie src/data/characters/<id>.js e registre em src/data/characters/index.js (adicione SÓ a sua linha de import/entrada — outros agentes fazem o mesmo em paralelo). FX em src/visual/fx/<id>Fx.js; ultimate em src/visual/ultimates/<Nome>.js. Registre nos mapas existentes (SpecialFx / ULTIMATE_FX) com o mínimo de linhas.
- Modelo 3D: ainda NÃO existe. Use o placeholder (`visual.placeholder` com cores/traços do personagem — veja references/<id>/ref_front.png) e deixe `visual.model: 'assets/characters/<id>/model.glb'` apontado: quando o GLB chegar ele entra sozinho. Use `visual.animations: ['assets/characters/xandor/model.glb','assets/characters/lulacio/model.glb']` + `visual.clips` com nomes de clips desses GLBs para já ter animação de luta quando o GLB existir (veja os clips em xandor.js/lulacio.js). FX devem se prender ao corpo via bodyPoint (src/visual/fx/common.js), que funciona com placeholder e GLB.
- Ordem: golpe meme → especiais → passiva → ultimate → VFX → balanceamento. Mecânicas novas (counter, clone, assist, barra extra) em src/fight/ SEM Three.js, genéricas e por dados, sem quebrar os outros.
- Sátira absurda/fantasia: nada de afirmação jurídica, crime real, armas reais. Personagens são versões paródicas.
- Validação: `npm run build`, `npm run sim` (todos entre 38–62%), `node tests/specials.mjs <id>`, `node tests/ult_hits.mjs`. Um vídeo vertical 720x1280 por golpe meme e pela ultimate em videos/equipe/<id>_*.mp4; olhe frames (ffmpeg → jpg → Read). Confira `&stats=1`.
- ECONOMIA de token: objetivo, sem leituras desnecessárias, 1–2 iterações por golpe.
- Ao final: atualize CHATGPT_DESIGN.md (seção do personagem + 1 linha no Log) e marque ✅ em MOVESET_PLANO.md. Commits em português terminando com:
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GNZx7bKcsTESKvykeDqqCj
  Sem push. RELATÓRIO: branch, commits, golpes funcionais, como testar (URL `?p1=<id>&p2=xandor&mode=cpu&cast=neutral|forward|down|ultimate&meter=1`), o que é placeholder, performance.
