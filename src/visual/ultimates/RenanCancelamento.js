// ULTIMATE do Renan Santos — "CANCELAMENTO EM MASSA" (procedural; ele continua ele mesmo, de fone).
// Cinemática: celular gigante aparece na frente dele com a tag AO VIVO e o contador de viewers subindo.
// Golpes: a cada hit uma RAJADA de hashtags (#CANCELADO, #FORA...), sininhos de notificação e polegares DISLIKE
// sai do celular e soterra o rival (contato só se f.ultRes[k] === 'hit'; errou → passa direto). Finalizador:
// AVALANCHE — montanha de DISLIKEs cai do alto em cima dele + carimbo CANCELADO! (a lógica trava os especiais dele).
import * as THREE from 'three';
import { Rings, Puffs, std, canvasTex, clamp01, easeIn, easeOut, smooth, bodyPoint, textSprite } from '../fx/common.js';
import { liveTagTex, LIVE } from '../fx/renanFx.js';

const TAGS = ['#CANCELADO', '#FORA', '#FLOPOU', '#RATIO', '#UNFOLLOW', '#BOICOTE'];
function badgeTex(kind) {
  return canvasTex(160, 160, (g, W, H) => {
    if (kind === 'dislike') {
      g.fillStyle = '#ff2a3a'; g.beginPath(); g.arc(80, 80, 72, 0, Math.PI * 2); g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = '#fff'; g.save(); g.translate(80, 84); g.rotate(Math.PI);
      g.fillRect(-36, -10, 18, 44); // punho
      g.beginPath(); g.moveTo(-14, -12); g.lineTo(-6, -46); g.quadraticCurveTo(6, -54, 10, -40); g.lineTo(6, -16); g.lineTo(34, -16); g.quadraticCurveTo(44, -10, 38, 2); g.lineTo(32, 32); g.lineTo(-14, 34); g.closePath(); g.fill(); g.restore();
    } else {
      g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(80, 70, 46, Math.PI, 0); g.lineTo(130, 112); g.lineTo(30, 112); g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = '#111'; g.stroke();
      g.beginPath(); g.arc(80, 122, 12, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#ff2a3a'; g.beginPath(); g.arc(122, 38, 30, 0, Math.PI * 2); g.fill();
      g.font = 'bold 36px Arial Black'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('99+', 122, 40);
    }
  });
}
const sprite = (tex, w, h) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(w, h, 1); s.visible = false; s.renderOrder = 9; return s; };

