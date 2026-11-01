// Teste de PUBLICAÇÃO no navegador (Chrome headless): título → JOGAR → carregando → luta → pausa por aba
// escondida → contexto WebGL perdido/recuperado → fim de luta → intervalo comercial (adaptador dev) → revanche;
// lutador bloqueado + anúncio com recompensa; console sem erro e sem 404; bytes baixados até o título e até a luta.
// Uso: RK_URL=http://localhost:5228/ node tests/publish.mjs [larg] [alt] [saida_prints]
//      (servidor: npm run dev  ou  npx vite preview --port 5228 para testar o build)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { LOCK_ORDER } from '../src/platform/unlocks.js';

const [W = '540', H = '960', OUT = 'videos/snap/publish'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5228/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: +W, height: +H, isMobile: +W < +H, hasTouch: +W < +H, deviceScaleFactor: 1 });
mkdirSync(OUT, { recursive: true });

let ok = true;
const check = (name, cond, extra = '') => { ok &&= !!cond; console.log(`${cond ? 'OK    ' : 'FALHOU'} ${name} ${extra}`); };
const errors = [], bad = [], external = [];
let bytes = 0;
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
page.on('request', (r) => { const u = new URL(r.url()); if (!/^(127\.0\.0\.1|localhost)$/.test(u.hostname) && u.protocol.startsWith('http')) external.push(r.url()); });
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');
cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
const MB = (b) => `${(b / 1048576).toFixed(2)} MB`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = (fn, ms = 60000, arg) => page.waitForFunction(fn, { timeout: ms, polling: 100 }, arg);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80 });
const devlog = () => page.evaluate(() => window.__rk.platform.adapter.log.join(' > '));

// ---------- 1. título ----------
const t0 = Date.now();
await page.goto(`${BASE}?platform=dev&locks=1&msaa=0`, { waitUntil: 'domcontentloaded' });
await waitFor(() => document.querySelector('.title:not(.hidden) .tplay'));
const tTitle = Date.now() - t0;
await waitFor(() => document.querySelector('.tload.done'));
const tReady = Date.now() - t0;
await sleep(600);
check('título visível', true, `(${tTitle} ms; jogo pronto em ${tReady} ms; ${MB(bytes)} baixados até aqui)`);
await shot('01_titulo');
const bytesTitle = bytes;

// ---------- 2. lutador bloqueado + anúncio com recompensa ----------
await page.click('.tchoose');
await waitFor(() => document.querySelector('.select:not(.hidden)'));
const locked = await page.$$eval('.char.locked', (els) => els.map((e) => e.dataset.id));
check('lutadores novos bloqueados com ?locks=1', locked.join() === LOCK_ORDER.join(), locked.join(','));
await page.click(`.char[data-id="${locked[0]}"]`);
await waitFor(() => document.querySelector('.unlockAsk'));
await shot('02_bloqueado');
await page.click('.uwatch');
await waitFor(() => document.querySelector('.fakead'), 5000);
check('anúncio com recompensa pausa o jogo', (await page.evaluate(() => window.__rk.paused)).includes('ad'));
await waitFor(() => !document.querySelector('.fakead'), 8000);
await sleep(200);
check('recompensa libera o lutador', !(await page.$(`.char.locked[data-id="${locked[0]}"]`)));
await page.click('.sback');

// ---------- 3. JOGAR (luta rápida) com tela de carregamento ----------
await waitFor(() => document.querySelector('.title:not(.hidden)'));
const b0 = bytes;
await page.click('.tplay');
await waitFor(() => document.querySelector('.fightload:not(.hidden)'), 5000).catch(() => {});
await shot('03_carregando');
await waitFor(() => window.__rk.match && document.querySelector('.fightload.hidden'), 90000);
const fight = await page.evaluate(() => window.__rk.match.fighters.map((f) => f.data.id).join(' x '));
check('luta começou após carregar', true, `${fight} · ${MB(bytes - b0)} baixados para a luta`);
await sleep(2500);
const sources = await page.evaluate(() => window.__rk.views().map((v) => v.source).join(','));
check('lutadores em GLB (sem placeholder)', !sources.includes('placeholder'), sources);
await shot('04_luta');
check('gameplayStart chamado', (await devlog()).includes('gameplayStart'));

// ---------- 4. aba escondida: pausa + silêncio; volta pausada esperando o jogador ----------
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
});
const f1 = await page.evaluate(() => window.__rk.match.frame);
await sleep(700);
const f2 = await page.evaluate(() => window.__rk.match.frame);
const pausedState = await page.evaluate(() => ({ holds: window.__rk.paused, ctx: window.__rk.audio.engine.ctx?.state ?? 'sem-ctx' }));
check('aba escondida congela a luta', f1 === f2 && pausedState.holds.includes('hidden'), JSON.stringify(pausedState));
check('gameplayStop ao esconder', (await devlog()).endsWith('gameplayStop'));
await page.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
});
await sleep(300);
check('volta com menu de pausa', await page.$eval('.pausemenu', (e) => !e.classList.contains('hidden')));
await shot('05_pausa');
await page.click('.presume');
await sleep(500);
const f3 = await page.evaluate(() => window.__rk.match.frame);
check('CONTINUAR retoma a luta', f3 > f2, `frame ${f2} → ${f3}`);

// ---------- 5. contexto WebGL perdido e recuperado ----------
await page.evaluate(() => window.__rk.stage.renderer.forceContextLoss());
await sleep(400);
check('contexto perdido pausa', (await page.evaluate(() => window.__rk.paused)).includes('context'));
await page.evaluate(() => window.__rk.stage.renderer.forceContextRestore());
await waitFor(() => !window.__rk.paused.includes('context'), 10000);
await sleep(1200);
await shot('06_contexto_restaurado');
check('contexto restaurado e luta seguindo', (await page.evaluate(() => window.__rk.match.frame)) > f3);

// ---------- 6. fim da luta → resultado → intervalo comercial → revanche ----------
for (let i = 0; i < 3 && !(await page.$('.result:not(.hidden)')); i++) {
  await waitFor(() => window.__rk.match.phase === 'fight', 30000).catch(() => {});
  await page.evaluate(() => { const m = window.__rk.match; m.fighters[1].hp = 0; m.onKO(m.fighters[0], m.fighters[1]); });
  await sleep(5000);
}
await waitFor(() => document.querySelector('.result:not(.hidden) .again'), 30000);
await shot('07_resultado');
check('botão compartilhar no resultado', !!(await page.$('.result .share')));
const before = await devlog();
await page.click('.result .again');
await waitFor(() => document.querySelector('.fakead'), 5000).catch(() => {});
check('intervalo comercial antes da revanche', (await devlog()).slice(before.length).includes('commercialBreak(rematch)'));
await waitFor(() => window.__rk.match && window.__rk.match.phase !== 'matchEnd' && document.querySelector('.fightload.hidden'), 60000);
check('revanche começou', true);

// ---------- resumo ----------
const real404 = bad.filter((b) => !b.includes('favicon'));
check('nenhum 404 / erro HTTP', real404.length === 0, real404.join(' | '));
check('nenhuma requisição externa', external.length === 0, external.slice(0, 3).join(' | '));
check('console sem erro', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(`bytes: até o título pronto ${MB(bytesTitle)} · total da sessão ${MB(bytes)}`);
await browser.close();
process.exit(ok ? 0 : 1);
