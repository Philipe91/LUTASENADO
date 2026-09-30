# CHATGPT DESIGN UPDATES

> Canal de decisões de design. **Ler antes de mexer em personagens, golpes, VFX ou balanceamento.**
> O que está aqui tem prioridade sobre versões antigas do GDD.md. Manter curto: atualizar a seção do personagem ou acrescentar no fim.
> Regra geral dos especiais: **ENTRA → IMPACTA → SOME.** Curtos (≈1–1,8s), legíveis, sem cutscene, sem objetos permanentes (pool/reciclagem), multidões com sprites/silhuetas.

## LULÁCIO
- **Picanha do Povo** (→ + Especial) — *substitui "Companheirada"*. Arremessa uma picanha; ao acertar/chegar perto/cair, surge uma onda de apoiadores fictícios vermelhos (silhuetas) que avança em bloco: multi-hit, knockback no último hit, some rápido. Cooldown médio. `[implementado 29/09]`
- Discurso Interminável (neutro) e Abraço do Palanque (↓) mantidos.
- **Ultimate: O Polvão do Povo** — polvo gigante com barba/gravata/microfone; tentáculos atacam.

## CAPITÃO BRASA
- **Rajada** (neutro, "Talkei Rajada" / ataque de dedo) — mantido.
- **Motociata** (→) — mantido.
- **Patriota no Para-brisa** (↓ + Especial) — *substitui "Live Surpresa"*. Grito curto → caminhão low-poly atravessa a arena com um apoiador fictício pendurado no para-brisa. 1 hit forte, knockback grande, startup perceptível, cooldown alto. `[implementado 29/09]`
- **Ultimate: Efeito Colateral** — seringa entra, vira jacaré/híbrido mantendo terno/cabelo; finalizador forte e curto.

## XANDOR
- Intimação, **Bloqueado**, **Canetada** — mantidos.
- **Ultimate: Avatar da Constituição** — entidade divina/judicial: olhos brilhando, aura, selo/círculo atrás, livros/canetas flutuando, toga celestial; termina em martelo colossal / carimbo / canetada divina. Sem `ultimate.glb`: scale + emissive + partículas + luz + overlays.

## DINO SUPREMO
- **Rugido**, **Meteoro**, golpes pesados/tank — mantidos (Pisão Cretáceo também).
- **Ultimate: T-Rex de Terno** — T-Rex/híbrido com óculos/gravata; gag dos bracinhos que não alcançam os óculos; finalizador pesado e curto.

---
## PIPELINE 3D DOS PERSONAGENS
**Papéis:** ChatGPT cria a referência (concept) → Claude faz Meshy Image-to-3D → Remesh → Auto-Rig → GLB → integra e testa.
**Ordem:** Xandor (teste do pipeline) → Lulácio → Capitão Brasa → Dino Supremo. Um por vez, com validação entre cada um. Transformações (`ultimate.glb`) só quando pedido.

| Personagem | Referência | Ferramenta | Arquivo | Tris | Status | Problemas / ajustes |
|---|---|---|---|---|---|---|
| Xandor ✅ | v1 turnaround — **modelo v1 em uso** (model.glb 1,67 MB, 30k tris, 15 anims) | Meshy 7.1 Image-to-3D (só frontal; multi-view é Pro) → Remesh 10K (30K é Pro) → Auto-Rig humanoide | (no Meshy, ainda não baixado) | 10.049 | ⏸ download bloqueado (Pro) | Geração 561k faces → remesh 10k obrigatório (rig ≤300k). Virilha ajustada à mão no rig (toga escondia). Artefato: mãos/punhos esticam na corrida. Animações de luta da biblioteca quase todas Pro. Download = Pro. Licença grátis = CC BY 4.0 (público). |
| Lulácio | aguardando | Meshy | — | — | ⏳ | — |
| Capitão Brasa | aguardando | Meshy | — | — | ⏳ | — |
| Dino Supremo | aguardando | Meshy | — | — | ⏳ | — |

---
## Log
- **29/09** — Picanha do Povo e Patriota no Para-brisa criados. Arquivo criado.
- **29/09 (noite, casa)** — Usuário rejeitou o v2 (rosto deformado) e escolheu o **v1** (só frontal, rosto fiel). v1 → remesh 30K (30.113 tris, grátis) → rig (pulsos no início da mão, virilha ajustada) → 15 animações → baixado no PC de casa (Chrome de casa conectado) → otimizado 19,8 MB → 1,67 MB → `public/assets/characters/xandor/model.glb`. Dedos colados na coxa corrigidos no jogo com `visual.rigidBones` (skinFix.js). Clips mapeados em xandor.js. Validado com ?animtest=1 (videos/validacao_xandor.mp4). O preview do Meshy segue mostrando a mão esticada — a correção é só no jogo.
- **29/09 (noite)** — Meshy Pro assinado. Xandor v2: Multi-View (frente+costas+perfil direito) + A-Pose + licença privada (35 créditos) → remesh 30K (28.713 faces, grátis) → rig (virilha ajustada) → **mão corrigida** (A-Pose separou braço da toga). 15 animações adicionadas (grátis): Andando, Correndo, Pose de soco, Jab Esq, Jab Dir, Soco c/ ambas as mãos, Chute Simples, Chute varrido, Bloco1, Reação ao ser atingido, Ser Atingido Voe p/ Cima, Morto, Levante-se 1, Pular c/ braços, Vitória. Saldo 1.115. **Download não dispara via automação** (Chrome não registra) → aguardando o usuário clicar Baixar (GLB, Mixamo, rigged, todas, arquivo único).
- **29/09** — Usuário decidiu seguir com a v1 realista (assume a responsabilidade). Xandor gerado, remalhado (10k) e rigado no Meshy (conta grátis, 100 créditos, nenhum gasto até aqui). **Bloqueio: download de modelo e animações de luta exigem Meshy Pro.** Aguardando decisão do usuário.
- **29/09** — Referência Xandor v1 recebida (turnaround 4 vistas) e **pausada**: fotorrealista, rosto muito fiel a pessoa real. Pedida v2 caricata/action figure. Salva em references/xandor/ como reprovada.
- **29/09** — Pipeline 3D preparado (pastas references/, manifesto de animações, inspetor de GLB, roteiro ?animtest=1). Aguardando referência do Xandor.
