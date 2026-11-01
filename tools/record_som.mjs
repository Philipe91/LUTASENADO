// Igual ao tools/record.mjs, mas COM SOM: grava os quadros e registra cada voz/SFX que o jogo mandou tocar
// (window.__rkVoiceLog / __rkSfxLog, com o quadro em que aconteceu); depois mixa tudo e junta no MP4.
// O headless não toca áudio, então o som é refeito fora: falas = arquivos de public/, SFX = src/audio/synth.js.
// Locutor (speechSynthesis) e música ficam de fora.
// Uso: node tools/record_som.mjs "<query>" <segundos> <saida.mp4> [largura] [altura] [fps]
// Ex.: node tools/record_som.mjs "p1=lulacio&p2=xandor&mode=demo&meter=1" 20 videos/falas.mp4 960 540 24
import puppeteer from 'puppeteer-core';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { render } from '../src/audio/synth.js';
import { SFX } from '../src/audio/sfxBank.js';

const [query, secs = '5', out = 'videos/clip.mp4', W = '1280', H = '720', FPS = '30'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fps = Number(FPS), total = Math.round(Number(secs) * fps), SR = 48000;

const tmp = mkdtempSync(join(tmpdir(), 'rk-som-'));
const frames = join(tmp, 'f'); mkdirSync(frames);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: Number(W), height: Number(H) },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[página]', e.message));
await page.evaluateOnNewDocument(() => { window.__rkVoiceLog = []; window.__rkSfxLog = []; window.__rkFrame = 0; });
await page.goto(`${BASE}?${query}&manual=1`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { for (let i = 0; i < 10; i++) window.__rk.advance(0); });
if (process.env.RK_PRE) await page.evaluate(process.env.RK_PRE);

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate((dt, i) => { window.__rkFrame = i; window.__rk.advance(dt); }, 1 / fps, i);
  await page.screenshot({ path: join(frames, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 });
  if (i % 30 === 0) process.stdout.write(`\r${i}/${total} quadros`);
}
const { voices, sfx } = await page.evaluate(() => ({ voices: window.__rkVoiceLog, sfx: window.__rkSfxLog }));
await browser.close();
console.log(`\r${total}/${total} quadros em ${((Date.now() - t0) / 1000).toFixed(0)}s · ${voices.length} falas, ${sfx.length} SFX`);

// ---- mixagem ----
const mix = new Float32Array(Math.ceil((total / fps + 3) * SR));
const add = (buf, t, g) => { const o = Math.round(t * SR); for (let k = 0; k < buf.length && o + k < mix.length; k++) if (o + k >= 0) mix[o + k] += buf[k] * g; };
const decoded = new Map();
const decode = (file) => {
  if (!decoded.has(file)) {
    const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
    decoded.set(file, new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4));
  }
  return decoded.get(file);
};
const synth = new Map();
for (const s of sfx) {
  const def = SFX[s.name]; if (!def) continue;
  if (!synth.has(s.name)) synth.set(s.name, render(def.layers, SR));
  add(synth.get(s.name), (s.f ?? 0) / fps + (s.delay || 0), 0.45 * (s.vol ?? 1) * (def.gain ?? 1));
}
const seen = [];
for (const v of voices) {
  add(decode(join('public', v.url)), (v.f ?? 0) / fps + (v.delay || 0), 0.95);
  seen.push(`${((v.f ?? 0) / fps).toFixed(1)}s ${v.url.split('/').slice(-2).join('/')}`);
}
console.log(seen.join('\n'));
let peak = 0; for (const x of mix) peak = Math.max(peak, Math.abs(x));
const k = peak > 0.98 ? 0.98 / peak : 1;
const pcm = Buffer.alloc(mix.length * 2);
for (let i = 0; i < mix.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i] * k)) * 32767), i * 2);
const wav = join(tmp, 'som.wav');
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16);
hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28);
hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
writeFileSync(wav, Buffer.concat([hdr, pcm]));

mkdirSync(dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, '%05d.jpg'), '-i', wav,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k',
  '-af', 'loudnorm=I=-16:TP=-1.5', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
console.log('vídeo:', out);
