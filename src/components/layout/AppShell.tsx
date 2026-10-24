import { Bell, Building2, ClipboardList, FlaskConical, House, KeyRound, Siren, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useUnreadCount } from '@/features/notifications/useUnreadCount'
import { useI18n, type TKey } from '@/i18n'
import { cn } from '@/lib/cn'
import { IS_MOCK_DATA } from '@/services'
import { LanguageSwitch } from './LanguageSwitch'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: TKey
  icon: LucideIcon
  end?: boolean
}

const PRIMARY: NavItem[] = [
  { to: '/', label: 'nav.home', icon: House, end: true },
  { to: '/biens', label: 'nav.properties', icon: Building2 },
  { to: '/signalements', label: 'nav.reports', icon: ClipboardList },
  { to: '/profil', label: 'nav.profile', icon: UserRound },
]

/** Routes where the bottom bar is hidden to keep the reporting flow focused. */
const FOCUS_ROUTES = ['/signaler']

export function AppShell() {
  const { t } = useI18n()
  const location = useLocation()
  const unread = useUnreadCount()
  const focus = FOCUS_ROUTES.some((r) => location.pathname.startsWith(r))
  const mainRef = useRef<HTMLElement>(null)

  // Scroll to top and move focus to the page on navigation (not on query changes).
  useEffect(() => {
    window.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('nav.skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col border-e border-line bg-surface/70 px-4 py-6 lg:flex">
        <Link to="/" className="px-2">
          <Logo />
        </Link>
        <p className="mt-2 px-2 text-xs text-muted">{t('common.tagline')}</p>
        <nav aria-label={t('nav.main')} className="mt-8 flex flex-col gap-1">
          {PRIMARY.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
          <div className="my-3 h-px bg-line" />
          <SideLink item={{ to: '/notifications', label: 'nav.notifications', icon: Bell }} badge={unread} />
          <SideLink item={{ to: '/acquerir', label: 'nav.acquire', icon: KeyRound }} />
          <SideLink item={{ to: '/urgences', label: 'nav.emergency', icon: Siren }} />
        </nav>
        <div className="mt-auto space-y-3 px-1">
          {IS_MOCK_DATA && (
            <Link
              to="/dev"
              className="flex items-center gap-2 rounded-control border border-dashed border-dev/40 bg-dev-soft px-3 py-2 text-xs font-semibold text-dev"
            >
              <FlaskConical className="size-3.5" aria-hidden />
              {t('dev.title')}
            </Link>
          )}
          <LanguageSwitch />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex h-15 max-w-2xl items-center justify-between gap-3 px-4">
            <Link to="/" aria-label={t('nav.home')}>
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitch compact />
              <BellLink unread={unread} />
            </div>
          </div>
        </header>

        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className={cn(
            'mx-auto w-full max-w-2xl px-4 pt-5 outline-none sm:px-6 lg:max-w-4xl lg:px-10 lg:pt-10 lg:pb-12',
            focus ? 'pb-10' : 'pb-28',
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {!focus && (
        <nav
          aria-label={t('nav.main')}
          className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
        >
          <ul className="mx-auto grid max-w-2xl grid-cols-4">
            {PRIMARY.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-semibold transition-colors',
                      isActive ? 'text-brand' : 'text-muted hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', isActive && 'bg-brand-soft')}>
                        <item.icon className="size-5" strokeWidth={isActive ? 2.3 : 1.9} aria-hidden />
                      </span>
                      <span className="max-w-full truncate">{t(item.label)}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}

function SideLink({ item, badge }: { item: NavItem; badge?: number }) {
  const { t } = useI18n()
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors',
          isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-soft hover:bg-sunken',
        )
      }
    >
      <item.icon className="size-5" aria-hidden />
      <span className="flex-1">{t(item.label)}</span>
      {!!badge && (
        <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[0.6875rem] font-bold text-white tabular-nums">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

export function BellLink({ unread }: { unread: number }) {
  const { t, tp } = useI18n()
  return (
    <Link
      to="/notifications"
      className="relative grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-soft hover:border-line-strong"
      aria-label={unread ? `${t('nav.notifications')} — ${tp('unreadNotifications', unread)}` : t('nav.notifications')}
    >
      <Bell className="size-4.5" aria-hidden />
      {unread > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-brand px-1 text-[0.625rem] leading-4.5 font-bold text-white ring-2 ring-canvas tabular-nums">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
