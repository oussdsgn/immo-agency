import { CalendarClock, HardHat, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UrgencyBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import type { ReportCategoryId } from '@/types'
import { byPriority, isOpenStatus, listReports, listTechnicians, unitLabel, type ReportListItem } from '@dash/lib/data'
import { ReportRow } from './OverviewPage'

/** Dispatch board: what still needs a technician, and each technician's upcoming jobs. */
export function DispatchPage() {
  const state = useAsync(() => Promise.all([listReports(), listTechnicians()]), [], ['reports'])
  const { t, f } = useI18n()
  return (
    <>
      <PageHeader title="Interventions" subtitle="Planification des techniciens" />
      <AsyncBoundary state={state}>
        {([reports, techs]) => {
          const open = reports.filter((r) => isOpenStatus(r.status))
          const queue = open.filter((r) => !r.assignee_id).sort(byPriority)
          const jobs = (id: string) =>
            open.filter((r) => r.assignee_id === id).sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
          return (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <section aria-labelledby="queue" className="min-w-0">
                <SectionHeading id="queue" title={`À planifier (${queue.length})`} />
                <Card className="overflow-hidden">
                  {queue.length === 0 ? (
                    <EmptyState icon={<CalendarClock />} title="File vide" body="Chaque signalement ouvert a un technicien." className="py-8" />
                  ) : (
                    <ul className="divide-y divide-line">
                      {queue.map((r) => (
                        <li key={r.id}>
                          <ReportRow r={r} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </section>

              <section aria-labelledby="techs" className="min-w-0">
                <SectionHeading
                  id="techs"
                  title="Planning par technicien"
                  action={
                    <Link to="/techniciens" className="text-sm font-semibold text-brand-ink hover:underline">
                      Gérer les techniciens
                    </Link>
                  }
                />
                {techs.length === 0 ? (
                  <Card>
                    <EmptyState icon={<HardHat />} title="Aucun technicien" body="Ajoutez vos techniciens et prestataires pour pouvoir planifier." />
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {techs.map((tech) => {
                      const list = jobs(tech.id)
                      return (
                        <Card key={tech.id} className="overflow-hidden">
                          <div className="flex items-center gap-3 border-b border-line bg-sunken/50 px-4 py-3">
                            <span className="grid size-9 place-items-center rounded-full bg-ink text-sm font-bold text-white">
                              {tech.name.slice(0, 1)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-ink">{tech.name}</p>
                              <p className="truncate text-xs text-muted">
                                {t(`categories.${tech.trade as ReportCategoryId}.name`)}
                                {tech.company ? ` · ${tech.company}` : ''}
                              </p>
                            </div>
                            {tech.phone && (
                              <a href={`tel:${tech.phone.replace(/[^\d+]/g, '')}`} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-surface" aria-label={`Appeler ${tech.name}`}>
                                <Phone className="size-4" aria-hidden />
                              </a>
                            )}
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', list.length ? 'bg-brand-soft text-brand-ink' : 'bg-sunken text-muted')}>
                              {list.length}
                            </span>
                          </div>
                          {list.length === 0 ? (
                            <p className="px-4 py-4 text-sm text-muted">Disponible</p>
                          ) : (
                            <ul className="divide-y divide-line">
                              {list.map((r) => (
                                <Job key={r.id} r={r} when={r.scheduled_at ? f.dateTime(r.scheduled_at) : 'À fixer'} />
                              ))}
                            </ul>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )
        }}
      </AsyncBoundary>
    </>
  )
}

function Job({ r, when }: { r: ReportListItem; when: string }) {
  const [now] = useState(() => Date.now())
  const late = r.scheduled_at && new Date(r.scheduled_at).getTime() < now && r.status === 'in_progress'
  return (
    <li>
      <Link to={`/signalements/${r.id}`} className="block px-4 py-3 hover:bg-sunken/60">
        <p className={cn('text-xs font-bold', late ? 'text-danger-ink' : 'text-progress-ink')}>
          {when}
          {late && ' · en retard'}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="truncate">{r.title}</span>
          {r.urgency === 'urgent' && <UrgencyBadge urgency="urgent" />}
        </p>
        <p className="truncate text-xs text-muted">{unitLabel(r)}</p>
      </Link>
    </li>
  )
}
