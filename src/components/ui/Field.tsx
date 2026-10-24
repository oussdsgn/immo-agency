import { ChevronDown, CircleAlert } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const controlClass =
  'w-full rounded-control border bg-surface px-3.5 py-3 text-[0.9375rem] text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] focus:outline-none focus:ring-4 focus:ring-brand/15 focus:border-brand'

interface FieldShellProps {
  label: string
  hint?: ReactNode
  error?: string
  optionalLabel?: string
  counter?: string
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
}

export function FieldShell({ label, hint, error, optionalLabel, counter, children }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {optionalLabel && <span className="ms-1 font-normal text-muted">({optionalLabel})</span>}
        </label>
        {counter && (
          <span className="text-xs text-muted tabular-nums" aria-hidden>
            {counter}
          </span>
        )}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  )
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger-ink">
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

type Shared = Omit<FieldShellProps, 'children'>

export function TextField({ label, hint, error, optionalLabel, counter, className, ...rest }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell {...{ label, hint, error, optionalLabel, counter }}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          dir="auto"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, invalid ? 'border-danger-ink/60' : 'border-line-strong', className)}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

export function TextArea({ label, hint, error, optionalLabel, counter, className, ...rest }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell {...{ label, hint, error, optionalLabel, counter }}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          dir="auto"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'min-h-32 resize-y', invalid ? 'border-danger-ink/60' : 'border-line-strong', className)}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  optionalLabel,
  className,
  children,
  ...rest
}: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell {...{ label, hint, error, optionalLabel }}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, 'appearance-none pe-10', invalid ? 'border-danger-ink/60' : 'border-line-strong', className)}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      )}
    </FieldShell>
  )
}
