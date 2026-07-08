import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes asset links relative, so this works under any GitHub Pages
// repo name (username.github.io/ANY-NAME/) without extra configuration.
export default defineConfig({
  plugins: [react()],
  base: './',
});
