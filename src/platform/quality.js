// Níveis de qualidade gráfica (baixo / médio / alto), escolhidos pelo aparelho e corrigidos pelo FPS real.
// Sem three.js aqui: o boot decide o nível antes de baixar o motor.
//   pr      teto do devicePixelRatio (celular com tela 3x a 1.0–1.5 = metade/um terço dos pixels)
//   msaa    amostras do alvo HDR do Look (0 = sem)
//   bloom   brilho pós-processado
//   shadow  lado do shadow map do sol
//   lite    usa os GLBs leves (.m.glb: texturas 1024 px, ¼ da memória de vídeo)
// URL: ?quality=low|medium|high força · ?msaa= / ?bloom= do Look continuam valendo para testes.
import { getPrefs, setPrefs } from './storage.js';

export const TIERS = {
  low: { name: 'low', label: 'BAIXA', pr: 1, msaa: 0, bloom: false, shadow: 512, lite: true },
  medium: { name: 'medium', label: 'MÉDIA', pr: 1.5, msaa: 2, bloom: true, shadow: 1024, lite: true },
  high: { name: 'high', label: 'ALTA', pr: 2, msaa: 4, bloom: true, shadow: 2048, lite: false },
};
const ORDER = ['low', 'medium', 'high'];

export const isMobile = () => {
  try { return matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 500; } catch { return false; }
};

// GPU por software (SwiftShader / llvmpipe) ou aparelho fraco → baixo direto
function weakGpu() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software|mali-4|adreno \(tm\) 3/i.test(name);
  } catch { return false; }
}

export function detectTier() {
  const mem = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 4;
  if (navigator.webdriver) return 'high'; // automação (tools/snap, record): prints e vídeos sempre no visual máximo
  if (weakGpu()) return 'low';
  if (isMobile()) return (mem && mem <= 3) || cores <= 4 ? 'low' : 'medium';
  return (mem && mem <= 4) || cores <= 2 ? 'medium' : 'high';
}

// nível inicial: URL > escolha salva do jogador > rebaixamento automático salvo > detecção do aparelho
export function initialTier(params) {
  const forced = params.get('quality');
  if (TIERS[forced]) return forced;
  const prefs = getPrefs();
  if (TIERS[prefs.quality]) return prefs.quality;
  const detected = detectTier();
  const auto = prefs.autoTier;
  return TIERS[auto] && ORDER.indexOf(auto) < ORDER.indexOf(detected) ? auto : detected;
}

export const quality = {
  tier: 'high',
  get cfg() { return TIERS[this.tier]; },
  listeners: new Set(),
  init(params) { this.tier = initialTier(params); this.auto = !TIERS[params.get('quality')] && getPrefs().quality === 'auto'; return this; },
  set(tier, { save = false } = {}) {
    if (!TIERS[tier] || tier === this.tier) return;
    this.tier = tier;
    if (save) setPrefs({ quality: tier });
    for (const fn of this.listeners) fn(this.cfg);
  },
  setAuto() { setPrefs({ quality: 'auto', autoTier: null }); this.auto = true; this.set(detectTier()); },
  onChange(fn) { this.listeners.add(fn); },
  // devolve true se rebaixou (o governador de FPS chama; a escolha fica salva para a próxima sessão)
  downgrade() {
    const i = ORDER.indexOf(this.tier);
    if (i <= 0) return false;
    this.set(ORDER[i - 1]);
    setPrefs({ autoTier: this.tier });
    return true;
  },
  cycle() { // botão da tela de título: AUTO → BAIXA → MÉDIA → ALTA → AUTO
    const p = getPrefs().quality;
    const next = p === 'auto' ? 'low' : p === 'high' ? 'auto' : ORDER[ORDER.indexOf(p) + 1];
    if (next === 'auto') { this.setAuto(); return 'auto'; }
    this.auto = false;
    setPrefs({ quality: next });
    this.set(next);
    return next;
  },
};

// Governador de FPS: durante a luta mede o tempo real de quadro; se ficar abaixo de ~40 fps por 2,5 s seguidos
// (depois de 2 s de aquecimento), desce um nível. Nunca sobe sozinho (evita ficar oscilando).
export class FpsGovernor {
  constructor(onDowngrade) { this.onDowngrade = onDowngrade; this.reset(); }
  reset() { this.ema = 1 / 60; this.t = 0; this.bad = 0; }
  sample(dt) {
    if (!quality.auto || dt <= 0 || dt > 0.25) return; // pausa/aba escondida não conta
    this.t += dt;
    this.ema += (dt - this.ema) * 0.05;
    if (this.t < 2) return;
    this.bad = this.ema > 1 / 40 ? this.bad + dt : 0;
    if (this.bad > 2.5) {
      this.bad = 0; this.t = 0;
      if (quality.downgrade()) this.onDowngrade?.(quality.cfg);
    }
  }
}
