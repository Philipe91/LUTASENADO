// Foto de uma tela de UI (seleção, menu) no dev server, sem relógio manual.
// Uso: node tools/shotui.mjs "<query>" saida.jpg [largura] [altura]   (RK_URL=http://localhost:5199/ por padrão)
import puppeteer from 'puppeteer-core';
const [query = '', out, W = '540', H = '960'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  defaultViewport: { width: +W, height: +H },
});
const p = await browser.newPage();
p.on('pageerror', (e) => console.error('[página]', e.message));
await p.goto(`${BASE}?${query}`, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 900));
await p.screenshot({ path: out, type: 'jpeg', quality: 85 });
await browser.close();
console.log('ok', out);
