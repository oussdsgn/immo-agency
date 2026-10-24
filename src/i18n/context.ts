import { createContext, useContext } from 'react'
import type { Locale } from '@/types'
import type { Formatters } from './format'
import type { PluralKey, TKey, Vars } from './translate'

export interface I18nValue {
  locale: Locale
  dir: 'ltr' | 'rtl'
  setLocale: (locale: Locale) => void
  t: (key: TKey, vars?: Vars) => string
  tp: (key: PluralKey, count: number, vars?: Vars) => string
  f: Formatters
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
