// Kit de cenário: peças baratas e reutilizáveis pelas arenas (céu, nuvens, geometria assada, pano, plateia).
// Regra de orçamento: tudo que é estático vira UMA malha com cor por vértice (luz e névoa "assadas"),
// tudo que se repete vira InstancedMesh, e o que mexe (bandeira, plateia, nuvem) mexe no vertex shader.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { exists } from '../../platform/assets.js';

const FONT = "'Bangers', 'Arial Black', Impact, sans-serif";

export function canvasTex(w, h, draw, { repeat, srgb = true, mips = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.generateMipmaps = mips;
  t.anisotropy = 4;
  t.userData.redraw = () => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; };
  return t;
}

// gerador pseudo-aleatório com semente (o cenário sai igual em todo carregamento — bom pra comparar prints)
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const _n = new THREE.Vector3(), _c = new THREE.Color(), _h = new THREE.Color();

export function lin(hex) { return new THREE.Color(hex); }

// ---------- Geometria assada ----------
// Junta peças estáticas numa malha só (1 draw call), com luz de sol + ambiente + AO de chão + névoa por camada
// calculados na CPU. MeshBasicMaterial: zero custo de luz no celular.
export class Baker {
  constructor({ L = [0.5, 0.6, 0.6], sun = 0xffd2a8, amb = 0x6a5a86, haze = 0xe9a77a, sky = null } = {}) {
    this.L = new THREE.Vector3(...L).normalize();
    this.sun = lin(sun); this.amb = lin(amb); this.haze = lin(haze);
    this.sky = sky ? lin(sky) : null; // luz de céu vinda de cima (faces de topo mais claras)
    this.parts = [];
  }

  // opts: pos [x,y,z], rot [x,y,z], scale [x,y,z]|n, haze 0..1, smooth, emissive 0..1 (ignora luz), ao (altura do AO), grad [cor do topo, y0, y1]
  add(geo, color, opts = {}) {
    const { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, haze = 0, smooth = false, emissive = 0, ao = 1.2, aoMin = 0.72, top = null } = opts;
    const sc = Array.isArray(scale) ? scale : [scale, scale, scale];
    _m.compose(_v.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...sc));
    let g = geo.clone().applyMatrix4(_m);
    g = g.index ? g.toNonIndexed() : g;
    if (!smooth || !g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal;
    const col = new Float32Array(P.count * 3);
    const base = lin(color), topC = top ? lin(top[0]) : null;
    for (let i = 0; i < P.count; i++) {
      _n.fromBufferAttribute(N, i);
      const y = P.getY(i);
      _c.copy(base);
      if (topC) _c.lerp(topC, THREE.MathUtils.smoothstep(y, top[1], top[2]));
      if (emissive < 1) {
        const d = Math.max(0, _n.dot(this.L));
        const up = this.sky ? Math.max(0, _n.y) * 0.35 : 0;
        _h.copy(this.amb);
        _h.r += this.sun.r * d; _h.g += this.sun.g * d; _h.b += this.sun.b * d;
        if (this.sky) { _h.r += this.sky.r * up; _h.g += this.sky.g * up; _h.b += this.sky.b * up; }
        const lit = _c.clone().multiply(_h);
        _c.lerp(lit, 1 - emissive);
      }
      const a = ao > 0 ? THREE.MathUtils.lerp(aoMin, 1, THREE.MathUtils.clamp((y - (opts.groundY ?? 0)) / ao, 0, 1)) : 1;
      _c.multiplyScalar(a).lerp(this.haze, haze);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', P);
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(out);
    return this;
  }

  box(w, h, d, color, opts = {}) { return this.add(new THREE.BoxGeometry(w, h, d), color, opts); }

  build(matOpts = {}) {
    const g = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, ...matOpts }));
    m.matrixAutoUpdate = false;
    return m;
  }
}

