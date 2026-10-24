import { DevBadge } from '@/components/ui/Badge'
import { STATUS_TONE, isOpen } from '@/domain/reportWorkflow'
import { useI18n, type TKey } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Report } from '@/types'

const DOT: Record<string, string> = {
  neutral: 'bg-neutral-ink',
  info: 'bg-info-ink',
  progress: 'bg-progress-ink',
  attention: 'bg-attention-ink',
  success: 'bg-success-ink',
  muted: 'bg-muted',
  danger: 'bg-danger-ink',
}

/** Chronological status history, with the expected next milestone greyed out. */
export function Timeline({ report }: { report: Report }) {
  const { t, f } = useI18n()
  const events = [...report.history].sort((a, b) => a.at.localeCompare(b.at))
  const showPending = isOpen(report.status)

  return (
    <ol className="relative">
      {events.map((e, i) => {
        const last = i === events.length - 1
        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {(!last || showPending) && <span className="absolute start-[0.6875rem] top-6 -bottom-0 w-0.5 bg-line" aria-hidden />}
            <span
              className={cn(
                'relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-surface',
                last ? DOT[STATUS_TONE[e.status]] : 'bg-line-strong',
              )}
              aria-hidden
            >
              <span className="size-2 rounded-full bg-white" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={cn('text-sm font-bold', last ? 'text-ink' : 'text-ink-soft')}>{t(`status.${e.status}`)}</p>
                {e.simulated && <DevBadge>{t('reportDetail.simulated')}</DevBadge>}
              </div>
              <p className="mt-0.5 text-xs text-muted">
                <time dateTime={e.at}>{f.dateTime(e.at)}</time>
              </p>
              {e.note && <p className="mt-1 text-sm text-ink-soft">{e.note.startsWith('timeline.') ? t(e.note as TKey) : e.note}</p>}
              {(e.technicianName || e.scheduledAt) && (
                <div className="mt-1.5 rounded-control bg-progress-soft/70 px-3 py-2 text-xs font-medium text-progress-ink">
                  {e.technicianName && <p>{t('timeline.technician', { name: e.technicianName })}</p>}
                  {e.scheduledAt && <p>{t('timeline.appointment', { date: f.dateTime(e.scheduledAt) })}</p>}
                </div>
              )}
            </div>
          </li>
        )
      })}
      {showPending && (
        <li className="relative flex gap-3 opacity-60">
          <span className="relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-dashed border-line-strong bg-surface" aria-hidden />
          <p className="text-sm font-semibold text-muted">{t('status.resolved')}</p>
        </li>
      )}
    </ol>
  )
}
