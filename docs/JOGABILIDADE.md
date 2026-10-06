# Jogabilidade — o que aplicamos dos jogos de luta e por quê

Todos os números ficam em `src/fight/constants.js` → `FEEL` (e no frame data de cada golpe). A lógica continua em
`src/fight/` sem Three.js, e `tests/feel.mjs` confere cada mecânica.

## O que já existia (medido antes de mexer)
- Lógica em **60 Hz fixos** com acumulador (`main.js`). O jogo roda a 0,8× (48 passos/s), então a tela de 60/120/144 Hz
  não batia com a lógica e o movimento tremia.
- Buffer de 8 frames, dash por toque duplo, hitstop proporcional ao dano, tremor de câmera, escala de dano linear
  (−10% por hit, mínimo 50%).
- **Sem juggle** (quem caía ficava intocável), sem cancel normal→especial, sem tech de queda ou de agarrão, sem
  contra-golpe genérico, velocidade de andar "liga/desliga", IA só com fácil/normal/difícil por `?level=`, sem
  controles de toque.

## O que aplicamos

| Mecânica | Referência | Aqui |
|---|---|---|
| **Interpolação na renderização** | "Fix Your Timestep" (Gaffer On Games): o resto do acumulador é o alpha entre o estado anterior e o atual | `Match.step` guarda `px/py`; `main.js` calcula `rx/ry`; `FighterView` desenha a posição interpolada. Movimento liso em qualquer taxa de tela, ao custo de no máximo 1 frame de atraso visual |
| **Input buffer** | SF6 aceita o comando uns 4 frames antes (janela de 5); jogos mais permissivos usam 6–8 | 8 frames; o hitstop não gasta o buffer. **Novo:** o golpe guardado sai *no primeiro frame livre* (antes havia 1 frame morto de "parado") |
| **Cancels** | Cancel de especial e chain fraco→forte (Street Fighter, "magic series" do Marvel) | Normal que **encostou** (acerto *ou* defesa) cancela em especial até 10 frames depois do ativo; soco/soco baixo cancela em chute/rasteira. No vento não cancela: dá para confirmar o hit sem virar spam |
| **Escala de dano** | SF6: 100→100→80→70→60…; o trio "escala de dano + gravidade + hitstun" segura combos | Tabela 100/95/85/75/65/55%, mínimo 45%. Ultimate não escala |
| **Juggle com gravidade crescente e limite** | Subir cada vez menos a cada hit no ar, gravidade maior, limite de hits (anti-infinito) | Quem está caindo ainda toma até **2 hits**; cada um soma +30% de gravidade, lança 30% menos e bate 80%. Depois do limite, fica intocável até o chão |
| **Contra-golpe** | SF6: acertar o rival no startup/ativo dá +20% de dano e +2 frames | +20% de dano, +4 de hitstun, +3 de hitstop e um pouco de barra, com o carimbo amarelo **COUNTER!**. Vale no startup e nos 3 primeiros frames ativos (golpe de ativo longo não fica vulnerável o tempo todo) |
| **Pushback** | No canto, quem recua é o atacante (o defensor não tem mais para onde ir) | Na defesa o atacante recua 35% do empurrão (não "gruda" para spammar); com o defensor na quina, o atacante recua 90% |
| **Hitstun/blockstun** | Vantagem em frames coerente (fraco + no acerto e − na defesa, forte punível) | O frame data dos golpes base já era coerente (soco +4/−2, chute +1/−7, rasteira −15). A IA agora **pune** o que é negativo |
| **Wakeup + tech de queda** | Levantar rápido (quick rise) e imunidade curta a agarrão ao levantar (3S: 6 frames) | Botão perto da hora de cair = levanta rápido rolando para trás (46 contra 85 frames). Agarrão e ultimate são queda dura (sem tech). Ao levantar, 6 frames sem poder ser agarrado |
| **Throw tech** | SFV: janela de 7 frames para escapar do agarrão | Soco até 7 frames antes do agarrão pegar = **ESCAPOU!** (os dois se soltam, ninguém toma dano). Vale para o agarrão comum; agarrões especiais (Abraço) não têm tech |
| **Movimento** | Aceleração e freio curtos dão peso sem deixar lento; controle aéreo limitado | Chega à velocidade em ~4 frames e para em ~3; trocar de lado freia em dobro. No pulo dá para corrigir o arco um pouco (até ~1 m) |
| **IA** | IA divertida varia, defende, pune e não repete | Reflexos com chance por nível (tech de agarrão e de queda, anti-aéreo, punição de golpe no vento), combo com *hit-confirm* (só cancela em especial se o soco entrou), anti-spam (não repete a mesma ação 3×), dash para entrar. Níveis `?ai=1|2|3` (ou `?level=easy|normal|hard`). O fácil hesita e quase não pune |
| **Toque (celular)** | Direcional analógico com zona morta + 4 botões grandes | `src/ui/Touch.js`: aparece sozinho em tela de toque (`?touch=1` força, `?touch=0` esconde). Multitoque (andar e bater juntos); toque duplo no direcional dá dash; vibração curta no Android |

