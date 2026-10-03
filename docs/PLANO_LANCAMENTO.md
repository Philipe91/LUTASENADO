# República Kombat — plano de lançamento e monetização (03/10/2026)

## 0. Antes de tudo: datas e riscos
- **Eleições 2026:** 1º turno em **4/10** e 2º turno em **25/10**. O TSE proíbe publicar/impulsionar **conteúdo sintético novo com imagem de candidatos ou pessoas públicas de 72 h antes até 24 h depois da votação**, e exige rótulo de "feito com IA" em conteúdo sintético. Vários personagens são candidatos.
  → **Lançar só depois de 26/10.** Até lá: terminar o jogo, testar com amigos em link privado, preparar site, contas e vídeos.
- **Direito de imagem e sátira:** paródia/humor é protegido (STF, ADI 4451), mas ganhar dinheiro com o rosto realista de pessoas reais aumenta o risco de processo. Para reduzir:
  1. nomes paródicos para todos (como Lulácio, Xandor, Capitão Brasa, Dino Supremo): ex. "Dilmãe", "Taxadd", "Boulão", "Renan Live", "Nikolinha", "Flavão", "Agente Duvall", "Vorcash", "Érika Diva" — sem nome real em título, loja ou anúncio;
  2. manter o estilo **caricatura/boneco** (não fotorrealista) — quanto mais "igual de verdade", mais perto de deepfake;
  3. aviso fixo: "Obra de ficção e paródia política. Personagens são caricaturas. Não representa fatos." + "Imagens geradas com IA";
  4. poderes só sobre **atuação pública/memes conhecidos**, nunca acusação de crime não comprovado, nunca zoar identidade (gênero, raça, religião, corpo) — vale especialmente para a Erika: o humor tem que ser sobre política, não sobre ela ser mulher trans;
  5. consultar um advogado (eleitoral + direito de imagem) antes do lançamento — é barato perto do risco.
- **Políticas de anúncios:** Google AdSense não paga em conteúdo "derrogatório" ou que assedie pessoas; sátira política costuma passar, mas é revisada caso a caso. Portais curados (Poki, CrazyGames) exigem padrão PEGI-12 e escolhem a dedo — sátira de políticos reais tende a ser recusada. Plano principal = **site próprio**.

## 1. Onde colocar no ar (recomendado)
| Opção | Custo | Anúncios | Prós | Contras |
|---|---|---|---|---|
| **Site próprio** (Cloudflare Pages/Vercel/Netlify + domínio `.com.br`) | domínio ~R$40/ano, hospedagem grátis | **AdSense + H5 Games Ads (Ad Placement API)**: intersticial entre lutas e vídeo com recompensa | controle total, 100% da receita, dá para usar o nome/tema | AdSense pode demorar semanas para aprovar; tráfego é por sua conta |
| GameDistribution / GamePix | grátis | SDK deles, divide receita | distribuem para centenas de sites | revisão de conteúdo; receita menor por jogada |
| Poki / CrazyGames | grátis | SDK deles | muito tráfego | curadoria; provável recusa pelo tema |
| itch.io | grátis | sem anúncios (doação "pague quanto quiser") | aceita sátira, comunidade gamer | pouco dinheiro |
→ **Plano: site próprio como casa + GameDistribution como extra (se aceitarem) + itch.io como vitrine.**

## 2. Como ganhar dinheiro (realista)
1. **Anúncios no jogo (H5 Games Ads):** intersticial entre lutas (no máximo 1 a cada ~2 min) e **rewarded** opcional ("assista e libere um lutador / skin dourada nesta sessão"). Nunca durante a luta.
2. **Vídeos curtos** (TikTok, Reels, Shorts) com os golpes meme + narração — é o que traz o tráfego. Shorts e TikTok também pagam por visualização quando a conta entra nos programas.
3. **Apoio direto:** botão Pix/"pague um café", e futuramente skins pagas simples (não em portais).
- **Conta de padeiro:** jogo web no Brasil rende pouco por anúncio (eCPM baixo, ~US$0,5–2). Ex.: 10 mil jogadas/dia × ~2 anúncios × US$1,5/mil ≈ **US$30/dia (~R$150)**. 100 mil jogadas/dia ≈ R$1.500/dia. Depende 100% de viralizar os vídeos.

## 3. O que o jogo precisa para ser aprovado e render
- carregar rápido no celular (<5 s), tela de carregamento, PWA/cache (agente de qualidade cuidando);
- pausar e silenciar fora da aba; controles de toque (feito);
- páginas obrigatórias do site: **Sobre, Política de Privacidade (LGPD), Termos, Contato** + banner de consentimento de cookies (Google exige CMP certificado na UE/UK; no Brasil, LGPD);
- `ads.txt` na raiz do domínio;
- link de compartilhar resultado ("Lulácio derrotou Xandor com o Polvão!") + link direto para a luta — motor de viralização;
- placar/ranking simples e "desafiar amigo".

## 4. Cronograma
| Quando | O quê |
|---|---|
| 03–10/10 | Terminar modelos 3D (Boulos, Renan, T-Rex, jacaré), performance, loading, nomes paródicos e avisos, páginas legais |
| 10–20/10 | Domínio + Cloudflare Pages (link privado), testes com amigos, gravar 20–30 vídeos curtos, criar perfis TikTok/Instagram/YouTube |
| até 25/10 | Pedir AdSense com o site no ar em modo "beta" (sem divulgar), consultar advogado |
| **27/10+** | **Lançamento público** + vídeos diários; ativar H5 Games Ads quando aprovado; enviar para GameDistribution/itch.io |
| Nov/dez | Medir (Google Analytics/Plausible), novos personagens por demanda, eventos ("lutador da semana") |

## 5. Dá para fazer?
Sim — tecnicamente o jogo já está quase pronto para web. O que decide o dinheiro é **tráfego (vídeos virais)** e **não ser derrubado** (cuidados jurídicos e de política de anúncios). O maior erro seria lançar agora, no meio das eleições, com nomes reais e rostos realistas.

Fontes: Poki requirements (sdk.poki.com/new-requirements.html), CrazyGames quality guidelines (docs.crazygames.com/requirements/quality/), AdSense H5 Games Ads (support.google.com/adsense/answer/9959170), Ad Placement API signup (developers.google.com/ad-placement/docs/signup), TSE calendário 2026 e regras de deepfake (tse.jus.br; migalhas.com.br/quentes/455672).
