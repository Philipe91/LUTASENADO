// Adaptador NULO (padrão): site próprio, itch.io, sem anúncios. Todos os ganchos viram no-op.
import { Platform } from '../Platform.js';

export default class NullPlatform extends Platform {
  constructor() { super('null'); }
}
