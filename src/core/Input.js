// Teclado → comandos abstratos. Touch e gamepad (Dia 4) vão gerar o mesmo formato.
export const KEYMAPS = {
  p1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    punch: ['KeyJ'], kick: ['KeyK'], special: ['KeyL'], ultimate: ['KeyU', 'KeyI'],
  },
  p2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    punch: ['Numpad1', 'Comma'], kick: ['Numpad2', 'Period'], special: ['Numpad3', 'Slash'], ultimate: ['Numpad0', 'Numpad4', 'Quote'],
  },
};
// Jogando sozinho contra a CPU: WASD+JKL ou setas+ZXC, tanto faz
KEYMAPS.solo = {
  left: [...KEYMAPS.p1.left, 'ArrowLeft'], right: [...KEYMAPS.p1.right, 'ArrowRight'],
  up: [...KEYMAPS.p1.up, 'ArrowUp', 'Space'], down: [...KEYMAPS.p1.down, 'ArrowDown'],
  punch: [...KEYMAPS.p1.punch, 'KeyZ'], kick: [...KEYMAPS.p1.kick, 'KeyX'],
  special: [...KEYMAPS.p1.special, 'KeyC'], ultimate: [...KEYMAPS.p1.ultimate, 'KeyV'],
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.virtual = {};
    addEventListener('keydown', (e) => {
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
}

export class HumanController {
  constructor(input, map) { this.input = input; this.map = map; }
  read() {
    const k = this.input.keys, v = this.input.virtual, m = this.map, c = {};
    for (const b in m) c[b] = m[b].some((code) => k.has(code)) || !!v[b];
    return c;
  }
}
