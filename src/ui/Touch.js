// Controles de toque (celular): direcional analógico de 8 direções à esquerda + 4 botões à direita.
// Escreve em input.virtual (o mesmo formato do teclado) — a lógica não sabe se veio de toque ou tecla.
// Aparece sozinho em tela de toque (pointer: coarse); ?touch=1 força, ?touch=0 esconde.
// Pointer Events + pointer capture: multitoque real (andar e bater ao mesmo tempo), o dedo pode escorregar.
const BUTTONS = [
  { id: 'punch', label: 'SOCO', cls: 'b-punch' },
  { id: 'kick', label: 'CHUTE', cls: 'b-kick' },
  { id: 'special', label: 'ESP', cls: 'b-special' },
  { id: 'ultimate', label: 'ULT', cls: 'b-ult' },
];
const DEAD = 0.28; // zona morta do direcional (fração do raio)

export class TouchControls {
  constructor(root, input, params) {
    this.input = input;
    const want = params.get('touch');
    this.enabled = want === '1' || (want !== '0' && matchMedia('(pointer: coarse)').matches);
    if (!this.enabled) return;
    this.el = document.createElement('div');
    this.el.className = 'touch hidden';
    this.el.innerHTML = `<div class="tpad"><div class="tring"></div><div class="tknob"></div></div>
      <div class="tbtns">${BUTTONS.map((b) => `<button class="tbtn ${b.cls}" data-b="${b.id}" aria-label="${b.label}"><span>${b.label}</span></button>`).join('')}</div>`;
    root.appendChild(this.el);
    this.pad = this.el.querySelector('.tpad');
    this.knob = this.el.querySelector('.tknob');
    this.padId = null;
    this.bindPad();
    for (const b of this.el.querySelectorAll('.tbtn')) this.bindButton(b);
    addEventListener('blur', () => this.releaseAll());
  }

  show() { if (this.el) this.el.classList.remove('hidden'); }
  hide() { if (this.el) { this.el.classList.add('hidden'); this.releaseAll(); } }
  releaseAll() {
    const v = this.input.virtual;
    for (const k of ['left', 'right', 'up', 'down', 'punch', 'kick', 'special', 'ultimate']) v[k] = false;
    this.padId = null;
    if (this.knob) this.knob.style.transform = '';
    this.el?.querySelectorAll('.tbtn.on').forEach((b) => b.classList.remove('on'));
  }

  bindPad() {
    const v = this.input.virtual;
    const move = (e) => {
      const r = this.pad.getBoundingClientRect();
      const R = r.width / 2;
      let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
      // 8 direções por setor: diagonal só quando o ângulo está mesmo perto dela (pulo diagonal sem querer = ruim)
      const on = len > DEAD;
      const ang = Math.atan2(-dy, dx); // 0 = direita, π/2 = cima
      const sx = Math.cos(ang), sy = Math.sin(ang);
      v.right = on && sx > 0.38; v.left = on && sx < -0.38;
      v.up = on && sy > 0.6; v.down = on && sy < -0.5;
    };
    this.pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.padId = e.pointerId;
      this.pad.setPointerCapture(e.pointerId);
      move(e);
    });
    this.pad.addEventListener('pointermove', (e) => { if (e.pointerId === this.padId) move(e); });
    const end = (e) => {
      if (e.pointerId !== this.padId) return;
      this.padId = null;
      v.left = v.right = v.up = v.down = false;
      this.knob.style.transform = '';
    };
    this.pad.addEventListener('pointerup', end);
    this.pad.addEventListener('pointercancel', end);
  }

  bindButton(b) {
    const v = this.input.virtual, id = b.dataset.b;
    const down = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      v[id] = true; b.classList.add('on');
      navigator.vibrate?.(8); // toque curto de confirmação (Android)
    };
    const up = () => { v[id] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
