# Animação — personalidade de movimento (05/10)

> Queixa do dono: "alguns modelos parecem estar com o mesmo movimento... quando vai começar, parece que eles fazem a mesma dancinha".
> Causa: 13 lutadores e só ~6 clips de guarda. Sete usavam a MESMA guarda do Xandor, quatro a do Lulácio, e os loops começavam
> todos no tempo 0 (dois lutadores com o mesmo clip balançavam em sincronia). Entrada e vitória: `Chest_Pound_Taunt` ou
> `Talk_Passionately` para quase todos.
> Solução sem gastar créditos do Meshy: camada procedural por personagem (`visual.persona`, em `src/visual/persona.js`)
> por cima dos clips. Ela vale para o GLB e para o placeholder (Boulos e Renan).

## 1. Clips disponíveis (inventário dos GLBs)
`node tools/list_clips.mjs public/assets/characters/*/model.glb public/assets/characters/*/model.anim.glb`

| Arquivo | Clips |
|---|---|
| `xandor/model.anim.glb` (biblioteca) | Running, Walking, **01a0ef6c** (intimação), **01a0ef6e** (bloqueado), **01a0ef6f** (canetada), **01a0ef75** (guarda de boxe), **01a0ef76** (guarda fechada, mãos no rosto), **01a0ef77** (guarda saltitante com passo), Block1, Dead, Face_Punch_Reaction, Fall_Down, Left_Jab_from_Guard, Punch_Forward_with_Both_Fists, Regular_Jump, Right_Jab_from_Guard, Simple_Kick, Stand_Up1, Sweep_Kick, victory (8,5 s), restpose |
| `lulacio/model.anim.glb` (biblioteca) | Running, Walking, **01a0efe2** (lula_guarda2: brigão), **01a0efe4** (arremesso por cima do ombro), Angry_Ground_Stomp, Block2, Chest_Pound_Taunt, Dead, Fall_Down, Grip_and_Throw_Down, Heavy_Hammer_Swing, Hit_Reaction_to_Waist, Jump_with_Arms_Open, Left_Hook_from_Guard, Right_Uppercut_from_Guard, Spartan_Kick, Stand_Up1, Talk_Passionately (10,3 s), Walk_Fight_Back, Walk_Fight_Forward, restpose |
| `dilma/model.glb` | Running, Walking, **01a0fff6** (dilma_guarda), **01a0fff7** (dilma_vento), restpose |
| `haddad/model.glb` | Running, Walking, **01a0fff8** (haddad_guarda), **01a0fff9** (haddad_carimbo), restpose |
| `capitao-brasa`, `dino-supremo`, `nikolas`, `flavio`, `vorcaro`, `duval`, `erika` /model.glb | só Running e Walking (padrão do Meshy: o MESMO movimento em todos) |
| `boulos`, `renan` | sem GLB (placeholder) |

`01a0ef76` e `01a0ef77` existiam na biblioteca do Xandor e **não eram usados por ninguém** — agora são a guarda do Dino/Duval e do Brasa/Nikolas.

## 2. ANTES (05/10, main)
Dash = clip de walk acelerado (fallback) · backdash = walkBack · derrota = `Fall_Down` + `Dead` para todos.

| Lutador | idle | walk / walkBack | entrada (intro) | vitória | jump |
|---|---|---|---|---|---|
| Lulácio | efe2 lula_guarda2 | Walk_Fight_Forward / Back | Talk_Passionately | Chest_Pound_Taunt | Jump_with_Arms_Open |
| Xandor | ef75 guarda | Walking / Walking (ré) | ef75 guarda | victory | Regular_Jump |
| Capitão Brasa | **ef75 guarda** | Walking / ré | Chest_Pound_Taunt | Chest_Pound_Taunt | Regular_Jump |
| Dino Supremo | **efe2 lula_guarda2** | Walking / ré | Chest_Pound_Taunt | Chest_Pound_Taunt | Jump_with_Arms_Open |
| Nikolas | **ef75 guarda** | Walk_Fight F/B | Chest_Pound_Taunt | Chest_Pound_Taunt | Regular_Jump |
| Flávio | **efe2 lula_guarda2** | Walk_Fight F/B | Chest_Pound_Taunt | Chest_Pound_Taunt | Jump_with_Arms_Open |
| Vorcaro | **ef75 guarda** | Walk_Fight F/B | Talk_Passionately | Chest_Pound_Taunt | Regular_Jump |
| Duval | **ef75 guarda** | Walking / ré | ef75 guarda | victory | Regular_Jump |
| Erika | **ef75 guarda** | Walking / ré | Talk_Passionately | victory | Regular_Jump |
| Dilma | fff6 dilma_guarda | Walking / ré | Talk_Passionately | Chest_Pound_Taunt | Regular_Jump |
| Haddad | fff8 haddad_guarda | Walk_Fight F/B | fff8 guarda | victory | Regular_Jump |
| Boulos (placeholder) | (efe2) — boneco igual a todos | Walk_Fight F/B | Chest_Pound_Taunt | Chest_Pound_Taunt | Jump_with_Arms_Open |
| Renan (placeholder) | (ef75) — boneco igual a todos | Walking / ré | Talk_Passionately | victory | Regular_Jump |

