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
  ResolutionFeedbackInput,
  Session,
} from '@/types'

export interface SignUpInput {
  fullName: string
  email: string
  password: string
  phone?: string
  /** Unit access code given by the agency. */
  unitCode?: string
  occupancy: 'owner' | 'tenant'
}

export interface AuthService {
  /** `demo` = local prototype account; `account` = real sign-in. */
  readonly mode: 'demo' | 'account'
  getSession(): Promise<Session | null>
  /** Prototype-only: starts the clearly labelled demo session. */
  signInDemo(): Promise<Session>
  signIn(email: string, password: string): Promise<Session>
  /** Returns null when the account must first be confirmed by e-mail. */
  signUp(input: SignUpInput): Promise<Session | null>
  sendPasswordReset(email: string): Promise<void>
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
  /** Links the account to a unit with the access code given by the agency. */
  claimUnit(code: string, occupancy: 'owner' | 'tenant'): Promise<void>
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
  /**
   * Resident confirms a resolved report is fixed (with a rating) or says the
   * problem persists. In production the agency backend decides what happens to
   * the status; the mock reopens the report as "in progress".
   */
  submitFeedback(reportId: string, feedback: ResolutionFeedbackInput): Promise<Report>
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
