# ASSETS PENDENTES — o que ainda é "molde básico" e vira Meshy/GPT

> Inventário de 05/10/2026 (somente leitura do código; nada foi alterado).
> Escopo: `src/visual/arena/`, `src/visual/fx/`, `SpecialFx.js`, `projectiles.js`, `xandorVisuals.js`, `StatusFx.js`, `src/visual/ultimates/`.
> Fluxo de produção: **ChatGPT (imagem de referência) → Meshy Image-to-3D (remesh) → `tools/optimize_glb.mjs` (gera `.m.glb`) → `public/assets/...`**.

## 0. Resumo

| Prioridade | Significado | Itens |
|---|---|---|
| **A** | aparece em toda luta / muito visível (cenário no enquadramento retrato, personagem jogável) | **8** |
| **B** | aparece num golpe específico (especial/ultimate) — ou cenário sempre presente mas pequeno / fora do retrato | **36** |
| **C** | detalhe (pequeno na tela, poucos frames) | **12** |
| **Total** | | **56** |

Mais a seção 6 (o que **deve continuar procedural**, sem contar no total).

### Os 10 itens A/B de maior impacto (ordem sugerida de produção)

| # | ID | Item | Por quê |
|---|---|---|---|
| 1 | AR-01 | **Plateia/torcida** | ~240 recortes de papelão cinza tingido atrás dos lutadores em TODA luta; é o que mais "denuncia" o protótipo |
| 2 | CH-01/02 | **Boulos e Renan** (corpo) | ainda são `PlaceholderModel`; os GLBs já estão gerados + remesh + rig na conta Meshy, falta só baixar |
| 3 | AR-06 | **Chão da laje de luta** | textura de canvas chapada ocupando ⅓ do quadro em toda luta |
| 4 | AR-03 + AR-05 | **Faixas do gradil + saia do palanque** | sempre no quadro (fundo e borda de baixo do retrato) |
| 5 | AR-11 | **Fundo pintado da arena noite** | Congresso/Planalto/STF em caixas; a arena de dia já usa backdrop GPT e ficou muito melhor |
| 6 | P-08 | **Picanha** (Lulácio, golpe meme) | gancho de GLB **já pronto** (`model: 'assets/props/picanha.glb'`), só falta o arquivo |
| 7 | P-01 | **Caminhão do Patriota no Para-brisa** (Brasa) | gancho **já pronto** (`assets/props/caminhao.glb`); hoje são caixas |
| 8 | P-10 | **Carimbo BLOQUEADO** (Xandor, golpe meme) | prop gigante, centro da tela |
| 9 | P-34 | **Leão da Receita** (Haddad, finalizador da ultimate) | "cabeça de primitivas" num close de ultimate |
| 10 | P-28 | **Mandioca** (Dilma) | 3 usos: projétil, na mão e MANDIOCA COLOSSAL do finalizador |

Logo em seguida: maleta do Vorcaro (P-21, 4 usos), celular do Nikolas (P-16, 2 usos), Polvão (P-09).

---

## 1. Como integrar (o que já existe no código)

| Caso | Mecanismo existente | Observação |
|---|---|---|
| **Projétil/zona (Hitter)** | campo `model:` no especial (ex.: `capitao-brasa.js:32`, `lulacio.js:36`) → `Vfx.tryModel()` (`src/visual/Vfx.js`) → `swapToGLB()` no **corpo** do visual (`userData.glbBody` → `body` → `spin` → `drop` → grupo) | ✅ (05/10) só o corpo some: rastro, `Puffs`, poeira, buzina "FOM FOM!" e o que estiver em `userData.glbKeep` (rodas, apoiador) continuam. GLB é estático: peças móveis ficam procedurais (rodas do caminhão, tampa da maleta). |
| **Prop na mão (`propHand`)** | `SpecialFx.js` reaproveita `PROJECTILE_VISUALS[...].build()` | ✅ o gancho está dentro do próprio `build()`/`makeX()` (`swapToGLB`), então mão e projétil trocam juntos |
| **Props de especiais/ultimates (`makeX()`)** | funções `makePhone`, `makeMic`, `makeBriefcase`… | ✅ `swapToGLB(grupo, PROP_GLB.<nome>, { keep, all, height, size, yaw })` (`src/visual/propModel.js`) no fim de cada `makeX()`. Só pede o arquivo se ele existe no catálogo (sem 404); mede o procedural e encaixa o GLB no mesmo centro/tamanho; esconde só as malhas do corpo (decal, tela, LED, mandíbula etc. em `keep`). Ver seção 8 |
| **Corpo de ultimate** | `MeshyBody` (`src/visual/ultimates/meshyBody.js`): carrega o GLB por cima do boneco procedural; `pose({lean, squash, turn})` anima por grupo + "borracha" | Exemplo: `BrasaJacare.js:227` (`capitao-brasa/jacare.glb`) e `DinoTrex.js:231` (`dino-supremo/trex.glb`). Modelos com articulação (mandíbula, tampa) → exportar **peças separadas** ou manter a peça móvel procedural |
| **Cenário** | `Baker` (`kit.js:36`) funde geometria com cor por vértice em 1 draw call (`MeshBasicMaterial`) | GLB texturizado **não** entra no Baker: vai como `InstancedMesh`/`BatchedMesh` próprio (three 0.170 tem `BatchedMesh.addInstance`), material `MeshBasic`/`Lambert` + `fog`. Orçamento: ≤ 1 draw call por tipo de prop, ≤ 2k tris por prop de fundo |
| **Personagem** | `visual.model` em `src/data/characters/<id>.js` → `FighterView.js:98` troca o placeholder sozinho | Boulos/Renan: basta colocar `model.glb` em `public/assets/characters/<id>/` |
| Variante leve | `node tools/optimize_glb.mjs` gera `.m.glb` (texturas 1024 WebP) | rodar depois de cada GLB novo |

**Regra para a imagem do GPT → Meshy:** sem texto no objeto (o Meshy borra letras). Letreiros ("BLOQUEADO", "TAXADO!", "CONFIDENCIAL") continuam como decal de canvas aplicado no código por cima do GLB.

**Estilo-base de todos os prompts** (já embutido em cada prompt abaixo):
`3D vinyl toy caricature, chunky rounded proportions, glossy saturated colors, soft studio lighting, single object centered, three-quarter view, plain flat white background, no text, no ground shadow`

---

## 2. Cenário (arenas)

