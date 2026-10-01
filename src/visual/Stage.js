// Renderer, cena e câmera lateral dinâmica (enquadra os dois, treme no impacto, close no ultimate).
import * as THREE from 'three';

export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 500);
    this.camera.position.set(0, 1.8, 11);
    this.cam = { x: 0, y: 1.8, z: 11, lookY: 1.15 };
    this.shakeAmt = 0;
    this.kick = { x: 0, v: 0 }; this.roll = { x: 0, v: 0 };
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // dir (±1, opcional): tranco direcional — a câmera é empurrada no sentido do golpe e inclina (roll) um pouco
  shake(v, dir = 0) {
    this.shakeAmt = Math.min(0.6, Math.max(this.shakeAmt, v));
    if (dir) {
      this.kick.v += dir * v * 9;          // empurrão lateral (mola devolve)
      this.roll.v += -dir * v * 1.6;       // tilt curto
    }
  }

  // zoom rápido de impacto (k = fração de aproximação), decai sozinho
  punch(k) { this.punchAmt = Math.max(this.punchAmt || 0, k); }

  // câmera lenta do KO: aproxima e centra um pouco no ponto do último golpe por `secs` (tempo real)
  focus(x, y, secs = 1.8, amt = 0.22) { this.focusP = { x, y, t: secs, dur: secs, amt }; }

  // topo da forma de ultimate (cabeça + selo/chapéu): visual.transform.frameTop, ou altura × escala do stand-in
  static ultTop(f) {
    const tr = f.data.visual?.transform || {};
    return tr.frameTop ?? f.stats.height * (tr.standInScale || 1) + 0.5;
  }

  updateCamera(match, dt) {
    const c = this.cam;
    let tx, ty, tz, lookY, lookX;
    if (match?.cinematic) {
      // close da transformação, mas enquadrando a forma inteira (antes cortava cabeça/selo do Avatar)
      const f = match.cinematic.fighter;
      const top = Stage.ultTop(f);
      const halfTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      tx = f.x - f.facing * 0.2; lookX = f.x; lookY = top * 0.5;
      tz = Math.max(4.2, ((top * 0.5 + 0.4) / halfTan) * 1.3); // 1.3: folga das faixas pretas da cinemática
      ty = lookY - 0.3;
    } else if (match) {
      const [a, b] = match.fighters;
      const mid = (a.x + b.x) / 2, sep = Math.abs(a.x - b.x);
      const halfTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const aspect = this.camera.aspect; // aspect REAL (retrato ~0.5): travar em 0.9 cortava os lutadores
      const ultF = match.fighters.find((f) => f.state === 'ultimate');
      const topY = Math.max(Math.max(a.y, b.y) + 2.4, ultF ? Stage.ultTop(ultF) + 0.6 : 0); // cabeça + salto (ou forma de ultimate)
      const halfW = sep / 2 + 1.7;                         // corpo + margem de knockback
      const needX = halfW / (halfTan * aspect);
      const needY = (topY / 2 + 0.5) / halfTan;            // do chão até o topo, com folga
      tz = THREE.MathUtils.clamp(Math.max(needX, needY), 6.5, 40);
      tx = mid; lookX = mid;
      lookY = Math.min(topY / 2, 1.35 + Math.max(a.y, b.y) * 0.5);
      ty = lookY + Math.min(2.2, 0.9 + (tz - 7) * 0.06); // levemente acima, sem olhar muito de cima ao afastar

    } else {
      tx = 0; ty = 1.9; tz = 12; lookX = 0; lookY = 1.3;
    }
    // ---- impacto: zoom-soco + foco do KO, SEM nunca cortar os lutadores (piso de distância pelo enquadramento) ----
    let zoom = 0;
    if (this.punchAmt > 0) { zoom = this.punchAmt; this.punchAmt = Math.max(0, this.punchAmt - dt * 0.6); }
    const fp = this.focusP;
    if (fp) {
      fp.t -= dt;
      const e = Math.sin(Math.PI * Math.min(1, Math.max(0, 1 - fp.t / fp.dur))); // entra e sai suave
      zoom = Math.max(zoom, fp.amt * Math.min(1, e * 1.6));
      if (match && !match.cinematic) { lookX += (fp.x - lookX) * 0.35 * e; lookY += (Math.min(fp.y, 1.6) - lookY) * 0.25 * e; }
      if (fp.t <= 0) this.focusP = null;
    }
    if (zoom > 0) {
      tz *= 1 - zoom;
      if (match && !match.cinematic) {
        const [a, b] = match.fighters;
        const halfTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        const halfW = Math.max(Math.abs(a.x - lookX), Math.abs(b.x - lookX)) + 0.95; // corpo inteiro + folga
        const top = Math.max(a.y + a.stats.height, b.y + b.stats.height) + 0.35;
        const tzMin = Math.max(halfW / (halfTan * this.camera.aspect), (Math.max(top - lookY, lookY) + 0.15) / halfTan);
        tz = Math.max(tz, tzMin);
        tx = lookX;
      }
    }
    const k = Math.min(1, dt * (match?.cinematic ? 9 : 5));
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * k;
    c.lookY += (lookY - c.lookY) * k;
    c.lookX = (c.lookX ?? lookX) + (lookX - (c.lookX ?? lookX)) * k;
    const s = this.shakeAmt;
    // molas do tranco direcional e do tilt (subpassos: estáveis com dt grande)
    for (const [m, kk, cc] of [[this.kick, 140, 13], [this.roll, 120, 12]]) {
      const n = Math.ceil(dt / 0.008), h = dt / Math.max(1, n);
      for (let i = 0; i < n; i++) { m.v += (-kk * m.x - cc * m.v) * h; m.x += m.v * h; }
    }
    const kx = Math.max(-0.35, Math.min(0.35, this.kick.x));
    this.camera.position.set(c.x + kx + (Math.random() - 0.5) * s, c.y + (Math.random() - 0.5) * s, c.z);
    this.camera.lookAt(c.lookX + kx * 0.5, c.lookY, 0);
    this.camera.rotateZ(Math.max(-0.045, Math.min(0.045, this.roll.x)));
    this.shakeAmt = Math.max(0, s - dt * 2.2);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
