# CHATGPT DESIGN UPDATES

> Canal de decisões de design. **Ler antes de mexer em personagens, golpes, VFX ou balanceamento.**
> O que está aqui tem prioridade sobre versões antigas do GDD.md. Manter curto: atualizar a seção do personagem ou acrescentar no fim.
> Regra geral dos especiais: **ENTRA → IMPACTA → SOME.** Curtos (≈1–1,8s), legíveis, sem cutscene, sem objetos permanentes (pool/reciclagem), multidões com sprites/silhuetas.

## LULÁCIO
- **Picanha do Povo** (→ + Especial) — *substitui "Companheirada"*. Arremessa uma picanha; ao acertar/chegar perto/cair, surge uma onda de apoiadores fictícios vermelhos (silhuetas) que avança em bloco: multi-hit, knockback no último hit, some rápido. Cooldown médio. `[implementado 29/09]`
- Discurso Interminável (neutro) e Abraço do Palanque (↓) mantidos.
- **Ultimate: O Polvão do Povo** — polvo gigante com barba/gravata/microfone; tentáculos atacam. `[VFX 01/10: nuvem de tinta → polvo com chapéu, 8 tentáculos com ventosas no chão + 9º que esmaga no final (gag do GDD)]`

## CAPITÃO BRASA
- **Rajada** (neutro, "Talkei Rajada" / ataque de dedo) — mantido. `[VFX 01/10: estrelas de impacto, linhas de velocidade, balões "TALKEI?"]`
- **Motociata** (→) — mantido. `[VFX 01/10: moto nasce embaixo dele empinando + 3 motos instanciadas com pilotos atravessam em faixas de profundidade, fumaça verde-amarela; somem sozinhas]`
- **Patriota no Para-brisa** (↓ + Especial) — *substitui "Live Surpresa"*. Grito curto → caminhão low-poly atravessa a arena com um apoiador fictício pendurado no para-brisa. 1 hit forte, knockback grande, startup perceptível, cooldown alto. `[implementado 29/09; VFX 01/10: cabine/baú "FROTA DO CAPITÃO", farol, escapamento, buzina FOM FOM, apoiador se debatendo no vidro]`
- **Ultimate: Efeito Colateral** — seringa entra, vira jacaré/híbrido mantendo terno/cabelo; finalizador forte e curto. `[VFX 01/10: seringa cai do céu → nuvem verde → jacaré de terno com faixa, cabelo de lado e celular; mordida / rabada 360° / rolo da morte com água]`

## XANDOR
- Intimação, **Bloqueado**, **Canetada** — mantidos.
- **Ultimate: Avatar da Constituição** — entidade divina/judicial: olhos brilhando, aura, selo/círculo atrás, livros/canetas flutuando, toga celestial; termina em martelo colossal / carimbo / canetada divina. Sem `ultimate.glb`: scale + emissive + partículas + luz + overlays.

## DINO SUPREMO
- **Rugido** (neutro) — mantido. `[VFX 01/10: bocarra gigante (sprite) + ondas de choque duplas no cone, poeira e pedrinhas]`
- **Meteoro Didático** (→) — *agora é ZONA*: joga o Vade Mecum pro céu; uma SOMBRA/alvo marca onde o oponente estava e, 30 frames depois, o livro cai em chamas ali (dá pra sair de baixo). 1 hit, 8 de dano, derruba, cooldown 270. Sim: Dino 41% → 52% de vitórias (antes era o mais fraco). `[01/10]`
- **Pisão Cretáceo** (↓) — mantido; agora a pisada treme a tela (`groundFx`) e a onda é uma crista de torrões com rachadura. `[01/10]`
- **Ultimate: T-Rex de Terno** — T-Rex/híbrido com óculos/gravata; gag dos bracinhos que não alcançam os óculos; finalizador pesado e curto. `[VFX 01/10: óculos saem/limpam/crescem, botões voam, poeira → T-Rex de paletó rasgado; mordida / rabada / pisão / ruge e METEORO cai no alvo]`

