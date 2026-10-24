import { ClipboardList, Plus, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Controls'
import { SelectField } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { matchesStatusFilter, type StatusFilter } from '@/domain/reportWorkflow'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { services } from '@/services'
import { ReportCard } from './ReportCard'

const FILTERS: StatusFilter[] = ['all', 'open', 'awaiting_resident', 'done']

export function ReportsPage() {
  const { t, tp } = useI18n()
  // Filters live in the URL so refresh / back keep them.
  const [params, setParams] = useSearchParams()
  const status = (FILTERS as string[]).includes(params.get('statut') ?? '') ? (params.get('statut') as StatusFilter) : 'all'
  const propertyId = params.get('bien') ?? ''

  const state = useAsync(
    () => Promise.all([services.reports.listReports(), services.properties.listMyProperties()]),
    [],
    ['reports'],
  )

  function setFilter(key: 'statut' | 'bien', value: string) {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          <ButtonLink to="/signaler" size="sm" icon={<Plus className="size-4" aria-hidden />} className="max-sm:px-2.5">
            <span className="max-sm:sr-only">{t('reports.newReport')}</span>
          </ButtonLink>
        }
      />
      <AsyncBoundary state={state}>
        {([reports, properties]) => {
          if (reports.length === 0)
            return (
              <Card>
                <EmptyState
                  icon={<ClipboardList />}
                  title={t('reports.emptyTitle')}
                  body={t('reports.emptyBody')}
                  action={
                    properties.length > 0 && (
                      <ButtonLink to="/signaler" icon={<Plus className="size-4" aria-hidden />}>
                        {t('home.reportCta')}
                      </ButtonLink>
                    )
                  }
                />
              </Card>
            )
          const byId = new Map(properties.map((p) => [p.id, p]))
          const scoped = reports.filter((r) => !propertyId || r.propertyId === propertyId)
          const visible = scoped.filter((r) => matchesStatusFilter(r.status, status))
          return (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <Segmented
                  label={t('reports.filterLabel')}
                  value={status}
                  onChange={(v) => setFilter('statut', v)}
                  options={FILTERS.map((f) => ({
                    value: f,
                    label: t(`reports.filters.${f}`),
                    count: scoped.filter((r) => matchesStatusFilter(r.status, f)).length,
                  }))}
                />
                {properties.length > 1 && (
                  <div className="sm:w-56">
                    <SelectField
                      label={t('reports.propertyFilterLabel')}
                      value={propertyId}
                      onChange={(e) => setFilter('bien', e.target.value)}
                      className="py-2"
                    >
                      <option value="">{t('reports.allProperties')}</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.residenceName}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted" aria-live="polite">
                {tp('results', visible.length)}
              </p>
              {visible.length ? (
                <ul className="animate-fade-up space-y-3">
                  {visible.map((r) => (
                    <li key={r.id}>
                      <ReportCard report={r} property={properties.length > 1 ? byId.get(r.propertyId) : undefined} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Card>
                  <EmptyState icon={<SearchX />} title={t('reports.emptyFilteredTitle')} body={t('reports.emptyFilteredBody')} />
                </Card>
              )}
            </div>
          )
        }}
      </AsyncBoundary>
    </>
  )
}
