import { Bell, CheckCheck, CircleAlert, CircleCheck, ClipboardList, Megaphone, RefreshCw, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DevBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import { errorCode, services } from '@/services'
import type { Announcement, AppNotification, NotificationType, Report } from '@/types'

const ICON: Record<NotificationType, LucideIcon> = {
  report_submitted: ClipboardList,
  report_status_changed: RefreshCw,
  info_requested: CircleAlert,
  report_resolved: CircleCheck,
  announcement: Megaphone,
}

const TONE: Record<NotificationType, string> = {
  report_submitted: 'bg-sunken text-ink-soft',
  report_status_changed: 'bg-info-soft text-info-ink',
  info_requested: 'bg-attention-soft text-attention-ink',
  report_resolved: 'bg-success-soft text-success-ink',
  announcement: 'bg-brand-soft text-brand',
}

async function load() {
  const [notifications, reports, announcements] = await Promise.all([
    services.notifications.listNotifications(),
    services.reports.listReports(),
    services.announcements.listAnnouncements(),
  ])
  return { notifications, reports, announcements }
}

export function NotificationsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const state = useAsync(load, [], ['notifications', 'reports'])
  const unread = state.data?.notifications.filter((n) => !n.read).length ?? 0

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        back="/"
        actions={
          unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              icon={<CheckCheck className="size-4" aria-hidden />}
              onClick={() => services.notifications.markAllRead().catch((e) => toast(t(`errors.${errorCode(e)}`), 'error'))}
            >
              <span className="max-sm:sr-only">{t('notifications.markAllRead')}</span>
            </Button>
          )
        }
      />
      <AsyncBoundary state={state}>
        {({ notifications, reports, announcements }) =>
          notifications.length === 0 ? (
            <Card>
              <EmptyState icon={<Bell />} title={t('notifications.emptyTitle')} body={t('notifications.emptyBody')} />
            </Card>
          ) : (
            <Card className="animate-fade-up overflow-hidden">
              <ul>
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    report={reports.find((r) => r.id === n.reportId)}
                    announcement={announcements.find((a) => a.id === n.announcementId)}
                  />
                ))}
              </ul>
            </Card>
          )
        }
      </AsyncBoundary>
    </>
  )
}

function NotificationItem({ n, report, announcement }: { n: AppNotification; report?: Report; announcement?: Announcement }) {
  const { t, f, locale } = useI18n()
  const navigate = useNavigate()
  const Icon = ICON[n.type]

  const ref = report ? `#${report.reference}` : ''
  const status = n.status ? t(`status.${n.status}`) : ''
  const text =
    n.type === 'announcement'
      ? t('notifications.announcement', { title: announcement?.title[locale] ?? '' })
      : t(`notifications.${n.type}`, { ref, status })
  const target = report ? `/signalements/${report.id}` : n.propertyId ? `/biens/${n.propertyId}` : null

  async function open() {
    if (!n.read) await services.notifications.markRead(n.id).catch(() => {})
    if (target) navigate(target)
  }

  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={open}
        className={cn('flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-sunken/60', !n.read && 'bg-brand-soft/35')}
      >
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE[n.type])}>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm', n.read ? 'text-ink-soft' : 'font-semibold text-ink')}>{text}</span>
          {report && (
            <span dir="auto" className="mt-0.5 block truncate text-start text-xs text-muted">
              {report.title}
            </span>
          )}
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <time dateTime={n.at}>{f.relative(n.at)}</time>
            {n.simulated && <DevBadge>{t('reportDetail.simulated')}</DevBadge>}
          </span>
        </span>
        {!n.read && (
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand">
            <span className="sr-only">{t('notifications.unread')}</span>
          </span>
        )}
      </button>
    </li>
  )
}
