// Visuais dos Hitters (projéteis, zonas, veículos, multidões).
// Cada entrada: build(h) → Group (criado UMA vez e reciclado pelo pool do Vfx)
//               animate(v, h, dt) → anima conforme o estado do Hitter (entra → impacta → some)
// Se o Hitter tiver `model` (ex.: assets/props/caminhao.glb) e o arquivo existir, o Vfx troca o placeholder pelo GLB.
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { loadGLTF } from './models/GLBModel.js';
import { Puffs, Rings, Shards, canvasTex, textSprite, add, flat } from './fx/common.js';
import { makeVadeMecum } from './fx/dinoFx.js';
import { NIKOLAS_VISUALS } from './fx/nikolasFx.js';
import { ERIKA_VISUALS } from './fx/erikaFx.js';
import { DILMA_VISUALS } from './fx/dilmaFx.js';
import { HADDAD_VISUALS } from './fx/haddadFx.js';
import { BOULOS_VISUALS } from './fx/boulosFx.js';
import { RENAN_VISUALS } from './fx/renanFx.js';

// ---- civis da Picanha do Povo: Quaternius Ultimate Modular Men/Women (CC0), clip Run ----
// Carregados 1x; cada onda reusa (pool do Vfx) 5 clones com mixer próprio.
const CIVIL_FILES = ['assets/props/civis/worker.glb', 'assets/props/civis/punk_f.glb'];
// roupa de cada civil: material → cor (predomínio de vermelho, 2 tons, sem mexer em pele/cabelo/olhos)
const CIVIL_TINT = [
  { Worker_Vest: 0xc81e1e, Worker_Yellow: 0x7a1010 },
  { Pink: 0xd62828 },
  { Worker_Vest: 0xe04a3a, Worker_Yellow: 0x3a3a3a, LightBrown: 0x2d3a5c },
  { Pink: 0xa01818, Black: 0x2b2b3a },
  { Worker_Vest: 0xb01c1c, Worker_Yellow: 0xf2f2f2 },
];
const CIVIL_LAYOUT = [ // x atrás da frente (m), z (profundidade), atraso de fase (s), escala
  { x: 0.0, z: 0.15, ph: 0.0, s: 1.0 },
  { x: -0.7, z: -0.3, ph: 0.21, s: 0.95 },
  { x: -1.2, z: 0.35, ph: 0.09, s: 1.04 },
  { x: -1.8, z: -0.1, ph: 0.3, s: 0.98 },
  { x: -2.4, z: 0.25, ph: 0.15, s: 1.02 },
];
let civilGltfs = null;
const civilReady = Promise.all(CIVIL_FILES.map((f) => loadGLTF(f))).then((gs) => { civilGltfs = gs; }).catch(() => {});

function fillCrowd(g) {
  if (g.userData.civis || !civilGltfs) return;
  const civis = CIVIL_LAYOUT.map((L, i) => {
    const src = civilGltfs[i % 2];
    const m = cloneSkinned(src.scene);
    const tint = CIVIL_TINT[i];
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true;
      o.material = o.material.clone();
      if (tint[o.material.name] !== undefined) o.material.color.setHex(tint[o.material.name]);
    });
    const box = new THREE.Box3().setFromObject(m);
    m.scale.setScalar((1.62 * L.s) / (box.max.y - box.min.y));
    const holder = new THREE.Group();
    holder.add(m);
    g.add(holder);
    const mixer = new THREE.AnimationMixer(m);
    const run = src.animations.find((a) => a.name === 'Run') || src.animations[0];
    mixer.clipAction(run).play();
    return { holder, mixer, L, dur: run.duration };
  });
  g.userData.civis = civis;
}

const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...extra });
const ease = (x) => Math.max(0, Math.min(1, x));