## Lote 2 (05/10) — pesquisa em docs/COMBATE_PESQUISA.md, auditoria em tests/framedata.mjs

| Mecânica | Referência | Aqui (tudo em `FEEL`, desliga com `null`) |
|---|---|---|
| **Barra de guarda / guarda quebrada** | Guilty Gear Guard Gauge, SF6 burnout: defender demais tem custo | `FEEL.guard`: 100 pontos; cada defesa gasta 11/17/22 (normal/pesado/especial); regenera 0,25/f, 20 f depois da última defesa; zerou → **GUARDA QUEBRADA** (42 f aberto, volta com 50). ~9 jabs ou ~5 especiais seguidos quebram. Barra fina azul no HUD (`src/ui/GuardHud.js`) |
| **Raspão só de especial** | SF: normais não raspam, especiais raspam | `FEEL.chip`: normal 0 %, especial 12 % (antes todo golpe raspava 15 %). Nunca mata |
| **Defesa na hora (just block)** | SF6 perfect parry, Garou Just Defend | `FEEL.justBlock`: começar a defender até 4 f antes do contato = **NA HORA!** — sem raspão, sem gasto de guarda, blockstun −4, +12 de barra. A passiva TÁ OK do Brasa continua como versão turbinada |
| **Anti-aéreo** | Anti-air deve ser legível e recompensar | `FEEL.antiAir`: chute e soco 2 têm `antiAir` — no pulo do rival: derruba, ×1,15, +8 barra, **ANTI-AÉREO!**. Chute com hitbox mais alta. A IA chuta depois do ápice (antes chutava cedo e errava) |
| **Quique na parede** | Wall bounce (Tekken/KI), 1× por queda | `FEEL.wallBounce`: queda forte (|vx| ≥ 0,3) na borda volta 45 % e sobe — **NA PAREDE!** — 1 hit extra dentro do limite do juggle |
| **Comeback** | X-Factor/Ultra: quem perde ganha recurso | `FEEL.comeback` **DISCURSO DE REAÇÃO**: abaixo de 30 % de vida, barra ×1,35 e dano ×1,06 (1× por round) |
| **Motion input opcional** | SF clássico × SF6 Modern | `FEEL.motion`: ↓↘→ + soco/chute = especial da frente · ↓↙← + botão = neutro · ↓,solta,↓ + botão = baixo. O botão de especial continua igual |
| **Economia de barra** | ~1 ultimate por round, não 2 | `FEEL.meter`: ganho por dano 2,4/1,5 → 1,4/0,8; defesa 8 → 5. Ultimates/partida 5,1 → 3,2; rounds decididos por ultimate 54 % → 23 % |
| **Chain de socos** | Target combo tem que conectar | **Bug**: o 2º/3º soco passava no vento fora da quina (empurrão do jab 0,55 m). Jab empurra 0,07; socos 2/3 dão um passo (`lunge`) |
| **Frame data dos especiais** | Golpe que acerta não pode ser punido | Motociata, Lacração, Zero Um, Salto Agulha, Carimbo e Debate eram **negativos no acerto** (−4 a −12): corrigidos (último hit derruba / hitstun maior / recuperação menor) |
| **Estilos** | rushdown / zoner / grappler / tanque | `stats.dash`, `stats.backdash`, `stats.gravity` novos (só o bloco `stats` de cada personagem) + vida/walk por arquétipo |
| **IA** | Meaty/oki, agarrar tartaruga, anti-aéreo certo, cuidar da guarda | `LEVELS.oki`, `throwTurtle`, `guardCare` por nível; difícil vence a normal ~90 % e a fácil 100 % |
| **Determinismo** | Rollback exige simulação determinista | `src/fight/Rng.js`: a partida recebe semente; KO/empate/IA sorteiam por `match.rng`. `tests/sim.mjs` e `tests/framedata.mjs` reproduzem a mesma luta |

