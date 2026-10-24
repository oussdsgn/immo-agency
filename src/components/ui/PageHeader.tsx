import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

/**
 * Page title row. `back` renders a back control that uses history when the
 * user navigated within the app, and falls back to `back` after a refresh or
 * deep link.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  className,
}: {
  title: string
  subtitle?: ReactNode
  back?: string
  actions?: ReactNode
  className?: string
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const canGoBack = location.key !== 'default'

  return (
    <header className={cn('mb-5 flex items-start gap-3', className)}>
      {back && (
        <Link
          to={back}
          onClick={(e) => {
            if (canGoBack) {
              e.preventDefault()
              navigate(-1)
            }
          }}
          className="-ms-2 mt-0.5 grid size-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-sunken"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="size-5 flip-rtl" aria-hidden />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.375rem] leading-tight font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SectionHeading({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-[0.9375rem] font-bold text-ink">
        {title}
      </h2>
      {action}
    </div>
  )
}
