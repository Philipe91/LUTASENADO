// Preferências e progresso no localStorage, sempre com try/catch (aba anônima, iframe de portal com storage
// bloqueado e cota cheia NÃO podem quebrar o jogo: aí tudo vive só na memória desta sessão).
const PREFIX = 'rk.';
const memory = new Map();

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) return JSON.parse(raw);
    } catch { /* sem storage ou JSON velho/corrompido */ }
    return memory.has(key) ? memory.get(key) : fallback;
  },
  set(key, value) {
    memory.set(key, value);
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* sem storage: fica na memória */ }
  },
};

// preferências do jogador (um objeto só): último P1/P2, modo, dificuldade, qualidade gráfica
const DEFAULT_PREFS = { p1: null, p2: null, mode: 'cpu', level: 'normal', quality: 'auto' };
export function getPrefs() { return { ...DEFAULT_PREFS, ...(storage.get('prefs') || {}) }; }
export function setPrefs(patch) { const p = { ...getPrefs(), ...patch }; storage.set('prefs', p); return p; }

// estatísticas para a tela de título (retenção): partidas, vitórias, sequência atual e melhor sequência
export function getStats() { return { played: 0, wins: 0, streak: 0, best: 0, ...(storage.get('stats') || {}) }; }
export function recordResult(won) {
  const s = getStats();
  s.played++;
  if (won) { s.wins++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
  storage.set('stats', s);
  return s;
}
