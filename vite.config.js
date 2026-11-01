import { defineConfig } from 'vite';
import { resolve, join, relative } from 'node:path';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';

// só ignora as worktrees ABAIXO desta pasta (dentro de uma worktree o próprio root fica em .claude/)
const slash = (p) => p.split('\\').join('/');
const WORKTREES = slash(resolve(__dirname, '.claude')) + '/';

// ---- rk-assets: lista dos arquivos que EXISTEM em public/assets (caminho → bytes) ----
// O jogo só pede o que está na lista (sem 404 no console por ultimate.glb/shared.glb que ainda não existem),
// escolhe a variante leve .m.glb quando há e soma os bytes para a barra de progresso.
const VIRTUAL = 'virtual:rk-assets';
function scanAssets() {
  const root = resolve(__dirname, 'public');
  const out = {};
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else out[slash(relative(root, p))] = st.size;
    }
  };
  if (existsSync(join(root, 'assets'))) walk(join(root, 'assets'));
  return out;
}
function rkAssets() {
  return {
    name: 'rk-assets',
    resolveId: (id) => (id === VIRTUAL ? '\0' + VIRTUAL : null),
    load: (id) => (id === '\0' + VIRTUAL ? `export default ${JSON.stringify(scanAssets())};` : null),
    // dev: arquivo novo/apagado em public/assets → a lista é refeita
    configureServer(server) {
      const assetsDir = slash(resolve(__dirname, 'public/assets')) + '/';
      const refresh = (p) => {
        if (!slash(p).startsWith(assetsDir)) return;
        const mod = server.moduleGraph.getModuleById('\0' + VIRTUAL);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

// ---- rk-sw: service worker com a lista de arquivos do build (precache do essencial; GLB em cache sob demanda) ----
// Só é registrado fora dos portais (ver src/platform/pwa.js). O nome do cache muda a cada build.
function rkServiceWorker() {
  let outDir;
  return {
    name: 'rk-sw',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    closeBundle() {
      rmSync(join(outDir, 'assets/test'), { recursive: true, force: true }); // GLBs de teste (?glbtest) só no dev: fora do site
      const sw = join(outDir, 'sw.js');
      if (!existsSync(sw)) return;
      const files = [];
      const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(slash(relative(outDir, p))); } };
      walk(outDir);
      // precache: shell (html, js, css, fontes, ícones, manifest, retratos e cenário). GLBs e draco entram no cache quando pedidos.
      const pre = files.filter((f) => /^(index\.html|manifest\.webmanifest)$|^assets\/[^/]+\.(js|css)$|^fonts\/|^icons\/|portrait\.png$|^assets\/arena\//.test(f));
      const version = Date.now().toString(36);
      writeFileSync(sw, readFileSync(sw, 'utf8').replace('__RK_VERSION__', version).replace('[/*__RK_PRECACHE__*/]', JSON.stringify(['./', ...pre])));
    },
  };
}

// base relativa: o build roda igual em Vercel, Netlify, itch.io e nos portais (só caminhos relativos)
export default defineConfig({
  base: './',
  plugins: [rkAssets(), rkServiceWorker()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // three.js num arquivo próprio: muda raramente, então fica no cache do navegador entre versões do jogo
        manualChunks: (id) => (/node_modules[\\/]three[\\/]/.test(id) ? 'three' : undefined),
      },
    },
  },
  // worktrees dos agentes (.claude/worktrees) não podem recarregar o servidor da pasta principal
  server: { watch: { ignored: [(p) => slash(p).startsWith(WORKTREES), '**/videos/**'] } },
});
