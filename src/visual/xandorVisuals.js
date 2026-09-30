// Visuais dos especiais do Xandor (mesma interface dos PROJECTILE_VISUALS: build(h) → Group, animate(v, h, dt)).
//   paper — INTIMAÇÃO: documento legível (timbre, linhas, selo vermelho) voando e tremulando
//   stamp — BLOQUEADO: carimbo gigante sobe, desce seco no alvo (squash) e levanta; marca no chão
//   pen   — CANETADA: caneta colossal arma acima do alvo e risca em diagonal; a TINTA fica no corpo só se acertou
//           (h.landed), senão o risco fica no chão
// Frames vêm da lógica: impacto em t = h.delay; h.landed = contato confirmado pela lógica.
import * as THREE from 'three';

const GOLD = 0xd4af37;
const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...extra });
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeIn = (x) => x * x * x;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let docTex, stampTex, floorTex;
const documentTexture = () => (docTex ||= canvasTex(256, 340, (g, w, h) => {
  g.fillStyle = '#fbf7ea'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#9a8a5a'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#1a1a1a'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center';
  g.fillText('INTIMAÇÃO', w / 2, 58);
  g.fillStyle = '#555'; for (let i = 0; i < 7; i++) g.fillRect(28, 92 + i * 24, w - 56 - (i % 3) * 30, 6);
  g.fillStyle = '#c21d1d'; g.beginPath(); g.arc(w - 64, h - 62, 36, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fbf7ea'; g.font = 'bold 20px Georgia, serif'; g.fillText('STF', w - 64, h - 55);
}));
const stampFaceTexture = () => (stampTex ||= canvasTex(512, 170, (g, w, h) => {
  g.fillStyle = '#b81d1d'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#fff'; g.font = 'bold 84px Impact, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BLOQUEADO', w / 2, h / 2 + 4);
}));
const floorStampTexture = () => (floorTex ||= canvasTex(512, 200, (g, w, h) => {
  g.strokeStyle = '#d62828'; g.fillStyle = '#d62828'; g.lineWidth = 12;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.font = 'bold 92px Impact, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BLOQUEADO', w / 2, h / 2 + 6);
}));

function marker(color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
  return m;
}