// silhueta de apoiador (braço erguido + bandeirinha) desenhada 1x em canvas e compartilhada
let supporterTex = null;
function supporterTexture() {
  if (supporterTex) return supporterTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d62828'; g.strokeStyle = '#000'; g.lineWidth = 6; g.lineJoin = 'round';
  const body = new Path2D();
  body.arc(64, 52, 24, 0, Math.PI * 2);
  body.moveTo(34, 88); body.lineTo(94, 88); body.lineTo(100, 170); body.lineTo(84, 170); body.lineTo(80, 250);
  body.lineTo(48, 250); body.lineTo(44, 170); body.lineTo(28, 170); body.closePath();
  g.fill(body); g.stroke(body);
  g.beginPath(); g.moveTo(92, 96); g.lineTo(116, 20); g.lineWidth = 14; g.strokeStyle = '#000'; g.stroke();
  g.lineWidth = 8; g.strokeStyle = '#d62828'; g.stroke();
  g.fillStyle = '#fff'; g.fillRect(104, 4, 22, 16); g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeRect(104, 4, 22, 16);
  g.fillStyle = '#ffe0c0'; g.beginPath(); g.arc(64, 52, 14, 0.2, Math.PI - 0.2); g.fill();
  supporterTex = new THREE.CanvasTexture(c);
  supporterTex.colorSpace = THREE.SRGBColorSpace;
  return supporterTex;
}

