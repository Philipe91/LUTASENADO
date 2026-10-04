# Kit de publicação — República Kombat (preparado, NÃO publicado)

Lançamento público combinado: **depois de 26/10/2026** (ver docs/PLANO_LANCAMENTO.md). Até lá, nada vai ao ar sem você mandar.

## Arquivos
- `sobre.html`, `privacidade.html`, `termos.html` → copiar para `public/` (vão para a raiz do site). Trocar `[SEU-EMAIL]`, `[SEU NOME OU EMPRESA]`, `[DATA]`.
- `ads.txt` → copiar para `public/` depois da aprovação do AdSense, com o seu `pub-...`.
- `_estilo.css` → junto com as páginas.

## Passo a passo no dia (≈ 1 hora)
1. **Domínio:** registrar `republicakombat.com.br` (registro.br, ~R$40/ano) ou outro nome.
2. **Hospedagem grátis:** conta no Cloudflare → Workers & Pages → criar projeto ligado ao GitHub `Philipe91/LUTASENADO` (repo privado tudo bem) → build `npm run build`, pasta `dist` → apontar o domínio.
3. **AdSense:** criar conta com o domínio no ar (pode ser em "beta", sem divulgar) → colar o código de verificação → esperar aprovação (dias a semanas) → pedir **H5 Games Ads** (Ad Placement API).
4. **Ligar anúncios:** `VITE_ADSENSE_CLIENT=ca-pub-... npm run build:google` (já implementado em `src/platform/adapters`, ver docs/PUBLICACAO_TECNICA.md) e publicar; colocar `ads.txt`.
5. **Banner de consentimento:** usar o CMP do próprio Google (Privacidade e mensagens no AdSense) — exigido para Europa; no Brasil atende a LGPD.
6. **Estatísticas:** Plausible ou Google Analytics.
7. **Redes:** perfis TikTok/Instagram/YouTube "República Kombat" e postar os vídeos narrados (`videos/noite/*_narrada.mp4`).

## Antes de publicar (checklist)
- [ ] nomes paródicos nos personagens que hoje usam nome real (decisão sua)
- [ ] aviso de paródia/IA na tela de título
- [ ] conversa com advogado (eleitoral + imagem)
- [ ] `npm run test:publish` passando
