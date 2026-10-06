// Ícones próprios da UI (SVG inline, 24×24, traço 2 px, cantos retos — sem emoji, sem biblioteca).
// Uso: ICON.play, ICON.back… (string HTML). currentColor herda a cor do texto.
const svg = (body, extra = '') => `<svg class="ic" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" ${extra}>${body}</svg>`;
const stroke = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter"';

export const ICON = {
  // cursor de menu (seta cheia): marca a opção focada
  caret: svg('<path fill="currentColor" d="M6 3l13 9-13 9z"/>'),
  back: svg(`<path ${stroke} d="M14 5l-7 7 7 7M8 12h12"/>`),
  play: svg('<path fill="currentColor" d="M6 3l13 9-13 9z"/>'),
  pause: svg('<path fill="currentColor" d="M6 4h4v16H6zM14 4h4v16h-4z"/>'),
  fullscreen: svg(`<path ${stroke} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>`),
  lock: svg('<path fill="currentColor" d="M7 10V7a5 5 0 0 1 10 0v3h2v11H5V10zm2 0h6V7a3 3 0 0 0-6 0z"/>'),
  trophy: svg('<path fill="currentColor" d="M7 3h10v2h3v4a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 8.3 13H8a4 4 0 0 1-4-4V5h3zm-1 4v2a2 2 0 0 0 2 2V7zm12 0h-2v4a2 2 0 0 0 2-2z"/>'),
  share: svg(`<path ${stroke} d="M12 15V4M8 8l4-4 4 4M5 13v7h14v-7"/>`),
  swap: svg(`<path ${stroke} d="M4 8h13l-3-3M20 16H7l3 3"/>`),
  users: svg('<path fill="currentColor" d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20v-2c0-2.8 2.7-5 6-5s6 2.2 6 5v2zm13 0v-2c0-1.5-.5-2.8-1.4-3.9.8-.4 1.6-.6 2.4-.6 2.8 0 5 1.8 5 4v2.5z"/>'),
  cpu: svg(`<path ${stroke} d="M7 7h10v10H7zM10 10h4v4h-4zM12 2v5M12 17v5M2 12h5M17 12h5"/>`),
  dice: svg('<path fill="currentColor" d="M4 4h16v16H4zm4 3a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 8 7zm8 0a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 16 7zm-4 3.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM8 13.8a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zm8 0a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z"/>'),
  sun: svg(`<circle cx="12" cy="12" r="4" fill="currentColor"/><path ${stroke} d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>`),
  moon: svg('<path fill="currentColor" d="M14 2a9 9 0 1 0 8 13A8 8 0 0 1 14 2z"/>'),
  dome: svg('<path fill="currentColor" d="M3 20h18v2H3zm1-2v-2h16v2zM12 3c4.4 0 8 3.6 8 8v3H4v-3c0-4.4 3.6-8 8-8zm-1 0V1h2v2z"/>'),
  gear: svg(`<path ${stroke} d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>`),
  check: svg(`<path ${stroke} d="M4 12l5 5L20 6"/>`),
  bolt: svg('<path fill="currentColor" d="M13 2L4 14h6l-1 8 9-12h-6z"/>'),
  heart: svg('<path fill="currentColor" d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>'),
  run: svg('<path fill="currentColor" d="M14 4a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM9 22l2.5-6L9 13l-3 3-2-1.5 4.5-4.5L13 8l3 3 4 1-.5 2-3.5-1-2 2 2 2.5V22h-2v-3.5L12 16l-1.5 6z"/>'),
  jump: svg(`<path ${stroke} d="M12 20V6M6 12l6-6 6 6"/>`),
  star: svg('<path fill="currentColor" d="M12 2l3 6.6 7 .8-5.2 4.8L18.2 21 12 17.4 5.8 21 7.2 14.2 2 9.4l7-.8z"/>'),
};
