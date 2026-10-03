# MOVESET — plano oficial (01/10/2026, do usuário)

> Padrão para TODOS os lutadores: **1 passiva · 3 especiais · 1 Ultimate · 1 golpe "memeável"** (pensado para clipe curto).
> Golpes rápidos, legíveis, tecnicamente leves. Sem cutscene longa. Regra: **ENTRA → IMPACTA → SOME.**
> Status: ✅ feito · 🔨 em andamento · ⏳ a fazer. Referências visuais dos novos em `references/_novos/`.

## Regras de implementação
1. Especiais curtos. 2. Sem objetos permanentes. 3. Object pooling quando fizer sentido.
4. Prioridade: leitura visual, impacto, humor, performance. 5. Nada de cutscene longa fora do Ultimate.
6. Placeholder simples se o asset final não existir. 7. Lógica independente do visual (`src/fight/` sem Three.js).
8. Registrar decisões em `CHATGPT_DESIGN.md`.

**Ordem de implementação por personagem:** golpe meme → especiais restantes → passiva → Ultimate → VFX → balanceamento.
**Ordem dos novos personagens:** Nikolas → Flávio → Vorcaro → Duval → Erika.

---
## JAIR / CAPITÃO BRASA — rushdown / ofensivo  🔨 (01/10)
- **Passiva TÁ OK:** defesa perfeita gera pequena vantagem ou buff curto.
- **E1 Arminha de Energia:** gesto de mão; projétil curto verde-amarelo; não realista; arcade.
- **E2 Motociata:** moto atravessa rápido a arena; forte deslocamento horizontal; pouco tempo de tela.
- **E3 Patriota no Para-brisa:** grita; caminhão entra rápido com apoiador fictício pendurado; hit único de alto impacto; grande knockback; some rápido.
- **Ultimate Efeito Colateral:** seringa/vacina entra; ele é atingido; vira jacaré/híbrido mantendo terno/cabelo; corre/morde/arremessa; volta ao normal.
- **Meme:** Efeito Colateral / Jacaré.
- Visual novo: `references/capitao-brasa/v2/` (turnaround).

## DINO SUPREMO — tank  🔨 (01/10)
- Manter: **Rugido**, **Meteoro**, golpe pesado/tank (Pisão Cretáceo).
- **Ultimate T-Rex de Terno:** vira T-Rex/híbrido; mantém óculos/gravata; tenta alcançar os óculos com os bracinhos; final pesado.
- **Meme:** T-Rex de Terno.
- Visual novo: `references/dino-supremo/v2/` (turnaround, de toga).

## LULÁCIO — manter  ✅
- **Picanha do Povo:** joga picanha; multidão fictícia surge, avança, multi-hit, some.
- **Ultimate O Polvão do Povo:** polvo gigante com barba/microfone/gravata; tentáculos atacam.
- **Meme:** Picanha do Povo.

## XANDOR — manter  ✅
- **Intimação · BLOQUEADO · Canetada.**
- **Ultimate Avatar da Constituição:** entidade divina/judicial, olhos brilhando, aura, leis/canetas flutuando; final com martelo colossal / carimbo / canetada divina.
- **Meme:** BLOQUEADO.

---
## NIKOLAS / "NIKOLINHA" — rushdown / troll / rápido  ✅ (02/10, placeholder 3D)
- **Passiva ENGAJAMENTO:** selfie/provocação sem apanhar aumenta a barra especial. ✅
- **E1 Chupeta Teleguiada:** arremessa chupeta; pode quicar ou voltar; até 2 hits; projétil simples e rápido. ✅ (bumerangue + homing)
- **E2 Mamadeira Turbo:** mamadeira girando; hit médio; VFX de leite ao acertar; sem física pesada. ✅
- **E3 Selfie do Dano:** levanta o celular; flash causa hit; perto = pequeno stun; se acertar durante ataque inimigo → **PERFECT SELFIE**; rápido e engraçado. ✅
- **Ultimate VIRALIZOU:** começa selfie; contadores 10K → 100K → 1M; overlays LIKE / SHARE / COMENTÁRIO / SEGUIR; parede de notificações atravessa o inimigo; dano alto; curta. ✅
- **Meme:** Selfie do Dano.
- Ref: `references/_novos/NIKOLAS PODER.png`

