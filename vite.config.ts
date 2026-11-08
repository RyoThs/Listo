import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Configuration de l'application installable (Android + iPhone).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // la nouvelle version s'installe toute seule
      includeAssets: ['icon.svg', 'apple-touch-icon-180.png'],
      manifest: {
        name: 'LISTO – Listes de courses',
        short_name: 'LISTO',
        description: 'Tes listes de courses, rapides et hors ligne.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF7F2',
        theme_color: '#FAF7F2',
        categories: ['shopping', 'food', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          // Icône « maskable » : Android la découpe en rond, carré ou goutte selon le téléphone
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  test: { environment: 'node', setupFiles: ['tests/setup.ts'] },
});
