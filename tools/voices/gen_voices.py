# Gera o pacote de vozes de ARQUÉTIPO (genéricas, caricatas) dos lutadores.
# NÃO clona nem imita voz real de ninguém: parte de vozes sintéticas genéricas do edge-tts (Microsoft Neural, pt-BR/pt-PT)
# falando só interjeições ("ai!", "rá!", "toma!") e deforma com ffmpeg (pitch, eq, rouquidão, saturação, sala curta)
# para cada arquétipo (senhor rouco, grave autoritário, brutamontes, gritão, jovem animado...).
#
# Uso:  python tools/voices/gen_voices.py [arquétipo ...]
# Saída: public/assets/audio/voices/<arquétipo>/<evento>_<n>.ogg (Opus) + .mp3 (fallback Safari antigo)
# Cache do TTS bruto: $RK_VOICE_CACHE (padrão: pasta temporária do sistema/rk_voice_cache)
import asyncio, os, subprocess, sys, tempfile, wave, hashlib
import numpy as np
import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'audio', 'voices')
CACHE = os.environ.get('RK_VOICE_CACHE') or os.path.join(tempfile.gettempdir(), 'rk_voice_cache')
SR = 24000

# interjeições padrão por evento (variações)
BASE = {
    'attack':   ['Rá!', 'Iá!', 'Hah!', 'Uá!'],
    'hurt':     ['Ai!', 'Ui!', 'Ah!', 'Uh!'],
    'jump':     ['Up!', 'Opa!', 'Hop!'],
    'special':  ['Toma!', 'Lá vai!', 'Toma essa!'],
    'ultimate': ['Agora é sério!', 'Segura essa!'],
    'ko':       ['Nããããão!', 'Aaaaaaai!'],
    'win':      ['Isso!', 'É isso aí!', 'Rá, rá, rá!'],
    'lose':     ['Não acredito...', 'Ai, ai, ai...'],
    'taunt':    ['Vem!', 'Pode vir!', 'Vem que tem!'],
}
# duração máxima por evento (s) — golpes/dor/pulo curtos; KO/vitória podem ser mais longos
MAXDUR = {'attack': 0.5, 'hurt': 0.5, 'jump': 0.45, 'special': 0.8, 'ultimate': 1.25, 'ko': 1.4, 'win': 1.3, 'lose': 1.4, 'taunt': 1.0}

# rouquidão: ramo "sussurrado" (fase aleatória na FFT) misturado ao original
def hoarse(w):
    return (f"asplit=2[a][b];[b]afftfilt=real='hypot(re,im)*cos((random(0)*2-1)*PI)':imag='hypot(re,im)*sin((random(0)*2-1)*PI)':win_size=512:overlap=0.75,"
            f"highpass=f=900,volume={w}[w];[a][w]amix=inputs=2:normalize=0")

