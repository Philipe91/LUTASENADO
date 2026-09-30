// Visuais dos Hitters (projéteis, zonas, veículos, multidões).
// Cada entrada: build(h) → Group (criado UMA vez e reciclado pelo pool do Vfx)
//               animate(v, h, dt) → anima conforme o estado do Hitter (entra → impacta → some)
// Se o Hitter tiver `model` (ex.: assets/props/caminhao.glb) e o arquivo existir, o Vfx troca o placeholder pelo GLB.
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { loadGLTF } from './models/GLBModel.js';

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
  truck: {
    build() {
      const g = new THREE.Group();
      const body = new THREE.Group();
      g.add(body);
      // frente do caminhão em +X; o Vfx gira 180° quando facing = -1
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 1.9), std(0x1fa34a));
      cab.position.set(1.85, 1.25, 0);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 1.85), std(0x1fa34a));
      hood.position.set(3.0, 0.75, 0);
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 2.0), std(0xdadada, { metalness: 0.7, roughness: 0.3 }));
      bumper.position.set(3.4, 0.45, 0);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 1.6), std(0x264b7a, { roughness: 0.1, metalness: 0.5 }));
      glass.position.set(2.71, 1.75, 0);
      const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.5, 2.0), std(0xf2f2f2));
      trailer.position.set(-0.95, 1.55, 0);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.35, 2.02), std(0xffd400));
      stripe.position.set(-0.95, 1.2, 0);
      body.add(cab, hood, bumper, glass, trailer, stripe);
      const wheels = [];
      const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 14);
      for (const x of [-2.2, -1.2, 1.6, 2.9]) for (const z of [-0.95, 0.95]) {
        const w = new THREE.Mesh(wg, std(0x111111));
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.42, z);
        body.add(w); wheels.push(w);
      }
      // o apoiador pendurado no para-brisa (boneco levíssimo)
      const guy = new THREE.Group();
      const shirt = std(0xffd400), skin = std(0xf0c8a0), pants = std(0x1d4ed8);
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 3, 8), shirt);
      torso.rotation.z = Math.PI / 2 - 0.2; torso.position.set(0, 0.1, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
      head.position.set(0.05, 0.62, 0.05);
      const armGeo = new THREE.CapsuleGeometry(0.07, 0.5, 3, 6);
      const armL = new THREE.Mesh(armGeo, shirt); armL.position.set(0, 0.35, 0.45); armL.rotation.x = 1.1;
      const armR = new THREE.Mesh(armGeo, shirt); armR.position.set(0, 0.35, -0.45); armR.rotation.x = -1.1;
      const legGeo = new THREE.CapsuleGeometry(0.09, 0.5, 3, 6);
      const legL = new THREE.Mesh(legGeo, pants); legL.position.set(0, -0.45, 0.2); legL.rotation.x = 0.5;
      const legR = new THREE.Mesh(legGeo, pants); legR.position.set(0, -0.45, -0.2); legR.rotation.x = -0.5;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), std(0x009c3b, { side: THREE.DoubleSide }));
      flag.position.set(0.05, 1.0, -0.8);
      guy.add(torso, head, armL, armR, legL, legR, flag);
      guy.position.set(2.85, 1.7, 0);
      guy.rotation.y = Math.PI / 2;
      body.add(guy);
      // offX: alinha o para-choque (x local 3.5) com a borda frontal da hitbox (w 2.8 → +1.4)
      g.userData = { body, wheels, guy, flag, offX: -2.1, offY: 0 };
      return g;
    },
    animate(v, h, dt) {
      const u = v.userData;
      v.rotation.y = h.facing > 0 ? 0 : Math.PI;
      for (const w of u.wheels) w.rotation.y += dt * 30;
      const now = performance.now() / 1000;
      u.body.position.y = Math.abs(Math.sin(now * 25)) * 0.06;
      u.body.rotation.z = Math.sin(now * 18) * 0.015;
      u.guy.rotation.x = Math.sin(now * 16) * 0.25;
      u.flag.rotation.y = Math.sin(now * 30) * 0.5;
    },
  },
};