**Repetições:** guarda ef75 × 7 · guarda efe2 × 4 · entrada Chest_Pound_Taunt × 5 e Talk_Passionately × 5 · vitória Chest_Pound_Taunt × 7 e victory × 5 · Walk_Fight × 6, Walking (idêntico em todos os GLBs) × 7 · jump: 2 clips para 13.
E todos os loops começavam no quadro 0 → mesmo clip = mesma dancinha **sincronizada**.

## 3. DEPOIS (visual.persona)
Camada procedural (só visual, idempotente, sem tocar em `src/fight/`): `src/visual/persona.js` + `GLBModel.applyPersona` + `PlaceholderModel.applyPersona`.
- **Fase própria dos loops** (`persona.phase` + 0,37 no lado P2): ninguém sincroniza com o rival, nem no espelho.
- **Ritmo do clip** (`persona.speed.idle/walk`): de 0,5× (banqueiro parado) a 1,45× (troll saltitante).
- **Guarda** (`persona.idle`): quique de boxeador, respiração (peito), balanço lateral, inclinação, altura da guarda, cotovelos, base (pernas), base baixa (agachamento parcial), cabeça (queixo erguido / aceno / olhar varrendo) e até um gesto fixo (mão na cintura, esfregar as mãos).
- **Andar** (`persona.walk`): inclinação, gingado de ombro, rebolado, quique por passo, base baixa.
- **Entrada e vitória** (`persona.intro` / `persona.victory`): gesto do meme (braços apontados por IK simples no espaço do personagem — funciona em qualquer rig Mixamo e no placeholder), prop na mão (celular, bengala, microfone, megafone, mandioca, maleta, Vade Mecum, pendrive) e **balão de fala** antes do "LUTEM!" (`intro.say`, `game.js → introSay`).

| Lutador | GUARDA (idle) | ANDAR | ENTRADA | VITÓRIA |
|---|---|---|---|---|
| Lulácio | lula_guarda2 0,8× · balanço pesado, barriga à frente, base aberta | Walk_Fight 0,9× · gingado de ombro | Talk_Passionately + **acena do palanque** · "Companheirada!" | Talk_Passionately + **braços em V** pulando |
| Xandor | guarda ef75 0,65× · parado, queixo erguido, quase sem respiração | Walking 0,85× · ereto, queixo alto | **aponta o dedo**, outra mão na toga · "Isso não vai ficar assim." | victory + **braços cruzados virado pra câmera** |
| Capitão Brasa | **ef77 saltitante** 1,2× · quique de quartel, tronco à frente | Walking 1,15× · marcha com quique | **continência** · "Talkei?" | ef77 + **arminha pro alto** (coice alternado) |
| Dino Supremo | **ef76 fechada** 0,55× · curvado, lento, base larga | Walking 0,75× · curvado, rebolando de velho | **apoiado na bengala** (prop) · "Aula de hoje: extinção." | Talk_Passionately + **ergue o Vade Mecum** |
| Nikolas | **ef77 saltitante** 1,45× · quique rápido, cabeça balançando, deboche | Walk_Fight 1,25× · quicando | **selfie** com celular + "V" · "Olha o engajamento!" | ef77 + **filmando o corte** com o celular no alto |
| Flávio | lula_guarda2 1,1× · base larga e baixa, cotovelos abertos | Walk_Fight 0,85× · gingado de brigão, base baixa | **pisão em câmera lenta** (Angry_Ground_Stomp 0,6×) · "Coisa de família." | Chest_Pound_Taunt (único que ficou com ele) |
| Vorcaro | guarda ef75 0,5× · **esfregando as mãos**, peito estufado | **Walking** (era Walk_Fight) 0,8× · passeio calmo | **mostra a maleta** (prop) + ajeita a gravata · "Tudo tem um preço." | victory + **braços abertos, gargalhada** |
| Duval | **ef76 fechada** 1× · base baixa (agachado), cabeça varrendo | Walking 1,15× · agachado, furtivo | **mão no ponto do ouvido**, olhando em volta · "Sem rastros." | victory + **ergue o pendrive** (prop) |
| Erika | guarda ef75 0,8× · **mão na cintura**, quadril gingando | Walking 1,05× · rebolado de passarela | **microfone** (prop) + outra mão gesticulando · "O plenário é meu." | victory + **pose de capa** (mão na cintura, braço erguido) |
| Dilma | dilma_guarda 0,9× · cabeça balançando ("dilmês") | Walking 0,85× · bamboleio | **saúda a mandioca** (prop erguido) · "Saudo a mandioca!" | **dilma_vento** (motion própria: estoca o vento) |
| Haddad | haddad_guarda 0,75× · reto e parado, cotovelos fechados | **Walking** (era Walk_Fight) 0,9× · reto de gabinete | **carimba no ar** (punho sobe e desce) · "Taxado!" | haddad_guarda + **explica com o dedo em riste** |
| Boulos (placeholder) | quique de ato, guarda alta, base aberta | quique + gingado | **megafone** (prop) + punho erguido · "Ocupa!" | **punho batendo no ar** |
| Renan (placeholder) | curvado pra frente, cabeça no ritmo, guarda alta | inclinado, quique | **aponta pro chat/câmera** · "Fala, chat!" | **coração com as mãos** |

