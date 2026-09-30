import './style.css';
import { Stage } from './visual/Stage.js';
import { buildBrasilia } from './visual/arena/brasilia.js';
import { FighterView } from './visual/FighterView.js';
import { Vfx } from './visual/Vfx.js';
import { DebugDraw } from './visual/DebugDraw.js';
import { Match } from './fight/Match.js';
import { AIController } from './fight/AI.js';
import { STEP, NEUTRAL } from './fight/constants.js';
import { AnimTestP1, AnimTestP2, animTestLabel } from './dev/animtest.js';

class CastController {
  constructor(dir) { this.dir = dir; this.t = 0; }
  read(self) {
    this.t++;
    if (self.state !== 'idle' || this.t % 20 > 1) return NEUTRAL;
    if (this.dir === 'ultimate') return { ...NEUTRAL, ultimate: true }; // ?cast=ultimate&meter=1
    const F = self.facing > 0 ? 'right' : 'left';
    return { ...NEUTRAL, special: true, [F]: this.dir === 'forward', down: this.dir === 'down' };
  }
}
import { Input, HumanController, KEYMAPS } from './core/Input.js';
import { getCharacter } from './data/characters/index.js';
import { Hud } from './ui/Hud.js';
import { SelectScreen } from './ui/SelectScreen.js';

// URL: ?p1=lulacio&p2=xandor&mode=cpu|2p|demo&level=easy|normal|hard&debug=1&placeholder=1
const params = new URLSearchParams(location.search);
const ui = document.getElementById('ui');
const stage = new Stage(document.getElementById('game'));
const arena = buildBrasilia(stage.scene);
const input = new Input();
const hud = new Hud(ui, stage);
const vfx = new Vfx(stage.scene);
const debug = new DebugDraw(stage.scene);
debug.enabled = params.has('debug');

let match = null;
let views = [];
let config = null;

const select = new SelectScreen(ui, (cfg) => startMatch(cfg));

function startMatch(cfg) {
  config = cfg;
  views.forEach((v) => v.dispose());
  vfx.clear();
  let a = getCharacter(cfg.p1), b = getCharacter(cfg.p2);
  // ?glbtest=1 troca o visual do P1 por um GLB rigado de teste (valida o pipeline sem os modelos finais)
  // ?glbtest=<arquivo> testa qualquer GLB em public/assets/test/ (padrão Soldier.glb)
  if (params.has('glbtest')) {
    const file = params.get('glbtest') && params.get('glbtest') !== '1' ? params.get('glbtest') : 'Soldier.glb';
    a = { ...a, visual: { ...a.visual, model: `assets/test/${file}`, yaw: Number(params.get('yaw') ?? Math.PI), height: a.stats.height } };
  }
  const level = params.get('level') || 'normal';
  // ?cast=neutral|forward|down → P1 solta esse especial em loop; P2 vira boneco parado (teste de golpe)
  const cast = params.get('cast');
  const animP1 = params.has('animtest') ? new AnimTestP1() : null;
  const controllers = animP1
    ? [animP1, new AnimTestP2(animP1)]
    : cast
    ? (params.has('castP2') ? [{ read: () => NEUTRAL }, new CastController(cast)] : [new CastController(cast), { read: () => NEUTRAL }]) // castP2: quem solta é o P2 (lado direito)
    : cfg.mode === 'demo'
    ? [new AIController(a.ai, level), new AIController(b.ai, level)]
    : cfg.mode === '2p'
      ? [new HumanController(input, KEYMAPS.p1), new HumanController(input, KEYMAPS.p2)]
      : [new HumanController(input, KEYMAPS.solo), new AIController(b.ai, level)];
  match = new Match(a, b, controllers);
  views = match.fighters.map((f) => new FighterView(stage.scene, f, { placeholderOnly: params.has('placeholder') }));
  hud.bind(match);
  select.hide();
  handleEvents(match.drainEvents());
}

function toMenu() {
  views.forEach((v) => v.dispose());
  views = [];
  vfx.clear();
  match = null;
  hud.hide();
  select.show();
}

function handleEvents(events) {
  for (const e of events) {
    switch (e.type) {
      case 'roundStart': hud.showBanner(e.name, 'round', 1300); break;
      case 'banner': hud.showBanner(e.text, e.cls, 900); break;
      case 'hit':
        vfx.burst(e.x, e.y, e);
        stage.shake(e.ultimate ? 0.35 : e.heavy ? 0.22 : 0.1);
        if (e.heavy || e.ultimate) stage.punch(e.ultimate ? 0.14 : 0.08); // zoom-soco da câmera no impacto forte
        if (e.text) hud.pop(e.x, e.y + 0.5, e.text, 'big');
        else hud.pop(e.x, e.y + 0.3, Math.round(e.dmg), 'dmg');
        arena.excite(e.heavy ? 0.25 : 0.1);
        break;
      case 'block': vfx.burst(e.x, e.y, { blocked: true }); break;
      case 'dust': vfx.dust(e.x, e.size); stage.shake(0.08); break;
      case 'armor': vfx.burst(e.x, e.y, { heavy: true, blocked: true }); hud.pop(e.x, e.y + 0.6, e.text, 'armor'); break;
      case 'special':
        hud.showSpecialName(e.fighter.slot, e.name);
        hud.pop(e.fighter.x, e.fighter.stats.height + 0.6, e.name.toUpperCase(), 'special');
        arena.excite(0.3);
        break;
      case 'text': hud.pop(e.fighter.x, e.fighter.stats.height + 0.4, e.text, e.cls); break;
      case 'spawn':
        vfx.burst(e.x, Math.max(0.4, e.y), { heavy: true, color: 0xff5a4a });
        arena.excite(0.6);
        break;
      case 'locked': hud.pop(e.fighter.x, e.fighter.stats.height + 0.8, 'BLOQUEADO!', 'lock'); break;
      case 'ultimate': hud.ultimate(e.fighter, e.name); stage.shake(0.3); arena.excite(1); break;
      case 'ko': hud.showBanner(e.text, 'ko', 2200); stage.shake(0.6); arena.excite(1); break;
      case 'roundWin': break;
      case 'matchEnd':
        hud.showResult(e.winner, e.line, () => startMatch(config), toMenu);
        break;
      default: break;
    }
  }
}