## FLÁVIO / "FLAVÃO" — bruiser / impacto / pressão  ✅ (02/10, placeholder + VFX procedurais; sem GLB)
- **Passiva CLÃ:** abaixo de 30% de vida, pequeno buff defensivo.
- **E1 Rachadinha Sísmica** *(trocadilho visual/fantasia, não afirmação jurídica)*: pisa forte; rachadura percorre a arena; no inimigo: explosão de chão, knock-up ou knockback; ótimo anti-zoner.
- **E2 Zero Um:** clone/holograma fictício por um instante; golpe sincronizado; some logo; clone translúcido ou modelo simplificado.
- **E3 Senador Express:** cadeira institucional com rodinhas entra rápido; usada como dash/impacto; atravessa o inimigo; curto e cômico.
- **Ultimate DINASTIA:** sombras/versões fictícias da "família" atrás dele repetem os movimentos; sequência curta; finaliza com Rachadinha Sísmica ampliada.
- **Meme:** Rachadinha Sísmica.
- Ref: `references/_novos/FLAVIO.png`

## VORCARO / "VORCASH" — summoner / recursos / assist  ✅ (01/10, placeholder até o GLB)
- **Passiva LIQUIDEZ:** dano causado enche barra extra de CAPITAL; CAPITAL fortalece especiais.
- **E1 Maleta Voadora:** joga maleta com dinheiro; abre ao acertar; notas voam (VFX); hit médio.
- **E2 Juros Compostos:** moeda pequena que cresce a cada quique; quanto mais longe, mais dano (só escala).
- **E3 Mala de Contatos** *(sátira absurda/fantasia; não sugerir compra, suborno ou corrupção real)*: joga maleta; abre; versões paródicas de Flavão, Xandor e Nikolas entram como assist, 1 golpe cada, somem; combo curto e engraçado.
- **Ultimate CAPITAL INFINITO:** maleta/portal abre; caem moedas, cartões, maletas, gráficos; inimigo soterrado; maleta fecha; overlay **SALDO: 0**; explosão final.
- **Meme:** Mala de Contatos.
- Ref: `references/_novos/VORCARO.png`

## MARCOS DUVAL / "AGENTE DUVALL" — trap / técnico / contra-ataque  ✅ (02/10, placeholder + VFX procedurais; sem GLB)
- **Passiva ARQUIVO CONFIDENCIAL:** bloquear um especial enche um pouco mais a barra de Ultimate.
- **E1 Pendrive Explosivo:** joga pendrive; hit simples; pequeno stun; overlay curto **ARQUIVO CORROMPIDO**.
- **E2 Vazamento de Dados:** vários "arquivos" digitais caem em sequência; multi-hit leve; sprites/quads/partículas.
- **E3 Operação Tática:** dash curto e rápido; passa perto ou atrás do inimigo; termina em rasteira/golpe baixo.
- **Ultimate BACKUP COMPLETO:** pendrive grande; animação de conexão; overlay **COPIANDO... 99% → 100%**; explosão de documentos digitais; dano alto e knockback.
- **Meme:** Pendrive Explosivo.
- Ref: `references/_novos/DUVAL.png`

