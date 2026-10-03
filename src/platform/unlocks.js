// Lutadores bloqueados (retenção + anúncio com recompensa).
// Só existe bloqueio quando a plataforma tem anúncio com recompensa (ou ?locks=1 para testar); no site sem
// anúncios todos os 13 ficam livres como sempre.
//   · vencer uma luta contra a CPU libera o próximo da fila PARA SEMPRE (salvo no localStorage)
//   · "assistir anúncio" libera um lutador SÓ NESTA SESSÃO
import { storage } from './storage.js';

export const LOCK_ORDER = ['dilma', 'haddad', 'boulos', 'renan']; // os 4 mais novos, nesta ordem de liberação
const session = new Set();
let enabled = false;

export const unlocks = {
  init(params, hasRewarded) {
    enabled = params.get('locks') === '1' || (params.get('locks') !== '0' && hasRewarded);
    return this;
  },
  get enabled() { return enabled; },
  owned() { return new Set(storage.get('unlocked', [])); },
  isLocked(id) { return enabled && LOCK_ORDER.includes(id) && !session.has(id) && !this.owned().has(id); },
  unlockSession(id) { session.add(id); },
  // chamada ao vencer da CPU: devolve o id liberado agora (ou null)
  winUnlock() {
    if (!enabled) return null;
    const owned = this.owned();
    const next = LOCK_ORDER.find((id) => !owned.has(id));
    if (!next) return null;
    owned.add(next);
    storage.set('unlocked', [...owned]);
    return next;
  },
};