| ID | Arquivo:linha | O que é (arena) | Como aparece hoje | Prio | Asset ideal |
|---|---|---|---|---|---|
| AR-01 | `kit.js:332` (`crowdAtlas`), `kit.js:357` (`makeCrowd`), `brasilia.js:122-136` | **Plateia** (ambas) | ~240 quads com silhueta de papelão cinza desenhada em canvas, 4 poses, tingidos por instância; pulam no vertex shader | **A** | Híbrido: GLB low-poly instanciado (frente) + atlas de sprites (fundo). Ver seção 4 |
| AR-02 | `brasilia.js:86-93` | **Gradil** de contenção atrás da laje (ambas) | barras de caixa 0,04–0,07 m assadas | **A** | GLB estático Meshy de 1 módulo de cavalete/grade (≤ 400 tris), instanciado 25× |
| AR-03 | `brasilia.js:114-119`, `kit.js:227` (`BANNERS`), `kit.js:233` (`clothAtlas`) | **Faixas** no gradil e erguidas pela plateia (ambas) | retângulo de cor chapada + texto Bangers em canvas | **A** | Textura GPT (tecido pintado à mão, amassado, costura) por trás do texto; manter o shader de pano (`makeCloth`) |
| AR-04 | `brasilia.js:98-104, 111`, `kit.js:249` (`FLAG_DRAW`) | **Bandeirinhas** da plateia + mastros | desenho vetorial chapado em canvas | C | Textura GPT (bandeiras de tecido) no mesmo atlas |
| AR-05 | `brasilia.js:94-97` | **Saia do palanque** (borda de baixo do retrato) | 30 caixas alternando verde/amarelo | **A** | Textura GPT (lona/TNT plissado verde-amarelo com franja) num plano só |
| AR-06 | `kit.js:419` (`fightFloorTex`), `brasilia.js:138-144` | **Chão da laje de luta** | concreto + juntas + linhas desenhados em canvas | **A** | Textura GPT 3:1 (concreto de palanque gasto, faixas pintadas, manchas) — manter tamanho único (não repete) |
| AR-07 | `kit.js:470` (`grassTex`), `brasilia.js:67-80` | **Gramado** | ruído de canvas | C | Textura GPT seamless (grama seca do cerrado, vista de cima) |
| AR-08 | `brasilia.js:188` (`soundTruck`), chamado em `:181` | **Trio elétrico** (Esplanada) | baú/cabine/caixas de som em caixas e cilindros | B | GLB estático (≤ 3k tris) |
| AR-09 | `brasilia.js:204` (`palanque`), chamado em `:182` | **Palanque com púlpito** (Esplanada) | caixas | B | GLB estático (≤ 2k tris) |
| AR-10 | `kit.js:520` (`tree`), `brasilia.js:172-176` | **Ipês** floridos nas laterais | icosaedro achatado + cilindro | B | 2–3 GLB estáticos de ipê low-poly (amarelo/rosa) instanciados, ou sprite GPT |
| AR-11 | `noite.js:39-48` (`congress` `kit.js:487`, `palace` `noite.js:25`, morros `:41`) | **Fundo da arena noite**: Congresso, Planalto, STF, morros | caixas assadas + cúpulas + colunas extrudadas | **A** | **Backdrop pintado GPT** noturno (mesmo esquema de `makeBackdrop` + `brasilia_backdrop.webp`) |
| AR-12 | `noite.js:49-54` | **Os Candangos** (noite) | 2 cápsulas + 2 esferas sobre caixa | B | GLB estático (≤ 2k tris) |
| AR-13 | `noite.js:58-64` | **Postes** com luminária (noite) | caixa fina + caixa emissiva | B | GLB estático de poste (≤ 300 tris), instanciado 10× |

Fora do inventário: `ministry()` (`kit.js:511`) não é usado por nenhuma arena; borda do espelho d'água (`brasilia.js:170`) e mastro da bandeira (`noite.js:55`) podem continuar caixas.

### Prompts — cenário

- **AR-02 gradil**: `A single modular metal crowd-control barricade section, light gray painted steel with yellow and green stripes on the top bar, flat feet, Brazilian political rally style, 3D vinyl toy caricature, chunky rounded proportions, glossy saturated colors, soft studio lighting, single object centered, three-quarter view, plain flat white background, no text, no ground shadow`
- **AR-03 faixas (textura)**: `Flat front-facing photo of a long hand-painted protest banner made of cotton fabric, slightly wrinkled, visible stitching and rope eyelets at both ends, plain solid red cloth with a thin yellow stripe on top and bottom, empty center area for text, even lighting, aspect ratio 8:1, no text`
  (repetir com fundo azul, creme e verde para as 4 faixas; o texto continua no canvas)
- **AR-04 bandeirinhas (textura)**: `Flat front view of a small waving cloth hand flag, fabric texture with soft folds, solid green with a yellow diamond and blue circle (Brazilian-style, simplified), even lighting, transparent background, no text`
- **AR-05 saia do palanque (textura)**: `Flat front view of a stage skirt made of pleated green and yellow fabric panels hanging from a white wooden edge, short yellow fringe at the bottom, festive Brazilian rally stage, even lighting, wide aspect ratio 10:1, seamless horizontally, no text`
- **AR-06 chão (textura)**: `Top-down orthographic texture of a worn concrete outdoor stage floor, large square slabs with dark joints, faded painted yellow boundary lines and a green center stripe, scuff marks and small stains, stylized hand-painted game texture, saturated but soft colors, aspect ratio 3:1, no text, no perspective`
- **AR-07 grama (textura)**: `Seamless tileable top-down texture of dry Brazilian cerrado lawn grass, olive green and straw yellow patches, stylized hand-painted game texture, no perspective, no shadows`
- **AR-08 trio elétrico**: `A Brazilian "trio elétrico" sound truck: short yellow box truck with a green stripe, white cab, a tall wall of black loudspeakers on the roof with a railing, 3D vinyl toy caricature, chunky rounded proportions, glossy saturated colors, soft studio lighting, single object centered, three-quarter view, plain flat white background, no text, no ground shadow`
- **AR-09 palanque**: `A small political rally stage: brown wooden platform with green and yellow skirt, a navy blue podium with two microphones, a tall blue backdrop panel with a yellow top bar on two black poles, 3D vinyl toy caricature, chunky rounded proportions, glossy saturated colors, soft studio lighting, single object centered, three-quarter view, plain flat white background, no text, no ground shadow`
- **AR-10 ipê**: `A stylized flowering yellow ipê tree (Brazilian cerrado), twisted dark trunk, round puffy canopy made of chunky clusters of bright yellow flowers, low-poly friendly shapes, 3D vinyl toy caricature, glossy saturated colors, soft studio lighting, single object centered, three-quarter view, plain flat white background, no ground shadow` (variação: `bright pink flowers`)
- **AR-11 backdrop noite (imagem final, não vai ao Meshy)**: `Wide painted matte background for a fighting game, Brasília Three Powers Square at night seen from ground level: the National Congress twin towers and two domes glowing warm in the center distance, the Planalto palace with white curved columns lit by floodlights on the left, the Supreme Court building on the right, starry deep blue-violet sky with a moon, low dark hills on the horizon, toy-like diorama style, saturated colors, soft glow, horizon at 55% height, aspect ratio 3:2, no people, no text`
- **AR-12 Candangos**: `Bronze modernist sculpture of two tall thin abstract standing figures side by side holding long poles, on a low stone pedestal (inspired by Brasília's "Os Candangos"), 3D vinyl toy caricature, chunky rounded proportions, glossy bronze color, soft studio lighting, single object centered, three-quarter view, plain flat white background, no text, no ground shadow`
- **AR-13 poste**: `A single modernist street lamp post from Brasília, slim dark gray pole with a flat rectangular warm-glowing lamp head, 3D vinyl toy caricature, chunky rounded proportions, glossy colors, soft studio lighting, single object centered, three-quarter view, plain flat white background, no ground shadow`

