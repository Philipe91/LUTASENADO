# REPÚBLICA KOMBAT — Game Design Document (MVP 4 dias)

> **Atualizações de design mais recentes ficam em `CHATGPT_DESIGN.md` e têm prioridade sobre este documento.**
> (ex.: Companheirada → Picanha do Povo; Live Surpresa → Patriota no Para-brisa)

> Obra de ficção e sátira. Personagens são caricaturas paródicas num universo próprio.
> Nenhum personagem vence "por roteiro": todos apanham, todos humilham, todos pagam mico.

---

## SEÇÃO 1 — VISÃO GERAL

**Nome:** REPÚBLICA KOMBAT
**Alternativos:** *Tretas Supremas* · *Kombate de Brasília* · *Primeiro Turno: Fight!*

**Pitch (1 frase):** Um jogo de luta 3D de navegador onde caricaturas absurdas da política brasileira saem na porrada na Praça dos Três Poderes — e cada um tem uma transformação ridícula (polvo, jacaré, deus judicial, T-Rex de terno).

**Proposta:** abrir o link → escolher lutador → 90 segundos de caos → ultimate absurdo → baixar o clipe → mandar no grupo. Zero instalação, roda no celular.

**Por que viraliza:**
1. **Reconhecimento instantâneo** — silhueta + prop + bordão = a pessoa sabe quem é em 0,5s.
2. **Transformação absurda** = o "momento clipe". Ninguém compartilha um soco; todo mundo compartilha o Lulácio virando polvo gigante.
3. **Timing** — véspera de eleição, todo mundo está falando disso.
4. **Sátira equilibrada** — os dois lados riem *e* se irritam; os dois lados compartilham "olha o que fizeram com o seu candidato".
5. **Botão de clipe embutido** — o jogo grava os últimos 10s e entrega um vídeo pronto pra Reels/TikTok/Zap.

**Pilares:**
- **P1 — Clipável:** todo sistema existe para gerar 5–10s compartilháveis.
- **P2 — Reconhecível:** silhueta, cor e prop antes de detalhe.
- **P3 — Simples:** 4 botões, dá pra jogar sem tutorial, inclusive no touch.
- **P4 — Equilibrado:** mesma dignidade (ou falta dela) para todos.
- **P5 — Modular:** personagem novo = 1 arquivo de dados + 1 transformação.

---

## SEÇÃO 2 — MVP DE 4 DIAS

### Entra no lançamento
- 4 lutadores jogáveis (Lulácio, Capitão Brasa, Xandor, Dino Supremo)
- 1 arena (Praça dos Três Poderes)
- Modo **Versus CPU** (melhor de 3 rounds) + **Versus local** (2 jogadores no mesmo teclado)
- 3 especiais + 1 passiva + 1 ultimate/transformação por personagem
- Intro, vitória, frases de entrada/vitória
- Seleção de personagem, HUD, telas de round/KO
- Controles de teclado **e touch (celular)**
- **Gravador de clipe** (últimos ~10s → vídeo para baixar/compartilhar)
- Tela de resultado com frase aleatória + botão "compartilhar"

### Fica de fora (pós-lançamento)
Online multiplayer · modo história · combos complexos/cancels · desbloqueáveis · ranking · mais arenas · lip-sync · roupas alternativas · modelos 3D esculpidos à mão.

### Escopo mínimo viável (se tudo der errado)
2 personagens + arena + ultimate funcionando + botão de clipe. **O ultimate é inegociável; o resto pode cortar.**

### Cronograma

| Dia | Meta | Entregável no fim do dia |
|---|---|---|
| **D1 — Núcleo** | Vite + Three.js, arena blockout, rig procedural compartilhado, máquina de estados, andar/pular/agachar/defender, soco/chute, hitboxes, vida, rounds, IA básica | Dois bonecos genéricos lutando de verdade no navegador |
| **D1–D2 (paralelo, você)** | Concepts 2D dos 4 + 4 ultimates → Meshy image-to-3D → auto-rig → GLB nas pastas (ver `PIPELINE_VISUAL.md`) | 4 `model.glb` (+ `ultimate.glb` se der) |
| **D2 — Elenco** | Integrar GLBs (yaw/altura/clips), props nos ossos da mão, VFX dos 12 especiais, deploy de teste | Os 4 reconhecíveis e com especiais funcionando |
| **D3 — Espetáculo** | 4 transformações (GLB ou stand-in) + câmera cinemática, intros, vitórias, HUD final, som e falas | O jogo "parece jogo" e dá vontade de gravar |
| **D4 — Lançamento** | Controles touch, gravador de clipe, balanceamento, performance mobile, deploy, página de compartilhar (OG image), gravar trailers | Link público no ar + 5 clipes de divulgação |

