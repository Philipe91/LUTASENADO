// ULTIMATE do Agente Duvall — "BACKUP COMPLETO" (composição de VFX, o corpo base continua visível).
// Cinemática: um PENDRIVE GIGANTE desce do céu atrás dele e se CONECTA numa porta no chão (anel + faíscas), painel
// holográfico "COPIANDO... 0%" acende acima da cabeça. Golpes: cada hit dispara uma rajada de arquivos do pendrive
// ao alvo e a porcentagem sobe (37 → 62 → 84 → 99%). Finalizador: "100%" → EXPLOSÃO DE DOCUMENTOS no alvo + onda.
// Fim: o pendrive é ejetado para cima e some. Contato só quando a lógica confirma (f.ultRes[k] === 'hit').
import * as THREE from 'three';
import { Puffs, Rings, Shards, std, canvasTex, clamp01, smooth, easeIn, easeOut, add, flat } from '../fx/common.js';
import { makePendrive, fileTex, CYAN } from '../fx/duvalFx.js';

const PCT = [37, 62, 84, 99, 99, 99, 99, 99];
const N_FILES = 6;

// painel holográfico com texto + barra de progresso; redesenha só quando o texto muda
class Panel {
  constructor(scene) {
    this.c = document.createElement('canvas'); this.c.width = 512; this.c.height = 150;
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, opacity: 0 }));
    this.s.scale.set(2.6, 0.76, 1); this.s.renderOrder = 9; this.s.visible = false; scene.add(this.s);
    this.last = ''; this.draw('COPIANDO...', 0);
  }
  draw(label, pct, done = false) {
    const key = label + pct + done; if (key === this.last) return; this.last = key;
    const g = this.c.getContext('2d'), w = this.c.width, h = this.c.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(6,18,31,0.85)'; g.strokeStyle = done ? '#7dff9a' : '#35c4ff'; g.lineWidth = 8;
    g.fillRect(6, 6, w - 12, h - 12); g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#fff'; g.font = 'bold 52px Bangers, Impact, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(label, 26, 50); g.fillText(label, 26, 50);
    g.textAlign = 'right'; g.fillStyle = done ? '#7dff9a' : '#35c4ff'; g.strokeText(pct + '%', w - 26, 50); g.fillText(pct + '%', w - 26, 50);
    g.fillStyle = '#0e2a44'; g.fillRect(26, 92, w - 52, 30);
    g.fillStyle = done ? '#7dff9a' : '#35c4ff'; g.fillRect(26, 92, (w - 52) * pct / 100, 30);
    g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeRect(26, 92, w - 52, 30);
    this.tex.needsUpdate = true;
  }
}

