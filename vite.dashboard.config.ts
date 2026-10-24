import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

/** Agency dashboard: separate web app sharing the design system and domain code in src/. */
export default defineConfig({
  root: fileURLToPath(new URL('./dashboard', import.meta.url)),
  // GitHub Pages serves the dashboard under /<repo>/; set DASHBOARD_BASE there.
  base: process.env.DASHBOARD_BASE ?? '/',
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@dash': fileURLToPath(new URL('./dashboard/src', import.meta.url)),
    },
  },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true, port: 5180 },
  build: { outDir: fileURLToPath(new URL('./dist-dashboard', import.meta.url)), emptyOutDir: true },
})