Regra de corte: **se algo não fica pronto no dia dele, simplifica — não empurra.**

---

## SEÇÃO 3 — GAMEPLAY CORE

### Botões
| Ação | P1 teclado | P2 teclado | Touch |
|---|---|---|---|
| Mover | A / D | ← / → | direcional esquerdo |
| Pular / Agachar | W / S | ↑ / ↓ | direcional |
| **Soco** (rápido) | J | Num1 | botão |
| **Chute** (forte, mais alcance) | K | Num2 | botão |
| **Especial** | L | Num3 | botão |
| **ULTIMATE** | L + K juntos (barra cheia) | Num3 + Num2 | botão dourado que pulsa |
| Defender | segurar para trás | segurar para trás | segurar para trás |

**Especiais por direção (sem meia-lua, sem decorar):**
- `Especial` parado = Especial 1
- `Frente + Especial` = Especial 2
- `Baixo + Especial` = Especial 3

### Movimentação
Plano 2D (eixo X + pulo em Y) renderizado em 3D. Andar, pular (arco fixo), agachar, dash com duplo toque (frente/trás). Personagens sempre se encaram.

### Ataques básicos
- Soco: 3 golpes encadeáveis (J, J, J) — dano 4/4/7.
- Chute: 1 golpe, dano 9, mais lento, mais alcance.
- Soco agachado (baixo) e chute agachado (rasteira = derruba).
- Golpe aéreo (soco/chute no pulo).
- Arremesso: frente + soco colado no oponente.

### Defesa
Segurar para trás = defende alto; trás+baixo = defende baixo. Defesa toma 15% do dano ("chip"). Arremesso fura defesa. Ultimate fura defesa.

### Barras
- **Vida:** 100 pontos (Dino 115, Capitão Brasa 95).
- **Especiais:** custo zero, cooldown de 2–4s — especial é spam divertido.
- **Barra ULTIMATE (3 segmentos):** enche ao bater, apanhar e defender. Cheia → pisca, toca som, botão dourado pulsa. Em média 1 ultimate por round — momento-clipe garantido.

### Ultimate
1. Ativa → **tudo congela**, zoom da câmera no personagem, fundo escurece, nome do golpe em letras gigantes.
2. Animação de transformação (1,5–2s, não-interativa).
3. Forma transformada por **6 segundos**: golpes novos, dano alto, imune a stun.
4. Se o ultimate der o KO → replay automático em câmera lenta + botão "BAIXAR CLIPE".

### Fluxo de partida
Título → Seleção (P1 e CPU/P2) → Tela VS com provocação → Intros → "PRIMEIRO TURNO — LUTEM!" → round de 60s → KO/tempo → "SEGUNDO TURNO" → se 1-1: "TERCEIRO TURNO?!" → vitória + frase → Resultado (baixar clipe / revanche / trocar lutador).

### IA básica (decisão por distância, ~120 linhas)
A cada 150–400ms (varia por dificuldade) a CPU avalia:
- **Longe:** anda pra frente ou usa especial de projétil.
- **Médio:** dash, chute ou especial de avanço.
- **Perto:** combo de soco (60%), arremesso (15%), defender (25%).
- **Levando combo:** chance de defender sobe.
- **Barra cheia:** solta ultimate quando o jogador está perto ou em hitstun.
- Perfil (pesos) no arquivo de cada personagem: Brasa agressivo, Xandor recua e zoneia, Dino avança devagar e troca golpe, Lulácio caça arremesso.
- 3 dificuldades = muda só tempo de reação e chance de defesa.

---

## SEÇÃO 4 — DIREÇÃO DE ARTE

### Estilo
**"Bonecão de Olinda encontra action figure."** 3D cartunesco, formas simples, cores sólidas com toon shading + contorno preto. Parece brinquedo premium; **não é o rosto real de ninguém**, é caricatura desenhada.

### Proporções
- Cabeça ≈ **1/3,5 da altura**, mãos e pés grandes.
- Tronco exagerado por arquétipo: Lulácio barrigudo e largo, Brasa estreito e rígido, Xandor alto em "V", Dino largão e baixo.