---

## 3. Props dos poderes (especiais e ultimates)

| ID | Arquivo:linha | O que é | De quem | Como aparece hoje | Prio | Asset ideal |
|---|---|---|---|---|---|---|
| P-01 | `projectiles.js:235` (`truck`) | Caminhão "Frota do Capitão" | Brasa — Patriota no Para-brisa | caixas + cilindros, baú com letreiro canvas | B | GLB estático **sem rodas** (rodas continuam procedurais girando); gancho `model` pronto em `capitao-brasa.js:32` |
| P-02 | `projectiles.js:277-299` | Apoiador pendurado no para-brisa | Brasa | cápsulas + esfera se debatendo | B | GLB **rigado** com animação "flailing" (Meshy Animate) — ou estático com o balanço atual |
| P-03 | `fx/brasaFx.js:126` (`bikeGeometry`), `:146` (`riderGeometry`), `:162` | Motos + motoqueiros da Motociata | Brasa | toros + caixas fundidos, 4 instâncias | B | GLB estático moto+piloto fundidos (≤ 3k tris), InstancedMesh 4× |
| P-04 | `ultimates/BrasaJacare.js:204` (`makeSyringe`) | Seringa gigante | Brasa — ultimate | cilindros | B | GLB estático |
| P-05 | `fx/dinoFx.js:91` (`makeVadeMecum`), usado em `projectiles.js:345,350` | Vade Mecum (meteoro, arremesso) | Dino | 3 caixas + faixas | B | GLB estático (capa em relevo; título continua decal) |
| P-06 | `fx/dinoFx.js:10` (`mouthTexture`) | Bocarra do Rugido Togado | Dino | sprite de canvas | B | Sprite GPT (boca de desenho animado escancarada, PNG transparente) |
| P-07 | `ultimates/DinoTrex.js:55` (`makeGlasses`) | Óculos que crescem na cinemática | Dino — ultimate | toros + cilindros | C | GLB estático |
| P-08 | `fx/picanhaFx.js` (`PICANHA_VISUAL`), propHand `lulacio.js:93` | Picanha do Povo | Lulácio (golpe meme) | ✅ refeita (05/10): peça em meia-lua no espeto (ExtrudeGeometry + texturas de canvas: capa de gordura, crosta com grelha, corte ao ponto, sal grosso) + rastro de gordura/brasa/fumaça | B | GLB estático do espeto inteiro (`picanha.glb`); gancho pronto em `build()` e em `lulacio.js:36` |
| P-09 | `ultimates/LulacioPolvo.js:18` (`makeHead`), `:61` (`makeMic`) | Cabeça/manto do Polvão (chapéu panamá, barba, gravata) + microfone | Lulácio — ultimate | esferas/cilindros; tentáculos `Tentacle.js` | B | GLB estático do **manto+cabeça** via `MeshyBody`; tentáculos continuam procedurais (SkinnedMesh por curva) |
| P-10 | `xandorVisuals.js:64` (`stamp`) | Carimbo BLOQUEADO gigante | Xandor (golpe meme) | caixa vermelha + cilindro + esfera; face com texto canvas | B | GLB estático (cabo de madeira + base vermelha); face "BLOQUEADO" continua decal |
| P-11 | `xandorVisuals.js:106` (`pen`), `ultimates/XandorAvatar.js:37` (`makePen`) | Caneta colossal (Canetada + canetas da ultimate) | Xandor | cilindro + cone + clipe | B | GLB estático de caneta-tinteiro preta e dourada |
| P-12 | `ultimates/XandorAvatar.js:59` (`makeGavel`) | Martelo colossal do finalizador | Xandor — ultimate | cilindros | B | GLB estático |
| P-13 | `xandorVisuals.js:50` (`paper`), textura `:21` | Intimação voando | Xandor | plano com documento em canvas | C | Textura GPT (papel timbrado amassado) — o texto pode ficar no canvas |
| P-14 | `ultimates/XandorAvatar.js:49` (`makeBook`) | Livros orbitando | Xandor — ultimate | caixas | C | Reusar o GLB do Vade Mecum (P-05) com tint |
| P-15 | `ultimates/XandorAvatar.js:15` (`sealTexture`) | Selo judicial atrás dele | Xandor — ultimate | canvas | C | Sprite GPT (selo dourado com balança) |
| P-16 | `fx/nikolasFx.js:25` (`makePhone`), também `NikolasViral.js:73` | Celular da Selfie do Dano / ultimate | Nikolas (golpe meme) | caixa + plano | B | GLB estático (capinha colorida); tela continua textura de canvas |
| P-17 | `fx/nikolasFx.js:174` (`chupeta`) | Chupeta Teleguiada | Nikolas | toro + cilindro + esferas | B | GLB estático |
| P-18 | `fx/nikolasFx.js:205` (`mamadeira`) | Mamadeira Turbo | Nikolas | cilindros (vidro transparente) | B | GLB estático (corpo opaco; leite pode virar material translúcido no código) |
| P-19 | `fx/flavioFx.js:95` (`makeChair`) | Cadeira institucional com rodinhas (Senador Express) | Flávio | caixas + cilindro + esferas | B | GLB estático |
| P-20 | `fx/flavioFx.js:13` (`crackTexture`), Hitters `crack` `:174` / `eruption` `:210` | Rachadura da Rachadinha Sísmica (golpe meme) | Flávio | rachadura desenhada em canvas | B | Sprite/decal GPT (rachadura com bordas de terra, PNG transparente); as pedras continuam procedurais |
| P-21 | `fx/vorcaroFx.js:57` (`makeBriefcase`) | Maleta (Maleta Voadora, Mala de Contatos, na mão, maleta-portal da ultimate) | Vorcaro | caixas + toro, tampa articulada | B | GLB em **2 peças** (corpo e tampa separados) para manter a tampa abrindo |
| P-22 | `fx/vorcaroFx.js:26` (`coinTexture`), Hitter `juros` `:156`, `CoinFlickFx` `:363` | Moeda dos Juros Compostos | Vorcaro | cilindro com face canvas | C | Textura GPT da face da moeda (cilindro continua) |
| P-23 | `fx/vorcaroFx.js:17` (`billTexture`), `:45` (`moneyTexture`) | Notas voando / maço de dinheiro | Vorcaro | canvas | C | Textura GPT (nota de desenho animado fictícia) |
| P-24 | `fx/duvalFx.js:12` (`makePendrive`), gigante em `DuvalBackup.js:43` | Pendrive (projétil e ultimate) | Duval | caixas + esfera LED | B | GLB estático (LED continua esfera emissiva procedural) |
| P-25 | `fx/duvalFx.js:151` (`vazamento`), `fileTexture` `:26` | Pasta CONFIDENCIAL que abre e despeja arquivos | Duval | plano com textura canvas | B | Sprite GPT (pasta parda aberta + folhas), carimbo continua canvas |
| P-26 | `fx/erikaFx.js:14` (`makeMic`), também `ErikaPlenario.js:28` | Microfone | Erika | cilindros + esfera | B | GLB estático |
| P-27 | `fx/erikaFx.js:27` (`polaroidTexture`) | Foto polaroid do Close Certo | Erika | silhueta em canvas | C | Sprite GPT (moldura polaroid; a "foto" pode ser render do jogo) |
| P-28 | `fx/dilmaFx.js:12` (`makeMandioca`), colossal `DilmaDilmes.js:47` | Mandioca (projétil, na mão, colossal) | Dilma | cilindro + toros + cones | B | GLB estático |
| P-29 | `fx/dilmaFx.js:26` (`makePot`) | Pote de vidro do Estocar Vento | Dilma | cilindro transparente + tampa | B | GLB estático (tampa separada para saltar; vidro com material transparente forçado no código) |
| P-30 | `fx/dilmaFx.js:97` (`makeBike`) | Bicicleta da Pedalada Fiscal | Dilma | toros + barras | B | GLB estático **sem rodas** (rodas procedurais giram) |
| P-31 | `ultimates/DilmaDilmes.js:13` (`makeDog`), `:27` (`makeKid`) | Cachorro e criança ("atrás da criança tem um cachorro") | Dilma — ultimate | esferas/cápsulas | B | 2 GLB estáticos (ou rigados com idle) |
| P-32 | `fx/haddadFx.js:28` (`makePacote`) | Pacote de encomenda TAXADO! | Haddad | caixa + fita | B | GLB estático (selo continua decal) |
| P-33 | `fx/haddadFx.js:99` (`makeStampTool`) | Carimbo do Imposto | Haddad | cilindros + caixa | B | GLB estático |
| P-34 | `ultimates/HaddadTaxacao.js:23` (`makeLion`) | Leão da Receita (finalizador) | Haddad — ultimate | "cabeça de primitivas com juba", mandíbula móvel | B | GLB em **2 peças** (cabeça + mandíbula) via `MeshyBody` |
| P-35 | `ultimates/HaddadTaxacao.js:17` (`boletoTex`), `fx/haddadFx.js:41` (`sheetTex`) | Boletos (chuva) e planilha do Arcabouço | Haddad | canvas | C | Textura GPT |
| P-36 | `fx/boulosFx.js:41` (`makeMegaphone`), também `BoulosAto.js:16` | Megafone | Boulos | cilindro aberto + toro + caixa | B | GLB estático |
| P-37 | `fx/boulosFx.js:24` (`makeTent`), também `BoulosAto.js:18` | Barraca OCUPADO! | Boulos | cone de 4 lados | B | GLB estático (placa continua decal) |
| P-38 | `fx/boulosFx.js:56` (`makeMarcher`), Marcha `:126`, `BoulosAto.js:17` (14×) | Manifestantes fictícios | Boulos (especial + ultimate) | caixas + esfera fundidas | B | **Reusar os torcedores 3D da plateia** (seção 4) — GLB rigado com marcha, tingidos de vermelho |
| P-39 | `fx/renanFx.js:80` (`LiveCamFx`), gigante `RenanCancelamento.js:32` | Celular no bastão de selfie (Live Polêmica) | Renan | caixa + cilindro | B | GLB estático (pode compartilhar com P-16) |
| P-40 | `ultimates/RenanCancelamento.js:11` (`badgeTex('dislike')`) | Polegares DISLIKE da avalanche | Renan — ultimate | sprite de canvas | C | GLB estático de polegar-pra-baixo instanciado (ou sprite GPT) |
| P-41 | `StatusFx.js:19` (`lockTexture`) | Cadeado do status BLOQUEADO acima da cabeça | Xandor (efeito no rival) | canvas | C | Sprite GPT |

