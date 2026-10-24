import type { Locale } from '@/types'
import { CURRENCY, INTL_LOCALE } from './translate'

export function createFormatters(locale: Locale) {
  const tag = INTL_LOCALE[locale]
  const date = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' })
  const shortDate = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' })
  const dateTime = new Intl.DateTimeFormat(tag, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const number = new Intl.NumberFormat(tag)
  const currency = new Intl.NumberFormat(tag, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 })
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })

  return {
    date: (iso: string) => date.format(new Date(iso)),
    shortDate: (iso: string) => shortDate.format(new Date(iso)),
    dateTime: (iso: string) => dateTime.format(new Date(iso)),
    number: (n: number) => number.format(n),
    currency: (n: number) => currency.format(n),
    relative: (iso: string, now = Date.now()) => {
      const diffSec = Math.round((new Date(iso).getTime() - now) / 1000)
      const abs = Math.abs(diffSec)
      if (abs < 60) return relative.format(0, 'second')
      if (abs < 3600) return relative.format(Math.round(diffSec / 60), 'minute')
      if (abs < 86_400) return relative.format(Math.round(diffSec / 3600), 'hour')
      if (abs < 86_400 * 30) return relative.format(Math.round(diffSec / 86_400), 'day')
      return date.format(new Date(iso))
    },
  }
}

export type Formatters = ReturnType<typeof createFormatters>
