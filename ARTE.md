# ARTE.md — Bíblia visual do República Kombat

> Documento curto e normativo. Cenário, poderes, movimento e UI seguem o que está aqui.
> Decisão nova → atualizar a seção + 1 linha no Log do `CHATGPT_DESIGN.md`.

## 0. Frase-guia
**"Bonecão de Olinda encontra action figure premium, filmado num plantão de telejornal."**
Brinquedo colecionável de vinil: formas em bloco, cores sólidas e saturadas, material fosco com um brilho de borda. Caricatura, nunca retrato. Tudo é sátira — nada é documento.

## 1. Tom
- **Leitura em 1 frame.** Qualquer print do jogo precisa mostrar quem bate, quem apanha e onde (vale para o feed do TikTok em 9:16).
- **Exagero com disciplina.** Antecipação grande, impacto seco, recuperação rápida. O caos vive no golpe, não na tela.
- **Cômico, não cruel.** Sem sangue, sem ferimento realista, sem humilhação de corpo real. A violência é de desenho (estrelinhas, "POW", voar de costas).
- **Premium barato.** O jogo parece caro por contraste, tipografia e timing, não por polycount.

## 2. Paleta
### Sistema (UI e luz) — `src/style.css :root`
| Token | Hex | Uso |
|---|---|---|
| `--gold` | `#ffd400` | vida cheia, destaques, logo, LUTAR |
| `--red` | `#e0262b` | perigo, K.O., selo BLOQUEADO, AO VIVO |
| `--ink` | `#0b0b12` | placas, contornos, fundo de card |
| `--paper` | `#fff8e7` | texto sobre vermelho, selos |
| `--p1` | `#38bdf8` | tudo que pertence ao Jogador 1 |
| `--p2` | `#ff4d4d` | tudo que pertence ao Jogador 2 / CPU |
| `--ult` | `#7c3aed → #ff5bd8` | barra de ultimate (violeta→magenta); cheia = `--gold → #ff5bd8` pulsando |

Regra: **gold e red são do sistema.** Nenhum personagem usa `#ffd400` puro como cor principal (o amarelo do Brasa é o mesmo hex, mas sempre acompanhado do verde e nunca como fundo de UI).

### Por personagem (`visual.placeholder` é a fonte da verdade)
| | Principal | Acento | Secundária | Pele | Traço-chave (lê a 3 m) |
|---|---|---|---|---|---|
| **Lulácio** | azul-marinho `#1d3a8a` | vermelho `#d62828` | branco `#f2f2f2` (barba, cabelo) | `#f0c8a0` | barba branca cheia + barriga + chapéu de palha `#e8d49a` |
| **Capitão Brasa** | grafite `#2b2f36` | verde `#1fa34a` | amarelo `#ffd400` (faixa) | `#f1c6a5` | topete rígido de lado `#6b5a4a` + corpo-tábua + faixa diagonal |
| **Xandor** | preto `#121212` | dourado `#d4af37` | branco (colarinho), vermelho de detalhe `#c0122b` | `#e8b894` | careca-ovo brilhante + sobrancelhas em V + toga |
| **Dino Supremo** | cinza `#55595f` | verde-musgo `#4f6b3a` | âmbar `#e3a233` | `#e6b58e` | óculos retangulares grossos + cabelo grisalho pra trás + largura |
| **Flavão** | amarelo-camisa `#f0c419` | verde `#1f8a3c` | calça grafite-azulada `#2b3340` | `#e8b48f` | camisa de seleção + corpo largo de bruiser; VFX terra/âmbar `#d9a441` e holograma verde `#8cff9a` |
| **Agente Duvall** | preto-colete `#16181d` | cinza-tático `#9aa3ad` | calça azul `#1f3a7a` | `#e3b08c` | colete tático + barba + sobrancelha fechada; VFX digital ciano `#35c4ff` |

- VFX de cada um usa **o acento dele** (Lulácio vermelho, Brasa verde/amarelo, Xandor dourado, Dino âmbar/musgo). Energia = aditivo; objeto (picanha, caminhão, caneta) = opaco com a paleta do dono.
- Ultimates ganham **uma cor extra que nunca aparece no resto do jogo**: Polvão roxo-azul `#5b4bd6`, Jacaré verde-pântano `#2f7d4a`, Avatar branco-dourado emissivo, T-Rex âmbar queimado `#b8651e`.

### Arena (Brasília, pôr do sol)
Céu `#2a1b5e → #b8457a → #ff7a3d → #ffc46b` (de cima para baixo), névoa `#f59a5a`. Concreto `#f4efe6`, gramado `#6f8f3a`, espelho d'água azul-petróleo. O fundo é **quente e claro**; os lutadores são **escuros e saturados** — é esse contraste que separa os dois planos. Nada no cenário pode ser mais saturado que um lutador.

