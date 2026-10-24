import type { Locale } from '@/types'
import ar from './ar'
import fr, { type Dictionary } from './fr'

export const DICTIONARIES: Record<Locale, Dictionary> = { fr, ar }
export const LOCALES: Locale[] = ['fr', 'ar']
export const DEFAULT_LOCALE: Locale = 'fr'

/** BCP-47 tags used for Intl formatting (Algerian conventions, Latin digits). */
export const INTL_LOCALE: Record<Locale, string> = { fr: 'fr-DZ', ar: 'ar-DZ' }

/** Currency used for listing prices. */
export const CURRENCY = 'DZD'

export const DIRECTION: Record<Locale, 'ltr' | 'rtl'> = { fr: 'ltr', ar: 'rtl' }

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

export type TKey = Leaves<Omit<Dictionary, 'plurals'>>
export type PluralKey = keyof Dictionary['plurals']
export type Vars = Record<string, string | number>

function lookup(dict: Dictionary, path: string): string | undefined {
  let node: unknown = dict
  for (const part of path.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export function translate(locale: Locale, key: TKey | string, vars?: Vars): string {
  const value = lookup(DICTIONARIES[locale], key) ?? lookup(DICTIONARIES[DEFAULT_LOCALE], key)
  if (value === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] missing key "${key}"`)
    return key
  }
  return interpolate(value, isolate(locale, vars))
}

/**
 * In RTL text, wraps interpolated strings in Unicode isolates (FSI…PDI) so
 * Latin values such as references or French titles keep their own direction.
 */
function isolate(locale: Locale, vars?: Vars): Vars | undefined {
  if (!vars || DIRECTION[locale] !== 'rtl') return vars
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'string' ? `\u2068${v}\u2069` : v]))
}

export function translatePlural(locale: Locale, key: PluralKey, count: number, vars?: Vars): string {
  const forms = DICTIONARIES[locale].plurals[key]
  const rule = new Intl.PluralRules(INTL_LOCALE[locale]).select(count)
  // An explicit `zero` form is used for 0 even in languages without that category.
  const template = (count === 0 && forms.zero) || forms[rule] || forms.other
  return interpolate(template, { count: new Intl.NumberFormat(INTL_LOCALE[locale]).format(count), ...vars })
}
