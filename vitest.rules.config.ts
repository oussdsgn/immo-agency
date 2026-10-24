import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Security rules tests; need the Firestore emulator (npm run test:rules). */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['firebase/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    sequence: { concurrent: false },
  },
})
