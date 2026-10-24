import type { I18nValue } from '@/i18n/context'
import type { Property } from '@/types'

/** "Bâtiment A · Étage 2 · Appt 12" — only the parts that exist. */
export function unitLine(t: I18nValue['t'], p: Pick<Property, 'building' | 'floor' | 'unit'>): string {
  const parts: string[] = []
  if (p.building) parts.push(t('properties.building', { value: p.building }))
  if (p.floor !== undefined) parts.push(p.floor === 0 ? t('properties.groundFloor') : t('properties.floor', { value: p.floor }))
  if (p.unit) parts.push(t('properties.unit', { value: p.unit }))
  return parts.join(' · ')
}