Fora do inventário: `crowdWave` (`projectiles.js:162`) não é usado por nenhum personagem (a Picanha usa `civilCrowd`, já com GLB Quaternius) — pode ser removido.

### Prompts — props (todos terminam com o estilo-base)

> `[S]` = `3D vinyl toy caricature, chunky rounded proportions, glossy saturated colors, soft studio lighting, single object centered, three-quarter view, plain flat white background, no text, no ground shadow`

- **P-01 caminhão**: `A short cartoon cargo truck with a bright green cab, big chrome grille and bumper, round headlights, tall chrome exhaust stack, white box trailer with a green and yellow stripe along the side, wheels removed (empty wheel arches), [S]`
- **P-02 apoiador**: `A cartoon male rally supporter character in a yellow t-shirt and blue jeans, arms and legs spread out in a panicked star pose, mouth wide open screaming, holding a tiny green-yellow flag, full body, front view, [S]`
- **P-03 moto**: `A cartoon motorcycle with a rider: green fuel tank, chrome exhaust, round headlight; rider wearing a yellow helmet and green jacket leaning forward, side three-quarter view, [S]`
- **P-04 seringa**: `A giant cartoon vaccine syringe, clear plastic barrel with glowing green liquid, white plunger, shiny steel needle, [S]`
- **P-05 Vade Mecum**: `A huge thick law book, dark brown leather cover with gold metal corner bands and two gold horizontal stripes, cream page edges, closed, [S]`
- **P-06 bocarra (sprite)**: `Cartoon drawing of a gigantic wide-open roaring mouth seen from the front: big pink tongue, rows of chunky white teeth, dark red throat, bold black outline, comic book style, transparent background`
- **P-07 óculos**: `Thin wire-frame reading glasses with small round lenses, gold frame, slightly bent, [S]`
- **P-08 picanha**: `A whole grilled Brazilian picanha on a churrasco skewer: half-moon shaped piece of beef with a thick glossy white-cream fat cap on top sprinkled with coarse salt, dark grill marks on the brown crust, the front side cut open showing a pink medium-rare interior with a gray-brown cooked edge, long steel skewer through it with a turned wooden handle on the left, side view, [S]` (cabo à esquerda, ponta à direita, corte virado para a câmera)
- **P-09 Polvão (cabeça+manto)**: `A giant cartoon purple octopus mantle with a friendly old man's face, thick gray beard and mustache, wearing a white panama hat with a black band, white shirt collar and red tie at the base, tentacles cut off at the skirt (no tentacles), [S]`
- **P-10 carimbo BLOQUEADO**: `A giant rubber office stamp: dark brown wooden handle with a round knob, rectangular bright red stamp base, blank face, [S]`
- **P-11 caneta**: `A giant luxury fountain pen, glossy black body, gold band, gold pocket clip and gold nib, capless, [S]`
- **P-12 martelo**: `A giant judge's gavel, dark polished wood head with gold bands, long wooden handle, [S]`
- **P-13 intimação (textura)**: `Flat front view of an official court summons document on cream paper, letterhead with a small coat of arms, blank lines of placeholder gray text, red wax seal at the bottom, slightly crumpled, even lighting, no readable text`
- **P-15 selo (sprite)**: `Golden ornate circular judicial seal with scales of justice in the center, laurel wreath border, glowing embossed metal, front view, transparent background, no text`
- **P-16 celular**: `A modern smartphone in a bright blue rubber phone case, black screen, camera bump on the back, front three-quarter view, [S]`
- **P-17 chupeta**: `A baby pacifier: light blue ring handle, wide blue shield with a white button, beige silicone nipple, [S]`
- **P-18 mamadeira**: `A baby bottle full of milk, clear plastic body, orange screw cap, beige silicone nipple, cute cartoon proportions, [S]`
- **P-19 cadeira**: `An executive senate office chair on five-star chrome wheeled base, high back in dark green leather with brass studs, wooden armrests, [S]`
- **P-20 rachadura (sprite)**: `Top-down view of a deep jagged ground crack in stone pavement, dark brown earth inside, broken edges with small rubble, glowing orange-amber light from inside, stylized game decal, transparent background`
- **P-21 maleta (2 peças)**: `A black leather executive briefcase, open lid showing stacks of cartoon money inside, gold metal corners, gold clasps and gold trim, handle on top, [S]` (gerar também fechada; no Meshy separar a tampa)
- **P-22 moeda (textura)**: `Front view of a shiny gold cartoon coin face with an embossed dollar-like sign and rim, no real currency, flat even lighting, transparent background`
- **P-23 nota (textura)**: `Front view of a fictional cartoon banknote, green and gold, ornate border, a smiling cartoon face in an oval, no real currency, no readable text, flat lighting`
- **P-24 pendrive**: `A USB flash drive: matte black body with a glowing cyan stripe, silver metal USB connector, tiny LED, [S]`
- **P-25 pasta (sprite)**: `A manila office folder opening with loose papers flying out, a red rectangle stamp area on the cover, front view, cartoon style, transparent background, no text`
- **P-26 microfone**: `A handheld stage microphone, black handle with a pink band, silver mesh ball head, [S]`
- **P-27 polaroid (sprite)**: `An empty instant polaroid photo frame, white thick border, slightly tilted, small gold sparkles around it, front view, transparent background, no text`
- **P-28 mandioca**: `A big cassava root (mandioca), long tapered brown bark-textured root with rings, a cut end showing white flesh, small green leaves at the top, [S]`
- **P-29 pote**: `A glass mason jar with a red screw lid, empty with a little swirl of light blue wind inside, label area blank, [S]`
- **P-30 bicicleta**: `A red retro city bicycle with a wicker basket on the front, black seat and handlebar, wheels removed, side three-quarter view, [S]`
- **P-31a cachorro**: `A small cute caramel mutt dog sitting, big floppy ears, tongue out, [S]`
- **P-31b criança**: `A cartoon child about 7 years old in a red t-shirt and shorts, standing and waving, big head, [S]`
- **P-32 pacote**: `A cardboard shipping package box with beige packing tape, slightly dented corners, blank red label area, [S]`
- **P-33 carimbo do imposto**: `A rubber office stamp with a dark wooden handle and round knob, black rectangular base with a red ink pad underneath, [S]`
- **P-34 Leão da Receita**: `A giant cartoon lion head, big orange-brown fluffy mane, angry eyebrows, mouth wide open showing big teeth, wearing a tiny green visor cap of a tax accountant, head only, [S]` (no Meshy: separar a mandíbula ou gerar `mouth closed` + mandíbula à parte)
- **P-35 boleto (textura)**: `Flat front view of a fictional Brazilian bank payment slip (boleto), white paper with a barcode at the bottom, gray placeholder lines, slightly crumpled, even lighting, no readable text`
- **P-36 megafone**: `A white handheld megaphone with a red rim on the horn, black pistol grip handle, [S]`
- **P-37 barraca**: `A small orange camping tent, pyramid shape, open dark door flap, guy ropes and stakes, [S]`
- **P-39 celular no bastão**: `A smartphone mounted on a black selfie stick, purple glowing screen, [S]`
- **P-40 dislike**: `A cartoon thumbs-down hand icon as a 3D object, glossy red, [S]`
- **P-41 cadeado (sprite)**: `A cartoon red padlock with a shiny steel shackle, bold black outline, comic style, front view, transparent background, no text`

