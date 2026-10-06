# Vozes dos lutadores — origem e licença

**Nenhuma voz deste pacote clona ou imita a voz de pessoa real.** São vozes de ARQUÉTIPO genérico e caricato
(senhor rouco, grave autoritário, brutamontes, gritão, jovem animado, ofegante, meia-idade calmo, mulher firme,
mulher jovem). Nada foi gravado, amostrado ou treinado a partir de áudio de políticos ou de qualquer pessoa.

## Como foram feitas

- Geradas por `tools/voices/gen_voices.py` (reproduzível).
- Fonte das falas: vozes sintéticas genéricas de catálogo do serviço de TTS da Microsoft (Edge "Read aloud") acessado
  pela biblioteca `edge-tts` (MIT, https://github.com/rany2/edge-tts): `pt-BR-AntonioNeural`, `pt-BR-FranciscaNeural`,
  `pt-BR-ThalitaMultilingualNeural`, `pt-PT-DuarteNeural`. São vozes de locutor padrão, não de pessoas públicas.
- Conteúdo falado: só interjeições e frases genéricas ("ai!", "rá!", "opa!", "toma!", "segura essa!", "nããão!", "isso!",
  "vem!"). Nenhuma frase célebre/bordão de pessoa real.
- Processamento (ffmpeg): troca de tom e andamento, equalização, rouquidão (ramo sussurrado por FFT), saturação, sala curta,
  compressão, corte de silêncio, normalização (−15 dBFS RMS, pico −1 dBFS). Mono, 24 kHz, Opus 28 kbps (`.ogg`) e MP3 32 kbps
  (`.mp3`, fallback para navegadores sem Opus).

## Licença / uso

- O texto falado é original do projeto; o áudio é saída do TTS processada. O uso do serviço segue os termos da Microsoft para
  o recurso de leitura em voz alta; **antes de publicar comercialmente**, confirme que esses termos cobrem o uso em jogo
  (alternativa sem dependência: regravar as mesmas interjeições com dublador contratado ou trocar por pacote CC0 — o jogo
  só precisa de arquivos com os mesmos nomes `<arquétipo>/<evento>_<n>.ogg|mp3`).
- Nenhum arquivo de terceiros com licença CC0/CC-BY foi incluído neste pacote.

## Estrutura

`<arquétipo>/<evento>_<n>.ogg|mp3`, eventos: `attack`, `hurt`, `jump`, `special`, `ultimate`, `ko`, `win`, `lose`, `taunt`
(2–4 variações cada). O personagem escolhe o arquétipo em `audio.voice = { set, pitch }` (src/data/characters/*.js).
