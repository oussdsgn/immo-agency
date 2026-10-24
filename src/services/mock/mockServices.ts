/**
 * LOCAL MOCK IMPLEMENTATION — nothing here reaches a real agency.
 *
 * Simulates an API with latency, persistence (via a KeyValueStore) and
 * optional failures so loading / error / retry states can be exercised.
 */
import { REPORT_CATEGORIES } from '@/data/categories'
import { createSeed, type Dataset, type SeedData } from '@/data/seed'
import { hasErrors, validateFeedback } from '@/domain/reportValidation'
import { AGENCY_TRANSITIONS, canResidentReply, needsFeedback } from '@/domain/reportWorkflow'
import { uid } from '@/lib/id'
import type {
  AppNotification,
  Attachment,
  NotificationType,
  Report,
  ReportStatus,
  Session,
} from '@/types'
import type { FailureMode, Services } from '../contracts'
import { ServiceError } from '../errors'
import { emitChange, type DataTopic } from '../events'
import type { KeyValueStore } from './storage'

// Bump the version when the seed shape changes so devices reseed.
const DB_KEY = 'immo-agency.dev.db.v2'
const SESSION_KEY = 'immo-agency.dev.session.v1'
const FAILURE_KEY = 'immo-agency.dev.failure.v1'

interface Db extends SeedData {
  version: 2
  dataset: Dataset
  nextReferenceNumber: number
  interestRequests: { id: string; listingId: string; at: string }[]
}

export interface MockOptions {
  store: KeyValueStore
  /** [min, max] artificial latency in ms. */
  latency?: [number, number]
  now?: () => number
}

const clone = <T>(v: T): T => structuredClone(v)