---

## 4. Plateia 3D barata (AR-01)

**Hoje:** ~240 torcedores (6 fileiras, 36→56 por fileira, buraco no centro) = ~480 triângulos, **1 draw call** (`InstancedMesh` + atlas canvas de 4 poses, pulo/onda no vertex shader, `react()` dispara a onda).

### Proposta em 2 fases

| Fase | O quê | Custo extra | Ganho |
|---|---|---|---|
| **1 (rápida)** | Trocar só o atlas: **6 torcedores × 4 poses** pintados no GPT (PNG transparente), no mesmo layout do `crowdAtlas` (células 128×256 → atlas 1024×1024 com 6 linhas×4 poses). `aSeed` ganha o índice da variação; camiseta tingida por instância via máscara (área branca da camiseta) | 0 tris, 0 draw calls, +1 textura 1024² (~0,3 MB WebP) | já tira o "papelão cinza" |
| **2 (3D)** | Fileiras 0–1 (≈ 75 pessoas, as mais próximas): **6 GLB low-poly do Meshy** (remesh 800–1.500 tris, textura 512²) num **`BatchedMesh`** (three 0.170) = 1 draw call; fileiras 2–5 continuam sprites (fase 1). Animação toda no vertex shader, **sem esqueleto**: pulo (translate Y), balanço (rotação Z no pé), squash; braços erguidos = segundo GLB por variação (braços pra cima) e troca por `setVisibleAt` quando `uEnergy` sobe | +60k–110k tris, +1 draw call (total 2), +6 texturas 512² | volume e luz reais na fila da frente, que é a que aparece no retrato |

