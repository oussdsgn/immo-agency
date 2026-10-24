import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { onChange, services } from '@/services'
import type { Session } from '@/types'

interface SessionState {
  session: Session | null
  ready: boolean
}

const SessionContext = createContext<SessionState>({ session: null, ready: false })

/**
 * Tracks the (demo) session. In production the session would come from the
 * agency's identity provider; hiding routes client-side is only a UX concern,
 * authorization must be enforced by the backend on every request.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, ready: false })

  useEffect(() => {
    let alive = true
    const load = () =>
      services.auth
        .getSession()
        .then((session) => alive && setState({ session, ready: true }))
        .catch(() => alive && setState((s) => ({ session: s.session, ready: true })))
    load()
    const off = onChange((topic) => {
      if (topic === 'session' || topic === 'all') load()
    })
    return () => {
      alive = false
      off()
    }
  }, [])

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  return useContext(SessionContext)
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { session, ready } = useSession()
  const location = useLocation()
  if (!ready) return null
  if (!session) return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}