export const PROJECTILE_VISUALS = {
  // ---------------- CAPITÃO BRASA: ARMINHA DE ENERGIA ----------------
  // tiro de energia ARCADE (não é bala): cápsula branca-quente + halo verde aditivo + anéis amarelos que ficam pra trás
  energyShot: {
    build() {
      const g = new THREE.Group();
      const body = new THREE.Group(); g.add(body); // +X = frente (gira 180° quando facing = -1)
      const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 4, 10), new THREE.MeshBasicMaterial({ color: 0xfffbd0 }));
      core.rotation.z = Math.PI / 2;
      const glow = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 12), add(0x4fe04a, 0.65)); glow.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), add(0xffe44a, 0.55)); tip.position.x = 0.3;
      body.add(glow, core, tip);
      const ringGeo = new THREE.TorusGeometry(0.24, 0.04, 6, 20);
      const rings = Array.from({ length: 3 }, (_, i) => {
        const r = new THREE.Mesh(ringGeo, add(i % 2 ? 0x4fe04a : 0xffd400, 0.9)); r.rotation.y = Math.PI / 2; body.add(r); return r;
      });
      const trailGeo = new THREE.SphereGeometry(0.16, 8, 6);
      const trail = Array.from({ length: 4 }, (_, i) => {
        const t = new THREE.Mesh(trailGeo, add(i % 2 ? 0xffd400 : 0x7be04a, 0.5 - i * 0.1)); t.position.x = -0.45 - i * 0.3; t.scale.setScalar(1 - i * 0.2); body.add(t); return t;
      });
      g.userData = { center: true, body, glow, tip, rings, trail };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      u.body.rotation.y = h.facing > 0 ? 0 : Math.PI;
      const pop = Math.min(1, (h.t + 1) / 3), wob = 1 + Math.sin(h.t * 1.7) * 0.12;
      u.body.scale.setScalar(pop);
      u.glow.scale.set(wob, wob, wob); u.tip.scale.setScalar(2 - wob);
      u.rings.forEach((r, i) => { // anéis nascem na ponta e ficam pra trás abrindo
        const k = ((h.t + i * 3) % 9) / 9;
        r.position.x = 0.2 - k * 1.3; r.scale.setScalar(0.6 + k * 1.2); r.material.opacity = 0.9 * (1 - k);
      });
      u.trail.forEach((t, i) => { t.position.y = Math.sin(h.t * 0.9 + i) * 0.05; });
    },
  },

  // ---------------- LULÁCIO: PICANHA DO POVO ----------------
  picanha: {
    build() {
      const g = new THREE.Group();
      const meat = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), std(0x9c2b1e, { roughness: 0.45 }));
      meat.scale.set(1, 0.5, 0.7);
      const fat = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.32), std(0xfff1d6));
      fat.scale.set(1.02, 0.55, 0.72);
      const spin = new THREE.Group();
      spin.add(meat, fat);
      spin.scale.setScalar(1.8); // grande o bastante pra ler na câmera do jogo
      g.add(spin);
      // rastro: 6 "fantasmas" vermelhos que seguem a trajetória
      const trail = [];
      for (let i = 0; i < 6; i++) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.5 - i * 0.07, depthWrite: false }));
        t.scale.set(1, 0.55, 0.7); trail.push(t); g.add(t);
      }
      g.userData.spin = spin; g.userData.trail = trail; g.userData.hist = [];
      g.userData.offY = 0.18;
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      u.spin.rotation.z -= dt * 12 * h.facing;
      if (u.lastId !== h.id) { u.lastId = h.id; u.hist.length = 0; }
      u.hist.unshift([h.x, h.y]); if (u.hist.length > 24) u.hist.pop();
      u.trail.forEach((t, i) => { // posição relativa ao grupo (o grupo está no ponto atual)
        const p = u.hist[Math.min(u.hist.length - 1, (i + 1) * 3)] || [h.x, h.y];
        t.position.set(p[0] - h.x, p[1] - h.y, 0); t.visible = u.hist.length > (i + 1) * 3;
      });
    },
  },

  // onda de apoiadores: 9 silhuetas (3 fileiras) em sprites planos — barato e lê como multidão
  crowdWave: {
    build() {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: supporterTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
      const geo = new THREE.PlaneGeometry(0.62, 1.24);
      geo.translate(0, 0.62, 0);
      const people = [];
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 3; i++) {
          const p = new THREE.Mesh(geo, mat);
          p.position.set((i - 1) * 0.55 - row * 0.25, 0, -0.35 + row * 0.35);
          p.userData.phase = Math.random() * 6;
          p.renderOrder = 5 + row;
          g.add(p);
          people.push(p);
        }
      }
      const dust = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20), new THREE.MeshBasicMaterial({ color: 0xc9b89a, transparent: true, opacity: 0.45, depthWrite: false }));
      dust.rotation.x = -Math.PI / 2; dust.position.y = 0.02; dust.scale.set(1.4, 0.6, 1);
      g.add(dust);
      g.userData.people = people;
      g.userData.dust = dust;
      return g;
    },
    animate(v, h) {
      // entra (pop de baixo pra cima) → corre em bloco → some (afunda) nos últimos frames
      const inK = ease(h.t / 6), outK = ease((h.delay + h.life - h.t) / 8);
      const k = Math.min(inK, outK);
      const now = performance.now() / 1000;
      for (const p of v.userData.people) {
        p.scale.set(h.facing, k * (0.9 + 0.2 * Math.abs(Math.sin(now * 9 + p.userData.phase))), 1);
        p.position.y = Math.abs(Math.sin(now * 14 + p.userData.phase)) * 0.12 * k;
        p.rotation.z = -0.12 * h.facing;
      }
      v.userData.dust.material.opacity = 0.45 * k;
    },
  },

  // civis de verdade (3D rigado) correndo desde a retaguarda do Lulácio até passar pelo alvo
  civilCrowd: {
    build() {
      const g = new THREE.Group();
      const dust = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0xc9b89a, transparent: true, opacity: 0.35, depthWrite: false }));
      dust.rotation.x = -Math.PI / 2; dust.position.y = 0.02; dust.scale.set(1.6, 0.5, 1);
      g.add(dust);
      g.userData.dust = dust;
      civilReady.then(() => fillCrowd(g));
      return g;
    },
    animate(v, h, dt) {
      fillCrowd(v);
      const u = v.userData;
      if (!u.civis) return;
      if (u.lastId !== h.id) { // reuso do pool: reinicia fases e visibilidade
        u.lastId = h.id;
        for (const c of u.civis) c.mixer.setTime(c.L.ph);
      }
      // aparece rápido, some afundando no fim da vida (depois de passar pelo alvo)
      const k = Math.min(ease(h.t / 5), ease((h.delay + h.life - h.t) / 10));
      for (const c of u.civis) {
        c.mixer.update(dt * 1.15);
        c.holder.position.set(c.L.x * h.facing, (k - 1) * 0.6, c.L.z);
        c.holder.rotation.y = h.facing > 0 ? Math.PI / 2 : -Math.PI / 2;
        c.holder.scale.setScalar(Math.max(0.01, k));
      }
      u.dust.position.x = -1.2 * h.facing;
      u.dust.material.opacity = 0.35 * k;
    },
  },

  // ---------------- CAPITÃO BRASA: PATRIOTA NO PARA-BRISA ----------------
  // caminhão low-poly (cabine verde, baú branco com faixa e letreiro, farol aceso, escapamento soltando fumaça)
  // com um apoiador pendurado no para-brisa se debatendo. Buzina "FOM FOM!" na largada, poeira atrás das rodas.
  truck: {
    build() {
      const g = new THREE.Group();
      const body = new THREE.Group();
      g.add(body);
      const green = std(0x1fa34a), chrome = std(0xdadada, { metalness: 0.75, roughness: 0.3 }), dark = std(0x111111);
      // frente do caminhão em +X; o Vfx gira 180° quando facing = -1
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.0, 1.9), green); cab.position.set(1.85, 1.35, 0);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 1.7), std(0x178a3e)); roof.position.set(1.85, 2.42, 0);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 1.8), green); hood.position.set(3.1, 0.85, 0);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 1.4), chrome); grille.position.set(3.52, 0.85, 0);
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 2.05), chrome); bumper.position.set(3.46, 0.42, 0);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 1.55), std(0x3a6fb0, { roughness: 0.1, metalness: 0.4 })); glass.position.set(2.72, 1.75, 0);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 10), chrome); stack.position.set(1.0, 2.6, 0.85);
      body.add(cab, roof, hood, grille, bumper, glass, stack);
      for (const z of [-0.75, 0.75]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffd36b, emissiveIntensity: 1.4 }));
        lamp.position.set(3.55, 1.1, z); body.add(lamp);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.1), dark); mirror.position.set(2.5, 1.9, z * 1.4); body.add(mirror);
      }
      // baú com letreiro nos dois lados
      const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.5, 2.0), std(0xf4f4f4)); trailer.position.set(-1.0, 1.6, 0);
      const sideTex = canvasTex(512, 320, (c, w, h) => {
        c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#1fa34a'; c.fillRect(0, h * 0.62, w, h * 0.16);
        c.fillStyle = '#ffd400'; c.fillRect(0, h * 0.78, w, h * 0.1);
        c.fillStyle = '#1a1a1a'; c.font = 'bold 86px Bangers, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('FROTA DO CAPITÃO', w / 2, h * 0.33);
      });
      for (const s of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(3.68, 2.48), new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.7 }));
        side.position.set(-1.0, 1.6, s * 1.005); side.rotation.y = s > 0 ? 0 : Math.PI;
        body.add(side);
      }
      body.add(trailer);
      const wheels = [];
      const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 14), hg = new THREE.CylinderGeometry(0.18, 0.18, 0.38, 8);
      for (const x of [-2.2, -1.2, 1.6, 2.9]) for (const z of [-0.95, 0.95]) {
        const w = new THREE.Mesh(wg, dark); w.rotation.x = Math.PI / 2; w.position.set(x, 0.42, z);
        const hub = new THREE.Mesh(hg, chrome); hub.rotation.x = Math.PI / 2; hub.position.copy(w.position);
        body.add(w, hub); wheels.push(w);
      }
      // o apoiador pendurado no para-brisa (boneco levíssimo), braços e pernas se debatendo
      const guy = new THREE.Group();
      const shirt = std(0xffd400), skin = std(0xf0c8a0), pants = std(0x1d4ed8);
      // espalhado no vidro, de frente pra câmera (plano x/y na frente do para-brisa)
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 3, 8), shirt); torso.position.set(0, 0.05, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skin); head.position.set(0, 0.6, 0.05);
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0x5a1a1a)); mouth.position.set(0, -0.06, 0.17); head.add(mouth);
      const armGeo = new THREE.CapsuleGeometry(0.07, 0.5, 3, 6);
      const armL = new THREE.Mesh(armGeo, shirt); armL.position.set(0.38, 0.4, 0); armL.rotation.z = -0.9;
      const armR = new THREE.Mesh(armGeo, shirt); armR.position.set(-0.38, 0.4, 0); armR.rotation.z = 0.9;
      const legGeo = new THREE.CapsuleGeometry(0.09, 0.5, 3, 6);
      const legL = new THREE.Mesh(legGeo, pants); legL.position.set(0.2, -0.55, 0); legL.rotation.z = -0.35;
      const legR = new THREE.Mesh(legGeo, pants); legR.position.set(-0.2, -0.55, 0); legR.rotation.z = 0.35;
      const flagTex = canvasTex(128, 90, (c, w, h) => {
        c.fillStyle = '#009c3b'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffdf00'; c.beginPath(); c.moveTo(w / 2, 8); c.lineTo(w - 10, h / 2); c.lineTo(w / 2, h - 8); c.lineTo(10, h / 2); c.closePath(); c.fill();
        c.fillStyle = '#002776'; c.beginPath(); c.arc(w / 2, h / 2, 16, 0, Math.PI * 2); c.fill();
      });
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }));
      flag.position.set(0.72, 0.95, 0.05);
      guy.add(torso, head, armL, armR, legL, legR, flag);
      guy.position.set(2.95, 1.8, 0);
      body.add(guy);
      const honk = textSprite('FOM FOM!', { color: '#ffd400', stroke: '#111', w: 2.6, h: 0.8 }); honk.position.set(2.2, 3.6, 0.4); g.add(honk);
      const smoke = new Puffs(g, 16, 0x5a5a5a, { opacity: 0.55 });
      const dust = new Puffs(g, 16, 0xcdbda0, { opacity: 0.5 });
      // offX: alinha o para-choque (x local 3.5) com a borda frontal da hitbox (w 2.8 → +1.4)
      g.userData = { body, wheels, guy, armL, armR, legL, legR, flag, honk, smoke, dust, lastX: 0, offX: -2.1, offY: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      for (const w of u.wheels) w.rotation.y += dt * 30;
      const now = performance.now() / 1000;
      u.body.position.y = Math.abs(Math.sin(now * 25)) * 0.06;
      u.body.rotation.z = Math.sin(now * 18) * 0.015;
      u.guy.rotation.z = Math.sin(now * 16) * 0.12;
      u.armL.rotation.z = -0.9 - Math.sin(now * 22) * 0.6; u.armR.rotation.z = 0.9 + Math.sin(now * 22 + 1) * 0.6;
      u.legL.rotation.z = -0.35 - Math.sin(now * 19) * 0.45; u.legR.rotation.z = 0.35 + Math.sin(now * 19 + 2) * 0.45;
      u.flag.rotation.y = Math.sin(now * 30) * 0.5;
      // buzina só na largada (entra → some)
      const hk = h.t < 22 ? Math.min(1, h.t / 4) * (h.t > 16 ? (22 - h.t) / 6 : 1) : 0;
      u.honk.visible = hk > 0; u.honk.scale.set(2.6 * hk, 0.8 * hk, 1); u.honk.position.y = 3.6 + h.t * 0.02;
      // fumaça do escapamento e poeira das rodas ficam no MUNDO: compensa o deslocamento do grupo
      if (u.lastId !== h.id) { u.lastId = h.id; u.lastX = h.x; u.lastPuff = -1; u.smoke.clear(); u.dust.clear(); }
      const dxLocal = (h.x - u.lastX) * h.facing; u.lastX = h.x;
      for (const P of [u.smoke, u.dust]) for (const p of P.items) if (p.life > 0) p.m.position.x -= dxLocal;
      if (h.t % 3 === 0 && h.t !== u.lastPuff) {
        u.lastPuff = h.t;
        u.smoke.burst(new THREE.Vector3(1.0, 3.45, 0.85), { count: 1, spread: 0.2, up: 2.2, speed: 0.4, size: 0.22, grow: 3, life: 0.7, z: 0 });
        u.dust.burst(new THREE.Vector3(-2.6, 0.2, 0.6), { count: 2, spread: 0.5, up: 1.0, speed: 1.2, size: 0.35, grow: 3, life: 0.6, z: 0 });
      }
      u.smoke.update(dt); u.dust.update(dt);
    },
  },

  // ---------------- DINO SUPREMO: METEORO DIDÁTICO (zona no alvo) ----------------
  // SOMBRA PRÉVIA no chão (alvo que fecha) → o Vade Mecum cai do céu em chamas nos últimos 10 frames → IMPACTO:
  // explosão, pedras, fumaça, cratera com o livro fincado. Dois meteorinhos decorativos caem perto (sem dano).
  meteor: {
    build() {
      const g = new THREE.Group();
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.025; shadow.scale.set(1.1, 0.55, 1);
      const lock = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.85, 40), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      lock.rotation.x = -Math.PI / 2; lock.position.y = 0.03;
      const fire = new THREE.Group();
      const book = makeVadeMecum(); book.scale.setScalar(1.6); fire.add(book);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), add(0xff7a1a, 0.55)); fire.add(shell);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.4, 10, 1, true), add(0xffb040, 0.5)); flame.position.y = 1.4; fire.add(flame);
      const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 8, 1, true), add(0xfff0a0, 0.45)); flame2.position.y = 1.8; fire.add(flame2);
      const crater = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28), flat(0x2a1a0a, 0)); crater.rotation.x = -Math.PI / 2; crater.position.y = 0.028;
      const stuck = makeVadeMecum(); stuck.scale.setScalar(1.6); stuck.visible = false; stuck.rotation.set(0.4, 0, 1.1); stuck.position.set(0.1, 0.35, 0);
      const boom = new Rings(g, 2, 0xffa040);
      const fireP = new Puffs(g, 10, 0xff8a2a, { opacity: 0.9 });
      const smoke = new Puffs(g, 10, 0x4a4a4a, { opacity: 0.55 });
      const rocks = new Shards(g, 12, new THREE.DodecahedronGeometry(0.14, 0), std(0x6a5a48));
      const minis = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), add(0xff9a3a, 0.9)); m.visible = false; g.add(m); return m; });
      g.add(shadow, lock, fire, crater, stuck);
      g.userData = { shadow, lock, fire, book, shell, crater, stuck, boom, fireP, smoke, rocks, minis, offY: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData, D = h.delay, t = h.t;
      if (u.lastId !== h.id) { u.lastId = h.id; u.boomed = false; u.fireP.clear(); u.smoke.clear(); u.crater.material.opacity = 0; }
      u.boom.update(dt); u.fireP.update(dt); u.smoke.update(dt); u.rocks.update(dt);
      const pre = t < D;
      // sombra + alvo fechando
      const q = Math.min(1, t / D);
      u.shadow.material.opacity = pre ? 0.15 + q * 0.45 : Math.max(0, 0.6 - (t - D) * 0.05);
      u.shadow.scale.set(1.1 * (0.5 + q * 0.6), 0.55 * (0.5 + q * 0.6), 1);
      u.lock.material.opacity = pre ? 0.9 * Math.min(1, t / 4) * (0.6 + 0.4 * Math.sin(t * 0.9)) : 0;
      u.lock.scale.setScalar(2.2 - q * 1.2);
      // queda em diagonal nos últimos 10 frames
      const fall = pre ? Math.max(0, (t - (D - 10)) / 10) : 1;
      u.fire.visible = pre && t >= D - 12;
      if (u.fire.visible) {
        const k = fall * fall;
        u.fire.position.set(-h.facing * 2.8 * (1 - fall), 0.5 + (1 - k) * 9.5, 0);
        u.fire.rotation.set(0, 0, -h.facing * 0.35); u.book.rotation.x += dt * 9; u.book.rotation.z += dt * 6;
        u.shell.scale.setScalar(0.9 + Math.sin(t * 3) * 0.1);
      }
      // meteorinhos decorativos
      u.minis.forEach((m, i) => {
        const t0 = D - 6 + i * 9, k = (t - t0) / 8;
        m.visible = k >= 0 && k < 1;
        if (m.visible) m.position.set((i ? 1.9 : -1.7) * h.facing - h.facing * 1.5 * (1 - k), 0.25 + (1 - k * k) * 7, i ? -0.9 : 0.8);
        else if (k >= 1 && k < 1.05 && u.lastMini !== t0) { u.lastMini = t0; u.smoke.burst(new THREE.Vector3((i ? 1.9 : -1.7) * h.facing, 0.2, i ? -0.9 : 0.8), { count: 2, spread: 0.5, up: 1.5, speed: 1.2, size: 0.3, grow: 2.4, life: 0.5, z: 0 }); }
      });
      // IMPACTO
      if (!pre && !u.boomed) {
        u.boomed = true;
        u.boom.spawn(0, 0.05, { from: 0.3, to: 4.2, life: 0.45, opacity: 1 });
        u.boom.spawn(0, 0.6, { flat: false, from: 0.3, to: 3.0, life: 0.35, opacity: 0.8, z: 0.4 });
        u.fireP.burst(new THREE.Vector3(0, 0.5, 0), { count: 10, spread: 1.6, up: 3.5, speed: 3.2, size: 0.55, grow: 2.2, life: 0.55 });
        u.smoke.burst(new THREE.Vector3(0, 0.8, 0), { count: 8, spread: 1.4, up: 2.4, speed: 1.6, size: 0.6, grow: 2.8, life: 1.0 });
        u.rocks.burst(new THREE.Vector3(0, 0.3, 0), { count: 12, speed: 3.5, up: 6, life: 0.9, size: 1 });
        u.crater.material.opacity = 0.75;
      }
      u.stuck.visible = !pre;
      if (!pre) { const r = (t - D) / (h.life || 20); u.crater.material.opacity = 0.75 * (1 - r); u.stuck.scale.setScalar(1.6 * (1 - Math.max(0, r - 0.7) / 0.3)); }
    },
  },

  // ---------------- DINO SUPREMO: PISÃO CRETÁCEO (onda de terra rasteira) ----------------
  // crista de torrões que corre pelo chão (tem que pular), com rachadura atrás e poeira; afunda no fim
  quake: {
    build() {
      const g = new THREE.Group();
      const ridge = new THREE.Group(); g.add(ridge);
      const chunks = [];
      const mats = [std(0x7a5a3a, { roughness: 0.95 }), std(0x5e4228, { roughness: 0.95 }), std(0x8d6b45, { roughness: 0.95 })];
      const geo = new THREE.DodecahedronGeometry(0.34, 0);
      for (let i = 0; i < 7; i++) {
        const m = new THREE.Mesh(geo, mats[i % 3]); m.castShadow = true;
        m.userData = { x: -1.1 + i * 0.36, z: (i % 2 ? 0.22 : -0.2) + (i % 3) * 0.05, s: 0.6 + ((i * 7) % 5) * 0.14, r: i * 1.3 };
        ridge.add(m); chunks.push(m);
      }
      const grass = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), flat(0x6b7a3a, 0.5)); grass.rotation.x = -Math.PI / 2; grass.position.y = 0.02; grass.scale.set(1.3, 0.6, 1); g.add(grass);
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), flat(0x3a2a1a, 0.8)); crack.rotation.x = -Math.PI / 2; crack.position.set(-1.9, 0.021, 0); crack.scale.set(1, 0.25, 1); g.add(crack);
      const dust = new Puffs(g, 14, 0xcdbda0, { opacity: 0.55 });
      g.userData = { ridge, chunks, grass, crack, dust, offY: 0, lastX: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      if (u.lastId !== h.id) { u.lastId = h.id; u.lastX = h.x; u.lastPuff = -1; u.dust.clear(); }
      const inK = ease(h.t / 5), outK = ease((h.delay + h.life - h.t) / 8), k = Math.min(inK, outK);
      const now = performance.now() / 1000;
      for (const c of u.chunks) {
        const d = c.userData, hump = Math.max(0, 1 - (d.x / 1.3) ** 2);
        c.position.set(d.x, (-0.35 + hump * 0.75 + Math.sin(now * 14 + d.r) * 0.05) * k - (1 - k) * 0.4, d.z);
        c.scale.setScalar(d.s * (0.6 + 0.4 * k)); c.rotation.set(d.r + now * 1.5, d.r * 0.7, Math.sin(now * 9 + d.r) * 0.3);
      }
      u.grass.material.opacity = 0.5 * k; u.crack.material.opacity = 0.8 * k;
      // poeira fica no mundo (compensa o deslocamento)
      const dxLocal = (h.x - u.lastX) * h.facing; u.lastX = h.x;
      for (const p of u.dust.items) if (p.life > 0) p.m.position.x -= dxLocal;
      if (h.t % 2 === 0 && h.t !== u.lastPuff && k > 0.5) { u.lastPuff = h.t; u.dust.burst(new THREE.Vector3(-0.6, 0.2, 0.3), { count: 2, spread: 0.6, up: 1.4, speed: 1.0, size: 0.3, grow: 2.4, life: 0.5, z: 0 }); }
      u.dust.update(dt);
    },
  },
  // ---------------- NIKOLAS (chupeta, mamadeira) e ERIKA (onda sonora): fx/nikolasFx.js, fx/erikaFx.js ----------------
  ...NIKOLAS_VISUALS,
  ...ERIKA_VISUALS,
  // lote 3: vento/mandioca (Dilma), pacote (Haddad), barraca (Boulos), chat da live (Renan)
  ...DILMA_VISUALS, ...HADDAD_VISUALS, ...BOULOS_VISUALS, ...RENAN_VISUALS,
};
