/**
 * Firestore write operations shared by the resident app, the agency dashboard
 * and the rules tests. Each function performs exactly the batch / transaction
 * shape that firebase/firestore.rules accepts (e.g. a status change always
 * writes its timeline event and points report.lastEventId at it).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import type { ReportStatus } from '@/types'
import type {
  AnnouncementDoc,
  EventDoc,
  MembershipDoc,
  MessageDoc,
  NotificationDoc,
  NotificationKind,
  PhotoDoc,
  ReportDoc,
  ResidenceMemberDoc,
  ResidentDoc,
  StaffDoc,
  TechnicianDoc,
  UnitCodeDoc,
  UnitDoc,
  UnitLabel,
} from './schema'

export interface Actor {
  uid: string
  name: string
}

export interface PhotoInput {
  id: string
  url: string
  name: string
  sizeBytes: number
}

/** Mirrors canMove() in the rules and AGENCY_TRANSITIONS in the domain. */
const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  submitted: ['under_review', 'in_progress', 'rejected'],
  under_review: ['in_progress', 'awaiting_resident', 'rejected'],
  in_progress: ['resolved', 'awaiting_resident'],
  awaiting_resident: ['in_progress', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  rejected: [],
}
export const canMove = (from: ReportStatus, to: ReportStatus) => TRANSITIONS[from].includes(to)
export const isOpenStatus = (s: ReportStatus) => ['submitted', 'under_review', 'in_progress', 'awaiting_resident'].includes(s)

export class OpError extends Error {
  constructor(readonly code: 'invalid_code' | 'not_allowed' | 'not_found' | 'invalid') {
    super(code)
  }
}

const newId = (db: Firestore, ...path: string[]) => doc(collection(db, path.join('/'))).id

// ---------------------------------------------------------------- residents

export async function ensureResidentProfile(db: Firestore, uid: string, p: { fullName: string; email: string; phone?: string | null }) {
  const ref = doc(db, 'residents', uid)
  if ((await getDoc(ref)).exists()) return
  const data: ResidentDoc = {
    fullName: p.fullName.trim().slice(0, 120) || p.email,
    email: p.email,
    phone: p.phone?.trim() || null,
    prefs: { reportUpdates: true, infoRequests: true, announcements: true, listings: false },
    createdAt: serverTimestamp(),
  }
  await runTransaction(db, async (tx) => {
    if (!(await tx.get(ref)).exists()) tx.set(ref, data)
  })
}

/** Unit an access code points to, or null. Works before signing in. */
export async function lookupUnitCode(db: Firestore, code: string): Promise<UnitCodeDoc | null> {
  const c = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{8}$/.test(c)) return null
  const snap = await getDoc(doc(db, 'unitCodes', c))
  return snap.exists() ? (snap.data() as UnitCodeDoc) : null
}

export async function claimUnit(
  db: Firestore,
  user: { uid: string; fullName: string; email: string; phone: string | null },
  code: string,
  occupancy: 'owner' | 'tenant',
) {
  const c = code.trim().toUpperCase()
  const target = await lookupUnitCode(db, c)
  if (!target) throw new OpError('invalid_code')
  const batch = writeBatch(db)
  const membership: MembershipDoc = {
    uid: user.uid,
    unitId: target.unitId,
    residenceId: target.residenceId,
    code: c,
    occupancy,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    createdAt: serverTimestamp(),
  }
  batch.set(doc(db, 'memberships', `${user.uid}_${target.unitId}`), membership)
  const rm: ResidenceMemberDoc = { uid: user.uid, residenceId: target.residenceId, unitId: target.unitId }
  batch.set(doc(db, 'residenceMembers', `${target.residenceId}_${user.uid}`), rm)
  await batch.commit()
  return target
}

export interface NewReport {
  id: string
  unitId: string
  residenceId: string
  unitLabel: UnitLabel
  category: string
  title: string
  description: string
  location: string
  urgency: 'low' | 'normal' | 'urgent'
}

