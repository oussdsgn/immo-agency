import { Languages } from 'lucide-react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Locale } from '@/types'

/** Two-option toggle; switching never navigates or resets form state. */
export function LanguageSwitch({ className, compact }: { className?: string; compact?: boolean }) {
  const { locale, setLocale, t } = useI18n()
  const options: Locale[] = ['fr', 'ar']

  if (compact) {
    const other: Locale = locale === 'fr' ? 'ar' : 'fr'
    return (
      <button
        type="button"
        onClick={() => setLocale(other)}
        lang={other}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink-soft hover:border-line-strong',
          className,
        )}
        aria-label={t('language.switchTo', { lang: t(`language.${other}`) })}
      >
        <Languages className="size-4" aria-hidden />
        {other === 'ar' ? 'ع' : 'FR'}
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label={t('language.label')} className={cn('inline-flex rounded-full bg-sunken p-1', className)}>
      {options.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          lang={l}
          onClick={() => setLocale(l)}
          className={cn(
            'min-h-9 rounded-full px-4 text-sm font-semibold transition-colors',
            locale === l ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {t(`language.${l}`)}
        </button>
      ))}
    </div>
  )
}
