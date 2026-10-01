# PROMPTS PRONTOS PARA O CHATGPT — República Kombat

> Para o chefe colar no ChatGPT (geração de imagem). Regras de ouro do `PIPELINE_VISUAL.md §2` já embutidas:
> corpo inteiro, A-pose, fundo branco, luz chapada, boca fechada, punhos fechados, sem props, nada fino e solto.
> **Nenhum prompt usa nome ou rosto de pessoa real.** São personagens fictícios e caricatos (ver `ARTE.md §7`).
> Gere 4–6 variações, escolha 1, salve em `references/<id>/ref_front.png` (+ `ref_back.png`, `ref_side.png`).

## Como pedir (cole antes de cada prompt, uma vez por conversa)
```
Você é o diretor visual de um jogo de luta 3D satírico chamado "República Kombat", estética de action figure
colecionável premium (vinil fosco, formas em bloco, cores saturadas). Os personagens são FICTÍCIOS e caricatos;
não reproduza o rosto de nenhuma pessoa real. Vou pedir imagens de referência para image-to-3D: siga à risca
pose, fundo e enquadramento descritos. Não escreva texto na imagem.
```

---

## A) Lutadores em A-pose (entrada do Meshy)

### Prefixo comum (mesmo em todos — é o que garante consistência entre os 4)
```
full body character reference, front view, A-pose, arms raised 45 degrees away from the body, legs slightly apart,
stylized 3D caricature collectible action figure, big head about one quarter of total height, exaggerated proportions,
premium matte vinyl toy look, clean blocky shapes, chunky simplified hands as closed fists, closed mouth,
strong but symmetric expression, bold saturated colors, plain pure white background, flat soft frontal studio lighting,
orthographic camera at chest height, no perspective, no floor shadow, no props, no text, centered, 4k
```
Negativo (se o gerador aceitar): `photorealistic, realistic skin, real person, celebrity, photo, open mouth, spread fingers, holding object, background, dramatic lighting, rim light, cropped, perspective, text, watermark`

### A1. CAPITÃO BRASA — "O Motociclista do Caos"
Paleta (ARTE.md): grafite `#2b2f36` · verde `#1fa34a` · amarelo `#ffd400` · pele `#f1c6a5` · cabelo `#6b5a4a`.
```
[PREFIXO COMUM] +
character: a tall, thin, rigid fictional politician-brawler nicknamed "Capitão Brasa". Long narrow face, square jaw,
stiff side-parted brown hair sculpted as one solid block, thick frowning eyebrows, intense squint, closed mouth pulled
into a stubborn grimace, prominent chin. Body straight and stiff like a plank, military posture, narrow shoulders,
long arms ending in closed fists. Outfit: dark charcoal suit (#2b2f36) with a wide diagonal green-and-yellow sash
across the chest (#1fa34a and #ffd400), green tie with thin yellow stripes, white shirt, black boots.
A small motorcycle helmet is molded onto the belt at the hip (part of the body, not held).
Caricature of an archetype, not of any real person.
```
Vistas extras (mesmo prompt, trocando a 1ª linha): `back view, A-pose` · `right side view, A-pose`.
Ultimate (modelo separado, sem rig humanoide):
```
[PREFIXO COMUM] + bipedal cartoon alligator wearing a torn dark charcoal suit, same stiff side-parted brown hair block
on top of the head, green-and-yellow sash, swamp-green skin (#2f7d4a), big toothy closed snout, thick tail,
collectible toy style, A-pose
```

### A2. DINO SUPREMO — "O Jurássico Togado"
Paleta: cinza `#55595f` · verde-musgo `#4f6b3a` · âmbar `#e3a233` · pele `#e6b58e` · cabelo `#b9b9b9`.
```
[PREFIXO COMUM] +
character: a short, very wide, heavy fictional judge-professor nicknamed "Dino Supremo". Wide face, double chin,
gray hair combed straight back as one solid block, thick black rectangular glasses sculpted as a solid piece,
bushy gray eyebrows, grumpy closed-mouth expression of an irritated teacher. Low center of gravity, barrel body,
short thick legs, big closed fists. Outfit: tight charcoal-gray suit (#55595f) with buttons straining,
moss-green tie (#4f6b3a) with a subtle dinosaur-footprint pattern, white shirt, small amber fossil-shaped lapel pin
(#e3a233), black shoes. Caricature of an archetype, not of any real person.
```
Vistas extras: `back view, A-pose` · `right side view, A-pose`.
Ultimate (modelo separado):
```
[PREFIXO COMUM] + cartoon T-rex wearing a torn gray suit and moss-green tie, thick black rectangular glasses,
comically tiny arms, burnt-amber skin (#b8651e), big head, closed mouth, collectible toy style
```

