import type { ReportCategoryId } from '@/types'

/**
 * National emergency numbers (Algeria). These are public numbers, not demo
 * data — re-verify them with the agency before production and keep this list
 * configurable per country.
 */
export interface EmergencyNumber {
  id: 'civil_protection' | 'police' | 'gendarmerie' | 'gas_electricity'
  number: string
  icon: 'flame' | 'shield' | 'badge' | 'zap'
}

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { id: 'civil_protection', number: '14', icon: 'flame' },
  { id: 'police', number: '17', icon: 'shield' },
  { id: 'gendarmerie', number: '1055', icon: 'badge' },
  { id: 'gas_electricity', number: '3303', icon: 'zap' },
]

/** First-response advice; each links to a pre-filled report for the agency. */
export interface SafetyTip {
  id: 'water_leak' | 'gas_smell' | 'power_cut' | 'elevator'
  category: ReportCategoryId
}

export const SAFETY_TIPS: SafetyTip[] = [
  { id: 'gas_smell', category: 'other' },
  { id: 'water_leak', category: 'water_leak' },
  { id: 'power_cut', category: 'electricity' },
  { id: 'elevator', category: 'common_areas' },
]
