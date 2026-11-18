import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', includeAssets: ['lifehub.svg'], manifest: { name: 'LIFEHUB', short_name: 'Lifehub', description: 'Your life. One place.', theme_color: '#11111a', background_color: '#11111a', display: 'standalone', start_url: './', icons: [{ src: 'lifehub.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] }, workbox: { navigateFallback: 'index.html' } })],
});