### Checklist antes de aceitar a imagem
- [ ] Braços afastados do corpo (A-pose), punhos fechados, boca fechada
- [ ] Fundo branco liso, sem sombra no chão, sem prop na mão
- [ ] Cabelo/gravata/faixa em bloco (nada fino e solto)
- [ ] Cabeça ≤ 1/4 da altura
- [ ] Não parece foto nem pessoa real → se parecer, pedir "more caricatured, more toy-like, less realistic"

---

## B) Backdrop pintado da arena de Brasília (Praça dos Três Poderes, pôr do sol)
Uso: `public/assets/arena/backdrop.jpg` (plano de fundo atrás do 3D, 4096×1536 ou 3:1). Céu do ARTE.md: `#2a1b5e → #b8457a → #ff7a3d → #ffc46b`.
```
wide panoramic matte painting, 3:1 aspect ratio, stylized video game fighting arena backdrop, a fictional modernist
capital plaza at sunset inspired by Brazilian modernist architecture: in the center two tall slim white twin towers
side by side, flanked by a white bowl-shaped dome opening upward on the left and a white dome closing downward on the
right, all sitting on a long low white slab; wide reflecting pool in front with soft orange highlights; vast flat
lawn; flat clean horizon. Sky is a smooth vertical gradient from deep purple (#2a1b5e) at top through magenta
(#b8457a) and orange (#ff7a3d) to pale gold (#ffc46b) near the horizon, with a few blocky stylized clouds.
Warm sunset key light from the upper left, long soft shadows. Painterly, clean, saturated, toy-diorama feel,
simplified shapes, no people, no cars, no flags, no logos, no text, no signs, no real monuments or statues.
The bottom 20% must be an empty plain floor area for the fighters. Horizon line at 45% of the image height.
```
Variações úteis: `night version, stadium lights, purple sky` (ultimate do Xandor) · `same scene, 9:16 vertical crop centered on the towers` (retrato).
Negativo: `real photo, real landmark, people, crowd, text, flags, logos, lens flare, fisheye`.

---

## C) Retratos de seleção dos 4 (cards e HUD)
Uso: `public/assets/characters/<id>/portrait.png` — a UI troca sozinha a inicial pela imagem quando o arquivo existe
(`src/ui/portraits.js`). Formato quadrado 1024×1024, rosto e ombros, olhando para a câmera, fundo na cor principal.

### Prefixo comum
```
character portrait for a fighting game select screen, square 1:1, head and shoulders, three-quarter view facing the
camera, confident intense expression, closed mouth, stylized 3D caricature collectible action figure, premium matte
vinyl toy look, bold saturated colors, thick clean shapes, strong rim light on the shoulder and top of the head,
dramatic single-color studio background with a subtle diagonal stripe, no text, no logos, no props, 4k
```

- **LULÁCIO** (`lulacio`) — fundo azul-marinho `#1d3a8a`, listra vermelha `#d62828`:
  `older chubby fictional brawler nicknamed "Lulácio", round face, big fluffy white full beard, short white hair, thick eyebrows, warm sly closed-lip smile, navy blue suit jacket, white shirt, crooked red tie, light straw hat, shoulders squared like a boxer`
- **CAPITÃO BRASA** (`capitao-brasa`) — fundo grafite `#2b2f36`, listra verde `#1fa34a` e amarela `#ffd400`:
  `tall thin rigid fictional brawler nicknamed "Capitão Brasa", long narrow face, square jaw, stiff side-parted brown hair block, frowning eyebrows, stubborn grimace, charcoal suit, green-and-yellow diagonal sash, green tie`
- **XANDOR** (`xandor`) — fundo preto `#121212`, listra dourada `#d4af37`:
  `tall broad-shouldered fictional magistrate nicknamed "Xandor", completely bald shiny egg-shaped head, thick black V-shaped eyebrows, stern intimidating stare, strong jaw, black judge robe over black suit, white collar, gold cufflinks, faint golden glow behind the head`
- **DINO SUPREMO** (`dino-supremo`) — fundo cinza `#55595f`, listra verde-musgo `#4f6b3a`:
  `short very wide fictional judge-professor nicknamed "Dino Supremo", gray hair combed back, thick black rectangular glasses, wide face, double chin, bushy eyebrows, irritated-teacher expression, tight charcoal suit, moss-green tie, amber fossil lapel pin`

Fechar sempre com: `Caricature of an archetype, not of any real person.`

### Depois de gerar
1. Recortar em 1024×1024 com o rosto no terço superior (o card corta o rodapé).
2. Salvar como `portrait.png` na pasta do personagem; otimizar (< 300 KB): `npx sharp-cli -i portrait.png -o portrait.png resize 512 512` ou qualquer compressor.
3. Abrir a seleção: os cards e o HUD passam a mostrar o retrato automaticamente.