## VORCARO / "VORCASH" `[01/10 — implementado, placeholder até o GLB]`
Summoner/recursos. Sátira absurda: a maleta é um "portal mágico de contatos" de desenho animado — nada de compra, suborno ou fato real.
- **Passiva LIQUIDEZ** — todo dano causado enche a barra de **CAPITAL** (100; 1,6 por ponto de dano), mostrada como medidor fino com **$** sob a barra de ultimate. Especiais com `capital: { cost, damage }` gastam até `cost` e batem até **+35%** (texto "CAPITAL x1.3"). Mecânica genérica: `passive.resource` + `Fighter.boostSpecial`.
- **Maleta Voadora** (neutro) — maleta em arco; ao acertar ou cair no chão PARA e abre, notas voam (InstancedMesh). 4,5 de dano, cd 200. Hitter genérico: `stopOnHit` / `stopOnGround`.
- **Juros Compostos** (→) — moeda que quica 3×, crescendo 1,32× a cada quique ("JUROS²!"); dano = 2 + 1/m percorrido (máx +6). Hitter genérico: `bounces/bounceV/grow` + `hit.distDamage`.
- **Mala de Contatos** (↓, golpe MEME) — maleta cai aberta no chão com brilho dourado; saem versões paródicas de **Flavão** (rachadura baixa), **Xandor** (BLOQUEADO, trava especiais 1,5s) e **Nikolas** (flash de SELFIE, derruba): 1 golpe cada, em sequência, e somem. Vorcaro fica livre enquanto eles batem. cd 480. Mecânica genérica **assist** (`src/fight/Assist.js`, especial `kind: 'summon'`, por dados). Visual: usa o CharacterData do elenco se existir (Xandor = GLB), senão `visual.assistLooks` (placeholder colorido) apontando `assets/characters/flavio|nikolas/model.glb` — entra sozinho quando existir.
- **Ultimate CAPITAL INFINITO** — cinemática: ergue a maleta, ela abre e jorra moedas/luz. Maleta-portal no céu sobre o alvo; chovem moedas, cartões, maletinhas e gráficos (4 InstancedMesh); o monte dourado cresce até soterrar o inimigo; a maleta fecha e despenca → explosão dourada + painel **SALDO: 0**. 6×3 + 12.
- Sim (12/confronto): Vorcaro 59%, todos entre 38–62%. IA: não se defende mais de Hitters que já não machucam (`Hitter.dangerous`).

## FLAVÃO (`flavio`) — bruiser / impacto `[02/10]`
- **Passiva CLÃ:** abaixo de 30% de vida toma 20% menos dano (`passive.lowHp.defense`, genérico; aviso "CLÃ!" uma vez).
- **Rachadinha Sísmica** (neutro, MEME) — pisão (treme a tela) → rachadura corre pelo chão a 0,24 m/frame (caixa enterrada: passa por baixo de projéteis, não machuca) → a 0,9 m do alvo morre e nasce a **erupção** (`spawnOnEnd`): 1 hit de 7, knock-UP (`hit.launch`, genérico), pedras sobem em coluna, rachadura até o dono some em 12 frames. Cooldown 240.
- **Zero Um** (→) — soco + **clone holográfico** 2 m à frente que repete o soco 7 frames depois (alcance ≈3,4 m). Mecânica genérica `special.clone = { at, offset, delay, life, anim, box, hit }` em `Fighter.updateSpecial` → Hitter com `visual: 'clone'` (fantasma = PlaceholderModel do dono com material de holograma; funciona para qualquer lutador). Cooldown 180.
- **Senador Express** (↓) — cadeira institucional com rodinhas nasce embaixo dele, ele senta e ATRAVESSA o inimigo (`passThrough` + `dash: { from, to, v, past }`: velocidade calculada para parar 1,8 m depois do alvo). 1 hit de 7, derruba. A cadeira segue sozinha, tomba e some. Cooldown 230.
- **Ultimate DINASTIA** — 3 sombras fictícias da "família" (fantasmas verde-escuro com brilho dourado) sobem do chão atrás dele na cinemática; a cada hit ele e as sombras repetem o mesmo golpe (escalonado 2 frames); finaliza com pisão coletivo → **Rachadinha ampliada** (rachadura larga até o alvo, 5 colunas de pedra em sequência, explosão final). Corpo base visível (sem ultimate.glb), `tint` verde.

## AGENTE DUVALL (`duval`) — trap / técnico `[02/10]`
- **Passiva ARQUIVO CONFIDENCIAL:** bloquear um ESPECIAL (`hit.kind`) enche +24 de barra de Ultimate (`passive.blockSpecialMeter`, genérico; "CONFIDENCIAL!").
- **Pendrive Explosivo** (neutro, MEME) — pendrive em arco baixo; ao acertar: 4 de dano + **tonto 26 frames** (estrelinhas), explode em cubos ciano onde acertou (`linger + stopOnSpent + spentLife`, genéricos no Hitter) e sobe o letreiro glitchado **ARQUIVO CORROMPIDO**. Cooldown 190.
- **Vazamento de Dados** (→) — zona no alvo: alvo ciano no chão, pasta CONFIDENCIAL desce e abre a 3,2 m, 10 arquivos caem em sequência (um a cada 4 frames): 5 hits leves (1,4) + final 2,5 com empurrão. Dá pra sair de baixo (delay 20). Cooldown 270.
- **Operação Tática** (↓) — dash curto que ATRAVESSA e para 0,9 m atrás do inimigo (`passThrough` + `dash.past`), vira (`faceAtActive`) e termina em **rasteira** (golpe baixo, 6, derruba). Rastro de 3 sombras azuis. Cooldown 220.
- **Ultimate BACKUP COMPLETO** — pendrive gigante desce e CONECTA numa porta no chão atrás dele (anel + faíscas); painel holográfico acima da cabeça **COPIANDO... 0% → 37 → 62 → 84 → 99%**; cada hit é uma rajada de 6 arquivos do pendrive ao alvo (viram pixels ao acertar; passam direto se errou); finalizador **BACKUP COMPLETO 100%** = explosão de 26 documentos + onda; pendrive ejetado para cima no fim. Corpo base visível, `tint` ciano.

