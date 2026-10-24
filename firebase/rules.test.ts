/**
 * Security rules tests, run against the Firestore emulator:
 *   npm run test:rules
 * They drive the same operations as the app and the dashboard
 * (src/services/firebase/ops.ts), plus hand-made writes that try to get
 * around the workflow.
 */
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as ops from '@/services/firebase/ops'
import { seedDemo } from '@/services/firebase/seed'
import type { NotificationDoc, ReportDoc } from '@/services/firebase/schema'

let env: RulesTestEnvironment
const as = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore() as unknown as Firestore
const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore

const admin = { uid: 'admin', name: 'Sara Admin' }
const agent = { uid: 'agent', name: 'Ali Agent' }
const amine = { uid: 'amine', fullName: 'Amine Résident', email: 'amine@example.com', phone: '+213 5 55 00 00 01' }
const nora = { uid: 'nora', fullName: 'Nora Voisine', email: 'nora@example.com', phone: null }
const jade = { uid: 'jade', fullName: 'Jade Oran', email: 'jade@example.com', phone: null }

const UNIT = 'el-bahia-a-12'
const label = { residenceName: 'Résidence El Bahia', buildingName: 'A', number: '12', floor: 2 }
const PHOTO = { id: 'p1', url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==', name: 'fuite.jpg', sizeBytes: 12 }

function newReport(id: string, over: Partial<ops.NewReport> = {}): ops.NewReport {
  return {
    id,
    unitId: UNIT,
    residenceId: 'el-bahia',
    unitLabel: label,
    category: 'water_leak',
    title: 'Fuite sous l’évier',
    description: 'De l’eau coule sous l’évier de la cuisine depuis ce matin.',
    location: 'kitchen',
    urgency: 'urgent',
    ...over,
  }
}

async function report(id: string) {
  return (await getDoc(doc(as(admin.uid), 'reports', id))).data() as ReportDoc
}

async function notificationsOf(uid: string) {
  const s = await getDocs(query(collection(as(uid), 'notifications'), where('uid', '==', uid)))
  return s.docs.map((d) => ({ id: d.id, ...(d.data() as NotificationDoc) }))
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-immo-agency',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
  await env.clearFirestore()
})

afterAll(async () => {
  await env?.cleanup()
})

describe('staff accounts', () => {
  it('a dashboard sign-up starts as pending', async () => {
    await assertSucceeds(ops.requestStaffAccess(as(admin.uid), admin.uid, { fullName: admin.name, email: 'admin@example.com' }))
    await assertSucceeds(ops.requestStaffAccess(as(agent.uid), agent.uid, { fullName: agent.name, email: 'agent@example.com' }))
  })

  it('nobody can sign up directly as an agent', async () => {
    await assertFails(setDoc(doc(as('mallory'), 'staff', 'mallory'), { role: 'agent', fullName: 'M', email: 'm@example.com', createdAt: serverTimestamp() }))
  })

  it('a pending account cannot promote itself without the bootstrap', async () => {
    await assertFails(updateDoc(doc(as(agent.uid), 'staff', agent.uid), { role: 'admin' }))
  })

  it('pending staff sees no reports', async () => {
    await assertFails(getDocs(collection(as(agent.uid), 'reports')))
  })

  it('the first account becomes admin, once', async () => {
    expect(await ops.bootstrapAdmin(as(admin.uid), admin.uid)).toBe(true)
    expect(await ops.bootstrapAdmin(as(agent.uid), agent.uid)).toBe(false)
    const db = as(agent.uid)
    const b = writeBatch(db)
    b.update(doc(db, 'staff', agent.uid), { role: 'admin' })
    b.set(doc(db, 'config', 'bootstrap'), { adminUid: agent.uid, at: serverTimestamp() })
    await assertFails(b.commit())
  })

  it('the admin approves an agent; an agent cannot change roles', async () => {
    await assertSucceeds(ops.setStaffRole(as(admin.uid), agent.uid, 'agent'))
    await ops.requestStaffAccess(as('pat'), 'pat', { fullName: 'Pat', email: 'pat@example.com' })
    await assertFails(ops.setStaffRole(as(agent.uid), 'pat', 'agent'))
    await assertFails(ops.setStaffRole(as(admin.uid), admin.uid, 'pending'))
  })

  it('staff loads the demo data', async () => {
    await assertSucceeds(seedDemo(as(admin.uid)))
    await assertSucceeds(seedDemo(as(admin.uid)))
    await assertFails(seedDemo(as('pat')))
  })
})

