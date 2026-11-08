import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Sur GitHub Pages, l'appli vit dans un sous-dossier : https://ryoths.github.io/Listo/
// En local (npm run dev), elle reste à la racine « / ».
const base = process.env.GITHUB_PAGES ? '/Listo/' : '/';

// Configuration de l'application installable (Android + iPhone).
export default defineConfig({
  base,
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
        id: base,
        start_url: base,
        scope: base,
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
      },
    }),
  ],
  test: { environment: 'node', setupFiles: ['tests/setup.ts'] },
});
