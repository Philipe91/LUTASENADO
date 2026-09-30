# CONTINUAR AQUI — República Kombat

> **REGRA:** antes de mexer em personagens, golpes, VFX ou balanceamento, ler `CHATGPT_DESIGN.md` (tem prioridade sobre o GDD). Nova decisão → atualizar a seção do personagem lá + 1 linha no Log.

## Rodar
```
cd D:\projetos\GAMELUTA
npm run dev          → http://localhost:5199 (ou a porta que o Vite mostrar; --host já expõe na rede local)
npm run sim          → 120 partidas CPU x CPU sem navegador (balanceamento)
node tests/specials.mjs [id] [dir]  → duração/hits/dano de cada especial contra boneco parado
node tools/record.mjs "<query>" <seg> videos/x.mp4 [w] [h] [fps]  → grava MP4 quadro a quadro (dev server ligado; ex. query "p1=lulacio&p2=xandor&cast=forward&ff=95"). Vertical: w=720 h=1280
npm run build        → dist/ pronto pra Vercel/Netlify/itch.io
```
URLs úteis: `&cast=neutral|forward|down` (P1 solta o especial em loop, P2 parado) · `&stats=1` custo de render/pool · `?p1=lulacio&p2=xandor&mode=cpu|2p|demo` · `&debug=1` hitboxes · `&meter=1` barra cheia · `&ff=600` adianta frames · `&glbtest=1` GLB de teste no P1 · `&placeholder=1` força placeholder
Teclas: F1 hitboxes · F2 liga/desliga CPU no P1 · ESC menu

## Status
- **Dia 1 FEITO (29/09):** movimentação, pulo, agachar, defesa alta/baixa, soco x3 encadeado, chute, rasteira, aéreos, arremesso, hitstop, shake, hitboxes, vida, barra de ultimate, 12 especiais por dados, 4 passivas, ultimate (stand-in), rounds PRIMEIRO/SEGUNDO/TERCEIRO TURNO, KO com câmera lenta, timer, IA com perfil por personagem, HUD, seleção, resultado/revanche, arena Brasília blockout.
- **29/09 (tarde):** Picanha do Povo (Lulácio →) e Patriota no Para-brisa (Brasa ↓) implementados; visuais de Hitter com object pooling em `visual/projectiles.js`; ganchos de GLB de prop em `assets/props/` (picanha.glb, apoiador.glb, caminhao.glb).
- **Pipeline GLB pronto e testado** com modelo rigado real (Soldier.glb). Falta só os modelos definitivos.

## Pipeline 3D (preparado 29/09, aguardando referência do XANDOR)
- Runbook passo a passo: **PIPELINE_VISUAL.md §0**. Referências em `references/<id>/`. Registro em `CHATGPT_DESIGN.md` (tabela PIPELINE 3D).
- Ferramentas: `node tools/inspect_glb.mjs <glb>` · `npx gltf-transform optimize ...` · `?animtest=1` (roteiro de validação) · `?glbtest=<arquivo em assets/test>&yaw=` · manifesto de animações `public/assets/animations/manifest.json`.
- Ordem: Xandor → Lulácio → Capitão Brasa → Dino. Um por vez, mostrar ao usuário antes de seguir. Não gerar ultimate.glb sem pedido.

## Próximo (Dia 2)
1. **Você:** concepts + Meshy → `public/assets/characters/<id>/model.glb` (ver PIPELINE_VISUAL.md)
2. Integrar cada GLB assim que chegar (yaw, altura, clips, props na mão)
3. VFX próprios dos 12 especiais (moto, multidão, carimbo, caneta, livro, onda)
4. Deploy de teste + testar no celular
5. Som (ZzFX + locutor TTS genérico)

## Arquitetura em 1 minuto
- `src/fight/` lógica pura (sem Three.js) · `src/data/characters/` CharacterData (1 arquivo por lutador + registro em index.js)
- `src/visual/FighterView.js` slot visual (placeholder → GLB → ultimate) · `visual/animKeys.js` contrato de animação
- Docs: GDD.md (design) · PIPELINE_VISUAL.md (modelos)
