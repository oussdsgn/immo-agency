import { ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { CardLink } from '@/components/ui/Card'
import { CategoryTile } from '@/components/ui/CategoryIcon'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Property, Report } from '@/types'

export function ReportCard({ report, property, className }: { report: Report; property?: Property; className?: string }) {
  const { t, f } = useI18n()
  const needsAction = report.status === 'awaiting_resident'
  return (
    <CardLink to={`/signalements/${report.id}`} className={cn('p-4', needsAction && 'border-attention-ink/25', className)}>
      <div className="flex items-start gap-3">
        <CategoryTile id={report.categoryId} />
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="text-start text-[0.9375rem] leading-snug font-bold text-ink">{report.title}</h3>
          <StatusBadge status={report.status} className="mt-1.5" />
          <p className="mt-1 text-xs text-muted">
            <span dir="ltr" className="font-medium">
              #{report.reference}
            </span>
            {' · '}
            {t(`categories.${report.categoryId}.name`)}
            {property && (
              <>
                {' · '}
                <bdi>{property.residenceName}</bdi>
              </>
            )}
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-muted">
            <span>{t('reports.submittedOn', { date: f.shortDate(report.createdAt) })}</span>
            <span className="flex items-center gap-1">
              {t('reports.updated', { relative: f.relative(report.updatedAt) })}
              <ChevronRight className="size-4 flip-rtl" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </CardLink>
  )
}