export class DuvalBackup {
  constructor(scene) {
    this.scene = scene; this.hideBase = false;
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    this.root = root;
    this.drive = makePendrive(5.5); this.drive.rotation.z = -Math.PI / 2; root.add(this.drive); // conector para baixo
    this.port = new THREE.Group();
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.9), std(0x151a22, { roughness: 0.4 })); slot.position.y = 0.15;
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.32), std(CYAN, { emissive: CYAN, emissiveIntensity: 1.2 })); mouth.position.y = 0.31;
    this.port.add(slot, mouth); root.add(this.port);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 5, 12, 1, true), add(CYAN, 0)); this.beam.position.y = 2.5; root.add(this.beam);
    this.floor = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.6, 48), add(CYAN, 0)); this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = 0.03; root.add(this.floor);
    this.panel = new Panel(scene);
    this.rings = new Rings(scene, 4, CYAN);
    this.sparks = new Puffs(scene, 12, 0x9ae6ff, { opacity: 0.9 });
    this.pixels = new Shards(scene, 16, new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: CYAN, emissive: 0x0a4a66 }));
    this.papers = new Shards(scene, 26, new THREE.PlaneGeometry(0.34, 0.44), new THREE.MeshBasicMaterial({ map: fileTex(), side: THREE.DoubleSide, transparent: true }));
    const fMat = new THREE.MeshBasicMaterial({ map: fileTex(), side: THREE.DoubleSide, transparent: true, depthWrite: false });
    this.files = Array.from({ length: N_FILES }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), fMat); m.visible = false; scene.add(m); return m; });
    this.k = 0; this.plugged = false; this.lastHit = -1; this.boomed = false; this.head = new THREE.Vector3();
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    const u = f.ultimate, hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    const target = !on ? 0 : cine >= 0 ? clamp01((75 - cine) / 42) : clamp01((end - f.t) / 12);
    this.k += (target - this.k) * Math.min(1, dt * 9);
    const k = smooth(this.k), now = performance.now() / 1000;
    this.rings.update(dt); this.sparks.update(dt); this.pixels.update(dt); this.papers.update(dt);
    const vis = this.k > 0.01;
    this.root.visible = vis; this.panel.s.visible = vis;
    this.root.position.set(f.x, 0, 0);
    this.root.rotation.y = f.facing > 0 ? 0 : Math.PI;
    const o = f.opponent;
    // pendrive desce e CONECTA (k 0→0.6); no fim é ejetado para cima
    const drop = smooth(clamp01(k / 0.6));
    const eject = on && f.t > fin + 10 ? easeIn(clamp01((f.t - fin - 10) / 24)) : 0;
    const dy = 0.42 + (1 - drop) * 7 + eject * 9;
    this.drive.position.set(-1.1, dy, -1.3);
    this.drive.rotation.z = -Math.PI / 2 + Math.sin(now * 1.5) * 0.03 * drop;
    this.drive.userData.led.material.emissiveIntensity = (Math.floor(now * 6) % 2 ? 2.5 : 0.5);
    this.port.position.set(-1.1, 0, -1.3); this.port.scale.setScalar(Math.max(0.01, smooth(clamp01(k / 0.3))));
    if (drop >= 0.99 && !this.plugged) {
      this.plugged = true;
      this.rings.spawn(f.x - f.facing * 1.1, 0.05, { from: 0.3, to: 3.2, life: 0.45, opacity: 1, z: -1.3 });
      this.sparks.burst(new THREE.Vector3(f.x - f.facing * 1.1, 0.5, -1.3), { count: 10, spread: 1.2, up: 2.6, speed: 2.6, size: 0.25, grow: 1.8, life: 0.45, z: 0 });
    }
    if (!on) { this.plugged = false; this.lastHit = -1; this.boomed = false; }
    this.beam.material.opacity = 0.18 * k * (0.8 + 0.2 * Math.sin(now * 10)); this.beam.position.set(-1.1, 2.5, -1.3);
    this.floor.material.opacity = 0.5 * k; this.floor.rotation.z = -now * 0.7;
    // painel acima da cabeça
    const hb = model?.bones?.get('head');
    if (hb) hb.getWorldPosition(this.head); else this.head.set(f.x, f.y + f.stats.height - 0.15, 0);
    this.panel.s.position.set(this.head.x + f.facing * 0.7, this.head.y + 1.15, 0.3); // puxado pro meio: não corta na borda do retrato
    this.panel.s.material.opacity = k;
    let pct = Math.round(12 * drop), label = 'COPIANDO...', done = false;
    if (on && cine < 0) {
      for (let h = 0; h < u.hits; h++) if (f.t >= 12 + h * u.interval) pct = PCT[h];
      if (f.t >= fin - 10 && f.t < fin) { label = 'COPIANDO..'; pct = 99; }
      if (f.t >= fin) { label = 'BACKUP COMPLETO'; pct = 100; done = true; }
    }
    this.panel.draw(label, pct, done);
    this.panel.s.scale.set(2.6 * (done && f.t < fin + 6 ? 1.15 : 1), 0.76 * (done && f.t < fin + 6 ? 1.15 : 1), 1);

    if (!on || cine >= 0) { for (const m of this.files) m.visible = false; return; }
    // ---- rajadas de arquivos: saem do pendrive 7 frames antes do hit e chegam ao alvo no frame do dano ----
    const from = new THREE.Vector3(f.x - f.facing * 1.1, 2.6, -1.0), tgt = new THREE.Vector3(o.x, o.y + o.stats.height * 0.6, 0.2);
    for (let h = 0; h < u.hits; h++) {
      const hitF = 12 + h * u.interval, s = hitF - 7;
      if (f.t < s || f.t > hitF + 8) continue;
      const q = clamp01((f.t - s) / 7), hit = f.ultRes[h] === 'hit';
      this.files.forEach((m, i) => {
        const qi = clamp01(q - i * 0.07);
        m.visible = f.t < hitF ? qi > 0 : !hit;
        if (!m.visible) return;
        if (f.t < hitF) { m.position.lerpVectors(from, tgt, easeIn(qi)); m.position.y += Math.sin(qi * Math.PI) * 1.2 + (i % 3) * 0.15; m.position.z += (i % 2 ? 0.25 : -0.25); }
        else { const a = (f.t - hitF) / 8; m.position.copy(tgt).add(new THREE.Vector3(f.facing * a * 2.5, (i % 3) * 0.2 - a * a * 1.5, (i % 2 ? 0.3 : -0.3))); }
        m.rotation.set(f.t * 0.3 + i, i * 0.6, f.t * 0.2);
      });
      if (f.t === hitF && this.lastHit !== h) {
        this.lastHit = h;
        if (hit) {
          this.pixels.burst(tgt, { count: 8, speed: 2.6, up: 3.2, life: 0.5, size: 1, gravity: 10 });
          this.rings.spawn(tgt.x, tgt.y, { flat: false, from: 0.2, to: 1.6, life: 0.25, opacity: 0.9, z: 0.4 });
          this.sparks.burst(tgt, { count: 3, spread: 0.5, up: 1.4, speed: 2, size: 0.2, grow: 1.6, life: 0.3, z: 0.1 });
        }
      }
    }
    if (f.t > 12 + (u.hits - 1) * u.interval + 8) for (const m of this.files) m.visible = false;
    // ---- finalizador: 100% → explosão de documentos no alvo ----
    if (f.t >= fin && !this.boomed) {
      this.boomed = true;
      const hit = f.ultRes[u.hits] === 'hit';
      const at = hit ? tgt.clone() : new THREE.Vector3(f.x + f.facing * 2.2, 0.8, 0.2);
      this.papers.burst(at, { count: 26, speed: 5, up: 6, life: 1.1, size: 1, spreadZ: 1.5, gravity: 7, dirX: f.facing * 0.5 });
      this.pixels.burst(at, { count: 16, speed: 4, up: 5, life: 0.7, size: 1.3, gravity: 10 });
      this.rings.spawn(at.x, 0.05, { from: 0.4, to: 5, life: 0.5, opacity: 1 });
      this.rings.spawn(at.x, at.y, { flat: false, from: 0.3, to: 4.2, life: 0.4, opacity: 0.9, z: 0.4 });
      this.sparks.burst(at, { count: 10, spread: 1.6, up: 3, speed: 3, size: 0.3, grow: 2, life: 0.5, z: 0 });
    }
  }

  dispose() {
    this.scene.remove(this.root, this.panel.s, ...this.files);
  }
}
