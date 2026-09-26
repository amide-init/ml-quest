import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /ml-quest/; CI sets VITE_BASE for that build.
// Local dev and preview stay at '/'.
const base = process.env['VITE_BASE'] ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    // Offline play (ARCHITECTURE §11): precache the whole app on the first visit. Updates wait
    // for the player (registerType "prompt", applied from the map); platform/ServiceWorker registers it.
    VitePWA({
      disable: Boolean(process.env['VITEST']),
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'ML Quest',
        short_name: 'ML Quest',
        description: 'Learn machine learning by training real models to beat levels.',
        theme_color: '#0e1d26',
        background_color: '#0e1d26',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,webmanifest}'],
        // The game's text is Latin; other scripts' font files still load on demand if needed.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        cleanupOutdatedCaches: true,
        // The first worker controls the open page at once, so a level opened before any reload
        // (its lazy chunk) is served from the cache too. Updates still wait: no skipWaiting.
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    // Keep in sync with "paths" in tsconfig.app.json.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
})
