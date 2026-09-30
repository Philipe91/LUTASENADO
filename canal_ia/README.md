# Canal Claude ⇄ GPT — República Kombat

Canal de conversa entre as duas IAs que trabalham no jogo. O usuário (Philipe) é quem decide; nós dois discutimos, chegamos a um acordo e só então executamos.

## Arquivos
| Arquivo | Quem escreve | Quem lê |
|---|---|---|
| `claude_para_gpt.md` | Claude | GPT |
| `gpt_para_claude.md` | GPT | Claude |
| `consenso.md` | quem fechar o acordo (o outro confirma) | os dois + usuário |
| `vigia.ps1` | — | roda do lado de cada um e avisa quando chega mensagem nova |

**Regra de ouro:** cada um só escreve no SEU arquivo (evita conflito de escrita). Só ACRESCENTE no fim — nunca apague mensagens antigas.

## Formato de cada mensagem
```
## [G-003] 2026-09-29 23:40 — PROPOSTA — Estilo de luta do Capitão Brasa
Texto curto e objetivo. Pode ter lista.
Responde a: [C-002]            (opcional)
```
- ID: `C-NNN` (Claude) ou `G-NNN` (GPT), sequencial.
- Tipos: `PROPOSTA` · `OBJEÇÃO` (discorda + alternativa) · `PERGUNTA` · `ACORDO` (aceita a proposta X) · `FEITO` (tarefa concluída, com arquivos/resultado) · `AVISO`.

## Como chegamos a um acordo
1. Um manda `PROPOSTA`.
2. O outro responde `ACORDO` ou `OBJEÇÃO` com alternativa concreta (sem objeção vaga).
3. Quando houver `ACORDO`, quem propôs registra a decisão em `consenso.md` (uma linha: data, decisão, quem executa).
4. Divergência depois de 2 rodadas → registrar as duas opções em `consenso.md` como `PENDENTE-USUÁRIO` e o usuário decide.

## Divisão de papéis (proposta inicial — pode ser discutida)
- **GPT:** arte de referência (imagens de personagem em A-pose com **punho fechado**, formas de ultimate, props), ideias de golpes/poderes/humor, textos, balanceamento de design.
- **Claude:** código do jogo (Vite + Three.js), Meshy (3D, rig, animações, movimentos de IA), integração, testes/vídeos de validação, commits.

## Contexto obrigatório (ler antes de propor)
- `CHATGPT_DESIGN.md` — decisões de design, pipeline 3D, **tabela de estilos de luta** (cada personagem com postura/golpes/poderes próprios — nunca só trocar a skin).
- `CONTINUAR_AQUI.md` — como rodar e o estado atual.
- Lições do pipeline 3D (não repetir): imagem em A-pose, só vista frontal, **mãos fechadas em punho** e longe do corpo (o esqueleto do Meshy não tem dedos), roupa longa atrapalha o rig.

## Vigia
- `powershell -ExecutionPolicy Bypass -File canal_ia\vigia.ps1 -Lado gpt` → o GPT fica sabendo quando o Claude escreve.
- `... -Lado claude` → o Claude fica sabendo quando o GPT escreve.
- Checa a cada 15 s, mostra só a parte nova e encerra (ou continua com `-Continuo`).
