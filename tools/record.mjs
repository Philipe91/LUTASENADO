// Grava um vídeo MP4 do jogo, quadro a quadro, com relógio controlado (liso mesmo em máquina lenta / headless).
// Uso: node tools/record.mjs "<query da URL>" <segundos> <saida.mp4> [largura] [altura] [fps]
// Ex.: node tools/record.mjs "p1=lulacio&p2=xandor&cast=forward" 5 videos/picanha.mp4
// Requer: servidor do Vite rodando (npm run dev) e ffmpeg no PATH.
import puppeteer from 'puppeteer-core';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const [query, secs = '5', out = 'videos/clip.mp4', W = '1280', H = '720', FPS = '30'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const fps = Number(FPS), total = Math.round(Number(secs) * fps);

const frames = mkdtempSync(join(tmpdir(), 'rk-frames-'));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', `--window-size=${W},${H}`],
  defaultViewport: { width: Number(W), height: Number(H) },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[página]', e.message));
await page.goto(`${BASE}?${query}&manual=1`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { for (let i = 0; i < 10; i++) window.__rk.advance(0); });

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate((dt) => window.__rk.advance(dt), 1 / fps);
  await page.screenshot({ path: join(frames, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 });
  if (i % 30 === 0) process.stdout.write(`\r${i}/${total} quadros`);
}
await browser.close();
console.log(`\r${total}/${total} quadros em ${((Date.now() - t0) / 1000).toFixed(0)}s`);

mkdirSync(dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, '%05d.jpg'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'veryfast', '-movflags', '+faststart', out], { stdio: 'inherit' });
rmSync(frames, { recursive: true, force: true });
console.log('vídeo:', out);
