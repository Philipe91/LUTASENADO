// Prints de cada tela de UI (título, seleção, carregando, luta, pausa, resultado) num tamanho.
// Uso: node uiflow.mjs <largura> <altura> <pasta_saida> [prefixo]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const [W = '540', H = '960', OUT = 'videos/v6/ui', PRE = ''] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5236/';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: +W, height: +H, isMobile: +W < +H, hasTouch: +W < +H, deviceScaleFactor: 1 });
mkdirSync(OUT, { recursive: true });
page.on('pageerror', (e) => console.error('[página]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = (fn, ms = 60000) => page.waitForFunction(fn, { timeout: ms, polling: 100 });
const shot = (name) => page.screenshot({ path: `${OUT}/${PRE}${name}_${W}x${H}.jpg`, type: 'jpeg', quality: 86 });
const touch = +W < +H ? '&touch=1' : '';
await page.goto(`${BASE}?platform=dev&locks=1&msaa=0${touch}`, { waitUntil: 'domcontentloaded' });
await waitFor(() => document.querySelector('.title:not(.hidden) .tplay'));
await waitFor(() => document.querySelector('.tload.done'));
await page.evaluate(() => document.fonts.ready);
await sleep(1500);
await shot('1_titulo');
await page.click('.tchoose');
await waitFor(() => document.querySelector('.select:not(.hidden)'));
await sleep(900);
await shot('2_selecao');
// hover/foco num card para ver estado
await page.hover('.char[data-id="xandor"]').catch(() => {});
await sleep(400);
await shot('2b_selecao_hover');
const locked = await page.$$eval('.char.locked', (els) => els.map((e) => e.dataset.id));
if (locked[0]) { await page.click(`.char.locked[data-id="${locked[0]}"]`); await waitFor(() => document.querySelector('.unlockAsk')); await sleep(400); await shot('2c_bloqueado'); await page.click('.uno'); }
await page.click('.go');
await waitFor(() => document.querySelector('.fightload:not(.hidden)'), 5000).catch(() => {});
await page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); }).catch(() => {}); // VS pronto, sem esperar o carregamento
await shot('3_carregando');
await waitFor(() => window.__rk.match && document.querySelector('.fightload.hidden'), 90000);
await sleep(3500);
await shot('4_luta');
await page.keyboard.press('Escape');
await sleep(500);
await shot('5_pausa');
await page.click('.presume');
await sleep(300);
await page.evaluate(() => window.__rk.setHold('user', false));
for (let i = 0; i < 4 && !(await page.$('.result:not(.hidden)')); i++) {
  await waitFor(() => window.__rk.match.phase === 'fight', 30000).catch(() => {});
  await page.evaluate(() => { const m = window.__rk.match; m.fighters[1].hp = 0; m.onKO(m.fighters[0], m.fighters[1]); });
  await sleep(5000);
}
await waitFor(() => document.querySelector('.result:not(.hidden) .again'), 30000);
await sleep(800);
await shot('6_resultado');
await browser.close();
console.log('ok', OUT);
