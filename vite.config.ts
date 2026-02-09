import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Project Pages: https://<user>.github.io/react-gui-tool/
const base = process.env.GITHUB_PAGES === 'true' ? '/react-gui-tool/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
});
