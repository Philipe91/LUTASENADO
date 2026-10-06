// Confere as vozes no navegador: abre uma luta demo, libera o áudio (clique), registra cada voz tocada,
// 404s e erros de console. Uso: RK_URL=http://localhost:5235/ node tests/voices_browser.mjs [p1] [p2] [segundos]
import puppeteer from 'puppeteer-core';
const [p1 = 'lulacio', p2 = 'dilma', secs = '30'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5235/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
const errors = [], notFound = [], voiceReq = [];
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300)); });
page.on('response', (r) => {
  if (r.status() >= 400) notFound.push(r.status() + ' ' + r.url());
  if (r.url().includes('/audio/voices/')) voiceReq.push(r.url().split('/voices/')[1]);
});
await page.goto(`${BASE}?p1=${p1}&p2=${p2}&mode=demo&msaa=0&placeholder=1`, { waitUntil: 'networkidle2' });
await page.mouse.click(320, 180); // gesto → AudioContext liberado
await page.evaluate(() => {
  const v = window.__rk.audio.voices;
  window.__voiceLog = [];
  const orig = v.play.bind(v);
  v.play = (key, voice, event, o) => {
    const ok = orig(key, voice, event, o);
    window.__voiceLog.push({ t: +(performance.now() / 1000).toFixed(2), key, set: voice.set, event, ok, prio: o?.priority });
    return ok;
  };
});
await new Promise((r) => setTimeout(r, Number(secs) * 1000));
const res = await page.evaluate(() => ({
  ctx: window.__rk.audio.engine.ctx?.state,
  buffers: window.__rk.audio.voices.buffers.size,
  sets: [...window.__rk.audio.voices.sets.keys()],
  ext: window.__rk.audio.voices.ext,
  played: window.__rk.audio.voices.played,
  log: window.__voiceLog,
}));
console.log(`ctx=${res.ctx} ext=${res.ext} sets=${res.sets.join(',')} buffers=${res.buffers} voice files baixados=${voiceReq.length}`);
const by = {};
for (const l of res.log) { const k = `${l.set}/${l.event}/${l.ok ? 'tocou' : 'descartada'}`; by[k] = (by[k] || 0) + 1; }
console.log('vozes:', by);
console.log('primeiras:', res.log.slice(0, 12).map((l) => `${l.t}s P${l.key + 1} ${l.event}${l.ok ? '' : '(x)'}`).join(' | '));
console.log('404/erros HTTP:', notFound.length ? notFound : 'nenhum');
console.log('erros de console:', errors.length ? errors : 'nenhum');
await browser.close();
process.exit(res.played > 0 && !notFound.length && !errors.length ? 0 : 1);
