# PIPELINE VISUAL DOS PERSONAGENS — REPÚBLICA KOMBAT

**Decisão oficial:**
- **Personagens principais = modelos 3D externos importados (GLB).**
- **Geometria procedural = só placeholder de combate, fallback, props, VFX e forma provisória de ultimate.**

Estética: **caricatura 3D premium / action figure / boneco colecionável.** Nada de fotorealismo, nada de rosto fiel, nada de deepfake.

---

## 0. RUNBOOK — da referência do ChatGPT ao personagem no jogo (Claude executa, 1 personagem por vez)
Papéis: **ChatGPT = diretor visual** (cria a referência). **Claude** = referência → 3D → rig → GLB → integração → teste.

1. **Salvar a referência** em `references/<id>/ref_front.png` (+ side/back/34 se vierem). É a referência oficial: não redesenhar.
2. **Meshy → Image to 3D** (navegador, conta do usuário). Multi-view se houver vistas extras. Estilo fiel à imagem, textura PBR, alvo ≤30k tris.
   Login/2FA/CAPTCHA/senha → **parar e pedir ao usuário.** Nenhuma credencial vai para arquivo.
3. Gerar, escolher a versão mais fiel (rosto, silhueta, roupa, cores). Se pesado → **Remesh** (~20–30k).
4. **Auto-Rig** (humanoide, frente em +Z, altura ~1.8 m). Falhou → Remesh → regenerar pela frontal/turnaround. Sem horas de correção manual.
5. **Exportar GLB** → `references/<id>/meshy/` (bruto).
6. **Otimizar** → `public/assets/characters/<id>/model.glb`:
   `npx gltf-transform optimize bruto.glb public/assets/characters/<id>/model.glb --compress draco --texture-compress webp --texture-size 2048 --simplify false`
7. **Inspecionar:** `node tools/inspect_glb.mjs public/assets/characters/<id>/model.glb` (tris, texturas, ossos essenciais, orientação).
8. **Animações (só no 1º personagem, o Xandor):** na Animation Library do Meshy, baixar como GLB (armature-only) cada chave e salvar em `public/assets/animations/lib/<chave>.glb`; registrar no `manifest.json`. Os outros 3 reaproveitam pelo retarget (esqueleto Mixamo-compatível).
   Chaves: idle, walk, walkBack, jump, crouch, punch1, punch2, punch3, kick, sweep, block, hit, knockdown, getup, ko, victory, special, intro.
9. **Testar no jogo:** `?p1=<id>&p2=dino-supremo&animtest=1` → gravar `node tools/record.mjs "p1=<id>&p2=dino-supremo&animtest=1" 19 videos/validacao_<id>.mp4` e conferir: escala, pé no chão, direção, mãos, idle, andar, soco, chute, defesa, pulo, hit, queda, KO.
10. Ajustes só no `visual` do CharacterData (`yaw`, `height`, `clips`, `boneAliases`) — **nunca no combate.**
11. Registrar em `CHATGPT_DESIGN.md` (tabela PIPELINE 3D + Log) e **mostrar o resultado ao usuário antes do próximo personagem.**

---

## 1. Como o código recebe os modelos (já implementado no Dia 1)

```
Fighter (lógica)  ──animKey/estado──▶  FighterView (slot)  ──▶  PlaceholderModel  (imediato)
   ▲                                                       └──▶  GLBModel          (troca sozinho quando o .glb existir)
CharacterData.visual                                       └──▶  forma de ultimate (GLB próprio ou stand-in)
```

- O combate (`src/fight/`) **nunca** importa Three.js. Roda até em Node (`npm run sim`).
- O visual só lê `x, y, facing, state, animKey, animLen, animSeq, flash`.
- **Trocar o modelo = soltar o arquivo na pasta certa.** Não tem código pra mexer.
- Se o arquivo não existir, o placeholder continua. Nada quebra.
- Teste com um GLB real: `http://localhost:5199/?p1=capitao-brasa&p2=lulacio&mode=demo&glbtest=1`

### Onde soltar cada arquivo
```
public/assets/characters/<id>/model.glb      ← personagem rigado (obrigatório)
public/assets/characters/<id>/ultimate.glb   ← forma transformada (polvo, jacaré, avatar, T-Rex)
public/assets/animations/shared.glb          ← pacote de animações compartilhado (opcional, ver seção 6)
art/<id>/                                    ← concepts 2D, prompts, versões (NÃO vai pro build)
```
IDs: `lulacio`, `capitao-brasa`, `xandor`, `dino-supremo`.

