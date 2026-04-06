/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Proxy to Hono server only when running in browser mode (not Tauri)
    proxy: {
      '/api/live/stream': {
        target: 'http://localhost:3001',
        timeout: 0,
      },
      '/api': 'http://localhost:3001',
      '/media': 'http://localhost:3001',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    root: '.',
  },
});