export function createMockServices({ store, latency = [250, 650], now = Date.now }: MockOptions): Services {
  let db = load()
  let failureMode: FailureMode = (store.get(FAILURE_KEY) as FailureMode | null) ?? 'off'

  function fresh(dataset: Dataset): Db {
    return { version: 2, dataset, nextReferenceNumber: 148, interestRequests: [], ...createSeed(dataset, now()) }
  }

  function load(): Db {
    const raw = store.get(DB_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Db
        if (parsed.version === 2) return parsed
      } catch {
        // Corrupted dev data: start over.
      }
    }
    return fresh('demo')
  }

  function persist(topic: DataTopic) {
    try {
      store.set(DB_KEY, JSON.stringify(db))
    } catch {
      // Roll back to the last persisted state so memory and storage agree.
      db = load()
      throw new ServiceError('storage_full')
    }
    emitChange(topic)
  }

  async function delay() {
    const [min, max] = latency
    if (max <= 0) return
    await new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
  }

  /** Wraps every call: latency, simulated failures, session check. */
  async function call<T>(kind: 'read' | 'write', fn: () => T, opts: { auth?: boolean; local?: boolean } = {}): Promise<T> {
    await delay()
    if (!opts.local && failureMode === 'all' || (kind === 'write' && failureMode === 'next-write')) {
      if (failureMode === 'next-write') setFailure('off')
      throw new ServiceError('network')
    }
    if (opts.auth !== false && !readSession()) throw new ServiceError('unauthorized')
    return clone(fn())
  }

  function setFailure(mode: FailureMode) {
    failureMode = mode
    store.set(FAILURE_KEY, mode)
  }

  function readSession(): Session | null {
    const raw = store.get(SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as Session
    } catch {
      return null
    }
  }

  function findReport(id: string): Report {
    const r = db.reports.find((x) => x.id === id)
    if (!r) throw new ServiceError('not_found')
    return r
  }

  function notify(type: NotificationType, report: Report, simulated = false) {
    const n: AppNotification = {
      id: uid('ntf'),
      type,
      at: new Date(now()).toISOString(),
      read: false,
      reportId: report.id,
      propertyId: report.propertyId,
      status: report.status,
      simulated,
    }
    db.notifications.unshift(n)
  }

  function toAttachments(
    items: Pick<Attachment, 'id' | 'url' | 'name' | 'sizeBytes'>[],
    by: Attachment['addedBy'],
  ): Attachment[] {
    const at = new Date(now()).toISOString()
    return items.map((a) => ({ ...a, addedAt: at, addedBy: by }))
  }

  const sortByDateDesc = <T extends { at?: string; updatedAt?: string }>(a: T, b: T) =>
    (b.updatedAt ?? b.at ?? '').localeCompare(a.updatedAt ?? a.at ?? '')

  const services: Services = {
    auth: {
      mode: 'demo',
      // Real accounts only exist with the Supabase data source.
      signIn: () => Promise.reject(new ServiceError('validation')),
      signUp: () => Promise.reject(new ServiceError('validation')),
      sendPasswordReset: () => Promise.reject(new ServiceError('validation')),
      // Reading the stored session is local: a network outage must not sign the resident out.
      getSession: () => call('read', readSession, { auth: false, local: true }),
      signInDemo: () =>
        call(
          'read',
          () => {
            const session: Session = { residentId: db.resident.id, kind: 'demo', startedAt: new Date(now()).toISOString() }
            store.set(SESSION_KEY, JSON.stringify(session))
            emitChange('session')
            return session
          },
          { auth: false },
        ),
      signOut: () =>
        call(
          'read',
          () => {
            store.remove(SESSION_KEY)
            emitChange('session')
          },
          { auth: false },
        ),
    },

    resident: {
      getCurrentResident: () => call('read', () => db.resident),
      getPreferences: () => call('read', () => db.preferences),
      updatePreferences: (patch) =>
        call('write', () => {
          db.preferences = { ...db.preferences, ...patch }
          persist('preferences')
          return db.preferences
        }),
    },

    properties: {
      // Demo units are fixed; codes only exist with the Supabase data source.
      claimUnit: () =>
        call('write', () => {
          throw new ServiceError('not_found')
        }),
      listMyProperties: () =>
        call('read', () => db.properties.filter((p) => db.resident.propertyIds.includes(p.id))),
      getProperty: (id) =>
        call('read', () => {
          // A real backend must enforce this ownership check server-side.
          const p = db.properties.find((x) => x.id === id && db.resident.propertyIds.includes(x.id))
          if (!p) throw new ServiceError('not_found')
          return p
        }),
    },

    reports: {
      listCategories: () => call('read', () => REPORT_CATEGORIES),
      listReports: (filter) =>
        call('read', () =>
          db.reports
            .filter((r) => !filter?.propertyId || r.propertyId === filter.propertyId)
            .sort(sortByDateDesc),
        ),
      getReport: (id) => call('read', () => findReport(id)),
      createReport: (input) =>
        call('write', () => {
          if (!db.resident.propertyIds.includes(input.propertyId)) throw new ServiceError('validation')
          const existing = input.clientId && db.reports.find((r) => r.id === input.clientId)
          if (existing) return existing
          const at = new Date(now()).toISOString()
          const year = new Date(now()).getFullYear()
          let reference: string
          do {
            reference = `DEV-${year}-${String(db.nextReferenceNumber++).padStart(4, '0')}`
          } while (db.reports.some((r) => r.reference === reference))
          const report: Report = {
            id: input.clientId ?? uid('rep'),
            reference,
            propertyId: input.propertyId,
            categoryId: input.categoryId,
            title: input.title.trim(),
            description: input.description.trim(),
            location: input.location,
            urgency: input.urgency,
            status: 'submitted',
            createdAt: at,
            updatedAt: at,
            attachments: toAttachments(input.attachments, 'resident'),
            history: [{ id: uid('evt'), status: 'submitted', at, source: 'resident' }],
            messages: [],
            createdLocally: true,
          }
          db.reports.unshift(report)
          notify('report_submitted', report)
          persist('reports')
          return report
        }),
      addResidentMessage: (reportId, body, attachments) =>
        call('write', () => {
          const report = findReport(reportId)
          if (!canResidentReply(report)) throw new ServiceError('validation')
          const at = new Date(now()).toISOString()
          const files = toAttachments(attachments, 'resident')
          report.messages.push({
            id: uid('msg'),
            author: 'resident',
            authorName: `${db.resident.firstName} ${db.resident.lastName}`,
            body: body.trim(),
            at,
            attachments: files,
          })
          report.attachments.push(...files)
          report.updatedAt = at
          persist('reports')
          return report
        }),
      submitFeedback: (reportId, input) =>
        call('write', () => {
          const report = findReport(reportId)
          if (!needsFeedback(report) || hasErrors(validateFeedback(input))) throw new ServiceError('validation')
          const at = new Date(now()).toISOString()
          const comment = input.comment?.trim() || undefined
          if (input.fixed) {
            report.feedback = { fixed: true, rating: input.rating, comment, at }
          } else {
            // Simulates the agency reopening the report after the resident's answer.
            report.status = 'in_progress'
            report.history.push({ id: uid('evt'), status: 'in_progress', at, source: 'resident', note: 'timeline.notes.reopenedByResident' })
            report.messages.push({
              id: uid('msg'),
              author: 'resident',
              authorName: `${db.resident.firstName} ${db.resident.lastName}`,
              body: comment ?? '',
              at,
              attachments: [],
            })
          }
          report.updatedAt = at
          persist('reports')
          return report
        }),
    },

    notifications: {
      listNotifications: () => call('read', () => [...db.notifications].sort(sortByDateDesc)),
      markRead: (id) =>
        call('write', () => {
          const n = db.notifications.find((x) => x.id === id)
          if (n && !n.read) {
            n.read = true
            persist('notifications')
          }
        }),
      markAllRead: () =>
        call('write', () => {
          db.notifications.forEach((n) => (n.read = true))
          persist('notifications')
        }),
    },

    announcements: {
      listAnnouncements: () =>
        call('read', () =>
          db.announcements
            .filter((a) => a.propertyIds.some((id) => db.resident.propertyIds.includes(id)))
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        ),
    },

    listings: {
      listListings: (filter) =>
        call(
          'read',
          () =>
            db.listings.filter(
              (l) =>
                (!filter?.kind || l.kind === filter.kind) &&
                (!filter?.transaction || l.transaction === filter.transaction),
            ),
          { auth: false },
        ),
      getListing: (id) =>
        call(
          'read',
          () => {
            const l = db.listings.find((x) => x.id === id)
            if (!l) throw new ServiceError('not_found')
            return l
          },
          { auth: false },
        ),
      submitInterest: (input) =>
        call('write', () => {
          const id = uid('int')
          // Contact details are deliberately NOT persisted in the mock.
          db.interestRequests.push({ id, listingId: input.listingId, at: new Date(now()).toISOString() })
          persist('all')
          return { id }
        }),
    },

    dev: {
      isMock: true,
      getDataset: () => db.dataset,
      getFailureMode: () => failureMode,
      setFailureMode: (mode) => {
        setFailure(mode)
        emitChange('all')
      },
      resetData: async (dataset) => {
        db = fresh(dataset)
        persist('all')
        // Keep the session pointing at the dataset's resident.
        if (readSession()) {
          store.set(SESSION_KEY, JSON.stringify({ residentId: db.resident.id, kind: 'demo', startedAt: new Date(now()).toISOString() }))
        }
      },
      simulateAgencyStatus: async (reportId, status: ReportStatus, withInfoRequest = false) => {
        const report = findReport(reportId)
        if (!AGENCY_TRANSITIONS[report.status].includes(status)) throw new ServiceError('validation')
        const at = new Date(now()).toISOString()
        report.status = status
        report.updatedAt = at
        // A new resolution needs a new confirmation from the resident.
        if (status !== 'closed') delete report.feedback
        report.history.push({ id: uid('evt'), status, at, source: 'agency', simulated: true })
        if (status === 'awaiting_resident' && withInfoRequest) {
          report.messages.push({
            id: uid('msg'),
            author: 'agency',
            authorName: 'Agence (simulation)',
            body: 'Pourriez-vous préciser l’emplacement exact et joindre une photo supplémentaire ?',
            at,
            attachments: [],
            isInfoRequest: true,
            simulated: true,
          })
        }
        const type: NotificationType =
          status === 'awaiting_resident'
            ? 'info_requested'
            : status === 'resolved' || status === 'closed'
              ? 'report_resolved'
              : 'report_status_changed'
        notify(type, report, true)
        persist('reports')
        emitChange('notifications')
        return clone(report)
      },
      simulateAgencyMessage: async (reportId, body) => {
        const report = findReport(reportId)
        const at = new Date(now()).toISOString()
        report.messages.push({
          id: uid('msg'),
          author: 'agency',
          authorName: 'Agence (simulation)',
          body,
          at,
          attachments: [],
          simulated: true,
        })
        report.updatedAt = at
        persist('reports')
        return clone(report)
      },
    },
  }

  return services
}
