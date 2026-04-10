/// <reference types="vitest" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, '../web/src'),
      // web/src/components/RagChat.tsx imports dompurify; when demo re-uses
      // that component via the @web alias, node resolution walks up from
      // web/src/ and never reaches demo/node_modules (web/node_modules is
      // .vercelignore'd on Vercel). Point the bare specifier at demo's own
      // copy so the build resolves under both environments.
      dompurify: path.resolve(__dirname, 'node_modules/dompurify'),
    },
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next', 'i18next-browser-languagedetector', 'marked', 'dompurify'],
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
