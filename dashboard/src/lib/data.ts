/**
 * Dashboard queries and actions. Status changes, info requests and dispatch
 * go through the database RPCs, which enforce the workflow and write the
 * timeline + resident notifications.
 */
import { emitChange } from '@/services/events'
import { q, requireDb, type ReportStatus, type Row } from './supabase'

export const REPORT_LIST_SELECT =
  'id, reference, title, category, urgency, status, created_at, updated_at, scheduled_at, feedback_rating, feedback_at, assignee_id, unit_id, unit:units(number, floor, building:buildings(name, residence:residences(id, name))), resident:profiles(full_name, phone, email), technician:technicians(id, name, trade)'

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
  technician: { id: string; name: string; trade: string } | null
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

export async function listReports(): Promise<ReportListItem[]> {
  const db = requireDb()
  const rows = await q(db.from('reports').select(REPORT_LIST_SELECT).order('updated_at', { ascending: false }).limit(1000))
  return rows as unknown as ReportListItem[]
}

export interface ReportDetail extends ReportListItem {
  description: string
  location: string
  feedback_comment: string | null
  events: Row<'report_events'>[]
  messages: Row<'report_messages'>[]
  photos: (Row<'report_photos'> & { url: string })[]
}

export async function getReport(id: string): Promise<ReportDetail> {
  const db = requireDb()
  const r = await q(
    db
      .from('reports')
      .select(`${REPORT_LIST_SELECT}, description, location, feedback_comment, events:report_events(*), messages:report_messages(*), photos:report_photos(*)`)
      .eq('id', id)
      .single(),
  )
  const detail = r as unknown as Omit<ReportDetail, 'photos'> & { photos: Row<'report_photos'>[] }
  const paths = detail.photos.map((p) => p.path)
  const { data: signed } = paths.length ? await db.storage.from('report-photos').createSignedUrls(paths, 3600) : { data: [] }
  const url = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return {
    ...detail,
    events: [...detail.events].sort((a, b) => a.at.localeCompare(b.at)),
    messages: [...detail.messages].sort((a, b) => a.at.localeCompare(b.at)),
    photos: detail.photos.map((p) => ({ ...p, url: url.get(p.path) ?? '' })).sort((a, b) => a.at.localeCompare(b.at)),
  }
}

export async function setStatus(reportId: string, status: ReportStatus, note?: string) {
  await q(requireDb().rpc('set_report_status', { p_report: reportId, p_status: status, p_note: note || undefined }))
  emitChange('reports')
}

export async function requestInfo(reportId: string, body: string) {
  await q(requireDb().rpc('request_info', { p_report: reportId, p_body: body }))
  emitChange('reports')
}

export async function dispatch(reportId: string, technicianId: string, scheduledAt: string, note?: string) {
  await q(requireDb().rpc('dispatch_report', { p_report: reportId, p_technician: technicianId, p_scheduled_at: scheduledAt, p_note: note || undefined }))
  emitChange('reports')
}

export async function sendMessage(reportId: string, body: string) {
  // author_kind / author_name are set by the server from the caller.
  await q(requireDb().from('report_messages').insert({ report_id: reportId, body: body.trim(), author_kind: 'agency' }))
  emitChange('reports')
}

export async function listTechnicians(includeInactive = false) {
  let query = requireDb().from('technicians').select('*').order('name')
  if (!includeInactive) query = query.eq('active', true)
  return q(query)
}

/** Value for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