### Modelagem — DECISÃO OFICIAL (revisada em 29/09)
- **Personagens principais = modelos 3D externos (GLB).** Concept 2D → image-to-3D (Meshy) → rig humanoide → GLB → jogo.
- **Geometria procedural = só placeholder de combate, fallback, props, VFX e ultimate provisório.**
- Estética: caricatura 3D premium / action figure / boneco colecionável. Nada de fotorealismo, rosto fiel ou deepfake.
- O combate é 100% independente do visual: trocar placeholder por GLB = soltar o arquivo na pasta.
- Passo a passo completo (prompts, poses, export, checklist, consistência): **ver `PIPELINE_VISUAL.md`.**

### Animações
**Poses-chave procedurais** interpoladas com easing exagerado. Cada ataque = 3 poses (antecipação → impacto → recuperação). Squash & stretch na cabeça em cada impacto. Idle com respiração + balanço de personalidade. Antecipação exagerada + hitstop > animação realista.

### VFX (parecem caros, custam pouco)
- **Hitstop** (congela 60–120ms no impacto) — o efeito barato mais importante.
- **Screen shake** proporcional ao dano.
- **Flash branco** no atingido.
- Faíscas/estrelas (sprites em pool).
- **Anel de onda de choque** aditivo.
- **Texto de impacto**: "POW", "VETADO!", "CANETADA!".
- **Speed lines** radiais no ultimate.
- Fundo escurece + silhueta na ativação do ultimate.
- Bloom leve só no desktop.

### HUD
Estilo "plantão de telejornal": barras de vida grossas, retrato caricato, nome; rounds como **"urninhas"** marcadas; timer central; barra ultimate em 3 segmentos; faixa **"AO VIVO"** piscando. Fontes: **Bangers** / **Luckiest Guy** (Google Fonts).

### Câmera
Lateral, levemente de cima, FOV ~35 (cinematográfico). Enquadra os dois dinamicamente. Ultimate: corte seco para close em contra-plongée → travelling → volta. KO final: câmera lenta 0,3x + órbita de 90°.

### Som
- SFX gerados (ZzFX) + CC0: socos, whoosh, explosão, rugido, jacaré, trompete.
- Locutor: TTS **genérico** pt-BR (Edge-TTS, já no pipeline do ViralReplicator): "PRIMEIRO TURNO! LUTEM!".
- Falas: balão de texto + voz TTS genérica/grunhidos. **Nunca clonar voz real.**
- Música: batida instrumental CC0 ou gerada (ACE-Step).

---

## SEÇÃO 5 — OS 4 LUTADORES

### 1. LULÁCIO — "O Companheiro de Aço"
- **Arquétipo:** grappler / brawler carismático
- **Papel no meta:** curto alcance, arremessos que tiram muito, enche ultimate mais rápido. Sofre contra quem mantém distância (Xandor).
- **Visual:** barba branca cheia e fofa, cabelo branco curto, rosto redondo com bochechas, sobrancelhas grossas, sorriso largo de palanque. Barriga redonda, ombros largos, braços curtos e grossos.
- **Silhueta:** círculo peludo em cima de um círculo — "pera com barba".
- **Roupa:** terno azul-marinho aberto, camisa branca, gravata vermelha torta, mangas arregaçadas.
- **Cores:** azul-marinho, branco, vermelho.
- **Prop:** microfone com fio longo (vira chicote).
- **Personalidade:** bonachão, fala sem parar, abraça todo mundo — inclusive no meio da briga.
- **Passiva — CARISMA DE PALANQUE:** ganha barra 30% mais rápido. Abaixo de 30% de vida: "Volta por Cima", +15% de dano.
- **Especiais:**
  1. **Discurso Interminável** (parado): fala no microfone, cone de ondas sonoras curtas; atordoa 0,8s e empurra.
  2. **Companheirada** (frente): fila de 5 mini-apoiadores com bandeirinhas atravessa a tela (projétil multi-hit).
  3. **Abraço do Palanque** (baixo): arremesso comando — abraço de urso, gira 3 vezes e arremessa. Fura defesa.
