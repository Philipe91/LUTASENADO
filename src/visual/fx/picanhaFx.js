// PICANHA DO POVO (Lulácio) — a PEÇA de picanha no espeto de churrascaria:
// meia-lua (triângulo arredondado, ponta fina de um lado) com CAPA DE GORDURA branco-amarelada grossa e brilhante
// em cima, crosta tostada com MARCAS DE GRELHA e SAL GROSSO, e o LADO DO CORTE virado para a câmera mostrando o
// interior AO PONTO (crosta → borda cinza-marrom → miolo rosado). Espeto de inox com cabo de madeira torneado.
// Tudo procedural (ExtrudeGeometry com bevel + LatheGeometry + texturas de canvas geradas 1x e compartilhadas).
// Rastro: gotinhas de gordura pingando, fagulhas de brasa e fumacinha.
// GLB opcional: assets/props/picanha.glb substitui o espeto inteiro (corpo); o rastro continua.
import * as THREE from 'three';
import { Puffs, add } from './common.js';
import { swapToGLB, PROP_GLB } from '../propModel.js';

const W = 0.31, H = 0.25, BELLY = 0.05, DEPTH = 0.26, BEVEL = 0.035; // metros
const FAT = 0.092; // espessura da capa no meio da peça
const S = W + BEVEL + 0.02; // meia-largura do quadro da textura do corte

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// perfil da peça: topo em cúpula (mais alto do lado grosso, à esquerda), barriga leve embaixo, ponta fina à direita
const top = (x) => { const t = Math.max(-1, Math.min(1, x / W)); return H * Math.pow(1 - t * t, 0.5) * (0.82 - 0.3 * t) + 0.02; };
const bot = (x) => { const t = Math.max(-1, Math.min(1, x / W)); return -BELLY * Math.pow(1 - t * t, 0.7) + 0.02 * (1 - t * t); };
const fatAt = (x) => { const t = Math.max(-1, Math.min(1, x / W)); return FAT * (0.45 + 0.55 * Math.pow(1 - t * t, 0.6)) * (1.05 - 0.25 * t); };

// ---- textura do LADO DO CORTE (coordenadas da forma: u = x, v = y) ----
let cutTex = null;
function cutTexture() {
  if (cutTex) return cutTex;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  const CRUST = [96, 42, 22], GRAYB = [160, 104, 86], PINK = [240, 132, 138], RED = [214, 74, 92];
  const FATC = [255, 248, 226], FATY = [250, 228, 168], GOLD = [214, 150, 64];
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const x = (px / N - 0.5) * 2 * S, y = (0.5 - py / N) * 2 * S;
    const tp = top(x), bt = bot(x), f = fatAt(x), meatTop = tp - f;
    const n = hash(px, py) - 0.5, n2 = hash(px >> 2, py >> 2) - 0.5;
    let col;
    if (y > tp - 0.013) col = mix(FATY, GOLD, sstep(tp - 0.013, tp + 0.01, y));            // beira da capa tostada
    else if (y > meatTop) col = mix(FATC, FATY, sstep(meatTop, tp - 0.013, y) * 0.7 + n2 * 0.25); // gordura
    else if (y > meatTop - 0.007) col = [222, 182, 160];                                     // película
    else {
      // distância (normalizada) até a borda da carne: embaixo, nas pontas e na película
      const ex = ((W - Math.abs(x)) / W) * 2.2, ey = Math.min(y - bt, meatTop - y) / Math.max(0.02, (meatTop - bt) * 0.5);
      const e = Math.max(0, Math.min(ex, ey, 1));
      const fiber = Math.sin(x * 160 + y * 40 + n2 * 4) * 0.04;
      if (e < 0.1) col = mix(CRUST, GRAYB, e / 0.1);
      else col = mix(GRAYB, PINK, sstep(0.12, 0.5, e + fiber));
      col = mix(col, RED, sstep(0.62, 1.0, e) * 0.55);
    }
    const k = 1 + n * 0.08;
    const i = (py * N + px) * 4;
    d[i] = Math.min(255, col[0] * k); d[i + 1] = Math.min(255, col[1] * k); d[i + 2] = Math.min(255, col[2] * k); d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  cutTex = new THREE.CanvasTexture(c);
  cutTex.colorSpace = THREE.SRGBColorSpace;
  cutTex.repeat.set(1 / (2 * S), 1 / (2 * S)); cutTex.offset.set(0.5, 0.5);
  cutTex.anisotropy = 4;
  return cutTex;
}

