// Entidade de dano solta no mundo: projéteis, zonas (Canetada, BLOQUEADO), ondas no chão, veículos.
// Campos opcionais:
//   triggerRange  — morre ao chegar a essa distância do oponente (ex.: picanha)
//   spawnOnEnd    — spec de outro Hitter criado onde este morreu (ex.: onda de apoiadores)
//   hit.final     — campos que sobrescrevem o último hit de um multi-hit (ex.: knockback final)
//   activeUntil   — último frame (t) em que ainda machuca; depois disso só o visual continua
//   linger        — ao gastar os hits não some na hora: fica 'spent' (sem dano) até o fim da vida, pro visual terminar
let nextId = 1;

export class Hitter {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0, g: 0, w: 1, h: 1, delay: 0, life: 60,
      hitsLeft: 1, rehit: 12, cool: 0, dead: false, visual: 'orb', color: 0xffcc33, facing: 1,
    }, o);
    this.id = nextId++;
    this.t = 0;
  }
  get active() { return !this.dead && !this.spent && this.t > this.delay && this.t <= (this.activeUntil ?? Infinity) && this.cool === 0; }
  get armed() { return this.t > this.delay; }
  update() {
    this.t++;
    if (this.t <= this.delay) return;
    if (this.cool > 0) this.cool--;
    this.vy -= this.g;
    this.x += this.vx;
    this.y += this.vy;
    if (this.g && this.y <= 0) { this.y = 0; this.dead = true; }
    if (this.t > this.delay + this.life || Math.abs(this.x) > 24) this.dead = true;
  }
  box() { return { x: this.x - this.w / 2, y: this.y, w: this.w, h: this.h }; }

  // Cria um projétil a partir de uma spec de especial (CharacterData)
  static fromSpec(owner, s, x, y, facing) {
    return new Hitter({
      owner, hit: s, x, y, facing,
      vx: (s.speed ?? 0) * facing, vy: s.vy || 0, g: s.g || 0, w: s.box.w, h: s.box.h,
      life: s.life ?? 90, hitsLeft: s.hits ?? 1, rehit: s.rehit ?? 10,
      visual: s.visual, color: s.color, model: s.model,
      triggerRange: s.triggerRange, spawnOnEnd: s.spawnOnEnd,
    });
  }
}
