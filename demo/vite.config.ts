/// <reference types="vitest" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, '../web/src'),
    },
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next', 'i18next-browser-languagedetector', 'marked'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['@tauri-apps/api/core'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
