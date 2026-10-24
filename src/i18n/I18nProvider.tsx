import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Locale } from '@/types'
import { createFormatters } from './format'
import { I18nContext, type I18nValue } from './context'
import { DEFAULT_LOCALE, DIRECTION, LOCALES, translate, translatePlural } from './translate'

const STORAGE_KEY = 'immo-agency.locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale
  } catch {
    // storage unavailable
  }
  return DEFAULT_LOCALE
}

/**
 * Changing the locale only re-renders: routes and component state (including
 * unsent form data) are preserved.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    const root = document.documentElement
    root.lang = locale
    root.dir = DIRECTION[locale]
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // ignore
    }
  }, [locale])

  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dir: DIRECTION[locale],
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      tp: (key, count, vars) => translatePlural(locale, key, count, vars),
      f: createFormatters(locale),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
