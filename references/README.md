# Referências oficiais (ChatGPT = diretor visual)

Cada imagem enviada pelo ChatGPT é a **referência visual oficial** do personagem. Não redesenhar.

```
references/<id>/
  ref_front.png        ← vista frontal (entrada principal do Image to 3D)
  ref_side.png         ← perfil      (multi-view, se houver)
  ref_back.png         ← costas      (multi-view, se houver)
  ref_34.png           ← 3/4         (multi-view, se houver)
  ref_turnaround.png   ← folha com várias vistas (se vier assim, recortar as vistas)
  meshy/               ← GLB/FBX baixados do Meshy (brutos, antes de otimizar)
  NOTAS.md             ← versão escolhida, tentativas, problemas
```
IDs: `xandor`, `lulacio`, `capitao-brasa`, `dino-supremo`.
Ordem: **Xandor (teste do pipeline) → Lulácio → Capitão Brasa → Dino Supremo**, um por vez, com validação entre cada um.
