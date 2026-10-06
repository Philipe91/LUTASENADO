# Pesquisa de combate — o que os jogos de luta fazem e o que aplicamos (05/10)

Resumo aplicável ao República Kombat (lógica 2D em `src/fight/`, 60 Hz fixos, tudo por dados em `FEEL`).
Cada seção: **o conceito → números de referência → como está aqui**. A auditoria com números está em
`tests/framedata.mjs`; o balanço em `tests/sim.mjs`; cada mecânica tem um teste em `tests/feel.mjs`.

## 1. Frame data: startup / active / recovery e vantagem em frames
- **Conceito** (Infil, Dustloop): todo golpe é startup → ativo → recuperação. **Vantagem** = quem fica livre primeiro
  depois do contato. Jab: +4/+2 no acerto, −2 na defesa. Golpe forte: + no acerto, −5 a −10 na defesa. Golpe que
  derruba (sweep): muito negativo na defesa (−10 a −15) porque a recompensa é a queda.
- **"Safe"** = não pode ser punido de perto (≥ −4 com jab de 4–5 f). **"Punish"** = castigar a recuperação.
- **Aqui**: `tests/framedata.mjs` mede na simulação (não só no papel): soco +3/−3, soco 2 +3/−4, soco 3 0/−10,
  chute 0/−8, soco baixo +2/−3, rasteira derruba/−16. **Bug achado e corrigido**: o 2º e o 3º soco da sequência
  *não conectavam* fora da quina (empurrão do jab = 0,55 m); agora o jab empurra 0,07 (≈0,4 m) e os socos 2/3 dão um
  passo (`lunge`). Oito especiais tinham vantagem **negativa no acerto** (acertava e ainda apanhava: Motociata −12,
  Lacração −11, Zero Um −6, Salto Agulha −6, Carimbo −5, Debate −4) — corrigidos no frame data de cada um.

## 2. Hitstun / blockstun / hitstop
- **Hitstun/blockstun**: o defensor fica travado N frames; é o que define a vantagem acima.
- **Hitstop** (Sakurai, *Masahiro Sakurai on Creating Games*, vídeo "Hit Stop"): congelar os dois por alguns frames no
  impacto dá peso; golpe fraco 3–5 f, forte 8–15 f. Já tínhamos (`Combat.applyHit`: 6–14 + 3 se pesado, +3 em counter).
- **Aqui**: já existia; mantido. Contra-golpe (acertar no startup do rival) = +20% dano, +4 hitstun, +3 hitstop.

## 3. Agarrão (throw) e throw tech — o "pedra-papel-tesoura"
- **Conceito** (ki.infil.net/basics3, fightinggameguide.com): agarrão vence a defesa, golpe vence o agarrão, defesa vence o
  golpe. KI: 5 f de startup, **janela de tech de 7 f**, whiff muito longo (punível). SFV: tech 7 f. 3S: 6 f de
  imunidade a agarrão ao levantar.
- **Aqui**: já existia (frente+soco colado; tech com soco em 7 f; 6 f de imunidade ao levantar). **Novo**: a IA agarra
  quem **tartaruga** (defesa segurada 20+ frames ou em blockstun), com chance por nível (`LEVELS.throwTurtle`).

## 4. Anti-aéreo
- **Conceito** (SuperCombo/Shoryuken "Anti-Air"): pular vence ~90% dos golpes de chão, então o jogo precisa de respostas
  claras: um golpe que pega quem está no ar e **recompensa** (derruba, dano extra), e o pulo precisa ser lento o
  bastante para ser visto.
- **Aqui**: `FEEL.antiAir` — chute e soco 2 (gancho) têm `antiAir`; acertando alguém no pulo: derruba, ×1,15 de dano,
  +8 de barra, lança, carimbo **ANTI-AÉREO!**. O chute ganhou hitbox mais alta (0,65–1,4 m). A IA chuta **logo depois
  do ápice** (o pulo desce em ~18 f e o chute demora 9 f para ficar ativo — antes ela chutava cedo e errava).

