/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Reserved for a future HTTP data source ('mock' | 'api'). Never put secrets in VITE_* vars. */
  readonly VITE_DATA_SOURCE?: string
}
