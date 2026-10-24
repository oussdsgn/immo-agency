import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/services/supabase/database.types'

export type Db = SupabaseClient<Database>
export type Tables = Database['public']['Tables']
export type Row<T extends keyof Tables> = Tables[T]['Row']
export type ReportStatus = Database['public']['Enums']['report_status']
export type UserRole = Database['public']['Enums']['user_role']

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Null when the dashboard was built without a Supabase project. */
export const db: Db | null = url && key ? createClient<Database>(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null

export function requireDb(): Db {
  if (!db) throw new Error('Supabase is not configured')
  return db
}

/** Readable French message for a failed request. */
export function errorMessage(err: unknown): string {
  const e = err as Partial<PostgrestError> & { message?: string }
  const msg = e?.message ?? String(err)
  if (err instanceof TypeError || /fetch|network/i.test(msg)) return 'Connexion impossible. Vérifiez le réseau et réessayez.'
  if (e?.code === '42501') return 'Action non autorisée pour votre compte.'
  if (/transition/.test(msg)) return 'Ce changement de statut n’est pas autorisé à cette étape.'
  if (e?.code === '23505') return 'Cet élément existe déjà.'
  if (e?.code === '23514' || e?.code === '22P02') return 'Certaines valeurs sont invalides.'
  if (e?.code === '23503') return 'Élément encore utilisé ailleurs : suppression impossible.'
  return msg || 'Une erreur est survenue.'
}

/** Awaits a query, throwing on error. */
export async function q<T>(p: PromiseLike<{ data: T; error: PostgrestError | null }>): Promise<NonNullable<T>> {
  const res = await p
  if (res.error) throw res.error
  return res.data as NonNullable<T>
}
