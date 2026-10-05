// ARENA 1 — Esplanada dos Ministérios ao pôr do sol (diorama de brinquedo).
// Camadas, de trás pra frente (cada uma mais dessaturada/enevoada que a da frente = profundidade de campo fake):
//   céu em gradiente → FUNDO PINTADO (Congresso, espelho d'água, ministérios; acompanha a câmera = "infinito") →
//   borda do espelho d'água, ipês, carro de som e palanque → plateia de papelão, bandeiras, gradil com faixas →
//   laje de luta (concreto + linhas de palanque, única que recebe sombra).
// Custo: ~9 draw calls e poucos milhares de triângulos de cenário (ver ?stats=1).
import * as THREE from 'three';
import {
  Baker, makeSky, makeClouds, makeCloth, makeCrowd, makeBackdrop, clothAtlas, FLAG_DRAW, fightFloorTex, grassTex,
  tree, rng, lin,
} from './kit.js';

export const GY = -0.6; // nível do gramado (a laje de luta é um palanque 0,6 acima)

export function buildBrasilia(scene, opts = {}) {
  // céu casado com as bordas da pintura (topo violeta, laterais laranja-rosado)
  const P = {
    zenith: 0x5a58b0, upper: 0x9a5aa0, mid: 0xe0685a, horizon: 0xf29a5a, below: 0x6a5a30,
    haze: 0xd89a86, sunCol: 0xffc070, glow: 0.25, sunSize: 0.0001, fog: 0xd89a86,
    grass: { a: '#7d8a32', b: '#6f7c2c', dry: '#a39a44' }, lawnTint: 0xd8c0a0, lawnEnd: -30,
    clouds: false,
    scenery: esplanadaScenery,
    ...opts.palette,
  };
  return buildEsplanada(scene, P, opts);
}

