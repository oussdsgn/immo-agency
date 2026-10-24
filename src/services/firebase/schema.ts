/**
 * Firestore document shapes. Kept in one place so the resident app, the
 * dashboard and the rules tests agree with firebase/firestore.rules.
 */
import type { FieldValue, Timestamp } from 'firebase/firestore'
import type { NotificationPreferences, ReportStatus } from '@/types'

export type When = Timestamp | FieldValue | null
export type StaffRole = 'pending' | 'agent' | 'admin'

export interface StaffDoc {
  role: StaffRole
  fullName: string
  email: string
  createdAt: When
}

export interface ResidentDoc {
  fullName: string
  email: string
  phone: string | null
  prefs: NotificationPreferences
  createdAt: When
}

export interface ResidenceDoc {
  name: string
  address: string
  city: string
  managerName: string | null
  phone: string | null
  email: string | null
  emergencyPhone: string | null
  guardPhone: string | null
  amenities: string[]
  palette: string
  style: string
  floors: number
  createdAt: When
}

export interface BuildingDoc {
  residenceId: string
  name: string
}

export interface UnitDoc {
  residenceId: string
  buildingId: string
  buildingName: string
  floor: number | null
  number: string
  areaSqm: number | null
  rooms: number | null
  code: string
  createdAt: When
}

export interface UnitCodeDoc {
  unitId: string
  residenceId: string
}

export interface MembershipDoc {
  uid: string
  unitId: string
  residenceId: string
  code: string
  occupancy: 'owner' | 'tenant'
  fullName: string
  email: string
  phone: string | null
  createdAt: When
}

export interface ResidenceMemberDoc {
  uid: string
  residenceId: string
  unitId: string
}

export interface TechnicianDoc {
  name: string
  trade: string
  phone: string | null
  company: string | null
  active: boolean
  createdAt: When
}

export interface UnitLabel {
  residenceName: string
  buildingName: string | null
  number: string
  floor: number | null
}

export type ResidentActivityKind = 'reply' | 'feedback' | 'reopen'

export interface ReportDoc {
  number: number
  unitId: string
  residenceId: string
  unitLabel: UnitLabel
  residentId: string
  residentName: string
  residentPhone: string | null
  residentEmail: string | null
  category: string
  title: string
  description: string
  location: string
  urgency: 'low' | 'normal' | 'urgent'
  status: ReportStatus
  assigneeId: string | null
  assigneeName: string | null
  scheduledAt: When
  feedback: { rating: number; comment: string | null; at: When } | null
  lastEventId: string
  /** Last thing a resident did — the dashboard raises alerts from it. */
  residentActivity: { kind: ResidentActivityKind; at: When } | null
  createdAt: When
  updatedAt: When
}

export interface EventDoc {
  status: ReportStatus
  note: string | null
  source: 'resident' | 'agency'
  actorId: string
  technicianName: string | null
  scheduledAt: When
  at: When
}

export interface MessageDoc {
  authorKind: 'resident' | 'agency'
  authorId: string
  authorName: string
  body: string
  isInfoRequest: boolean
  at: When
}

export interface PhotoDoc {
  data: string
  name: string
  sizeBytes: number
  messageId: string | null
  addedKind: 'resident' | 'agency'
  addedBy: string
  at: When
}

export type NotificationKind =
  | 'report_submitted'
  | 'report_status_changed'
  | 'info_requested'
  | 'report_resolved'
  | 'agency_message'
  | 'intervention_scheduled'
  | 'announcement'

export interface NotificationDoc {
  uid: string
  type: NotificationKind
  reportId: string | null
  unitId: string | null
  status: ReportStatus | null
  announcementId: string | null
  read: boolean
  at: When
}

export interface AnnouncementDoc {
  residenceId: string
  residenceName: string
  titleFr: string
  titleAr: string
  bodyFr: string
  bodyAr: string
  important: boolean
  publishedAt: When
}

export interface ListingDoc {
  titleFr: string
  titleAr: string
  descriptionFr: string
  descriptionAr: string
  kind: 'apartment' | 'house'
  transaction: 'sale' | 'rent'
  city: string
  district: string | null
  areaSqm: number | null
  rooms: number | null
  bedrooms: number | null
  price: number | null
  features: string[]
  palette: string
  style: string
  floors: number
  published: boolean
  createdAt: When
}

export interface InterestRequestDoc {
  listingId: string
  uid: string
  name: string
  phone: string
  email: string | null
  message: string | null
  preferredContact: 'phone' | 'email'
  handled: boolean
  at: When
}

/** "SR-2026-0007" from the counter number and the creation year. */
export function reportReference(number: number, createdAt: Date): string {
  return `SR-${createdAt.getFullYear()}-${String(number).padStart(4, '0')}`
}

/** Firestore timestamp (or pending server timestamp) → ISO string. */
export function iso(v: unknown, fallback = new Date()): string {
  const t = v as { toDate?: () => Date } | null
  return (t && typeof t.toDate === 'function' ? t.toDate() : fallback).toISOString()
}
