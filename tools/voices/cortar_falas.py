"""Corta os áudios de falas (1 arquivo por personagem, falas separadas por pausa) em clipes por evento de voz.

Uso: python -X utf8 tools/voices/cortar_falas.py <pasta_dos_mp3> <words.json>
  words.json = transcrição com tempo por palavra (faster-whisper) de cada mp3, gerada antes.
Saída: public/assets/audio/voices/falas_<id>/<evento>_<n>.ogg + .mp3  (evento = taunt|win|lose|ko|hurt|attack|ultimate|sp-<golpe>)
O roteiro de cada personagem (ordem das falas e evento de cada uma) está em ROTEIROS, abaixo.
"""
import json, os, re, subprocess, sys, unicodedata, difflib, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/audio/voices'

HURT = [('hurt', 'Ai!'), ('hurt', 'Ui!'), ('hurt', 'Aiii!')]
ROTEIROS = {
  # chave = trecho do nome do arquivo enviado
  'Bolsonaro_Ex': ('capitao-brasa', [
    ('taunt', 'Chegou o capitão, talkei?'), ('taunt', 'Missão dada é missão cumprida!'),
    ('taunt', 'Eu tenho histórico de atleta, talkei?'), ('taunt', 'Deixa eu tirar a tornozeleira aqui rapidinho...'),
    ('taunt', 'Fala baixo que é o presidente... ex... tanto faz!'), ('taunt', 'Bora, que a motociata tá esperando lá fora!'),
    ('win', 'E daí? Ganhei, pô!'), ('win', 'Imbrochável, imorrível e invencível!'), ('win', 'Acabou! Ganhei no primeiro turno!'),
    ('win', 'Essa urna eu confio!'), ('win', 'Missão cumprida. Agora vou pro cercadinho.'),  # "Tá OK? Tá OK!" não saiu no áudio
    ('lose', 'Essa luta foi fraudada!'), ('lose', 'Quero ver o código-fonte desse juiz!'), ('lose', 'Inelegível até 2030... de novo?'),
    ('lixo', 'Vem pro cercadinho, vem'),  # cortada no limite de 500 caracteres: descartada
  ]),
  'Fl_vio_Bolsonaro': ('flavio', [
    ('taunt', 'Zero Um chegou na área!'), ('taunt', 'Herdei tudo do meu pai, inclusive a porrada!'),
    ('win', 'Tá tudo em família. Próximo!'), ('win', 'Zero Um é o número um!'),
    ('lose', 'Isso não fica assim, vou chamar meu pai!'), ('lose', 'Eu quero foro privilegiado!'), ('lose', 'Cadê o Queiroz pra me ajudar?'),
    ('taunt', 'Vem, que eu racho você!'), ('sp-rachadinha-sismica', 'Rachadinha!'), ('sp-rachadinha-sismica', 'Treme, treme, Brasília!'),
    ('sp-zero-um', 'Clone? Não, assessor.'), ('sp-senador-express', 'Senador Express!'), ('taunt', 'Mexeu com um, mexeu com todos!'),
    ('ultimate', 'Dinastia! Chama o zero dois, o zero três!'), ('taunt', 'Picanha não, aqui é chocolate!'),
    ('win', 'Rachou!'), ('win', 'Herança recebida!'),
  ]),
  'Lula_Presidente': ('lulacio', [
    ('taunt', 'Companheiros e companheiras, hoje vai ter porrada!'), ('win', 'Nunca antes na história desse ringue!'),
    ('taunt', 'Faz o L!'), ('win', 'Quarto mandato, companheiro!'),
    ('sp-picanha-do-povo', 'Picanha do povo!'), ('sp-picanha-do-povo', 'Toma picanha com cervejinha!'), ('sp-picanha-do-povo', 'O povo chegou!'),
    ('sp-abraco-do-palanque', 'Abraço! Vem cá, companheiro!'), ('sp-abraco-do-palanque', 'Voou!'),
    ('sp-discurso-interminavel', 'Discurso interminável... e tem mais!'), ('sp-discurso-interminavel', 'Deixa eu terminar de falar!'),
    ('taunt', 'Não existe alma viva mais forte que eu!'), ('taunt', 'Tenho oitenta anos e energia de trinta!'),
    ('ultimate', 'Polvão!'), ('taunt', 'Janja, segura minha bolsa!'), ('lose', 'Isso é golpe!'), ('win', 'Companheirada!'),
  ]),
  'Nikolas_Ferreira': ('nikolas', [
    ('taunt', 'Olha o engajamento subindo!'), ('taunt', 'Grava aí, que isso vai viralizar!'), ('win', 'Isso vai dar um milhão de views!'),
    ('sp-chupeta-teleguiada', 'Chupeta!'), ('sp-mamadeira-turbo', 'Mamadeira!'),
    ('sp-selfie-do-dano', 'Click! Sorria, você tá no meu feed!'), ('sp-selfie-do-dano', 'Perfect selfie!'),
    ('attack', 'Engajou!'), ('ultimate', 'Viralizou!'), ('ultimate', 'Um milhão!'),
    ('taunt', 'Já tô fazendo o vídeo da sua derrota!'), ('taunt', 'Fala do Pix agora, fala!'), ('win', 'Cancelado!'),
    *HURT, ('hurt', 'Ai, meu celular!'), ('hurt', 'Ui, isso vai sair no story!'), ('lose', 'Ai, ai, ai!'),
    ('hurt', 'Para, que tá gravando!'), ('ko', 'Nãooo!'),
  ]),
  'Alexandre_de_Moraes': ('xandor', [
    ('taunt', 'Isso não vai ficar assim.'), ('win', 'Caso encerrado. Arquive-se.'),
    ('sp-intimacao', 'Intimado!'), ('sp-bloqueado', 'Bloqueado!'), ('sp-canetada', 'Canetada!'),
    ('sp-bloqueado', 'Conta suspensa por tempo indeterminado!'), ('win', 'Decisão monocrática: você perdeu!'),
    ('ultimate', 'Sentença: derrota!'), ('win', 'Sem recurso!'), ('taunt', 'Inquérito aberto contra o seu soco!'),
    ('taunt', 'Tá no meu círculo, tá na minha jurisdição!'), ('sp-intimacao', 'Tornozeleira nele!'),
    ('taunt', 'Careca é o seu argumento!'), ('taunt', 'Pede pra sair, que eu bloqueio!'),
    *HURT, ('hurt', 'Ai, isso é desacato!'), ('hurt', 'Ui, vou abrir inquérito!'), ('lose', 'Ai, ai, ai!'), ('ko', 'Nãooo!'),
  ]),
  'Dilma': ('dilma', [
    ('taunt', 'Não vamos colocar meta. Quando atingir a meta, a gente dobra a meta.'),
    ('sp-saudacao-a-mandioca', 'Eu saúdo a mandioca!'), ('win', 'Atrás de toda luta tem um cachorro.'),
    ('sp-estocar-vento', 'Vento estocado!'), ('sp-estocar-vento', 'Estocou!'), ('sp-saudacao-a-mandioca', 'Mandiocada!'),
    ('sp-pedalada-fiscal', 'Pedalada fiscal!'), ('sp-pedalada-fiscal', 'Pedalou!'), ('attack', 'Meta batida!'), ('attack', 'Dobrou a meta!'),
    ('ultimate', 'Dilmês total!'), ('taunt', 'Ninguém vai ganhar, nem perder. Vai todo mundo ganhar, ou perder.'),
    ('win', 'Não acho que quem ganhar ou perder vai ganhar ou perder.'),
    *HURT, ('hurt', 'Ai, minha mandioca!'), ('hurt', 'Ui, isso é golpe!'), ('lose', 'Ai, ai, ai!'), ('ko', 'Nãooo!'),
  ]),
  'Erika_Hilton': ('erika', [
    ('taunt', 'O plenário é meu. E o ringue também.'), ('win', 'Questão de ordem: encerrada.'),
    ('sp-discurso-de-impacto', 'Impacto!'), ('sp-salto-agulha', 'Agulha!'), ('sp-close-certo', 'Close certo!'),
    ('sp-close-certo', 'Errou o close, querido!'), ('ultimate', 'Plenário é meu!'), ('win', 'Silenciado!'),
    ('taunt', 'Pela ordem, senhor presidente!'), ('sp-discurso-de-impacto', 'Peço a palavra... e a porrada!'),
    ('taunt', 'Fim da escala seis por um, começando pela sua cara!'), ('win', 'Protocolei sua derrota!'),
    ('win', 'Aprovado em regime de urgência!'), ('attack', 'Não me interrompa!'),
    *HURT, ('hurt', 'Ai, meu salto!'), ('hurt', 'Ui, isso é quebra de decoro!'), ('lose', 'Ai, ai, ai!'), ('ko', 'Nãooo!'),
  ]),
  'Fernando_Haddad': ('haddad', [
    ('taunt', 'Tudo tem imposto. Inclusive essa surra.'), ('win', 'Arrecadação recorde!'), ('win', 'Vitória declarada. Agora paga o carnê.'),
    ('sp-taxa-das-blusinhas', 'Taxado!'), ('sp-taxa-das-blusinhas', 'Taxa das blusinhas!'),
    ('sp-arcabouco-fiscal', 'Arcabouço!'), ('sp-arcabouco-fiscal', 'Teto de gastos!'),
    ('sp-carimbo-do-imposto', 'Carimbado!'), ('sp-carimbo-do-imposto', 'Mais imposto!'), ('attack', 'Arrecadou!'),
    ('ultimate', 'Leão!'), ('win', 'Malha fina!'), ('taunt', 'Esse soco veio da Shein? Taxado!'),
    ('taunt', 'Declara esse golpe no imposto de renda!'), ('taunt', 'Fecha a conta, que eu fecho a sua cara!'),
    *HURT, ('hurt', 'Ai, meu arcabouço!'), ('hurt', 'Ui, isso não tava no orçamento!'), ('lose', 'Ai, ai, ai!'), ('ko', 'Nãooo!'),
  ]),
}

