// Liga o som ao jogo: motor WebAudio + locutor + música + diretor de eventos + botões de mudo/música.
// Uso (main.js): setupAudio(gameBus, params)
// URL: ?mute=1 começa mudo · ?music=0..1 volume da música · ?sfx=0..1 volume dos efeitos · ?sfxtest=1 painel de teste
// Teclas: M liga/desliga todo o som · N liga/desliga só a música
import { AudioEngine } from './AudioEngine.js';
import { Announcer } from './Announcer.js';
import { Music } from './Music.js';
import { SoundDirector } from './SoundDirector.js';
import { SFX_NAMES } from './sfxBank.js';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sem storage */ } },
};
const num = (v, d) => (v == null || v === '' || Number.isNaN(Number(v)) ? d : Math.max(0, Math.min(1, Number(v))));

const ICON_ON = '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const ICON_MUSIC = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9 17.5V6l11-2.5v11.5a2.5 2.5 0 1 1-2-2.45V7.1L11 8.7v8.8A2.5 2.5 0 1 1 9 15.05z"/></svg>';

export function setupAudio(bus, params = new URLSearchParams()) {
  const muted = params.get('mute') === '1' || (params.get('mute') !== '0' && store.get('rk.mute') === '1');
  const musicOn = store.get('rk.music') !== '0';
  const musicVolume = num(params.get('music'), 0.32);
  const engine = new AudioEngine({ muted, sfxVolume: num(params.get('sfx'), 1), musicVolume: musicOn ? musicVolume : 0 });
  const voice = new Announcer({ muted });
  const music = new Music(engine);
  let wantMusic = false;

  const out = {
    sfx: (name, o) => engine.play(name, o),
    say: (text, o) => { voice.say(text, o); engine.duck(0.55, 1.2); },
    music: (cmd) => {
      if (cmd === 'start') { wantMusic = true; music.start(); }
      else if (cmd === 'stop') { wantMusic = false; music.stop(); }
      else if (cmd === 'duck') engine.duck(0.3, 2.2);
      else if (cmd === 'win') { wantMusic = false; music.fanfare(); }
    },
  };
  const director = new SoundDirector(out).attach(bus);

  // ---- desbloqueio no primeiro gesto (regra do celular) ----
  const unlock = () => {
    engine.unlock();
    voice.unlock();
    if (engine.running) { if (wantMusic) music.start(); }
    else engine.ctx?.resume().then(() => { if (wantMusic) music.start(); }).catch(() => {});
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown', 'mousedown']) addEventListener(ev, unlock, { capture: true, passive: true });

  // ---- botões (elemento próprio, fora do HUD) ----
  const box = document.createElement('div');
  box.className = 'rk-audio';
  box.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:50;display:flex;gap:6px;pointer-events:auto;';
  const mkBtn = (title) => {
    const b = document.createElement('button');
    b.type = 'button'; b.title = title; b.setAttribute('aria-label', title);
    b.style.cssText = 'width:38px;height:38px;border-radius:50%;border:2px solid #000;background:#ffd23fdd;color:#140d24;display:grid;place-items:center;cursor:pointer;padding:0;box-shadow:2px 2px 0 #000;';
    b.addEventListener('keydown', (e) => e.preventDefault()); // espaço/enter continuam sendo do jogo
    box.appendChild(b);
    return b;
  };
  const muteBtn = mkBtn('Som (M)');
  const musicBtn = mkBtn('Música (N)');
  musicBtn.innerHTML = ICON_MUSIC;
  const refresh = () => {
    muteBtn.innerHTML = engine.muted ? ICON_OFF : ICON_ON;
    muteBtn.style.opacity = engine.muted ? '0.75' : '1';
    musicBtn.style.opacity = engine.musicVolume > 0 && !engine.muted ? '1' : '0.4';
  };
  const setMuted = (m) => { engine.setMuted(m); voice.setMuted(m); store.set('rk.mute', m ? '1' : '0'); refresh(); };
  const toggleMusic = () => {
    const on = engine.musicVolume === 0;
    engine.setMusicVolume(on ? musicVolume : 0);
    store.set('rk.music', on ? '1' : '0');
    refresh();
  };
  muteBtn.addEventListener('click', () => { unlock(); setMuted(!engine.muted); muteBtn.blur(); });
  musicBtn.addEventListener('click', () => { unlock(); toggleMusic(); musicBtn.blur(); });
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyM') setMuted(!engine.muted);
    if (e.code === 'KeyN') toggleMusic();
  });
  refresh();
  document.body.appendChild(box);

  // ?sfxtest=1 — painel para ouvir cada som (ajuste do banco)
  if (params.has('sfxtest')) {
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:10px;top:90px;z-index:60;display:flex;flex-wrap:wrap;gap:4px;max-width:420px;pointer-events:auto;';
    for (const name of SFX_NAMES) {
      const b = document.createElement('button');
      b.textContent = name;
      b.style.cssText = 'font:700 12px monospace;padding:4px 6px;cursor:pointer;';
      b.onclick = () => { unlock(); engine.play(name); };
      panel.appendChild(b);
    }
    const say = document.createElement('button');
    say.textContent = 'locutor';
    say.style.cssText = 'font:700 12px monospace;padding:4px 6px;cursor:pointer;';
    say.onclick = () => { unlock(); voice.say('PRIMEIRO TURNO! LUTEM!', { priority: 3 }); };
    const mus = document.createElement('button');
    mus.textContent = 'música';
    mus.style.cssText = say.style.cssText;
    mus.onclick = () => { unlock(); if (music.playing) music.stop(); else { wantMusic = true; music.start(); } };
    panel.append(say, mus);
    document.body.appendChild(panel);
  }

  return { engine, voice, music, director, setMuted, toggleMusic };
}