---
## PIPELINE 3D DOS PERSONAGENS
**Papéis:** ChatGPT cria a referência (concept) → Claude faz Meshy Image-to-3D → Remesh → Auto-Rig → GLB → integra e testa.
**Ordem:** Xandor (teste do pipeline) → Lulácio → Capitão Brasa → Dino Supremo. Um por vez, com validação entre cada um. Transformações (`ultimate.glb`) só quando pedido.

| Personagem | Referência | Ferramenta | Arquivo | Tris | Status | Problemas / ajustes |
|---|---|---|---|---|---|---|
| Xandor ✅ | v3 A-pose do ChatGPT (ref_v3_apose.png), só frontal | Meshy 7.1 Ultra 2K → Remesh 30K → Rig **v5** → 20 anims | model.glb (2,1 MB) | 29.877 | ✅ aprovado pelo usuário | Rig: joelho logo ABAIXO da barra da toga, tornozelo EM CIMA do sapato, queixo NO queixo (não no nó da gravata). Medir ossos com tools antes de integrar (joelho/pé esquerdo × direito simétricos). Toga presa ao quadril no jogo (`robeFix`). Andar = Walking original do Meshy (ré = mesmo clip invertido). Idle = movimento de IA "guarda". |
| Lulácio | ChatGPT: mesma imagem com PUNHOS FECHADOS em A-pose (`references/lulacio/ref_punhos_apose.png`) | Meshy 7.1 Ultra 2K → Remesh 30K → Rig (queixo/pulso/virilha/tornozelo ajustados) → 19 anims + 2 IA | model.glb (2,15 MB) | 30.786 | ⏳ no jogo, AGUARDANDO VALIDAÇÃO DO USUÁRIO | Esqueleto do Meshy NÃO tem ossos de dedo → mão fica como modelada: gerar SEMPRE com punho fechado. Limite de download: 20 animações (21 desativa o botão). Não trocar de aba durante Texto para Motion (perde o movimento e cobra). |
| Capitão Brasa | aguardando | Meshy | — | — | ⏳ | — |
| Dino Supremo | aguardando | Meshy | — | — | ⏳ | — |

---
## Estilos de luta (regra: cada personagem tem postura, golpes e poderes PRÓPRIOS — nunca só trocar a skin)
| | Lulácio | Xandor | Capitão Brasa | Dino Supremo |
|---|---|---|---|---|
| Estilo | brigão de palanque, pesado, curto alcance | magistrado frio, preciso, controle à distância | (a definir) | (a definir) |
| Parado | IA `lula_guarda2` (base larga, punhos no peito, cotovelos abertos) | IA `guarda` (boxe) | | |
| Andar | "Andar Lutando" frente/ré | Walking original | | |
| Socos | gancho esq., uppercut dir., martelada | jab esq., jab dir., soco duplo | | |
| Chute / baixo | chute espartano / pisada furiosa | chute simples / chute varrido | | |
| Especiais | discurso ("Fale com paixão"), IA `lula_picanha` (arremesso), agarrão ("Agarrar e derrubar") | IA: intimação, bloqueado, canetada | | |
| Vitória | bate no peito | victory | | |

