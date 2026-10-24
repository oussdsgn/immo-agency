import { Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

export function Stepper({ labels, current }: { labels: string[]; current: number }) {
  const { t } = useI18n()
  return (
    <div className="mb-6">
      <p className="sr-only" aria-live="polite">
        {t('newReport.stepOf', { current: current + 1, total: labels.length })} — {labels[current]}
      </p>
      <ol className="flex items-center gap-2" aria-hidden>
        {labels.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={label} className={cn('flex items-center gap-2', i < labels.length - 1 && 'flex-1')}>
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
                  done && 'bg-brand text-white',
                  active && 'bg-brand text-white ring-4 ring-brand/15',
                  !done && !active && 'bg-sunken text-muted',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('hidden text-xs font-semibold sm:inline', active ? 'text-ink' : 'text-muted')}>{label}</span>
              {i < labels.length - 1 && (
                <span className={cn('h-0.5 min-w-3 flex-1 rounded-full', done ? 'bg-brand' : 'bg-line')} />
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-xs font-semibold text-muted sm:hidden">
        {t('newReport.stepOf', { current: current + 1, total: labels.length })} · <span className="text-ink">{labels[current]}</span>
      </p>
    </div>
  )
}
