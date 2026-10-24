/**
 * Service contracts used by the UI.
 *
 * The prototype ships a local mock implementation (`./mock`). A production
 * implementation should talk to the agency's property-management API with a
 * server-issued session (e.g. httpOnly cookie or short-lived token), and the
 * backend must enforce that a resident only ever reads their own data.
 */
import type {
  Announcement,
  AppNotification,
  Attachment,
  InterestRequestInput,
  Listing,
  ListingKind,
  ListingTransaction,
  NewReportInput,
  NotificationPreferences,
  Property,
  Report,
  ReportCategory,
  ReportStatus,
  Resident,
  Session,
} from '@/types'

export interface AuthService {
  getSession(): Promise<Session | null>
  /** Prototype-only: starts the clearly labelled demo session. */
  signInDemo(): Promise<Session>
  signOut(): Promise<void>
}

export interface ResidentService {
  getCurrentResident(): Promise<Resident>
  getPreferences(): Promise<NotificationPreferences>
  updatePreferences(patch: Partial<NotificationPreferences>): Promise<NotificationPreferences>
}

export interface PropertyService {
  listMyProperties(): Promise<Property[]>
  getProperty(id: string): Promise<Property>
}

export interface ReportService {
  listCategories(): Promise<ReportCategory[]>
  listReports(filter?: { propertyId?: string }): Promise<Report[]>
  getReport(id: string): Promise<Report>
  createReport(input: NewReportInput): Promise<Report>
  /** Resident reply to the agency (answer to an info request, extra photos…). */
  addResidentMessage(
    reportId: string,
    body: string,
    attachments: Pick<Attachment, 'id' | 'url' | 'name' | 'sizeBytes'>[],
  ): Promise<Report>
}

export interface NotificationService {
  listNotifications(): Promise<AppNotification[]>
  markRead(id: string): Promise<void>
  markAllRead(): Promise<void>
}

export interface AnnouncementService {
  listAnnouncements(): Promise<Announcement[]>
}

export interface ListingFilter {
  kind?: ListingKind
  transaction?: ListingTransaction
}

export interface ListingService {
  listListings(filter?: ListingFilter): Promise<Listing[]>
  getListing(id: string): Promise<Listing>
  /** Records an information request about a listing. */
  submitInterest(input: InterestRequestInput): Promise<{ id: string }>
}

/** Development-only controls. Has no production counterpart. */
export interface DevToolsService {
  readonly isMock: true
  simulateAgencyStatus(reportId: string, status: ReportStatus, withInfoRequest?: boolean): Promise<Report>
  simulateAgencyMessage(reportId: string, body: string): Promise<Report>
  getFailureMode(): FailureMode
  setFailureMode(mode: FailureMode): void
  resetData(dataset: 'demo' | 'empty'): Promise<void>
  getDataset(): 'demo' | 'empty'
}

/** `next-write` fails the next mutation once; `all` fails every request. */
export type FailureMode = 'off' | 'next-write' | 'all'

export interface Services {
  auth: AuthService
  resident: ResidentService
  properties: PropertyService
  reports: ReportService
  notifications: NotificationService
  announcements: AnnouncementService
  listings: ListingService
  dev?: DevToolsService
}
