import { BellRing, MessageSquare, RotateCcw, Star, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { emitChange } from '@/services/events'
import { collection, onSnapshot } from 'firebase/firestore'
import type { ReportDoc } from '@/services/firebase/schema'
import { toListItem } from '@dash/lib/data'
import { db } from '@dash/lib/firebase'

export type AlertKind = 'new_report' | 'resident_reply' | 'reopened' | 'feedback'

export interface AgencyAlert {
  id: string
  kind: AlertKind
  reportId: string
  reference: string
  title: string
  urgency: string
  rating?: number | null
  at: string
  read: boolean
}

type LinkState = 'connecting' | 'live' | 'offline'

interface AlertsState {
  alerts: AgencyAlert[]
  unread: number
  link: LinkState
  sound: boolean
  setSound: (v: boolean) => void
  browserNotifications: NotificationPermission | 'unsupported'
  enableBrowserNotifications: () => Promise<void>
  markAllRead: () => void
  markRead: (id: string) => void
}

const Ctx = createContext<AlertsState | null>(null)

const LABEL: Record<AlertKind, string> = {
  new_report: 'Nouveau signalement',
  resident_reply: 'Réponse d’un résident',
  reopened: 'Problème toujours présent',
  feedback: 'Nouvel avis',
}

const SOUND_KEY = 'immo-agency.dashboard.sound'

function beep(urgent: boolean) {
  try {
    const ctx = new AudioContext()
    const tones = urgent ? [0, 0.22] : [0]
    for (const start of tones) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = urgent ? 880 : 660
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start)
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + start)
      o.stop(ctx.currentTime + start + 0.2)
    }
    setTimeout(() => void ctx.close(), 800)
  } catch {
    // audio unavailable (autoplay policy before any click)
  }
}

/**
 * Realtime feed for the agency. Listens to resident activity (new reports,
 * replies, reopenings, ratings), shows toasts, plays an optional sound and
 * can raise browser notifications while the tab is in the background.
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AgencyAlert[]>([])
  const [toasts, setToasts] = useState<AgencyAlert[]>([])
  const [link, setLink] = useState<LinkState>('connecting')
  const [sound, setSoundState] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const soundRef = useRef(sound)
  useEffect(() => {
    soundRef.current = sound
  }, [sound])
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])
  const push = useCallback((kind: AlertKind, reportId: string, r: ReportDoc) => {
    const item = toListItem(reportId, r)
    const alert: AgencyAlert = {
      id: crypto.randomUUID(),
      kind,
      reportId,
      reference: item.reference,
      title: r.title,
      urgency: r.urgency,
      rating: kind === 'feedback' ? (r.feedback?.rating ?? null) : undefined,
      at: new Date().toISOString(),
      read: false,
    }
    setAlerts((a) => [alert, ...a].slice(0, 100))
    setToasts((t) => [alert, ...t].slice(0, 4))
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== alert.id)), alert.urgency === 'urgent' ? 15000 : 8000)
    if (soundRef.current) beep(alert.urgency === 'urgent')
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification(`${LABEL[kind]} — ${alert.reference}`, { body: alert.title, tag: alert.id })
      n.onclick = () => {
        window.focus()
        navigateRef.current(`/signalements/${reportId}`)
      }
    }
  }, [])

  useEffect(() => {
    // One live query on all reports: new documents are new reports, and
    // `residentActivity` changes are replies, ratings and reopenings.
    const seen = new Map<string, number>()
    let initial = true
    return onSnapshot(
      collection(db, 'reports'),
      { includeMetadataChanges: false },
      (snap) => {
        setLink(snap.metadata.fromCache ? 'connecting' : 'live')
        for (const change of snap.docChanges()) {
          const r = change.doc.data({ serverTimestamps: 'estimate' }) as ReportDoc
          const activity = r.residentActivity ? (r.residentActivity.at as { toMillis?: () => number }).toMillis?.() ?? 0 : 0
          const before = seen.get(change.doc.id)
          seen.set(change.doc.id, activity)
          if (initial || change.type === 'removed' || snap.metadata.hasPendingWrites) continue
          if (change.type === 'added') push('new_report', change.doc.id, r)
          else if (r.residentActivity && activity !== before) {
            const kind = r.residentActivity.kind
            push(kind === 'reply' ? 'resident_reply' : kind === 'reopen' ? 'reopened' : 'feedback', change.doc.id, r)
          }
        }
        if (!initial && snap.docChanges().length) emitChange('reports')
        initial = false
      },
      () => setLink('offline'),
    )
  }, [push])

  const value: AlertsState = {
    alerts,
    unread: alerts.filter((a) => !a.read).length,
    link,
    sound,
    setSound: (v) => {
      setSoundState(v)
      try {
        localStorage.setItem(SOUND_KEY, v ? 'on' : 'off')
      } catch {
        // ignore
      }
      if (v) beep(false)
    },
    browserNotifications: perm,
    enableBrowserNotifications: async () => {
      if (typeof Notification === 'undefined') return
      setPerm(await Notification.requestPermission())
    },
    markAllRead: () => setAlerts((a) => a.map((x) => ({ ...x, read: true }))),
    markRead: (id) => setAlerts((a) => a.map((x) => (x.id === id ? { ...x, read: true } : x))),
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed end-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
        {toasts.map((a) => (
          <AlertToast key={a.id} alert={a} onClose={() => setToasts((t) => t.filter((x) => x.id !== a.id))} onOpen={() => value.markRead(a.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAlerts(): AlertsState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAlerts outside AlertsProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function alertLabel(kind: AlertKind) {
  return LABEL[kind]
}

export function AlertIcon({ kind, className }: { kind: AlertKind; className?: string }) {
  const Icon = kind === 'new_report' ? BellRing : kind === 'resident_reply' ? MessageSquare : kind === 'reopened' ? RotateCcw : Star
  return <Icon className={className} aria-hidden />
}

function AlertToast({ alert, onClose, onOpen }: { alert: AgencyAlert; onClose: () => void; onOpen: () => void }) {
  const urgent = alert.urgency === 'urgent'
  return (
    <div
      role="alert"
      className={cn(
        'animate-fade-up pointer-events-auto flex items-start gap-3 rounded-card border bg-surface p-4 shadow-raised',
        urgent ? 'border-danger-ink/40' : 'border-line',
      )}
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', urgent ? 'bg-danger-soft text-danger-ink' : 'bg-brand-soft text-brand')}>
        <AlertIcon kind={alert.kind} className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide text-muted uppercase">
          {alertLabel(alert.kind)}
          {urgent && <span className="ms-2 text-danger-ink">• Urgent</span>}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-ink">{alert.title}</p>
        <p className="text-xs text-muted">
          #{alert.reference}
          {alert.kind === 'feedback' && alert.rating ? ` · ${'★'.repeat(alert.rating)}${'☆'.repeat(5 - alert.rating)}` : ''}
        </p>
        <Link to={`/signalements/${alert.reportId}`} onClick={onOpen} className="mt-2 inline-block text-sm font-semibold text-brand-ink hover:underline">
          Ouvrir
        </Link>
      </div>
      <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full text-muted hover:bg-sunken" aria-label="Fermer">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