/** Files a report (idempotent on `id`) with its number, first event and receipt. */
export async function createReport(
  db: Firestore,
  user: { uid: string; fullName: string; email: string | null; phone: string | null },
  r: NewReport,
  photos: PhotoInput[] = [],
) {
  const reportRef = doc(db, 'reports', r.id)
  await runTransaction(db, async (tx) => {
    if ((await tx.get(reportRef)).exists()) return // retry after a lost response
    const counterRef = doc(db, 'counters', 'reports')
    const counter = await tx.get(counterRef)
    const number = counter.exists() ? (counter.data().next as number) : 1
    if (counter.exists()) tx.update(counterRef, { next: number + 1 })
    else tx.set(counterRef, { next: 2 })
    const eventId = newId(db, 'reports', r.id, 'events')
    const data: ReportDoc = {
      number,
      unitId: r.unitId,
      residenceId: r.residenceId,
      unitLabel: r.unitLabel,
      residentId: user.uid,
      residentName: user.fullName,
      residentPhone: user.phone,
      residentEmail: user.email,
      category: r.category,
      title: r.title.trim(),
      description: r.description.trim(),
      location: r.location,
      urgency: r.urgency,
      status: 'submitted',
      assigneeId: null,
      assigneeName: null,
      scheduledAt: null,
      feedback: null,
      lastEventId: eventId,
      residentActivity: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    tx.set(reportRef, data)
    const event: EventDoc = { status: 'submitted', note: null, source: 'resident', actorId: user.uid, technicianName: null, scheduledAt: null, at: serverTimestamp() }
    tx.set(doc(db, 'reports', r.id, 'events', eventId), event)
    tx.set(doc(collection(db, 'notifications')), notification(user.uid, 'report_submitted', r.id, r.unitId, 'submitted'))
  })
  await addPhotos(db, r.id, photos, { uid: user.uid, kind: 'resident' })
}

/** Photos use their own ids, so re-sending after a failure never duplicates them. */
export async function addPhotos(db: Firestore, reportId: string, photos: PhotoInput[], by: { uid: string; kind: 'resident' | 'agency' }, messageId: string | null = null) {
  for (const p of photos) {
    const ref = doc(db, 'reports', reportId, 'photos', p.id)
    const data: PhotoDoc = { data: p.url, name: p.name.slice(0, 200) || 'photo.jpg', sizeBytes: p.sizeBytes, messageId, addedKind: by.kind, addedBy: by.uid, at: serverTimestamp() }
    try {
      await runTransaction(db, async (tx) => {
        if (!(await tx.get(ref)).exists()) tx.set(ref, data)
      })
    } catch (e) {
      // Reading a photo that doesn't exist yet may be refused by the rules on
      // some SDK paths; fall back to a plain write.
      if ((e as { code?: string }).code !== 'permission-denied') throw e
      const b = writeBatch(db)
      b.set(ref, data)
      await b.commit()
    }
  }
}

export async function addResidentMessage(db: Firestore, user: Actor, reportId: string, body: string, photos: PhotoInput[] = []) {
  const messageId = newId(db, 'reports', reportId, 'messages')
  const batch = writeBatch(db)
  const m: MessageDoc = { authorKind: 'resident', authorId: user.uid, authorName: user.name.slice(0, 120), body: body.trim(), isInfoRequest: false, at: serverTimestamp() }
  batch.set(doc(db, 'reports', reportId, 'messages', messageId), m)
  batch.update(doc(db, 'reports', reportId), { updatedAt: serverTimestamp(), residentActivity: { kind: 'reply', at: serverTimestamp() } })
  await batch.commit()
  await addPhotos(db, reportId, photos, { uid: user.uid, kind: 'resident' }, messageId)
}

export async function confirmFix(db: Firestore, reportId: string, rating: number, comment: string | null) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'reports', reportId), {
    feedback: { rating, comment: comment?.trim() || null, at: serverTimestamp() },
    updatedAt: serverTimestamp(),
    residentActivity: { kind: 'feedback', at: serverTimestamp() },
  })
  await batch.commit()
}

export async function reopenReport(db: Firestore, user: Actor, reportId: string, explanation: string) {
  const eventId = newId(db, 'reports', reportId, 'events')
  const batch = writeBatch(db)
  const e: EventDoc = { status: 'in_progress', note: 'timeline.notes.reopenedByResident', source: 'resident', actorId: user.uid, technicianName: null, scheduledAt: null, at: serverTimestamp() }
  batch.set(doc(db, 'reports', reportId, 'events', eventId), e)
  batch.update(doc(db, 'reports', reportId), {
    status: 'in_progress',
    lastEventId: eventId,
    updatedAt: serverTimestamp(),
    residentActivity: { kind: 'reopen', at: serverTimestamp() },
  })
  if (explanation.trim()) {
    const m: MessageDoc = { authorKind: 'resident', authorId: user.uid, authorName: user.name.slice(0, 120), body: explanation.trim(), isInfoRequest: false, at: serverTimestamp() }
    batch.set(doc(collection(db, 'reports', reportId, 'messages')), m)
  }
  await batch.commit()
}

// ---------------------------------------------------------------- staff

export async function requestStaffAccess(db: Firestore, uid: string, p: { fullName: string; email: string }) {
  const ref = doc(db, 'staff', uid)
  if ((await getDoc(ref)).exists()) return
  const data: StaffDoc = { role: 'pending', fullName: p.fullName.trim().slice(0, 120) || p.email, email: p.email, createdAt: serverTimestamp() }
  const b = writeBatch(db)
  b.set(ref, data)
  await b.commit()
}

