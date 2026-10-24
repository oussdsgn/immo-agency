import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { StaffDoc } from '@/services/firebase/schema'
import { auth, db } from '@dash/lib/firebase'

interface Profile {
  id: string
  full_name: string
  email: string
  /** `resident` when the account only exists in the resident app. */
  role: StaffDoc['role'] | 'resident' | null
}

interface StaffState {
  ready: boolean
  session: User | null
  profile: Profile | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<StaffState>({ ready: false, session: null, profile: null, refresh: async () => {}, signOut: async () => {} })

async function loadProfile(user: User): Promise<Profile> {
  const staff = await getDoc(doc(db, 'staff', user.uid)).catch(() => null)
  if (staff?.exists()) {
    const s = staff.data() as StaffDoc
    return { id: user.uid, full_name: s.fullName, email: s.email, role: s.role }
  }
  const resident = await getDoc(doc(db, 'residents', user.uid)).catch(() => null)
  return { id: user.uid, full_name: user.displayName ?? '', email: user.email ?? '', role: resident?.exists() ? 'resident' : null }
}

/**
 * Staff session. Access is decided by `staff/{uid}.role` in Firestore; the
 * guards below only shape the UI — the security rules refuse data to
 * non-staff anyway.
 */
export function StaffProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<StaffState, 'refresh' | 'signOut'>>({ ready: false, session: null, profile: null })

  const load = useCallback(async (user: User | null) => {
    setState({ ready: true, session: user, profile: user ? await loadProfile(user) : null })
  }, [])

  useEffect(() => onAuthStateChanged(auth, (user) => void load(user)), [load])

  const refresh = useCallback(() => load(auth.currentUser), [load])
  const signOut = useCallback(() => fbSignOut(auth), [])

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
