// ULTIMATE do Lulácio — "O Polvão do Povo".  *** PROTÓTIPO TÉCNICO, NÃO É ARTE FINAL ***
// Valida timing/câmera/hits com um polvo procedural: cabeça-manto roxa com CHAPÉU PANAMÁ, barba branca,
// gravata vermelha e MICROFONE num tentáculo; 8 tentáculos com cadeia de "ossos" (grupos aninhados).
// Transformação: durante a cinemática o Lulácio encolhe/some numa fumaça roxa e o polvo cresce no lugar.
// Hits: um tentáculo por hit chicoteia e encosta no alvo NO frame do dano (12 + k·interval).
// Finalizador (hitsEnd+6): todos os tentáculos batem juntos. Fim: polvo encolhe e o Lulácio volta.
import * as THREE from 'three';

const PURPLE = 0x7a4fd6;
const std = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...extra });
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => x * x * (3 - 2 * x);
const SEG = 10;

function makeTentacle(len, radius) {
  // cadeia de segmentos: cada um filho do anterior (rotação acumula = curva do tentáculo)
  const root = new THREE.Group();
  const segs = [];
  let parent = root;
  const segLen = len / SEG;
  for (let i = 0; i < SEG; i++) {
    const r0 = radius * (1 - i / SEG) + 0.02, r1 = radius * (1 - (i + 1) / SEG) + 0.02;
    const joint = new THREE.Group();
    joint.position.y = i === 0 ? 0 : segLen;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segLen, 10), std(PURPLE));
    mesh.position.y = segLen / 2;
    // ventosas (bolinhas claras) em segmentos alternados
    if (i % 2 === 0) {
      const sucker = new THREE.Mesh(new THREE.SphereGeometry(r0 * 0.45, 8, 6), std(0xe8c7ff));
      sucker.position.set(0, segLen / 2, r0 * 0.85);
      joint.add(sucker);
    }
    joint.add(mesh);
    parent.add(joint);
    segs.push(joint);
    parent = joint;
  }
  return { root, segs, segLen };
}

function makeHead() {
  const g = new THREE.Group();
  const mantle = new THREE.Mesh(new THREE.SphereGeometry(1.3, 28, 20), std(PURPLE));
  mantle.scale.set(1, 1.25, 0.95); mantle.position.y = 1.4;
  const skinFace = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), std(0xf0c8a0));
  skinFace.rotation.x = Math.PI / 2 - 0.2; skinFace.position.set(0, 0.95, 0.72);
  const eyeW = std(0xffffff), eyeB = std(0x111111);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), eyeW); e.position.set(s * 0.36, 1.35, 1.12);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), eyeB); p.position.set(s * 0.36, 1.35, 1.32);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.08), std(0xf2f2f2)); brow.position.set(s * 0.36, 1.62, 1.18); brow.rotation.z = s * 0.25;
    g.add(e, p, brow);
  }
  // barba branca cheia (um volume só, abaixo da boca) + bigode — tufos em fila pareciam dentes
  const beardMat = std(0xededed, { roughness: 0.95 });
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), beardMat);
  beard.scale.set(1.05, 0.7, 0.55); beard.position.set(0, 0.62, 0.95);
  const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), beardMat);
  stache.rotation.z = Math.PI / 2; stache.position.set(0, 0.98, 1.24);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.05), std(0x5a1a1a));
  mouth.position.set(0, 0.86, 1.28);
  g.add(beard, mouth);
  // chapéu panamá
  const straw = std(0xe9d7a3, { roughness: 0.8 }), band = std(0x1b1b1b);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.06, 28), straw); brim.position.y = 2.75;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.55, 24), straw); crown.position.y = 3.05;
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.14, 24), band); hb.position.y = 2.86;
  const hat = new THREE.Group(); hat.add(brim, crown, hb); hat.rotation.z = -0.12;
  // colarinho + gravata vermelha
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 8, 24), std(0xffffff)); collar.rotation.x = Math.PI / 2; collar.position.y = 0.35;
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.12), std(0xc81e1e)); knot.position.set(0, 0.35, 0.82);
  const tie = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), std(0xc81e1e)); tie.position.set(0, -0.12, 0.84); tie.rotation.set(Math.PI, Math.PI / 4, 0);
  g.add(mantle, skinFace, stache, hat, collar, knot, tie);
  return g;
}

function makeMic() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.45, 10), std(0x1a1a1a, { metalness: 0.5 }));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), std(0x9a9a9a, { metalness: 0.8, roughness: 0.3 }));
  ball.position.y = 0.28; g.add(handle, ball);
  return g;
}