- **ULTIMATE — O POLVÃO DO POVO:** um palanque brota do chão, a multidão grita, estoura fumaça — ele vira um **polvo gigante azul-arroxeado** com a **barba branca**, gravata vermelha e o **microfone num tentáculo**. Ocupa metade da tela. Ataques: tentáculos batem no chão em sequência (ondas), um tentáculo agarra o oponente e sacode no ar, final: esguicho de tinta cobre a tela com "COMPANHEIRADA TOTAL!". Gag: o polvo tem **9 tentáculos** — alguém vai reparar e comentar (engajamento de graça).
- **Entrada:** chega em cima de um carro de som, pula, dá tchau pra multidão.
- **Vitória:** surge uma churrasqueira, ele assa uma picanha e oferece ao derrotado.
- **Frase de entrada:** "Companheiros e companheiras... hoje vai ter porrada!"
- **Frase de vitória:** "Nunca antes na história desse ringue!"

### 2. CAPITÃO BRASA — "O Motociclista do Caos"
- **Arquétipo:** rushdown / pressão ofensiva
- **Papel no meta:** o mais rápido, combos longos, dano cresce se continuar batendo. Vida menor (95), sofre com punição.
- **Visual:** rosto estreito e comprido, queixo quadrado, cabelo penteado de lado bem marcado e rígido, sobrancelhas franzidas, boca aberta gritando. Corpo reto como tábua, postura militar.
- **Silhueta:** retângulo vertical com cabeça comprida e penteado lateral — "régua com franja".
- **Roupa:** terno escuro, faixa verde-amarela atravessada no peito, gravata verde-amarela, capacete de moto pendurado no cinto.
- **Cores:** grafite, verde, amarelo.
- **Prop:** celular numa haste de selfie (live sempre ligada). Moto como golpe.
- **Personalidade:** acelerado, fala alto, reage a tudo como se estivesse em live.
- **Passiva — LIVE LIGADA:** contador de "likes 👍" flutua sobre ele; cada hit de combo soma. A cada 3 hits: "VIRALIZOU!" +10% velocidade e dano por 3s. Levar hit zera.
- **Especiais:**
  1. **Talkei Rajada** (parado): metralhadora de socos com "TALKEI? TALKEI?" em balõezinhos.
  2. **Motociata** (frente): moto surge, ele cruza a tela empinando, atropela (multi-hit), fumaça verde-amarela.
  3. **Live Surpresa** (baixo): vira o celular pro oponente, flash da selfie cega (atordoa 1s) + comentários voando.
- **ULTIMATE — EFEITO COLATERAL:** uma seringa gigante cai do céu e espeta o braço dele; ele congela, arregala os olhos, incha em 3 "pulsos" cartunescos — vira um **jacaré bípede enorme de terno**, **mantendo o penteado de lado**, a faixa verde-amarela e o celular na mão (filmando a si mesmo). Ataques: mordida que engole e cospe o oponente, rabada giratória 360°, final: "rolo da morte" com o oponente na boca e a câmera girando junto. Letreiro: **"NÃO É FAKE!"**
- **Entrada:** chega de moto empinando, freia derrapando, desce, ajeita o cabelo.
- **Vitória:** abre live, comentários voam ("Mito", "Vaza", "kkkkk"), dá joinha pra câmera.
- **Frase de entrada:** "Chegou o capitão, talkei?"
- **Frase de vitória:** "E daí? Ganhei, pô!"

### 3. XANDOR — "O Magistrado Supremo"
- **Arquétipo:** zoner / controle / anti-especial
- **Papel no meta:** mantém distância, trava especiais do oponente, pune quem espera. Sofre colado (arremesso do Lulácio é o pesadelo dele).
- **Visual:** careca brilhante (reflexo animado), cabeça em ovo, sobrancelhas pretas grossas em V, olhar fulminante fixo, maxilar firme. Alto, ombros largos, peito em V, movimentos lentos e precisos.
- **Silhueta:** triângulo invertido com cabeça lisa e brilhante + toga esvoaçando.
- **Roupa:** terno preto sob toga preta com gola branca; abotoaduras douradas.
- **Cores:** preto, branco, dourado, detalhes vermelhos.
- **Prop:** caneta-tinteiro gigante (usada como espada).
- **Personalidade:** fala pouco, nunca sorri, cada movimento parece decisão final.
- **Passiva — JURISDIÇÃO:** círculo sutil no chão ao redor dele; oponente dentro ganha barra 30% mais devagar.
- **Especiais:**
  1. **Intimação** (parado): papel timbrado voa como shuriken; se acerta, o oponente é **puxado** até ele.
  2. **BLOQUEADO** (frente): carimbo gigante cai no oponente; se acerta, um **selo vermelho "BLOQUEADO"** cai sobre o HUD dele e o botão de especial fica desativado por 4s. (O momento mais clipável do jogo.)
  3. **Canetada** (baixo): caneta gigante desce do céu na posição do oponente após 0,6s e risca o chão (zona de dano).
