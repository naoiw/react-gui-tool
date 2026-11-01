import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GITHUB_PAGES_BASE switches between production and /develop/ builds.
// Local/offline builds keep relative assets.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : process.env.GITHUB_PAGES_BASE || './',
}));
