// REGISTRO DE PERSONAGENS
// Personagem novo = criar um arquivo nesta pasta + adicionar 1 linha aqui.
// Seleção, IA, HUD, intros e visual se montam sozinhos a partir do CharacterData.
import lulacio from './lulacio.js';
import capitaoBrasa from './capitao-brasa.js';
import xandor from './xandor.js';
import dinoSupremo from './dino-supremo.js';
import vorcaro from './vorcaro.js';
import flavio from './flavio.js';
import duval from './duval.js';

export const CHARACTERS = [lulacio, capitaoBrasa, xandor, dinoSupremo];
CHARACTERS.push(vorcaro);
CHARACTERS.push(flavio, duval);

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
