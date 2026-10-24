/**
 * Dashboard queries and actions on Firestore. Status changes, info requests
 * and dispatch go through the shared ops (src/services/firebase/ops.ts), which
 * write the timeline event and resident notifications in the same batch, as
 * firebase/firestore.rules require.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { emitChange } from '@/services/events'
import * as ops from '@/services/firebase/ops'
import { iso, reportReference, type EventDoc, type MessageDoc, type PhotoDoc, type ReportDoc, type TechnicianDoc } from '@/services/firebase/schema'
import { auth, db, type ReportStatus } from './firebase'

export interface ReportListItem {
  id: string
  reference: string
  title: string
  category: string
  urgency: 'low' | 'normal' | 'urgent'
  status: ReportStatus
  created_at: string
  updated_at: string
  scheduled_at: string | null
  feedback_rating: number | null
  feedback_at: string | null
  assignee_id: string | null
  unit_id: string
  unit: { number: string; floor: number | null; building: { name: string; residence: { id: string; name: string } | null } | null } | null
  resident: { full_name: string; phone: string | null; email: string | null } | null
  technician: { id: string; name: string } | null
}

export const OPEN_STATUSES: ReportStatus[] = ['submitted', 'under_review', 'in_progress', 'awaiting_resident']
export const isOpenStatus = (s: ReportStatus) => OPEN_STATUSES.includes(s)

/** "Résidence El Bahia · Bât. A · Appt 12" */
export function unitLabel(r: Pick<ReportListItem, 'unit'>): string {
  const u = r.unit
  if (!u) return '—'
  return [u.building?.residence?.name, u.building ? `Bât. ${u.building.name}` : null, `Appt ${u.number}`].filter(Boolean).join(' · ')
}

const URGENCY_RANK = { urgent: 0, normal: 1, low: 2 } as const
/** Most urgent first, then oldest first. */
export function byPriority(a: ReportListItem, b: ReportListItem) {
  return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.created_at.localeCompare(b.created_at)
}

export function toListItem(id: string, r: ReportDoc): ReportListItem {
  const created = iso(r.createdAt)
  return {
    id,
    reference: reportReference(r.number, new Date(created)),
    title: r.title,
    category: r.category,
    urgency: r.urgency,
    status: r.status,
    created_at: created,
    updated_at: iso(r.updatedAt),
    scheduled_at: r.scheduledAt ? iso(r.scheduledAt) : null,
    feedback_rating: r.feedback?.rating ?? null,
    feedback_at: r.feedback ? iso(r.feedback.at) : null,
    assignee_id: r.assigneeId,
    unit_id: r.unitId,
    unit: {
      number: r.unitLabel.number,
      floor: r.unitLabel.floor,
      building: { name: r.unitLabel.buildingName ?? '', residence: { id: r.residenceId, name: r.unitLabel.residenceName } },
    },
    resident: { full_name: r.residentName, phone: r.residentPhone, email: r.residentEmail },
    technician: r.assigneeId ? { id: r.assigneeId, name: r.assigneeName ?? '' } : null,
  }
}

export async function listReports(): Promise<ReportListItem[]> {
  const snap = await getDocs(collection(db, 'reports'))
  return snap.docs.map((d) => toListItem(d.id, d.data() as ReportDoc)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export interface ReportDetail extends ReportListItem {
  description: string
  location: string
  feedback_comment: string | null
  events: { id: string; status: ReportStatus; at: string; note: string | null; source: string; technician_name: string | null; scheduled_at: string | null }[]
  messages: { id: string; author_kind: 'resident' | 'agency'; author_name: string; body: string; is_info_request: boolean; at: string }[]
  photos: { id: string; url: string; name: string; size_bytes: number; at: string; added_kind: 'resident' | 'agency'; message_id: string | null }[]
}

export async function getReport(id: string): Promise<ReportDetail> {
  const snap = await getDoc(doc(db, 'reports', id))
  if (!snap.exists()) throw new ops.OpError('not_found')
  const r = snap.data() as ReportDoc
  const sub = (name: string) => getDocs(collection(db, 'reports', id, name))
  const [e, m, p] = await Promise.all([sub('events'), sub('messages'), sub('photos')])
  const byAt = (a: { at: string }, b: { at: string }) => a.at.localeCompare(b.at)
  return {
    ...toListItem(id, r),
    description: r.description,
    location: r.location,
    feedback_comment: r.feedback?.comment ?? null,
    events: e.docs
      .map((d) => {
        const x = d.data() as EventDoc
        return { id: d.id, status: x.status, at: iso(x.at), note: x.note, source: x.source, technician_name: x.technicianName, scheduled_at: x.scheduledAt ? iso(x.scheduledAt) : null }
      })
      .sort(byAt),
    messages: m.docs
      .map((d) => {
        const x = d.data() as MessageDoc
        return { id: d.id, author_kind: x.authorKind, author_name: x.authorName, body: x.body, is_info_request: x.isInfoRequest, at: iso(x.at) }
      })
      .sort(byAt),
    photos: p.docs
      .map((d) => {
        const x = d.data() as PhotoDoc
        return { id: d.id, url: x.data, name: x.name, size_bytes: x.sizeBytes, at: iso(x.at), added_kind: x.addedKind, message_id: x.messageId }
      })
      .sort(byAt),
  }
}

/** The signed-in staff member, as recorded on timeline events and messages. */
export async function staffActor(): Promise<ops.Actor> {
  const user = auth.currentUser
  if (!user) throw new ops.OpError('not_allowed')
  const s = await getDoc(doc(db, 'staff', user.uid))
  return { uid: user.uid, name: (s.data()?.fullName as string | undefined) || user.email || 'Agence' }
}

export async function setStatus(reportId: string, status: ReportStatus, note?: string) {
  await ops.setReportStatus(db, await staffActor(), reportId, status, note)
  emitChange('reports')
}

export async function requestInfo(reportId: string, body: string) {
  await ops.requestInfo(db, await staffActor(), reportId, body)
  emitChange('reports')
}

export async function dispatch(reportId: string, technicianId: string, scheduledAt: string, note?: string) {
  await ops.dispatchReport(db, await staffActor(), reportId, technicianId, new Date(scheduledAt), note)
  emitChange('reports')
}

export async function sendMessage(reportId: string, body: string) {
  await ops.sendAgencyMessage(db, await staffActor(), reportId, body)
  emitChange('reports')
}

export type Technician = TechnicianDoc & { id: string }

export async function listTechnicians(includeInactive = false): Promise<Technician[]> {
  const snap = await getDocs(includeInactive ? collection(db, 'technicians') : query(collection(db, 'technicians'), where('active', '==', true)))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TechnicianDoc) })).sort((a, b) => a.name.localeCompare(b.name))
}

/** Value for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
