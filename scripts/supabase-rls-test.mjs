/**
 * Security and workflow test for the Supabase backend (RLS, RPCs, storage,
 * realtime). Runs against the local stack by default:
 *
 *   npx supabase start && npx supabase db reset
 *   node scripts/supabase-rls-test.mjs
 *
 * Uses the service key only to create throwaway users. Never point it at a
 * production project.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE = process.env.SUPABASE_SERVICE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
if (!/127\.0\.0\.1|localhost/.test(URL) && !process.env.ALLOW_REMOTE) {
  console.error('Refusing to run against a non-local project (set ALLOW_REMOTE=1 to override).')
  process.exit(1)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const run = Date.now().toString(36)
let passed = 0

async function user(label, meta) {
  const email = `${label}-${run}@example.com`
  const password = 'Test-password-123'
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta })
  if (error) throw error
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error: e2 } = await c.auth.signInWithPassword({ email, password })
  if (e2) throw e2
  return { c, id: data.user.id, email }
}

function ok(cond, name) {
  if (!cond) {
    console.error(`✗ ${name}`)
    process.exit(1)
  }
  passed++
  console.log(`✓ ${name}`)
}

const denied = (res) => Boolean(res.error) || (Array.isArray(res.data) && res.data.length === 0) || res.data === null

// --- accounts -------------------------------------------------------------
const resident = await user('resident', { full_name: 'Amine Test', unit_code: 'BAHIA12A', occupancy: 'tenant' })
const neighbour = await user('neighbour', { full_name: 'Voisin Test', unit_code: 'BAHIA21B' })
const outsider = await user('outsider', { full_name: 'Sans Logement' })
const boss = await user('boss', { full_name: 'Admin Test', app: 'dashboard' })
const agent = await user('agent', { full_name: 'Agent Test', app: 'dashboard' })

{
  const { data } = await resident.c.from('unit_members').select('unit_id')
  ok(data?.length === 1, 'sign-up with access code links the resident to the unit')
  const { data: o } = await outsider.c.from('unit_members').select('unit_id')
  ok(o?.length === 0, 'sign-up without code links nothing')
  const { data: claimed, error } = await outsider.c.rpc('claim_unit', { p_code: 'jardin4c' })
  ok(!error && claimed, 'claim_unit links an existing account with a code (case-insensitive)')
  const bad = await outsider.c.rpc('claim_unit', { p_code: 'NOPE0000' })
  ok(Boolean(bad.error), 'claim_unit rejects an invalid code')
}

{
  const { data: units } = await resident.c.from('units').select('id, number')
  ok(units?.length === 1 && units[0].number === '12', 'resident sees only their own unit')
  const codes = await resident.c.from('units').select('access_code')
  ok(Boolean(codes.error), 'resident cannot read access codes')
  const viaRpc = await resident.c.rpc('unit_access_codes')
  ok(!viaRpc.error && viaRpc.data.length === 0, 'unit_access_codes returns nothing to residents')
  const { data: res } = await resident.c.from('residences').select('name')
  ok(res?.length === 1 && res[0].name === 'Résidence El Bahia', 'resident sees only their residence')
  const { data: techs } = await resident.c.from('technicians').select('id')
  ok(techs?.length === 0, 'resident cannot list technicians')
  const { data: profiles } = await resident.c.from('profiles').select('id')
  ok(profiles?.length === 1, 'resident sees only their own profile')
  const roleHack = await resident.c.from('profiles').update({ role: 'admin' }).eq('id', resident.id)
  ok(Boolean(roleHack.error), 'resident cannot change their own role')
}

// --- staff approval -------------------------------------------------------
{
  const { data: before } = await boss.c.from('reports').select('id')
  ok(before?.length === 0, 'pending staff sees no reports')
  const { data: first } = await boss.c.rpc('bootstrap_admin')
  ok(first === true, 'first dashboard user becomes admin')
  const { data: second } = await agent.c.rpc('bootstrap_admin')
  ok(second === false, 'bootstrap_admin is refused once an admin exists')
  const selfPromote = await agent.c.rpc('set_staff_role', { p_profile: agent.id, p_role: 'admin' })
  ok(Boolean(selfPromote.error), 'pending staff cannot promote themselves')
  const approve = await boss.c.rpc('set_staff_role', { p_profile: agent.id, p_role: 'agent' })
  ok(!approve.error, 'admin approves an agent')
  const toResident = await boss.c.rpc('set_staff_role', { p_profile: resident.id, p_role: 'agent' })
  const { data: stillResident } = await admin.from('profiles').select('role').eq('id', resident.id).single()
  ok(!toResident.error && stillResident.role === 'resident', 'residents cannot be turned into staff')
}

// --- realtime: staff listens for new reports --------------------------------
let subscribed
const ready = new Promise((r) => (subscribed = r))
const alert = new Promise((resolve) => {
  const timer = setTimeout(() => resolve(null), 15000)
  agent.c
    .channel('reports-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (p) => {
      clearTimeout(timer)
      resolve(p.new)
    })
    .subscribe((status) => status === 'SUBSCRIBED' && subscribed())
})
await ready
// Realtime starts streaming a moment after confirming the subscription.
await new Promise((r) => setTimeout(r, 3000))

// --- report lifecycle -------------------------------------------------------
const { data: myUnit } = await resident.c.from('units').select('id').single()
const reportId = crypto.randomUUID()
{
  const ins = await resident.c
    .from('reports')
    .insert({
      id: reportId,
      unit_id: myUnit.id,
      category: 'plumbing',
      title: 'Robinet qui fuit',
      description: 'Le robinet de la cuisine fuit en continu depuis ce matin.',
      location: 'kitchen',
      urgency: 'urgent',
      status: 'closed', // must be ignored
      reference: 'HACK',
    })
    .select('id, reference, status')
    .single()
  ok(!ins.error && /^SR-\d{4}-\d{4}$/.test(ins.data.reference) && ins.data.status === 'submitted', 'resident creates a report; server sets reference and status')
  const dup = await resident.c.from('reports').insert({ id: reportId, unit_id: myUnit.id, category: 'plumbing', title: 'Robinet qui fuit', description: 'Le robinet de la cuisine fuit en continu depuis ce matin.', location: 'kitchen' })
  ok(dup.error?.code === '23505', 'retrying with the same client id is detected as a duplicate')
  const other = await resident.c.from('reports').insert({ unit_id: 'bbbbbbb1-0000-4000-8000-000000000021', category: 'plumbing', title: 'Pas chez moi', description: 'Tentative sur un logement qui n’est pas le mien.', location: 'kitchen' })
  ok(Boolean(other.error), 'resident cannot report on someone else’s unit')
}

{
  const got = await alert
  ok(got?.id === reportId, 'staff receives the new report in real time')
}

{
  const upd = await resident.c.from('reports').update({ status: 'resolved' }).eq('id', reportId).select('id')
  ok(denied(upd), 'resident cannot update a report directly')
  const rpc = await resident.c.rpc('set_report_status', { p_report: reportId, p_status: 'under_review' })
  ok(Boolean(rpc.error), 'resident cannot call set_report_status')
  const peek = await neighbour.c.from('reports').select('id').eq('id', reportId)
  ok(denied(peek), 'neighbour cannot see the report')
  const peekMsg = await neighbour.c.from('report_messages').insert({ report_id: reportId, body: 'intrusion' })
  ok(Boolean(peekMsg.error), 'neighbour cannot post on the report')
}

{
  const { data: n } = await resident.c.from('notifications').select('type').eq('report_id', reportId)
  ok(n?.some((x) => x.type === 'report_submitted'), 'resident gets a "report submitted" notification')
}

// photos
{
  const png = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))], { type: 'image/png' })
  const up = await resident.c.storage.from('report-photos').upload(`${reportId}/a.png`, png, { contentType: 'image/png' })
  ok(!up.error, 'resident uploads a photo to their report')
  const row = await resident.c.from('report_photos').insert({ report_id: reportId, path: `${reportId}/a.png`, name: 'a.png', size_bytes: png.size }).select('added_kind').single()
  ok(!row.error && row.data.added_kind === 'resident', 'photo row recorded with server-side authorship')
  const sneaky = await neighbour.c.storage.from('report-photos').upload(`${reportId}/b.png`, png, { contentType: 'image/png' })
  ok(Boolean(sneaky.error), 'neighbour cannot upload into the report folder')
  const read = await neighbour.c.storage.from('report-photos').createSignedUrl(`${reportId}/a.png`, 60)
  ok(Boolean(read.error), 'neighbour cannot get a link to the photo')
  const mine = await agent.c.storage.from('report-photos').createSignedUrl(`${reportId}/a.png`, 60)
  ok(!mine.error && mine.data.signedUrl, 'staff can view the photo')
}

// agency workflow
{
  const bad = await agent.c.rpc('set_report_status', { p_report: reportId, p_status: 'closed' })
  ok(Boolean(bad.error), 'workflow refuses submitted → closed')
  const review = await agent.c.rpc('set_report_status', { p_report: reportId, p_status: 'under_review', p_note: 'Pris en charge' })
  ok(!review.error, 'agent moves the report to under review')
  const info = await agent.c.rpc('request_info', { p_report: reportId, p_body: 'Pouvez-vous envoyer une photo du compteur ?' })
  ok(!info.error, 'agent requests information')
  const { data: r1 } = await resident.c.from('reports').select('status').eq('id', reportId).single()
  ok(r1.status === 'awaiting_resident', 'report is now awaiting the resident')
  const reply = await resident.c.from('report_messages').insert({ report_id: reportId, body: 'Voici la photo.', is_info_request: true }).select('author_kind, is_info_request, author_name').single()
  ok(!reply.error && reply.data.author_kind === 'resident' && reply.data.is_info_request === false && reply.data.author_name === 'Amine Test', 'resident reply is stored with server-side authorship')
  const { data: techs } = await agent.c.from('technicians').select('id, name').eq('trade', 'plumbing')
  const when = new Date(Date.now() + 86400000).toISOString()
  const disp = await agent.c.rpc('dispatch_report', { p_report: reportId, p_technician: techs[0].id, p_scheduled_at: when })
  ok(!disp.error, 'agent dispatches the report to a technician')
  const { data: r2 } = await resident.c.from('reports').select('status, assignee_id, scheduled_at').eq('id', reportId).single()
  ok(r2.status === 'in_progress' && r2.scheduled_at, 'dispatch moves the report to in progress with an appointment')
  const { data: ev } = await resident.c.from('report_events').select('technician_name, scheduled_at').eq('report_id', reportId).not('technician_name', 'is', null)
  ok(ev?.length === 1 && ev[0].technician_name.includes('Karim'), 'resident sees the technician and appointment in the timeline')
  const { data: n } = await resident.c.from('notifications').select('type').eq('report_id', reportId)
  ok(['info_requested', 'intervention_scheduled'].every((t) => n.some((x) => x.type === t)), 'resident is notified of the info request and the appointment')
}

// resolution + feedback
{
  await agent.c.rpc('set_report_status', { p_report: reportId, p_status: 'resolved' })
  const early = await resident.c.rpc('submit_feedback', { p_report: reportId, p_fixed: true })
  ok(Boolean(early.error), 'feedback requires a rating')
  const reopen = await resident.c.rpc('submit_feedback', { p_report: reportId, p_fixed: false, p_comment: 'Ça goutte encore la nuit.' })
  ok(!reopen.error, 'resident reports that the problem persists')
  const { data: r3 } = await resident.c.from('reports').select('status').eq('id', reportId).single()
  ok(r3.status === 'in_progress', 'report reopened as in progress')
  await agent.c.rpc('set_report_status', { p_report: reportId, p_status: 'resolved' })
  const rate = await resident.c.rpc('submit_feedback', { p_report: reportId, p_fixed: true, p_rating: 4, p_comment: 'Merci' })
  ok(!rate.error, 'resident confirms and rates the fix')
  const twice = await resident.c.rpc('submit_feedback', { p_report: reportId, p_fixed: true, p_rating: 1 })
  ok(Boolean(twice.error), 'feedback cannot be submitted twice')
  const { data: r4 } = await agent.c.from('reports').select('feedback_rating').eq('id', reportId).single()
  ok(r4.feedback_rating === 4, 'staff sees the rating')
  const closedMsg = await agent.c.rpc('set_report_status', { p_report: reportId, p_status: 'closed' })
  const late = await resident.c.from('report_messages').insert({ report_id: reportId, body: 'Encore un mot' })
  ok(!closedMsg.error && Boolean(late.error), 'residents cannot post on a closed report')
}

// announcements + notifications
{
  const a = await agent.c.from('announcements').insert({
    residence_id: '11111111-1111-4111-8111-111111111111',
    title_fr: 'Assemblée générale', title_ar: 'جمعية عامة', body_fr: 'Rendez-vous lundi à 18h.', body_ar: 'الموعد يوم الاثنين على الساعة 18.',
  })
  ok(!a.error, 'agent publishes an announcement')
  const { data: n1 } = await resident.c.from('notifications').select('id, type').eq('type', 'announcement')
  const { data: n2 } = await outsider.c.from('notifications').select('id').eq('type', 'announcement')
  ok(n1.length === 1 && n2.length === 0, 'only residents of that residence are notified')
  const read = await resident.c.from('notifications').update({ read: true }).eq('id', n1[0].id).select('read').single()
  ok(!read.error && read.data.read === true, 'resident marks a notification as read')
  const forge = await resident.c.from('notifications').insert({ profile_id: neighbour.id, type: 'announcement' })
  ok(Boolean(forge.error), 'residents cannot create notifications')
  const resAnn = await resident.c.from('announcements').insert({ residence_id: '11111111-1111-4111-8111-111111111111', title_fr: 'Faux', title_ar: 'مزيف', body_fr: 'Faux message', body_ar: 'رسالة' })
  ok(Boolean(resAnn.error), 'residents cannot publish announcements')
}

// listings + interest
{
  const { data: l } = await resident.c.from('listings').select('id').limit(1)
  const ins = await resident.c.from('interest_requests').insert({ listing_id: l[0].id, name: 'Amine Test', phone: '+213 5 00 00 00 00' })
  ok(!ins.error, 'resident sends an interest request')
  const leak = await resident.c.from('interest_requests').select('id')
  ok(leak.data?.length === 0, 'residents cannot read interest requests')
  const { data: staffSees } = await agent.c.from('interest_requests').select('id')
  ok(staffSees.length >= 1, 'staff sees interest requests')
}

console.log(`\nAll ${passed} security checks passed.`)
process.exit(0)
