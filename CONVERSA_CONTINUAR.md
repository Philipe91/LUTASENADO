# CONVERSA — continuar daqui
> Atualizado a CADA commit + push. Numa conversa nova: "leia D:\projetos\GAMELUTA\CONVERSA_CONTINUAR.md e continue".
> Rodar o jogo: `cd D:\projetos\GAMELUTA` → `npx vite --port 5199` → http://localhost:5199/?p1=lulacio&p2=xandor&mode=cpu
> Controles P1: A/D andar · W pular · S agachar · J soco · K chute · L especial (+frente/baixo) · U ultimate (barra cheia). `&meter=1` começa com barra cheia.

## Estado (30/09 tarde)
- Poderes novos: Abraço giratório (3 voltas + arremesso), Discurso que atordoa (estrelinhas), Xandor com Intimação/BLOQUEADO/Canetada legíveis. Ultimates só mostram contato quando acerta. Enquadramento do Avatar corrigido. Provas em `canal_ia/evidencias/poderes_30-09/`.
- Servidor: janela própria do cmd minimizada ("GAMELUTA servidor"); `node tools/snap.mjs "<query>" "t1,t2" videos/snap/x 540 960 [gap]` tira fotos em instantes exatos.

## Estado (30/09 manhã)
- Xandor e Lulácio em 3D (Meshy). Capitão Brasa e Dino ainda placeholder.
- Noite 29→30: câmera celular, agachar, contato dos golpes, pisão, Picanha com civis 3D, pulo, ultimate Xandor (VFX), protótipo Polvão. Detalhes: RELATORIO_NOITE_30-09.md.
- Canal com o GPT: `canal_ia/` (README, consenso.md). Monitor Codex: limite 60% semanal.

## Feedback do usuário 30/09 (a fazer, em ordem)
1. [x] (30/09) pescoço erguido em TODAS as animações (poseFix '*'). Xandor com "cara gorda/estranha" LUTANDO (não só parado).
2. [x] (30/09) skin dourada metálica + 1.75× (transform.gold). Xandor na ultimate tem que ficar DOURADO de verdade (skin dourada) e grande.
3. [~] polvo existe (protótipo) — ativa com U com a barra cheia; melhorar. Lulácio tem que virar o MOLUSCO/polvo de forma clara.
4. [~] (30/09 tarde) Lulácio: Discurso atordoa + Abraço gira 3x e arremessa; Xandor: Intimação/BLOQUEADO/Canetada com visual próprio. Falta Brasa e Dino. Cada personagem com SEUS poderes do plano (GDD + CHATGPT_DESIGN): Discurso (cone de ondas, atordoa), Picanha, Abraço (gira 3x e arremessa); Intimação, Bloqueado, Canetada; Brasa e Dino depois.
5. [x] (30/09) picanha 1.8× maior, arco mais alto/lento, rastro. Picanha: dá pra VER sendo jogada (maior, mais lenta, rastro).
6. [~] (30/09) GAME_SPEED 0.8 (?speed= testa) + zoom-soco da câmera em golpe forte; falta mais dinamismo. Jogo rápido demais → desacelerar; mais dinamismo (impacto, câmera, slow-mo, feedback), ficar gostoso de jogar.

## Histórico de commits
- 2fec3f7 poderes: Abraço giratório, Discurso atordoa, especiais do Xandor, contato real nas ultimates, enquadramento do Avatar · 6a24ff3 feedback manhã 30/09 (Xandor pescoço+ouro, picanha visível, jogo 0.8×) · 6e8abb6 relatório da noite · 51d2bf5 poderes · 48e131f ultimates · 5a58054 combate · 837443a canal · 8b29df7 checkpoint Lulácio/Xandor

## Estado (02/10 madrugada) — limite de uso atingido, retomar daqui
- NA MAIN: som, cenário (backdrop GPT + arena noite), arte (Look/HUD), poderes v1, movimento/câmera retrato, **Vorcaro completo** (placeholder), plano `MOVESET_PLANO.md`, brief `EQUIPE_BRIEF.md`, logo `art/ui/logo.png`, ref. jacaré `references/capitao-brasa/ultimate/jacare_ref.png`.
- BRANCHES DE AGENTES AINDA NÃO INTEGRADAS (verificar `git log main..<branch>` e fazer merge): `worktree-agent-a958a26cb3e85a09e` (moveset Brasa/Dino + jacaré/T-Rex orgânicos), `worktree-agent-ae8aade9189a42f6a` (Nikolas + Erika + seleção 9 lutadores), `worktree-agent-a1d3137cd7e1385dd` (Flávio + Duval). Avisados do bug do vite (corrigido em 26fff7e) — revalidar vídeos.
- MESHY: gerados+remesh 30K: Brasa v2, Dino v2 (toga), Nikolas, Flávio, Vorcaro, Duval, Erika, jacaré (ultimate, falta remesh). Rig enviado: Brasa v2, Dino v2, Flávio, Nikolas. FALTA: rig Vorcaro/Duval/Erika; Texto-para-Motion (estilo próprio de cada um: guarda + 2 gestos de especial); baixar GLB (glb, Mixamo, rigged, todas, arquivo único) → otimizar → `public/assets/characters/<id>/model.glb` → mapear clips.
- GPT: T-Rex bizarro pedido na conversa "Gerar imagem 3D" — baixar e mandar ao Meshy como ultimate do Dino.
- Balanceamento (sim 02/10): vorcaro 63%, dino 35% — ajustar depois das integrações.

## Estado (02/10 manhã) — atualizar daqui
- Atalho: `CONTINUAR_CONVERSA.bat` na raiz (1 = retoma a conversa, 2 = conversa nova lendo este arquivo).
- NA MAIN: 9 lutadores jogáveis (Lulácio, Xandor, Capitão Brasa, Dino, Nikolas, Erika, Flávio, Vorcaro, Duval), cada um com passiva + 3 especiais + ultimate + golpe meme (ver `MOVESET_PLANO.md`). Seleção com N lutadores.
- MODELOS 3D: todos os 9 em `public/assets/characters/<id>/model.glb` (Meshy, rig Mixamo). Golpes ainda EMPRESTADOS dos GLBs do Xandor/Lulácio (`visual.animations` + `visual.clips`), combinação diferente por estilo.
- FALTA: (1) Texto para Motion do Meshy travou (15 min, cobrou 10 créditos, não salvou) — tentar de novo para movimentos exclusivos; (2) jacaré 3D gerado no Meshy (falta remesh+download → `capitao-brasa/ultimate.glb`); T-Rex bizarro pedido no GPT (baixar → Meshy → `dino-supremo/ultimate.glb`); (3) retratos da seleção (tools/portraits.py) para os 7; (4) balanceamento (sim: Vorcaro 64%, Xandor 39%); (5) agentes sem relatório final: Nikolas/Erika, Flávio/Duval, Brasa/Dino — revalidar golpes.
- VÍDEOS: `videos/noite/republica_kombat_parte01_narrada.mp4` e `parte02_narrada.mp4` (narração edge-tts pt-BR-AntonioNeural + música do jogo renderizada por `tools/_render_music.mjs` + sfx `tools/_render_sfx.mjs`; montagem `videos/noite/narr/build.py`, roteiro `narr/script.json`).
- CUIDADO: o PC trava com 4+ agentes gravando vídeo (CPU 100%, RAM acaba) — no máximo 2 agentes quando for usar o Meshy no navegador. Meshy: 700 créditos.