export function buildEsplanada(scene, P, { night = false } = {}) {
  const root = new THREE.Group();
  scene.add(root);
  const U = { time: { value: 0 } };
  const r = rng(42);
  const hz = (z) => THREE.MathUtils.clamp((-z - 14) / 150, 0, 0.8); // névoa por profundidade

  scene.background = new THREE.Color(P.horizon);
  scene.fog = new THREE.Fog(P.fog, 70, 420); // longe dos lutadores (câmera fica a < 40)

  // ---- luzes (só lutadores e laje usam; o resto é assado) ----
  const hemi = new THREE.HemisphereLight(night ? 0x9fb4ff : 0xffe6cc, night ? 0x2a2440 : 0x5a4a66, night ? 0.95 : 1.15);
  const sun = new THREE.DirectionalLight(night ? 0xcfdcff : 0xffc994, night ? 1.7 : 2.5);
  sun.position.set(-6, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -2, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  const rim = new THREE.DirectionalLight(night ? 0xffb35a : 0xb48cff, night ? 1.5 : 0.9);
  rim.position.set(4, 5, -8);
  root.add(hemi, sun, rim);

  // ---- céu (+ nuvens 3D quando não há fundo pintado) ----
  root.add(makeSky({ zenith: P.zenith, upper: P.upper, mid: P.mid, horizon: P.horizon, below: P.below, sunDir: P.sunDir || [0.42, 0.045, -1], sunCol: P.sunCol, glow: P.glow ?? 0.6, sunSize: P.sunSize ?? 0.012, stars: P.stars || 0, moon: P.moon || null }));
  if (P.clouds !== false) {
    const clouds = [];
    for (let i = 0; i < 12; i++) {
      const f = i < 7;
      clouds.push({ x: -300 + r() * 600, y: f ? 40 + r() * 30 : 85 + r() * 70, z: f ? -390 : -330 - r() * 40, w: f ? 60 + r() * 50 : 80 + r() * 70, cell: i % 4, aspect: 0.32 + r() * 0.12, flip: r() < 0.5, speed: 0.5 + r() * 0.8, span: 700 });
    }
    root.add(makeClouds(clouds, { lit: P.cloudLit, shade: P.cloudShade, rim: P.cloudRim, opacity: P.cloudOpacity ?? 0.9, U }));
  }

  // ---- fundo: cada arena monta o seu (scenery) numa malha assada ----
  const far = new Baker({ L: [0.6, 0.45, 0.65], sun: night ? 0x8090c0 : 0xffd8b0, amb: night ? 0x404a78 : 0x8a7096, haze: P.haze, sky: night ? 0x303860 : 0x907aa0 });
  const cloth = [];
  const scenery = P.scenery({ root, far, cloth, r, hz, P, night, U });
  if (far.parts.length) root.add(far.build());

  // ---- gramado (termina em lawnEnd quando o fundo pintado assume dali pra trás) ----
  const gTex = grassTex(P.grass);
  const z0 = P.lawnEnd ?? -450, z1 = 60;
  gTex.repeat.set(900 / 4, (z1 - z0) / 4);
  // escurece o gramado perto da câmera (vinheta barata: a borda de baixo do retrato não rouba a atenção)
  const lawnGeo = new THREE.PlaneGeometry(900, z1 - z0, 1, 24);
  const lc = new Float32Array(lawnGeo.attributes.position.count * 3);
  for (let i = 0; i < lawnGeo.attributes.position.count; i++) {
    const z = (z0 + z1) / 2 - lawnGeo.attributes.position.getY(i); // y local vira -z depois da rotação
    const k = 1 - 0.5 * THREE.MathUtils.smoothstep(z, 6, 22);
    lc[i * 3] = lc[i * 3 + 1] = lc[i * 3 + 2] = k;
  }
  lawnGeo.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const lawn = new THREE.Mesh(lawnGeo, new THREE.MeshBasicMaterial({ map: gTex, vertexColors: true, color: P.lawnTint ?? 0xb8a890 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, GY, (z0 + z1) / 2);
  root.add(lawn);

  // ---- plano médio assado: gradil, laterais da laje, mastros ----
  const mid = new Baker({ L: [0.55, 0.55, 0.65], sun: night ? 0x8090c0 : 0xffd2a8, amb: night ? 0x3a3a66 : 0x7a6690, haze: P.haze, sky: night ? 0x303860 : 0x9a86aa });
  // gradil (grade de contenção) atrás da laje
  for (let x = -30; x < 30; x += 2.4) {
    const hzF = 0.12;
    mid.box(2.3, 0.07, 0.07, 0x9aa0a8, { pos: [x + 1.2, GY + 1.05, -10.6], haze: hzF, ao: 0 });
    mid.box(2.3, 0.07, 0.07, 0x9aa0a8, { pos: [x + 1.2, GY + 0.15, -10.6], haze: hzF, ao: 0 });
    for (let k = 0; k < 6; k++) mid.box(0.04, 0.9, 0.04, 0x8b9199, { pos: [x + 0.2 + k * 0.4, GY + 0.6, -10.6], haze: hzF, ao: 0 });
    mid.box(0.6, 0.05, 0.25, 0x6c727a, { pos: [x + 0.2, GY + 0.02, -10.6], haze: hzF, ao: 0 });
  }
  // palanque de luta: fundo e saia listrada verde/amarela na frente (aparece no retrato)
  mid.box(60, 0.6, 0.3, 0xcfc6b4, { pos: [0, GY + 0.3, -9.1], ao: 0 });
  for (let i = 0; i < 30; i++) mid.box(2, 0.6, 0.06, i % 2 ? 0x1f5a3a : 0xa88a34, { pos: [-29 + i * 2, GY + 0.3, 9.03], ao: 0, haze: 0.1 });
  mid.box(60, 0.1, 0.12, 0xf7f2e8, { pos: [0, -0.02, 9.05], ao: 0 });
  // mastros das bandeirinhas da plateia
  const flagPoles = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, x = side * (4.5 + r() * 18), z = -13 - r() * 6, h = 2.6 + r() * 1.2;
    mid.box(0.05, h, 0.05, 0x7a6a58, { pos: [x, GY + h / 2, z], ao: 0, haze: 0.15 });
    flagPoles.push({ x, z, top: GY + h });
  }
  // mastros das faixas altas
  for (const [x, z] of [[-15.75, -15], [-10.25, -15], [10.75, -16], [16.25, -16]]) mid.box(0.05, 3.2, 0.05, 0x5e5246, { pos: [x, GY + 1.6, z], haze: 0.15, ao: 0 });
  scenery.mid?.(mid);
  root.add(mid.build());

  // ---- panos: bandeiras e faixas fictícias ----
  const atlas = clothAtlas([FLAG_DRAW.brasil, FLAG_DRAW.partidoEstrela, FLAG_DRAW.partidoVerde, FLAG_DRAW.toga, FLAG_DRAW.amarela, FLAG_DRAW.branca]);
  document.fonts?.ready.then(() => atlas.userData.redraw());
  flagPoles.forEach((p, i) => cloth.push({ type: 'flag', idx: 1 + (i % 5), w: 1.1, h: 0.76, pos: [p.x + 0.03, p.top - 0.4, p.z], haze: 0.15, tint: 0xe8e2da }));
  // faixas penduradas no gradil, de frente pra câmera
  const bannerX = [-17, -8.5, 8.5, 17];
  bannerX.forEach((x, i) => cloth.push({ type: 'banner', idx: i, w: 6.8, h: 0.85, pos: [x, GY + 0.62, -10.5], amp: 0.05, haze: 0.08 }));
  // faixas altas seguradas pela plateia
  cloth.push({ type: 'banner', idx: 3, w: 5.5, h: 0.7, pos: [-13, GY + 2.4, -15], amp: 0.12, haze: 0.22 });
  cloth.push({ type: 'banner', idx: 0, w: 5.5, h: 0.7, pos: [13.5, GY + 2.5, -16], amp: 0.12, haze: 0.24 });
  root.add(makeCloth(cloth, atlas, U, { haze: P.haze }));

  // ---- plateia: recortes instanciados ----
  const shirts = P.shirts ?? [0xd23b3b, 0x2f8f4e, 0xf2c230, 0x2c55a8, 0xf3efe6, 0xe0703a, 0x3d3a4a];
  const seats = [];
  const hazeC = lin(P.haze);
  for (let row = 0; row < 6; row++) {
    const z = -11.6 - row * 1.3, n = 36 + row * 4, spread = 30 + row * 2;
    for (let i = 0; i < n; i++) {
      const x = -spread + (i + r() * 0.8) * (spread * 2 / n);
      if (Math.abs(x) < 3.2 + row * 0.5 && r() < 0.85) continue; // respiro no centro (vê-se o Congresso atrás dos lutadores)
      const c = lin(shirts[Math.floor(r() * shirts.length)]).lerp(hazeC, (night ? 0.5 : 0.36) + row * 0.05).multiplyScalar(night ? 0.6 : 0.88 - row * 0.03);
      seats.push({ x, y: GY, z: z - r() * 0.4, s: 0.9 + r() * 0.22, color: c, flip: r() < 0.5, dim: night ? 0.6 : 0.88 - row * 0.05 });
    }
  }
  const crowd = makeCrowd(seats, U);
  root.add(crowd.mesh);

  // ---- laje de luta ----
  const FW = 60, FD = 18, FZ = 0; // z de -9 a 9
  const floorTex = fightFloorTex({ W: FW, D: FD, z0: (0 - (FZ - FD / 2)) / FD, base: P.floor ?? '#d9d1c1', joint: P.joint ?? '#b9ae9a', lines: P.lines ?? '#f2c230', accent: P.accent ?? '#1f8a46', night });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, FZ);
  floor.receiveShadow = true;
  root.add(floor);

  // ---- vida ----
  let energy = 0, kick = 0;
  const api = {
    root,
    U,
    // gancho de reação: 0..1 (golpe forte ~0.3, KO/ultimate 1). Plateia pula em onda e levanta os braços.
    react(v = 0.3) {
      energy = Math.min(1.2, energy + v);
      if (v >= 0.2) { crowd.uni.uKickT.value = U.time.value; crowd.uni.uKick.value = Math.min(1, 0.35 + v); kick = 1; }
    },
    excite(v) { api.react(v); },
    update(dt, time) {
      U.time.value = time;
      energy = Math.max(0, energy - dt * 0.35);
      crowd.uni.uEnergy.value = energy;
      scenery.update?.(dt, time, energy);
    },
  };
  return api;
}

// Esplanada de dia: fundo pintado + borda do espelho d'água + ipês nas laterais + carro de som e palanque.
function esplanadaScenery({ root, far, cloth, r, hz, P }) {
  root.add(makeBackdrop('assets/arena/brasilia_backdrop.webp', { D: 210, horizonV: 0.555, centerU: 0.545, sat: 0.82, bright: 0.93, tint: P.haze, tintAmt: 0.06 }));
  // borda de concreto onde o gramado 3D termina e começa a água pintada
  far.box(140, 0.35, 0.8, 0xe2d6c4, { pos: [0, GY + 0.1, P.lawnEnd + 0.4], haze: 0.25, ao: 0 });
  // ipês floridos nas laterais (parallax contra a pintura)
  const canopies = [0xf2c230, 0xf2c230, 0xe58fb4, 0x7b9444];
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1, z = -21 - r() * 7, x = side * (16 + r() * 16);
    tree(far, x, z, { canopy: canopies[i % canopies.length], s: 1.1 + r() * 0.5, haze: 0.22 + hz(z), r });
  }
  cloth.push({ type: 'banner', idx: 2, w: 6.6, h: 0.82, pos: [17.5, GY + 3.4, -23.5], amp: 0.03, haze: 0.18 });
  return {
    mid(mid) {
      soundTruck(mid, -15.5, -26, { haze: 0.16 });
      palanque(mid, 17.5, -22, { haze: 0.16 });
    },
  };
}

