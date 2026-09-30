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
| Xandor ✅ | v3 A-pose do ChatGPT (ref_v3_apose.png), só frontal | Meshy 7.1 Ultra 2K → Remesh 30K → Rig **v5** → 20 anims | model.glb (2,1 MB) | 29.877 | ✅ aprovado pelo usuário | Rig: joelho logo ABAIXO da barra da toga, tornozelo EM CIMA do sapato, queixo NO queixo (não no nó da gravata). Medir ossos com tools antes de integrar (joelho/pé esquerdo × direito simétricos). Toga presa ao quadril no jogo (`robeFix`). Andar = Walking original do Meshy (ré = mesmo clip invertido). Idle = movimento de IA "guarda". |
| Lulácio | ChatGPT: mesma imagem com PUNHOS FECHADOS em A-pose (`references/lulacio/ref_punhos_apose.png`) | Meshy 7.1 Ultra 2K → Remesh 30K → Rig (queixo/pulso/virilha/tornozelo ajustados) → 19 anims + 2 IA | model.glb (2,15 MB) | 30.786 | ⏳ no jogo, AGUARDANDO VALIDAÇÃO DO USUÁRIO | Esqueleto do Meshy NÃO tem ossos de dedo → mão fica como modelada: gerar SEMPRE com punho fechado. Limite de download: 20 animações (21 desativa o botão). Não trocar de aba durante Texto para Motion (perde o movimento e cobra). |
| Capitão Brasa | aguardando | Meshy | — | — | ⏳ | — |
| Dino Supremo | aguardando | Meshy | — | — | ⏳ | — |

---
## Estilos de luta (regra: cada personagem tem postura, golpes e poderes PRÓPRIOS — nunca só trocar a skin)
| | Lulácio | Xandor | Capitão Brasa | Dino Supremo |
|---|---|---|---|---|
| Estilo | brigão de palanque, pesado, curto alcance | magistrado frio, preciso, controle à distância | (a definir) | (a definir) |
| Parado | IA `lula_guarda2` (base larga, punhos no peito, cotovelos abertos) | IA `guarda` (boxe) | | |
| Andar | "Andar Lutando" frente/ré | Walking original | | |
| Socos | gancho esq., uppercut dir., martelada | jab esq., jab dir., soco duplo | | |
| Chute / baixo | chute espartano / pisada furiosa | chute simples / chute varrido | | |
| Especiais | discurso ("Fale com paixão"), IA `lula_picanha` (arremesso), agarrão ("Agarrar e derrubar") | IA: intimação, bloqueado, canetada | | |
| Vitória | bate no peito | victory | | |

## Log
- **29/09 (23h)** — Lulácio v2 com estilo próprio (brigão de palanque) e punhos fechados. Checkpoint `checkpoint-lulacio-xandor` no GitHub.
- **29/09 (22h)** — Xandor aprovado: pernas quebradas = joelho do rig 19 cm à frente (marcador em cima da toga); gravata dobrando = queixo no nó; pé virado = tornozelo esquerdo no calcanhar. Rig refeito 2× até os ossos ficarem simétricos (rig é grátis). Commit + push no GitHub. Iniciado Lulácio (imagem LULA.png do usuário).
- **29/09** — Picanha do Povo e Patriota no Para-brisa criados. Arquivo criado.
- **29/09 (noite, casa)** — Usuário rejeitou o v2 (rosto deformado) e escolheu o **v1** (só frontal, rosto fiel). v1 → remesh 30K (30.113 tris, grátis) → rig (pulsos no início da mão, virilha ajustada) → 15 animações → baixado no PC de casa (Chrome de casa conectado) → otimizado 19,8 MB → 1,67 MB → `public/assets/characters/xandor/model.glb`. Dedos colados na coxa corrigidos no jogo com `visual.rigidBones` (skinFix.js). Clips mapeados em xandor.js. Validado com ?animtest=1 (videos/validacao_xandor.mp4). O preview do Meshy segue mostrando a mão esticada — a correção é só no jogo.
- **29/09 (noite)** — Meshy Pro assinado. Xandor v2: Multi-View (frente+costas+perfil direito) + A-Pose + licença privada (35 créditos) → remesh 30K (28.713 faces, grátis) → rig (virilha ajustada) → **mão corrigida** (A-Pose separou braço da toga). 15 animações adicionadas (grátis): Andando, Correndo, Pose de soco, Jab Esq, Jab Dir, Soco c/ ambas as mãos, Chute Simples, Chute varrido, Bloco1, Reação ao ser atingido, Ser Atingido Voe p/ Cima, Morto, Levante-se 1, Pular c/ braços, Vitória. Saldo 1.115. **Download não dispara via automação** (Chrome não registra) → aguardando o usuário clicar Baixar (GLB, Mixamo, rigged, todas, arquivo único).
- **29/09** — Usuário decidiu seguir com a v1 realista (assume a responsabilidade). Xandor gerado, remalhado (10k) e rigado no Meshy (conta grátis, 100 créditos, nenhum gasto até aqui). **Bloqueio: download de modelo e animações de luta exigem Meshy Pro.** Aguardando decisão do usuário.
- **29/09** — Referência Xandor v1 recebida (turnaround 4 vistas) e **pausada**: fotorrealista, rosto muito fiel a pessoa real. Pedida v2 caricata/action figure. Salva em references/xandor/ como reprovada.
- **29/09** — Pipeline 3D preparado (pastas references/, manifesto de animações, inspetor de GLB, roteiro ?animtest=1). Aguardando referência do Xandor.
