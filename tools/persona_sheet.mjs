// Contact sheet de PERSONALIDADE: entrada do round · guarda (idle) · vitória de cada lutador, lado a lado.
// Prova que ninguém "dança igual". Uma página por par (modo 2p sem input: ficam parados na guarda).
// Uso: RK_URL=http://localhost:5233/ node tools/persona_sheet.mjs videos/v6/idle_sheet.jpg [p1:p2,p1:p2,...]
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const out = process.argv[2] || 'videos/v6/idle_sheet.jpg';
const PAIRS = (process.argv[3] || 'lulacio:xandor,capitao-brasa:dino-supremo,nikolas:flavio,vorcaro:duval,erika:dilma,haddad:boulos,renan:lulacio')
  .split(',').map((p) => p.split(':'));
const BASE = process.env.RK_URL || 'http://localhost:5199/';
const tmp = join(dirname(out), '_sheet_tmp');
mkdirSync(tmp, { recursive: true });
const SHOTS = [['ENTRADA', 1.0], ['GUARDA', 3.0], ['VITORIA', 4.3]];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  defaultViewport: { width: 540, height: 960 },
});
const cells = new Map(); // id → [arquivos dos 3 quadros]
for (const [a, b] of PAIRS) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[página]', e.message));
  await page.goto(`${BASE}?p1=${a}&p2=${b}&mode=2p&msaa=0&manual=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { for (let i = 0; i < 10; i++) window.__rk.advance(0); });
  let t = 0;
  for (const [name, at] of SHOTS) {
    if (name === 'VITORIA') { // força a pose de vitória dos dois (sem precisar nocautear)
      await page.evaluate(() => { const m = window.__rk.match; m.phase = 'roundEnd'; m.phaseT = -600; m.fighters.forEach((f) => f.setState('victory', 'victory')); });
    }
    while (t < at - 1e-6) { await page.evaluate((d) => window.__rk.advance(d), 1 / 60); t += 1 / 60; }
    const f = join(tmp, `${a}_${b}_${name}.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 90 });
    for (const [slot, id] of [[0, a], [1, b]]) {
      if (!cells.has(id) || cells.get(id).slot === slot) {
        const c = cells.get(id) || { slot, files: [] };
        c.files.push([f, slot, name]); cells.set(id, c);
      }
    }
    console.log(a, b, name);
  }
  await page.close();
}
await browser.close();

// cada lutador: 3 recortes (170×250) com rótulo → célula 510×270; grade de 4 colunas
const FONT = "fontfile='C\\:/Windows/Fonts/arialbd.ttf'";
const cellFiles = [];
for (const [id, c] of cells) {
  const inputs = [], parts = [];
  c.files.forEach(([f, slot, name], i) => {
    inputs.push('-i', f);
    parts.push(`[${i}]crop=170:250:${slot ? 370 : 0}:560,drawtext=${FONT}:text='${name}':x=6:y=6:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.6[c${i}]`);
  });
  const cf = join(tmp, `cell_${id}.jpg`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex',
    `${parts.join(';')};[c0][c1][c2]hstack=3,pad=510:276:0:26:color=0x111111,drawtext=${FONT}:text='${id.toUpperCase()}':x=8:y=4:fontsize=19:fontcolor=0xffd400`, cf]);
  cellFiles.push(cf);
}
const COLS = 4;
while (cellFiles.length % COLS) cellFiles.push(null);
const rows = [];
for (let r = 0; r < cellFiles.length / COLS; r++) rows.push(cellFiles.slice(r * COLS, r * COLS + COLS));
const inputs = [], filt = [];
let n = 0;
rows.forEach((row, r) => {
  const labels = row.map((f) => {
    if (f) { inputs.push('-i', f); return `[${n++}]`; }
    inputs.push('-f', 'lavfi', '-i', 'color=c=0x111111:s=510x276:d=1'); return `[${n++}]`;
  });
  filt.push(`${labels.join('')}hstack=${COLS}[r${r}]`);
});
filt.push(`${rows.map((_, r) => `[r${r}]`).join('')}vstack=${rows.length}`);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', filt.join(';'), '-frames:v', '1', '-q:v', '3', out]);
rmSync(tmp, { recursive: true, force: true });
console.log('contact sheet:', out);
