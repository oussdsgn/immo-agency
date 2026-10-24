import { ChevronRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Single-choice pill group (filters, tabs). Uses radio semantics. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: { value: T; label: string; count?: number }[]
  onChange: (v: T) => void
  className?: string
}) {
  const name = useId()
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {options.map((o) => {
          const active = o.value === value
          return (
            <label
              key={o.value}
              className={cn(
                'relative inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink-soft hover:border-line-strong',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
              {o.count !== undefined && (
                <span className={cn('text-xs tabular-nums', active ? 'text-white/80' : 'text-muted')}>{o.count}</span>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-4 py-3">
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-6 rounded-full bg-white shadow transition-[inset-inline-start] duration-200',
            checked ? 'start-[1.375rem]' : 'start-0.5',
          )}
        />
      </button>
    </div>
  )
}

/** Settings / navigation row with optional trailing value and chevron. */
export function ListRow({
  icon,
  label,
  value,
  to,
  onClick,
  tone = 'default',
}: {
  icon?: ReactNode
  label: string
  value?: ReactNode
  to?: string
  onClick?: () => void
  tone?: 'default' | 'danger'
}) {
  const content = (
    <>
      {icon && (
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl [&>svg]:size-4.5',
            tone === 'danger' ? 'bg-danger-soft text-danger-ink' : 'bg-sunken text-ink-soft',
          )}
        >
          {icon}
        </span>
      )}
      <span className={cn('min-w-0 flex-1 text-sm font-semibold', tone === 'danger' ? 'text-danger-ink' : 'text-ink')}>
        {label}
      </span>
      {value && <span className="min-w-0 truncate text-sm text-muted">{value}</span>}
      {(to || onClick) && tone !== 'danger' && <ChevronRight className="size-4.5 shrink-0 text-muted flip-rtl" aria-hidden />}
    </>
  )
  const cls = 'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-sunken/60'
  if (to)
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    )
  return <div className={cls}>{content}</div>
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((it) => (
        <div key={it.label} className="flex items-start justify-between gap-4 py-3">
          <dt className="shrink-0 text-sm text-muted">{it.label}</dt>
          <dd className="min-w-0 text-end text-sm font-semibold text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
