import { defineConfig } from 'vite';

// base relativa: o build roda igual em Vercel, Netlify ou itch.io
export default defineConfig({
  base: './',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  // worktrees dos agentes (.claude/worktrees) não podem recarregar o servidor da pasta principal
  server: { watch: { ignored: ['**/.claude/**', '**/videos/**'] } },
});
