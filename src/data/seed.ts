/**
 * FICTIONAL DEVELOPMENT DATA.
 *
 * Every name, address, phone number, price and listing below is invented for
 * the prototype. Nothing here describes a real person, agency or property.
 * Dates are generated relative to "now" so the demo never looks stale.
 */
import type {
  Announcement,
  AppNotification,
  Listing,
  NotificationPreferences,
  Property,
  Report,
  Resident,
} from '@/types'

export type Dataset = 'demo' | 'empty'

export interface SeedData {
  resident: Resident
  properties: Property[]
  reports: Report[]
  notifications: AppNotification[]
  announcements: Announcement[]
  listings: Listing[]
  preferences: NotificationPreferences
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

function ago(now: number, ms: number): string {
  return new Date(now - ms).toISOString()
}

const AGENCY = 'Agence Horizon'

export function createSeed(dataset: Dataset, now = Date.now()): SeedData {
  const year = new Date(now).getFullYear()
  const preferences: NotificationPreferences = {
    reportUpdates: true,
    infoRequests: true,
    announcements: true,
    listings: false,
  }
  const listings = createListings()

  if (dataset === 'empty') {
    return {
      resident: {
        id: 'res-demo-empty',
        firstName: 'Salma',
        lastName: 'Bennani',
        email: 'salma.demo@example.com',
        propertyIds: [],
        memberSince: ago(now, 3 * DAY),
      },
      properties: [],
      reports: [],
      notifications: [],
      announcements: [],
      listings,
      preferences,
    }
  }

  const properties: Property[] = [
    {
      id: 'prop-bahia-a12',
      residenceName: 'Résidence El Bahia',
      building: 'A',
      floor: 2,
      unit: '12',
      address: '12 Boulevard des Palmiers',
      city: 'Alger',
      areaSqm: 85,
      rooms: 3,
      role: 'tenant',
      visual: { palette: 'sand', floors: 5, style: 'block' },
      residenceContact: { phone: '+213 21 00 00 00', email: 'contact@example.com', manager: AGENCY },
      amenities: ['elevator', 'parking', 'concierge', 'security'],
    },
    {
      id: 'prop-jardins-c04',
      residenceName: 'Les Jardins d’Oran',
      building: 'C',
      floor: 0,
      unit: '4',
      address: '8 Rue des Orangers',
      city: 'Oran',
      areaSqm: 112,
      rooms: 4,
      role: 'owner',
      visual: { palette: 'olive', floors: 3, style: 'terrace' },
      residenceContact: { phone: '+213 41 00 00 01', email: 'jardins@example.com', manager: AGENCY },
      amenities: ['garden', 'parking', 'pool'],
    },
  ]

  const reports: Report[] = [
    {
      id: 'rep-0147',
      reference: `SR-${year}-0147`,
      propertyId: 'prop-bahia-a12',
      categoryId: 'water_leak',
      title: 'Fuite d’eau sous le lavabo',
      description:
        'De l’eau s’accumule sous le lavabo de la salle de bain depuis hier soir. Le meuble commence à gonfler.',
      location: 'bathroom',
      urgency: 'normal',
      status: 'in_progress',
      createdAt: ago(now, 2 * DAY + 3 * HOUR),
      updatedAt: ago(now, 5 * HOUR),
      attachments: [],
      history: [
        { id: 'h1', status: 'submitted', at: ago(now, 2 * DAY + 3 * HOUR), source: 'resident' },
        { id: 'h2', status: 'under_review', at: ago(now, 2 * DAY + HOUR), source: 'agency' },
        { id: 'h3', status: 'in_progress', at: ago(now, 5 * HOUR), source: 'agency', note: 'timeline.notes.technicianScheduled' },
      ],
      messages: [
        {
          id: 'm1',
          author: 'agency',
          authorName: AGENCY,
          body: 'Bonjour, notre plombier passera demain entre 9h et 12h. Merci de laisser l’accès à la salle de bain dégagé.',
          at: ago(now, 5 * HOUR),
          attachments: [],
        },
      ],
    },
    {
      id: 'rep-0139',
      reference: `SR-${year}-0139`,
      propertyId: 'prop-bahia-a12',
      categoryId: 'electricity',
      title: 'Prise de la cuisine sans courant',
      description: 'La prise située à côté du réfrigérateur ne fonctionne plus. Le disjoncteur n’a pas sauté.',
      location: 'kitchen',
      urgency: 'low',
      status: 'awaiting_resident',
      createdAt: ago(now, 6 * DAY),
      updatedAt: ago(now, 1 * DAY),
      attachments: [],
      history: [
        { id: 'h1', status: 'submitted', at: ago(now, 6 * DAY), source: 'resident' },
        { id: 'h2', status: 'under_review', at: ago(now, 5 * DAY), source: 'agency' },
        { id: 'h3', status: 'awaiting_resident', at: ago(now, 1 * DAY), source: 'agency' },
      ],
      messages: [
        {
          id: 'm1',
          author: 'agency',
          authorName: AGENCY,
          body: 'Pourriez-vous nous envoyer une photo du tableau électrique et nous indiquer vos disponibilités cette semaine ?',
          at: ago(now, 1 * DAY),
          attachments: [],
          isInfoRequest: true,
        },
      ],
    },
    {
      id: 'rep-0128',
      reference: `SR-${year}-0128`,
      propertyId: 'prop-bahia-a12',
      categoryId: 'common_areas',
      title: 'Ascenseur bloqué au 3e étage',
      description: 'L’ascenseur du bâtiment A reste bloqué au 3e étage, les portes ne s’ouvrent plus.',
      location: 'common_area',
      urgency: 'urgent',
      status: 'resolved',
      createdAt: ago(now, 18 * DAY),
      updatedAt: ago(now, 15 * DAY),
      attachments: [],
      history: [
        { id: 'h1', status: 'submitted', at: ago(now, 18 * DAY), source: 'resident' },
        { id: 'h2', status: 'under_review', at: ago(now, 18 * DAY - 2 * HOUR), source: 'agency' },
        { id: 'h3', status: 'in_progress', at: ago(now, 17 * DAY), source: 'agency' },
        { id: 'h4', status: 'resolved', at: ago(now, 15 * DAY), source: 'agency', note: 'timeline.notes.repaired' },
      ],
      messages: [],
    },
    {
      id: 'rep-0119',
      reference: `SR-${year}-0119`,
      propertyId: 'prop-jardins-c04',
      categoryId: 'hvac',
      title: 'Climatisation du salon bruyante',
      description: 'Le climatiseur du salon fait un bruit de vibration important au démarrage.',
      location: 'living_room',
      urgency: 'low',
      status: 'closed',
      createdAt: ago(now, 34 * DAY),
      updatedAt: ago(now, 26 * DAY),
      attachments: [],
      history: [
        { id: 'h1', status: 'submitted', at: ago(now, 34 * DAY), source: 'resident' },
        { id: 'h2', status: 'under_review', at: ago(now, 33 * DAY), source: 'agency' },
        { id: 'h3', status: 'in_progress', at: ago(now, 31 * DAY), source: 'agency' },
        { id: 'h4', status: 'resolved', at: ago(now, 28 * DAY), source: 'agency' },
        { id: 'h5', status: 'closed', at: ago(now, 26 * DAY), source: 'agency' },
      ],
      messages: [],
    },
  ]

  const announcements: Announcement[] = [
    {
      id: 'ann-water',
      propertyIds: ['prop-bahia-a12'],
      title: { fr: 'Coupure d’eau programmée', ar: 'انقطاع مبرمج للماء' },
      body: {
        fr: 'Une coupure d’eau est prévue jeudi de 8h à 14h dans le bâtiment A pour l’entretien des canalisations.',
        ar: 'من المقرر انقطاع الماء يوم الخميس من الساعة 8 إلى 14 في العمارة A لصيانة القنوات.',
      },
      publishedAt: ago(now, 10 * HOUR),
      important: true,
    },
    {
      id: 'ann-garden',
      propertyIds: ['prop-jardins-c04'],
      title: { fr: 'Entretien des espaces verts', ar: 'صيانة المساحات الخضراء' },
      body: {
        fr: 'Les jardiniers interviendront lundi matin. Merci de libérer les allées.',
        ar: 'سيتدخل البستانيون صباح يوم الاثنين. يرجى إخلاء الممرات.',
      },
      publishedAt: ago(now, 3 * DAY),
    },
  ]

  const notifications: AppNotification[] = [
    { id: 'n1', type: 'report_status_changed', at: ago(now, 5 * HOUR), read: false, reportId: 'rep-0147', status: 'in_progress' },
    { id: 'n2', type: 'announcement', at: ago(now, 10 * HOUR), read: false, announcementId: 'ann-water', propertyId: 'prop-bahia-a12' },
    { id: 'n3', type: 'info_requested', at: ago(now, 1 * DAY), read: true, reportId: 'rep-0139', status: 'awaiting_resident' },
    { id: 'n4', type: 'report_resolved', at: ago(now, 15 * DAY), read: true, reportId: 'rep-0128', status: 'resolved' },
  ]

  return {
    resident: {
      id: 'res-demo',
      firstName: 'Amine',
      lastName: 'El Fassi',
      email: 'amine.demo@example.com',
      phone: '+213 5 00 00 00 00',
      propertyIds: properties.map((p) => p.id),
      memberSince: ago(now, 400 * DAY),
    },
    properties,
    reports,
    notifications,
    announcements,
    listings,
    preferences,
  }
}

function createListings(): Listing[] {
  return [
    {
      id: 'lst-jardins',
      title: { fr: 'Résidence Les Jardins — T3 lumineux', ar: 'إقامة الحدائق — شقة مشرقة من 3 غرف' },
      description: {
        fr: 'Appartement traversant avec balcon, cuisine équipée et place de parking en sous-sol.',
        ar: 'شقة مزدوجة الواجهة مع شرفة ومطبخ مجهز ومكان لركن السيارة في الطابق السفلي.',
      },
      kind: 'apartment',
      transaction: 'sale',
      city: 'Alger',
      district: 'Hydra',
      areaSqm: 82,
      rooms: 3,
      bedrooms: 2,
      price: 14_500_000,
      visual: { palette: 'sand', floors: 6, style: 'block' },
      features: ['elevator', 'parking', 'security'],
    },
    {
      id: 'lst-alnoor',
      title: { fr: 'Résidence Al Noor — T2 rénové', ar: 'إقامة النور — شقة من غرفتين مجددة' },
      description: {
        fr: 'T2 entièrement rénové, proche des commerces et du tramway.',
        ar: 'شقة من غرفتين مجددة بالكامل، قريبة من المحلات والترامواي.',
      },
      kind: 'apartment',
      transaction: 'sale',
      city: 'Oran',
      district: 'Centre',
      areaSqm: 64,
      rooms: 2,
      bedrooms: 1,
      price: 9_800_000,
      visual: { palette: 'terracotta', floors: 4, style: 'block' },
      features: ['elevator', 'concierge'],
    },
    {
      id: 'lst-villa',
      title: { fr: 'Villa avec jardin', ar: 'فيلا مع حديقة' },
      description: {
        fr: 'Villa familiale sur deux niveaux avec jardin arboré. Prix communiqué sur demande.',
        ar: 'فيلا عائلية من طابقين مع حديقة مشجرة. السعر عند الطلب.',
      },
      kind: 'house',
      transaction: 'sale',
      city: 'Constantine',
      areaSqm: 240,
      rooms: 6,
      bedrooms: 4,
      visual: { palette: 'stone', floors: 2, style: 'villa' },
      features: ['garden', 'pool', 'parking'],
    },
    {
      id: 'lst-studio',
      title: { fr: 'Studio meublé à louer', ar: 'استوديو مفروش للكراء' },
      description: {
        fr: 'Studio meublé idéal pour étudiant ou jeune actif, charges incluses.',
        ar: 'استوديو مفروش مثالي للطلبة أو الموظفين الشباب، التكاليف مشمولة.',
      },
      kind: 'apartment',
      transaction: 'rent',
      city: 'Alger',
      district: 'Didouche Mourad',
      areaSqm: 34,
      rooms: 1,
      price: 45_000,
      visual: { palette: 'sky', floors: 8, style: 'tower' },
      features: ['elevator', 'security'],
    },
    {
      id: 'lst-maison',
      title: { fr: 'Maison de ville à louer', ar: 'منزل حضري للكراء' },
      description: {
        fr: 'Maison de ville avec terrasse sur le toit, à deux pas de la plage.',
        ar: 'منزل حضري مع سطح، على بعد خطوات من الشاطئ.',
      },
      kind: 'house',
      transaction: 'rent',
      city: 'Tipaza',
      areaSqm: 130,
      rooms: 4,
      bedrooms: 3,
      price: 90_000,
      visual: { palette: 'olive', floors: 2, style: 'terrace' },
      features: ['parking'],
    },
  ]
}