// ---------- Céu em gradiente (shader, 1 draw call) ----------
// stops: cores de baixo pra cima por altura angular; sol = brilho suave + disco; stars = pontos procedurais (noite)
export function makeSky({ zenith, upper, mid, horizon, below, sunDir = [0.35, 0.08, -1], sunCol = 0xffe0a0, sunSize = 0.02, glow = 0.5, stars = 0, moon = null }) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      cZ: { value: lin(zenith) }, cU: { value: lin(upper) }, cM: { value: lin(mid) }, cH: { value: lin(horizon) }, cB: { value: lin(below) },
      sunDir: { value: new THREE.Vector3(...sunDir).normalize() }, sunCol: { value: lin(sunCol) }, sunSize: { value: sunSize }, glow: { value: glow },
      stars: { value: stars }, moonDir: { value: new THREE.Vector3(...(moon || [0, 1, 0])).normalize() }, moon: { value: moon ? 1 : 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 cZ, cU, cM, cH, cB, sunCol, sunDir, moonDir; uniform float sunSize, glow, stars, moon, uTime;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 c = mix(cH, cM, smoothstep(0.0, 0.07, y));
        c = mix(c, cU, smoothstep(0.05, 0.2, y));
        c = mix(c, cZ, smoothstep(0.18, 0.5, y));
        c = mix(cB, c, smoothstep(-0.06, 0.0, y));
        float s = max(0.0, dot(d, sunDir));
        c += sunCol * (pow(s, 6.0) * glow * 0.55 + pow(s, 60.0) * glow * 0.8);
        c = mix(c, sunCol * 1.6, smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.7, s));
        if (stars > 0.0) {
          vec2 g = vec2(atan(d.x, d.z) * 120.0, y * 150.0);
          vec2 id = floor(g); vec2 f = fract(g) - 0.5;
          float h = hash(id);
          float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
          float st = step(0.985, h) * smoothstep(0.32, 0.0, length(f)) * tw * smoothstep(0.05, 0.35, y);
          c += vec3(st) * stars;
        }
        if (moon > 0.0) {
          float m = dot(d, normalize(moonDir));
          c += vec3(0.75, 0.8, 1.0) * pow(max(m, 0.0), 300.0) * 0.5;
          float disc = smoothstep(0.99945, 0.9996, m);
          vec3 mc = vec3(1.0, 0.97, 0.88) * (0.85 + 0.15 * sin(d.x * 900.0) * sin(d.y * 700.0));
          c = mix(c, mc, disc);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(460, 24, 12), mat);
  m.renderOrder = -10;
  m.frustumCulled = false;
  return m;
}

// ---------- Nuvens: quads mesclados num mesh só, deriva no vertex shader ----------
function cloudAtlas() {
  return canvasTex(512, 256, (g) => {
    const r = rng(7);
    g.clearRect(0, 0, 512, 256);
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell % 2) * 256, oy = Math.floor(cell / 2) * 128;
      const n = 9 + Math.floor(r() * 6);
      for (let i = 0; i < n; i++) {
        const x = ox + 40 + r() * 176, base = oy + 92;
        const rad = 16 + r() * 30 * (1 - Math.abs(x - ox - 128) / 160);
        const y = base - rad * (0.3 + r() * 0.6);
        const grd = g.createRadialGradient(x, y, rad * 0.2, x, y, rad);
        grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.65, 'rgba(255,255,255,0.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      }
      // base achatada (cúmulo de fim de tarde)
      g.save(); g.globalCompositeOperation = 'destination-out';
      const cut = g.createLinearGradient(0, oy + 92, 0, oy + 112);
      cut.addColorStop(0, 'rgba(0,0,0,0)'); cut.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = cut; g.fillRect(ox, oy + 92, 256, 36);
      g.restore();
    }
  }, { srgb: false });
}