export class LulacioPolvo {
  constructor(scene) {
    this.scene = scene;
    this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    this.root = root;
    this.body = new THREE.Group(); root.add(this.body);
    this.body.add(makeHead());
    // 8 tentáculos saindo da base da cabeça, em leque
    this.tents = [];
    for (let i = 0; i < 8; i++) {
      const t = makeTentacle(3.6, 0.22);
      const a = (i / 8) * Math.PI * 2;
      t.root.position.set(Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.4);
      t.baseAng = a;
      this.body.add(t.root);
      this.tents.push(t);
    }
    this.mic = makeMic(); this.tents[1].segs[SEG - 1].add(this.mic); this.mic.position.y = 0.2;
    // fumaça roxa da transformação
    this.puffs = Array.from({ length: 10 }, () => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xb08cff, transparent: true, opacity: 0, depthWrite: false }));
      root.add(m); return m;
    });
    this.k = 0; this.tmpA = new THREE.Vector3(); this.tmpB = new THREE.Vector3();
  }

  // pose "solta" (ondulando) de um tentáculo
  idlePose(t, i, now) {
    const lift = i === 1 ? 0.9 : 0; // o do microfone fica erguido
    t.root.rotation.set(0, 0, 0);
    t.root.rotation.z = Math.cos(t.baseAng) * (1.2 - lift) ;
    t.root.rotation.x = -Math.sin(t.baseAng) * 0.9;
    t.segs.forEach((s, j) => {
      if (j === 0) return;
      s.rotation.z = Math.sin(now * 3 + i * 0.8 + j * 0.45) * 0.18 - (i === 1 ? 0.12 : 0);
      s.rotation.x = Math.cos(now * 2.5 + i + j * 0.3) * 0.08;
    });
  }

  // tentáculo esticado do ponto raiz até `target` (mundo), mais um arco de chicote (whip 1→0)
  strikePose(t, target, whip) {
    t.root.updateWorldMatrix(true, false);
    const from = t.root.getWorldPosition(this.tmpA);
    const dir = this.tmpB.copy(target).sub(from);
    const dist = dir.length();
    // orienta a raiz: eixo +Y do tentáculo aponta para o alvo (no espaço do corpo)
    const parentQ = t.root.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const localDir = dir.clone().normalize().applyQuaternion(parentQ);
    t.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), localDir);
    const scale = dist / (t.segLen * SEG);
    t.segs.forEach((s, j) => {
      s.scale.y = 1; s.rotation.set(0, 0, 0);
      if (j > 0) s.rotation.x = whip * 0.35 * Math.sin(j * 0.6); // curva de chicote antes do contato
    });
    t.root.scale.set(1, scale, 1);
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 40) : clamp01((end - f.t) / 16);
    this.k += (target - this.k) * Math.min(1, dt * 9);
    const k = smooth(clamp01(this.k)), now = performance.now() / 1000;
    this.hideBase = k > 0.5;
    this.root.visible = k > 0.01;
    this.root.position.set(f.x, f.y, 0);
    this.body.scale.setScalar(Math.max(0.01, k) * 0.78); // cabe na câmera com o chapéu
    this.body.rotation.y = f.facing > 0 ? 0.35 : -0.35; // de frente pra câmera, levemente virado ao alvo
    this.body.position.y = 0.55 + Math.sin(now * 2.2) * 0.06;
    // fumaça só na virada (k perto de 0.5)
    const puffK = Math.max(0, 1 - Math.abs(this.k - 0.5) * 3);
    this.puffs.forEach((p, i) => {
      p.position.set(Math.sin(i * 2.4) * 1.1, 1 + (i % 4) * 0.5, Math.cos(i * 1.7) * 0.5);
      p.scale.setScalar(0.6 + puffK * 1.2);
      p.material.opacity = 0.55 * puffK;
    });
    if (!this.root.visible) return;

    const o = f.opponent;
    const tgt = new THREE.Vector3(o.x, o.y + o.stats.height * 0.55, 0.2);
    const hitTent = (k2) => [0, 2, 3, 5, 6, 7][k2 % 6];
    for (let i = 0; i < 8; i++) this.idlePose(this.tents[i], i, now), (this.tents[i].root.scale.set(1, 1, 1));
    if (on && cine < 0) {
      for (let h = 0; h < u.hits; h++) {
        const hitF = 12 + h * u.interval, s = hitF - 7;
        if (f.t < s || f.t > hitF + 5) continue;
        const q = clamp01((f.t - s) / 7);
        const up = tgt.clone().add(new THREE.Vector3(-f.facing * 1.5, 3.5, 0));
        const aim = f.t <= hitF ? up.lerp(tgt, q * q) : tgt;
        this.strikePose(this.tents[hitTent(h)], aim, 1 - q);
      }
      if (f.t >= fin - 8 && f.t <= fin + 8) { // finalizador: todos (menos o do microfone) batem juntos
        const q = clamp01((f.t - (fin - 8)) / 8);
        this.tents.forEach((t, i) => {
          if (i === 1) return;
          const spread = new THREE.Vector3((i - 4) * 0.12, (i % 3) * 0.3, 0);
          const up = tgt.clone().add(new THREE.Vector3(0, 4, 0)).add(spread);
          this.strikePose(t, f.t <= fin ? up.lerp(tgt.clone().add(spread), q * q) : tgt.clone().add(spread), 1 - q);
        });
      }
    }
  }

  dispose() { this.scene.remove(this.root); }
}
