// Entidade de dano solta no mundo: projéteis, zonas (Canetada, BLOQUEADO), ondas no chão, veículos.
// Campos opcionais:
//   triggerRange  — morre ao chegar a essa distância do oponente (ex.: picanha)
//   spawnOnEnd    — spec de outro Hitter criado onde este morreu (ex.: onda de apoiadores)
//   hit.final     — campos que sobrescrevem o último hit de um multi-hit (ex.: knockback final)
//   activeUntil   — último frame (t) em que ainda machuca; depois disso só o visual continua
//   linger        — ao gastar os hits não some na hora: fica 'spent' (sem dano) até o fim da vida, pro visual terminar
//   bounces/bounceV/grow — quica no chão N vezes (vy volta a bounceV) e cresce `grow`× a cada quique (Juros Compostos)
//   hit.distDamage — { per, max }: dano extra proporcional à distância percorrida desde o lançamento
//   hit.stopOnHit  — ao acertar/ser defendido PARA no lugar e some em N frames (maleta abre ali); exige linger
//   hit.stopOnGround — ao tocar o chão sem acertar também para (sem dano) por N frames, em vez de sumir
let nextId = 1;

export class Hitter {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0, g: 0, w: 1, h: 1, delay: 0, life: 60,
      hitsLeft: 1, rehit: 12, cool: 0, dead: false, visual: 'orb', color: 0xffcc33, facing: 1,
    }, o);
    this.id = nextId++;
    this.t = 0;
    this.x0 = this.x; this.scale = 1; this.bounced = 0;
  }
  get active() { return !this.dead && !this.spent && this.t > this.delay && this.t <= (this.activeUntil ?? Infinity) && this.cool === 0; }
  // ainda pode machucar (a IA só se defende disso; maleta aberta / portal decorativo não assustam)
  get dangerous() { return !this.dead && !this.spent && this.t <= (this.activeUntil ?? Infinity); }
  get armed() { return this.t > this.delay; }
  update() {
    this.t++;
    if (this.t <= this.delay) return;
    if (this.cool > 0) this.cool--;
    this.vy -= this.g;
    this.x += this.vx;
    this.y += this.vy;
    if (this.g && this.y <= 0) {
      this.y = 0;
      if (this.bounces > 0) { // quica e cresce
        this.bounces--; this.bounced++;
        this.vy = this.bounceV ?? -this.vy * 0.7;
        const k = this.grow || 1; this.scale *= k; this.w *= k; this.h *= k;
      } else if (this.hit?.stopOnGround && !this.spent) { this.spent = true; this.stop(this.hit.stopOnGround); }
      else this.dead = true;
    }
    if (this.t > this.delay + this.life || Math.abs(this.x) > 24) this.dead = true;
  }
  box() { return { x: this.x - this.w / 2, y: this.y, w: this.w, h: this.h }; }
  // para no lugar (sem gravidade) e morre em n frames — o visual termina ali (maleta abrindo)
  stop(n) { this.vx = 0; this.vy = 0; this.g = 0; this.life = Math.min(this.life, this.t - this.delay + n); }
  // golpe efetivo deste frame: último hit com `final`, dano por distância percorrida
  currentHit() {
    let hit = this.hitsLeft === 1 && this.hit.final ? { ...this.hit, ...this.hit.final } : this.hit;
    const dd = hit.distDamage;
    if (dd) hit = { ...hit, damage: hit.damage + Math.min(dd.max ?? Infinity, Math.abs(this.x - this.x0) * dd.per) };
    return hit;
  }

  // Cria um projétil a partir de uma spec de especial (CharacterData)
  static fromSpec(owner, s, x, y, facing) {
    return new Hitter({
      owner, hit: s, x, y, facing,
      vx: (s.speed ?? 0) * facing, vy: s.vy || 0, g: s.g || 0, w: s.box.w, h: s.box.h,
      life: s.life ?? 90, hitsLeft: s.hits ?? 1, rehit: s.rehit ?? 10,
      visual: s.visual, color: s.color, model: s.model,
      triggerRange: s.triggerRange, spawnOnEnd: s.spawnOnEnd, linger: !!s.linger, // linger: segue (sem dano) depois de acertar, pro visual terminar (caminhão)
      bounces: s.bounces || 0, bounceV: s.bounceV, grow: s.grow,
    });
  }
}
