// Abre a página no Chrome headless e imprime erros/avisos do console (diagnóstico rápido de shader/módulo).
// Uso: node tools/pageerr.mjs "<query>"   (RK_URL=http://localhost:5199/ por padrão)
import puppeteer from 'puppeteer-core';
const [query = 'p1=lulacio&p2=xandor&mode=demo'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 640, height: 360 },
});
const p = await browser.newPage();
p.on('pageerror', (e) => console.error('[pageerror]', e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text().slice(0, 2000)); });
await p.goto(`${BASE}?${query}&manual=1`, { waitUntil: 'networkidle0' });
await p.evaluate(() => { for (let i = 0; i < 5; i++) window.__rk?.advance(0.016); });
await new Promise((r) => setTimeout(r, 1500));
console.log('__rk:', await p.evaluate(() => typeof window.__rk));
await browser.close();