### Controles (o que o jogador precisa saber)
- **Especial**: botão de especial (L / C / toque) sozinho, +frente ou +baixo — como antes. **Opcional**: ↓↘→ + soco ou chute
  também solta o especial da frente (↓↙← = neutro, ↓↓ = baixo), inclusive como cancel de um soco que acertou.
- **Agarrão**: frente + soco colado. Escapa com soco em até 7 f (**ESCAPOU!**). Agarra quem fica só defendendo.
- **Defesa**: segurar para trás. Defender demais esvazia a barra azul de **GUARDA** → **GUARDA QUEBRADA** (fica aberto).
  Defender no último instante = **NA HORA!** (sem raspão, sai antes, ganha barra). Especial defendido raspa 12 %.
- **Anti-aéreo**: chute (ou 2º soco) quando o rival está descendo do pulo → **ANTI-AÉREO!** derruba com dano extra.
- **Vida baixa**: abaixo de 30 % entra o **DISCURSO DE REAÇÃO** (barra enche mais rápido).
- Queda forte na borda: **NA PAREDE!** — quem bateu pode emendar 1 hit no ar.

### Números do lote 2 (antes → depois, `node tests/sim.mjs 10`, IA normal, 1560 partidas)
- Vitórias por personagem: 40–58 % → **46–56 %** (Brasa 40→55, Flavão 42→56, Renan 43→46, Vorcaro 58→50, Xandor 57→50).
  IA difícil (`node tests/sim.mjs 6 hard`): 40–60 %.
- Ultimates por partida 5,08 → **3,3**; rounds decididos por ultimate 54 % → **27 %**; round médio 46 s (timer de 60 s).
- IA difícil × normal (espelho): 90 % · difícil × fácil: 100 %. Maior combo 13 hits (especial multi-hit), combo médio 3,4.
- Golpes que não acertam colado: nenhum (os `hits:0` do `tests/specials.mjs` eram só alcance: agarrão/selfie/discurso
  não chegam a 3,5 m — o teste agora mede colado). Especiais ainda muito negativos na defesa, de propósito (alto
  risco/alta recompensa): Discurso −18 (atordoa), Rugido −16 (armadura), Lacração −20 (reflete projétil).
- Pares além de 70/30 com 20 partidas: ruído de ±10 pontos; os piores de verdade (Boulos × Dino, Dilma × Erika) são
  arquétipo contra arquétipo (zona × tanque, zoner × counter) — pendência de ajuste fino por par.

## Balanceamento depois das mudanças (lote 1)
A punição da IA expôs golpes muito inseguros. Ajustes pequenos (só recuperação ou passiva):
- Renan: Lacração Reversa (recuperação 16→11) e Debate Relâmpago (20→14).
- Boulos: Marcha (22→18) e Megafone do Ato (18→15).
- Taxadd: Arcabouço Fiscal (18→22) e Arrecadação (taxa 3→2 por hit).
- Capitão Brasa: Motociata (recuperação 18→22).

## Como mexer
- O ritmo geral fica em `?speed=` (padrão 0.8). O resto está no `FEEL`, por exemplo `FEEL.juggle.limit = 3` para combos
  aéreos mais longos e `FEEL.cancel.window` para cancels mais permissivos.
- `node tests/feel.mjs` deve continuar OK; `npm run sim` deve manter todos entre 38% e 62%.

## Fontes
- [Fix Your Timestep! — Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/)
- [Input Buffering: The Unsung Hero of Fighting Games — Wayline](https://www.wayline.io/blog/input-buffering-fighting-games)
- [How Damage Scaling Holds Fighting Games Together — Superjump](https://www.superjumpmagazine.com/how-damage-scaling-holds-fighting-games-together/)
- [Damage Scaling — Street Fighter Wiki](https://streetfighter.fandom.com/wiki/Damage_Scaling)
- [Pushback — Street Fighter Wiki](https://streetfighter.fandom.com/wiki/Pushback)
- [I wanna make a fighting game! (parte 7) — Andrea Jens](https://andrea-jens.medium.com/i-wanna-make-a-fighting-game-a-practical-guide-for-beginners-part-7-56f32f706a46)
- [Street Fighter 6 / Offense — SuperCombo Wiki](https://wiki.supercombo.gg/w/Street_Fighter_6/Offense)
- [Escaping Throws — Fighting Game Guide](https://www.fightinggameguide.com/throwtech.html)
- [More Fighting Game Terminology — Tilting at Pixels](https://tiltingatpixels.com/post/More-Fighting-Game-Terminology/)
