// Renderiza a trilha procedural (src/audio/Music.js) em WAV via OfflineAudioContext (Chrome headless + vite).
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
const [secs = '80', out = 'videos/noite/narr/music.wav'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.goto('http://localhost:5199/?mute=1', { waitUntil: 'domcontentloaded' });
const b64 = await page.evaluate(async (secs) => {
  const { Music } = await import('/src/audio/Music.js');
  const sr = 44100, ctx = new OfflineAudioContext(2, Math.ceil(sr * secs), sr);
  const bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(ctx.destination);
  const m = new Music({ ctx, musicBus: bus, running: true });
  const STEP = 60 / 144 / 4; let t = 0.05, i = 0;
  while (t < secs - 0.2) { m.playStep(i, t); t += STEP; i = (i + 1) % 128; }
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length;
  const dv = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => [...s].forEach((c, k) => dv.setUint8(o + k, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 2, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
  w(36, 'data'); dv.setUint32(40, n * 4, true);
  for (let k = 0; k < n; k++) { dv.setInt16(44 + k * 4, Math.max(-1, Math.min(1, L[k])) * 32767, true); dv.setInt16(46 + k * 4, Math.max(-1, Math.min(1, R[k])) * 32767, true); }
  let s = ''; const u8 = new Uint8Array(dv.buffer);
  for (let k = 0; k < u8.length; k += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
  return btoa(s);
}, Number(secs));
writeFileSync(out, Buffer.from(b64, 'base64'));
console.log('ok', out);
await browser.close();
