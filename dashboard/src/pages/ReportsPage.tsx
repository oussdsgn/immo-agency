import { Search, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { SelectField, controlClass } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { REPORT_STATUSES } from '@/domain/reportWorkflow'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { useAsync } from '@/lib/useAsync'
import { isOpenStatus, listReports, unitLabel, type ReportListItem } from '@dash/lib/data'
import { ReportRow } from './OverviewPage'

export function ReportsPage() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const state = useAsync(listReports, [], ['reports'])
  const statut = params.get('statut') ?? 'open'
  const urgence = params.get('urgence') ?? ''
  const residence = params.get('residence') ?? ''
  const tech = params.get('technicien') ?? ''
  const search = params.get('q') ?? ''

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader title="Signalements" subtitle="Toutes les demandes des résidents" />
      <AsyncBoundary state={state}>
        {(reports) => {
          const residences = [...new Map(reports.filter((r) => r.unit?.building?.residence).map((r) => [r.unit!.building!.residence!.id, r.unit!.building!.residence!.name])).entries()]
          const techs = [...new Map(reports.filter((r) => r.technician).map((r) => [r.technician!.id, r.technician!.name])).entries()]
          const needle = search.trim().toLowerCase()
          const visible = reports.filter(
            (r) =>
              (statut === 'all' || (statut === 'open' ? isOpenStatus(r.status) : r.status === statut)) &&
              (!urgence || r.urgency === urgence) &&
              (!residence || r.unit?.building?.residence?.id === residence) &&
              (!tech || (tech === 'none' ? !r.assignee_id : r.assignee_id === tech)) &&
              (!needle || matches(r, needle)),
          )
          return (
            <div className="space-y-4">
              <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <label className="relative block sm:col-span-2 lg:col-span-1">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Recherche</span>
                  <Search className="pointer-events-none absolute start-3.5 bottom-3.5 size-4 text-muted" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => set('q', e.target.value)}
                    placeholder="Référence, titre, résident…"
                    className={cn(controlClass, 'border-line-strong py-2.5 ps-10')}
                  />
                </label>
                <SelectField label="Statut" value={statut} onChange={(e) => set('statut', e.target.value === 'open' ? '' : e.target.value)} className="py-2.5">
                  <option value="open">Ouverts</option>
                  <option value="all">Tous</option>
                  {REPORT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.${s}`)}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Urgence" value={urgence} onChange={(e) => set('urgence', e.target.value)} className="py-2.5">
                  <option value="">Toutes</option>
                  <option value="urgent">{t('urgency.urgent')}</option>
                  <option value="normal">{t('urgency.normal')}</option>
                  <option value="low">{t('urgency.low')}</option>
                </SelectField>
                <SelectField label="Résidence" value={residence} onChange={(e) => set('residence', e.target.value)} className="py-2.5">
                  <option value="">Toutes</option>
                  {residences.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </SelectField>
                <SelectField label="Technicien" value={tech} onChange={(e) => set('technicien', e.target.value)} className="py-2.5">
                  <option value="">Tous</option>
                  <option value="none">Non assigné</option>
                  {techs.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </SelectField>
              </Card>
              <p className="text-sm text-muted" aria-live="polite">
                {visible.length} signalement{visible.length > 1 ? 's' : ''}
              </p>
              <Card className="overflow-hidden">
                {visible.length === 0 ? (
                  <EmptyState icon={<SearchX />} title="Aucun signalement" body="Aucun résultat pour ces filtres." />
                ) : (
                  <ul className="divide-y divide-line">
                    {visible.map((r) => (
                      <li key={r.id}>
                        <ReportRow r={r} extra={<span className="text-xs text-muted">{r.technician ? r.technician.name : 'Non assigné'}</span>} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )
        }}
      </AsyncBoundary>
    </>
  )
}

function matches(r: ReportListItem, needle: string) {
  return [r.reference, r.title, r.resident?.full_name, r.resident?.email, unitLabel(r)].some((v) => v?.toLowerCase().includes(needle))
}