## 3. Iluminação (implementado em `src/visual/Look.js`, desligável com `?look=0`)
- **Sol** quente `#ffc48a` da frente-esquerda (alto) = chave. **Hemisfério** `#ffe2c4 / #51466b` = preenchimento. (Ambos vivem na arena.)
- **Luz de recorte (rim)** branco-quente, forte, vinda de trás/direita → contorno claro em ombro, cabeça e punho. É ela que faz o lutador "sair" do fundo, sem outline preto.
- **Preenchimento frio** fraco da frente-direita para o lado da sombra não virar breu (os ternos são pretos).
- **Sombras suaves** (VSM com blur) e um **blob** escuro sob cada lutador: pé no chão sempre lê.
- **Tone mapping ACES**, exposição 1.0 (`?tm=agx` para testar AgX). **Grading leve**: +contraste, +saturação, sombras levemente roxas, altas luzes levemente quentes. **Vinheta** discreta roxa-escura (nunca preta chapada).
- **Bloom barato** (1/4 da resolução, 3 passadas): só o que passa de branco brilha — VFX aditivo, emissivos de ultimate, careca do Xandor sob sol. Threshold alto: cenário não brilha.
- Celular: a cadeia inteira continua (é leve), MSAA cai para 2×; `?look=0` é o teste de referência de FPS.

## 4. Regras de VFX — **ENTRA → IMPACTA → SOME**
1. **ENTRA (≤ 8 frames):** a forma cresce do zero com antecipação legível (pisca, puxa o braço, carimbo sobe). O jogador precisa ver o golpe vindo.
2. **IMPACTA (1 frame + hitstop):** hitstop, flash branco em quem apanhou, anel de choque aditivo, 4–12 faíscas/estrelinhas, texto de impacto em Bangers. O shake é proporcional ao dano (0.1 normal · 0.22 pesado · 0.35 ultimate).
3. **SOME (≤ 12 frames):** encolhe ou esvai rápido. **Nenhum objeto fica na arena.** Tudo volta ao pool.
- Especial inteiro ≈ 1–1,8 s. Sem cutscene fora do ultimate (e o ultimate tem faixas pretas + fundo escurecido + título).
- Cor do VFX = acento do dono (seção 2). Branco só para flash e brilho de borda.
- Máx. ~200 partículas vivas; multidões são silhuetas/sprites, não modelos.
- Texto de impacto: 1 palavra, maiúscula, Bangers, gira ±8°, sobe e some em < 1 s.
- Ultimate = **transformação visível**: escala, cor extra, luz própria, selo/overlay. Contato só quando a lógica confirma (`ultRes`).

## 5. Tipografia e HUD
- **Duas fontes, só.** `Bangers` (display: nomes, números, letreiros, botões) e `Inter` 700/900 (rótulos pequenos, listas, avisos). Nunca serifada, nunca fonte de "terror".
- Display sempre com **contorno preto ≥ 3 px** (`-webkit-text-stroke` + `paint-order: stroke fill`) e **sombra dura** deslocada (não blur). Vermelho em baixo do gold nos letreiros grandes.
- **HUD = plantão de telejornal premium:** barras de vida grossas e chanfradas (skew), retrato em losango com a paleta do lutador, nome em placa escura, "urninhas" de round, timer central em placa, faixa AO VIVO, barra de ultimate em 3 segmentos que vira gold/magenta pulsando quando cheia.
- Hierarquia dos letreiros: **K.O. (vermelho, maior, treme) > TURNO (gold, faixa escura) > LUTEM! (branco) > nome do ultimate (gold com faixa) > SENTENÇA/texto de ultimate (carimbo vermelho sobre papel) > nome do especial (azul claro) > dano (amarelo pequeno).**
- Celular em retrato: HUD cabe em 540 px de largura sem quebrar nome; nada abaixo de 11 px; alvos de toque ≥ 44 px.
- Seleção: cards de "figura de ação" com a paleta do lutador, selo P1/P2, lista de golpes. O botão LUTAR é o maior elemento da tela.

## 6. Câmera e enquadramento (referência; o agente de câmera é dono de `Stage.js`)
Lateral, FOV 35, levemente de cima. Zoom-soco em golpes pesados. Ultimate: close + faixas. KO: câmera lenta. Os lutadores ocupam 35–55 % da altura em paisagem; em retrato, a câmera afasta e o HUD nunca cobre a cabeça.

## 7. Proibido
- Fotorrealismo, pele realista, rosto fiel a pessoa real, deepfake, nome real em qualquer texto de tela.
- Símbolos, logos, bandeiras, siglas ou slogans reais de partidos, instituições ou campanhas.
- Sangue, ferimento, nudez, arma de fogo realista.
- Mais de 2 fontes; texto sem contorno sobre o 3D; UI com borda fina (< 3 px) ou cantos muito arredondados (> 14 px): não é app, é brinquedo.
- VFX que fica na tela (ou no chão) depois do golpe; fade lento (> 12 frames); partículas em excesso; cutscene fora do ultimate.
- Fundo mais saturado que os lutadores; cenário que usa gold `#ffd400` ou red `#e0262b` do sistema.
- Vinheta preta chapada, bloom em tudo, aberração cromática, grão de filme, motion blur.
- Mudar `visual.placeholder` (paleta) de um personagem sem atualizar esta tabela e o `CHATGPT_DESIGN.md`.

## 8. Checklist de aceite visual (antes de commitar algo visual)
- [ ] Print em 1280×720 **e** 540×960: lê quem bate em quem?
- [ ] Silhueta dos dois lutadores destaca do fundo (rim visível em ombro/cabeça)?
- [ ] Letreiros com contorno e sombra, nenhum texto cru sobre o 3D?
- [ ] `?stats=1`: draw calls estáveis, `views criadas` para de crescer?
- [ ] `?look=0` continua funcionando (fallback)?
- [ ] Nada do item 7 apareceu?
