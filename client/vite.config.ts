import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname, './src'),
        path.resolve(import.meta.dirname, './public'),
        path.resolve(import.meta.dirname, './node_modules'),
      ],
      deny: ['**/.env*', '**/.git*', '../server/**', '../.agents/**'],
    },
    allowedHosts: ['host.docker.internal', 'localhost', '127.0.0.1'],
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'same-site',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; connect-src 'self' http://localhost:3001 ws://localhost:5173 http://localhost:5173 http://127.0.0.1:3001 http://host.docker.internal:3001; frame-src 'self' https://www.youtube.com https://player.vimeo.com; frame-ancestors 'none';",
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/*.spec.ts', 'node_modules/**'],
  },
});
