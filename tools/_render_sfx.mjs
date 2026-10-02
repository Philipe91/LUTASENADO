import { render } from '../src/audio/synth.js';
import { SFX } from '../src/audio/sfxBank.js';
import { writeFileSync } from 'node:fs';
const sr = 44100;
for (const name of process.argv.slice(2)) {
  const def = SFX[name]; const x = render(def.layers, sr); const g = def.gain ?? 1;
  const dv = new DataView(new ArrayBuffer(44 + x.length * 2));
  const w = (o, s) => [...s].forEach((c, k) => dv.setUint8(o + k, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + x.length * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, 'data'); dv.setUint32(40, x.length * 2, true);
  x.forEach((v, k) => dv.setInt16(44 + k * 2, Math.max(-1, Math.min(1, v * g)) * 32767, true));
  writeFileSync(`videos/noite/narr/sfx_${name}.wav`, Buffer.from(dv.buffer)); console.log('ok', name);
}
