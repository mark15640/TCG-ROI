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
        // Card lookups work offline for cards already viewed; prices refresh whenever online.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://api.tcgdex.net',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tcgdex-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://assets.tcgdex.net',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tcgdex-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: './',
}));
