import type { Services } from './contracts'
import { createMockServices } from './mock/mockServices'
import { createBrowserStore } from './mock/storage'
import { createSupabaseServices } from './supabase/supabaseServices'

/**
 * Single place where the data source is chosen.
 *
 * - With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set at build time, the
 *   app talks to the agency's Supabase project (real accounts, shared data,
 *   live updates with the agency dashboard).
 * - Without them, it runs on the local demo data (prototype mode).
 *
 * The anon / publishable key is designed to be public: access is enforced by
 * row level security in the database. Never put the service-role key in a
 * VITE_* variable.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const IS_MOCK_DATA = !(url && key)

export const services: Services = IS_MOCK_DATA
  ? createMockServices({ store: createBrowserStore() })
  : createSupabaseServices(url!, key!)

export type { Services } from './contracts'
export { ServiceError, errorCode } from './errors'
export { onChange } from './events'