describe('residents and units', () => {
  it('an access code can be checked before signing in', async () => {
    expect(await ops.lookupUnitCode(anon(), 'bahia12a')).toEqual({ unitId: UNIT, residenceId: 'el-bahia' })
    expect(await ops.lookupUnitCode(anon(), 'NOPE0000')).toBeNull()
  })

  it('access codes cannot be listed by residents', async () => {
    await assertFails(getDocs(collection(as(amine.uid), 'unitCodes')))
  })

  it('a resident creates their profile and joins a unit with its code', async () => {
    for (const u of [amine, nora, jade]) await assertSucceeds(ops.ensureResidentProfile(as(u.uid), u.uid, u))
    await assertSucceeds(ops.claimUnit(as(amine.uid), amine, 'bahia12a', 'owner'))
    await assertSucceeds(ops.claimUnit(as(nora.uid), nora, 'BAHIA14A', 'tenant'))
    await assertSucceeds(ops.claimUnit(as(jade.uid), jade, 'JARDIN4C', 'owner'))
  })

  it('an invalid code is refused', async () => {
    await expect(ops.claimUnit(as(nora.uid), nora, 'ZZZZZZZZ', 'owner')).rejects.toThrow('invalid_code')
  })

  it('a membership cannot be forged with another unit’s code', async () => {
    await assertFails(
      setDoc(doc(as(nora.uid), 'memberships', `nora_${UNIT}`), {
        uid: 'nora', unitId: UNIT, residenceId: 'el-bahia', code: 'BAHIA14A', occupancy: 'owner',
        fullName: 'Nora', email: 'nora@example.com', phone: null, createdAt: serverTimestamp(),
      }),
    )
  })

  it('a resident sees their own unit and residence only', async () => {
    const db = as(amine.uid)
    await assertSucceeds(getDoc(doc(db, 'units', UNIT)))
    await assertFails(getDoc(doc(db, 'units', 'el-bahia-a-14')))
    await assertSucceeds(getDoc(doc(db, 'residences', 'el-bahia')))
    await assertFails(getDoc(doc(db, 'residences', 'jardins-oran')))
    await assertSucceeds(getDocs(query(collection(db, 'memberships'), where('uid', '==', amine.uid))))
    await assertFails(getDocs(collection(db, 'memberships')))
  })

  it('residents cannot read technicians, staff or other profiles', async () => {
    const db = as(amine.uid)
    await assertFails(getDocs(collection(db, 'technicians')))
    await assertFails(getDoc(doc(db, 'staff', admin.uid)))
    await assertFails(getDoc(doc(db, 'residents', nora.uid)))
    await assertSucceeds(getDoc(doc(db, 'residents', amine.uid)))
  })

  it('residents cannot edit residences', async () => {
    await assertFails(updateDoc(doc(as(amine.uid), 'residences', 'el-bahia'), { name: 'Hacked' }))
  })
})