addEventListener('keydown', (e) => {
  if (e.code === 'F1') { e.preventDefault(); debug.enabled = !debug.enabled; }
  if (e.code === 'F2' && match) {
    e.preventDefault();
    const [a] = match.fighters;
    match.controllers[0] = match.controllers[0] instanceof AIController
      ? new HumanController(input, config.mode === '2p' ? KEYMAPS.p1 : KEYMAPS.solo)
      : new AIController(a.data.ai);
  }
  if (e.code === 'Escape' && match) toMenu();
  if (e.code === 'Enter' && select.visible) select.start();
});

let acc = 0, last = performance.now(), time = 0;
// velocidade geral do jogo (1 = 60 lógicas/s). 0.8 = ritmo mais legível (feedback 30/09: "jogo muito rápido"). ?speed= testa outros.
const GAME_SPEED = Number(params.get('speed') || 0.8);
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  tick(dt);
}
function tick(dt) {
  time += dt;
  hud.tick(dt);
  if (match) {
    acc += dt * match.timeScale * GAME_SPEED;
    let steps = 0;
    while (acc >= STEP && steps < 6) { match.step(); acc -= STEP; steps++; }
    if (steps === 6) acc = 0;
    handleEvents(match.drainEvents());
    const frozen = match.hitstop > 0;
    const vdt = frozen ? 0 : dt * match.timeScale * GAME_SPEED;
    for (const v of views) v.update(match.cinematic && v.f !== match.cinematic.fighter ? 0 : vdt, match);
    vfx.update(dt * match.timeScale * GAME_SPEED, match);
    hud.update(match);
  }
  debug.update(match);
  arena.update(dt, time);
  stage.updateCamera(match, dt);
  stage.render();
  if (animLabel && match) animLabel.textContent = `TESTE DE ANIMAÇÃO — ${animTestLabel(match.controllers[0].t ?? 0)}  [${views[0]?.source ?? ''}]`;
  if (statsEl) {
    const r = stage.renderer.info;
    statsEl.textContent = `draw ${r.render.calls} · tris ${(r.render.triangles / 1000).toFixed(1)}k · geo ${r.memory.geometries} · tex ${r.memory.textures} · views criadas ${vfx.created} · hitters ${match?.hitters.length ?? 0} · frame ${match?.frame ?? 0}`;
  }
}
// ?stats=1 mostra custo de render e quantos visuais o pool já criou (tem que estabilizar)
const statsEl = params.has('stats') ? Object.assign(document.createElement('div'), { className: 'stats' }) : null;
if (statsEl) ui.appendChild(statsEl);
const animLabel = params.has('animtest') ? Object.assign(document.createElement('div'), { className: 'animlabel' }) : null;
if (animLabel) ui.appendChild(animLabel);

// ?manual=1 — relógio controlado de fora (gravação de vídeo quadro a quadro: tools/record.mjs).
// Tempo do jogo, animações CSS e performance.now() só andam quando __rk.advance(dt) é chamado.
const manual = params.has('manual');
let manualT = 0;
if (manual) {
  performance.now = () => manualT * 1000;
} else {
  requestAnimationFrame(frame);
}
function advance(dt) {
  manualT += dt;
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = (a.currentTime || 0) + dt * 1000; }
  tick(dt);
  for (const a of document.getAnimations()) a.pause();
}

// Autostart por URL (link de desafio e testes)
if (params.get('p1') || params.get('mode') === 'demo') {
  startMatch({ p1: params.get('p1') || 'lulacio', p2: params.get('p2') || 'capitao-brasa', mode: params.get('mode') || 'cpu' });
  // ?meter=1 começa com a barra de ultimate cheia (testar/gravar ultimates)
  if (params.has('meter')) match.fighters.forEach((f) => { f.meter = 300; });
  // ?ff=N adianta N frames da simulação (prints, testes, trailers)
  const ff = Number(params.get('ff') || 0);
  for (let i = 0; i < ff && match; i++) {
    match.step();
    vfx.update(STEP, match);
    hud.tick(STEP);
    const evs = match.drainEvents();
    if (i > ff - 40) handleEvents(evs.filter((e) => e.type !== 'roundStart'));
  }
  for (const v of views) v.update(0.2, match);
}

window.__rk = { get match() { return match; }, views: () => views, startMatch, advance };
