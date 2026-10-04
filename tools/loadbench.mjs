// Mede o carregamento com rede simulada (cache desligado): tempo até a 1ª tela interativa e até a luta
// estar JOGÁVEL com os modelos 3D de verdade (sem boneco provisório), e quantos MB desceram em cada etapa.
// Uso: node tools/loadbench.mjs <url> [new|base] [4g|slow4g|wifi] [larg] [alt]
//   new  = build atual (título → JOGAR)   ·   base = build antigo (seleção → LUTAR!)
// Ex.: npx vite preview --port 5228  →  node tools/loadbench.mjs "http://localhost:5228/?quality=medium" new 4g 540 960
import puppeteer from 'puppeteer-core';

const [url, kind = 'new', net = '4g', W = '1280', H = '720'] = process.argv.slice(2);
const NET = { // download/upload em bytes/s, latência em ms (perfis do DevTools/Lighthouse)
  slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  '4g': { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 },
  wifi: { latency: 20, downloadThroughput: (30 * 1024 * 1024) / 8, uploadThroughput: (15 * 1024 * 1024) / 8 },
}[net];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: +W, height: +H, isMobile: +W < +H, hasTouch: +W < +H });
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.setBypassServiceWorker', { bypass: true }); // mede a rede de verdade (1ª visita)
await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET });
let bytes = 0;
cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
const wait = (fn) => page.waitForFunction(fn, { timeout: 240000, polling: 50 });
const MB = (b) => (b / 1048576).toFixed(2);
const t0 = Date.now();
const mark = (label) => console.log(`${label.padEnd(34)} ${((Date.now() - t0) / 1000).toFixed(2)} s   ${MB(bytes)} MB`);
await page.goto(url, { waitUntil: 'domcontentloaded' });
if (kind === 'new') {
  await wait(() => document.querySelector('.title:not(.hidden) .tplay'));
  mark('título interativo');
  await wait(() => document.querySelector('.tload.done'));
  mark('jogo pronto (JOGAR libera)');
  await page.click('.tplay');
  if (process.env.RK_SHOT) { await new Promise((r) => setTimeout(r, 1200)); await page.screenshot({ path: process.env.RK_SHOT, type: 'jpeg', quality: 80 }); }
} else {
  await wait(() => document.querySelector('.select .go') && window.__rk);
  mark('seleção interativa');
  await page.click('.go');
}
await wait(() => window.__rk?.match);
mark('luta começou');
await wait(() => window.__rk.views().every((v) => v.source === 'glb'));
mark('luta jogável com modelos 3D');
await new Promise((r) => setTimeout(r, 3000));
mark('+3 s (downloads em segundo plano)');
await browser.close();
