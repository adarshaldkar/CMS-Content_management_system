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
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy':
        "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://fonts.gstatic.com; connect-src 'self' http://localhost:3001 ws://localhost:5173 http://localhost:5173 http://127.0.0.1:3001 http://host.docker.internal:3001; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://www.loom.com https://open.spotify.com https://platform.twitter.com https://syndication.twitter.com; media-src 'self' data: blob: https:;",
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
