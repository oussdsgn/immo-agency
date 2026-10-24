import { CircleAlert, LogIn, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import { errorCode } from '@/services'
import { Button, ButtonLink } from './Button'

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  body?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center text-center px-6 py-10', className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand [&>svg]:size-6.5">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useI18n()
  const code = errorCode(error)
  return (
    <div role="alert" className={cn('flex flex-col items-center text-center px-6 py-10', className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger-ink">
        {code === 'network' ? <WifiOff className="size-6" aria-hidden /> : <CircleAlert className="size-6" aria-hidden />}
      </div>
      <h3 className="text-base font-semibold">{t('errors.title')}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-muted">{t(`errors.${code}`)}</p>
      <div className="mt-5">
        {code === 'unauthorized' ? (
          <ButtonLink to="/connexion" variant="secondary" icon={<LogIn className="size-4 flip-rtl" aria-hidden />}>
            {t('auth.demoCta')}
          </ButtonLink>
        ) : (
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          )
        )}
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-control bg-sunken', className)} aria-hidden />
}

export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-card" />
      ))}
    </div>
  )
}

/** Renders loading / error / content for a `useAsync` result. */
export function AsyncBoundary<T>({
  state,
  skeleton,
  children,
}: {
  state: { data: T | undefined; error: unknown; loading: boolean; reload: () => void }
  skeleton?: ReactNode
  children: (data: T) => ReactNode
}) {
  if (state.data !== undefined && !state.error) return <>{children(state.data)}</>
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />
  return <>{skeleton ?? <ListSkeleton />}</>
}