/** First admin only: returns false when an admin already exists. */
export async function bootstrapAdmin(db: Firestore, uid: string): Promise<boolean> {
  if ((await getDoc(doc(db, 'config', 'bootstrap'))).exists()) return false
  const b = writeBatch(db)
  b.update(doc(db, 'staff', uid), { role: 'admin' })
  b.set(doc(db, 'config', 'bootstrap'), { adminUid: uid, at: serverTimestamp() })
  await b.commit()
  return true
}

export async function setStaffRole(db: Firestore, uid: string, role: 'pending' | 'agent' | 'admin') {
  const b = writeBatch(db)
  b.update(doc(db, 'staff', uid), { role })
  await b.commit()
}

function notification(uid: string, type: NotificationKind, reportId: string | null, unitId: string | null, status: ReportStatus | null, announcementId: string | null = null): NotificationDoc {
  return { uid, type, reportId, unitId, status, announcementId, read: false, at: serverTimestamp() }
}

/** Adds a notification for every resident of the unit to the batch. */
async function notifyUnit(db: Firestore, batch: WriteBatch, unitId: string, reportId: string, type: NotificationKind, status: ReportStatus | null) {
  const members = await getDocs(query(collection(db, 'memberships'), where('unitId', '==', unitId)))
  members.forEach((m) => batch.set(doc(collection(db, 'notifications')), notification((m.data() as MembershipDoc).uid, type, reportId, unitId, status)))
}

async function loadReport(db: Firestore, reportId: string): Promise<ReportDoc> {
  const snap = await getDoc(doc(db, 'reports', reportId))
  if (!snap.exists()) throw new OpError('not_found')
  return snap.data() as ReportDoc
}

export async function setReportStatus(db: Firestore, staff: Actor, reportId: string, status: ReportStatus, note?: string) {
  const r = await loadReport(db, reportId)
  if (!canMove(r.status, status)) throw new OpError('not_allowed')
  const eventId = newId(db, 'reports', reportId, 'events')
  const batch = writeBatch(db)
  const e: EventDoc = { status, note: note?.trim() || null, source: 'agency', actorId: staff.uid, technicianName: null, scheduledAt: null, at: serverTimestamp() }
  batch.set(doc(db, 'reports', reportId, 'events', eventId), e)
  batch.update(doc(db, 'reports', reportId), {
    status,
    lastEventId: eventId,
    updatedAt: serverTimestamp(),
    // A new resolution needs a new confirmation from the resident.
    ...(status === 'resolved' ? { feedback: null } : {}),
  })
  await notifyUnit(db, batch, r.unitId, reportId, status === 'resolved' || status === 'closed' ? 'report_resolved' : 'report_status_changed', status)
  await batch.commit()
}

export async function requestInfo(db: Firestore, staff: Actor, reportId: string, body: string) {
  if (body.trim().length < 5) throw new OpError('invalid')
  const r = await loadReport(db, reportId)
  if (r.status !== 'awaiting_resident' && !canMove(r.status, 'awaiting_resident')) throw new OpError('not_allowed')
  const batch = writeBatch(db)
  const m: MessageDoc = { authorKind: 'agency', authorId: staff.uid, authorName: staff.name.slice(0, 120), body: body.trim(), isInfoRequest: true, at: serverTimestamp() }
  batch.set(doc(collection(db, 'reports', reportId, 'messages')), m)
  if (r.status !== 'awaiting_resident') {
    const eventId = newId(db, 'reports', reportId, 'events')
    const e: EventDoc = { status: 'awaiting_resident', note: null, source: 'agency', actorId: staff.uid, technicianName: null, scheduledAt: null, at: serverTimestamp() }
    batch.set(doc(db, 'reports', reportId, 'events', eventId), e)
    batch.update(doc(db, 'reports', reportId), { status: 'awaiting_resident', lastEventId: eventId, updatedAt: serverTimestamp() })
  } else {
    batch.update(doc(db, 'reports', reportId), { updatedAt: serverTimestamp() })
  }
  await notifyUnit(db, batch, r.unitId, reportId, 'info_requested', 'awaiting_resident')
  await batch.commit()
}

