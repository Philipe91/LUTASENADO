// Screenshot de uma página do servidor Vite (ex.: preview.html) para evidências de revisão.
// Uso: node tools/shot.mjs "preview.html?files=...&view=front" saida.png [largura] [altura]
import puppeteer from 'puppeteer-core';
const [page, out, W = '900', H = '600'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: +W, height: +H },
});
const p = await browser.newPage();
p.on('pageerror', (e) => console.error('[página]', e.message));
await p.goto(BASE + page, { waitUntil: 'networkidle0' });
await p.waitForFunction('window.__ready === true', { timeout: 60000 });
await p.screenshot({ path: out });
await browser.close();
console.log('ok', out);
