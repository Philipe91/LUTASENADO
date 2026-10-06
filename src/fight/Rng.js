// Gerador de números pseudoaleatórios DETERMINISTA (mulberry32). A partida inteira (textos de KO, empate, IA) só
// sorteia por aqui: mesma semente + mesmos inputs = mesma luta, frame a frame (pré-requisito de replay/rollback).
export class Rng {
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
}