Prova: `videos/v6/idle_sheet.jpg` (gerado por `node tools/persona_sheet.mjs videos/v6/idle_sheet.jpg`, `RK_URL` do seu vite).

## 4. Como mexer
- Parâmetros em `visual.persona` do personagem (documentados no topo de `src/visual/persona.js`).
- Gesto novo: função em `GESTURES` (direções `A(fora, cima, frente)` do braço e antebraço; mão `N` = a mais perto da câmera).
  Movimento só "lê" se acontecer no plano da tela (cima/frente): a câmera vê os lutadores de perfil.
- Prop novo: entrada em `PROPS` (build, escala, eixo e alinhamento).

## 5. Pendências — o que ficaria muito melhor com motions próprias (Meshy Texto-para-Motion, ~10 créditos cada; NÃO gerados)
Prioridade (personagens só com Walking/Running padrão e guarda emprestada):
1. **Capitão Brasa** — `brasa_guarda`: "military boxer guard stance, bouncing lightly on toes, chin up, fists high, shifting weight like a drill sergeant". `brasa_continencia`: "stands at attention and gives a crisp military salute, holds it, then drops arm".
2. **Nikolas** — `nikolas_guarda`: "cocky teenage fighter, bouncy loose guard, head bobbing to music, taunting shoulder shrugs". `nikolas_selfie`: "raises phone with right hand for a selfie, tilts head, makes peace sign with left hand, poses twice".
3. **Dino Supremo** — `dino_guarda`: "old hunched professor in fighting stance, slow heavy breathing, wide stance, leaning forward". `dino_bengala`: "old man leaning on a walking cane with both hands, nods slowly, then taps cane on ground".
4. **Vorcaro** — `vorcaro_guarda`: "wealthy banker standing confidently, chest out, rubbing hands together greedily". `vorcaro_risada`: "throws arms wide open and laughs loudly, leaning back".
5. **Erika** — `erika_guarda`: "elegant confident stance, one hand on hip, weight shifted to one leg, swaying hips slightly". `erika_pose`: "fashion model victory pose, hand on hip, other arm raised gracefully, turns head to camera".
6. **Duval** — `duval_guarda`: "tactical agent low crouched stance, scanning left and right, hand near ear piece". `duval_ponto`: "touches earpiece with right hand, listens, looks around suspiciously".
7. **Flávio** — `flavio_guarda`: "heavy brawler wide low stance, elbows out, rolling shoulders". `flavio_pisao`: "lifts knee high and stomps the ground hard with both fists clenched".
8. **Xandor** — `xandor_dedo`: "stern judge points finger forward accusingly, other hand adjusts robe collar". `xandor_vitoria`: "crosses arms, raises chin, looks down disdainfully".
9. **Lulácio** — `lula_comicio`: "politician on a stage waving to the crowd with right hand, both arms up in V at the end".
10. **Boulos / Renan** — dependem do download dos GLBs do Meshy (já gerados e rigados: `boulos_guarda`, `boulos_megafone`, `renan_guarda`, `renan_live`). Ao baixar, pôr `idle: *_guarda` e manter a `persona` (ela soma por cima).
Andar: todos os GLBs têm o MESMO `Walking` do Meshy — um "walk" próprio por personagem (marcha do Brasa, passarela da Erika, velho arrastando o pé do Dino) seria o próximo maior ganho.
