import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  plugins: [react(), tailwindcss()],
  // esbuild: {
  //   drop: ['console', 'debugger'],
  // },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  /*
  server: {
    proxy: {
      // Hotel search service — port 5012
      '/destinations': {
        target: 'http://localhost:5012',
        changeOrigin: true,
        proxyTimeout: 120000, // 120 seconds
        timeout: 120000,
      },
      // Hotel booking service — port 5013
      '/hotels': {
        target: 'http://localhost:5013',
        changeOrigin: true,
      },
      // Insurance service — port 5014
      '/api/insurance': {
        target: 'http://localhost:5014',
        changeOrigin: true,
      },
    },
  },
  */
});