// trio elétrico / carro de som: cabine + baú + paredão de caixas + plataforma com grade
export function soundTruck(B, x, z, { haze = 0.2, night = false } = {}) {
  const y0 = GY;
  B.box(9, 2.2, 2.6, 0xf2c230, { pos: [x, y0 + 0.6 + 1.1, z], haze, groundY: y0 });     // baú
  B.box(9.04, 0.45, 2.64, 0x1f8a46, { pos: [x, y0 + 1.2, z], haze });                      // faixa verde
  B.box(2.2, 2.1, 2.5, 0xf0ece4, { pos: [x + 5.7, y0 + 0.6 + 1.05, z], haze });            // cabine
  B.box(0.06, 0.8, 2.0, 0x2a3346, { pos: [x + 6.81, y0 + 2.1, z], haze, emissive: 0.3 });  // para-brisa
  for (const wx of [-3, -1.6, 5.6]) for (const s of [-1, 1]) B.add(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), 0x22232a, { pos: [x + wx, y0 + 0.55, z + s * 1.2], rot: [Math.PI / 2, 0, 0], haze, ao: 0 });
  // paredão de caixas de som em cima, viradas pra plateia
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    B.box(1.1, 1.0, 1.0, 0x2e2d36, { pos: [x - 3.2 + i * 1.25, y0 + 2.8 + 0.5 + j * 1.05, z + 0.4], haze, ao: 0 });
    B.add(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 10), night ? 0xff6a3a : 0x55555f, { pos: [x - 3.2 + i * 1.25, y0 + 3.3 + j * 1.05, z + 0.93], rot: [Math.PI / 2, 0, 0], haze, ao: 0, emissive: night ? 0.7 : 0 });
  }
  B.box(9, 0.08, 0.08, 0xd0d0d0, { pos: [x, y0 + 5.0, z - 1.2], haze, ao: 0 });
}