describe('reports', () => {
  it('a resident files a report with a sequential number and a receipt', async () => {
    await assertSucceeds(ops.createReport(as(amine.uid), amine, newReport('r1'), [PHOTO]))
    const r = await report('r1')
    expect(r.number).toBe(1)
    expect(r.status).toBe('submitted')
    expect((await notificationsOf(amine.uid)).some((n) => n.type === 'report_submitted' && n.reportId === 'r1')).toBe(true)
  })

  it('retrying the same submission does not file it twice', async () => {
    await assertSucceeds(ops.createReport(as(amine.uid), amine, newReport('r1'), [PHOTO]))
    expect((await getDoc(doc(as(admin.uid), 'counters', 'reports'))).data()).toEqual({ next: 2 })
    expect((await getDocs(collection(as(admin.uid), 'reports', 'r1', 'photos'))).size).toBe(1)
  })

  it('the next report gets the next number', async () => {
    await ops.createReport(as(amine.uid), amine, newReport('r2', { category: 'electricity', urgency: 'normal' }))
    expect((await report('r2')).number).toBe(2)
  })

  it('a resident cannot report on someone else’s unit', async () => {
    await assertFails(ops.createReport(as(nora.uid), nora, newReport('r-bad')))
  })

  it('a report cannot be filed already resolved or with a fake number', async () => {
    const db = as(amine.uid)
    const b = writeBatch(db)
    b.set(doc(db, 'reports', 'r-forged'), {
      number: 1, unitId: UNIT, residenceId: 'el-bahia', unitLabel: label, residentId: amine.uid, residentName: 'A',
      residentPhone: null, residentEmail: null, category: 'other', title: 'Titre ok', description: 'Description assez longue.',
      location: 'other', urgency: 'low', status: 'resolved', assigneeId: null, assigneeName: null, scheduledAt: null,
      feedback: null, lastEventId: 'e', residentActivity: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    b.set(doc(db, 'reports', 'r-forged', 'events', 'e'), { status: 'resolved', note: null, source: 'resident', actorId: amine.uid, technicianName: null, scheduledAt: null, at: serverTimestamp() })
    await assertFails(b.commit())
  })

  it('staff sees new reports; neighbours and outsiders do not', async () => {
    await assertSucceeds(getDocs(collection(as(agent.uid), 'reports')))
    await assertFails(getDoc(doc(as(nora.uid), 'reports', 'r1')))
    await assertFails(getDocs(query(collection(as(nora.uid), 'reports'), where('unitId', '==', UNIT))))
    await assertSucceeds(getDocs(query(collection(as(amine.uid), 'reports'), where('unitId', '==', UNIT))))
    await assertFails(getDocs(collection(as(amine.uid), 'reports')))
  })

  it('a neighbour cannot post or add photos on the report', async () => {
    await assertFails(ops.addResidentMessage(as(nora.uid), { uid: nora.uid, name: 'Nora' }, 'r1', 'Je regarde'))
    await assertFails(ops.addPhotos(as(nora.uid), 'r1', [{ ...PHOTO, id: 'p-nora' }], { uid: nora.uid, kind: 'resident' }))
    await assertFails(getDocs(collection(as(nora.uid), 'reports', 'r1', 'photos')))
  })

  it('photos must be images, small, and attributed to the uploader', async () => {
    await assertFails(ops.addPhotos(as(amine.uid), 'r1', [{ ...PHOTO, id: 'p-js', url: 'data:text/html;base64,PHNjcmlwdD4=' }], { uid: amine.uid, kind: 'resident' }))
    await assertFails(ops.addPhotos(as(amine.uid), 'r1', [{ ...PHOTO, id: 'p-agency' }], { uid: amine.uid, kind: 'agency' }))
    await assertFails(ops.addPhotos(as(amine.uid), 'r1', [{ ...PHOTO, id: 'p-big', url: 'data:image/jpeg;base64,' + 'A'.repeat(950_000) }], { uid: amine.uid, kind: 'resident' }))
    await assertSucceeds(getDocs(collection(as(agent.uid), 'reports', 'r1', 'photos')))
  })

  it('a resident cannot change the status or assignment directly', async () => {
    const db = as(amine.uid)
    await assertFails(updateDoc(doc(db, 'reports', 'r1'), { status: 'closed', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db, 'reports', 'r1'), { assigneeName: 'Moi', updatedAt: serverTimestamp(), residentActivity: { kind: 'reply', at: serverTimestamp() } }))
  })

  it('a resident cannot notify someone else', async () => {
    await assertFails(setDoc(doc(collection(as(amine.uid), 'notifications')), { uid: nora.uid, type: 'announcement', reportId: null, unitId: null, status: null, announcementId: null, read: false, at: serverTimestamp() }))
    await assertFails(setDoc(doc(collection(as(amine.uid), 'notifications')), { uid: amine.uid, type: 'report_resolved', reportId: 'r1', unitId: UNIT, status: 'resolved', announcementId: null, read: false, at: serverTimestamp() }))
  })
})

describe('agency workflow', () => {
  it('refuses transitions outside the workflow', async () => {
    await expect(ops.setReportStatus(as(agent.uid), agent, 'r1', 'closed')).rejects.toThrow('not_allowed')
    const db = as(agent.uid)
    const b = writeBatch(db)
    b.set(doc(db, 'reports', 'r1', 'events', 'skip'), { status: 'closed', note: null, source: 'agency', actorId: agent.uid, technicianName: null, scheduledAt: null, at: serverTimestamp() })
    b.update(doc(db, 'reports', 'r1'), { status: 'closed', lastEventId: 'skip', updatedAt: serverTimestamp() })
    await assertFails(b.commit())
  })

  it('a status change must leave a timeline event', async () => {
    await assertFails(updateDoc(doc(as(agent.uid), 'reports', 'r1'), { status: 'under_review', updatedAt: serverTimestamp() }))
  })

  it('pending staff cannot act on reports', async () => {
    await assertFails(ops.setReportStatus(as('pat'), { uid: 'pat', name: 'Pat' }, 'r1', 'under_review'))
  })

  it('agent reviews, asks for information, resident replies', async () => {
    await assertSucceeds(ops.setReportStatus(as(agent.uid), agent, 'r1', 'under_review'))
    await assertSucceeds(ops.requestInfo(as(agent.uid), agent, 'r1', 'Pouvez-vous envoyer une photo du compteur ?'))
    expect((await report('r1')).status).toBe('awaiting_resident')
    await assertSucceeds(ops.addResidentMessage(as(amine.uid), { uid: amine.uid, name: amine.fullName }, 'r1', 'Voici la photo.', [{ ...PHOTO, id: 'p2' }]))
    expect((await report('r1')).residentActivity?.kind).toBe('reply')
  })

  it('a resident message cannot pretend to come from the agency', async () => {
    await assertFails(setDoc(doc(collection(as(amine.uid), 'reports', 'r1', 'messages')), { authorKind: 'agency', authorId: amine.uid, authorName: 'Agence', body: 'Clos', isInfoRequest: false, at: serverTimestamp() }))
  })

  it('dispatch needs an existing technician', async () => {
    await expect(ops.dispatchReport(as(agent.uid), agent, 'r1', 'nobody', new Date())).rejects.toThrow('not_found')
  })

  it('agent dispatches a technician with an appointment', async () => {
    const when = new Date(Date.now() + 86_400_000)
    await assertSucceeds(ops.dispatchReport(as(agent.uid), agent, 'r1', 'tech-karim', when))
    const r = await report('r1')
    expect(r.status).toBe('in_progress')
    expect(r.assigneeName).toContain('Karim')
    const events = await getDocs(collection(as(amine.uid), 'reports', 'r1', 'events'))
    expect(events.docs.some((e) => String(e.data().technicianName).includes('Karim') && e.data().scheduledAt)).toBe(true)
  })

  it('the resident is notified of the info request and the appointment', async () => {
    const types = (await notificationsOf(amine.uid)).map((n) => n.type)
    expect(types).toEqual(expect.arrayContaining(['info_requested', 'intervention_scheduled']))
    expect((await notificationsOf(nora.uid)).length).toBe(0)
  })

  it('feedback is only possible once resolved, with a 1–5 rating', async () => {
    await assertFails(ops.confirmFix(as(amine.uid), 'r1', 5, null))
    await assertSucceeds(ops.setReportStatus(as(agent.uid), agent, 'r1', 'resolved'))
    await assertFails(ops.confirmFix(as(amine.uid), 'r1', 0, null))
    await assertFails(ops.confirmFix(as(amine.uid), 'r1', 6, null))
  })

  it('the resident says the problem persists: back to in progress', async () => {
    await assertSucceeds(ops.reopenReport(as(amine.uid), { uid: amine.uid, name: amine.fullName }, 'r1', 'Ça fuit encore un peu.'))
    const r = await report('r1')
    expect(r.status).toBe('in_progress')
    expect(r.residentActivity?.kind).toBe('reopen')
  })

  it('a resident cannot reopen a report that is not resolved', async () => {
    await assertFails(ops.reopenReport(as(amine.uid), { uid: amine.uid, name: amine.fullName }, 'r2', 'Encore'))
  })

  it('the resident confirms and rates the fix, once', async () => {
    await ops.setReportStatus(as(agent.uid), agent, 'r1', 'resolved')
    await assertSucceeds(ops.confirmFix(as(amine.uid), 'r1', 4, 'Merci !'))
    expect((await report('r1')).feedback?.rating).toBe(4)
    await assertFails(ops.confirmFix(as(amine.uid), 'r1', 5, null))
  })

  it('nobody can post on a closed report except the agency', async () => {
    await assertSucceeds(ops.setReportStatus(as(agent.uid), agent, 'r1', 'closed'))
    await assertFails(ops.addResidentMessage(as(amine.uid), { uid: amine.uid, name: amine.fullName }, 'r1', 'Encore moi'))
    await assertSucceeds(ops.sendAgencyMessage(as(agent.uid), agent, 'r1', 'Dossier clôturé, merci.'))
  })

  it('only an admin can delete a report', async () => {
    const db = as(agent.uid)
    const b = writeBatch(db)
    b.delete(doc(db, 'reports', 'r2'))
    await assertFails(b.commit())
  })
})

describe('announcements and notifications', () => {
  it('only residents of the residence are notified', async () => {
    const id = await ops.publishAnnouncement(as(agent.uid), {
      residenceId: 'el-bahia', residenceName: 'Résidence El Bahia', titleFr: 'Ascenseur', titleAr: 'المصعد',
      bodyFr: 'Maintenance de l’ascenseur mardi.', bodyAr: 'صيانة المصعد يوم الثلاثاء.', important: false,
    })
    expect((await notificationsOf(amine.uid)).some((n) => n.announcementId === id)).toBe(true)
    expect((await notificationsOf(nora.uid)).some((n) => n.announcementId === id)).toBe(true)
    expect((await notificationsOf(jade.uid)).some((n) => n.announcementId === id)).toBe(false)
  })

  it('a resident reads their residence’s announcements only', async () => {
    await assertSucceeds(getDocs(query(collection(as(amine.uid), 'announcements'), where('residenceId', '==', 'el-bahia'))))
    await assertFails(getDocs(query(collection(as(amine.uid), 'announcements'), where('residenceId', '==', 'jardins-oran'))))
  })

  it('a resident marks their own notification read, nothing else', async () => {
    const [n] = await notificationsOf(amine.uid)
    await assertSucceeds(updateDoc(doc(as(amine.uid), 'notifications', n.id), { read: true }))
    await assertFails(updateDoc(doc(as(amine.uid), 'notifications', n.id), { type: 'announcement' }))
    await assertFails(updateDoc(doc(as(nora.uid), 'notifications', n.id), { read: true }))
    await assertFails(getDocs(collection(as(amine.uid), 'notifications')))
  })

  it('residents cannot publish announcements', async () => {
    await assertFails(setDoc(doc(as(amine.uid), 'announcements', 'x'), { residenceId: 'el-bahia', titleFr: 'x' }))
  })
})

describe('listings and leads', () => {
  it('published listings are public; interest requests are private to the agency', async () => {
    await assertSucceeds(getDocs(query(collection(anon(), 'listings'), where('published', '==', true))))
    await assertSucceeds(
      setDoc(doc(collection(as(amine.uid), 'interestRequests')), {
        listingId: 'demo-villa', uid: amine.uid, name: 'Amine', phone: '0555000001', email: null, message: 'Visite possible ?',
        preferredContact: 'phone', handled: false, at: serverTimestamp(),
      }),
    )
    await assertFails(getDocs(collection(as(amine.uid), 'interestRequests')))
    expect((await getDocs(collection(as(agent.uid), 'interestRequests'))).size).toBe(1)
  })

  it('unpublished listings are hidden from residents', async () => {
    await setDoc(doc(as(agent.uid), 'listings', 'draft'), { titleFr: 'Brouillon', published: false })
    await assertFails(getDoc(doc(as(amine.uid), 'listings', 'draft')))
  })
})

describe('access codes', () => {
  it('a regenerated code replaces the old one; linked residents stay linked', async () => {
    const code = await ops.regenerateAccessCode(as(agent.uid), 'el-bahia-b-21')
    expect(code).toMatch(/^[A-Z2-9]{8}$/)
    await expect(ops.claimUnit(as(jade.uid), jade, 'BAHIA21B', 'tenant')).rejects.toThrow('invalid_code')
    await assertSucceeds(ops.claimUnit(as(jade.uid), jade, code, 'tenant'))
  })

  it('staff removes a resident from a unit', async () => {
    await assertSucceeds(ops.removeMember(as(agent.uid), jade.uid, 'el-bahia-b-21'))
    await assertFails(getDoc(doc(as(jade.uid), 'units', 'el-bahia-b-21')))
    // Still a member of Les Jardins.
    await assertSucceeds(getDoc(doc(as(jade.uid), 'residences', 'jardins-oran')))
    await assertFails(getDoc(doc(as(jade.uid), 'residences', 'el-bahia')))
  })
})
