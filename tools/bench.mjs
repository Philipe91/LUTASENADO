// Mede FPS real (rAF) e o custo do Look no Chrome headless com GPU de verdade (ANGLE/D3D11, não SwiftShader).
// Uso: node tools/bench.mjs "<query>" [largura] [altura] [dpr]   (RK_URL=http://localhost:5199/ por padrão)
// Ex.: node tools/bench.mjs "p1=lulacio&p2=xandor&mode=demo&stats=1" 1280 720 1
//      node tools/bench.mjs "p1=lulacio&p2=xandor&mode=demo&stats=1&look=0" 390 844 3   (carga de pixels de celular)
import puppeteer from 'puppeteer-core';
const [query = 'p1=lulacio&p2=xandor&mode=demo&stats=1', W = '1280', H = '720', DPR = '1'] = process.argv.slice(2);
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars'],
  defaultViewport: { width: +W, height: +H, deviceScaleFactor: +DPR },
});
const p = await browser.newPage();
p.on('pageerror', (e) => console.error('[página]', e.message));
await p.goto(`${BASE}?${query}`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500));
const out = await p.evaluate(async () => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?';
  const fps = await new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; const dt = performance.now() - t0; if (dt < 4000) requestAnimationFrame(f); else res(n / (dt / 1000)); };
    requestAnimationFrame(f);
  });
  return { gpu, fps: fps.toFixed(1), stats: document.querySelector('.stats')?.textContent, px: [innerWidth * devicePixelRatio, innerHeight * devicePixelRatio] };
});
console.log(JSON.stringify(out));
await browser.close();