- **ULTIMATE — AVATAR DA CONSTITUIÇÃO:** silêncio total, tela fica preto e branco, só ele colorido. Levita; a toga vira **túnica/armadura branca e dourada**; um **selo cósmico circular** (balança, colunas, símbolos "§") gira atrás; **olhos brilham vermelho**; canetas e livros de leis orbitam. Voz grave com eco: **"DECISÃO. MONOCRÁTICA."** Ataques: chuva de canetas, livros orbitando como escudo, final: **martelo de juiz colossal** desce do céu — tela racha: **"SENTENÇA: DERROTA. SEM RECURSO."**
- **Entrada:** desce num feixe de luz com órgão tocando; carimba o chão: "EM SESSÃO".
- **Vitória:** senta num trono que surge do chão, assina um papel e carimba a testa do derrotado.
- **Frase de entrada:** "Isso não vai ficar assim."
- **Frase de vitória:** "Caso encerrado. Arquive-se."

### 4. DINO SUPREMO — "O Jurássico Togado"
- **Arquétipo:** tank / bruiser / transformação
- **Papel no meta:** lento, pesado, super-armor nos golpes fortes, dano alto por hit. Sofre contra rushdown (Brasa).
- **Visual:** cabelo grisalho penteado pra trás, **óculos retangulares grossos**, rosto largo, papada, sobrancelhas espessas, cara de professor irritado. Corpo largo, baixo e pesado.
- **Silhueta:** "geladeira de óculos" — o mais largo do elenco.
- **Roupa:** terno cinza-chumbo apertado (botões quase estourando), gravata verde-musgo com estampa de pegadas de dinossauro, broche de fóssil.
- **Cores:** cinza, verde-musgo, âmbar.
- **Prop:** livro de leis grossíssimo, "VADE MECUM JURÁSSICO" (escudo e porrete).
- **Personalidade:** calmo e didático, explica o golpe antes de bater — e bate muito forte.
- **Passiva — COURO JURÁSSICO:** chute e especiais têm super-armor (absorvem 1 golpe); toma 10% menos dano; vida 115; anda devagar.
- **Especiais:**
  1. **Rugido Togado** (parado): ruge com a boca abrindo ABSURDAMENTE; onda de choque que empurra e atordoa.
  2. **Meteoro Didático** (frente): arremessa o Vade Mecum em arco; explode no chão como meteoro.
  3. **Pisão Cretáceo** (baixo): pisada que faz a tela tremer; onda de terra corre pelo chão (tem que pular).
- **ULTIMATE — T-REX DE TERNO:** tira os óculos, limpa, recoloca — os óculos crescem, o terno estoura botão por botão (botões voam na câmera) e ele vira um **T-Rex enorme de terno rasgado, gravata e óculos retangulares**, braços minúsculos. Ataques: investida pisoteando, rabada, mordida que ergue o oponente; final: ruge pro céu e **um meteoro cai** no oponente. Gag: tenta ajeitar os óculos com o bracinho e não alcança.
- **Entrada:** ovo gigante cai do céu, racha, ele sai de terno e ajeita os óculos.
- **Vitória:** tenta bater palma com bracinhos de T-Rex que sobraram da transformação, não consegue, desiste e ruge.
- **Frase de entrada:** "Vamos à aula de hoje: extinção."
- **Frase de vitória:** "Extinção decretada. Próximo!"

### Balanceamento inicial (1–5)
| | Vida | Velocidade | Dano | Alcance | Ganho de barra |
|---|---|---|---|---|---|
| Lulácio | 100 | 3 | 4 | 2 | 5 |
| Capitão Brasa | 95 | 5 | 3→5 | 3 | 3 |
| Xandor | 100 | 2 | 3 | 5 | 3 |
| Dino Supremo | 115 | 1 | 5 | 3 | 3 |

---

## SEÇÃO 6 — ARENA: PRAÇA DOS TRÊS PODERES

- **Fundo (primitivas + cor chapada, meio dia de trabalho):**
  - Congresso: 2 torres finas + **cúpula para baixo e cúpula para cima** sobre uma laje. A silhueta mais reconhecível do Brasil — só isso vende.
  - Espelho d'água na frente (plano com brilho).
  - Céu de pôr do sol laranja→roxo (shader de gradiente), nuvens em billboard.
  - Mastro com bandeira tremulando (vertex shader de onda).