// clouds: [{x,y,z,w,cell,speed}] — cores: base (sombra) e topo (lado iluminado)
export function makeClouds(list, { lit, shade, rim = null, opacity = 0.9, U }) {
  const geos = [];
  for (const c of list) {
    const g = new THREE.PlaneGeometry(c.w, c.w * (c.aspect ?? 0.5));
    const cu = (c.cell % 2) * 0.5, cv = 0.5 - Math.floor(c.cell / 2) * 0.5; // canvas y pra baixo → v pra cima
    const uv = g.attributes.uv, n = uv.count;
    const loc = new Float32Array(n * 2), drift = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      loc[i * 2] = u; loc[i * 2 + 1] = v;
      uv.setXY(i, cu + u * 0.5, cv + v * 0.5);
      drift[i * 2] = c.speed ?? 0.4; drift[i * 2 + 1] = c.span ?? 600;
    }
    g.setAttribute('aLocal', new THREE.BufferAttribute(loc, 2));
    g.setAttribute('aDrift', new THREE.BufferAttribute(drift, 2));
    if (c.flip) g.scale(-1, 1, 1);
    g.translate(c.x, c.y, c.z);
    geos.push(g);
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { map: { value: cloudAtlas() }, cLit: { value: lin(lit) }, cShade: { value: lin(shade) }, cRim: { value: lin(rim ?? lit) }, uTime: U.time, opacity: { value: opacity } },
    vertexShader: /* glsl */`
      attribute vec2 aLocal; attribute vec2 aDrift; uniform float uTime;
      varying vec2 vUv; varying vec2 vLocal;
      void main() {
        vUv = uv; vLocal = aLocal;
        vec3 p = position;
        p.x = mod(p.x + uTime * aDrift.x + aDrift.y * 0.5, aDrift.y) - aDrift.y * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform vec3 cLit, cShade, cRim; uniform float opacity;
      varying vec2 vUv; varying vec2 vLocal;
      void main() {
        float a = texture2D(map, vUv).a;
        vec3 c = mix(cShade, cLit, smoothstep(0.3, 0.85, vLocal.y));
        c = mix(c, cRim, smoothstep(0.55, 0.15, a) * 0.6);
        gl_FragColor = vec4(c, a * opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -9;
  m.frustumCulled = false;
  return m;
}

// ---------- Panos: bandeiras e faixas num mesh só, ondulando no vertex shader ----------
// Atlas 1024x1024: faixas ocupam as 4 linhas de cima (1024x128), bandeiras as 2 linhas de baixo (4 colunas de 256x256, desenho 256x176)
export const BANNERS = [
  { text: 'O POVO QUER PICANHA', bg: '#c8102e', fg: '#fff3d6', stripe: '#ffd23f' },
  { text: 'CANETADA NÃO!', bg: '#1f3f8f', fg: '#ffffff', stripe: '#ffd23f' },
  { text: 'FORA TODO MUNDO', bg: '#f4ecd8', fg: '#1b1b1b', stripe: '#1a8a3d' },
  { text: 'REPÚBLICA KOMBAT', bg: '#11823b', fg: '#ffe14d', stripe: '#ffffff' },
];
export function clothAtlas(flags, banners = BANNERS) {
  return canvasTex(1024, 1024, (g) => {
    g.clearRect(0, 0, 1024, 1024);
    banners.slice(0, 4).forEach((b, i) => {
      const y = i * 128;
      g.fillStyle = b.bg; g.fillRect(0, y, 1024, 128);
      g.fillStyle = b.stripe; g.fillRect(0, y + 8, 1024, 8); g.fillRect(0, y + 112, 1024, 8);
      g.fillStyle = b.fg; g.font = `86px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.text, 512, y + 68, 960);
    });
    flags.forEach((draw, i) => {
      const x = (i % 4) * 256, y = 512 + Math.floor(i / 4) * 256;
      g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, 256, 176); g.clip(); draw(g, 256, 176); g.restore();
    });
  });
}
export const FLAG_DRAW = {
  brasil(g, w, h) {
    g.fillStyle = '#119a45'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w - 16, h / 2); g.lineTo(w / 2, h - 14); g.lineTo(16, h / 2); g.closePath(); g.fill();
    g.fillStyle = '#1d3a8a'; g.beginPath(); g.arc(w / 2, h / 2, 44, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2 + 70, 82, Math.PI * 1.3, Math.PI * 1.7); g.stroke();
  },
  partidoEstrela(g, w, h) { // partido fictício: estrela + sigla
    g.fillStyle = '#d0142c'; g.fillRect(0, 0, w, h);
    star(g, 70, h / 2, 46, '#fff');
    g.fillStyle = '#fff'; g.font = `64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PKB', 176, h / 2 + 4);
  },
  partidoVerde(g, w, h) {
    g.fillStyle = '#16843f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd400'; g.fillRect(0, h * 0.36, w, h * 0.28);
    g.fillStyle = '#16843f'; g.font = `56px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VOTE 00', w / 2, h / 2 + 3);
  },
  toga(g, w, h) {
    g.fillStyle = '#1b2a55'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f2d27a'; g.lineWidth = 7; g.beginPath(); g.moveTo(w / 2, 34); g.lineTo(w / 2, 140); g.moveTo(64, 64); g.lineTo(192, 64); g.stroke();
    g.fillStyle = '#f2d27a'; g.beginPath(); g.arc(64, 98, 26, 0, Math.PI); g.arc(192, 98, 26, 0, Math.PI); g.fill();
    g.fillRect(100, 136, 56, 10);
  },
  amarela(g, w, h) {
    g.fillStyle = '#ffcc00'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0f6a35'; g.font = `60px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TALKEY', w / 2, h / 2 + 4);
  },
  branca(g, w, h) {
    g.fillStyle = '#f5f0e6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c8102e'; g.font = `50px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PAZ & AMOR', w / 2, h / 2 + 4);
  },
};
function star(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

// items: {type:'flag'|'banner', idx, w, h, pos:[x,y,z], amp, tint}
// flag: presa na borda esquerda (mastro), onda cresce até a ponta · banner: presa nas duas pontas, barriga no meio
export function makeCloth(items, atlas, U, { tint = 0xffffff, haze = 0xffffff, hazeAmt = 0 } = {}) {
  const geos = [];
  const r = rng(11);
  for (const it of items) {
    const seg = it.type === 'flag' ? [10, 4] : [14, 2];
    const g = new THREE.PlaneGeometry(it.w, it.h, seg[0], seg[1]);
    g.translate(it.type === 'flag' ? it.w / 2 : 0, 0, 0);
    const uv = g.attributes.uv, n = uv.count, cl = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let u0, v0, du, dv;
    if (it.type === 'banner') { u0 = 0; du = 1; v0 = 1 - (it.idx + 1) * 0.125; dv = 0.125; }
    else { u0 = (it.idx % 4) * 0.25; du = 0.25; v0 = 0.5 - Math.floor(it.idx / 4) * 0.25 - 0.25 + (80 / 1024); dv = 176 / 1024; }
    const seed = r() * 6.28, c = lin(it.tint ?? tint).lerp(lin(haze), it.haze ?? hazeAmt);
    for (let i = 0; i < n; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i, u0 + u * du, v0 + v * dv);
      const env = it.type === 'flag' ? u : Math.sin(Math.PI * u) * 0.6;
      cl[i * 3] = env; cl[i * 3 + 1] = seed - u * (it.type === 'flag' ? 5.5 : 3.0) + v * 0.6; cl[i * 3 + 2] = it.amp ?? (it.type === 'flag' ? 0.12 * it.w : 0.06);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('aCloth', new THREE.BufferAttribute(cl, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('normal');
    g.translate(...it.pos);
    geos.push(g);
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mat = new THREE.MeshBasicMaterial({ map: atlas, side: THREE.DoubleSide, vertexColors: true });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time;
    s.vertexShader = 'uniform float uTime;\nattribute vec3 aCloth;\nvarying float vShade;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float ph = aCloth.y + uTime * 4.2;
      transformed.z += sin(ph) * aCloth.x * aCloth.z;
      transformed.y -= (1.0 - cos(ph * 0.5)) * aCloth.x * aCloth.z * 0.15;
      vShade = 1.0 - 0.22 * aCloth.x * (0.5 + 0.5 * cos(ph));`);
    s.fragmentShader = 'varying float vShade;\n' + s.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb *= vShade;');
  };
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

