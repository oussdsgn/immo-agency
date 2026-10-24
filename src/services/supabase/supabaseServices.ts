/**
 * Supabase implementation of the resident services.
 *
 * Authorization is enforced by the database (row level security + RPCs in
 * supabase/migrations); this client only maps rows to the app's models.
 */
import { createClient, type PostgrestError, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { uid } from '@/lib/id'
import type {
  Announcement,
  AppNotification,
  Attachment,
  Listing,
  NotificationPreferences,
  NotificationType,
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
import type { Database } from './database.types'

type Db = SupabaseClient<Database>
type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

const BUCKET = 'report-photos'
const SIGNED_URL_TTL = 60 * 60

const DEFAULT_PREFS: NotificationPreferences = { reportUpdates: true, infoRequests: true, announcements: true, listings: false }

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
function toServiceError(err: unknown): ServiceError {
  if (err instanceof ServiceError) return err
  const e = err as Partial<PostgrestError> & { status?: number; name?: string; message?: string }
  const msg = e?.message ?? ''
  let code: ServiceErrorCode = 'unknown'
  if (err instanceof TypeError || /fetch|network|Failed to fetch|Load failed/i.test(msg)) code = 'network'
  else if (e?.code === 'PGRST301' || e?.status === 401 || /JWT|not authenticated|session/i.test(msg)) code = 'unauthorized'
  else if (e?.code === 'PGRST116' || e?.code === 'P0002') code = 'not_found'
  else if (e?.code && ['42501', '23514', '23505', '22P02', 'P0001', '23503'].includes(e.code)) code = 'validation'
  return new ServiceError(code, msg)
}

/** Awaits a query and throws a ServiceError on failure. Selects never yield null without an error. */
async function q<T>(p: PromiseLike<{ data: T; error: PostgrestError | null }>): Promise<NonNullable<T>> {
  let res
  try {
    res = await p
  } catch (err) {
    throw toServiceError(err)
  }
  if (res.error) throw toServiceError(res.error)
  return res.data as NonNullable<T>
}

// ---------------------------------------------------------------------------
// Row → model mapping
// ---------------------------------------------------------------------------
type ResidenceRow = Pick<
  Row<'residences'>,
  'id' | 'name' | 'address' | 'city' | 'manager_name' | 'phone' | 'email' | 'emergency_phone' | 'guard_phone' | 'amenities' | 'palette' | 'style' | 'floors'
>

interface MembershipRow {
  occupancy: 'owner' | 'tenant'
  unit: {
    id: string
    floor: number | null
    number: string
    area_sqm: number | null
    rooms: number | null
    building: { name: string; residence: ResidenceRow } | null
  } | null
}

const MEMBERSHIP_SELECT =
  'occupancy, unit:units(id, floor, number, area_sqm, rooms, building:buildings(name, residence:residences(id, name, address, city, manager_name, phone, email, emergency_phone, guard_phone, amenities, palette, style, floors)))'

const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v)

function toProperty(m: MembershipRow): (Property & { residenceId: string }) | null {
  const u = m.unit
  const r = u?.building?.residence
  if (!u || !r) return null
  return {
    id: u.id,
    residenceId: r.id,
    residenceName: r.name,
    building: u.building?.name,
    floor: opt(u.floor),
    unit: u.number,
    address: r.address,
    city: r.city,
    areaSqm: opt(u.area_sqm) !== undefined ? Number(u.area_sqm) : undefined,
    rooms: opt(u.rooms),
    role: m.occupancy,
    visual: { palette: r.palette as Property['visual']['palette'], style: r.style as Property['visual']['style'], floors: r.floors },
    residenceContact: {
      phone: opt(r.phone),
      email: opt(r.email),
      manager: opt(r.manager_name),
      emergencyPhone: opt(r.emergency_phone),
      guardPhone: opt(r.guard_phone),
    },
    amenities: r.amenities as Property['amenities'],
  }
}

type ReportRow = Row<'reports'> & {
  report_events: Row<'report_events'>[]
  report_messages: Row<'report_messages'>[]
  report_photos: Row<'report_photos'>[]
}

const REPORT_SELECT = '*, report_events(*), report_messages(*), report_photos(*)'

function toReport(r: ReportRow, urls: Map<string, string>): Report {
  const photo = (p: Row<'report_photos'>): Attachment => ({
    id: p.id,
    url: urls.get(p.path) ?? '',
    name: p.name,
    sizeBytes: p.size_bytes,
    addedAt: p.at,
    addedBy: p.added_kind as Attachment['addedBy'],
  })
  const photos = [...r.report_photos].sort((a, b) => a.at.localeCompare(b.at))
  const messages: ReportMessage[] = [...r.report_messages]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((m) => ({
      id: m.id,
      author: m.author_kind as ReportMessage['author'],
      authorName: m.author_name,
      body: m.body,
      at: m.at,
      isInfoRequest: m.is_info_request,
      attachments: photos.filter((p) => p.message_id === m.id).map(photo),
    }))
  const history: StatusEvent[] = [...r.report_events]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => ({
      id: e.id,
      status: e.status,
      at: e.at,
      note: opt(e.note),
      source: e.source as StatusEvent['source'],
      technicianName: opt(e.technician_name),
      scheduledAt: opt(e.scheduled_at),
    }))
  return {
    id: r.id,
    reference: r.reference,
    propertyId: r.unit_id,
    categoryId: r.category as Report['categoryId'],
    title: r.title,
    description: r.description,
    location: r.location as Report['location'],
    urgency: r.urgency as Report['urgency'],
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    attachments: photos.map(photo),
    history,
    messages,
    feedback: r.feedback_at
      ? { fixed: true, rating: (r.feedback_rating ?? undefined) as Rating | undefined, comment: opt(r.feedback_comment), at: r.feedback_at }
      : undefined,
  }
}

