import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// só ignora as worktrees ABAIXO desta pasta (dentro de uma worktree o próprio root fica em .claude/)
const WORKTREES = resolve(__dirname, '.claude').replace(/\/g, '/');

// base relativa: o build roda igual em Vercel, Netlify ou itch.io
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  // worktrees dos agentes (.claude/worktrees) não podem recarregar o servidor da pasta principal
  server: { watch: { ignored: [(p) => p.replace(/\/g, '/').startsWith(WORKTREES), '**/videos/**'] } },
});