### O que o loader faz sozinho
- Normaliza a altura para `visual.height` e coloca o pé em y=0.
- Centraliza e aplica `visual.yaw` (se o modelo vier virado, ajuste só esse número: `0`, `Math.PI`, `±Math.PI/2`).
- Clona materiais por instância (espelho Lulácio × Lulácio pisca só quem apanhou).
- **Retarget por nome de osso** (`mixamorig:Hips`, `Hips`, `hips`… viram a mesma coisa) — animação de um personagem toca em outro.
- Descarta posição de todos os ossos exceto o quadril → **proporções diferentes (barriga do Lulácio, cabeção) não quebram a animação.**
- Procura o clip pelo nome (`idle`, `walk`, `punch1`, `kick`, `hit`…). Se faltar, cai na cadeia de fallback (`punch3 → punch2 → punch1 → idle`). **Um modelo com só 6 animações já é jogável.**
- Nomes estranhos? Mapeie no CharacterData: `visual.clips: { punch1: 'Boxing_Jab_01' }`.
- Esqueleto com nomes diferentes? `visual.boneAliases: { hips: 'pelvis', ... }`.

---

## 2. Concept art 2D (entrada do image-to-3D)

### Regras de ouro da imagem (o que mais evita erro de geração)
1. **Corpo inteiro, de frente, em A-pose** (braços abertos ~45°, pernas levemente afastadas). Nunca braço colado no corpo.
2. **Fundo branco liso**, sem cenário, sem sombra no chão.
3. **Luz chapada, frontal e suave.** Nada de contraluz ou sombra dura (vira textura "queimada").
4. **Câmera ortográfica / sem perspectiva**, à altura do peito.
5. **Boca fechada, expressão forte, mas simétrica.** (Boca aberta gera buraco estranho.)
6. **Sem props na mão.** Microfone, caneta, celular, livro = **modelos separados** (viram props presos no osso da mão depois).
7. **Nada fino e solto:** cabelo em mechas, gravata voando, franjas, dedos abertos. Tudo "em bloco", como action figure.
8. **Mãos em punho fechado ou mão aberta simples** — dedos separados são o erro nº 1 do image-to-3D.
9. **Cabeção, mas com limite:** cabeça até ~1/4 da altura. Mais que isso quebra o auto-rig.
10. Gere também **vista de costas e de lado** (mesmo prompt + "back view" / "side view") — a maioria das ferramentas aceita multi-view e o resultado melhora muito.

### Prompt-base (mesmo prefixo nos 4 = consistência)
```
full body character turnaround, front view, A-pose, arms slightly away from body,
stylized 3D caricature collectible action figure, big head, exaggerated proportions,
premium vinyl toy look, clean shapes, smooth matte materials, bold saturated colors,
closed mouth, fists closed, plain white background, flat soft studio lighting,
orthographic, no shadow on the floor, no props in hands, centered, 4k
```
Negativo: `photorealistic, realistic skin, real person, photo, open mouth, fingers spread, props, background, dramatic lighting, cropped, perspective distortion`

### Descrição de cada um (acrescentar ao prompt-base — descreva traços, não o nome real)
- **LULÁCIO:** `older chubby man, round face, big fluffy white full beard, short white hair, thick eyebrows, warm smile with closed lips, navy blue suit jacket open, white shirt, crooked red tie, rolled sleeves, round belly, short thick arms`
- **CAPITÃO BRASA:** `tall thin rigid man, long narrow face, square jaw, stiff side-parted brown hair, frowning eyebrows, dark charcoal suit, green and yellow diagonal sash across chest, green-yellow tie, military posture, motorcycle helmet hanging on belt`
- **XANDOR:** `tall broad-shouldered man, completely bald shiny egg-shaped head, thick black V-shaped eyebrows, stern intimidating stare, strong jaw, black judge robe over black suit, white collar, gold cufflinks, inverted triangle silhouette`
- **DINO SUPREMO:** `short very wide heavy man, gray hair combed back, thick black rectangular glasses, wide face, double chin, bushy eyebrows, tight charcoal gray suit with buttons about to pop, moss-green tie with dinosaur footprint pattern, fossil lapel pin`

### Ultimates (modelos separados, NÃO precisam de rig humanoide)
- **Polvão do Povo:** `giant cartoon octopus, purple-blue, big fluffy white beard, red necktie, one tentacle holding a microphone, collectible toy style`
- **Jacaré Efeito Colateral:** `bipedal cartoon alligator in torn dark suit, stiff side-parted hair on top of head, green-yellow sash, holding a smartphone, collectible toy style, A-pose`
- **Avatar da Constituição:** `divine judge entity, bald, glowing red eyes, white and gold ornate robe-armor, floating, golden halo seal behind, collectible toy style`
- **T-Rex de Terno:** `cartoon T-rex wearing torn gray suit, moss-green tie, thick black rectangular glasses, tiny arms, collectible toy style`

### Onde gerar
- Qualquer gerador de imagem (ChatGPT/DALL·E, Midjourney, Ideogram, Leonardo) **ou o SDXL local** que já temos no pipeline do ViralReplicator.
- Alguns serviços bloqueiam nome de pessoa real → **por isso os prompts descrevem traços, não nomes.** Isso também mantém o resultado caricato e não fotográfico.
- Gere 6–8 variações por personagem, escolha 1. Salve em `art/<id>/concept_front.png` (+ back/side).

