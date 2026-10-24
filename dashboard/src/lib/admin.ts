/**
 * Real-estate, team and communication management for the dashboard (staff
 * only — enforced by firebase/firestore.rules).
 */
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import * as ops from '@/services/firebase/ops'
import {
  iso,
  type AnnouncementDoc,
  type BuildingDoc,
  type InterestRequestDoc,
  type ListingDoc,
  type MembershipDoc,
  type ResidenceDoc,
  type StaffDoc,
  type StaffRole,
  type UnitDoc,
} from '@/services/firebase/schema'
import { db } from './firebase'

const all = async <T>(name: string) => (await getDocs(collection(db, name))).docs.map((d) => ({ id: d.id, ...(d.data() as T) }))
const byField = async <T>(name: string, field: string, value: string) =>
  (await getDocs(query(collection(db, name), where(field, '==', value)))).docs.map((d) => ({ id: d.id, ...(d.data() as T) }))
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr', { numeric: true })

export class InUseError extends Error {}

// ---------------------------------------------------------------- residences

export type Residence = ResidenceDoc & { id: string }
export type Unit = UnitDoc & { id: string }
export type Building = BuildingDoc & { id: string; units: Unit[] }

export async function listResidences() {
  const [residences, buildings, units] = await Promise.all([all<ResidenceDoc>('residences'), all<BuildingDoc>('buildings'), all<UnitDoc>('units')])
  return residences.sort(byName).map((r) => ({
    ...r,
    buildings: buildings.filter((b) => b.residenceId === r.id).map((b) => ({ ...b, units: units.filter((u) => u.buildingId === b.id) })),
  }))
}

export async function getResidence(id: string) {
  const snap = await getDoc(doc(db, 'residences', id))
  if (!snap.exists()) throw new ops.OpError('not_found')
  const [buildings, units, members] = await Promise.all([
    byField<BuildingDoc>('buildings', 'residenceId', id),
    byField<UnitDoc>('units', 'residenceId', id),
    byField<MembershipDoc>('memberships', 'residenceId', id),
  ])
  const sortUnits = (x: Unit, y: Unit) => (x.floor ?? 0) - (y.floor ?? 0) || x.number.localeCompare(y.number, 'fr', { numeric: true })
  return {
    residence: { id, ...(snap.data() as ResidenceDoc) },
    buildings: buildings.sort(byName).map((b): Building => ({ ...b, units: units.filter((u) => u.buildingId === b.id).sort(sortUnits) })),
    members,
  }
}

export async function createResidence(v: { name: string; address: string; city: string }) {
  const data: ResidenceDoc = {
    name: v.name.trim(),
    address: v.address.trim(),
    city: v.city.trim(),
    managerName: null,
    phone: null,
    email: null,
    emergencyPhone: null,
    guardPhone: null,
    amenities: [],
    palette: 'sand',
    style: 'block',
    floors: 5,
    createdAt: serverTimestamp(),
  }
  return (await addDoc(collection(db, 'residences'), data)).id
}

export async function updateResidence(id: string, patch: Omit<ResidenceDoc, 'createdAt'>) {
  await updateDoc(doc(db, 'residences', id), { ...patch })
}

async function hasReports(field: 'unitId' | 'residenceId', value: string) {
  return (await getDocs(query(collection(db, 'reports'), where(field, '==', value)))).size > 0
}

/** Deletes the residence with its buildings, units, codes and memberships — unless reports refer to it. */
export async function deleteResidence(id: string) {
  if (await hasReports('residenceId', id)) throw new InUseError('Des signalements sont liés à cette résidence : suppression impossible.')
  const { buildings, members } = await getResidence(id)
  const b = writeBatch(db)
  for (const building of buildings) {
    for (const u of building.units) {
      b.delete(doc(db, 'units', u.id))
      b.delete(doc(db, 'unitCodes', u.code))
    }
    b.delete(doc(db, 'buildings', building.id))
  }
  for (const m of members) {
    b.delete(doc(db, 'memberships', m.id))
    b.delete(doc(db, 'residenceMembers', `${id}_${m.uid}`))
  }
  for (const a of await byField<AnnouncementDoc>('announcements', 'residenceId', id)) b.delete(doc(db, 'announcements', a.id))
  b.delete(doc(db, 'residences', id))
  await b.commit()
}

export async function addBuilding(residenceId: string, name: string) {
  await addDoc(collection(db, 'buildings'), { residenceId, name: name.trim() } satisfies BuildingDoc)
}

export async function deleteBuilding(id: string) {
  if ((await byField<UnitDoc>('units', 'buildingId', id)).length) throw new InUseError('Supprimez d’abord les logements de ce bâtiment.')
  await deleteDoc(doc(db, 'buildings', id))
}

export async function addUnit(building: { id: string; name: string; residenceId: string }, v: { number: string; floor: number | null; areaSqm: number | null; rooms: number | null }) {
  return ops.createUnit(db, { residenceId: building.residenceId, buildingId: building.id, buildingName: building.name, ...v })
}

export async function deleteUnit(unit: Unit) {
  if (await hasReports('unitId', unit.id)) throw new InUseError('Des signalements sont liés à ce logement : suppression impossible.')
  for (const m of await byField<MembershipDoc>('memberships', 'unitId', unit.id)) await ops.removeMember(db, m.uid, unit.id)
  const b = writeBatch(db)
  b.delete(doc(db, 'unitCodes', unit.code))
  b.delete(doc(db, 'units', unit.id))
  await b.commit()
}

export const regenerateCode = (unitId: string) => ops.regenerateAccessCode(db, unitId)
export const removeMember = (uid: string, unitId: string) => ops.removeMember(db, uid, unitId)

// ---------------------------------------------------------------- technicians

export async function addTechnician(v: { name: string; trade: string; phone: string | null; company: string | null }) {
  await addDoc(collection(db, 'technicians'), { ...v, active: true, createdAt: serverTimestamp() })
}

export async function setTechnicianActive(id: string, active: boolean) {
  await updateDoc(doc(db, 'technicians', id), { active })
}

// ---------------------------------------------------------------- team

export async function listTeam() {
  return (await all<StaffDoc>('staff')).map((s) => ({ ...s, created_at: iso(s.createdAt) })).sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export const setRole = (uid: string, role: StaffRole) => ops.setStaffRole(db, uid, role)

// ---------------------------------------------------------------- announcements

export async function listAnnouncements() {
  return (await all<AnnouncementDoc>('announcements'))
    .map((a) => ({ ...a, published_at: iso(a.publishedAt) }))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, 100)
}

export const deleteAnnouncement = (id: string) => deleteDoc(doc(db, 'announcements', id))
export const publishAnnouncement = (a: Omit<AnnouncementDoc, 'publishedAt'>) => ops.publishAnnouncement(db, a)

// ---------------------------------------------------------------- leads

export async function listLeads() {
  const [leads, listings] = await Promise.all([all<InterestRequestDoc>('interestRequests'), all<ListingDoc>('listings')])
  return leads
    .map((l) => ({ ...l, at: iso(l.at), listing: listings.find((x) => x.id === l.listingId) ?? null }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 200)
}

export const setLeadHandled = (id: string, handled: boolean) => updateDoc(doc(db, 'interestRequests', id), { handled })