// ---------- Plateia: recortes de papelão (2 tris cada) instanciados, pulando no vertex shader ----------
function crowdAtlas() {
  // 4 poses em 128x256: braços baixos, bandeirinha, cartaz, comemorando (usada quando a energia sobe)
  return canvasTex(512, 256, (g) => {
    g.clearRect(0, 0, 512, 256);
    for (let p = 0; p < 4; p++) {
      g.save(); g.translate(p * 128, 0);
      const grd = g.createLinearGradient(0, 30, 0, 256);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.45, '#e2e2e2'); grd.addColorStop(1, '#6d6d6d');
      g.fillStyle = grd; g.strokeStyle = grd; g.lineCap = 'round'; g.lineJoin = 'round';
      // cabeça + tronco + pernas
      g.beginPath(); g.arc(64, 62, 19, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(30, 96); g.quadraticCurveTo(64, 84, 98, 96); g.lineTo(90, 178); g.lineTo(38, 178); g.closePath(); g.fill();
      g.fillRect(40, 170, 21, 84); g.fillRect(67, 170, 21, 84);
      g.lineWidth = 15;
      const arm = (pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
      if (p === 0) { arm([34, 100, 24, 140, 26, 176]); arm([94, 100, 104, 140, 102, 176]); }
      if (p === 1) { arm([34, 100, 24, 140, 28, 176]); arm([94, 100, 108, 66, 112, 30]); g.lineWidth = 4; arm([112, 36, 112, 0]); g.fillStyle = '#ffffff'; g.fillRect(84, 2, 28, 20); }
      if (p === 2) { arm([34, 100, 26, 64, 30, 34]); arm([94, 100, 102, 64, 98, 34]); g.fillStyle = '#fafafa'; g.fillRect(8, 2, 112, 38); g.fillStyle = '#9a9a9a'; g.fillRect(18, 14, 92, 6); g.fillRect(18, 24, 70, 6); }
      if (p === 3) { arm([34, 100, 18, 64, 12, 26]); arm([94, 100, 110, 64, 116, 26]); }
      g.restore();
    }
  }, { srgb: true });
}

// Folha de sprites da plateia. Padrão: recortes de papelão desenhados acima (4 poses numa fileira).
// Slot opcional: public/assets/arena/crowd_atlas.webp — grade 6 colunas (torcedores) × 4 linhas (poses: braços
// baixos, bandeirinha, cartaz, comemorando), camiseta BRANCA (o shader tinge só as áreas sem saturação).
export const CROWD_ATLAS_URL = 'assets/arena/crowd_atlas.webp';
export function crowdSheet() {
  if (exists(CROWD_ATLAS_URL)) {
    const sheet = { tex: null, cols: 6, rows: 4, poseRows: true, cheer: 3, variants: 6, tint: 2.0, aspect: 0.5 };
    sheet.tex = new THREE.TextureLoader().load(CROWD_ATLAS_URL, (t) => {
      // proporção real da célula: o quad da plateia (0,9 × 1,8) estica/encolhe na largura para não deformar
      sheet.aspect = (t.image.width / 6) / (t.image.height / 4);
      sheet.onAspect?.(sheet.aspect);
    });
    sheet.tex.colorSpace = THREE.SRGBColorSpace;
    sheet.tex.anisotropy = 4;
    return sheet;
  }
  return { tex: crowdAtlas(), cols: 4, rows: 1, poseRows: false, cheer: 3, variants: 1, tint: 0, aspect: 0.5 };
}

// seats: [{x,y,z,s,color,pose,variant,dim}]
// opts.sheet: { tex, cols, rows, poseRows (poses nas linhas e variações nas colunas), cheer (pose de comemorar),
//   variants, tint (0 = tinge tudo; >0 = tinge só o que é cinza/branco abaixo desse brilho: pele e plaquinhas ficam),
//   aspect (largura/altura da célula), poses (sorteio da pose base) } · seat.dim: brilho das partes NÃO tingidas (TINT_MASK)
export function makeCrowd(seats, U, { sheet = crowdSheet() } = {}) {
  const geo = new THREE.PlaneGeometry(0.9, 1.8);
  geo.translate(0, 0.9, 0);
  geo.deleteAttribute('normal');
  const n = seats.length;
  const mat = new THREE.MeshBasicMaterial({ map: sheet.tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const aSeed = new Float32Array(n * 4), aVar = new Float32Array(n * 2);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  const r = rng(5);
  const pickPose = sheet.poses || ((pr) => (pr < 0.58 ? 0 : pr < 0.86 ? 1 : 2)); // braços baixos / bandeirinha / cartaz
  seats.forEach((s, i) => {
    m.makeScale(s.s * (s.flip ? -1 : 1), s.s, s.s).setPosition(s.x, s.y ?? 0, s.z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.copy(s.color));
    aSeed[i * 4] = r() * 6.28;                       // fase do balanço
    const pr = r();
    aSeed[i * 4 + 1] = s.pose ?? pickPose(pr, r);    // pose base
    aSeed[i * 4 + 2] = r();                          // empolgação (quem levanta os braços)
    aSeed[i * 4 + 3] = Math.abs(s.x) * 0.018 + r() * 0.12; // atraso da onda (sai do centro pras pontas)
    aVar[i * 2] = s.variant ?? (sheet.variants > 1 ? Math.floor(r() * sheet.variants) : 0);
    aVar[i * 2 + 1] = s.dim ?? 1;
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 4));
  geo.setAttribute('aVar', new THREE.InstancedBufferAttribute(aVar, 2));
  const uni = {
    uEnergy: { value: 0 }, uKickT: { value: -10 }, uKick: { value: 0 },
    uSheet: { value: new THREE.Vector3(sheet.cols, sheet.rows, sheet.cheer) }, uAspK: { value: sheet.aspect / 0.5 }, uTintMax: { value: sheet.tint || 2 },
  };
  sheet.onAspect = (a) => { uni.uAspK.value = a / 0.5; };
  mat.defines = {};
  if (sheet.poseRows) mat.defines.POSE_ROWS = '';
  if (sheet.tint) mat.defines.TINT_MASK = '';
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = U.time; Object.assign(s.uniforms, uni);
    s.vertexShader = 'uniform float uTime, uEnergy, uKickT, uKick, uAspK;\nuniform vec3 uSheet;\nattribute vec4 aSeed;\nattribute vec2 aVar;\nvarying float vDim;\n' + s.vertexShader
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        float pose = aSeed.y;
        if (uEnergy > 0.25 + aSeed.z * 0.5) pose = uSheet.z;
        #ifdef POSE_ROWS
          vec2 cell = vec2(aVar.x, pose);
        #else
          vec2 cell = vec2(pose, aVar.x);
        #endif
        vMapUv = (vMapUv + vec2(cell.x, uSheet.y - 1.0 - cell.y)) / uSheet.xy;
        vDim = aVar.y;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.x *= uAspK;
        float bob = abs(sin(uTime * (2.2 + aSeed.z * 2.5 + uEnergy * 4.0) + aSeed.x));
        float k = clamp((uTime - uKickT - aSeed.w) * 3.2, 0.0, 1.0);
        float hop = sin(k * 3.14159) * uKick * (0.7 + aSeed.z * 0.6);
        transformed.y += bob * (0.025 + uEnergy * 0.32) + hop * 0.75;`);
    s.fragmentShader = 'uniform float uTintMax;\nvarying float vDim;\n' + s.fragmentShader.replace('#include <color_fragment>', `
      #ifdef USE_COLOR
        #ifdef TINT_MASK
          { float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)), mn = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
            float sat = (mx - mn) / max(mx, 0.001);
            float tm = (1.0 - smoothstep(0.1, 0.22, sat)) * (1.0 - smoothstep(uTintMax - 0.04, uTintMax, mx));
            diffuseColor.rgb = mix(diffuseColor.rgb * vDim, diffuseColor.rgb * vColor, tm); } // vDim: luz/névoa do que não é tingido
        #else
          diffuseColor.rgb *= vColor;
        #endif
      #endif`);
  };
  mesh.frustumCulled = false;
  return { mesh, uni };
}