export class RenanCancelamento {
  constructor(scene) {
    this.scene = scene; this.hideBase = false; this.head = new THREE.Vector3();
    // celular gigante com tela roxa e AO VIVO
    this.phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.45, 0.06), std(0x111111, { metalness: 0.5, roughness: 0.3 }));
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.3), new THREE.MeshBasicMaterial({ color: LIVE })); this.screen.position.z = 0.035;
    this.phone.add(body, this.screen); this.phone.visible = false; scene.add(this.phone);
    this.live = sprite(liveTagTex(), 0.8, 0.3); scene.add(this.live);
    // contador redesenhado no MESMO canvas (sem criar textura nova a cada número)
    this.vCanvas = document.createElement('canvas'); this.vCanvas.width = 512; this.vCanvas.height = 170;
    this.vTex = new THREE.CanvasTexture(this.vCanvas); this.vTex.colorSpace = THREE.SRGBColorSpace;
    this.viewers = sprite(this.vTex, 1.5, 0.5); scene.add(this.viewers);
    this.vText = '';
    const dTex = badgeTex('dislike'), bTex = badgeTex('bell');
    this.tags = TAGS.map((t) => { const s = textSprite(t, { color: '#fff', stroke: '#3a0f8a', w: 1.8, h: 0.6, font: 'bold 96px Bangers, Impact, sans-serif' }); s.visible = false; s.renderOrder = 9; scene.add(s); return s; });
    this.icons = Array.from({ length: 18 }, (_, i) => sprite(i % 3 === 2 ? bTex : dTex, 0.5, 0.5));
    this.pile = Array.from({ length: 22 }, () => sprite(dTex, 0.7, 0.7));
    for (const s of [...this.icons, ...this.pile]) scene.add(s);
    this.stamp = textSprite('CANCELADO!', { color: '#fff', stroke: '#5a0000', w: 3.0, h: 1.0, bubble: '#ff2a3a' }); this.stamp.visible = false; this.stamp.renderOrder = 10; scene.add(this.stamp);
    this.rings = new Rings(scene, 4, LIVE); this.puffs = new Puffs(scene, 12, 0xc9a8ff, { opacity: 0.7 });
    this.boomed = new Set(); this.wasOn = false;
  }

  setViewers(n) {
    const t = n >= 1e6 ? `${(n / 1e6).toFixed(1)}M VIEWERS` : n >= 1e3 ? `${Math.round(n / 1e3)}K VIEWERS` : `${n} VIEWERS`;
    if (t === this.vText) return;
    this.vText = t;
    const g = this.vCanvas.getContext('2d'), W = 512, H = 170;
    g.clearRect(0, 0, W, H); g.font = 'bold 72px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.lineJoin = 'round'; g.strokeStyle = '#3a0f8a'; g.strokeText(t, W / 2, H / 2); g.fillStyle = '#fff'; g.fillText(t, W / 2, H / 2);
    this.vTex.needsUpdate = true;
  }

  update(dt, f, match, model) {
    const on = f.state === 'ultimate';
    const cine = match?.cinematic?.fighter === f ? match.cinematic.t : -1;
    this.rings.update(dt); this.puffs.update(dt);
    this.phone.visible = this.live.visible = this.viewers.visible = this.stamp.visible = false;
    for (const s of [...this.tags, ...this.icons, ...this.pile]) s.visible = false;
    if (!on) { if (this.wasOn) this.boomed.clear(); this.wasOn = false; return; }
    this.wasOn = true;
    const u = f.ultimate, o = f.opponent, fac = f.facing, now = performance.now() / 1000;
    const hitsEnd = 12 + u.hits * u.interval, fin = hitsEnd + 6, end = hitsEnd + 40;
    bodyPoint(this.head, f, model, 'head', { y: f.stats.height * 0.88 });
    const ck = cine >= 0 ? smooth((75 - cine) / 12) : clamp01((end - f.t) / 10);
    const ph = new THREE.Vector3(f.x + fac * 0.85, f.y + 1.35, 0.5);

    // celular + AO VIVO + contador
    this.phone.visible = ck > 0.01; this.phone.position.copy(ph); this.phone.rotation.y = -fac * 0.35; this.phone.scale.setScalar(ck);
    this.screen.material.color.setHSL(0.74, 0.9, 0.45 + 0.1 * Math.sin(now * 10));
    this.live.visible = ck > 0.3; this.live.position.set(ph.x, ph.y + 1.0, 0.7); this.live.material.opacity = Math.floor(now * 4) % 2 ? 1 : 0.6;
    const prog = cine >= 0 ? (75 - cine) / 75 : 1;
    this.setViewers(Math.round(Math.pow(10, 1 + prog * 5.2)));
    this.viewers.visible = ck > 0.3; this.viewers.position.set(ph.x, ph.y + 1.42, 0.7);
    if (cine >= 0) return;

    const tgt = new THREE.Vector3(o.x, o.y + o.stats.height * 0.55, 0.7);
    // ---- golpes: rajada de hashtag + 3 ícones por hit ----
    for (let h = 0; h < u.hits; h++) {
      const hitF = 12 + h * u.interval, t = f.t - (hitF - 7);
      if (t < 0 || t > 20) continue;
      const hit = f.ultRes[h] === 'hit', q = clamp01(t / 7);
      const tag = this.tags[h % this.tags.length];
      tag.visible = true;
      const stuck = tgt.clone().add(new THREE.Vector3(Math.sin(h * 2.3) * 0.5, 0.6 + Math.cos(h * 1.7) * 0.4, 0));
      if (t <= 7) tag.position.lerpVectors(ph, stuck, easeIn(q));
      else if (hit) tag.position.copy(stuck).add(new THREE.Vector3(0, (t - 7) * 0.02, 0));
      else tag.position.copy(stuck).add(new THREE.Vector3(fac * (t - 7) * 0.25, 0, 0));
      tag.material.opacity = t <= 12 ? 1 : 1 - (t - 12) / 8; tag.material.rotation = Math.sin(h * 3) * 0.2;
      for (let j = 0; j < 3; j++) {
        const s = this.icons[(h * 3 + j) % this.icons.length], qq = clamp01((t - j * 1.5) / 7);
        s.visible = qq > 0 && t < 18;
        const land = tgt.clone().add(new THREE.Vector3((j - 1) * 0.4, -0.3 + j * 0.3, 0.05));
        if (qq < 1) s.position.lerpVectors(ph, land, easeIn(qq)).add(new THREE.Vector3(0, Math.sin(qq * Math.PI) * 0.8, 0));
        else s.position.copy(land).add(hit ? new THREE.Vector3(0, -(t - 7 - j * 1.5) * 0.03, 0) : new THREE.Vector3(fac * (t - 7) * 0.3, 0, 0));
        s.material.opacity = t < 14 ? 1 : 1 - (t - 14) / 4; s.material.rotation = now * 3 + j;
      }
      if (t === 7 && hit && !this.boomed.has(h)) { this.boomed.add(h); this.rings.spawn(tgt.x, tgt.y, { flat: false, from: 0.2, to: 1.2, life: 0.25, opacity: 0.9, z: 0.7 }); }
    }

    // ---- finalizador: avalanche de DISLIKE + carimbo CANCELADO ----
    const at = f.t - (fin - 10);
    if (at >= 0 && f.t < end) {
      const hit = f.ultRes[u.hits] === 'hit';
      const gx = hit || f.t < fin ? o.x : o.x + fac * 1.5;
      const fade = clamp01((end - f.t) / 8);
      this.pile.forEach((s, i) => {
        const delay = (i % 11) * 0.6, q = clamp01((at - delay) / 10);
        if (q <= 0) return;
        const row = Math.floor(i / 6), col = i % 6;
        const px = gx + (col - 2.5) * 0.36 * (1 - row * 0.18), py = 0.35 + row * 0.42;
        s.visible = true; s.position.set(px, py + (1 - easeIn(q)) * 6, 0.75 + (i % 3) * 0.04);
        const sz = 0.7 * fade; s.scale.set(sz, sz, 1); s.material.rotation = (i * 0.7) % 1.2 - 0.6; s.material.opacity = fade;
      });
      if (f.t >= fin && !this.boomed.has('fin')) {
        this.boomed.add('fin');
        this.rings.spawn(gx, 0.05, { from: 0.4, to: 5, life: 0.5, opacity: 0.85, color: 0xff2a3a });
        this.puffs.burst(new THREE.Vector3(gx, 0.6, 0.4), { count: 12, spread: 2.2, up: 1.5, speed: 3.2, size: 0.45, grow: 2.2, life: 0.7 });
      }
      if (f.t >= fin) {
        const q = clamp01((f.t - fin) / 30);
        this.stamp.visible = true; this.stamp.position.set(gx, 3.0, 1.0);
        const pop = q < 0.1 ? 1.8 - 0.8 * easeOut(q / 0.1) : 1;
        this.stamp.scale.set(3.0 * pop * fade, 1.0 * pop * fade, 1); this.stamp.material.rotation = -0.12;
      }
    }
  }

  dispose() { this.scene.remove(this.phone, this.live, this.viewers, this.stamp, ...this.tags, ...this.icons, ...this.pile); }
}
