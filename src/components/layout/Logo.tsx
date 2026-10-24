import markUrl from '@/assets/logo-mark.webp'
import { cn } from '@/lib/cn'

/** IMMO Agency mark (interlocking house loops), taken from the brand prototype. */
export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return <img src={markUrl} alt="" aria-hidden className={cn('shrink-0 object-contain', className)} />
}

/**
 * Horizontal lockup: mark + "IMMO / AGENCY" wordmark. The brand name is kept
 * in Latin script in both languages and always laid out left-to-right.
 */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg'
  return (
    <span className="inline-flex items-center gap-2" dir="ltr">
      <span className="sr-only">IMMO Agency</span>
      <LogoMark className={lg ? 'size-14' : 'size-9'} />
      <span className="flex flex-col font-sans leading-none" aria-hidden>
        <span className={cn('font-extrabold tracking-tight text-brand-blue', lg ? 'text-3xl' : 'text-[1.1875rem]')}>IMMO</span>
        <span className={cn('font-semibold text-brand', lg ? 'mt-1 text-xs tracking-[0.42em]' : 'mt-0.5 text-[0.5625rem] tracking-[0.38em]')}>
          AGENCY
        </span>
      </span>
    </span>
  )
}
