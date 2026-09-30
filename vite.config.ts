import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Makes the site installable as an app (home screen / desktop) that also works offline.
    VitePWA({
      // The single-file preview build runs where service workers aren't allowed.
      disable: mode === 'single',
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TCG Grading ROI',
        short_name: 'Grading ROI',
        description: 'Compare PSA, CGC, SGC, BGS and TAG grading against selling raw, after eBay fees, shipping and supplies.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f6f8',
        theme_color: '#3b5bdb',
        categories: ['finance', 'utilities'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  base: './',
}));