---

## 3. Image-to-3D (Meshy ou equivalente)

**Caminho A — tudo no Meshy (recomendado, não precisa de Blender):**
1. Meshy → *Image to 3D* → sobe a vista frontal (e as outras, se usar multi-view).
2. Configurações: **estilo "cartoon/stylized"** se houver, **quad/triângulos ~20–30k**, **PBR ligado**, textura 2K.
3. Gere 2–4 tentativas, escolha a com rosto mais limpo e silhueta mais forte.
4. **Remesh/Retopo** para ~20k tris se vier pesado.
5. **Animate / Auto-rig** → marca humanoide, confere os pontos (queixo, pulsos, cotovelos, joelhos, virilha).
6. Na biblioteca de animações do Meshy, adicione (com esses nomes, ou mapeie depois em `visual.clips`):
   `idle, walk, walkBack, jump, crouch, punch1, punch2, punch3, kick, sweep, block, hit, knockdown, getup, victory, special, intro`
   Mínimo para ficar jogável: **idle, walk, punch1, kick, hit, knockdown.** O resto cai no fallback.
7. Exporta **GLB** (com esqueleto e animações) → salva como `public/assets/characters/<id>/model.glb`.

**Caminho B — Meshy + Mixamo (mais animações de luta, precisa de Blender):**
1. Exporta do Meshy em **FBX** sem rig, em A/T-pose.
2. Sobe no **Mixamo** → auto-rig → baixa o personagem (FBX, *with skin*).
3. Baixa as animações de luta do Mixamo **uma vez só**, usando UM personagem, *without skin*, *in place* — cada arquivo com o nome da chave (`punch1.fbx`, `kick.fbx`…) em `public/assets/animations/fbx/`.
4. `blender -b -P tools/build_shared_anims.py` → gera `public/assets/animations/shared.glb` (serve para os 4).
5. `blender -b -P tools/fbx_to_glb.py -- entrada.fbx public/assets/characters/<id>/model.glb` para cada personagem.
Como os 4 têm o mesmo esqueleto Mixamo, **uma animação serve para todos** (o retarget cuida das proporções).

### Checklist de aceitação de um modelo (antes de soltar na pasta)
- [ ] < 5 MB por GLB (texturas 2K no máximo; use `npx @gltf-transform/cli optimize in.glb out.glb --texture-compress webp`)
- [ ] ≤ 30k triângulos
- [ ] esqueleto humanoide, com hips/spine/head/braços/pernas
- [ ] rosto legível a 3 metros de distância (teste: print pequeno do jogo)
- [ ] silhueta reconhecível **em preto chapado**
- [ ] nada de prop "colado" na mão (props vêm separados)
- [ ] roda `?p1=<id>&mode=demo` e o personagem aparece em pé, virado pro oponente

---

## 4. Consistência visual entre os 4
- **Mesmo prompt-base, mesma luz, mesmo fundo, mesma pose** para todos.
- **Mesma ferramenta e mesmas configurações** no Meshy (estilo, polycount, textura).
- Paleta fixa por personagem (a mesma do placeholder, em `visual.placeholder`): Lulácio azul/branco/vermelho · Brasa grafite/verde/amarelo · Xandor preto/branco/dourado · Dino cinza/musgo/âmbar.
- **Altura final quem manda é o código** (`visual.height`), não o modelo — eles sempre saem na escala certa entre si.
- Mesma iluminação no jogo para todos (o material vem do GLB; se algum vier muito brilhante/escuro, ajuste no Meshy antes, não no código).
- Faça os 4 no mesmo dia, na mesma sessão. Consistência morre quando um é feito 2 dias depois.

---

## 5. Placeholders enquanto os modelos não chegam
- Já funcionam: bonecos de primitivas com a paleta e o traço-chave de cada um (barba, careca, óculos, topete).
- **Não investir tempo neles.** Servem pra balancear combate, testar hitbox e gravar vídeo de teste.
- `?placeholder=1` força placeholder mesmo com GLB presente (útil pra comparar).
- Ultimate sem GLB próprio = stand-in (modelo base cresce + pisca na cor da transformação). Quando `ultimate.glb` existir, ele entra sozinho.

---

## 6. Divisão de trabalho
| Quem | O quê |
|---|---|
| **Você** | gerar concepts (seção 2), rodar Meshy (seção 3), soltar os GLBs nas pastas |
| **Claude** | código de combate, integração, retarget, props nos ossos, VFX, câmera, ultimates, UI, deploy |

Assim que o primeiro `model.glb` cair na pasta, eu ajusto `yaw`, `height`, mapeamento de clips e pendurar props (microfone, caneta, celular, livro) nos ossos da mão.