function toListing(l: Row<'listings'>): Listing {
  return {
    id: l.id,
    title: { fr: l.title_fr, ar: l.title_ar },
    description: { fr: l.description_fr, ar: l.description_ar },
    kind: l.kind as Listing['kind'],
    transaction: l.transaction as Listing['transaction'],
    city: l.city,
    district: opt(l.district),
    areaSqm: l.area_sqm === null ? undefined : Number(l.area_sqm),
    rooms: opt(l.rooms),
    bedrooms: opt(l.bedrooms),
    price: l.price === null ? undefined : Number(l.price),
    visual: { palette: l.palette as Listing['visual']['palette'], style: l.style as Listing['visual']['style'], floors: l.floors },
    features: l.features as Listing['features'],
  }
}

/**
 * Where e-mail links (confirmation, password reset) should land. The Android
 * app runs on https://localhost, which a phone browser cannot open, so it falls
 * back to the project's Site URL configured in Supabase.
 */
function webOrigin(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const o = window.location.origin
  return /^https?:\/\/localhost$/.test(o) && 'Capacitor' in window ? undefined : o
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  return res.blob()
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export function createSupabaseServices(url: string, key: string): Services {
  const db: Db = createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  let channel: RealtimeChannel | null = null

  /** Live updates: notifications drive refreshes of reports and the bell. */
  function listen(userId: string | null) {
    if (channel) {
      void db.removeChannel(channel)
      channel = null
    }
    if (!userId) return
    channel = db
      .channel(`resident-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${userId}` }, () => {
        emitChange('notifications')
        emitChange('reports')
      })
      .subscribe()
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') listen(session?.user.id ?? null)
    if (event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') emitChange('session')
  })

  async function userId(): Promise<string> {
    const { data } = await db.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new ServiceError('unauthorized')
    return id
  }

  async function memberships() {
    const rows = await q(db.from('unit_members').select(MEMBERSHIP_SELECT).order('created_at'))
    return (rows as unknown as MembershipRow[]).map(toProperty).filter((p): p is Property & { residenceId: string } => p !== null)
  }

  async function signedUrls(paths: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (!paths.length) return map
    const { data } = await db.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
    data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl))
    return map
  }

  async function loadReports(filter: { id?: string; unitId?: string }): Promise<Report[]> {
    let query = db.from('reports').select(REPORT_SELECT).order('updated_at', { ascending: false })
    if (filter.id) query = query.eq('id', filter.id)
    if (filter.unitId) query = query.eq('unit_id', filter.unitId)
    const rows = (await q(query)) as unknown as ReportRow[]
    const urls = await signedUrls(rows.flatMap((r) => r.report_photos.map((p) => p.path)))
    return rows.map((r) => toReport(r, urls))
  }

  async function getReport(id: string): Promise<Report> {
    const [r] = await loadReports({ id })
    if (!r) throw new ServiceError('not_found')
    return r
  }

  async function uploadPhotos(reportId: string, photos: { id: string; url: string; name: string; sizeBytes: number }[], messageId?: string) {
    for (const p of photos) {
      const path = `${reportId}/${p.id}.jpg`
      const blob = await dataUrlToBlob(p.url)
      const up = await db.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })
      // Already uploaded by a previous attempt: keep going.
      if (up.error && !/exists|Duplicate/i.test(up.error.message)) throw toServiceError(up.error)
      // added_by / added_kind are set by the server from the caller.
      const ins = await db.from('report_photos').insert({ report_id: reportId, message_id: messageId ?? null, path, name: p.name, size_bytes: p.sizeBytes, added_kind: 'resident' })
      if (ins.error && ins.error.code !== '23505') throw toServiceError(ins.error)
    }
  }

  return {
    auth: {
      mode: 'account',
      getSession: async () => {
        const { data } = await db.auth.getSession()
        const s = data.session
        return s ? ({ residentId: s.user.id, kind: 'account', startedAt: new Date().toISOString() } satisfies Session) : null
      },
      signInDemo: () => Promise.reject(new ServiceError('validation')),
      signIn: async (email, password) => {
        const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          if (/not confirmed/i.test(error.message)) throw new ServiceError('validation', 'email_unconfirmed')
          if (/invalid/i.test(error.message)) throw new ServiceError('validation', 'invalid_credentials')
          throw toServiceError(error)
        }
        return { residentId: data.user.id, kind: 'account', startedAt: new Date().toISOString() }
      },
      signUp: async (input) => {
        const { data, error } = await db.auth.signUp({
          email: input.email.trim(),
          password: input.password,
          options: {
            emailRedirectTo: webOrigin(),
            data: {
              full_name: input.fullName.trim(),
              phone: input.phone?.trim() || undefined,
              unit_code: input.unitCode?.trim().toUpperCase() || undefined,
              occupancy: input.occupancy,
            },
          },
        })
        if (error) {
          if (/registered|exists/i.test(error.message)) throw new ServiceError('validation', 'email_taken')
          throw toServiceError(error)
        }
        const s = data.session
        return s ? { residentId: s.user.id, kind: 'account', startedAt: new Date().toISOString() } : null
      },
      sendPasswordReset: async (email) => {
        const { error } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: webOrigin() })
        if (error) throw toServiceError(error)
      },
      signOut: async () => {
        await db.auth.signOut()
      },
    },

    resident: {
      getCurrentResident: async () => {
        const id = await userId()
        const [profile, props] = await Promise.all([
          q(db.from('profiles').select('id, full_name, phone, email, created_at').eq('id', id).single()),
          memberships(),
        ])
        const [firstName, ...rest] = (profile.full_name || profile.email || '').split(/\s+/)
        return {
          id: profile.id,
          firstName: firstName ?? '',
          lastName: rest.join(' '),
          email: opt(profile.email),
          phone: opt(profile.phone),
          propertyIds: props.map((p) => p.id),
          memberSince: profile.created_at,
        } satisfies Resident
      },
      getPreferences: async () => {
        const id = await userId()
        const p = await q(db.from('profiles').select('notification_prefs').eq('id', id).single())
        return { ...DEFAULT_PREFS, ...(p.notification_prefs as Partial<NotificationPreferences>) }
      },
      updatePreferences: async (patch) => {
        const id = await userId()
        const cur = await q(db.from('profiles').select('notification_prefs').eq('id', id).single())
        const next = { ...DEFAULT_PREFS, ...(cur.notification_prefs as Partial<NotificationPreferences>), ...patch }
        await q(db.from('profiles').update({ notification_prefs: next }).eq('id', id))
        emitChange('preferences')
        return next
      },
    },

    properties: {
      listMyProperties: () => memberships(),
      getProperty: async (id) => {
        const p = (await memberships()).find((x) => x.id === id)
        if (!p) throw new ServiceError('not_found')
        return p
      },
      claimUnit: async (code, occupancy) => {
        await q(db.rpc('claim_unit', { p_code: code.trim().toUpperCase(), p_occupancy: occupancy }))
        emitChange('all')
      },
    },

    reports: {
      listCategories: async () => (await import('@/data/categories')).REPORT_CATEGORIES,
      listReports: (filter) => loadReports({ unitId: filter?.propertyId }),
      getReport,
      createReport: async (input) => {
        const id = input.clientId ?? uid()
        const ins = await db.from('reports').insert({
          id,
          unit_id: input.propertyId,
          category: input.categoryId,
          title: input.title.trim(),
          description: input.description.trim(),
          location: input.location,
          urgency: input.urgency,
          reference: '', // set by the server
        })
        // 23505 on retry: the report already exists, only the photos may be missing.
        if (ins.error && ins.error.code !== '23505') throw toServiceError(ins.error)
        await uploadPhotos(id, input.attachments)
        emitChange('reports')
        return getReport(id)
      },
      addResidentMessage: async (reportId, body, attachments) => {
        const msg = await q(db.from('report_messages').insert({ report_id: reportId, body: body.trim(), author_kind: 'resident' }).select('id').single())
        await uploadPhotos(reportId, attachments, msg.id)
        emitChange('reports')
        return getReport(reportId)
      },
      submitFeedback: async (reportId, f) => {
        await q(db.rpc('submit_feedback', { p_report: reportId, p_fixed: f.fixed, p_rating: f.rating, p_comment: f.comment }))
        emitChange('reports')
        return getReport(reportId)
      },
    },

    notifications: {
      listNotifications: async () => {
        const rows = await q(db.from('notifications').select('*, report:reports(unit_id)').order('at', { ascending: false }).limit(100))
        return rows.map(
          (n): AppNotification => ({
            id: n.id,
            type: n.type as NotificationType,
            at: n.at,
            read: n.read,
            reportId: opt(n.report_id),
            propertyId: (n.report as { unit_id: string } | null)?.unit_id,
            status: opt(n.status),
            announcementId: opt(n.announcement_id),
          }),
        )
      },
      markRead: async (id) => {
        await q(db.from('notifications').update({ read: true }).eq('id', id))
        emitChange('notifications')
      },
      markAllRead: async () => {
        const id = await userId()
        await q(db.from('notifications').update({ read: true }).eq('profile_id', id).eq('read', false))
        emitChange('notifications')
      },
    },

    announcements: {
      listAnnouncements: async () => {
        const [rows, props] = await Promise.all([
          q(db.from('announcements').select('*').order('published_at', { ascending: false }).limit(50)),
          memberships(),
        ])
        return rows.map(
          (a): Announcement => ({
            id: a.id,
            propertyIds: props.filter((p) => p.residenceId === a.residence_id).map((p) => p.id),
            title: { fr: a.title_fr, ar: a.title_ar },
            body: { fr: a.body_fr, ar: a.body_ar },
            publishedAt: a.published_at,
            important: a.important,
          }),
        )
      },
    },

    listings: {
      listListings: async (filter) => {
        let query = db.from('listings').select('*').eq('published', true).order('created_at', { ascending: false })
        if (filter?.kind) query = query.eq('kind', filter.kind)
        if (filter?.transaction) query = query.eq('transaction', filter.transaction)
        return (await q(query)).map(toListing)
      },
      getListing: async (id) => toListing(await q(db.from('listings').select('*').eq('id', id).single())),
      submitInterest: async (input) => {
        const row = await q(
          db
            .from('interest_requests')
            .insert({
              listing_id: input.listingId,
              name: input.name.trim(),
              phone: input.phone.trim(),
              email: input.email?.trim() || null,
              message: input.message?.trim() || null,
              preferred_contact: input.preferredContact,
              profile_id: await userId(),
            })
            .select('id')
            .single(),
        )
        return { id: row.id }
      },
    },
  }
}