- Qualidade `lite` (celular fraco): só fase 1 (sprites).
- Os mesmos 6 GLBs servem para os **manifestantes do Boulos** (P-38) e a multidão da ultimate (com tint vermelho) — 1 produção, 2 usos.
- Alternativa "impostor": renderizar os 6 GLBs em 4 poses com o próprio three (script tipo `tools/shot.mjs`) e gerar o atlas da fase 1 a partir do 3D — consistência total entre frente e fundo.

### Prompts — torcedores (6 variações; para o Meshy usar `[S]`, para o atlas trocar o fim por `transparent background, sprite sheet of 4 poses side by side: arms down, waving a small flag, holding a blank sign overhead, both arms raised cheering`)

1. `A cartoon Brazilian rally supporter, chubby middle-aged man with a mustache, plain white t-shirt, jeans, sneakers, standing, arms down, full body, [S]`
2. `A cartoon young woman rally supporter with curly hair in a ponytail, plain white t-shirt, denim shorts, sneakers, standing, full body, [S]`
3. `A cartoon elderly man rally supporter with a straw hat and glasses, plain white t-shirt, gray trousers, standing, full body, [S]`
4. `A cartoon teenage boy rally supporter with a backwards cap and headphones around his neck, plain white t-shirt, cargo pants, standing, full body, [S]`
5. `A cartoon woman rally supporter with short hair and sunglasses on her head, plain white t-shirt, long skirt, sandals, standing, full body, [S]`
6. `A cartoon tall thin man rally supporter with a beard and a bucket hat, plain white t-shirt, shorts, flip-flops, standing, full body, [S]`

(camiseta **branca lisa** em todos: o shader tinge por instância com as cores de `P.shirts`)

---

## 5. Personagens ainda placeholder

| ID | Personagem | Situação | Prio | Ação |
|---|---|---|---|---|
| CH-01 | **Boulos** (`src/data/characters/boulos.js:47`) | `PlaceholderModel`; só `portrait.png` em `public/assets/characters/boulos/` | **A** | GLB já gerado + remesh 30K + rig + motions (`boulos_guarda`, `boulos_megafone`) na conta Meshy → baixar (glb, Mixamo, rigged, arquivo único) → `public/assets/characters/boulos/model.glb` → `optimize_glb.mjs` → mapear `visual.clips` |
| CH-02 | **Renan** (`src/data/characters/renan.js:53`) | idem | **A** | idem (`renan_guarda`, `renan_live`) |

Também sem GLB próprio de ultimate: Xandor (`xandor/ultimate.glb`, usa stand-in dourado — ok) e Lulácio (`lulacio/ultimate.glb`, Polvão procedural — ver P-09).

---

## 6. Manter procedural (efeito, não objeto)

| Arquivo | O quê | Por quê |
|---|---|---|
| `kit.js:95` `makeSky`, `:174` `makeClouds`, `:396` `makeGlows` | céu, nuvens, halos | shader de 1 draw call, já bonito |
| `kit.js:289` `makeCloth` | ondulação de bandeiras/faixas | só a textura muda (AR-03/04) |
| `projectiles.js:93` `energyShot` | tiro de energia do Brasa | é energia (aditivo) |
| `SpecialFx.js:23` speech, `erikaFx.js:178` sonicWave, `boulosFx.js:79` arcos do megafone, `dilmaFx.js:151` vento, `dinoFx.js:37` ondas do rugido | ondas/arcos | efeito de partícula/forma |
| `fx/common.js:72/115/147` `Puffs`/`Rings`/`Shards` | poeira, anéis, estilhaços | pools baratos |
| `projectiles.js:404` `quake`, `flavioFx.js:210` `eruption` | torrões e pedras | dodecaedros girando leem bem; opcional: 1 GLB de pedra instanciado |
| `fx/Tentacle.js` | tentáculos/caudas | SkinnedMesh por curva, anima melhor que GLB |
| `fx/cloneFx.js:10` `makeGhost`, `FlavioDinastia.js:47` | hologramas/sombras | melhoria é de código (usar o GLB do personagem com material holo), não de asset |
| `NikolasViral.js`, `RenanCancelamento.js`, `DuvalBackup.js:14` Panel, `StatusFx.js` tags, `textSprite` | cards, contadores, letreiros | texto dinâmico em canvas |
| `ErikaPlenario.js:32` spotlight, `XandorAvatar.js` aura/olhos, tinta do Polvão, `VorcaroCapital.js:24` chuva instanciada | luz/aura/partículas | efeito (a chuva pode usar as texturas P-22/P-23) |
| `StatusFx.js:6` estrelinhas de tontura | indicador | pequeno e legível |

---

## 7. Segundo cenário (fase) reaproveitando o kit