// ---- textura da CAPA (laterais da extrusão): branco multiplicado pela cor de vértice + grelha + sal ----
let skinTex = null;
function skinTexture() {
  if (skinTex) return skinTex;
  const W = 256, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  // tostado irregular
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(150,80,20,${0.05 + Math.random() * 0.1})`;
    g.beginPath(); g.ellipse(Math.random() * W, Math.random() * H, 4 + Math.random() * 12, 2 + Math.random() * 6, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  // marcas de grelha: diagonais escuras e grossas
  g.lineCap = 'round';
  for (let x = -40; x < W + 40; x += 32) {
    g.strokeStyle = 'rgba(40,16,6,0.95)'; g.lineWidth = 9;
    g.beginPath(); g.moveTo(x, -4); g.lineTo(x + 26, H + 4); g.stroke();
    g.strokeStyle = 'rgba(110,50,15,0.6)'; g.lineWidth = 15;
    g.beginPath(); g.moveTo(x, -4); g.lineTo(x + 26, H + 4); g.stroke();
    g.strokeStyle = 'rgba(30,10,4,0.95)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x, -4); g.lineTo(x + 26, H + 4); g.stroke();
  }
  // sal grosso
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W, y = Math.random() * H, s = 1.5 + Math.random() * 2.5;
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(x, y, s, s);
    g.fillStyle = 'rgba(200,200,210,0.8)'; g.fillRect(x + s * 0.5, y + s * 0.5, s * 0.5, s * 0.5);
  }
  skinTex = new THREE.CanvasTexture(c);
  skinTex.colorSpace = THREE.SRGBColorSpace;
  skinTex.wrapS = skinTex.wrapT = THREE.RepeatWrapping;
  return skinTex;
}

let pieceGeo = null;
function pieceGeometry() {
  if (pieceGeo) return pieceGeo;
  const N = 40, pts = [];
  for (let i = 0; i <= N; i++) { const x = -W + (2 * W * i) / N; pts.push(new THREE.Vector2(x, top(x))); }
  for (let i = N - 1; i > 0; i--) { const x = -W + (2 * W * i) / N; pts.push(new THREE.Vector2(x, bot(x))); }
  const sh = new THREE.Shape(pts.reverse()); // anti-horário
  const geo = new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL * 0.7, bevelSegments: 3, curveSegments: 4 });
  geo.translate(0, 0, -DEPTH / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv, n = pos.count;
  const col = new Float32Array(n * 3);
  const FATC = new THREE.Color(0xfff4dc), CRUST = new THREE.Color(0x7a4424), tmp = new THREE.Color();
  const side = geo.groups[1];
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // capa de gordura em cima, crosta embaixo (cor de vértice multiplica a textura de grelha/sal)
    const mid = top(x) - fatAt(x) * 1.2;
    tmp.copy(CRUST).lerp(FATC, sstep(mid - 0.01, mid + 0.03, y));
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    if (i >= side.start && i < side.start + side.count) uv.setXY(i, (x / W) * 0.42, (z + DEPTH / 2 + BEVEL) / (DEPTH + 2 * BEVEL));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // a capa estufa um pouco no meio da espessura (peça carnuda, não bloco)
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const zz = z / (DEPTH / 2 + BEVEL), up = Math.max(0, y - bot(x)) / Math.max(0.05, top(x) - bot(x));
    pos.setY(i, y + 0.035 * up * (1 - zz * zz));
  }
  geo.computeVertexNormals();
  pieceGeo = geo;
  return geo;
}

let mats = null;
function materials() {
  if (mats) return mats;
  mats = {
    cut: new THREE.MeshStandardMaterial({ map: cutTexture(), roughness: 0.5, emissive: 0xffffff, emissiveMap: cutTexture(), emissiveIntensity: 0.3 }),
    skin: new THREE.MeshStandardMaterial({ map: skinTexture(), vertexColors: true, roughness: 0.28, metalness: 0.0, emissive: 0x2a1a08, emissiveIntensity: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xe2e6ea, metalness: 0.85, roughness: 0.22 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5228, roughness: 0.6 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.7 }),
    salt: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, emissive: 0x666666 }),
  };
  return mats;
}

// espeto montado; +X = ponta. Origem no meio da peça (centro do giro).
function buildSkewer() {
  const M = materials();
  const sk = new THREE.Group();
  const yE = 0.07; // altura do espeto: atravessa a carne, abaixo da capa
  // lâmina de inox achatada + ponta
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.98, 10), M.steel);
  blade.rotation.z = Math.PI / 2; blade.scale.set(1, 1, 0.45); blade.position.set(0.02, yE, 0);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.13, 10), M.steel);
  tip.rotation.z = -Math.PI / 2; tip.position.set(0.575, yE, 0); tip.scale.set(1, 1, 0.45);
  // cabo de madeira torneado (Lathe) + anel de metal
  const prof = [[0, 0], [0.036, 0], [0.045, 0.02], [0.043, 0.06], [0.036, 0.08], [0.043, 0.1], [0.048, 0.17], [0.043, 0.23], [0.032, 0.26], [0, 0.27]].map(([a, b]) => new THREE.Vector2(a, b));
  const handle = new THREE.Mesh(new THREE.LatheGeometry(prof, 14), M.wood);
  handle.rotation.z = Math.PI / 2; handle.position.set(-0.47, yE, 0); // cresce para -X
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.012, 6, 16), M.woodDark);
  ring.rotation.y = Math.PI / 2; ring.position.set(-0.56, yE, 0);
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.05, 12), M.steel);
  ferrule.rotation.z = Math.PI / 2; ferrule.position.set(-0.465, yE, 0);
  // a peça de picanha (o corte para +Z = câmera)
  const piece = new THREE.Mesh(pieceGeometry(), [M.cut, M.skin]);
  piece.scale.setScalar(1.3); piece.castShadow = true;
  sk.add(blade, tip, handle, ring, ferrule, piece);
  // sal grosso: grãozinhos brancos sobre a capa de gordura
  const grains = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.012, 0), M.salt, 40);
  const q = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() * 2 - 1) * W * 0.85, z = (Math.random() - 0.5) * (DEPTH + BEVEL);
    const zz = z / (DEPTH / 2 + BEVEL);
    q.position.set(x, top(x) + 0.03 + 0.035 * (1 - zz * zz), z);
    q.rotation.set(Math.random() * 3, Math.random() * 3, 0); q.scale.setScalar(0.7 + Math.random() * 0.8);
    q.updateMatrix(); grains.setMatrixAt(i, q.matrix);
  }
  piece.add(grains); // acompanha a escala da peça
  sk.userData.grip = new THREE.Vector3(-0.6, yE, 0); // onde a mão segura (cabo)
  return sk;
}

const _v = new THREE.Vector3();
export const PICANHA_VISUAL = {
  build() {
    const g = new THREE.Group();
    const tilt = new THREE.Group(); tilt.rotation.set(0.25, 0.42, 0); g.add(tilt); // ¾: mostra corte e capa
    const spin = new THREE.Group(); tilt.add(spin);
    const skewer = buildSkewer(); skewer.scale.setScalar(1.25); spin.add(skewer);
    // rastro: gotas de gordura (caem), fagulhas de brasa (sobem) e fumacinha — no MUNDO (compensa o voo do grupo)
    const dropMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, roughness: 0.15, emissive: 0x6a4a10, emissiveIntensity: 0.5, transparent: true });
    const dropGeo = new THREE.SphereGeometry(0.028, 8, 6); dropGeo.scale(1, 1.5, 1);
    const drops = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(dropGeo, dropMat.clone()); m.visible = false; g.add(m); return { m, life: 0, max: 1, vx: 0, vy: 0 }; });
    const emberGeo = new THREE.SphereGeometry(0.02, 6, 4);
    const embers = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(emberGeo, add(i % 2 ? 0xff7a1a : 0xffc23a, 1)); m.visible = false; g.add(m); return { m, life: 0, max: 1, vx: 0, vy: 0 }; });
    const smoke = new Puffs(g, 12, 0x6e655c, { opacity: 0.5 });
    g.userData = { spin, skewer, glbBody: spin, drops, embers, smoke, offY: 0.18, handScale: 0.62, lastX: 0, lastY: 0, lastSpawn: -1 };
    swapToGLB(spin, PROP_GLB.picanha); // na mão (PropHandFx) e no voo; Vfx.tryModel usa o mesmo alvo (não duplica)
    return g;
  },
  animate(v, h, dt) {
    const u = v.userData;
    u.spin.rotation.z -= dt * 7 * h.facing; // giro lento o bastante pra ler a peça
    if (u.lastId !== h.id) {
      u.lastId = h.id; u.lastX = h.x; u.lastY = h.y; u.lastSpawn = -1;
      u.smoke.clear(); for (const p of [...u.drops, ...u.embers]) { p.life = 0; p.m.visible = false; }
    }
    const dx = h.x - u.lastX, dy = h.y - u.lastY; u.lastX = h.x; u.lastY = h.y;
    for (const p of u.smoke.items) if (p.life > 0) { p.m.position.x -= dx; p.m.position.y -= dy; }
    const flying = h.armed !== false && !h.spent && !h.dead;
    if (flying && h.t !== u.lastSpawn) {
      u.lastSpawn = h.t;
      if (h.t % 2 === 0) { // gota de gordura pingando da capa
        const p = u.drops.find((q) => q.life <= 0);
        if (p) { p.life = p.max = 0.5; p.m.position.set((Math.random() - 0.5) * 0.4, -0.05, 0.1); p.vx = -0.4 * h.facing; p.vy = 0.3; p.m.visible = true; }
      }
      if (h.t % 3 === 0) u.smoke.burst(_v.set(-0.15 * h.facing, 0.05, -0.05), { count: 1, spread: 0.2, up: 0.9, speed: 0.25, size: 0.15, grow: 2.6, life: 0.6, z: 0 });
      if (h.t % 3 === 1) {
        const p = u.embers.find((q) => q.life <= 0);
        if (p) { p.life = p.max = 0.4; p.m.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.3) * 0.3, 0.15); p.vx = (Math.random() - 0.5) * 0.6; p.vy = 0.8 + Math.random() * 0.6; p.m.visible = true; }
      }
    }
    for (const p of u.drops) {
      if (p.life <= 0) continue;
      p.life -= dt; p.vy -= 9 * dt;
      p.m.position.x += p.vx * dt - dx; p.m.position.y += p.vy * dt - dy;
      p.m.material.opacity = Math.min(1, (p.life / p.max) * 2);
      if (p.life <= 0) p.m.visible = false;
    }
    for (const p of u.embers) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.m.position.x += p.vx * dt - dx; p.m.position.y += p.vy * dt - dy;
      const k = p.life / p.max; p.m.material.opacity = k * (0.6 + 0.4 * Math.sin(p.life * 60)); p.m.scale.setScalar(0.6 + k);
      if (p.life <= 0) p.m.visible = false;
    }
    u.smoke.update(dt);
  },
};
