import { BedDouble, ClipboardList, Layers, Mail, MapPin, Phone, Plus, Ruler } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { BuildingIllustration } from '@/components/ui/BuildingIllustration'
import { ButtonLink, buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DescriptionList } from '@/components/ui/Controls'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState, Skeleton } from '@/components/ui/States'
import { ReportCard } from '@/features/reports/ReportCard'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { IS_MOCK_DATA, services } from '@/services'
import { unitLine } from './format'

export function PropertyDetailPage() {
  const { id = '' } = useParams()
  const { t, tp } = useI18n()
  const state = useAsync(
    () => Promise.all([services.properties.getProperty(id), services.reports.listReports({ propertyId: id })]),
    [id],
    ['reports'],
  )

  return (
    <>
      <PageHeader title={t('properties.detailTitle')} back="/biens" />
      <AsyncBoundary state={state} skeleton={<Skeleton className="h-72 rounded-card" />}>
        {([p, reports]) => (
          <div className="animate-fade-up space-y-6">
            <Card className="overflow-hidden">
              <div className="aspect-[16/8] bg-sunken sm:aspect-[16/6]">
                <BuildingIllustration visual={p.visual} label={p.residenceName} />
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-ink">{p.residenceName}</h2>
                  <Badge tone="brand">{t(`properties.role.${p.role}`)}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{unitLine(t, p)}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {p.areaSqm && <Fact icon={<Ruler />} label={t('properties.surface')} value={t('properties.area', { value: p.areaSqm })} />}
                  {p.rooms && <Fact icon={<BedDouble />} label={t('properties.roomsLabel')} value={tp('rooms', p.rooms)} />}
                  {p.floor !== undefined && (
                    <Fact
                      icon={<Layers />}
                      label={t('properties.location')}
                      value={p.floor === 0 ? t('properties.groundFloor') : t('properties.floor', { value: p.floor })}
                    />
                  )}
                </div>
              </div>
            </Card>

            <ButtonLink to={`/signaler?bien=${p.id}`} size="lg" block icon={<Plus className="size-5" aria-hidden />}>
              {t('properties.reportProblemHere')}
            </ButtonLink>

            <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
              <section aria-labelledby="info">
                <SectionHeading id="info" title={t('properties.information')} />
                <Card className="px-4">
                  <DescriptionList
                    items={[
                      {
                        label: t('properties.address'),
                        value: (
                          <span className="inline-flex items-start gap-1">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
                            {p.address}, {p.city}
                          </span>
                        ),
                      },
                      ...(p.building ? [{ label: t('properties.buildingLabel'), value: p.building }] : []),
                      ...(p.unit ? [{ label: t('properties.unitLabel'), value: p.unit }] : []),
                      ...(p.residenceContact?.manager ? [{ label: t('properties.manager'), value: p.residenceContact.manager }] : []),
                    ]}
                  />
                </Card>
                {p.amenities && p.amenities.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-semibold text-ink-soft">{t('properties.amenities')}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {p.amenities.map((a) => (
                        <li key={a}>
                          <Badge tone="muted" className="bg-surface border border-line text-ink-soft py-1">
                            {t(`amenities.${a}`)}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {p.residenceContact && (
                <section aria-labelledby="contact">
                  <SectionHeading id="contact" title={t('properties.contact')} />
                  <Card className="p-4">
                    {p.residenceContact.manager && <p className="text-sm font-bold text-ink">{p.residenceContact.manager}</p>}
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                      {p.residenceContact.phone && (
                        <a href={`tel:${p.residenceContact.phone.replace(/\s/g, '')}`} className={buttonClass({ variant: 'secondary', block: true })}>
                          <Phone className="size-4" aria-hidden />
                          <span dir="ltr">{p.residenceContact.phone}</span>
                        </a>
                      )}
                      {p.residenceContact.email && (
                        <a href={`mailto:${p.residenceContact.email}`} className={buttonClass({ variant: 'ghost', block: true }, 'border border-line')}>
                          <Mail className="size-4" aria-hidden />
                          {t('common.email')}
                        </a>
                      )}
                    </div>
                    {IS_MOCK_DATA && <p className="mt-3 text-xs text-muted">{t('common.fictionalData')}</p>}
                  </Card>
                </section>
              )}
            </div>

            <section aria-labelledby="property-reports">
              <SectionHeading id="property-reports" title={t('properties.reportsForProperty')} />
              {reports.length ? (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <ReportCard key={r.id} report={r} />
                  ))}
                </div>
              ) : (
                <Card>
                  <EmptyState icon={<ClipboardList />} title={t('properties.noReportsForProperty')} className="py-7" />
                </Card>
              )}
            </section>
          </div>
        )}
      </AsyncBoundary>
    </>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-control bg-sunken/70 p-3">
      <span className="text-muted [&>svg]:size-4" aria-hidden>
        {icon}
      </span>
      <p className="mt-1.5 text-xs text-muted">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  )
}
