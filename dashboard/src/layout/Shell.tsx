import {
  Bell,
  BellOff,
  Building2,
  CalendarClock,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Users,
  Volume2,
  VolumeX,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { AlertIcon, alertLabel, useAlerts } from '@dash/alerts/AlertsProvider'
import { useStaff } from '@dash/auth/staff'

interface Item {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  admin?: boolean
}

const NAV: Item[] = [
  { to: '/', label: 'Vue d’ensemble', icon: LayoutDashboard, end: true },
  { to: '/signalements', label: 'Signalements', icon: ClipboardList },
  { to: '/interventions', label: 'Interventions', icon: CalendarClock },
  { to: '/immeubles', label: 'Immeubles', icon: Building2 },
  { to: '/techniciens', label: 'Techniciens', icon: HardHat },
  { to: '/annonces', label: 'Annonces', icon: Megaphone },
  { to: '/demandes', label: 'Demandes d’achat / location', icon: Inbox },
  { to: '/equipe', label: 'Équipe', icon: Users, admin: true },
]

export function Shell() {
  const { profile, signOut } = useStaff()
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-line bg-surface lg:h-dvh lg:w-64 lg:border-e lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-6">
          <Link to="/" className="block">
            <Logo />
          </Link>
          <p className="hidden text-xs font-semibold tracking-wide text-muted uppercase lg:mt-2 lg:block">Espace agence</p>
          <div className="lg:hidden">
            <TopActions />
          </div>
        </div>
        <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:mt-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.filter((n) => !n.admin || profile?.role === 'admin').map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 shrink-0 items-center gap-3 rounded-control px-3 text-sm font-semibold whitespace-nowrap transition-colors',
                  isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-soft hover:bg-sunken',
                )
              }
            >
              <n.icon className="size-4.5 shrink-0" aria-hidden />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-line p-4 lg:block">
          <p className="truncate text-sm font-bold text-ink">{profile?.full_name || profile?.email}</p>
          <p className="text-xs text-muted">{profile?.role === 'admin' ? 'Administrateur' : 'Agent'}</p>
          <button type="button" onClick={() => void signOut()} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
            <LogOut className="size-4" aria-hidden />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-10 hidden items-center justify-end border-b border-line/70 bg-canvas/90 px-8 py-3 backdrop-blur lg:flex">
          <TopActions />
        </div>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function TopActions() {
  const { link, unread, alerts, markAllRead, markRead, sound, setSound, browserNotifications, enableBrowserNotifications } = useAlerts()
  const { f } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex',
          link === 'live' ? 'bg-success-soft text-success-ink' : link === 'offline' ? 'bg-danger-soft text-danger-ink' : 'bg-sunken text-muted',
        )}
        title="État de la connexion temps réel"
      >
        <span className={cn('size-2 rounded-full bg-current', link === 'live' && 'animate-pulse')} aria-hidden />
        {link === 'live' ? 'En direct' : link === 'offline' ? 'Hors ligne' : 'Connexion…'}
      </span>
      <button
        type="button"
        onClick={() => setSound(!sound)}
        className="grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:border-line-strong"
        aria-label={sound ? 'Couper le son des alertes' : 'Activer le son des alertes'}
        aria-pressed={sound}
      >
        {sound ? <Volume2 className="size-4.5" aria-hidden /> : <VolumeX className="size-4.5" aria-hidden />}
      </button>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="relative grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:border-line-strong"
          aria-label={`Alertes${unread ? ` (${unread} non lues)` : ''}`}
          aria-expanded={open}
        >
          <Bell className="size-4.5" aria-hidden />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-brand px-1 text-[0.625rem] leading-4.5 font-bold text-white ring-2 ring-canvas">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute end-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-card border border-line bg-surface shadow-raised">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-bold text-ink">Alertes de la session</p>
              {unread > 0 && (
                <button type="button" onClick={markAllRead} className="text-xs font-semibold text-brand-ink hover:underline">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {alerts.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Aucune alerte depuis l’ouverture du tableau de bord.</li>}
              {alerts.map((a) => (
                <li key={a.id} className="border-b border-line last:border-b-0">
                  <Link
                    to={`/signalements/${a.reportId}`}
                    onClick={() => {
                      markRead(a.id)
                      setOpen(false)
                    }}
                    className={cn('flex gap-3 px-4 py-3 hover:bg-sunken/60', !a.read && 'bg-brand-soft/40')}
                  >
                    <AlertIcon kind={a.kind} className={cn('mt-0.5 size-4 shrink-0', a.urgency === 'urgent' ? 'text-danger-ink' : 'text-brand')} />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-muted">
                        {alertLabel(a.kind)} · {f.relative(a.at)}
                      </span>
                      <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {browserNotifications !== 'unsupported' && browserNotifications !== 'granted' && (
              <button
                type="button"
                onClick={() => void enableBrowserNotifications()}
                disabled={browserNotifications === 'denied'}
                className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-start text-xs font-semibold text-ink-soft hover:bg-sunken/60 disabled:opacity-60"
              >
                <BellOff className="size-4 shrink-0" aria-hidden />
                {browserNotifications === 'denied'
                  ? 'Notifications du navigateur bloquées (à autoriser dans les réglages du site)'
                  : 'Recevoir les alertes même quand l’onglet est en arrière-plan'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