## ERIKA HILTON — counter / elegante / sonic  ✅ (02/10, placeholder 3D)
- **Passiva PRESENÇA:** quanto mais tempo sem tomar hit, pequeno bônus de velocidade. ✅ (3 s → +18%)
- **E1 Discurso de Impacto:** onda sonora frontal; elegante; VFX rosa/dourado ou branco. ✅
- **E2 Salto Agulha:** dash curto + chute giratório; limpo e rápido. ✅
- **E3 Close Certo:** pose por uma fração de segundo; se o inimigo atacar → counter, flash, contra-ataque automático. ✅ (mecânica genérica `kind: 'counter'`)
- **Ultimate PLENÁRIO É MEU:** luz apaga; spotlight; sequência curta de ondas sonoras; grande onda final arremessa o inimigo para fora do enquadramento; curta. ✅
- **Meme:** Close Certo.
- Ref: `references/_novos/ERIKA HILTON.png`

---
## Relatório pedido ao final de cada lote
- quais golpes já ficaram funcionais;
- como testar cada um (URL `&cast=neutral|forward|down|ultimate&meter=1`);
- quais ainda usam placeholder;
- se algum causou problema de performance (`&stats=1`).

---
# LOTE 3 (03/10) — Dilma, Haddad, Boulos, Renan Santos
> Poderes tirados de MEMES, GAFES e episódios PÚBLICOS conhecidos, sempre como piada/fantasia — nada de acusar crime não comprovado.

## DILMA — zoner confusa ("dilmês")  ✅ (03/10, placeholder 3D)
- **Passiva DOBRAR A META:** ao acertar um especial, o próximo especial causa o dobro (uma vez; texto "DOBROU A META!").
- **E1 Estocar Vento** (meme): segura e "estoca" vento num pote; solta uma rajada que cresce com o tempo segurado (projétil, empurra).
- **E2 Saudação à Mandioca:** mandioca gigante girando em arco (vai e volta).
- **E3 Pedalada Fiscal:** monta numa bicicleta e atravessa pedalando (dash multi-hit), notas/boletos voando.
- **Ultimate DILMÊS TOTAL:** discurso incompreensível — balões com frases embaralhadas cercam o rival (controles invertidos ~2 s), cachorro aparece "atrás da criança", final com mandioca colossal caindo.

## HADDAD — "TAXADD" — controle / recursos  ✅ (03/10, placeholder 3D)
- **Passiva ARRECADAÇÃO:** cada golpe que acerta "taxa" um pouco da barra de ultimate do rival para ele.
- **E1 Taxa das Blusinhas** (meme): arremessa pacotes de encomenda com selo "TAXADO!" (projétil, 2 hits).
- **E2 Arcabouço Fiscal:** ergue uma moldura de planilhas que bloqueia projéteis por um instante (escudo/counter).
- **E3 Carimbo do Imposto:** carimba "+IMPOSTO" no rival: fica mais lento por 3 s.
- **Ultimate TAXAÇÃO SUPREMA:** etiquetas de preço grudam em tudo, chuva de boletos, final com o Leão da Receita gigante mordendo.

## BOULOS — mobilização / zona  ✅ (03/10, placeholder 3D)
- **Passiva MOBILIZAÇÃO:** perto do rival, a barra de ultimate enche mais rápido.
- **E1 Ocupação Relâmpago** (meme): barraca de acampamento brota onde o rival está (zona) com placa "OCUPADO!".
- **E2 Megafone do Ato:** cone de onda sonora do megafone que empurra.
- **E3 Marcha:** avança com faixa e bandeiras, multidão fictícia atrás (dash).
- **Ultimate ATO GIGANTE:** multidão com barracas e faixas toma a arena e "despeja" o rival pra fora do quadro.

## RENAN SANTOS — streamer polêmico / contra-ataque  ✅ (03/10, placeholder 3D)
- **Passiva CORTE VIRAL:** combo de 3 hits vira "corte" e dá bônus curto de velocidade.
- **E1 Lacração Reversa** (meme): devolve projéteis com selo "LACROU!" (reflete).
- **E2 Live Polêmica:** liga a live; chat de comentários voando atordoa o rival.
- **E3 Debate Relâmpago:** dash com microfone, empurra com balão "TEXTÃO".
- **Ultimate CANCELAMENTO EM MASSA:** avalanche de hashtags, notificações e "DISLIKE" soterra o rival.