- **Chão de luta:** laje branca modernista com linhas, sombra blob sob os lutadores.
- **Vida no cenário:** pombos voando quando alguém cai; **multidão de silhuetas** nas laterais pulando mais nos especiais; dois guardas imóveis que viram a cabeça só no ultimate.
- **Interações de ultimate:** polvo e T-Rex fazem o Congresso tremer; Avatar deixa o céu cósmico; jacaré espirra água do espelho d'água.
- **Por que funciona em vídeo:** fundo reconhecível em qualquer frame, cores quentes que saltam no feed, horizonte limpo pra ler a ação.

---

## SEÇÃO 7 — ESTRUTURA TÉCNICA

### Stack
- **Vite + Three.js (JS puro)** — build rápido, deploy estático.
- UI (HUD, menus) em **HTML/CSS sobre o canvas**.
- Áudio: WebAudio + ZzFX.
- Clipe: `canvas.captureStream()` + `MediaRecorder` com buffer rotativo.
- Deploy: **Vercel/Netlify** + espelho no **itch.io**.

### Pastas
```
GAMELUTA/
  index.html
  package.json
  public/ audio/ fonts/ og-image.png
  src/
    main.js                 # boot, troca de telas
    core/
      Loop.js               # lógica 60Hz fixa, render livre
      Input.js              # teclado + touch + gamepad → comandos abstratos
      CameraRig.js          # enquadramento, shake, cortes cinematográficos
      Audio.js
      ClipRecorder.js       # buffer rotativo de 10s
    fight/
      Match.js              # rounds, timer, KO, fluxo
      Fighter.js            # estado + física + barras
      StateMachine.js
      Combat.js             # hit, dano, hitstop, knockback
      Hitbox.js             # AABB 2D
      Projectile.js
      AI.js                 # IA por pesos (perfil vem do personagem)
    rig/
      Rig.js                # esqueleto compartilhado (Object3D)
      Poses.js              # biblioteca de poses base
      Animator.js           # tween entre poses + squash/stretch
      FaceTexture.js        # rostos/expressões em canvas
    characters/
      index.js              # REGISTRO — personagem novo = 1 linha aqui
      lulacio.js  capitao-brasa.js  xandor.js  dino-supremo.js
    transforms/
      polvo.js  jacare.js  avatar.js  trex.js
    vfx/
      Particles.js  Shockwave.js  ImpactText.js  SpeedLines.js  Flash.js
    arenas/
      index.js  brasilia.js
    ui/
      hud.js  select.js  screens.js  touch.js  style.css
```

### Rig humanoide compartilhado
Hierarquia fixa de `Object3D` (sem SkinnedMesh):
`root → hips → spine → chest → neck → head` · `chest → shoulderL/R → elbowL/R → handL/R` · `hips → thighL/R → kneeL/R → footL/R`.
Cada personagem só **pendura geometria** nos ossos e define escalas (`headScale`, `belly`, `height`). Todas as poses funcionam em todo mundo; personagem pode **sobrescrever** poses.

### Máquina de estados
`INTRO → IDLE ⇄ WALK ⇄ CROUCH ⇄ JUMP → ATTACK(startup/active/recovery) → BLOCK → HITSTUN → KNOCKDOWN → GETUP → SPECIAL → ULTIMATE(transform/active/revert) → KO → VICTORY`
Lógica em frames (60Hz). Golpe = frame data: `{startup:5, active:3, recovery:10, damage:4, hitstun:14, knockback:[2,0], hitbox:{x,y,w,h}}`.

### Hitboxes
AABB 2D no plano X/Y. Hurtbox por estado (em pé/agachado/no ar), hitbox por golpe. Overlay de debug no **F1** (essencial no D1).

