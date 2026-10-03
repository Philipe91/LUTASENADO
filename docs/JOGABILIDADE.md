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

## Balanceamento depois das mudanças
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
