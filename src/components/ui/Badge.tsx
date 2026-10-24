import { FlaskConical } from 'lucide-react'
import type { ReactNode } from 'react'
import type { StatusTone } from '@/domain/reportWorkflow'
import { STATUS_TONE } from '@/domain/reportWorkflow'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ReportStatus, Urgency } from '@/types'

const tones: Record<StatusTone | 'brand' | 'dev', string> = {
  neutral: 'bg-neutral-soft text-neutral-ink',
  info: 'bg-info-soft text-info-ink',
  progress: 'bg-progress-soft text-progress-ink',
  attention: 'bg-attention-soft text-attention-ink',
  success: 'bg-success-soft text-success-ink',
  muted: 'bg-sunken text-muted',
  danger: 'bg-danger-soft text-danger-ink',
  brand: 'bg-brand-soft text-brand-ink',
  dev: 'bg-dev-soft text-dev',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
}: {
  tone?: keyof typeof tones
  children: ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

export function StatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  const { t } = useI18n()
  return (
    <Badge tone={STATUS_TONE[status]} dot className={className}>
      {t(`status.${status}`)}
    </Badge>
  )
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const { t } = useI18n()
  const tone = urgency === 'urgent' ? 'danger' : urgency === 'normal' ? 'progress' : 'neutral'
  return <Badge tone={tone}>{t(`urgency.${urgency}`)}</Badge>
}

/** Marks anything simulated or stored only on this device. */
export function DevBadge({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  return (
    <Badge tone="dev" className="gap-1">
      <FlaskConical className="size-3" aria-hidden />
      {children ?? t('common.demo')}
    </Badge>
  )
}
