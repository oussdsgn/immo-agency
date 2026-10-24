/**
 * Firebase implementation of the resident services (Auth + Firestore).
 *
 * Authorization is enforced by firebase/firestore.rules; this client only maps
 * documents to the app's models. Writes go through ./ops so they always have
 * the shape the rules accept.
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { REPORT_CATEGORIES } from '@/data/categories'
import { uid as newUid } from '@/lib/id'
import type {
  Announcement,
  AppNotification,
  Attachment,
  Listing,
  NotificationPreferences,
  Property,
  Rating,
  Report,
  ReportMessage,
  Resident,
  Session,
  StatusEvent,
} from '@/types'
import type { Services } from '../contracts'
import { ServiceError, type ServiceErrorCode } from '../errors'
import { emitChange } from '../events'
import { firebase } from './client'
import * as ops from './ops'
import {
  iso,
  reportReference,
  type AnnouncementDoc,
  type EventDoc,
  type ListingDoc,
  type MembershipDoc,
  type MessageDoc,
  type NotificationDoc,
  type PhotoDoc,
  type ReportDoc,
  type ResidenceDoc,
  type ResidentDoc,
  type UnitDoc,
} from './schema'

const DEFAULT_PREFS: NotificationPreferences = { reportUpdates: true, infoRequests: true, announcements: true, listings: false }

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
function toServiceError(err: unknown): ServiceError {
  if (err instanceof ServiceError) return err
  if (err instanceof ops.OpError) {
    return new ServiceError(err.code === 'not_found' || err.code === 'invalid_code' ? 'not_found' : 'validation', err.code)
  }
  const code = (err as { code?: string })?.code ?? ''
  const msg = (err as { message?: string })?.message ?? ''
  const map: Record<string, ServiceErrorCode> = {
    unavailable: 'network',
    'deadline-exceeded': 'network',
    'auth/network-request-failed': 'network',
    unauthenticated: 'unauthorized',
    'permission-denied': 'validation',
    'not-found': 'not_found',
    'invalid-argument': 'validation',
    'failed-precondition': 'validation',
    'resource-exhausted': 'network',
  }
  return new ServiceError(map[code] ?? (/offline|network/i.test(msg) ? 'network' : 'unknown'), msg)
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    throw toServiceError(err)
  }
}

const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v)

// ---------------------------------------------------------------------------
// Document → model mapping
// ---------------------------------------------------------------------------
type MyProperty = Property & { residenceId: string; unitDoc: UnitDoc; residence: ResidenceDoc }

function toProperty(id: string, m: MembershipDoc, u: UnitDoc, r: ResidenceDoc): MyProperty {
  return {
    id,
    residenceId: m.residenceId,
    unitDoc: u,
    residence: r,
    residenceName: r.name,
    building: u.buildingName || undefined,
    floor: opt(u.floor),
    unit: u.number,
    address: r.address,
    city: r.city,
    areaSqm: opt(u.areaSqm),
    rooms: opt(u.rooms),
    role: m.occupancy,
    visual: { palette: r.palette as Property['visual']['palette'], style: r.style as Property['visual']['style'], floors: r.floors },
    residenceContact: {
      phone: opt(r.phone),
      email: opt(r.email),
      manager: opt(r.managerName),
      emergencyPhone: opt(r.emergencyPhone),
      guardPhone: opt(r.guardPhone),
    },
    amenities: r.amenities as Property['amenities'],
  }
}

interface Children {
  events: (EventDoc & { id: string })[]
  messages: (MessageDoc & { id: string })[]
  photos: (PhotoDoc & { id: string })[]
}

function toReport(id: string, r: ReportDoc, c: Children = { events: [], messages: [], photos: [] }): Report {
  const createdAt = iso(r.createdAt)
  const photo = (p: PhotoDoc & { id: string }): Attachment => ({
    id: p.id,
    url: p.data,
    name: p.name,
    sizeBytes: p.sizeBytes,
    addedAt: iso(p.at),
    addedBy: p.addedKind,
  })
  const byAt = <T extends { at: unknown }>(a: T, b: T) => iso(a.at).localeCompare(iso(b.at))
  const photos = [...c.photos].sort(byAt)
  const messages: ReportMessage[] = [...c.messages].sort(byAt).map((m) => ({
    id: m.id,
    author: m.authorKind,
    authorName: m.authorName,
    body: m.body,
    at: iso(m.at),
    isInfoRequest: m.isInfoRequest,
    attachments: photos.filter((p) => p.messageId === m.id).map(photo),
  }))
  const history: StatusEvent[] = [...c.events].sort(byAt).map((e) => ({
    id: e.id,
    status: e.status,
    at: iso(e.at),
    note: opt(e.note),
    source: e.source,
    technicianName: opt(e.technicianName),
    scheduledAt: e.scheduledAt ? iso(e.scheduledAt) : undefined,
  }))
  return {
    id,
    reference: reportReference(r.number, new Date(createdAt)),
    propertyId: r.unitId,
    categoryId: r.category as Report['categoryId'],
    title: r.title,
    description: r.description,
    location: r.location as Report['location'],
    urgency: r.urgency,
    status: r.status,
    createdAt,
    updatedAt: iso(r.updatedAt),
    attachments: photos.map(photo),
    history,
    messages,
    feedback: r.feedback ? { fixed: true, rating: r.feedback.rating as Rating, comment: opt(r.feedback.comment), at: iso(r.feedback.at) } : undefined,
  }
}

function toListing(id: string, l: ListingDoc): Listing {
  return {
    id,
    title: { fr: l.titleFr, ar: l.titleAr },
    description: { fr: l.descriptionFr, ar: l.descriptionAr },
    kind: l.kind,
    transaction: l.transaction,
    city: l.city,
    district: opt(l.district),
    areaSqm: opt(l.areaSqm),
    rooms: opt(l.rooms),
    bedrooms: opt(l.bedrooms),
    price: opt(l.price),
    visual: { palette: l.palette as Listing['visual']['palette'], style: l.style as Listing['visual']['style'], floors: l.floors },
    features: l.features as Listing['features'],
  }
}

const session = (uid: string): Session => ({ residentId: uid, kind: 'account', startedAt: new Date().toISOString() })

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export function createFirebaseServices(): Services {
  const { auth, db } = firebase()

  let stopListening: Unsubscribe | null = null
  let firstAuthEvent = true
  /** During sign-up the UI waits until the profile and unit are saved. */
  let signingUp = false

  /** Live updates: new notifications refresh the bell and the reports. */
  onAuthStateChanged(auth, (user) => {
    stopListening?.()
    stopListening = null
    if (user) {
      let initial = true
      stopListening = onSnapshot(
        query(collection(db, 'notifications'), where('uid', '==', user.uid)),
        () => {
          if (initial) {
            initial = false
            return
          }
          emitChange('notifications')
          emitChange('reports')
        },
        () => undefined,
      )
    }
    if (!firstAuthEvent && !signingUp) emitChange('session')
    firstAuthEvent = false
  })

  async function me() {
    await auth.authStateReady()
    const user = auth.currentUser
    if (!user) throw new ServiceError('unauthorized')
    return user
  }

  async function profile(): Promise<ResidentDoc> {
    const user = await me()
    const snap = await getDoc(doc(db, 'residents', user.uid))
    if (snap.exists()) return snap.data() as ResidentDoc
    await ops.ensureResidentProfile(db, user.uid, { fullName: user.displayName ?? '', email: user.email ?? '' })
    return (await getDoc(doc(db, 'residents', user.uid))).data() as ResidentDoc
  }

  async function memberships(): Promise<MyProperty[]> {
    const user = await me()
    const snap = await getDocs(query(collection(db, 'memberships'), where('uid', '==', user.uid)))
    const rows = snap.docs.map((d) => d.data() as MembershipDoc).sort((a, b) => iso(a.createdAt).localeCompare(iso(b.createdAt)))
    const residences = new Map<string, Promise<ResidenceDoc | null>>()
    const props = await Promise.all(
      rows.map(async (m) => {
        if (!residences.has(m.residenceId)) {
          residences.set(m.residenceId, getDoc(doc(db, 'residences', m.residenceId)).then((s) => (s.exists() ? (s.data() as ResidenceDoc) : null)))
        }
        const [u, r] = await Promise.all([getDoc(doc(db, 'units', m.unitId)).catch(() => null), residences.get(m.residenceId)!.catch(() => null)])
        return u?.exists() && r ? toProperty(m.unitId, m, u.data() as UnitDoc, r) : null
      }),
    )
    return props.filter((p): p is MyProperty => p !== null)
  }

  async function children(reportId: string): Promise<Children> {
    const sub = (name: string) => getDocs(collection(db, 'reports', reportId, name))
    const [e, m, p] = await Promise.all([sub('events'), sub('messages'), sub('photos')])
    return {
      events: e.docs.map((d) => ({ id: d.id, ...(d.data() as EventDoc) })),
      messages: m.docs.map((d) => ({ id: d.id, ...(d.data() as MessageDoc) })),
      photos: p.docs.map((d) => ({ id: d.id, ...(d.data() as PhotoDoc) })),
    }
  }

  async function getReport(id: string): Promise<Report> {
    const snap = await getDoc(doc(db, 'reports', id)).catch((e) => {
      throw (e as { code?: string }).code === 'permission-denied' ? new ServiceError('not_found') : e
    })
    if (!snap.exists()) throw new ServiceError('not_found')
    return toReport(id, snap.data() as ReportDoc, await children(id))
  }

  async function actor(): Promise<ops.Actor & { email: string | null; phone: string | null }> {
    const user = await me()
    const p = await profile()
    return { uid: user.uid, name: p.fullName, email: user.email, phone: p.phone }
  }

  return {
    auth: {
      mode: 'account',
      getSession: async () => {
        await auth.authStateReady()
        return auth.currentUser ? session(auth.currentUser.uid) : null
      },
      signInDemo: () => Promise.reject(new ServiceError('validation')),
      signIn: async (email, password) => {
        try {
          const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
          return session(user.uid)
        } catch (err) {
          const code = (err as { code?: string }).code ?? ''
          if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/too-many-requests'].includes(code)) {
            throw new ServiceError('validation', 'invalid_credentials')
          }
          throw toServiceError(err)
        }
      },
      signUp: async (input) => {
        const code = input.unitCode?.trim().toUpperCase()
        // Check the code before creating the account, so a typo doesn't leave
        // an account with no apartment.
        if (code && !(await guard(() => ops.lookupUnitCode(db, code)))) throw new ServiceError('validation', 'invalid_code')
        let uid: string
        signingUp = true
        try {
          const { user } = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password)
          uid = user.uid
          await updateProfile(user, { displayName: input.fullName.trim() }).catch(() => undefined)
        } catch (err) {
          signingUp = false
          if ((err as { code?: string }).code === 'auth/email-already-in-use') throw new ServiceError('validation', 'email_taken')
          throw toServiceError(err)
        }
        try {
          await guard(async () => {
            const fullName = input.fullName.trim()
            const phone = input.phone?.trim() || null
            await ops.ensureResidentProfile(db, uid, { fullName, email: input.email.trim(), phone })
            if (code) await ops.claimUnit(db, { uid, fullName, email: input.email.trim(), phone }, code, input.occupancy)
          })
        } finally {
          signingUp = false
          emitChange('session')
          emitChange('all')
        }
        return session(uid)
      },
      sendPasswordReset: (email) => guard(() => sendPasswordResetEmail(auth, email.trim())),
      signOut: () => signOut(auth),
    },

    resident: {
      getCurrentResident: () =>
        guard(async () => {
          const user = await me()
          const [p, props] = await Promise.all([profile(), memberships()])
          const [firstName, ...rest] = (p.fullName || p.email || '').split(/\s+/)
          return {
            id: user.uid,
            firstName: firstName ?? '',
            lastName: rest.join(' '),
            email: opt(p.email) || undefined,
            phone: opt(p.phone),
            propertyIds: props.map((x) => x.id),
            memberSince: iso(p.createdAt),
          } satisfies Resident
        }),
      getPreferences: () => guard(async () => ({ ...DEFAULT_PREFS, ...(await profile()).prefs })),
      updatePreferences: (patch) =>
        guard(async () => {
          const user = await me()
          const next = { ...DEFAULT_PREFS, ...(await profile()).prefs, ...patch }
          await updateDoc(doc(db, 'residents', user.uid), { prefs: next })
          emitChange('preferences')
          return next
        }),
    },

    properties: {
      listMyProperties: () => guard(memberships),
      getProperty: (id) =>
        guard(async () => {
          const p = (await memberships()).find((x) => x.id === id)
          if (!p) throw new ServiceError('not_found')
          return p
        }),
      claimUnit: (code, occupancy) =>
        guard(async () => {
          const a = await actor()
          await ops.claimUnit(db, { uid: a.uid, fullName: a.name, email: a.email ?? '', phone: a.phone }, code, occupancy)
          emitChange('all')
        }),
    },

    reports: {
      listCategories: async () => REPORT_CATEGORIES,
      listReports: (filter) =>
        guard(async () => {
          const units = filter?.propertyId ? [filter.propertyId] : (await memberships()).map((p) => p.id)
          // One equality query per unit: no composite index needed, and each
          // query is provably limited to a unit the rules let us read.
          const snaps = await Promise.all(units.map((u) => getDocs(query(collection(db, 'reports'), where('unitId', '==', u)))))
          return snaps
            .flatMap((s) => s.docs.map((d) => toReport(d.id, d.data() as ReportDoc)))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        }),
      getReport: (id) => guard(() => getReport(id)),
      createReport: (input) =>
        guard(async () => {
          const id = input.clientId ?? newUid()
          const a = await actor()
          const p = (await memberships()).find((x) => x.id === input.propertyId)
          if (!p) throw new ServiceError('not_found')
          await ops.createReport(
            db,
            { uid: a.uid, fullName: a.name, email: a.email, phone: a.phone },
            {
              id,
              unitId: p.id,
              residenceId: p.residenceId,
              unitLabel: { residenceName: p.residenceName, buildingName: p.building ?? null, number: p.unit ?? '', floor: p.floor ?? null },
              category: input.categoryId,
              title: input.title,
              description: input.description,
              location: input.location,
              urgency: input.urgency,
            },
            input.attachments,
          )
          emitChange('reports')
          return getReport(id)
        }),
      addResidentMessage: (reportId, body, attachments) =>
        guard(async () => {
          await ops.addResidentMessage(db, await actor(), reportId, body, attachments)
          emitChange('reports')
          return getReport(reportId)
        }),
      submitFeedback: (reportId, f) =>
        guard(async () => {
          if (f.fixed) await ops.confirmFix(db, reportId, f.rating ?? 5, f.comment ?? null)
          else await ops.reopenReport(db, await actor(), reportId, f.comment ?? '')
          emitChange('reports')
          return getReport(reportId)
        }),
    },

    notifications: {
      listNotifications: () =>
        guard(async () => {
          const user = await me()
          const snap = await getDocs(query(collection(db, 'notifications'), where('uid', '==', user.uid)))
          return snap.docs
            .map((d): AppNotification => {
              const n = d.data() as NotificationDoc
              return {
                id: d.id,
                type: n.type,
                at: iso(n.at),
                read: n.read,
                reportId: opt(n.reportId),
                propertyId: opt(n.unitId),
                status: opt(n.status),
                announcementId: opt(n.announcementId),
              }
            })
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 100)
        }),
      markRead: (id) =>
        guard(async () => {
          await updateDoc(doc(db, 'notifications', id), { read: true })
          emitChange('notifications')
        }),
      markAllRead: () =>
        guard(async () => {
          const user = await me()
          const snap = await getDocs(query(collection(db, 'notifications'), where('uid', '==', user.uid), where('read', '==', false)))
          // Batches hold at most 500 writes.
          for (let i = 0; i < snap.docs.length; i += 450) {
            const b = writeBatch(db)
            snap.docs.slice(i, i + 450).forEach((d) => b.update(d.ref, { read: true }))
            await b.commit()
          }
          emitChange('notifications')
        }),
    },

    announcements: {
      listAnnouncements: () =>
        guard(async () => {
          const props = await memberships()
          const residenceIds = [...new Set(props.map((p) => p.residenceId))]
          const snaps = await Promise.all(residenceIds.map((r) => getDocs(query(collection(db, 'announcements'), where('residenceId', '==', r)))))
          return snaps
            .flatMap((s) =>
              s.docs.map((d): Announcement => {
                const a = d.data() as AnnouncementDoc
                return {
                  id: d.id,
                  propertyIds: props.filter((p) => p.residenceId === a.residenceId).map((p) => p.id),
                  title: { fr: a.titleFr, ar: a.titleAr },
                  body: { fr: a.bodyFr, ar: a.bodyAr },
                  publishedAt: iso(a.publishedAt),
                  important: a.important,
                }
              }),
            )
            .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
            .slice(0, 50)
        }),
    },

    listings: {
      listListings: (filter) =>
        guard(async () => {
          const snap = await getDocs(query(collection(db, 'listings'), where('published', '==', true)))
          return snap.docs
            .map((d) => ({ id: d.id, l: d.data() as ListingDoc }))
            .filter(({ l }) => (!filter?.kind || l.kind === filter.kind) && (!filter?.transaction || l.transaction === filter.transaction))
            .sort((a, b) => iso(b.l.createdAt).localeCompare(iso(a.l.createdAt)))
            .map(({ id, l }) => toListing(id, l))
        }),
      getListing: (id) =>
        guard(async () => {
          const snap = await getDoc(doc(db, 'listings', id))
          if (!snap.exists()) throw new ServiceError('not_found')
          return toListing(id, snap.data() as ListingDoc)
        }),
      submitInterest: (input) =>
        guard(async () => {
          const user = await me()
          const ref = await addDoc(collection(db, 'interestRequests'), {
            listingId: input.listingId,
            uid: user.uid,
            name: input.name.trim(),
            phone: input.phone.trim(),
            email: input.email?.trim() || null,
            message: input.message?.trim() || null,
            preferredContact: input.preferredContact,
            handled: false,
            at: serverTimestamp(),
          })
          return { id: ref.id }
        }),
    },
  }
}