// lâmpadas/brilhos: quads aditivos mesclados (halo barato, noite)
export function makeGlows(list) {
  const tex = canvasTex(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }, { srgb: false });
  const geos = list.map((l) => {
    const g = new THREE.PlaneGeometry(l.size, l.size * (l.stretch ?? 1));
    const c = lin(l.color), col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) { col[i] = c.r * (l.k ?? 1); col[i + 1] = c.g * (l.k ?? 1); col[i + 2] = c.b * (l.k ?? 1); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('normal');
    g.translate(...l.pos);
    return g;
  });
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.renderOrder = 5;
  return m;
}

// textura de concreto + linhas de palanque, cobrindo a laje de luta inteira (não repete: as marcas ficam no lugar)
export function fightFloorTex({ W, D, z0 = 0.6, base = '#d8d0c0', joint = '#b7ad99', lines = '#ffd23f', accent = '#1a8a3d', night = false }) {
  const px = 2048, py = Math.round(2048 * D / W / 4) * 4;
  return canvasTex(px, py, (g) => {
    const r = rng(3);
    g.fillStyle = base; g.fillRect(0, 0, px, py);
    const sx = px / W, sz = py / D;
    // placas de concreto com tom variando
    const slab = 3;
    for (let x = 0; x < W; x += slab) for (let z = 0; z < D; z += slab) {
      const k = (r() - 0.5) * 18;
      g.fillStyle = `rgba(${k > 0 ? 255 : 60},${k > 0 ? 250 : 50},${k > 0 ? 240 : 40},${Math.abs(k) / 255 * 2})`;
      g.fillRect(x * sx, z * sz, slab * sx, slab * sz);
    }
    // ruído fino
    const img = g.getImageData(0, 0, px, py), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const nn = (r() - 0.5) * 22; d[i] += nn; d[i + 1] += nn; d[i + 2] += nn * 0.9; }
    g.putImageData(img, 0, 0);
    // manchas
    for (let i = 0; i < 40; i++) {
      const x = r() * px, y = r() * py, rad = 20 + r() * 90;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(70,60,50,0.10)'); grd.addColorStop(1, 'rgba(70,60,50,0)');
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // juntas
    g.strokeStyle = joint; g.lineWidth = 3;
    for (let x = 0; x <= W; x += slab) { g.beginPath(); g.moveTo(x * sx, 0); g.lineTo(x * sx, py); g.stroke(); }
    for (let z = 0; z <= D; z += slab) { g.beginPath(); g.moveTo(0, z * sz); g.lineTo(px, z * sz); g.stroke(); }
    // linhas do palanque: faixa central de luta, marcas de largada, linha do meio tracejada
    const zc = z0 * py; // z=0 dos lutadores (fração da profundidade da laje)
    const band = 1.1 * sz;
    g.globalAlpha = night ? 0.75 : 0.85;
    g.fillStyle = lines;
    g.fillRect(0, zc - band - 6, px, 10); g.fillRect(0, zc + band - 4, px, 10);
    g.fillStyle = accent;
    g.fillRect(0, zc - band - 18, px, 8); g.fillRect(0, zc + band + 10, px, 8);
    g.fillStyle = lines;
    for (let z = zc - band; z < zc + band; z += 26) g.fillRect(px / 2 - 5, z, 10, 14);
    for (const side of [-1, 1]) {
      const x = px / 2 + side * 2.6 * sx;
      g.fillRect(x - 5, zc - band * 0.55, 10, band * 1.1);
      g.fillRect(x - 24, zc - 5, 48, 10);
    }
    // estrela-selo no centro
    g.globalAlpha = night ? 0.25 : 0.32;
    g.strokeStyle = lines; g.lineWidth = 8;
    g.beginPath(); g.arc(px / 2, zc, band * 0.9, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
  });
}

export function grassTex({ a = '#8f9446', b = '#7f8a3e', dry = '#b1a35a' } = {}) {
  return canvasTex(256, 256, (g) => {
    const r = rng(9);
    g.fillStyle = a; g.fillRect(0, 0, 256, 256);
    g.globalAlpha = 0.35; g.fillStyle = b; g.fillRect(0, 0, 128, 256); g.globalAlpha = 1; // faixas de corte (sutis)
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.3 ? dry : (r() < 0.5 ? a : b);
      g.globalAlpha = 0.35 + r() * 0.4;
      g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 2 + r() * 4);
    }
    g.globalAlpha = 1;
  }, { repeat: [1, 1] });
}