### Como uma arena é registrada hoje
- `src/visual/arena/index.js`: `ARENAS = { brasilia: buildBrasilia, noite: buildNoite }`; `buildArena(scene, id)` cai em `brasilia` se o id não existir.
- `src/game.js:50`: `stage.setArena(buildArena(stage.scene, params.get('arena')))` — escolhida **só por URL** (`?arena=noite`), montada **uma vez** no boot; não há menu nem troca entre lutas, nem `dispose`.
- `Stage.js:37-38`: guarda a arena e repassa `react(v)` nos golpes fortes/KO. `game.js:364` chama `arena.update(dt, time)` todo frame.

### Contrato que a função `buildX(scene)` precisa cumprir
Retornar `{ root, U, react(v), excite(v), update(dt, time) }` e, na cena:
1. **Fundo**: `scene.background` + `scene.fog` (começar ≥ 70 — a câmera fica a < 40).
2. **Luz**: `HemisphereLight` + `DirectionalLight` com `castShadow` e câmera de sombra cobrindo x −10..10, y −2..8 + luz de recorte. (A ultimate da Erika apaga todas as luzes da cena e restaura; o `Look` adiciona as suas.)
3. **Chão de luta** em y = 0, `receiveShadow`, cobrindo pelo menos x ±(`ARENA_HALF` 7,5 + margem) e z −9..9 (a laje atual é 60×18).
4. **Plateia** com reação: `react(v)` (0..1) — hoje via `makeCrowd(...).uni` (`uEnergy`, `uKick`, `uKickT`).
5. **Enquadramento retrato**: o que mais aparece é o fundo central atrás dos lutadores (z −10 a −40) e a borda de baixo (z ≈ 9). Orçamento do kit: ~9 draw calls e poucos milhares de tris de cenário.

### Dois caminhos
| Caminho | Quando | Como |
|---|---|---|
| **A — reskin** (barato, ~100 linhas como `noite.js`) | cenário externo com gradil/plateia/laje (outra praça, avenida, estádio) | `buildEsplanada(scene, P, { night })` com uma paleta `P` + `P.scenery({ root, far, cloth, r, hz, P, night, U })` que monta o fundo no `Baker` `far`, empurra panos em `cloth`, e pode retornar `{ mid(midBaker), update(dt, time, energy) }` |
| **B — arena própria** | interior (ex.: Plenário da Câmara), sem céu/gramado | nova função usando as peças do `kit.js`: `Baker`, `makeSky`, `makeClouds`, `makeBackdrop`, `makeCloth`+`clothAtlas`, `makeCrowd`, `makeGlows`, `fightFloorTex`, `grassTex`, `tree`, `congress`, `rng`, `lin` — e devolver o mesmo contrato |

Chaves da paleta `P` aceitas por `buildEsplanada`: `zenith, upper, mid, horizon, below, sunDir, sunCol, glow, sunSize, stars, moon, haze, fog, clouds, cloudLit, cloudShade, cloudRim, cloudOpacity, grass{a,b,dry}, lawnTint, lawnEnd, floor, joint, lines, accent, shirts, scenery` (+ livres para o próprio `scenery`, ex.: `hill, win, white, congress`).

Limitações do caminho A (exigem mudança de código): gradil, saia do palanque, mastros e posições das faixas estão fixos em `buildEsplanada`; os textos das faixas (`BANNERS`, `kit.js:227`) são globais; o finalizador do Jacaré fala em "água do espelho d'água" (só estética).

### Checklist — cenário novo
- [ ] Definir tema e caminho (A reskin ou B própria).
- [ ] Gerar backdrop pintado no GPT (horizonte a ~55% da altura, 3:2, sem pessoas/texto) → `public/assets/arena/<id>_backdrop.webp` (a pasta `assets/arena/` já entra no precache, `vite.config.js:61`).
- [ ] Criar `src/visual/arena/<id>.js` com paleta + `scenery` (A) ou `build<Id>` completo (B).
- [ ] Registrar em `arena/index.js` (`ARENAS.<id>`) e testar com `?arena=<id>`.
- [ ] Luz + sombra cobrindo a laje; `fog` ≥ 70; chão em y = 0.
- [ ] Plateia com `react()` funcionando (golpe forte = onda; KO = todos pulam).
- [ ] Faixas/bandeiras com textos do tema (parametrizar `BANNERS` por arena).
- [ ] Props 3D do tema: GLB instanciado fora do Baker, ≤ 2k tris cada, ≤ 1 draw call por tipo.
- [ ] Conferir retrato **e** paisagem; conferir as ultimates que mexem na cena (Erika apaga luzes; Boulos/Vorcaro/Polvão ocupam o fundo).
- [ ] Medir com `?stats=1` (meta: draw calls de cenário ≤ 12; manter 60 fps no `lite`).
- [ ] (Opcional) seletor de arena no menu ou sorteio por luta + `dispose` da arena anterior (hoje não existe).

---

## 8. Arquivos de props esperados (`public/assets/props/`) — tabela final

Gancho genérico: `swapToGLB()` em `src/visual/propModel.js` (lista única em `PROP_GLB`). **Sem o arquivo o jogo fica idêntico** (nada é pedido: o catálogo `rk-assets` diz que não existe). Com o arquivo, o GLB entra no lugar do corpo procedural, **escalado e centrado automaticamente** no tamanho que o procedural ocupa (maior dimensão = maior dimensão). Então o que importa no Meshy é a **proporção** e a **orientação**; o "tamanho alvo" abaixo é o que o objeto ocupa no jogo (m). Depois de baixar: `node tools/optimize_glb.mjs` (gera `.m.glb`, usado nos níveis leves).

Orientação: frente/face principal para **+Z** (câmera), em pé no **+Y**; objetos compridos deitados no **X** como indicado. Se vier girado, passe `yaw/pitch/roll` no `swapToGLB` daquele item.

