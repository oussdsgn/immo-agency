import { Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { AsyncBoundary, EmptyState } from '@/components/ui/States'
import { isOpen } from '@/domain/reportWorkflow'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { IS_MOCK_DATA, services } from '@/services'
import { ClaimUnitForm } from './ClaimUnitForm'
import { PropertyCard } from './PropertyCard'

export function PropertiesPage() {
  const { t } = useI18n()
  const state = useAsync(
    () => Promise.all([services.properties.listMyProperties(), services.reports.listReports()]),
    [],
    ['reports', 'all'],
  )

  return (
    <>
      <PageHeader title={t('properties.title')} subtitle={t('properties.subtitle')} />
      <AsyncBoundary state={state}>
        {([properties, reports]) =>
          <div className="space-y-6">
            {properties.length === 0 ? (
              <Card>
                <EmptyState icon={<Building2 />} title={t('properties.emptyTitle')} body={t('properties.emptyBody')} className="pb-4" />
              </Card>
            ) : (
              <div className="animate-fade-up grid gap-4 sm:grid-cols-2">
                {properties.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    openReports={reports.filter((r) => r.propertyId === p.id && isOpen(r.status)).length}
                  />
                ))}
              </div>
            )}
            {!IS_MOCK_DATA && (
              <Card className="p-4 sm:p-5">
                <ClaimUnitForm />
              </Card>
            )}
          </div>
        }
      </AsyncBoundary>
    </>
  )
}