NUM = {'01': 'zeroum', '6x1': 'seisporum', '1': 'um', '2030': 'doismiletrinta'}
def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'\b(01|6x1|1|2030)\b', lambda m: NUM[m.group(1)], s)
    s = s.replace('2030', 'doismiletrinta')
    return re.sub(r'[^a-z]', '', s)

def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)]))

def main(src, wjson):
    words = json.load(open(wjson, encoding='utf-8'))
    for fname, ws in words.items():
        key = next((k for k in ROTEIROS if k in fname), None)
        if not key:
            print('sem roteiro:', fname); continue
        cid, linhas = ROTEIROS[key]
        mp3 = Path(src) / fname
        total = dur(mp3)
        # texto da transcrição, letra a letra, com o índice da palavra de cada letra
        tchars, tidx = [], []
        for i, w in enumerate(ws):
            for c in norm(w['w']):
                tchars.append(c); tidx.append(i)
        rchars, rline = [], []
        for li, (_, txt) in enumerate(linhas):
            for c in norm(txt):
                rchars.append(c); rline.append(li)
        sm = difflib.SequenceMatcher(None, rchars, tchars, autojunk=False)
        hits = {}  # linha → [índices de palavras]
        for a, b, n in sm.get_matching_blocks():
            for k in range(n):
                hits.setdefault(rline[a + k], set()).add(tidx[b + k])
        spans = []
        for li in range(len(linhas)):
            idx = sorted(hits.get(li, []))
            spans.append((ws[idx[0]]['s'], ws[idx[-1]]['e']) if idx else None)
        # linha sem palavra casada (whisper pulou um "Ui"): fica no buraco entre as vizinhas
        for li, sp in enumerate(spans):
            if sp is None:
                a = next((spans[j][1] for j in range(li - 1, -1, -1) if spans[j]), 0.0)
                b = next((spans[j][0] for j in range(li + 1, len(spans)) if spans[j]), total)
                spans[li] = (a, b)
        cuts = [0.0] + [(spans[i][1] + spans[i + 1][0]) / 2 for i in range(len(spans) - 1)] + [total]
        d = OUT / f'falas_{cid}'
        if d.exists(): shutil.rmtree(d)
        d.mkdir(parents=True)
        cont, mapa = {}, []
        for li, (ev, txt) in enumerate(linhas):
            if ev == 'lixo':
                continue
            cont[ev] = cont.get(ev, 0) + 1
            name = f'{ev}_{cont[ev]}'
            a, b = max(0, cuts[li] - 0.03), cuts[li + 1] + 0.03
            af = ('silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.02,areverse,'
                  'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.06,areverse,'
                  'afade=t=in:d=0.01,loudnorm=I=-16:TP=-1.5:LRA=11')
            for ext, codec in (('ogg', ['-c:a', 'libopus', '-b:a', '40k']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '48k'])):
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', str(mp3),
                                '-af', af, '-ac', '1', '-ar', '24000' if ext == 'ogg' else '24000', *codec, str(d / f'{name}.{ext}')], check=True)
            heard = ' '.join(w['w'].strip() for w in ws if w['s'] >= cuts[li] - 0.01 and w['e'] <= cuts[li + 1] + 0.01)
            mapa.append({'arquivo': name, 'texto': txt, 'ouvido': heard, 'ini': round(a, 2), 'fim': round(b, 2)})
            print(f'{cid:14} {name:28} {a:6.2f}-{b:6.2f}  {txt[:40]:40} | {heard[:50]}')
        (d / 'falas.json').write_text(json.dumps(mapa, ensure_ascii=False, indent=1), encoding='utf-8')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
