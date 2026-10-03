import json, subprocess, os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
S = json.load(open('narr/script.json', encoding='utf-8'))
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).decode().strip())
def run(a): subprocess.run(['ffmpeg','-nostdin','-y','-v','error']+a, check=True)
VF = 'scale=540:960,fps=24,format=yuv420p'
import sys
PARTS = sys.argv[1:] or list(S)
for part, lines in S.items():
    if part not in PARTS: continue
    segs = []; t = 0.0
    for i, (seg, txt) in enumerate(lines):
        nw = f'narr/t/{part}_{i:02d}_{seg}.wav'; nd = dur(nw)
        out = f'narr/seg_{part}_{i:02d}.mp4'
        if os.path.exists(out):
            segs.append((seg, out, t, dur(out), nw)); t += dur(out); continue
        if seg in ('intro', 'outro'):
            img = f'cards/{part}_{seg}.png'; d = max(2.5, nd + 1.0)
            run(['-loop','1','-t',f'{d:.3f}','-i',img,'-vf',f"scale=540:960,zoompan=z='min(zoom+0.0007,1.06)':d=1:s=540x960:fps=24,format=yuv420p",'-r','24','-c:v','libx264','-preset','veryfast','-crf','22',out])
        elif seg.startswith('card_'):
            img = f'cards/{seg}.png'; d = max(4.0, nd + 0.9)
            run(['-loop','1','-t',f'{d:.3f}','-i',img,'-vf',f"scale=540:960,zoompan=z='min(zoom+0.0007,1.06)':d=1:s=540x960:fps=24,format=yuv420p",'-r','24','-c:v','libx264','-preset','veryfast','-crf','22',out])
        else:
            src = f'{seg}.mp4'; cd = dur(src); d = max(cd, nd + 0.6)
            pad = max(0, d - cd)
            run(['-i',src,'-vf',f'{VF},tpad=stop_mode=clone:stop_duration={pad:.3f}','-an','-c:v','libx264','-preset','veryfast','-crf','22',out])
            d = dur(out)
        segs.append((seg, out, t, d, nw)); t += d
    total = t
    with open(f'narr/{part}_concat.txt','w') as f:
        for s in segs: f.write(f"file '{os.path.basename(s[1])}'\n")
    run(['-f','concat','-safe','0','-i',f'narr/{part}_concat.txt','-c','copy',f'narr/{part}_video.mp4'])
    total = dur(f'narr/{part}_video.mp4')
    # áudio: narração + sfx em pistas com atraso; música com ducking
    inputs = []; filt = []; nar = []; fx = []
    for k, (seg, out, st, d, nw) in enumerate(segs):
        inputs += ['-i', nw]; idx = len(inputs)//2 - 1
        delay = int((st + 0.25) * 1000)
        filt.append(f'[{idx}:a]adelay={delay}|{delay},volume=1.0[n{k}]'); nar.append(f'[n{k}]')
    def add_sfx(name, at, vol):
        inputs.extend(['-i', f'narr/sfx_{name}.wav']); idx = len(inputs)//2 - 1; k = len(fx)
        ms = max(0, int(at*1000)); filt.append(f'[{idx}:a]adelay={ms}|{ms},volume={vol}[f{k}]'); fx.append(f'[f{k}]')
    add_sfx('slam', 0.05, 0.9); add_sfx('bell', 0.15, 0.5)
    for seg, out, st, d, nw in segs[1:]:
        add_sfx('whooshHeavy', max(0, st - 0.12), 0.7)
        if seg.endswith('_ult'): add_sfx('ultActivate', st + 0.1, 0.55)
        if seg == 'outro': add_sfx('cheer', st + 0.2, 0.6)
    inputs += ['-i', 'narr/music.wav']; mi = len(inputs)//2 - 1
    filt.append(f"{''.join(nar)}amix=inputs={len(nar)}:normalize=0,apad,atrim=0:{total:.3f},asplit=2[voz][key]")
    filt.append(f"{''.join(fx)}amix=inputs={len(fx)}:normalize=0,apad,atrim=0:{total:.3f}[sfx]")
    filt.append(f"[{mi}:a]atrim=0:{total:.3f},volume=0.42,afade=t=in:d=0.6,afade=t=out:st={total-1.5:.3f}:d=1.5[mus]")
    filt.append("[mus][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[musd]")
    filt.append("[voz]highpass=f=80,acompressor=threshold=0.1:ratio=3:attack=5:release=120,volume=1.6[vz]")
    filt.append("[vz][musd][sfx]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]")
    run(inputs + ['-filter_complex', ';'.join(filt), '-map', '[a]', '-ar', '44100', '-ac', '2', f'narr/{part}_audio.wav'])
    n = part.replace('p', '')
    run(['-i', f'narr/{part}_video.mp4', '-i', f'narr/{part}_audio.wav', '-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart','-t',f'{total:.3f}', f'republica_kombat_parte0{n}_narrada.mp4'])
    print(part, f'{total:.1f}s', len(segs), 'segmentos')
