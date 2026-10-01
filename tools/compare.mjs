// Monta comparações antes/depois (lado a lado, com rótulo) para videos/equipe. Usa o sharp já instalado.
// Uso: node tools/compare.mjs saida.png "Rótulo A" a.jpg "Rótulo B" b.jpg ["Rótulo C" c.jpg ...]
import sharp from 'sharp';
const [out, ...rest] = process.argv.slice(2);
const items = [];
for (let i = 0; i < rest.length; i += 2) items.push({ label: rest[i], file: rest[i + 1] });
const H = 720, LABEL = 44, GAP = 12;
const tiles = [];
for (const it of items) {
  const img = sharp(it.file);
  const meta = await img.metadata();
  const w = Math.round((meta.width * H) / meta.height);
  const buf = await img.resize(w, H).png().toBuffer();
  const svg = Buffer.from(`<svg width="${w}" height="${LABEL}"><rect width="100%" height="100%" fill="#0b0b12"/><text x="14" y="30" font-family="Arial Black, Arial" font-weight="900" font-size="22" fill="#ffd400">${it.label}</text></svg>`);
  tiles.push({ w, buf, svg });
}
const W = tiles.reduce((s, t) => s + t.w, 0) + GAP * (tiles.length - 1);
const comps = [];
let x = 0;
for (const t of tiles) {
  comps.push({ input: t.svg, left: x, top: 0 });
  comps.push({ input: t.buf, left: x, top: LABEL });
  x += t.w + GAP;
}
await sharp({ create: { width: W, height: H + LABEL, channels: 3, background: '#2a2a33' } }).composite(comps).png({ compressionLevel: 9 }).toFile(out);
console.log('ok', out, W, H + LABEL);