export async function dispatchReport(db: Firestore, staff: Actor, reportId: string, technicianId: string, scheduledAt: Date, note?: string) {
  const r = await loadReport(db, reportId)
  if (!isOpenStatus(r.status)) throw new OpError('not_allowed')
  const tech = await getDoc(doc(db, 'technicians', technicianId))
  if (!tech.exists() || !(tech.data() as TechnicianDoc).active) throw new OpError('not_found')
  const t = tech.data() as TechnicianDoc
  const techName = t.company ? `${t.name} (${t.company})` : t.name
  const to: ReportStatus = r.status === 'in_progress' || canMove(r.status, 'in_progress') ? 'in_progress' : r.status
  const when = Timestamp.fromDate(scheduledAt)
  const eventId = newId(db, 'reports', reportId, 'events')
  const batch = writeBatch(db)
  const e: EventDoc = {
    status: to,
    note: note?.trim() || 'timeline.notes.technicianScheduled',
    source: 'agency',
    actorId: staff.uid,
    technicianName: techName,
    scheduledAt: when,
    at: serverTimestamp(),
  }
  batch.set(doc(db, 'reports', reportId, 'events', eventId), e)
  batch.update(doc(db, 'reports', reportId), {
    status: to,
    assigneeId: technicianId,
    assigneeName: techName,
    scheduledAt: when,
    lastEventId: eventId,
    updatedAt: serverTimestamp(),
  })
  await notifyUnit(db, batch, r.unitId, reportId, 'intervention_scheduled', to)
  await batch.commit()
}

export async function sendAgencyMessage(db: Firestore, staff: Actor, reportId: string, body: string) {
  const r = await loadReport(db, reportId)
  const batch = writeBatch(db)
  const m: MessageDoc = { authorKind: 'agency', authorId: staff.uid, authorName: staff.name.slice(0, 120), body: body.trim(), isInfoRequest: false, at: serverTimestamp() }
  batch.set(doc(collection(db, 'reports', reportId, 'messages')), m)
  batch.update(doc(db, 'reports', reportId), { updatedAt: serverTimestamp() })
  await notifyUnit(db, batch, r.unitId, reportId, 'agency_message', null)
  await batch.commit()
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** 8 characters from an unambiguous alphabet (no 0/O/1/I). */
export function newAccessCode(): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

async function freeCode(db: Firestore): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = newAccessCode()
    if (!(await getDoc(doc(db, 'unitCodes', code))).exists()) return code
  }
  throw new OpError('invalid')
}

export async function createUnit(
  db: Firestore,
  u: { residenceId: string; buildingId: string; buildingName: string; number: string; floor: number | null; areaSqm: number | null; rooms: number | null },
  fixedCode?: string,
) {
  const code = fixedCode ?? (await freeCode(db))
  const unitId = newId(db, 'units')
  const batch = writeBatch(db)
  const data: UnitDoc = { ...u, number: u.number.trim(), code, createdAt: serverTimestamp() }
  batch.set(doc(db, 'units', unitId), data)
  batch.set(doc(db, 'unitCodes', code), { unitId, residenceId: u.residenceId } satisfies UnitCodeDoc)
  await batch.commit()
  return { unitId, code }
}

/** New code for a unit; the old one stops working (linked accounts stay linked). */
export async function regenerateAccessCode(db: Firestore, unitId: string) {
  const unit = await getDoc(doc(db, 'units', unitId))
  if (!unit.exists()) throw new OpError('not_found')
  const u = unit.data() as UnitDoc
  const code = await freeCode(db)
  const batch = writeBatch(db)
  batch.delete(doc(db, 'unitCodes', u.code))
  batch.set(doc(db, 'unitCodes', code), { unitId, residenceId: u.residenceId } satisfies UnitCodeDoc)
  batch.update(doc(db, 'units', unitId), { code })
  await batch.commit()
  return code
}

export async function removeMember(db: Firestore, uid: string, unitId: string) {
  const m = await getDoc(doc(db, 'memberships', `${uid}_${unitId}`))
  if (!m.exists()) return
  const residenceId = (m.data() as MembershipDoc).residenceId
  const others = await getDocs(query(collection(db, 'memberships'), where('uid', '==', uid)))
  const stillInResidence = others.docs.some((d) => d.id !== m.id && (d.data() as MembershipDoc).residenceId === residenceId)
  const batch = writeBatch(db)
  batch.delete(m.ref)
  if (!stillInResidence) batch.delete(doc(db, 'residenceMembers', `${residenceId}_${uid}`))
  await batch.commit()
}

export async function publishAnnouncement(db: Firestore, a: Omit<AnnouncementDoc, 'publishedAt'>) {
  const id = newId(db, 'announcements')
  const batch = writeBatch(db)
  batch.set(doc(db, 'announcements', id), { ...a, publishedAt: serverTimestamp() } satisfies AnnouncementDoc)
  const members = await getDocs(query(collection(db, 'residenceMembers'), where('residenceId', '==', a.residenceId)))
  new Set(members.docs.map((m) => (m.data() as ResidenceMemberDoc).uid)).forEach((uid) =>
    batch.set(doc(collection(db, 'notifications')), notification(uid, 'announcement', null, null, null, id)),
  )
  await batch.commit()
  return id
}
