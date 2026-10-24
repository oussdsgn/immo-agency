import { ArrowRight, Building2, CircleAlert, ClipboardCheck, KeyRound, Megaphone, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardLink } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState, Skeleton } from '@/components/ui/States'
import { isOpen } from '@/domain/reportWorkflow'
import { PropertyRow } from '@/features/properties/PropertyCard'
import { unitLine } from '@/features/properties/format'
import { ReportCard } from '@/features/reports/ReportCard'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { services } from '@/services'
import type { Announcement, Property } from '@/types'

async function loadHome() {
  const [resident, properties, reports, announcements] = await Promise.all([
    services.resident.getCurrentResident(),
    services.properties.listMyProperties(),
    services.reports.listReports(),
    services.announcements.listAnnouncements(),
  ])
  return { resident, properties, reports, announcements }
}

export function HomePage() {
  const { t, tp } = useI18n()
  const state = useAsync(loadHome, [], ['reports', 'notifications'])

  return (
    <AsyncBoundary state={state} skeleton={<HomeSkeleton />}>
      {({ resident, properties, reports, announcements }) => {
        const active = reports.filter((r) => isOpen(r.status))
        const awaiting = active.filter((r) => r.status === 'awaiting_resident')
        const latest = active[0] ?? reports[0]
        const byId = new Map(properties.map((p) => [p.id, p]))
        const primary = properties[0]

        return (
          <div className="animate-fade-up space-y-7">
            <section aria-labelledby="greeting">
              <h1 id="greeting" className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
                {t('home.greeting', { name: resident.firstName })}
              </h1>
              {primary && (
                <p className="mt-1 text-sm text-muted">
                  <bdi>{primary.residenceName}</bdi> · {unitLine(t, primary)}
                </p>
              )}
            </section>

            {properties.length > 0 ? (
              <Link
                to="/signaler"
                className="group flex items-center gap-4 rounded-sheet bg-brand p-5 text-white shadow-brand transition-[background-color,transform] hover:bg-brand-strong active:scale-[0.99]"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/18 ring-1 ring-white/25">
                  <Plus className="size-6" strokeWidth={2.4} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{t('home.reportCta')}</span>
                  <span className="mt-0.5 block text-sm text-white/85">{t('home.reportCtaHint')}</span>
                </span>
                <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5 flip-rtl" aria-hidden />
              </Link>
            ) : (
              <Card>
                <EmptyState icon={<Building2 />} title={t('home.noPropertiesTitle')} body={t('home.noPropertiesBody')} />
              </Card>
            )}

            {awaiting.map((r) => (
              <Link
                key={r.id}
                to={`/signalements/${r.id}`}
                className="flex items-start gap-3 rounded-card border border-attention-ink/20 bg-attention-soft p-4 text-attention-ink transition-colors hover:border-attention-ink/40"
              >
                <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{t('home.actionNeeded')}</span>
                  <span className="mt-0.5 block text-sm">
                    {t('reportDetail.infoRequestTitle')} — <bdi>{r.title}</bdi>
                  </span>
                </span>
                <ArrowRight className="mt-0.5 size-4.5 shrink-0 flip-rtl" aria-hidden />
              </Link>
            ))}

            <div className="grid gap-7 lg:grid-cols-2 lg:gap-6 [&>*]:min-w-0">
              <section aria-labelledby="active-reports">
                <SectionHeading
                  id="active-reports"
                  title={t('home.activeReports')}
                  action={
                    reports.length > 0 && (
                      <Link to="/signalements" className="text-sm font-semibold text-brand-ink hover:underline">
                        {t('common.seeAll')}
                      </Link>
                    )
                  }
                />
                <Card className="mb-3 flex items-center gap-3 p-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-sunken text-ink-soft">
                    <ClipboardCheck className="size-5" aria-hidden />
                  </span>
                  <p className="flex-1 text-sm font-semibold text-ink">{tp('activeReports', active.length)}</p>
                  <span className="text-2xl font-bold text-ink tabular-nums">{active.length}</span>
                </Card>
                {latest ? (
                  <>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t('home.latestUpdate')}</p>
                    <ReportCard report={latest} property={byId.get(latest.propertyId)} />
                  </>
                ) : (
                  <Card>
                    <EmptyState icon={<ClipboardCheck />} title={t('home.noActiveTitle')} body={t('home.noActiveBody')} className="py-7" />
                  </Card>
                )}
              </section>

              <section aria-labelledby="announcements">
                <SectionHeading id="announcements" title={t('home.announcements')} />
                {announcements.length ? (
                  <div className="space-y-3">
                    {announcements.map((a) => (
                      <AnnouncementCard key={a.id} announcement={a} property={byId.get(a.propertyIds[0])} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-5 text-sm text-muted">{t('home.noAnnouncements')}</Card>
                )}
              </section>
            </div>

            {properties.length > 0 && (
              <section aria-labelledby="my-properties">
                <SectionHeading
                  id="my-properties"
                  title={t('home.myProperties')}
                  action={
                    <Link to="/biens" className="text-sm font-semibold text-brand-ink hover:underline">
                      {t('common.seeAll')}
                    </Link>
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {properties.map((p) => (
                    <PropertyRow key={p.id} property={p} />
                  ))}
                </div>
              </section>
            )}

            <CardLink to="/acquerir" className="flex items-center gap-4 border-dashed bg-transparent p-4 shadow-none">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-ink-soft">
                <KeyRound className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink">{t('home.discoverTitle')}</span>
                <span className="mt-0.5 block text-xs text-muted">{t('home.discoverBody')}</span>
              </span>
              <span className="hidden text-sm font-semibold text-brand-ink sm:inline">{t('home.discoverCta')}</span>
              <ArrowRight className="size-4.5 shrink-0 text-brand-ink flip-rtl" aria-hidden />
            </CardLink>
          </div>
        )
      }}
    </AsyncBoundary>
  )
}

function AnnouncementCard({ announcement, property }: { announcement: Announcement; property?: Property }) {
  const { locale, t, f } = useI18n()
  return (
    <Card className="flex gap-3 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        <Megaphone className="size-5 flip-rtl" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-ink">{announcement.title[locale]}</h3>
          {announcement.important && <Badge tone="brand">{t('home.important')}</Badge>}
        </div>
        <p className="mt-1 text-sm text-ink-soft">{announcement.body[locale]}</p>
        <p className="mt-2 text-xs text-muted">
          {f.relative(announcement.publishedAt)}
          {property && (
            <>
              {' · '}
              <Link to={`/biens/${property.id}`} className="font-semibold hover:underline">
                {property.residenceName}
              </Link>
            </>
          )}
        </p>
      </div>
    </Card>
  )
}

function HomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 rounded-sheet" />
      <Skeleton className="h-40 rounded-card" />
      <Skeleton className="h-32 rounded-card" />
    </div>
  )
}
