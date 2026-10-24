/**
 * Fictional demo content (residences, apartments with fixed access codes,
 * technicians, announcements, listings). Loaded from the dashboard by an admin
 * ("Charger les exemples"); fixed ids make it safe to run twice.
 */
import { doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore'
import type { AnnouncementDoc, BuildingDoc, ListingDoc, ResidenceDoc, TechnicianDoc, UnitCodeDoc, UnitDoc } from './schema'

const residences: Record<string, Omit<ResidenceDoc, 'createdAt'>> = {
  'el-bahia': {
    name: 'Résidence El Bahia',
    address: '12 Boulevard des Palmiers',
    city: 'Alger',
    managerName: 'Agence Horizon',
    phone: '+213 21 00 00 00',
    email: 'contact@example.com',
    emergencyPhone: '+213 21 00 00 99',
    guardPhone: '+213 5 00 00 00 10',
    amenities: ['elevator', 'parking', 'concierge', 'security'],
    palette: 'sand',
    style: 'block',
    floors: 5,
  },
  'jardins-oran': {
    name: 'Les Jardins d’Oran',
    address: '8 Rue des Orangers',
    city: 'Oran',
    managerName: 'Agence Horizon',
    phone: '+213 41 00 00 01',
    email: 'jardins@example.com',
    emergencyPhone: '+213 41 00 00 99',
    guardPhone: null,
    amenities: ['garden', 'parking', 'pool'],
    palette: 'olive',
    style: 'terrace',
    floors: 3,
  },
}

const buildings: Record<string, BuildingDoc> = {
  'el-bahia-a': { residenceId: 'el-bahia', name: 'A' },
  'el-bahia-b': { residenceId: 'el-bahia', name: 'B' },
  'jardins-oran-c': { residenceId: 'jardins-oran', name: 'C' },
}

const units: Record<string, Omit<UnitDoc, 'createdAt' | 'residenceId' | 'buildingName'>> = {
  'el-bahia-a-12': { buildingId: 'el-bahia-a', floor: 2, number: '12', areaSqm: 85, rooms: 3, code: 'BAHIA12A' },
  'el-bahia-a-14': { buildingId: 'el-bahia-a', floor: 3, number: '14', areaSqm: 92, rooms: 4, code: 'BAHIA14A' },
  'el-bahia-b-21': { buildingId: 'el-bahia-b', floor: 1, number: '21', areaSqm: 64, rooms: 2, code: 'BAHIA21B' },
  'jardins-oran-c-4': { buildingId: 'jardins-oran-c', floor: 0, number: '4', areaSqm: 112, rooms: 4, code: 'JARDIN4C' },
}

const technicians: Record<string, Omit<TechnicianDoc, 'createdAt'>> = {
  'tech-karim': { name: 'Karim Belkacem', trade: 'plumbing', phone: '+213 5 00 00 01 01', company: 'Plomberie Express', active: true },
  'tech-yacine': { name: 'Yacine Haddad', trade: 'electricity', phone: '+213 5 00 00 01 02', company: null, active: true },
  'tech-nadia': { name: 'Nadia Mansouri', trade: 'hvac', phone: '+213 5 00 00 01 03', company: 'Clim Service', active: true },
  'tech-entretien': { name: 'Équipe entretien', trade: 'cleaning', phone: '+213 5 00 00 01 04', company: 'Agence Horizon', active: true },
}

const announcements: Record<string, Omit<AnnouncementDoc, 'publishedAt'>> = {
  'demo-water-cut': {
    residenceId: 'el-bahia',
    residenceName: 'Résidence El Bahia',
    titleFr: 'Coupure d’eau programmée',
    titleAr: 'انقطاع مبرمج للماء',
    bodyFr: 'Une coupure d’eau est prévue jeudi de 8h à 14h dans le bâtiment A pour l’entretien des canalisations.',
    bodyAr: 'من المقرر انقطاع الماء يوم الخميس من الساعة 8 إلى 14 في العمارة A لصيانة القنوات.',
    important: true,
  },
  'demo-gardens': {
    residenceId: 'jardins-oran',
    residenceName: 'Les Jardins d’Oran',
    titleFr: 'Entretien des espaces verts',
    titleAr: 'صيانة المساحات الخضراء',
    bodyFr: 'Les jardiniers interviendront lundi matin. Merci de libérer les allées.',
    bodyAr: 'سيتدخل البستانيون صباح يوم الاثنين. يرجى إخلاء الممرات.',
    important: false,
  },
}

const listings: Record<string, Omit<ListingDoc, 'createdAt'>> = {
  'demo-t3-hydra': {
    titleFr: 'Résidence Les Jardins — T3 lumineux',
    titleAr: 'إقامة الحدائق — شقة مشرقة من 3 غرف',
    descriptionFr: 'Appartement traversant avec balcon, cuisine équipée et place de parking en sous-sol.',
    descriptionAr: 'شقة مزدوجة الواجهة مع شرفة ومطبخ مجهز ومكان لركن السيارة في الطابق السفلي.',
    kind: 'apartment',
    transaction: 'sale',
    city: 'Alger',
    district: 'Hydra',
    areaSqm: 82,
    rooms: 3,
    bedrooms: 2,
    price: 14500000,
    features: ['elevator', 'parking', 'security'],
    palette: 'sand',
    style: 'block',
    floors: 6,
    published: true,
  },
  'demo-t2-oran': {
    titleFr: 'Résidence Al Noor — T2 rénové',
    titleAr: 'إقامة النور — شقة من غرفتين مجددة',
    descriptionFr: 'T2 entièrement rénové, proche des commerces et du tramway.',
    descriptionAr: 'شقة من غرفتين مجددة بالكامل، قريبة من المحلات والترامواي.',
    kind: 'apartment',
    transaction: 'sale',
    city: 'Oran',
    district: 'Centre',
    areaSqm: 64,
    rooms: 2,
    bedrooms: 1,
    price: 9800000,
    features: ['elevator', 'concierge'],
    palette: 'terracotta',
    style: 'block',
    floors: 4,
    published: true,
  },
  'demo-villa': {
    titleFr: 'Villa avec jardin',
    titleAr: 'فيلا مع حديقة',
    descriptionFr: 'Villa familiale sur deux niveaux avec jardin arboré. Prix communiqué sur demande.',
    descriptionAr: 'فيلا عائلية من طابقين مع حديقة مشجرة. السعر عند الطلب.',
    kind: 'house',
    transaction: 'sale',
    city: 'Constantine',
    district: null,
    areaSqm: 240,
    rooms: 6,
    bedrooms: 4,
    price: null,
    features: ['garden', 'pool', 'parking'],
    palette: 'stone',
    style: 'villa',
    floors: 2,
    published: true,
  },
  'demo-studio': {
    titleFr: 'Studio meublé à louer',
    titleAr: 'استوديو مفروش للكراء',
    descriptionFr: 'Studio meublé idéal pour étudiant ou jeune actif, charges incluses.',
    descriptionAr: 'استوديو مفروش مثالي للطلبة أو الموظفين الشباب، التكاليف مشمولة.',
    kind: 'apartment',
    transaction: 'rent',
    city: 'Alger',
    district: 'Didouche Mourad',
    areaSqm: 34,
    rooms: 1,
    bedrooms: null,
    price: 45000,
    features: ['elevator', 'security'],
    palette: 'sky',
    style: 'tower',
    floors: 8,
    published: true,
  },
}

/** Staff only (enforced by the rules). Overwrites the demo documents, nothing else. */
export async function seedDemo(db: Firestore) {
  const b = writeBatch(db)
  const now = serverTimestamp()
  for (const [id, r] of Object.entries(residences)) b.set(doc(db, 'residences', id), { ...r, createdAt: now } satisfies ResidenceDoc)
  for (const [id, x] of Object.entries(buildings)) b.set(doc(db, 'buildings', id), x)
  for (const [id, u] of Object.entries(units)) {
    const building = buildings[u.buildingId]
    b.set(doc(db, 'units', id), { ...u, residenceId: building.residenceId, buildingName: building.name, createdAt: now } satisfies UnitDoc)
    b.set(doc(db, 'unitCodes', u.code), { unitId: id, residenceId: building.residenceId } satisfies UnitCodeDoc)
  }
  for (const [id, t] of Object.entries(technicians)) b.set(doc(db, 'technicians', id), { ...t, createdAt: now } satisfies TechnicianDoc)
  for (const [id, a] of Object.entries(announcements)) b.set(doc(db, 'announcements', id), { ...a, publishedAt: now } satisfies AnnouncementDoc)
  for (const [id, l] of Object.entries(listings)) b.set(doc(db, 'listings', id), { ...l, createdAt: now } satisfies ListingDoc)
  await b.commit()
}
