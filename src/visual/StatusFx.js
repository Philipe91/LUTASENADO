// Indicadores de ESTADO presos à cabeça do lutador (não são golpes):
//   atordoado (hitstun com animKey 'dizzy') → 3 estrelinhas girando em volta da cabeça
//   BLOQUEADO (lockT > 0, especiais travados pelo Xandor) → carimbo vermelho com cadeado acima da cabeça
import * as THREE from 'three';

function starTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32); g.fillStyle = '#ffe14a'; g.strokeStyle = '#7a4a00'; g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 11 : 27, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath(); g.fill(); g.stroke();
  return new THREE.CanvasTexture(c);
}

function lockTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.strokeStyle = '#d62828'; g.fillStyle = '#d62828'; g.lineWidth = 10;
  g.strokeRect(8, 8, 496, 144);
  // cadeado
  g.lineWidth = 9; g.beginPath(); g.arc(78, 66, 24, Math.PI, 0); g.stroke();
  g.fillRect(46, 66, 64, 54);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(78, 88, 8, 0, Math.PI * 2); g.fill(); g.fillRect(75, 90, 6, 16);
  g.fillStyle = '#d62828'; g.font = 'bold 66px Impact, Arial Black, sans-serif'; g.textBaseline = 'middle';
  g.fillText('BLOQUEADO', 130, 84);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class StatusFx {
  constructor(scene) {
    this.scene = scene;
    const starMat = new THREE.SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false });
    this.stars = Array.from({ length: 3 }, () => { const s = new THREE.Sprite(starMat); s.scale.setScalar(0.24); s.visible = false; scene.add(s); return s; });
    this.lock = new THREE.Sprite(new THREE.SpriteMaterial({ map: lockTexture(), transparent: true, depthWrite: false }));
    this.lock.scale.set(1.1, 0.34, 1); this.lock.visible = false; scene.add(this.lock);
    this.head = new THREE.Vector3();
    this.dizzyK = 0;
  }

  update(dt, f, model, scale = 1) {
    const hb = model?.bones?.get('head');
    if (hb) hb.getWorldPosition(this.head);
    else this.head.set(f.x, f.y + f.stats.height * scale - 0.15, f.heldZ || 0);
    const now = performance.now() / 1000;

    const dizzy = f.state === 'hitstun' && f.animKey === 'dizzy';
    this.dizzyK += ((dizzy ? 1 : 0) - this.dizzyK) * Math.min(1, dt * 10);
    this.stars.forEach((s, i) => {
      s.visible = this.dizzyK > 0.02;
      if (!s.visible) return;
      const a = now * 5 + (i * Math.PI * 2) / 3;
      s.position.set(this.head.x + Math.cos(a) * 0.45, this.head.y + 0.42 + Math.sin(a * 2) * 0.04, this.head.z + Math.sin(a) * 0.45);
      s.material.opacity = this.dizzyK;
      s.scale.setScalar(0.42 * this.dizzyK);
    });

    // carimbo acima da cabeça enquanto os especiais estão travados; pisca nos últimos 40 frames
    const L = f.lockT > 0;
    this.lock.visible = L && (f.lockT > 40 || Math.floor(now * 8) % 2 === 0);
    if (L) {
      const pop = Math.min(1, ((f.lockMax || 240) - f.lockT) / 8); // entra "carimbando" (grande → normal)
      this.lock.position.set(this.head.x, this.head.y + 0.7, this.head.z);
      this.lock.scale.set(1.1 * (1 + (1 - pop) * 0.8), 0.34 * (1 + (1 - pop) * 0.8), 1);
      this.lock.material.rotation = -0.08;
    }
  }

  dispose() { this.scene.remove(...this.stars, this.lock); }
}
