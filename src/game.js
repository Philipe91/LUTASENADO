// O JOGO (pacote carregado sob demanda pelo boot em main.js, junto com three.js).
// init(ctx) monta palco/HUD/som e devolve a API usada pelo boot: quickPlay, openSelect, autostart, prefetchQuick.
import { Stage } from './visual/Stage.js';
import { buildArena, resolveArena, disposeArena, ARENA_LIST, ARENAS } from './visual/arena/index.js';
import { Look } from './visual/Look.js';
import { FighterView } from './visual/FighterView.js';
import { Vfx } from './visual/Vfx.js';
import { DebugDraw } from './visual/DebugDraw.js';
import { preloadFight, prefetchFight } from './visual/preload.js';
import { Match } from './fight/Match.js';
import { AIController } from './fight/AI.js';
import { STEP, NEUTRAL } from './fight/constants.js';
import { AnimTestP1, AnimTestP2, animTestLabel } from './dev/animtest.js';
import { FeelTestP1, FeelTestP2 } from './dev/feeltest.js';
import { ParryP1, ParryP2 } from './dev/parrytest.js';
import { Input, HumanController, KEYMAPS } from './core/Input.js';
import { CHARACTERS, getCharacter } from './data/characters/index.js';
import { Hud } from './ui/Hud.js';
import { SelectScreen } from './ui/SelectScreen.js';
import { FightLoading, PauseMenu, Toast, systemButtons } from './ui/Overlays.js';
import { gameBus } from './core/EventBus.js';
import { setupAudio } from './audio/index.js';
import { TouchControls } from './ui/Touch.js';
import { quality, FpsGovernor } from './platform/quality.js';
import { getPrefs, setPrefs, recordResult } from './platform/storage.js';
import { unlocks } from './platform/unlocks.js';
import { fullscreen } from './platform/system.js';

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

