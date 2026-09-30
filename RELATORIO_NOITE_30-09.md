# Relatório da noite — 29→30/09

Tudo está no GitHub (branch main, último commit `51d2bf5`). Não gastei nenhum crédito do Meshy, e o Codex terminou em 39% do uso semanal.

## Pra ver
Abra http://localhost:5199/?p1=lulacio&p2=xandor&mode=cpu e teste estes parâmetros:
- `&cast=forward`: a Picanha nova.
- `&cast=ultimate&meter=1`: a ultimate.
- `&animtest=1`: o roteiro que passa por todos os movimentos.
- `&debug=1`: mostra as áreas de acerto.

Vídeos em `videos/`: `picanha_civis_esq.mp4`, `xandor_ultimate.mp4`, `lulacio_polvao_prototipo.mp4`.

## O que foi feito (combinado e revisado com o GPT pelo canal `canal_ia/`)
1. **Câmera no celular:** os dois lutadores aparecem sempre, inclusive no pulo e no knockback.
2. **Agachar:** o corpo agora agacha de verdade, com joelhos dobrados e pés no chão. A pose não se acumula (testado com 300 repetições).
3. **Bug grave corrigido:** os ossos do lado DIREITO do corpo eram ignorados, porque o nome "Right" era cortado.
4. **Xandor mais gordo na guarda:** era a mão no queixo e a cabeça afundada. Agora a mão sai do rosto e a cabeça sobe um pouco.
5. **Socos e chutes:** o punho ou o pé encosta no adversário exatamente no momento em que o golpe acerta.
6. **Pisão do Lulácio:** curto e pesado, com poeira no chão.
7. **Picanha do Povo:** 5 pessoas 3D de verdade (modelos gratuitos, licença CC0) saem de trás do Lulácio correndo e atropelam o adversário. A picanha fica na mão até o arremesso.
8. **Discurso:** agora aparecem ondas de voz saindo da boca.
9. **Pulo:** impulso, subida, encolhe no topo, descida e aterrissagem, sem ficar em loop.
10. **Ultimate do Xandor "Avatar da Constituição":** selo judicial gigante, aura, olhos brilhando e livros voando. Cada golpe é uma caneta que crava no alvo, e no final um martelo gigante desce: "SENTENÇA: DERROTA".
11. **Ultimate do Lulácio "Polvão do Povo":** protótipo, não é a arte final. Ele vira um polvo roxo de chapéu panamá, barba, gravata e microfone, e os tentáculos acertam o adversário.

## Precisa de você
- **Validar o Lulácio**, que ainda não foi aprovado.
- **Polvão final:** decidir se deixamos o protótipo feito em código ou se geramos a cabeça do polvo no Meshy (cerca de 35 créditos).
- **Rosto de dor:** os modelos não têm ossos no rosto. Hoje só o corpo reage ao golpe; uma expressão de dor exige editar o modelo.

## Ficou pra próxima
- Abraço do Palanque.
- Efeitos da Intimação, do Bloqueado e da Canetada.
- Capitão Brasa e Dino.