## Log
- **02/10** — Flavão e Agente Duvall jogáveis (placeholder + clips emprestados de Lulácio/Xandor). Mecânicas genéricas novas em `src/fight/`: `hit.launch` (knock-up), `passive.lowHp.defense`, `passive.blockSpecialMeter`, `special.dash {from,to,v,past}` + `passThrough` (atravessa o oponente) + `faceAtActive`, `special.clone` (eco/holograma → Hitter `clone`), Hitter `spend()` com `stopOnSpent`/`spentLife`/`activeUntil` via spec. VFX: `fx/cloneFx.js` (fantasma genérico), `fx/flavioFx.js`, `fx/duvalFx.js`, `ultimates/FlavioDinastia.js`, `ultimates/DuvalBackup.js`. Sim 6 lutadores: Flavão ≈47%, Duval ≈52%.
- **01/10** — VORCARO/VORCASH completo (placeholder): CAPITAL (barra extra genérica), Maleta Voadora, Juros Compostos (quique+crescimento), Mala de Contatos (assist genérico Flavão/Xandor/Nikolas), ultimate CAPITAL INFINITO (chuva instanciada → soterra → SALDO: 0). Vídeos em `videos/equipe/vorcaro_*.mp4`.
- **01/10 (madrugada)** — Direção de arte: `ARTE.md` (bíblia visual: paleta, luz, VFX ENTRA→IMPACTA→SOME, tipografia, proibidos), `src/visual/Look.js` (ACES/AgX, rim fresnel nos lutadores, VSM, bloom 1/4, grading, vinheta; `?look=0`), HUD/seleção/letreiros redesenhados, `art/PROMPTS_GPT.md` (Brasa, Dino, backdrop de Brasília, retratos). Retratos: `public/assets/characters/<id>/portrait.png` entra sozinho na UI.
- **01/10** — VFX dos poderes: Polvão refeito (tinta, tentáculos com ventosas em curvas/ossos, 9º tentáculo esmaga), Brasa (Rajada, Motociata com motos instanciadas, caminhão novo, Efeito Colateral = seringa → jacaré de terno), Dino (bocarra do Rugido, Meteoro vira zona com sombra prévia, Pisão com crista de terra, T-Rex de Terno com gag dos bracinhos e meteoro final). `frameTop` nas transformações pra câmera enquadrar. Infra: `src/visual/fx/` (Tentacle, pools de nuvens/anéis/estilhaços).
- **30/09 (tarde)** — Abraço do Palanque = agarra, gira 3 voltas e arremessa (estado `held`). Discurso = 3 pulsos, o último atordoa (estrelinhas). Xandor: documento de Intimação, carimbo BLOQUEADO com cadeado sobre a cabeça, caneta colossal da Canetada. Ultimates só mostram contato quando a lógica confirma o hit (`ultRes`).
- **29/09 (23h)** — Lulácio v2 com estilo próprio (brigão de palanque) e punhos fechados. Checkpoint `checkpoint-lulacio-xandor` no GitHub.
- **29/09 (22h)** — Xandor aprovado: pernas quebradas = joelho do rig 19 cm à frente (marcador em cima da toga); gravata dobrando = queixo no nó; pé virado = tornozelo esquerdo no calcanhar. Rig refeito 2× até os ossos ficarem simétricos (rig é grátis). Commit + push no GitHub. Iniciado Lulácio (imagem LULA.png do usuário).
- **29/09** — Picanha do Povo e Patriota no Para-brisa criados. Arquivo criado.
- **29/09 (noite, casa)** — Usuário rejeitou o v2 (rosto deformado) e escolheu o **v1** (só frontal, rosto fiel). v1 → remesh 30K (30.113 tris, grátis) → rig (pulsos no início da mão, virilha ajustada) → 15 animações → baixado no PC de casa (Chrome de casa conectado) → otimizado 19,8 MB → 1,67 MB → `public/assets/characters/xandor/model.glb`. Dedos colados na coxa corrigidos no jogo com `visual.rigidBones` (skinFix.js). Clips mapeados em xandor.js. Validado com ?animtest=1 (videos/validacao_xandor.mp4). O preview do Meshy segue mostrando a mão esticada — a correção é só no jogo.
- **29/09 (noite)** — Meshy Pro assinado. Xandor v2: Multi-View (frente+costas+perfil direito) + A-Pose + licença privada (35 créditos) → remesh 30K (28.713 faces, grátis) → rig (virilha ajustada) → **mão corrigida** (A-Pose separou braço da toga). 15 animações adicionadas (grátis): Andando, Correndo, Pose de soco, Jab Esq, Jab Dir, Soco c/ ambas as mãos, Chute Simples, Chute varrido, Bloco1, Reação ao ser atingido, Ser Atingido Voe p/ Cima, Morto, Levante-se 1, Pular c/ braços, Vitória. Saldo 1.115. **Download não dispara via automação** (Chrome não registra) → aguardando o usuário clicar Baixar (GLB, Mixamo, rigged, todas, arquivo único).
- **29/09** — Usuário decidiu seguir com a v1 realista (assume a responsabilidade). Xandor gerado, remalhado (10k) e rigado no Meshy (conta grátis, 100 créditos, nenhum gasto até aqui). **Bloqueio: download de modelo e animações de luta exigem Meshy Pro.** Aguardando decisão do usuário.
- **29/09** — Referência Xandor v1 recebida (turnaround 4 vistas) e **pausada**: fotorrealista, rosto muito fiel a pessoa real. Pedida v2 caricata/action figure. Salva em references/xandor/ como reprovada.
- **29/09** — Pipeline 3D preparado (pastas references/, manifesto de animações, inspetor de GLB, roteiro ?animtest=1). Aguardando referência do Xandor.