# arquétipo → voz base genérica + ajuste do TTS + cadeia ffmpeg (pitch p via asetrate; o tempo é compensado em parte)
SETS = {
    'senhor_rouco': dict(voice='pt-BR-AntonioNeural', pitch=-6, rate=-8, p=0.93, tempo=0.95,
        fx=hoarse(0.55) + ',vibrato=f=5.5:d=0.18,lowpass=f=6000,equalizer=f=250:t=q:w=1:g=3',
        texts={'taunt': ['Vem, rapaz!', 'Pode vir!', 'Vem cá!'], 'jump': ['Upa!', 'Opa!', 'Hop!']}),
    'grave_autoritario': dict(voice='pt-BR-AntonioNeural', pitch=-10, rate=-12, p=0.85, tempo=1.0,
        fx='bass=g=5:f=140,equalizer=f=3000:t=q:w=1:g=-3,aecho=0.8:0.55:28|45:0.22|0.12',
        texts={'taunt': ['Silêncio!', 'Venha!', 'Ordem!'], 'win': ['Encerrado.', 'Isso!', 'Rá, rá, rá!']}),
    'brutamontes': dict(voice='pt-BR-AntonioNeural', pitch=-12, rate=-5, p=0.76, tempo=1.05,
        fx='volume=7dB,asoftclip=type=atan,lowpass=f=4200,bass=g=4:f=120,aecho=0.8:0.5:35:0.25',
        texts={'attack': ['Rrah!', 'Hah!', 'Urrá!', 'Rá!'], 'taunt': ['Vem!', 'Ráááá!', 'Vem que tem!']}),
    'gritao': dict(voice='pt-BR-AntonioNeural', pitch=2, rate=10, p=0.97, tempo=1.0,
        fx='volume=9dB,asoftclip=type=tanh,highpass=f=160,equalizer=f=1600:t=q:w=1:g=5',
        texts={'taunt': ['Vem!', 'Bora, pô!', 'Pode vir!'], 'win': ['Isso!', 'É isso aí, pô!', 'Rá, rá, rá!']}),
    'jovem_animado': dict(voice='pt-BR-AntonioNeural', pitch=14, rate=15, p=1.12, tempo=1.02,
        fx='highpass=f=140,treble=g=3:f=4000',
        texts={'taunt': ['Vem!', 'Bora!', 'Vem que tem!'], 'win': ['Isso!', 'Uhuuul!', 'Rá, rá, rá!']}),
    'gordo_ofegante': dict(voice='pt-BR-AntonioNeural', pitch=-4, rate=-8, p=0.91, tempo=0.95,
        fx=hoarse(0.75) + ',lowpass=f=5000,equalizer=f=300:t=q:w=1:g=4',
        texts={'attack': ['Hmf!', 'Rá!', 'Uf!', 'Hah!'], 'hurt': ['Uff!', 'Ai!', 'Ui!', 'Oh!'], 'jump': ['Upa!', 'Hmpf!', 'Opa!'],
               'win': ['Hehehe!', 'Isso!', 'Rá, rá, rá!'], 'lose': ['Ufa... ufa...', 'Ai, ai, ai...'], 'taunt': ['Vem!', 'Pode vir!', 'Hehe, vem!']}),
    'meia_idade_calmo': dict(voice='pt-PT-DuarteNeural', pitch=0, rate=-4, p=1.0, tempo=1.0,
        fx='highpass=f=120,equalizer=f=1100:t=q:w=1.2:g=4,lowpass=f=7000',
        texts={'taunt': ['Vem.', 'Pode vir.', 'Venha.'], 'win': ['Isso.', 'Muito bem.', 'Rá, rá, rá!']}),
    'mulher_firme': dict(voice='pt-BR-FranciscaNeural', pitch=-8, rate=-4, p=0.93, tempo=1.0,
        fx='highpass=f=150,equalizer=f=900:t=q:w=1:g=3,volume=3dB,asoftclip=type=tanh',
        texts={'taunt': ['Vem!', 'Pode vir, querido!', 'Tô esperando!']}),
    'mulher_jovem': dict(voice='pt-BR-ThalitaMultilingualNeural', pitch=4, rate=10, p=1.03, tempo=1.0,
        fx='highpass=f=170,treble=g=2:f=5000',
        texts={'taunt': ['Vem!', 'Pode vir, amor!', 'Tô esperando!'], 'win': ['Isso!', 'Arrasei!', 'Rá, rá, rá!']}),
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(' '.join(cmd) + '\n' + r.stderr[-1500:])


async def tts(sem, text, voice, pitch, rate, path):
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return
    async with sem:
        for attempt in range(4):
            try:
                c = edge_tts.Communicate(text, voice, pitch=f'{pitch:+d}Hz', rate=f'{rate:+d}%')
                await c.save(path)
                if os.path.getsize(path) > 500:
                    return
            except Exception as e:  # rede instável: tenta de novo
                if attempt == 3:
                    raise
            await asyncio.sleep(1 + attempt)


def read_wav(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x


def write_wav(path, x):
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def trim(x):
    # recorta o silêncio do TTS (quadros de 10 ms abaixo de -40 dB do pico)
    fr = int(0.01 * SR)
    n = len(x) // fr
    if n < 2:
        return x
    r = np.sqrt((x[:n * fr].reshape(n, fr) ** 2).mean(1)) + 1e-9
    act = np.where(20 * np.log10(r / r.max()) > -40)[0]
    a = max(0, act[0] * fr - int(0.004 * SR)); b = min(len(x), (act[-1] + 1) * fr + int(0.02 * SR))
    return x[a:b]


def finish(x, maxdur):
    # limita duração (com fade), normaliza: RMS das partes ativas → -15 dBFS, pico ≤ -1 dBFS
    n = int(maxdur * SR)
    if len(x) > n:
        x = x[:n].copy()
    x = x.copy()
    f_in, f_out = int(0.004 * SR), min(len(x) // 3, int(0.06 * SR))
    x[:f_in] *= np.linspace(0, 1, f_in)
    x[-f_out:] *= np.linspace(1, 0, f_out) ** 1.5
    frame = int(0.02 * SR)
    fr = [x[i:i + frame] for i in range(0, len(x) - frame, frame)] or [x]
    rms = np.array([np.sqrt(np.mean(f ** 2)) for f in fr])
    act = rms[rms > rms.max() * 0.25]
    level = np.sqrt(np.mean(act ** 2)) if len(act) else rms.max()
    g = 10 ** (-15 / 20) / max(level, 1e-6)
    g = min(g, 10 ** (-1 / 20) / max(np.abs(x).max(), 1e-6))
    return x * g


def process(set_name, cfg, event, i, raw, tmp):
    p, tempo = cfg['p'], cfg['tempo']
    # pitch: asetrate muda tom e tempo juntos; atempo devolve parte do tempo (fica um pouco mais lento/rápido, caricato)
    wav1 = os.path.join(tmp, f'{set_name}_{event}_{i}.wav')
    def render(extra):
        at = max(0.5, min(2.0, tempo * (1 / p) ** 0.6 * extra))
        chain = f"aresample={SR},asetrate={int(SR * p)},aresample={SR},atempo={at:.4f},{cfg['fx']}"
        chain += ',acompressor=threshold=-22dB:ratio=4:attack=3:release=80:makeup=3,aformat=sample_fmts=s16:channel_layouts=mono'
        run(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-filter_complex', chain, '-ac', '1', '-ar', str(SR), wav1])
        return trim(read_wav(wav1))
    x = render(1.0)
    over = len(x) / SR / MAXDUR[event]
    if over > 1.0:  # longo demais: acelera (até 1,45x) em vez de cortar a palavra no meio
        x = render(min(1.45, over * 1.02))
    x = finish(x, MAXDUR[event])
    wav2 = wav1.replace('.wav', '_n.wav')
    write_wav(wav2, x)
    d = os.path.join(OUT, set_name)
    os.makedirs(d, exist_ok=True)
    base = os.path.join(d, f'{event}_{i}')
    run(['ffmpeg', '-y', '-v', 'error', '-i', wav2, '-c:a', 'libopus', '-b:a', '28k', '-application', 'voip', '-ar', '24000', '-ac', '1', '-map_metadata', '-1', base + '.ogg'])
    run(['ffmpeg', '-y', '-v', 'error', '-i', wav2, '-c:a', 'libmp3lame', '-b:a', '32k', '-ar', '24000', '-ac', '1', '-map_metadata', '-1', base + '.mp3'])
    return len(x) / SR


async def main(names):
    os.makedirs(CACHE, exist_ok=True)
    sem = asyncio.Semaphore(6)
    jobs, todo = [], []
    for s in names:
        cfg = SETS[s]
        for event, base in BASE.items():
            texts = cfg.get('texts', {}).get(event, base)
            for i, t in enumerate(texts):
                pt = cfg['pitch'] + (i - 1) * 2  # cada variação um tiquinho diferente
                key = hashlib.md5(f"{cfg['voice']}|{t}|{pt}|{cfg['rate']}".encode()).hexdigest()[:12]
                raw = os.path.join(CACHE, key + '.mp3')
                jobs.append(tts(sem, t, cfg['voice'], pt, cfg['rate'], raw))
                todo.append((s, cfg, event, i + 1, raw, t))
    await asyncio.gather(*jobs)
    tmp = tempfile.mkdtemp(prefix='rkv_')
    for s, cfg, event, i, raw, t in todo:
        d = process(s, cfg, event, i, raw, tmp)
        print(f'{s:18s} {event:8s} {i}  {d:4.2f}s  {t}')


if __name__ == '__main__':
    names = sys.argv[1:] or list(SETS)
    asyncio.run(main(names))