## 5. Meaty / okizeme (pressão ao levantar)
- **Conceito** (Infil "Meaty"/"Okizeme"): atacar de forma que o golpe esteja ativo no 1º frame em que o rival levanta.
  Força defesa ou pega acordando; KI deixa o knockdown "assustador" de propósito.
- **Aqui**: a IA (`LEVELS.oki`) anda até o caído e solta chute (ou rasteira) no frame certo
  (`getup − startup + 1`). Quem levanta pode defender desde o 1º frame; agarrão continua impossível por 6 f.

## 6. Chip damage, barra de guarda e guard crush (anti-tartaruga)
- **Conceito**: SF — só especiais raspam a guarda (chip), normais não; SF6 Drive Gauge: defender gasta a barra, zerou →
  *burnout* (defesa vira punição, guard crush na quina). Guilty Gear/BlazBlue: **Guard Gauge** / Guard Crush — defender
  demais quebra a guarda.
- **Aqui**: **`FEEL.chip`** — normal 0, especial 12% (nunca mata). **`FEEL.guard`** — barra de 100: cada defesa gasta
  11 (normal) / 17 (pesado) / 22 (especial); regenera 0,25/f e só 20 f depois da última defesa; zerou →
  **GUARDA QUEBRADA** (42 f aberto, barra volta pela metade). ~9 jabs, ~6 chutes ou ~5 especiais seguidos quebram.
  A IA sai da defesa (dash/pulo para trás) quando a guarda está acabando (`guardCare`). Indicador: `src/ui/GuardHud.js`.

## 7. Defesa perfeita / just block
- **Conceito**: SF6 *Perfect Parry* (janela de 2 f, recompensa grande); 3S parry; Garou *Just Defend*; Smash *perfect
  shield*: defender no último instante dá recompensa (sem chip, menos blockstun, barra).
- **Aqui**: **`FEEL.justBlock`** (universal): defesa começada até 4 f antes do contato = **NA HORA!** — sem raspão, sem
  gasto de guarda, blockstun −4, +12 de barra. A passiva **TÁ OK** do Brasa é a versão turbinada (janela 8, buff).

## 8. Propriedades de golpe: launcher, wall bounce, sweep
- **Conceito**: Marvel/KI/Tekken: *launcher* joga pra cima (combo aéreo), *wall bounce* bate na parede e volta (1×),
  *sweep* derruba (reset da situação). Tudo limitado pelo trio escala de dano + gravidade crescente + limite de juggle.
- **Aqui**: `launch` já existia (Ocupação, anti-aéreo). **`FEEL.wallBounce`**: queda forte (|vx| ≥ 0,3) que bate na borda
  volta (45%) e sobe um pouco, 1× por queda, **NA PAREDE!** — dá 1 hit extra no ar dentro do limite do juggle (2).

## 9. Comeback
- **Conceito**: Marvel X-Factor, SF4 Ultra, MK X-Ray: quem está perdendo ganha um recurso para virar — sem inverter a
  partida sozinho.
- **Aqui**: **`FEEL.comeback`** "DISCURSO DE REAÇÃO": abaixo de 30% de vida, barra enche ×1,35 e dano ×1,06, 1× por round
  (passivas de vida baixa dos personagens continuam somando).

## 10. Inputs: buffer, leniência, motion vs. simplificado
- **Conceito**: buffer — SF6 4 f, Tekken 8, Smash Ultimate 9, Brawlhalla 3, GG 4. **SF6 Modern**: botão de especial +
  direção (SP, SP+→, SP+←, SP+↓) com *auto-combo*; Smash/MultiVersus/Brawlhalla: direção + botão, sem motions.
  Power Rangers BftG: 1 botão de especial. Motion (↓↘→) dá expressividade/erro humano; o simplificado dá acesso.
- **Aqui**: já era SF6-Modern (botão de especial + neutro/frente/baixo; buffer 8 f). **Novo, opcional**:
  **`FEEL.motion`** — ↓↘→ (ou ↓→) + soco/chute = especial da frente; ↓↙← + botão = especial neutro; ↓,solta,↓ + botão =
  especial baixo. Janela de 14 f, "armado" por 8 f. Também vale como cancel. Nada muda para quem usa o botão.

