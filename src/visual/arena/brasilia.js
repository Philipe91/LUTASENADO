// ARENA 1 — Praça dos Três Poderes (blockout procedural: silhueta do Congresso, pôr do sol, multidão).
import * as THREE from 'three';

function gradientTexture(stops) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  for (const [p, col] of stops) grd.addColorStop(p, col);
  g.fillStyle = grd; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#e9e3d6'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#cfc6b3'; g.lineWidth = 4;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 400; c.height = 280;
  const g = c.getContext('2d');
  g.fillStyle = '#009c3b'; g.fillRect(0, 0, 400, 280);
  g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(200, 24); g.lineTo(376, 140); g.lineTo(200, 256); g.lineTo(24, 140); g.closePath(); g.fill();
  g.fillStyle = '#002776'; g.beginPath(); g.arc(200, 140, 70, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.arc(200, 230, 120, Math.PI * 1.22, Math.PI * 1.78); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildBrasilia(scene) {
  const root = new THREE.Group();
  scene.add(root);

  scene.background = gradientTexture([[0, '#2a1b5e'], [0.45, '#b8457a'], [0.72, '#ff7a3d'], [1, '#ffc46b']]);
  scene.fog = new THREE.Fog(0xf59a5a, 45, 160);

  const hemi = new THREE.HemisphereLight(0xffe2c4, 0x51466b, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc48a, 2.6);
  sun.position.set(-6, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -2, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8f7bff, 0.9);
  rim.position.set(4, 5, -8);
  scene.add(rim);

  const white = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.75, emissive: 0x5a4a5a });
  const shade = new THREE.MeshStandardMaterial({ color: 0xd9d1c2, roughness: 0.8 });

  // chão: laje de luta + gramado da Esplanada
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x6f8f3a, roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = -0.02;
  root.add(lawn);
  const floorTex = floorTexture();
  floorTex.repeat.set(16, 6);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(44, 0.3, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }));
  floor.position.set(0, -0.15, -4);
  floor.receiveShadow = true;
  root.add(floor);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(44.4, 0.12, 0.25), new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.5 }));
  edge.position.set(0, 0.01, 3);
  root.add(edge);

  // espelho d'água
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 10), new THREE.MeshStandardMaterial({ color: 0x5e8fd6, roughness: 0.08, metalness: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.01, -44);
  root.add(water);

  // CONGRESSO: laje, 2 torres, cúpula para cima (Câmara) e para baixo (Senado)
  const Z = -62;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(70, 2.2, 14), white);
  slab.position.set(0, 1.1, Z);
  root.add(slab);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 16), shade);
  ramp.position.set(-22, 1.0, Z + 12); ramp.rotation.x = 0.13;
  root.add(ramp);
  for (const x of [-1.9, 1.9]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 30, 1.6), white);
    tower.position.set(x, 2.2 + 15, Z - 3);
    root.add(tower);
    for (let y = 4; y < 32; y += 1.2) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.25, 1.62), shade);
      band.position.set(x, y, Z - 3);
      root.add(band);
    }
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 1.2), white);
  bridge.position.set(0, 22, Z - 3);
  root.add(bridge);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(9, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white);
  bowl.scale.set(1, 0.42, 1); bowl.position.set(-17, 2.2 + 3.8, Z);
  root.add(bowl);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), white);
  dome.scale.set(1, 0.6, 1); dome.position.set(17, 2.2, Z);
  root.add(dome);

  // colunas "palácio" nas laterais do enquadramento
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 7, 10), white);
      col.position.set(side * (26 + i * 2.2), 3.5, -18);
      root.add(col);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 4), white);
    roof.position.set(side * 31.5, 7.2, -18);
    root.add(roof);
  }

  // mastro + bandeira tremulando
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 16, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 }));
  pole.position.set(11, 8, -14);
  root.add(pole);
  const flagGeo = new THREE.PlaneGeometry(4, 2.8, 20, 8);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.9 }));
  flag.position.set(13.05, 14.4, -14);
  root.add(flag);
  const flagBase = flagGeo.attributes.position.array.slice();

  // multidão: silhuetas pulando dos dois lados (sobe a energia nos especiais)
  const crowdGeo = new THREE.CapsuleGeometry(0.28, 0.9, 3, 8);
  const crowdMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const N = 110;
  const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, N);
  const palette = [0x1d3a8a, 0xd62828, 0x1fa34a, 0xffd400, 0xffffff, 0x222222, 0xff7a3d, 0x7a4fd6];
  const seats = [];
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (6 + Math.random() * 18), z = -16 - Math.random() * 10;
    seats.push({ x, z, phase: Math.random() * 6, speed: 4 + Math.random() * 4, s: 0.9 + Math.random() * 0.3 });
    crowd.setColorAt(i, col.setHex(palette[i % palette.length]));
  }
  root.add(crowd);

  let energy = 0;
  return {
    root,
    excite(v) { energy = Math.min(1, energy + v); },
    update(dt, time) {
      energy = Math.max(0, energy - dt * 0.4);
      for (let i = 0; i < N; i++) {
        const s = seats[i];
        const jump = Math.max(0, Math.sin(time * s.speed + s.phase)) * (0.08 + energy * 0.6);
        m4.makeScale(s.s, s.s, s.s).setPosition(s.x, 0.75 * s.s + jump, s.z);
        crowd.setMatrixAt(i, m4);
      }
      crowd.instanceMatrix.needsUpdate = true;
      const p = flagGeo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const x = flagBase[i] + 2;
        p[i + 2] = Math.sin(x * 1.6 - time * 5) * 0.18 * (x / 4);
      }
      flagGeo.attributes.position.needsUpdate = true;
    },
  };
}
