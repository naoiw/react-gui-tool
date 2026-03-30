import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Project Pages: https://<user>.github.io/react-gui-tool/
export default defineConfig(({ command }) => {
  const isGithubPages = process.env.GITHUB_PAGES === 'true';
  const base = command === 'serve' ? '/' : isGithubPages ? '/react-gui-tool/' : './';

  return {
    plugins: [react()],
    base,
  };
});
