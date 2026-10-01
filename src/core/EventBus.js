// Emissor de eventos mínimo. O main.js repassa aqui os eventos da partida (os mesmos de Match.emit)
// e um 'frame' por quadro; sistemas paralelos (som, telemetria...) escutam sem tocar na lógica de luta.
// Puro JS: roda no navegador e em Node.
export class EventBus {
  constructor() { this.handlers = new Map(); }
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { this.handlers.get(type)?.delete(fn); }
  emit(type, ...args) {
    for (const key of [type, '*']) {
      const set = this.handlers.get(key);
      if (!set) continue;
      for (const fn of set) {
        try { key === '*' ? fn(type, ...args) : fn(...args); } catch (err) { console.warn('[EventBus]', type, err); }
      }
    }
  }
}

// Barramento do jogo (eventos de partida + 'frame' + 'matchStart' + 'menu')
export const gameBus = new EventBus();
