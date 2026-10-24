import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { db, type Row } from '@dash/lib/supabase'

type Profile = Pick<Row<'profiles'>, 'id' | 'full_name' | 'email' | 'role'>

interface StaffState {
  ready: boolean
  session: Session | null
  profile: Profile | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<StaffState>({ ready: false, session: null, profile: null, refresh: async () => {}, signOut: async () => {} })

/**
 * Staff session. Access is decided by `profiles.role` in the database; the
 * guards below only shape the UI — RLS refuses data to non-staff anyway.
 */
export function StaffProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<StaffState, 'refresh' | 'signOut'>>({ ready: !db, session: null, profile: null })

  const load = useCallback(async (session: Session | null) => {
    if (!db || !session) {
      setState({ ready: true, session, profile: null })
      return
    }
    const { data } = await db.from('profiles').select('id, full_name, email, role').eq('id', session.user.id).maybeSingle()
    setState({ ready: true, session, profile: data ?? null })
  }, [])

  useEffect(() => {
    if (!db) return
    void db.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void load(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const refresh = useCallback(async () => {
    if (!db) return
    const { data } = await db.auth.getSession()
    await load(data.session)
  }, [load])

  const signOut = useCallback(async () => {
    await db?.auth.signOut()
  }, [])

  return <Ctx.Provider value={{ ...state, refresh, signOut }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStaff() {
  return useContext(Ctx)
}

// eslint-disable-next-line react-refresh/only-export-components
export const isStaffRole = (role?: string | null) => role === 'agent' || role === 'admin'

export function RequireStaff({ children }: { children: ReactNode }) {
  const { ready, session, profile } = useStaff()
  const location = useLocation()
  if (!ready) return null
  if (!session) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  if (!isStaffRole(profile?.role)) return <Navigate to="/en-attente" replace />
  return <>{children}</>
}
