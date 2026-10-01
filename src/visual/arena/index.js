// Registro de arenas: ?arena=noite escolhe a Praça dos Três Poderes à noite (padrão: Esplanada ao pôr do sol).
import { buildBrasilia } from './brasilia.js';
import { buildNoite } from './noite.js';

export const ARENAS = { brasilia: buildBrasilia, noite: buildNoite };

export function buildArena(scene, id) {
  return (ARENAS[id] || buildBrasilia)(scene);
}
