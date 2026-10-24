/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Supabase project URL. When unset the app runs on local demo data. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon / publishable key (public by design; RLS protects data). Never the service-role key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
