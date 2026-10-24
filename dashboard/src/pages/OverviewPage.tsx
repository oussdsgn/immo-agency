import { AlarmClock, CalendarClock, CircleAlert, Inbox, Star, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge, UrgencyBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CategoryTile } from '@/components/ui/CategoryIcon'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState, Skeleton } from '@/components/ui/States'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import type { ReportCategoryId } from '@/types'
import { AlertIcon, alertLabel, useAlerts } from '@dash/alerts/AlertsProvider'
import { byPriority, isOpenStatus, listReports, unitLabel, type ReportListItem } from '@dash/lib/data'

export function OverviewPage() {
  const state = useAsync(listReports, [], ['reports'])
  return (
    <>
      <PageHeader title="Vue d’ensemble" subtitle="Ce qui demande votre attention aujourd’hui" />
      <AsyncBoundary state={state} skeleton={<Skeleton className="h-80 rounded-card" />}>
        {(reports) => <Overview reports={reports} />}
      </AsyncBoundary>
    </>
  )
}

function Overview({ reports }: { reports: ReportListItem[] }) {
  const { f } = useI18n()
  // Reference time captured once per mount; lists refresh on every data change anyway.
  const [now] = useState(() => Date.now())
  const open = reports.filter((r) => isOpenStatus(r.status))
  const fresh = open.filter((r) => r.status === 'submitted')
  const urgent = open.filter((r) => r.urgency === 'urgent')
  const toDispatch = open.filter((r) => !r.assignee_id).sort(byPriority)
  const awaiting = open.filter((r) => r.status === 'awaiting_resident')
  const today = new Date().toDateString()
  const todayJobs = open
    .filter((r) => r.scheduled_at && new Date(r.scheduled_at).toDateString() === today)
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))
  const since = now - 30 * 86_400_000
  const rated = reports.filter((r) => r.feedback_rating && r.feedback_at && new Date(r.feedback_at).getTime() > since)
  const avg = rated.length ? rated.reduce((s, r) => s + (r.feedback_rating ?? 0), 0) / rated.length : null

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={Inbox} label="Nouveaux" value={fresh.length} to="/signalements?statut=submitted" tone="brand" />
        <Kpi icon={CircleAlert} label="Urgents ouverts" value={urgent.length} to="/signalements?urgence=urgent" tone={urgent.length ? 'danger' : 'neutral'} />
        <Kpi icon={AlarmClock} label="À planifier" value={toDispatch.length} to="/interventions" tone="progress" />
        <Kpi icon={CalendarClock} label="Interventions aujourd’hui" value={todayJobs.length} to="/interventions" tone="info" />
        <Kpi
          icon={Star}
          label="Satisfaction (30 j)"
          value={avg === null ? '—' : `${avg.toLocaleString('fr-DZ', { maximumFractionDigits: 1 })} / 5`}
          hint={rated.length ? `${rated.length} avis` : 'Aucun avis'}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="queue" className="min-w-0">
          <SectionHeading
            id="queue"
            title="À traiter en priorité"
            action={
              <Link to="/signalements" className="text-sm font-semibold text-brand-ink hover:underline">
                Tous les signalements
              </Link>
            }
          />
          <Card className="overflow-hidden">
            {toDispatch.length === 0 ? (
              <EmptyState icon={<Inbox />} title="Rien en attente" body="Tous les signalements ouverts ont un technicien." className="py-8" />
            ) : (
              <ul className="divide-y divide-line">
                {toDispatch.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    <ReportRow r={r} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {awaiting.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              {awaiting.length} signalement{awaiting.length > 1 ? 's' : ''} en attente de réponse d’un résident.{' '}
              <Link to="/signalements?statut=awaiting_resident" className="font-semibold text-brand-ink hover:underline">
                Voir
              </Link>
            </p>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="today">
            <SectionHeading id="today" title="Interventions du jour" />
            <Card className="overflow-hidden">
              {todayJobs.length === 0 ? (
                <p className="p-4 text-sm text-muted">Aucune intervention planifiée aujourd’hui.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {todayJobs.map((r) => (
                    <li key={r.id}>
                      <Link to={`/signalements/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sunken/60">
                        <span className="w-14 shrink-0 text-sm font-bold text-ink tabular-nums">
                          {new Date(r.scheduled_at!).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                          <span className="block truncate text-xs text-muted">
                            {r.technician?.name} · {unitLabel(r)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
          <LiveFeed />
        </div>
      </div>
      <p className="text-xs text-muted">Mis à jour {f.relative(new Date().toISOString())} — les nouvelles demandes s’affichent en direct.</p>
    </div>
  )
}

function LiveFeed() {
  const { alerts, link } = useAlerts()
  const { f } = useI18n()
  return (
    <section aria-labelledby="feed">
      <SectionHeading id="feed" title="Activité en direct" />
      <Card className="overflow-hidden">
        {alerts.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            {link === 'live'
              ? 'En attente d’activité des résidents… Les nouveaux signalements apparaîtront ici instantanément.'
              : 'Connexion au flux en direct…'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.slice(0, 8).map((a) => (
              <li key={a.id}>
                <Link to={`/signalements/${a.reportId}`} className="flex gap-3 px-4 py-3 hover:bg-sunken/60">
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
        )}
      </Card>
    </section>
  )
}

export function ReportRow({ r, extra }: { r: ReportListItem; extra?: ReactNode }) {
  const { t, f } = useI18n()
  return (
    <Link to={`/signalements/${r.id}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-sunken/60">
      <CategoryTile id={r.category as ReportCategoryId} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-ink">{r.title}</span>
          {r.urgency === 'urgent' && <UrgencyBadge urgency="urgent" />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          #{r.reference} · {t(`categories.${r.category as ReportCategoryId}.name`)} · {unitLabel(r)}
        </span>
        <span className="mt-0.5 block text-xs text-muted">
          {r.resident?.full_name || 'Résident'} · {f.relative(r.created_at)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={r.status} />
        {extra}
      </span>
    </Link>
  )
}

const TONES = {
  brand: 'bg-brand-soft text-brand',
  danger: 'bg-danger-soft text-danger-ink',
  progress: 'bg-progress-soft text-progress-ink',
  info: 'bg-info-soft text-info-ink',
  success: 'bg-success-soft text-success-ink',
  neutral: 'bg-sunken text-ink-soft',
}

function Kpi({ icon: Icon, label, value, hint, to, tone }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string; to?: string; tone: keyof typeof TONES }) {
  const body = (
    <>
      <span className={cn('grid size-9 place-items-center rounded-xl', TONES[tone])}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="mt-3 block text-2xl font-bold text-ink tabular-nums">{value}</span>
      <span className="block text-sm font-semibold text-ink-soft">{label}</span>
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </>
  )
  const cls = 'block rounded-card border border-line bg-surface p-4 shadow-card'
  return to ? (
    <Link to={to} className={cn(cls, 'transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
