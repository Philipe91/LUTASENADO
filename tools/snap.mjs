// Fotos do jogo em instantes exatos (relógio manual), para revisar golpes/VFX quadro a quadro.
// Uso: node tools/snap.mjs "<query>" "<t1,t2,...>" <prefixo_saida> [largura] [altura] [gap]
//   t = segundos de jogo desde o carregamento · gap = distância inicial entre os lutadores (opcional)
// Ex.: node tools/snap.mjs "p1=lulacio&p2=xandor&cast=down" "2.6,3.0,3.4" videos/snap/abraco 540 960 1.2
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [query, times, out, W = '540', H = '960', gap] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  defaultViewport: { width: +W, height: +H },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[página]', e.message));
await page.goto(`${BASE}?${query}&manual=1`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { for (let i = 0; i < 10; i++) window.__rk.advance(0); });
if (gap) await page.evaluate((g) => { const [a, b] = window.__rk.match.fighters; a.x = -g / 2; b.x = g / 2; }, Number(gap));
mkdirSync(dirname(out), { recursive: true });
const dt = 1 / 60;
let t = 0;
for (const target of times.split(',').map(Number)) {
  while (t < target - 1e-6) { await page.evaluate((d) => window.__rk.advance(d), dt); t += dt; }
  const info = await page.evaluate(() => { const [a, b] = window.__rk.match.fighters; return `${a.state}/${a.animKey} t${a.t} | ${b.state}/${b.animKey}`; });
  const file = `${out}_${target.toFixed(2)}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
  console.log(file, info);
}
await browser.close();