// palanque com púlpito, microfones e painel de fundo
export function palanque(B, x, z, { haze = 0.2 } = {}) {
  const y0 = GY;
  B.box(7, 1.2, 3.4, 0x6b4a33, { pos: [x, y0 + 0.6, z], haze, groundY: y0 });
  for (let i = 0; i < 7; i++) B.box(1, 1.0, 0.05, i % 2 ? 0x1f8a46 : 0xf2c230, { pos: [x - 3 + i, y0 + 0.55, z + 1.73], haze, ao: 0 });
  B.box(1.1, 1.3, 0.7, 0x2c3e75, { pos: [x, y0 + 1.85, z + 0.6], haze, ao: 0 });            // púlpito
  B.box(0.04, 0.5, 0.04, 0x222222, { pos: [x - 0.2, y0 + 2.75, z + 0.7], rot: [0, 0, 0.3], haze, ao: 0 });
  B.box(0.04, 0.5, 0.04, 0x222222, { pos: [x + 0.2, y0 + 2.75, z + 0.7], rot: [0, 0, -0.3], haze, ao: 0 });
  B.box(7.2, 3.2, 0.15, 0x1d3a8a, { pos: [x, y0 + 2.8, z - 1.6], haze, ao: 0 });            // painel
  B.box(7.2, 0.35, 0.18, 0xf2c230, { pos: [x, y0 + 4.2, z - 1.58], haze, ao: 0 });
  for (const s of [-1, 1]) B.box(0.12, 5, 0.12, 0x3a3a3a, { pos: [x + s * 3.7, y0 + 2.5, z - 1.6], haze, ao: 0 });
}
