/**
 * Shared domain models for the resident application.
 *
 * These shapes are the contract between the UI and the service layer. When the
 * agency API becomes available, map its payloads onto these types inside the
 * HTTP service implementation rather than leaking API shapes into the UI.
 */

export type Locale = 'fr' | 'ar'

/** ISO-8601 date-time string. */
export type ISODate = string

export interface Resident {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  /** Ids of the properties the resident is attached to (owner or tenant). */
  propertyIds: string[]
  memberSince: ISODate
}

export type OccupancyRole = 'owner' | 'tenant'

/** Visual seed for the generated building illustration (no real photos). */
export interface BuildingVisual {
  palette: 'sand' | 'terracotta' | 'stone' | 'olive' | 'sky'
  floors: number
  style: 'tower' | 'block' | 'villa' | 'terrace'
}

export interface Property {
  id: string
  residenceName: string
  building?: string
  floor?: number
  unit?: string
  address: string
  city: string
  areaSqm?: number
  rooms?: number
  role: OccupancyRole
  visual: BuildingVisual
  residenceContact?: {
    phone?: string
    email?: string
    manager?: string
    /** Agency on-call line outside office hours. */
    emergencyPhone?: string
    /** Residence guard / concierge desk. */
    guardPhone?: string
  }
  amenities?: AmenityKey[]
}

export type AmenityKey = 'elevator' | 'parking' | 'concierge' | 'garden' | 'pool' | 'security'

export type ReportCategoryId =
  | 'plumbing'
  | 'electricity'
  | 'hvac'
  | 'water_leak'
  | 'doors_windows'
  | 'common_areas'
  | 'structural'
  | 'cleaning'
  | 'other'

export interface ReportCategory {
  id: ReportCategoryId
  /** Lucide icon name, resolved by the UI. */
  icon: string
  /** Agency-side code, kept for future mapping with the real workflow. */
  agencyCode: string
}

export type LocationInProperty =
  | 'kitchen'
  | 'bathroom'
  | 'bedroom'
  | 'living_room'
  | 'balcony'
  | 'entrance'
  | 'common_area'
  | 'parking'
  | 'other'

export type Urgency = 'low' | 'normal' | 'urgent'

export type ReportStatus =
  | 'submitted'
  | 'under_review'
  | 'in_progress'
  | 'awaiting_resident'
  | 'resolved'
  | 'closed'
  | 'rejected'

export interface Attachment {
  id: string
  /** Data URL in development. In production this would be a signed URL. */
  url: string
  name: string
  sizeBytes: number
  addedAt: ISODate
  addedBy: 'resident' | 'agency'
}

/** Who produced a timeline event. `simulated` marks development-only agency events. */
export type EventSource = 'resident' | 'agency' | 'system'

export interface StatusEvent {
  id: string
  status: ReportStatus
  at: ISODate
  /** Optional i18n key or free text from the agency. */
  note?: string
  source: EventSource
  simulated?: boolean
  /** Set when the agency dispatched a technician. */
  technicianName?: string
  scheduledAt?: ISODate
}

export interface ReportMessage {
  id: string
  author: 'resident' | 'agency'
  authorName: string
  body: string
  at: ISODate
  attachments: Attachment[]
  /** True when the agency asks the resident for information. */
  isInfoRequest?: boolean
  simulated?: boolean
}

export interface Report {
  id: string
  reference: string
  propertyId: string
  categoryId: ReportCategoryId
  title: string
  description: string
  location: LocationInProperty
  urgency: Urgency
  status: ReportStatus
  createdAt: ISODate
  updatedAt: ISODate
  attachments: Attachment[]
  history: StatusEvent[]
  messages: ReportMessage[]
  /** True for reports created on this device through the prototype. */
  createdLocally?: boolean
  /** Resident's answer once the agency marks the report as resolved. */
  feedback?: ResolutionFeedback
}

export type Rating = 1 | 2 | 3 | 4 | 5

export interface ResolutionFeedback {
  fixed: boolean
  /** Only when fixed. */
  rating?: Rating
  comment?: string
  at: ISODate
}

export type ResolutionFeedbackInput = Omit<ResolutionFeedback, 'at'>

export interface NewReportInput {
  /** Client-generated id, reused on retry so a report is never created twice. */
  clientId?: string
  propertyId: string
  categoryId: ReportCategoryId
  title: string
  description: string
  location: LocationInProperty
  urgency: Urgency
  attachments: Pick<Attachment, 'id' | 'url' | 'name' | 'sizeBytes'>[]
}

export type NotificationType =
  | 'report_submitted'
  | 'report_status_changed'
  | 'info_requested'
  | 'report_resolved'
  | 'agency_message'
  | 'intervention_scheduled'
  | 'announcement'

export interface AppNotification {
  id: string
  type: NotificationType
  at: ISODate
  read: boolean
  reportId?: string
  propertyId?: string
  /** Status that triggered the notification, used for the localized message. */
  status?: ReportStatus
  /** Announcement id when type === 'announcement'. */
  announcementId?: string
  simulated?: boolean
}

export interface Announcement {
  id: string
  propertyIds: string[]
  /** Announcements are authored by the agency in both languages. */
  title: Record<Locale, string>
  body: Record<Locale, string>
  publishedAt: ISODate
  important?: boolean
}

export type ListingKind = 'apartment' | 'house'
export type ListingTransaction = 'sale' | 'rent'

export interface Listing {
  id: string
  title: Record<Locale, string>
  description: Record<Locale, string>
  kind: ListingKind
  transaction: ListingTransaction
  city: string
  district?: string
  areaSqm?: number
  rooms?: number
  bedrooms?: number
  /** Indicative amount in DZD. Absent means "price on request". */
  price?: number
  visual: BuildingVisual
  features: AmenityKey[]
}

export interface InterestRequestInput {
  listingId: string
  name: string
  phone: string
  email?: string
  message?: string
  preferredContact: 'phone' | 'email'
}

export interface NotificationPreferences {
  reportUpdates: boolean
  infoRequests: boolean
  announcements: boolean
  listings: boolean
}

export interface Session {
  residentId: string
  /** `demo`: prototype session, no authentication. `account`: signed-in user. */
  kind: 'demo' | 'account'
  startedAt: ISODate
}