| Arquivo | ID | Onde entra (gancho) | O que o GLB substitui / o que continua procedural | Tamanho alvo no jogo (L × A × P, m) | Orientação |
|---|---|---|---|---|---|
| `picanha.glb` | P-08 | `fx/picanhaFx.js` `PICANHA_VISUAL.build()` (voo + mão) e `lulacio.js:36` | espeto + peça inteiros / rastro de gordura, brasa e fumaça | 1,73 × 0,61 × 0,55 (na mão ×0,62) | espeto no X, cabo em −X, corte para +Z |
| `caminhao.glb` | P-01 | `projectiles.js` `truck` (`capitao-brasa.js:32`) | lataria (cabine, baú, para-choque) / **rodas**, apoiador, buzina "FOM FOM!", fumaça, poeira | ≈ 6,8 × 3,0 × 2,0 | frente em +X, **sem rodas** |
| `carimbo_bloqueado.glb` | P-10 | `xandorVisuals.js` `stamp` | cabo + base / decal "BLOQUEADO" (face +Z), marca no chão, anel | 1,50 × 1,54 × 0,91 | face de carimbar para baixo (−Y), lado largo para +Z |
| `caneta_xandor.glb` | P-11 | `xandorVisuals.js` `pen` + `XandorAvatar.js` `makePen` | caneta inteira / tinta, anel | 0,27 × 2,85 × 0,24 | em pé no Y, ponta para −Y |
| `martelo.glb` | P-12 | `XandorAvatar.js` `makeGavel` | martelo inteiro | ≈ 1,5 × 3,2 × 1,2 | cabo para +Y, cabeça no X |
| `leao_cabeca.glb` | P-34 | `HaddadTaxacao.js` `makeLion` | juba, rosto, dentes de cima / mandíbula, crachá RECEITA | ≈ 3,4 × 3,4 × 1,9 | rosto para +Z, **sem mandíbula** |
| `leao_mandibula.glb` | P-34 | idem (`userData.jaw`, abre/fecha) | mandíbula + dentes de baixo | ≈ 0,9 × 0,3 × 0,7 | pivô no fundo da boca (abre girando em X) |
| `mandioca.glb` | P-28 | `fx/dilmaFx.js` `makeMandioca` (projétil, mão, COLOSSAL ×5,5) | raiz inteira | 1,24 × 0,35 × 0,26 | deitada no X, folhas/corte em −X |
| `pote_vento.glb` | P-29 | `fx/dilmaFx.js` `makePot` | vidro / **tampa** (salta), rótulo, redemoinho | ≈ 0,34 × 0,38 × 0,34 | em pé, **sem tampa** |
| `bicicleta.glb` | P-30 | `fx/dilmaFx.js` `makeBike` | quadro, banco, guidão, cesta / **rodas** | ≈ 1,4 × 0,95 × 0,4 | frente em +X, **sem rodas** |
| `cachorro.glb` | P-31a | `DilmaDilmes.js` `makeDog` | cachorro inteiro | ≈ 1,0 × 0,82 × 0,3 | focinho em +X |
| `crianca.glb` | P-31b | `DilmaDilmes.js` `makeKid` | criança inteira | ≈ 0,36 × 1,2 × 0,36 | de frente (+Z) |
| `maleta_corpo.glb` | P-21 | `fx/vorcaroFx.js` `makeBriefcase` (4 usos) | fundo + alça / dinheiro (canvas), tampa | 0,67 × 0,57 × 0,18 | fundo deitado no plano XY, abertura para +Z |
| `maleta_tampa.glb` | P-21 | idem (pivô da tampa, abre) | tampa + fechos dourados | ≈ 0,66 × 0,46 × 0,06 | igual ao corpo, fechada |
| `celular.glb` | P-16/P-39 | `fx/nikolasFx.js` `makePhone` (+ `NikolasViral.js`) | capinha/corpo / **tela** de canvas | 0,28 × 0,56 × 0,04 | tela para +Z |
| `chupeta.glb` | P-17 | `fx/nikolasFx.js` `chupeta` | chupeta / rastro | 0,58 × 0,77 × 0,54 | bico para +Z, argola para −Y |
| `mamadeira.glb` | P-18 | `fx/nikolasFx.js` `mamadeira` | mamadeira / rótulo TURBO, gotas, linhas | 0,39 × 1,07 × 0,40 | em pé, bico para +Y |
| `megafone.glb` | P-36 | `fx/boulosFx.js` `makeMegaphone` (+ `BoulosAto.js`) | megafone inteiro / arcos de som | 0,40 × 0,37 × 0,38 | boca em +X, cabo para −Y |
| `barraca.glb` | P-37 | `fx/boulosFx.js` `makeTent` (+ `BoulosAto.js`) | barraca / placa OCUPADO! + estaca, porta escura | 1,84 × 1,77 × 1,33 | porta para +Z |
| `vade_mecum.glb` | P-05/P-14 | `fx/dinoFx.js` `makeVadeMecum` (meteoro, arremesso) | livro / título (decal no topo) | 0,66 × 0,30 × 0,48 | deitado, capa para +Y, lombada em −X |
| `seringa.glb` | P-04 | `BrasaJacare.js` `makeSyringe` | tubo, flange, agulha / êmbolo (desce) | ≈ 0,9 × 4,2 × 0,9 | em pé, agulha para −Y, sem êmbolo |
| `pendrive.glb` | P-24 | `fx/duvalFx.js` `makePendrive` (projétil + gigante da ultimate) | corpo + conector / LED emissivo | 0,85 × 0,30 × 0,13 | conector em +X |
| `microfone_erika.glb` | P-26 | `fx/erikaFx.js` `makeMic` (+ `ErikaPlenario.js`) | microfone | 0,24 × 0,66 × 0,23 | em pé, globo para +Y |
| `microfone_polvo.glb` | P-09 | `LulacioPolvo.js` `makeMic` | microfone | ≈ 0,5 × 1,3 × 0,5 | em pé, globo para +Y |
| `cadeira.glb` | P-19 | `fx/flavioFx.js` `makeChair` | cadeira inteira | ≈ 0,9 × 1,4 × 0,9 | encosto em −X (assento olhando +X) |
| `pacote.glb` | P-32 | `fx/haddadFx.js` `makePacote` | caixa + fita / selos TAXADO! | 0,51 × 0,39 × 0,41 | qualquer (cúbico) |
| `carimbo_imposto.glb` | P-33 | `fx/haddadFx.js` `makeStampTool` | carimbo inteiro | ≈ 0,56 × 0,65 × 0,39 | cabo para +Y |

Como ligar um prop novo: no fim do `makeX()` (ou do `build()` do visual) — `swapToGLB(grupo, PROP_GLB.<nome>, { keep: [decal, tela] })`. Opções: `keep` (objetos que continuam), `all: true` (malhas transparentes também são corpo, ex.: vidro), `fit: 'height' | 'width'`, `height`/`size` fixos, `yaw/pitch/roll`, `offset`, `onReady`. Malhas de efeito (transparentes sem `depthWrite`) e sprites nunca somem.
