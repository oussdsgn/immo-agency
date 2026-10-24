-- Demo data (fictional). Loaded by `supabase db reset` locally; for a hosted
-- project it is optional (see docs/SUPABASE_SETUP.md). No user accounts here.

insert into public.residences (id, name, address, city, manager_name, phone, email, emergency_phone, guard_phone, amenities, palette, style, floors) values
  ('11111111-1111-4111-8111-111111111111', 'Résidence El Bahia', '12 Boulevard des Palmiers', 'Alger', 'Agence Horizon',
   '+213 21 00 00 00', 'contact@example.com', '+213 21 00 00 99', '+213 5 00 00 00 10', '{elevator,parking,concierge,security}', 'sand', 'block', 5),
  ('22222222-2222-4222-8222-222222222222', 'Les Jardins d’Oran', '8 Rue des Orangers', 'Oran', 'Agence Horizon',
   '+213 41 00 00 01', 'jardins@example.com', '+213 41 00 00 99', null, '{garden,parking,pool}', 'olive', 'terrace', 3);

insert into public.buildings (id, residence_id, name) values
  ('aaaaaaa1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'A'),
  ('aaaaaaa1-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'B'),
  ('aaaaaaa2-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'C');

-- Fixed access codes so the demo is reproducible.
insert into public.units (id, building_id, floor, number, area_sqm, rooms, access_code) values
  ('bbbbbbb1-0000-4000-8000-000000000012', 'aaaaaaa1-0000-4000-8000-000000000001', 2, '12', 85, 3, 'BAHIA12A'),
  ('bbbbbbb1-0000-4000-8000-000000000014', 'aaaaaaa1-0000-4000-8000-000000000001', 3, '14', 92, 4, 'BAHIA14A'),
  ('bbbbbbb1-0000-4000-8000-000000000021', 'aaaaaaa1-0000-4000-8000-000000000002', 1, '21', 64, 2, 'BAHIA21B'),
  ('bbbbbbb2-0000-4000-8000-000000000004', 'aaaaaaa2-0000-4000-8000-000000000001', 0, '4', 112, 4, 'JARDIN4C');

insert into public.technicians (name, trade, phone, company) values
  ('Karim Belkacem', 'plumbing', '+213 5 00 00 01 01', 'Plomberie Express'),
  ('Yacine Haddad', 'electricity', '+213 5 00 00 01 02', null),
  ('Nadia Mansouri', 'hvac', '+213 5 00 00 01 03', 'Clim Service'),
  ('Équipe entretien', 'cleaning', '+213 5 00 00 01 04', 'Agence Horizon');

insert into public.announcements (residence_id, title_fr, title_ar, body_fr, body_ar, important, published_at) values
  ('11111111-1111-4111-8111-111111111111', 'Coupure d’eau programmée', 'انقطاع مبرمج للماء',
   'Une coupure d’eau est prévue jeudi de 8h à 14h dans le bâtiment A pour l’entretien des canalisations.',
   'من المقرر انقطاع الماء يوم الخميس من الساعة 8 إلى 14 في العمارة A لصيانة القنوات.', true, now() - interval '10 hours'),
  ('22222222-2222-4222-8222-222222222222', 'Entretien des espaces verts', 'صيانة المساحات الخضراء',
   'Les jardiniers interviendront lundi matin. Merci de libérer les allées.',
   'سيتدخل البستانيون صباح يوم الاثنين. يرجى إخلاء الممرات.', false, now() - interval '3 days');

insert into public.listings (title_fr, title_ar, description_fr, description_ar, kind, transaction, city, district, area_sqm, rooms, bedrooms, price, features, palette, style, floors) values
  ('Résidence Les Jardins — T3 lumineux', 'إقامة الحدائق — شقة مشرقة من 3 غرف',
   'Appartement traversant avec balcon, cuisine équipée et place de parking en sous-sol.',
   'شقة مزدوجة الواجهة مع شرفة ومطبخ مجهز ومكان لركن السيارة في الطابق السفلي.',
   'apartment', 'sale', 'Alger', 'Hydra', 82, 3, 2, 14500000, '{elevator,parking,security}', 'sand', 'block', 6),
  ('Résidence Al Noor — T2 rénové', 'إقامة النور — شقة من غرفتين مجددة',
   'T2 entièrement rénové, proche des commerces et du tramway.', 'شقة من غرفتين مجددة بالكامل، قريبة من المحلات والترامواي.',
   'apartment', 'sale', 'Oran', 'Centre', 64, 2, 1, 9800000, '{elevator,concierge}', 'terracotta', 'block', 4),
  ('Villa avec jardin', 'فيلا مع حديقة',
   'Villa familiale sur deux niveaux avec jardin arboré. Prix communiqué sur demande.', 'فيلا عائلية من طابقين مع حديقة مشجرة. السعر عند الطلب.',
   'house', 'sale', 'Constantine', null, 240, 6, 4, null, '{garden,pool,parking}', 'stone', 'villa', 2),
  ('Studio meublé à louer', 'استوديو مفروش للكراء',
   'Studio meublé idéal pour étudiant ou jeune actif, charges incluses.', 'استوديو مفروش مثالي للطلبة أو الموظفين الشباب، التكاليف مشمولة.',
   'apartment', 'rent', 'Alger', 'Didouche Mourad', 34, 1, null, 45000, '{elevator,security}', 'sky', 'tower', 8);
