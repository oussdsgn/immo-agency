import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger' | 'dev'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-control transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100 select-none text-center'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-brand hover:bg-brand-strong',
  secondary: 'bg-surface text-brand-ink border border-brand/35 hover:bg-brand-soft',
  soft: 'bg-brand-soft text-brand-ink hover:bg-[#fbe1d2]',
  ghost: 'text-ink-soft hover:bg-sunken',
  danger: 'bg-danger-soft text-danger-ink hover:bg-[#fbdcdc]',
  dev: 'bg-dev-soft text-dev border border-dashed border-dev/50 hover:bg-[#e7e0f8]',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-[0.9375rem]',
  lg: 'min-h-13 px-5 text-base',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  block?: boolean
  icon?: ReactNode
  iconEnd?: ReactNode
}

// eslint-disable-next-line react-refresh/only-export-components
export function buttonClass({ variant = 'primary', size = 'md', block }: CommonProps, extra?: string) {
  return cn(base, variants[variant], sizes[size], block && 'w-full', extra)
}

export function Button({
  variant,
  size,
  block,
  icon,
  iconEnd,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4.5 animate-spin" aria-hidden /> : icon}
      {children}
      {iconEnd}
    </button>
  )
}

export function ButtonLink({ variant, size, block, icon, iconEnd, className, children, ...rest }: CommonProps & LinkProps) {
  return (
    <Link className={buttonClass({ variant, size, block }, className)} {...rest}>
      {icon}
      {children}
      {iconEnd}
    </Link>
  )
}
