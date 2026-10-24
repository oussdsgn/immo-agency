import { useI18n } from '@/i18n'
import type { Listing } from '@/types'

export function usePriceLabel() {
  const { t, f } = useI18n()
  return (l: Listing) => {
    if (l.price === undefined) return t('acquire.priceOnRequest')
    const price = f.currency(l.price)
    return l.transaction === 'rent' ? t('acquire.perMonth', { price }) : t('acquire.from', { price })
  }
}