### Personagem por dados
```js
// src/characters/xandor.js
export default {
  id: 'xandor', name: 'XANDOR', title: 'O Magistrado Supremo',
  stats: { hp: 100, walk: 2.2, jumpPower: 11, meterGain: 1.0 },
  look: { height: 1.95, headScale: 1.35,
          colors: { suit: 0x111111, skin: 0xe8b894, accent: 0xd4af37 },
          build: (rig, ctx) => { /* careca, sobrancelhas em V, toga */ } },
  passive: { id: 'jurisdicao', radius: 3.5, enemyMeterMult: 0.7 },
  normals: { punch: [/*3 hits*/], kick: {}, crouchPunch: {}, sweep: {}, air: {}, throw: {} },
  specials: {
    neutral: { name: 'Intimação', cooldown: 150, run: (f, g) => g.spawnProjectile('intimacao', f) },
    forward: { name: 'BLOQUEADO', cooldown: 240, run: (f, g) => {/*...*/} },
    down:    { name: 'Canetada',  cooldown: 180, run: (f, g) => {/*...*/} },
  },
  ultimate: { name: 'AVATAR DA CONSTITUIÇÃO', transform: 'avatar', duration: 360 },
  ai: { aggression: 0.3, keepDistance: 5, specialBias: 0.6 },
  lines: { intro: ['Isso não vai ficar assim.'], win: ['Caso encerrado. Arquive-se.'],
           vs: { 'capitao-brasa': 'Live suspensa.' } },
  koTexts: ['ARQUIVADO!', 'SEM RECURSO!'],
}
```
**Personagem novo = 1 arquivo + 1 transform + 1 linha no registro.** Seleção, IA, HUD e intros se montam sozinhos.

### VFX leves
Pool de sprites (nada alocado durante a luta), materiais aditivos, InstancedMesh para partículas, vida em frames. Bloom só se `!isMobile`.

### IA
`AI.js` lê `character.ai` e gera **os mesmos comandos abstratos do Input** — a CPU "aperta botões". O combate não distingue humano de IA (e o modo 2P sai de graça).

### O que é procedural (economiza dias)
Arena inteira, céu, bandeira, multidão, VFX (faíscas, anéis, speed lines), projéteis, selo cósmico do Avatar (anéis + sprites), SFX (ZzFX), placeholders de combate e ultimate provisório (stand-in). **Personagens jogáveis NÃO são procedurais** — são GLB externos (ver `PIPELINE_VISUAL.md`).

### Integração de GLB (implementado)
- `FighterView` = slot visual: placeholder imediato → troca para `model.glb` quando carrega → `ultimate.glb` durante o ultimate.
- `GLBModel`: normaliza altura/pé/orientação, clona materiais, toca clips por **chave de animação** (`visual/animKeys.js`) com cadeia de fallback.
- `retarget.js`: retarget por nome de osso (Mixamo/Meshy), descarta posição exceto quadril → um pacote de animação (`shared.glb`) serve para os 4 corpos diferentes.
- Contrato lógica→visual: `x, y, facing, state, animKey, animLen, animSeq, flash`. Nada mais.

---

## SEÇÃO 8 — VIRALIZAÇÃO

### Textos de tela
- Rounds: **"PRIMEIRO TURNO!"**, **"SEGUNDO TURNO!"**, **"TERCEIRO TURNO?!"**
- KO aleatório: **"CASSADO!"**, **"VETADO!"**, **"ARQUIVADO!"**, **"INELEGÍVEL!"**, **"FIM DO MANDATO!"**, **"RENUNCIOU!"**
- Combo alto: "BASE ALIADA x5!", "CPI ABERTA!"
- Defesa perfeita: "RECURSO ACEITO!"
- Timeout: "PRORROGADO!" / "EMPATE TÉCNICO!"
- KO por ultimate (o "Fatality" do jogo): **"MEDIDA PROVISÓRIA!"**

### Provocações na tela VS
- Lulácio vs Brasa: "Companheiro, bora conversar?" / "Conversar nada, talkei?"
- Brasa vs Xandor: "Vou fazer uma live sobre você!" / "Live suspensa."
- Xandor vs Dino: "Colega." / "Colega." (3 segundos de silêncio se encarando — piada de timing)
- Dino vs Lulácio: "Hoje a aula é de história natural." / "Eu SOU história, companheiro."
- Espelho: "Quem é o original aqui?" / "Fake news."

### Momentos clipáveis (cada um é projetado para virar vídeo)
1. As 4 transformações.
2. O selo **BLOQUEADO** caindo em cima do HUD do adversário.
3. A Motociata atravessando a tela.
4. Dino-T-Rex tentando ajeitar os óculos com o bracinho.
5. KO final em câmera lenta com texto gigante.
6. **Ultimate contra ultimate** ao mesmo tempo (polvo vs jacaré!) — permitir; é o clipe mais forte do jogo.
7. "TERCEIRO TURNO?!"

