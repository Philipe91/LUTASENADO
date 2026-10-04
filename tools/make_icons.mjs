// Ícones do PWA / portais (public/icons): 192, 512, 512 maskable, 180 (Apple) e capa 16:9 para os portais.
// Uso: node tools/make_icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });
const svg = (w, h, pad = 0) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g" cx="50%" cy="0%" r="110%"><stop offset="0" stop-color="#7c3aed"/><stop offset=".55" stop-color="#1c1033"/><stop offset="1" stop-color="#0b0b12"/></radialGradient>
    <pattern id="s" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="18" height="36" fill="#ffffff0d"/></pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#s)"/>
  <g transform="translate(${w / 2} ${h / 2}) rotate(-4) skewX(-8)">
    <text x="0" y="${h * 0.02}" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="${Math.min(w, h) * (pad ? 0.36 : 0.46)}"
      fill="#ffd400" stroke="#000" stroke-width="${Math.min(w, h) * 0.03}" paint-order="stroke" style="filter:drop-shadow(0 0 0 #000)">RK</text>
    <text x="0" y="${h * (pad ? 0.2 : 0.27)}" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="${Math.min(w, h) * (pad ? 0.085 : 0.11)}"
      fill="#fff" stroke="#000" stroke-width="${Math.min(w, h) * 0.014}" paint-order="stroke" letter-spacing="2">KOMBAT</text>
  </g>
</svg>`);

await sharp(svg(512, 512)).png().toFile('public/icons/icon-512.png');
await sharp(svg(512, 512)).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg(512, 512)).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
await sharp(svg(512, 512, 1)).png().toFile('public/icons/icon-512-maskable.png'); // conteúdo dentro da zona segura (80%)
await sharp(svg(512, 512)).resize(48, 48).png().toFile('public/icons/favicon-48.png');
console.log('ícones em public/icons');
