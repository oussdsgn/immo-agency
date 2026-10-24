import { Check, FlaskConical } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AsyncBoundary, Skeleton } from '@/components/ui/States'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { IS_MOCK_DATA, services } from '@/services'

export function ConfirmationPage() {
  const { id = '' } = useParams()
  const { t, f } = useI18n()
  const state = useAsync(() => services.reports.getReport(id), [id])

  return (
    <AsyncBoundary state={state} skeleton={<Skeleton className="mx-auto h-96 max-w-md rounded-card" />}>
      {(report) => (
        <div className="mx-auto flex max-w-md flex-col items-center pt-6 text-center">
          <div className="animate-pop grid size-20 place-items-center rounded-full bg-success-ink text-white shadow-[0_12px_30px_-10px_rgb(35_112_74/0.6)]">
            <Check className="size-10" strokeWidth={3} aria-hidden />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink" tabIndex={-1}>
            {t('confirmation.title')}
          </h1>
          <p className="mt-2 text-sm text-muted">{t('confirmation.body')}</p>

          <Card className="mt-6 w-full divide-y divide-line text-start">
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm text-muted">{IS_MOCK_DATA ? t('confirmation.reference') : t('common.reference')}</span>
              <span dir="ltr" className="font-mono text-sm font-bold text-ink">
                #{report.reference}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm text-muted">{t('confirmation.initialStatus')}</span>
              <StatusBadge status={report.status} />
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="text-sm text-muted">{t('reportDetail.submittedAt')}</span>
              <span className="text-sm font-semibold text-ink">{f.dateTime(report.createdAt)}</span>
            </div>
          </Card>

          {IS_MOCK_DATA && (
            <p className="mt-4 flex items-start gap-2 rounded-control bg-dev-soft p-3 text-start text-xs font-medium text-dev">
              <FlaskConical className="mt-px size-4 shrink-0" aria-hidden />
              {t('confirmation.prototypeNotice')}
            </p>
          )}

          <div className="mt-6 flex w-full flex-col gap-3">
            <ButtonLink to={`/signalements/${report.id}`} size="lg" block replace>
              {t('confirmation.viewReport')}
            </ButtonLink>
            <ButtonLink to="/" variant="secondary" size="lg" block replace>
              {t('confirmation.backHome')}
            </ButtonLink>
          </div>
        </div>
      )}
    </AsyncBoundary>
  )
}
