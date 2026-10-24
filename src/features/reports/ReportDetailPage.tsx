import { CalendarDays, CircleAlert, Lock, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { DevBadge, StatusBadge, UrgencyBadge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CategoryTile } from '@/components/ui/CategoryIcon'
import { PageHeader, SectionHeading } from '@/components/ui/PageHeader'
import { AsyncBoundary, Skeleton } from '@/components/ui/States'
import { canResidentReply } from '@/domain/reportWorkflow'
import { unitLine } from '@/features/properties/format'
import { useI18n } from '@/i18n'
import { useAsync } from '@/lib/useAsync'
import { services } from '@/services'
import { AgencySimulator } from './AgencySimulator'
import { Conversation, ReplyComposer } from './Conversation'
import { PhotoGallery } from './PhotoGallery'
import { ResolutionFeedback } from './ResolutionFeedback'
import { Timeline } from './Timeline'

export function ReportDetailPage() {
  const { id = '' } = useParams()
  const { t, f } = useI18n()
  const state = useAsync(
    async () => {
      const report = await services.reports.getReport(id)
      const property = await services.properties.getProperty(report.propertyId).catch(() => undefined)
      return { report, property }
    },
    [id],
    ['reports'],
  )
  const [justReplied, setJustReplied] = useState(false)

  return (
    <>
      <PageHeader title={t('reportDetail.title')} back="/signalements" />
      <AsyncBoundary state={state} skeleton={<Skeleton className="h-96 rounded-card" />}>
        {({ report, property }) => (
          <div className="animate-fade-up space-y-6">
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span dir="ltr" className="font-mono text-sm font-bold text-ink-soft">
                  #{report.reference}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {report.createdLocally && <DevBadge>{t('reportDetail.localOnly')}</DevBadge>}
                  <StatusBadge status={report.status} />
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <CategoryTile id={report.categoryId} size="lg" />
                <div className="min-w-0">
                  <h2 dir="auto" className="text-start text-lg leading-snug font-bold text-ink">{report.title}</h2>
                  <p className="mt-0.5 text-sm text-muted">{t(`categories.${report.categoryId}.name`)}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                {property && (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    <span>
                      <bdi>{property.residenceName}</bdi> · {unitLine(t, property)} — {t(`locations.${report.location}`)}
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                  <span>
                    {t('reportDetail.submittedAt')} {f.dateTime(report.createdAt)}
                    <span className="text-muted"> · {t('reports.updated', { relative: f.relative(report.updatedAt) })}</span>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted">{t('reportDetail.urgency')}</span>
                  <UrgencyBadge urgency={report.urgency} />
                </li>
              </ul>
              <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-muted">
                <Lock className="size-3.5" aria-hidden />
                {t('reportDetail.statusReadOnly')} {t(`statusHint.${report.status}`)}
              </p>
            </Card>

            {report.status === 'awaiting_resident' && !justReplied && (
              <div role="status" className="flex items-start gap-3 rounded-card border border-attention-ink/20 bg-attention-soft p-4 text-attention-ink">
                <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-bold">{t('reportDetail.infoRequestTitle')}</p>
                  <p className="mt-0.5 text-sm">{t('reportDetail.infoRequestBody')}</p>
                  <a href="#reply" className="mt-2 inline-block text-sm font-semibold underline underline-offset-2">
                    {t('reportDetail.replyLabel')}
                  </a>
                </div>
              </div>
            )}

            <ResolutionFeedback report={report} />

            <section aria-labelledby="desc">
              <SectionHeading id="desc" title={t('reportDetail.description')} />
              <Card className="p-4 text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                <p dir="auto" className="text-start">{report.description}</p>
              </Card>
            </section>

            {report.attachments.length > 0 && (
              <section aria-labelledby="photos">
                <SectionHeading id="photos" title={t('reportDetail.photos')} />
                <PhotoGallery photos={report.attachments} />
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <section aria-labelledby="timeline">
                <SectionHeading id="timeline" title={t('reportDetail.timeline')} />
                <Card className="p-4 sm:p-5">
                  <Timeline report={report} />
                </Card>
              </section>

              <section aria-labelledby="conversation">
                <SectionHeading id="conversation" title={t('reportDetail.conversation')} />
                <Card className="p-4 sm:p-5">
                  <Conversation report={report} />
                  <div id="reply" className="mt-5 border-t border-line pt-5">
                    {canResidentReply(report) ? (
                      <ReplyComposer reportId={report.id} onSent={() => setJustReplied(true)} />
                    ) : (
                      <p className="text-sm text-muted">{t('reportDetail.closedNoReply')}</p>
                    )}
                  </div>
                </Card>
                {property?.residenceContact?.phone && (
                  <a
                    href={`tel:${property.residenceContact.phone.replace(/\s/g, '')}`}
                    className={buttonClass({ variant: 'secondary', block: true }, 'mt-3')}
                  >
                    <Phone className="size-4" aria-hidden />
                    {t('common.contactAgency')}
                  </a>
                )}
              </section>
            </div>

            {services.dev && <AgencySimulator report={report} />}
          </div>
        )}
      </AsyncBoundary>
    </>
  )
}
