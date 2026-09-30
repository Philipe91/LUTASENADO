// HUD estilo "plantão de telejornal": vida, barra de ultimate, urninhas de round, timer, banners e popups.
import * as THREE from 'three';
import { METER_MAX } from '../fight/constants.js';

const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class Hud {
  constructor(root, stage) {
    this.root = root;
    this.stage = stage;
    this.v = new THREE.Vector3();
    this.hud = el('div', 'hud hidden');
    this.sides = [0, 1].map((i) => {
      const s = el('div', `side p${i + 1}`, `
        <div class="nameRow"><span class="portrait"></span><span class="name"></span><span class="pips"></span></div>
        <div class="bar"><div class="trail"></div><div class="fill"></div></div>
        <div class="meter"><i><b></b></i><i><b></b></i><i><b></b></i><span class="ultTag">ULTIMATE!</span></div>
        <div class="lock">BLOQUEADO</div>
        <div class="spname"></div>`);
      this.hud.appendChild(s);
      return { root: s, name: s.querySelector('.name'), portrait: s.querySelector('.portrait'), pips: s.querySelector('.pips'), fill: s.querySelector('.fill'), trail: s.querySelector('.trail'), segs: [...s.querySelectorAll('.meter b')], meter: s.querySelector('.meter'), lock: s.querySelector('.lock'), sp: s.querySelector('.spname'), trailPct: 100 };
    });
    this.timer = el('div', 'timer', '60');
    this.hud.insertBefore(this.timer, this.sides[1].root);
    this.live = el('div', 'live', '<i></i> AO VIVO');
    this.hud.appendChild(this.live);
    this.banner = el('div', 'banner');
    this.cine = el('div', 'cine');
    this.cineTitle = el('div', 'cineTitle');
    this.cine.appendChild(this.cineTitle);
    this.combos = [el('div', 'combo p1'), el('div', 'combo p2')];
    this.popups = el('div', 'popups');
    this.result = el('div', 'result hidden');
    this.help = el('div', 'help hidden', 'F1 hitboxes · F2 CPU x CPU · ESC menu');
    root.append(this.cine, this.hud, this.banner, ...this.combos, this.popups, this.result, this.help);
  }

  bind(match) {
    this.match = match;
    this.hud.classList.remove('hidden');
    this.help.classList.remove('hidden');
    this.result.classList.add('hidden');
    match.fighters.forEach((f, i) => {
      const s = this.sides[i];
      s.name.textContent = f.data.name;
      const P = f.data.visual?.placeholder || {};
      s.portrait.style.background = `linear-gradient(135deg, ${hex(P.suit ?? 0x333333)} 55%, ${hex(P.accent ?? 0xcc2222)} 55%)`;
      s.trailPct = 100;
    });
  }

  hide() { this.hud.classList.add('hidden'); this.help.classList.add('hidden'); this.result.classList.add('hidden'); this.banner.className = 'banner'; }

  update(match) {
    match.fighters.forEach((f, i) => {
      const s = this.sides[i];
      const pct = Math.max(0, (f.hp / f.maxHp) * 100);
      s.fill.style.width = pct + '%';
      s.trailPct = pct < s.trailPct ? s.trailPct - 0.35 : pct;
      s.trail.style.width = s.trailPct + '%';
      s.segs.forEach((b, k) => { b.style.width = Math.max(0, Math.min(1, (f.meter - k * 100) / 100)) * 100 + '%'; });
      s.meter.classList.toggle('full', f.meter >= METER_MAX);
      s.lock.classList.toggle('on', f.lockT > 0);
      s.pips.innerHTML = [0, 1].map((k) => `<em class="${match.wins[i] > k ? 'won' : ''}"></em>`).join('');
      s.root.classList.toggle('buff', f.buffT > 0);
      const opp = f.opponent;
      const showCombo = opp.comboTaken >= 2 && (opp.state === 'hitstun' || opp.state === 'knockdown');
      if (showCombo) { this.combos[i].innerHTML = `<b>${opp.comboTaken}</b> HITS`; this.combos[i].classList.add('on'); }
      else this.combos[i].classList.remove('on');
    });
    this.timer.textContent = Math.max(0, Math.ceil(match.timer / 60));
    this.timer.classList.toggle('low', match.timer < 600);
    this.cine.classList.toggle('on', !!match.cinematic);
  }

  showBanner(text, cls = '', ms = 1300) {
    this.banner.className = 'banner';
    void this.banner.offsetWidth;
    this.banner.textContent = text;
    this.banner.className = `banner on ${cls}`;
    const id = (this.bannerId = (this.bannerId || 0) + 1);
    this.later(ms, () => { if (id === this.bannerId) this.banner.className = 'banner'; });
  }

  showSpecialName(slot, name) {
    const s = this.sides[slot].sp;
    s.textContent = name;
    s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
  }

  ultimate(fighter, name) {
    this.cineTitle.innerHTML = `<small>${fighter.data.name}</small>${name}`;
    this.cineTitle.classList.remove('on'); void this.cineTitle.offsetWidth; this.cineTitle.classList.add('on');
  }

  pop(x, y, text, cls = '') {
    this.v.set(x, y, 0).project(this.stage.camera);
    const px = (this.v.x * 0.5 + 0.5) * innerWidth, py = (-this.v.y * 0.5 + 0.5) * innerHeight;
    const p = el('div', `pop ${cls}`, text);
    p.style.left = px + 'px'; p.style.top = py + 'px';
    p.style.setProperty('--r', ((Math.random() - 0.5) * 16).toFixed(1) + 'deg');
    this.popups.appendChild(p);
    this.later(950, () => p.remove());
  }

  // timers em tempo de JOGO (não setTimeout): ficam certos em câmera lenta e na gravação quadro a quadro
  later(ms, fn) { (this.timers ||= []).push({ t: ms / 1000, fn }); }
  tick(dt) {
    if (!this.timers?.length) return;
    for (const x of this.timers) x.t -= dt;
    const due = this.timers.filter((x) => x.t <= 0);
    this.timers = this.timers.filter((x) => x.t > 0);
    for (const x of due) x.fn();
  }

  showResult(winner, line, onRematch, onMenu) {
    this.result.innerHTML = `
      <div class="card">
        <div class="wname">${winner.data.name}</div>
        <div class="wsub">VENCEU!</div>
        <div class="line">“${line}”</div>
        <div class="btns"><button class="again">REVANCHE</button><button class="menu">TROCAR LUTADOR</button></div>
      </div>`;
    this.result.classList.remove('hidden');
    this.result.querySelector('.again').onclick = onRematch;
    this.result.querySelector('.menu').onclick = onMenu;
  }
}
