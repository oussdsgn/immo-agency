import type { LocationInProperty, ReportCategory } from '@/types'

/**
 * Issue categories offered to residents. Labels live in the i18n dictionaries
 * (`categories.<id>`). `agencyCode` is a placeholder to be aligned with the
 * agency's real taxonomy; reorder or remove entries here without touching UI.
 */
export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: 'plumbing', icon: 'wrench', agencyCode: 'PLB' },
  { id: 'water_leak', icon: 'droplets', agencyCode: 'LEAK' },
  { id: 'electricity', icon: 'zap', agencyCode: 'ELEC' },
  { id: 'hvac', icon: 'thermometer', agencyCode: 'HVAC' },
  { id: 'doors_windows', icon: 'door', agencyCode: 'DOOR' },
  { id: 'common_areas', icon: 'building', agencyCode: 'COMMON' },
  { id: 'structural', icon: 'brick', agencyCode: 'STRUCT' },
  { id: 'cleaning', icon: 'sparkles', agencyCode: 'CLEAN' },
  { id: 'other', icon: 'more', agencyCode: 'OTHER' },
]

export const LOCATIONS: LocationInProperty[] = [
  'kitchen',
  'bathroom',
  'bedroom',
  'living_room',
  'balcony',
  'entrance',
  'common_area',
  'parking',
  'other',
]
