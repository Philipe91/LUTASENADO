// HUD "plantão de telejornal premium" (ARTE.md §5): vida chanfrada, retrato, urninhas de round, timer em placa,
// barra de ultimate em 3 segmentos, banners (TURNO / LUTEM / K.O.) e popups de impacto.
import * as THREE from 'three';
import { METER_MAX } from '../fight/constants.js';
import { portrait, hex } from './portraits.js';

const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };

export class Hud {
  constructor(root, stage) {
    this.root = root;
    this.stage = stage;
    this.v = new THREE.Vector3();
    this.hud = el('div', 'hud hidden');
    this.sides = [0, 1].map((i) => {
      const s = el('div', `side p${i + 1}`, `
        <div class="plate">
          <div class="portrait"><span class="ini"></span></div>
          <div class="nameTag"><span class="name"></span></div>
          <div class="pips"></div>
        </div>
        <div class="bar"><div class="trail"></div><div class="fill"></div><div class="ticks"></div><div class="shine"></div></div>
        <div class="meter"><i><b></b></i><i><b></b></i><i><b></b></i><span class="ultTag">ULTIMATE!</span></div>
        <div class="res"><em>$</em><i><b></b></i></div>
        <div class="lock">BLOQUEADO</div>
        <div class="spname"></div>`);
      this.hud.appendChild(s);
      return {
        root: s, name: s.querySelector('.name'), portrait: s.querySelector('.portrait'), ini: s.querySelector('.ini'), pips: s.querySelector('.pips'),
        bar: s.querySelector('.bar'), fill: s.querySelector('.fill'), trail: s.querySelector('.trail'), segs: [...s.querySelectorAll('.meter b')],
        meter: s.querySelector('.meter'), res: s.querySelector('.res'), resFill: s.querySelector('.res b'), lock: s.querySelector('.lock'), sp: s.querySelector('.spname'), trailPct: 100, lastPct: 100, hurtT: 0,
      };
    });
    this.center = el('div', 'center', '<div class="timer">60</div><div class="live"><i></i>AO VIVO</div>');
    this.timer = this.center.querySelector('.timer');
    this.hud.insertBefore(this.center, this.sides[1].root);
    this.banner = el('div', 'banner');
    this.cine = el('div', 'cine');
    this.cineTitle = el('div', 'cineTitle');
    this.cine.appendChild(this.cineTitle);
    this.combos = [el('div', 'combo p1'), el('div', 'combo p2')];
    this.popups = el('div', 'popups');
    this.result = el('div', 'result hidden');
    this.help = el('div', 'help hidden', 'F1 hitboxes · F2 CPU x CPU · ESC pausa');
    this.flashEl = el('div', 'flash'); // flash de câmera (Selfie do Dano, Close Certo)
    root.append(this.cine, this.hud, this.banner, ...this.combos, this.popups, this.result, this.flashEl, this.help);
  }

  // clarão branco na tela inteira (ms de jogo: some sozinho)
  flash(strength = 0.7, ms = 260) {
    this.flashEl.style.setProperty('--fs', String(strength));
    this.flashEl.classList.remove('on'); void this.flashEl.offsetWidth; this.flashEl.classList.add('on');
    const id = (this.flashId = (this.flashId || 0) + 1);
    this.later(ms, () => { if (id === this.flashId) this.flashEl.classList.remove('on'); });
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
      s.portrait.style.setProperty('--c1', hex(P.suit));
      s.portrait.style.setProperty('--c2', hex(P.accent));
      s.portrait.style.backgroundImage = '';
      s.ini.textContent = f.data.name[0];
      portrait(f.data.id, (url) => { s.portrait.style.backgroundImage = `url(${url})`; s.ini.textContent = ''; });
      s.trailPct = 100; s.lastPct = 100; s.hurtT = 0;
      s.res.classList.toggle('on', !!f.resource); // barra extra (ex.: CAPITAL do Vorcaro)
      if (f.resource) s.res.title = f.resource.name;
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
      if (pct < s.lastPct - 0.01) s.hurtT = 6; // flash branco na barra ao levar dano
      s.lastPct = pct;
      s.bar.classList.toggle('hurt', s.hurtT-- > 0);
      s.bar.classList.toggle('low', pct <= 30);
      s.segs.forEach((b, k) => { b.style.width = Math.max(0, Math.min(1, (f.meter - k * 100) / 100)) * 100 + '%'; });
      s.meter.classList.toggle('full', f.meter >= METER_MAX);
      if (f.resource) { s.resFill.style.width = (f.res / f.resource.max) * 100 + '%'; s.res.classList.toggle('full', f.res >= f.resource.max); }
      s.lock.classList.toggle('on', f.lockT > 0);
      s.pips.innerHTML = [0, 1].map((k) => `<em class="${match.wins[i] > k ? 'won' : ''}"></em>`).join('');
      s.root.classList.toggle('buff', f.buffT > 0 || !!f.presenceOn);
      const opp = f.opponent;
      const showCombo = opp.comboTaken >= 2 && (opp.state === 'hitstun' || opp.state === 'knockdown');
      if (showCombo) { this.combos[i].innerHTML = `<b>${opp.comboTaken}</b><span>HITS</span>`; this.combos[i].classList.add('on'); }
      else this.combos[i].classList.remove('on');
    });
    this.timer.textContent = Math.max(0, Math.ceil(match.timer / 60));
    this.timer.classList.toggle('low', match.timer < 600);
    this.cine.classList.toggle('on', !!match.cinematic);
  }

  showBanner(text, cls = '', ms = 1300) {
    this.banner.className = 'banner';
    void this.banner.offsetWidth;
    this.banner.innerHTML = `<span class="txt">${text}</span>`;
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

  // opts.note: aviso extra (lutador liberado) · opts.onShare: mostra o botão COMPARTILHAR
  showResult(winner, line, onRematch, onMenu, opts = {}) {
    const P = winner.data.visual?.placeholder || {};
    this.result.innerHTML = `
      <div class="card" style="--c1:${hex(P.suit)};--c2:${hex(P.accent)}">
        <div class="wkicker">VENCEDOR</div>
        <div class="wname">${winner.data.name}</div>
        <div class="line">“${line}”</div>
        ${opts.note ? `<div class="rnote">${opts.note}</div>` : ''}
        <div class="btns"><button class="again">REVANCHE</button><button class="menu">TROCAR LUTADOR</button>${opts.onShare ? '<button class="share">COMPARTILHAR</button>' : ''}</div>
      </div>`;
    this.result.classList.remove('hidden');
    // um clique só: o intervalo comercial pode demorar e um 2º toque não pode disparar outra revanche
    const once = (fn) => () => { if (this.result.dataset.busy) return; this.result.dataset.busy = '1'; fn(); };
    delete this.result.dataset.busy;
    this.result.querySelector('.again').onclick = once(onRematch);
    this.result.querySelector('.menu').onclick = once(onMenu);
    if (opts.onShare) this.result.querySelector('.share').onclick = opts.onShare;
  }
}
