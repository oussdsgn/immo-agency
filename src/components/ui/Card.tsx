import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export const cardClass = 'min-w-0 bg-surface border border-line rounded-card shadow-card'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardClass, className)} {...rest} />
}

/** A whole-card link with hover/focus affordance. */
export function CardLink({ to, className, children, state }: { to: string; className?: string; children: ReactNode; state?: unknown }) {
  return (
    <Link
      to={to}
      state={state}
      className={cn(
        cardClass,
        'block transition-[border-color,box-shadow,transform] duration-150 hover:border-line-strong hover:shadow-raised active:scale-[0.995]',
        className,
      )}
    >
      {children}
    </Link>
  )
}