### O que faz gravar e compartilhar
- **Botão "BAIXAR CLIPE"** após todo ultimate/KO — vídeo com logo e link no final. O jogo faz o próprio marketing.
- **Resultado compartilhável:** "LULÁCIO derrotou CAPITÃO BRASA com O POLVÃO DO POVO" + "Desafiar amigo" (link `?p1=lulacio&p2=xandor` já abre na luta).
- **Placar nacional** (opcional D4): "Hoje: Polvão 51% x Jacaré 49%" — contador de vitórias por personagem. Gera briga nos comentários = alcance.
- Sem cadastro, sem download, lutando em <10s no celular.
- Lançamento: 5 clipes curtos (1 por transformação + 1 BLOQUEADO) no TikTok/Reels/Shorts/X, legenda "qual é o seu main?".

---

## SEÇÃO 9 — EXPANSÃO

Atualizações temáticas curtas ("Temporadas"): cada uma = 1–2 lutadores + 1 arena ou 1 boss, tudo pelo registro de personagens.

- **Temporada 1 — "O Impeachment":** inspirada em Dilma (zoner, "estocagem de vento" = tornado; ultimate: Mandioca Colossal) e inspirado em Temer (defensivo, "vampiro constitucional"; ultimate: vira morcego e ataca das sombras). Arena: Palácio da Alvorada.
- **Boss — O CENTRÃO:** bolha de engravatados fundidos; **troca de lado a cada 20% de vida** (ajuda quem estiver perdendo).
- **Boss secreto — URNATRON:** urna eletrônica robô gigante; "CONFIRMA" (laser verde), "CORRIGE" (zera sua barra).
- **Arenas:** Esplanada no Carnaval, Plenário (deputados dormindo como plateia), Posto "Lava-Jato", Churrascaria de Brasília.
- **Eventos:** "Semana do Debate" (a cada 20s o microfone de um é cortado = especial desativado), "Horário Eleitoral Gratuito" (ultimate enche 2x).
- **Sistemas:** online P2P (WebRTC), torneio de 8, roupas alternativas, rostos esculpidos, ranking por personagem, modo 2v2 "Debate".

---

## SEÇÃO 10 — O QUE FAZER AGORA

### A) Primeiro, nesta ordem
1. Vite + `three` no GAMELUTA.
2. Loop 60Hz fixo + câmera lateral + chão + 2 blocos andando no teclado.
3. Rig procedural compartilhado + animador de poses.
4. Máquina de estados + soco/chute + hitboxes (debug F1) + hitstop + shake.
5. Vida, rounds, KO, IA básica.
→ **Fim do D1: um jogo de luta feio, mas gostoso de bater.**

### B) Ordem do desenvolvimento
**Sensação do golpe → combate completo → personagens reconhecíveis → especiais → ultimates → telas/som → mobile/clipe → deploy → polimento.**
Nunca polir visual antes do golpe "sentir" bem. Nunca fazer menu antes da luta existir. Deploy de teste já no D2 (testar no celular real cedo).

### C) Mini-brief operacional
- **Alvo:** Chrome/Edge/Safari mobile, 60fps em celular médio, < 5 MB.
- **Tela:** 16:9 no desktop; paisagem no celular (aviso "gire o celular").
- **Golpe pronto =** antecipação + hitstop + som + VFX.
- **Personagem pronto =** reconhecível só pela silhueta preta; 3 especiais; ultimate com câmera; intro e vitória com frase.
- **Não fazer:** modelagem/rig manual complexo (o Meshy faz), deixar placeholder bonito, física real, rede, backend (exceto contador opcional no D4).
- **Checkpoint diário:** link de teste atualizado + 1 clipe gravado pelo próprio jogo.

---

## NOTA DE PRUDÊNCIA (ler antes de lançar)
Período eleitoral tem regras próprias (TSE). Para ser e parecer **sátira, não propaganda**:
- Nomes fictícios e caricatura desenhada — **sem fotos, sem rosto realista, sem deepfake, sem clonar voz real** (as resoluções do TSE vedam deepfake em conteúdo eleitoral).
- **Sem número de candidato, sem "vote em", sem logos de partido, sem jingle de campanha.**
- Nenhum personagem é mais forte ou "o herói"; humilhação igual para todos.
- Aviso na tela título: *"Obra de ficção e sátira. Personagens são caricaturas."*
- **Não impulsionar com anúncio pago** durante o período eleitoral — só orgânico.
- Sem anúncios dentro do jogo antes da eleição (evita cara de produto político).