## 11. Determinismo (rollback-ready)
- **Conceito** (words.infil.net netcode, Killer Instinct/GGPO): rollback exige simulação **determinista** (mesmos inputs →
  mesmo estado), estado salvável e lógica rápida para re-simular vários frames. Nada de `Math.random` solto, nada de
  tempo real na lógica.
- **Aqui**: `src/fight/Rng.js` (mulberry32) — a partida recebe uma semente; textos de KO, empate e **toda a IA** sorteiam
  por `match.rng`. `tests/framedata.mjs` roda a mesma luta duas vezes e compara hit a hit. O `tests/sim.mjs` ficou
  determinista (semente por partida). Falta (pendência): snapshot/restore do estado para rollback de verdade.

## 12. Estilos por personagem (arquétipos)
- **Conceito**: rushdown (rápido, pressão), zoner (longe, recuo bom), grappler (lento, agarrão forte, vida), tanque
  (armadura, lento, cai firme), técnico/counter. Em Smash o "peso"/gravidade diferencia o pulo; em SF é walk/dash.
- **Aqui**: stats novos em cada `src/data/characters/<id>.js` (só o bloco `stats`): **`dash`**, **`backdash`**,
  **`gravity`** (peso do pulo) além de `walk`/`jump`/`hp`/`defense`. Nikolas/Brasa: dash 1,2–1,35; Xandor/Dilma:
  backdash 1,2 e pulo flutuante (0,9); Dino: dash 0,75, gravidade 1,2, 122 de vida; Lulácio/Flavão pesados.

## Fontes
- [Infil — The Fighting Game Glossary (frame advantage, meaty, okizeme, punish)](https://glossary.infil.net/?t=Frame+Advantage)
- [Dustloop — Glossary](https://www.dustloop.com/w/Glossary) · [GGXRD-R2 Mechanics (guard gauge)](https://www.dustloop.com/w/GGXRD-R2/Mechanics) · [BBCF Mechanics](https://www.dustloop.com/w/BBCF/Mechanics)
- [Frame data for beginners — The Fighting Games](https://thefightinggames.com/news/frame-data-for-beginners)
- [Killer Instinct guide: Throws & Knockdown (Infil)](https://ki.infil.net/basics3.html) — tech 7 f, whiff longo, oki
- [Escaping Throws — Fighting Game Guide](https://www.fightinggameguide.com/throwtech.html)
- [Anti-Air — SuperCombo Wiki](https://wiki.supercombo.gg/w/Anti-Air) · [Anti-Air — Shoryuken Wiki](http://wiki.shoryuken.com/Anti-Air)
- [Guard Break — Street Fighter Wiki](https://streetfighter.fandom.com/wiki/Guard_Break) · [Guard Crush — Giant Bomb](https://giantbomb.com/wiki/Concepts/Guard_Crush)
- [SF6 Modern controls — Capcom manual](https://game.capcom.com/manual/SF6/en/ps5/page/2/3) · [Engadget: Modern controls](https://www.engadget.com/street-fighter-6-modern-control-hands-on-sf6-182047557.html)
- [Masahiro Sakurai on Creating Games — "Hit Stop" (Source Gaming)](https://smashboards.com/threads/source-gaming-thinking-about-hitstop.423200/) · [TV Tropes: Hit Stop](https://tvtropes.org/pmwiki/pmwiki.php/Main/HitStop)
- [Netcode [p5]/[p6] — Fightin' Words, Infil (rollback, determinismo)](https://words.infil.net/w02-netcode-p5.html) · [Netcode in Fighting Games (compilado)](https://gist.github.com/MangaD/9f3649bcbad81eb3f2a7f255eb5ce8f1)
- [Core-A Gaming — Every Fighting Game Type Explained (arquétipos)](https://www.resetera.com/threads/core-a-gaming-every-fighting-game-type-explained.995526/page-2)
- [Fighting game input buffer por jogo (SF6 4 f, Tekken 8, Smash 9, Brawlhalla 3)](https://steamcommunity.com/app/1818750/discussions/0/4409670015902490178)
- Já aplicadas antes (docs/JOGABILIDADE.md): Gaffer On Games (timestep), Superjump (damage scaling), SuperCombo SF6 Offense.
