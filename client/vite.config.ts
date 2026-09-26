import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the app from /ml-quest/; CI sets VITE_BASE for that build.
// Local dev and preview stay at '/'.
const base = process.env['VITE_BASE'] ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    // Keep in sync with "paths" in tsconfig.app.json.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
})