export const XANDOR_VISUALS = {
  paper: {
    build: () => {
      const g = new THREE.Group();
      const doc = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.82), new THREE.MeshStandardMaterial({ map: documentTexture(), side: THREE.DoubleSide, roughness: 0.8 }));
      g.add(doc); g.userData.doc = doc; g.userData.center = true;
      return g;
    },
    animate: (v, h) => {
      const d = v.userData.doc, t = h.t;
      d.rotation.set(Math.sin(t * 0.35) * 0.35, Math.sin(t * 0.22) * 0.5, -h.facing * 0.3 + Math.sin(t * 0.5) * 0.15);
      d.position.y = Math.sin(t * 0.3) * 0.05;
    },
  },

  stamp: {
    build: () => {
      const g = new THREE.Group();
      const ring = marker(0xd62828); g.add(ring);
      const stamp = new THREE.Group();
      const faceMat = new THREE.MeshStandardMaterial({ map: stampFaceTexture(), roughness: 0.5 });
      const red = std(0xb81d1d);
      // caixa: frente (+z) com "BLOQUEADO" legível na câmera
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.9), [red, red, red, red, faceMat, red]);
      base.position.y = 0.25;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 12), std(0x3a2414));
      neck.position.y = 0.85;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), std(0x3a2414));
      knob.position.y = 1.3; knob.scale.y = 0.8;
      stamp.add(base, neck, knob);
      g.add(stamp);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.75), new THREE.MeshBasicMaterial({ map: floorStampTexture(), transparent: true, opacity: 0, depthWrite: false }));
      mark.rotation.x = -Math.PI / 2; mark.position.y = 0.025; g.add(mark);
      Object.assign(g.userData, { ring, stamp, mark });
      return g;
    },
    animate: (v, h) => {
      const { ring, stamp, mark } = v.userData, D = Math.max(1, h.delay), t = h.t;
      ring.material.opacity = t < D ? 0.4 + 0.4 * Math.sin(t * 0.8) : 0;
      if (t < D) {
        // 0–60%: sobe armando (3 → 4.6 m); 60–100%: desce seco
        const q = t / D;
        const y = q < 0.6 ? 3 + 1.6 * (q / 0.6) : 4.6 * (1 - easeIn((q - 0.6) / 0.4));
        stamp.position.y = y; stamp.scale.set(1, 1, 1); stamp.rotation.z = q < 0.6 ? -h.facing * 0.15 * (q / 0.6) : 0;
        stamp.visible = q > 0.08;
        mark.material.opacity = 0;
      } else {
        const k = t - D; // pós-impacto: squash → segura → levanta
        const squash = k < 4 ? 1 - 0.25 * Math.sin((k / 4) * Math.PI) : 1;
        stamp.scale.set(1 + (1 - squash) * 0.6, squash, 1 + (1 - squash) * 0.6);
        stamp.position.y = k < 8 ? 0 : (k - 8) * 0.4;
        stamp.rotation.z = 0; stamp.visible = true;
        mark.material.opacity = clamp01(1 - (k - 8) / 14);
      }
    },
  },

  pen: {
    build: () => {
      const g = new THREE.Group();
      const ring = marker(0x1a1a1a); g.add(ring);
      const pivot = new THREE.Group(); g.add(pivot); // gira em volta do topo: a ponta varre o alvo
      const pen = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.4, 12), std(0x111111, { metalness: 0.5, roughness: 0.3 }));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 12), std(GOLD, { metalness: 0.85, roughness: 0.25 }));
      band.position.y = 0.7;
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), std(GOLD, { metalness: 0.85, roughness: 0.25 }));
      clip.position.set(0.13, 0.75, 0);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 12), std(GOLD, { metalness: 0.85, roughness: 0.25 }));
      tip.rotation.x = Math.PI; tip.position.y = -1.42;
      pen.add(body, band, clip, tip);
      pen.position.y = -1.25; // topo da caneta no pivô
      pivot.add(pen);
      const ink = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x0c0c2a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      g.add(ink);
      Object.assign(g.userData, { ring, pivot, ink });
      return g;
    },
    animate: (v, h) => {
      const { ring, pivot, ink } = v.userData, D = Math.max(1, h.delay), t = h.t, s = h.facing;
      ring.material.opacity = t < D ? 0.35 + 0.35 * Math.sin(t * 0.8) : 0;
      // pivô acima e atrás do alvo (do lado de quem lançou)
      pivot.position.set(-s * 0.9, 3.8, 0.35);
      const armed = -s * 1.25;           // armada: ponta apontando pra trás/cima
      const through = s * 0.75;          // depois do risco: passou do alvo
      const sweep = 6;                   // o risco dura 6 frames e TERMINA no frame do impacto
      let rot, vis = true;
      if (t < D - sweep) { const q = clamp01(t / (D - sweep)); rot = armed * (0.6 + 0.4 * q); vis = q > 0.1; }
      else if (t < D) rot = armed + (through - armed) * easeIn((t - (D - sweep)) / sweep);
      else rot = through + Math.sin(Math.min(1, (t - D) / 6) * Math.PI) * s * 0.08;
      pivot.rotation.z = rot;
      pivot.visible = vis && t < D + 14;
      pivot.scale.setScalar(t < D + 8 ? 1 : Math.max(0.01, 1 - (t - D - 8) / 6));
      // tinta: no corpo (diagonal na altura do peito) se acertou; senão um risco no chão
      if (t >= D) {
        const k = t - D;
        ink.visible = true;
        ink.material.opacity = 0.9 * clamp01(1 - (k - 8) / 12);
        ink.scale.set(Math.max(0.01, clamp01(k / 3)), 1, 1);
        if (h.landed) { ink.position.set(0, 1.25, 0.5); ink.rotation.set(0, 0, -s * 0.75); }
        else { ink.position.set(0, 0.03, 0); ink.rotation.set(-Math.PI / 2, 0, -s * 0.4); }
      } else ink.visible = false;
    },
  },
};