// ---------- Marcos de Brasília (peças assadas) ----------
// Congresso Nacional: laje + Câmara (cúpula côncava, à esquerda de quem olha da Esplanada) + Senado (convexa) + torres gêmeas com passarela.
// win: cor das janelas (faixas escuras de dia / acesas à noite)
export function congress(B, { z = -92, white = 0xf2ece0, win = 0x8a8f9e, haze = 0.3, winEmissive = 0, scale = 1, wall = {} } = {}) {
  const S = scale, gy = -0.6;
  const o = (x, y, zz) => [x * S, gy + y * S, z + zz * S];
  B.box(48 * S, 2.6 * S, 12 * S, white, { ...wall, pos: o(0, 1.3, 0), haze, groundY: gy, aoMin: 0.6, ao: 2.6 });
  B.box(48.6 * S, 0.35 * S, 12.6 * S, 0xd9d1c2, { pos: o(0, 2.75, 0), haze });
  // colunata escura sob a laje (sombra que "levanta" o prédio)
  B.box(44 * S, 1.6 * S, 0.3 * S, 0x4a4250, { pos: o(0, 0.9, 6.05), haze: haze * 0.8 });
  // Câmara: tigela (cúpula para cima)
  const bowl = new THREE.SphereGeometry(7.4, 28, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  B.add(bowl, white, { ...wall, pos: o(-12, 2.9 + 3.3, 0), scale: [S, 0.45 * S, S], smooth: true, haze, ao: 0 });
  B.add(new THREE.CylinderGeometry(7.42, 7.42, 0.35, 28, 1, true), 0xe8e1d4, { pos: o(-12, 6.2, 0), scale: S, smooth: true, haze, ao: 0 });
  B.add(new THREE.CylinderGeometry(1.6, 2.2, 1.0, 12), 0xd6cebf, { pos: o(-12, 3.4, 0), scale: S, haze, ao: 0 });
  // Senado: cúpula para baixo (convexa)
  B.add(new THREE.SphereGeometry(5.2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), white, { ...wall, pos: o(12, 2.9, 0), scale: [S, 0.62 * S, S], smooth: true, haze, ao: 0 });
  // torres gêmeas (com faixas de janela) + passarela
  for (const x of [-1.55, 1.55]) {
    B.box(2.7 * S, 19 * S, 1.5 * S, white, { ...wall, pos: o(x, 3 + 9.5, -3.5), haze, ao: 0 });
    for (let y = 4.0; y < 21.6; y += 0.8) B.box(2.74 * S, 0.34 * S, 1.54 * S, win, { pos: o(x, y, -3.5), haze: haze * (winEmissive ? 0.3 : 1), emissive: winEmissive, ao: 0 });
  }
  B.box(0.5 * S, 2.4 * S, 1.2 * S, white, { ...wall, pos: o(0, 16.6, -3.5), haze, ao: 0 });
  B.box(0.52 * S, 0.3 * S, 1.22 * S, win, { pos: o(0, 16.2, -3.5), haze, emissive: winEmissive, ao: 0 });
}

// prédio dos ministérios (lâmina comprida ao longo da Esplanada)
export function ministry(B, x, z, { haze = 0.35, wall = 0xd8d4c8, glass = 0x5f8f86, emissive = 0 } = {}) {
  B.box(4, 9, 16, wall, { pos: [x, -0.6 + 4.5, z], haze, groundY: -0.6 });
  const face = x > 0 ? -2.02 : 2.02;
  for (let y = 1.2; y < 8.6; y += 1.05) B.box(0.06, 0.7, 15.4, glass, { pos: [x + face, -0.6 + y, z], haze, emissive, ao: 0 });
}

// árvore do cerrado / ipê florido: tronco torto + copa de icosaedro achatado
const _ico = new THREE.IcosahedronGeometry(1, 0);
const _trunk = new THREE.CylinderGeometry(0.12, 0.2, 1, 5);
export function tree(B, x, z, { canopy = 0xf2c230, trunk = 0x5a4334, s = 1, haze = 0, r = Math.random } = {}) {
  const lean = (r() - 0.5) * 0.5;
  B.add(_trunk, trunk, { pos: [x, -0.6 + 1.1 * s, z], rot: [0, 0, lean], scale: [s, 2.2 * s, s], haze });
  const cx = x - Math.sin(lean) * 1.8 * s;
  B.add(_ico, canopy, { pos: [cx, -0.6 + 2.6 * s, z], rot: [r() * 3, r() * 3, 0], scale: [1.9 * s, 1.0 * s, 1.7 * s], haze, ao: 0 });
  B.add(_ico, canopy, { pos: [cx + 0.9 * s, -0.6 + 2.3 * s, z + 0.3], rot: [r() * 3, r() * 3, 0], scale: [1.1 * s, 0.7 * s, 1.0 * s], haze, ao: 0 });
}

// ---------- Fundo pintado (camada mais distante) ----------
// Plano que acompanha a câmera a uma distância fixa D (= "no infinito"): não sofre parallax, então tudo que é 3D
// na frente dele desliza por cima = profundidade. A linha do horizonte da pintura fica na altura do olho da câmera,
// casando com o horizonte do chão 3D. A largura se adapta ao aspecto (retrato enquadra o Congresso inteiro).
// Sem fog, sem sombra, sem tone mapping (cor da pintura), com saturação/brilho controláveis e bordas que somem no céu.
export function makeBackdrop(url, { D = 200, horizonV = 0.555, centerU = 0.5, aspectImg = 1.5, widthPortrait = 0.98, widthLandscape = 1.16, sat = 0.8, bright = 0.95, tint = 0xffffff, tintAmt = 0 } = {}) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { map: { value: tex }, sat: { value: sat }, bright: { value: bright }, tint: { value: lin(tint) }, tintAmt: { value: tintAmt } },
    vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D map; uniform float sat, bright, tintAmt; uniform vec3 tint;
      varying vec2 vUv;
      void main() {
        vec4 t = texture2D(map, vUv);
        vec3 c = t.rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, sat) * bright;
        c = mix(c, tint, tintAmt);
        float a = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x) * smoothstep(1.0, 0.94, vUv.y);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  m.renderOrder = -9;
  m.frustumCulled = false;
  m.matrixAutoUpdate = false;
  // posiciona colado na câmera ANTES de desenhar (sem atraso de 1 quadro nem tremida no shake)
  m.onBeforeRender = (_r, _s, cam) => {
    const k = THREE.MathUtils.clamp((cam.aspect - 0.6) / 1.1, 0, 1);
    const W = D * THREE.MathUtils.lerp(widthPortrait, widthLandscape, k), H = W / aspectImg;
    const p = cam.position;
    m.matrix.makeScale(W, H, 1).setPosition(p.x - (centerU - 0.5) * W, p.y + (horizonV - 0.5) * H, p.z - D);
    m.matrixWorld.copy(m.matrix);
    m.modelViewMatrix.multiplyMatrices(cam.matrixWorldInverse, m.matrixWorld);
  };
  m.userData.texture = tex;
  return m;
}