// URL: ?p1=lulacio&p2=xandor&mode=cpu|2p|demo&level=easy|normal|hard&debug=1&placeholder=1
// async: a montagem cede a vez ao navegador entre as etapas (sem uma tarefa longa travando o toque no título)
// e compila os shaders em paralelo (KHR_parallel_shader_compile) antes do 1º quadro. Com ?manual=1 fica tudo seguido.
export async function init({ params, platform, title }) {
  const ui = document.getElementById('ui');
  const manual = params.has('manual');
  const breathe = () => (manual ? null : new Promise((r) => setTimeout(r, 0)));
  const q0 = quality.cfg;
  const lookOn = params.get('look') !== '0';
  const stage = new Stage(document.getElementById('game'), { antialias: !lookOn, maxPixelRatio: q0.pr });
  // arena: ?arena= tem prioridade; senão a escolhida na seleção (prefs.arena, 'random' sorteia a cada luta)
  const urlArena = params.get('arena');
  let arena = stage.setArena(buildArena(stage.scene, resolveArena(urlArena || getPrefs().arena)));
  await breathe();
  const look = new Look(stage, params, q0); // ARTE.md §3 — tone mapping, rim, bloom, vinheta (?look=0 desliga)
  const input = new Input();
  const hud = new Hud(ui, stage);
  const touch = new TouchControls(ui, input, params); // D-pad + botões no celular (?touch=1 força, ?touch=0 esconde)
  const vfx = new Vfx(stage.scene);
  const debug = new DebugDraw(stage.scene);
  debug.enabled = params.has('debug');
  await breathe();
  const audio = setupAudio(gameBus, params); // som: escuta o gameBus (eventos da partida + 'frame')
  const loading = new FightLoading(ui);
  const toast = new Toast(ui);

  let match = null;
  let views = [];
  let config = null;
  let launching = false;

  // ---------- qualidade: aplica nível (troca manual no título ou rebaixamento automático pelo FPS) ----------
  const applyQuality = (q) => { stage.setMaxPixelRatio(q.pr); look.applyQuality?.(q); };
  quality.onChange(applyQuality);
  const governor = new FpsGovernor((q) => toast.show(`Gráficos ajustados: ${q.label} (desempenho)`));

  // ---------- pausa: motivos acumulam (usuário, aba escondida, anúncio, contexto WebGL perdido) ----------
  const holds = new Set();
  const inFight = () => !!match && match.phase !== 'matchEnd';
  const humanFight = () => inFight() && match.controllers.some((c) => c instanceof HumanController);
  const pauseMenu = new PauseMenu(ui, { onResume: () => setHold('user', false), onMenu: () => { setHold('user', false); toMenu(); } });
  function setHold(reason, on) {
    if (on === holds.has(reason)) return;
    if (on) holds.add(reason); else holds.delete(reason);
    audio.hold(reason, on);
    if (on) { touch.releaseAll?.(); input.keys.clear(); }
    pauseMenu[holds.has('user') ? 'show' : 'hide']();
    // portais: só "jogando" quando há luta com humano e nada segurando
    if (humanFight() && !holds.size) platform.gameplayStart(); else platform.gameplayStop();
    last = performance.now(); // a volta não conta o tempo parado
  }
  const paused = () => holds.size > 0 && !manual;
  const userPause = () => { if (inFight() && !match.cinematic) setHold('user', !holds.has('user')); };

  // anúncio do portal: pausa e silencia tudo; o portal sabe se o jogo está mudo (Google: adConfig sound)
  platform.onHold((on) => setHold('ad', on));
  platform.setSound(!audio.engine.muted);
  gameBus.on('mute', (m) => platform.setSound(!m));
  if (!manual) {
    document.addEventListener('visibilitychange', () => {
      setHold('hidden', document.hidden);
      if (document.hidden && humanFight()) setHold('user', true); // na volta, a luta espera o jogador
    });
    addEventListener('blur', () => { if (humanFight()) setHold('user', true); }); // clicou fora do iframe do portal
    addEventListener('pagehide', () => setHold('hidden', true));
    addEventListener('pageshow', () => setHold('hidden', document.hidden));
  }
  // contexto WebGL perdido (GPU reiniciou, aba em segundo plano no celular): pausa e espera o navegador devolver;
  // o three recria texturas/buffers sozinho no 'webglcontextrestored'
  const canvas = stage.renderer.domElement;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setHold('context', true); toast.show('Recuperando gráficos…', 4000); });
  canvas.addEventListener('webglcontextrestored', () => { setHold('context', false); toast.show('Gráficos de volta!'); });
  addEventListener('orientationchange', () => setTimeout(() => stage.resize(), 250));

  const sys = systemButtons(audio.box, { onPause: userPause, fullscreen, allowFullscreen: platform.fullscreenButton });

  // troca de cenário entre lutas: descarta a arena anterior (geometria, materiais, texturas, luzes) e monta a nova
  async function useArena(choice) {
    const id = resolveArena(urlArena || choice, arena.id);
    if (id === arena.id) return;
    disposeArena(stage.scene, arena);
    arena = stage.setArena(buildArena(stage.scene, id));
    look.adopt?.(arena.root);
    if (!manual) { // compila os shaders novos durante a tela de carregamento (sem engasgo no 1º quadro da luta)
      if (look.enabled) { look.rimify(stage.scene); stage.renderer.setRenderTarget(look.rt); }
      await stage.renderer.compileAsync(stage.scene, stage.camera).catch(() => {});
      stage.renderer.setRenderTarget(null);
    }
  }

  // ---------- seleção ----------
  const prefs = getPrefs();
  const select = new SelectScreen(ui, (cfg) => launch(cfg), {
    initial: prefs,
    arenas: ARENA_LIST,
    arenaLocked: !!ARENAS[urlArena],
    isLocked: (id) => unlocks.isLocked(id),
    onUnlock: async (id) => {
      const ok = await platform.rewardedBreak('unlock');
      if (ok) { unlocks.unlockSession(id); toast.show(`${getCharacter(id).name} liberado nesta sessão!`); }
      else toast.show('Nenhum anúncio disponível agora. Tente de novo mais tarde.');
      return ok;
    },
    onPick: (cfg) => { setPrefs(cfg); prefetchFight([cfg.p1, cfg.p2]); },
    onBack: title ? () => { select.hide(); title.show(); } : null,
  });
  select.hide();

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
    // ?ai=1|2|3 (fácil/normal/difícil) ou ?level=easy|normal|hard; sem URL vale a dificuldade escolhida no título
    const level = params.get('ai') || params.get('level') || cfg.level || getPrefs().level || 'normal';
    // ?cast=neutral|forward|down → P1 solta esse especial em loop; P2 vira boneco parado (teste de golpe)
    const cast = params.get('cast');
    const animP1 = params.has('animtest') ? new AnimTestP1() : params.has('feeltest') ? new FeelTestP1() : null;
    const controllers = params.has('parry')
      ? [new ParryP1(params.get('parry') === 'late'), new ParryP2()] // ?parry=1: teste da defesa perfeita (TÁ OK)
      : animP1
      ? [animP1, animP1 instanceof FeelTestP1 ? new FeelTestP2(animP1) : new AnimTestP2(animP1)]
      : cast
      ? (params.has('castP2') ? [{ read: () => NEUTRAL }, new CastController(cast)] : [new CastController(cast), { read: () => NEUTRAL }]) // castP2: quem solta é o P2 (lado direito)
      : cfg.mode === 'demo'
      ? [new AIController(a.ai, level), new AIController(b.ai, level)]
      : cfg.mode === '2p'
        ? [new HumanController(input, KEYMAPS.p1), new HumanController(input, KEYMAPS.p2, false)]
        : [new HumanController(input, KEYMAPS.solo), new AIController(b.ai, level)];
    match = new Match(a, b, controllers);
    views = match.fighters.map((f) => new FighterView(stage.scene, f, { placeholderOnly: params.has('placeholder') }));
    hud.bind(match);
    gameBus.emit('matchStart', match);
    select.hide();
    title?.hide();
    if (controllers[0] instanceof HumanController) touch.show(); else touch.hide();
    sys.pause.classList.toggle('hidden', !humanFight());
    governor.reset();
    setHold('user', false);
    if (humanFight()) platform.gameplayStart();
    handleEvents(match.drainEvents());
  }

  // tela de carregamento da luta: baixa SÓ os 2 lutadores (e o que eles usam), com barra; depois luta
  async function launch(cfg) {
    if (launching) return;
    launching = true;
    try {
      setPrefs({ p1: cfg.p1, p2: cfg.p2, mode: cfg.mode, ...(cfg.arena ? { arena: cfg.arena } : {}) });
      select.hide(); title?.hide(); hud.hide();
      loading.show(getCharacter(cfg.p1), getCharacter(cfg.p2));
      audio.voices.load([cfg.p1, cfg.p2]); // vozes dos 2 lutadores (poucos KB) junto com a pré-carga
      await useArena(cfg.arena || getPrefs().arena);
      if (!params.has('placeholder')) {
        await Promise.race([preloadFight([cfg.p1, cfg.p2], (p) => loading.set(p)), new Promise((r) => setTimeout(r, 25000))]);
      }
      loading.hide();
      startMatch(cfg);
    } finally { launching = false; }
  }

  function toMenu() {
    views.forEach((v) => v.dispose());
    views = [];
    vfx.clear();
    match = null;
    platform.gameplayStop();
    setHold('user', false); sys.pause.classList.add('hidden');
    gameBus.emit('menu');
    hud.hide();
    touch.hide();
    select.show();
  }

  // luta rápida (botão JOGAR / desafio recebido): último P1 escolhido (ou sorteio) x CPU sorteada, ambos liberados
  function quickPick() {
    const vs = (params.get('vs') || '').split(/[.,]/);
    const free = CHARACTERS.filter((c) => !unlocks.isLocked(c.id)).map((c) => c.id);
    const ok = (id) => free.includes(id);
    if (ok(vs[0]) && ok(vs[1])) return { p1: vs[0], p2: vs[1], mode: 'cpu' };
    const p = getPrefs();
    const p1 = ok(p.p1) ? p.p1 : free[Math.floor(Math.random() * free.length)];
    const rivals = free.filter((id) => id !== p1);
    return { p1, p2: rivals[Math.floor(Math.random() * rivals.length)], mode: 'cpu' };
  }
  let nextQuick = null;
  const quickPlay = () => { const cfg = nextQuick || quickPick(); nextQuick = null; launch(cfg); };
  const prefetchQuick = () => { nextQuick = quickPick(); prefetchFight([nextQuick.p1, nextQuick.p2]); return nextQuick; };

  // compartilhar resultado: Web Share no celular, senão copia o texto com o link de desafio
  async function share(winner, loser) {
    const url = await platform.shareUrl({ vs: `${winner.data.id}.${loser.data.id}` });
    const text = `Venci com ${winner.data.name} contra ${loser.data.name} no República Kombat! Duvido você ganhar:`;
    try {
      if (navigator.share) { await navigator.share({ title: 'República Kombat', text, url }); return; }
    } catch (e) { if (e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast.show('Link copiado! Cole para desafiar alguém.'); }
    catch { toast.show(url, 6000); }
  }

  function onMatchEnd(e) {
    touch.hide();
    sys.pause.classList.add('hidden');
    platform.gameplayStop();
    platform.matchFinished();
    let note = '';
    const vsCpu = match.controllers[0] instanceof HumanController && match.controllers[1] instanceof AIController;
    if (vsCpu) {
      const won = e.winner === match.fighters[0];
      recordResult(won);
      if (won) {
        platform.happytime();
        const freed = unlocks.winUnlock();
        if (freed) note = `NOVO LUTADOR LIBERADO: ${getCharacter(freed).name}!`;
      }
    }
    const loser = e.winner.opponent || match.fighters.find((f) => f !== e.winner);
    // intervalo comercial SÓ aqui: entre lutas, depois que o jogador escolheu o próximo passo
    hud.showResult(e.winner, e.line,
      async () => { await platform.commercialBreak('rematch'); launch(config); },
      async () => { await platform.commercialBreak('menu'); toMenu(); },
      { note, onShare: vsCpu && e.winner === match.fighters[0] ? () => share(e.winner, loser) : null });
  }

  function handleEvents(events) {
    for (const e of events) {
      gameBus.emit(e.type, e, match);
      switch (e.type) {
        case 'roundStart': hud.showBanner(e.name, 'round', 1300); break;
        case 'banner': hud.showBanner(e.text, e.cls, 900); break;
        case 'hit':
          vfx.burst(e.x, e.y, e);
          // câmera: tranco no sentido do golpe, proporcional à força; zoom-soco só nos fortes
          stage.shake(e.ultimate ? 0.35 : e.heavy ? 0.16 + 0.06 * (e.force || 1) : 0.07 + 0.03 * (e.force || 0.5), e.dir || 0);
          if (e.heavy || e.ultimate) stage.punch(e.ultimate ? 0.14 : Math.min(0.13, 0.06 + 0.04 * (e.force || 1))); // zoom-soco da câmera no impacto forte
          if (e.ko && !e.ultimate) stage.focus(e.x, e.y, 2.2, 0.24); // último golpe do round: câmera lenta com close
          else if (e.ko) stage.focus(e.x, e.y, 2.2, 0.12);
          if (e.ko) hud.flash(0.8, 200); // KO: clarão branco curto na tela
          if (e.ultimate || e.ko) look.shock(e.x, e.y, e.ko ? 0.9 : 0.4, e.ko ? 0.5 : 0.35); // onda de choque em tela
          if (e.text) hud.pop(e.x, e.y + 0.5, e.text, 'big');
          else hud.pop(e.x, e.y + 0.3, Math.round(e.dmg), 'dmg');
          stage.react(e.ultimate ? 0.8 : e.heavy ? 0.35 : 0.08);
          break;
        case 'block': vfx.burst(e.x, e.y, { blocked: true }); stage.shake(e.heavy ? 0.06 : 0.03, (e.dir || 0) * 0.5); break;
        case 'perfect': vfx.burst(e.x, e.y, { heavy: true, color: 0x9af07a }); vfx.burst(e.x, e.y + 0.2, { color: 0xffd400 }); break;
        case 'dash': vfx.dust(e.x - e.fighter.facing * e.dir * 0.3, 0.35); break;
        case 'land':
          // queda de golpe bate no chão (poeira + tranco); pulo do pesado também assenta
          if (e.state === 'knockdown' || e.state === 'ko') { vfx.dust(e.x, 0.7); stage.shake(0.12); }
          else if (e.v > 0.2 && e.fighter.stats.width >= 0.95) stage.shake(0.04);
          break;
        case 'dust': vfx.dust(e.x, e.size); stage.shake(0.08); break;
        case 'armor': vfx.burst(e.x, e.y, { heavy: true, blocked: true }); hud.pop(e.x, e.y + 0.6, e.text, 'armor'); break;
        case 'special':
          hud.showSpecialName(e.fighter.slot, e.name);
          hud.pop(e.fighter.x, e.fighter.stats.height + 0.6, e.name.toUpperCase(), 'special');
          stage.react(0.3);
          break;
        case 'text': hud.pop(e.fighter.x, e.fighter.stats.height + 0.4, e.text, e.cls); break;
        case 'spawn':
          vfx.burst(e.x, Math.max(0.4, e.y), { heavy: true, color: 0xff5a4a });
          stage.react(0.6);
          break;
        case 'locked': break; // o cadeado 3D acima da cabeça (StatusFx) já mostra; o hit já grita BLOQUEADO!
        case 'flash': hud.flash(e.strength); break; // flash de câmera (Selfie do Dano)
        case 'counterHit': // contra-golpe genérico (acertou o rival no startup do golpe dele): carimbo amarelo + tranco
          hud.pop(e.x, e.y + 0.9, e.text, 'counter');
          vfx.burst(e.x, e.y, { heavy: true, color: 0xffd400 }); stage.punch(0.05);
          break;
        case 'tech': // tech de queda / escape de agarrão
          if (e.throw) { vfx.burst(e.x, e.y, { blocked: true, heavy: true }); stage.shake(0.08); }
          else vfx.dust(e.x, 0.4);
          break;
        case 'counter': // Close Certo / PERFECT SELFIE: clarão, carimbo e tranco
          hud.flash(1); hud.pop(e.x, e.y + 0.7, e.text, 'perfect');
          vfx.burst(e.x, e.y, { heavy: true, color: 0xffffff }); stage.shake(0.22, 0); stage.punch(0.09); stage.react(0.7);
          break;
        case 'grab': stage.shake(0.12); stage.punch(0.05); stage.react(0.5); break;
        case 'ultimate': hud.ultimate(e.fighter, e.name); stage.shake(0.3); stage.react(1); look.shock(e.fighter.x, e.fighter.y + 1, 1.2, 0.6); vfx.dust(e.fighter.x, 0.9); break;
        case 'ko': hud.showBanner(e.text, 'ko', 2200); stage.shake(0.6); stage.react(1); if (e.timeUp) hud.flash(0.5, 180); break;
        case 'roundWin': break;
        case 'matchEnd': onMatchEnd(e); break;
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
    // Esc / P: pausa (exigência dos portais); fora da luta, Esc volta da seleção ao título
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      if (inFight()) userPause();
      else if (e.code === 'Escape' && select.visible && title) { select.hide(); title.show(); }
    }
    if (e.code === 'Enter' && holds.has('user')) setHold('user', false);
    else if (e.code === 'Enter' && select.visible && !launching && !e.target?.closest?.('.select button:not(.go)')) select.start(); // Enter num botão focado = clique nele
  });

  let acc = 0, last = performance.now(), time = 0;
  // velocidade geral do jogo (1 = 60 lógicas/s). 0.8 = ritmo mais legível (feedback 30/09: "jogo muito rápido"). ?speed= testa outros.
  const GAME_SPEED = Number(params.get('speed') || 0.8);
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    last = now;
    if (paused()) return; // pausa / aba escondida / anúncio / sem contexto WebGL: nada anda, nada desenha
    const dt = Math.min(0.1, raw);
    if (inFight() && !match.cinematic) governor.sample(raw);
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
      // interpolação (Fix Your Timestep): o visual desenha entre o frame lógico anterior e o atual pela fração que sobrou
      // no acumulador — sem tremedeira quando a tela (60/120/144 Hz) não bate com os 48–60 passos lógicos por segundo
      const alpha = match.hitstop > 0 || match.cinematic ? 1 : Math.min(1, acc / STEP);
      for (const f of match.fighters) { f.rx = f.px + (f.x - f.px) * alpha; f.ry = f.py + (f.y - f.py) * alpha; }
      handleEvents(match.drainEvents());
      gameBus.emit('frame', match);
      const frozen = match.hitstop > 0;
      const vdt = frozen ? 0 : dt * match.timeScale * GAME_SPEED;
      for (const v of views) v.update(match.cinematic && v.f !== match.cinematic.fighter ? 0 : vdt, match);
      vfx.update(dt * match.timeScale * GAME_SPEED, match);
      hud.update(match);
    }
    debug.update(match);
    arena.update(dt, time, match);
    stage.updateCamera(match, dt);
    stage.render();
    if (animLabel && match) animLabel.textContent = match.controllers[0] instanceof FeelTestP1
      ? `GAME FEEL — ${match.controllers[0].label}`
      : `TESTE DE ANIMAÇÃO — ${animTestLabel(match.controllers[0].t ?? 0)}  [${views[0]?.source ?? ''}]`;
    if (statsEl) {
      const r = stage.renderer.info;
      statsEl.textContent = `${quality.tier} · pr ${stage.renderer.getPixelRatio().toFixed(2)} · draw ${r.render.calls} · tris ${(r.render.triangles / 1000).toFixed(1)}k · geo ${r.memory.geometries} · tex ${r.memory.textures} · views criadas ${vfx.created} · hitters ${match?.hitters.length ?? 0} · frame ${match?.frame ?? 0} · ${look.stats}`;
    }
  }
  // ?stats=1 mostra custo de render e quantos visuais o pool já criou (tem que estabilizar)
  const statsEl = params.has('stats') ? Object.assign(document.createElement('div'), { className: 'stats' }) : null;
  if (statsEl) ui.appendChild(statsEl);
  const animLabel = params.has('animtest') || params.has('feeltest') ? Object.assign(document.createElement('div'), { className: 'animlabel' }) : null;
  if (animLabel) ui.appendChild(animLabel);

  // ?manual=1 — relógio controlado de fora (gravação de vídeo quadro a quadro: tools/record.mjs).
  // Tempo do jogo, animações CSS e performance.now() só andam quando __rk.advance(dt) é chamado.
  let manualT = 0;
  if (manual) {
    performance.now = () => manualT * 1000;
  } else {
    // compila os MESMOS programas que o 1º quadro vai usar: o Look desenha a cena num alvo HDR (sem tone mapping)
    // e liga o recorte (rim) por onBeforeCompile — sem isso o compileAsync compilava variantes erradas
    if (look.enabled) { look.rimify(stage.scene); stage.renderer.setRenderTarget(look.rt); }
    await stage.renderer.compileAsync(stage.scene, stage.camera).catch(() => {});
    stage.renderer.setRenderTarget(null);
    await breathe();
    requestAnimationFrame(frame);
  }
  function advance(dt) {
    manualT += dt;
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = (a.currentTime || 0) + dt * 1000; }
    tick(dt);
    for (const a of document.getAnimations()) a.pause();
  }

  // Autostart por URL (testes, gravações): direto para a luta, sem título nem tela de carregamento
  function autostart() {
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
      if (i > ff - 40) handleEvents(evs.filter((ev) => ev.type !== 'roundStart'));
    }
    for (const v of views) v.update(0.2, match);
  }

  const api = {
    get match() { return match; }, get arena() { return arena; }, useArena, views: () => views, startMatch, advance, audio, stage, hud, launch, platform, quality,
    get paused() { return [...holds]; }, setHold,
    autostart, quickPlay, prefetchQuick,
    openSelect: () => { title?.hide(); select.show(); },
    challengeText() { const cfg = quickPick(); return params.get('vs') ? `${getCharacter(cfg.p1).name} x ${getCharacter(cfg.p2).name}` : null; },
  };
  window.__rk = api;
  return api;
}
