/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** `firebase` or `mock` (local demo data). Defaults to mock in dev, firebase in builds. */
  readonly VITE_DATA_SOURCE?: 'firebase' | 'mock'
  /** Optional overrides of the public Firebase web config (src/config/firebase.ts). */
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  /** Host of the local Firebase emulators (development and e2e tests only). */
  readonly VITE_FIREBASE_EMULATOR?: string
}
