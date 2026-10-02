import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// só ignora as worktrees ABAIXO desta pasta (dentro de uma worktree o próprio root fica em .claude/)
const slash = (p) => p.split('\\').join('/');
const WORKTREES = slash(resolve(__dirname, '.claude')) + '/';

// base relativa: o build roda igual em Vercel, Netlify ou itch.io
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  // worktrees dos agentes (.claude/worktrees) não podem recarregar o servidor da pasta principal
  server: { watch: { ignored: [(p) => slash(p).startsWith(WORKTREES), '**/videos/**'] } },
});
