-- IMMO Agency — shared backend for the resident app and the agency dashboard.
--
-- Security model
--   * Residents see only the units they are members of (and those units'
--     reports, residence, announcements). They can create reports and
--     messages; they can never change a report's status directly.
--   * Staff (role agent/admin) see and manage everything.
--   * Every status change, dispatch and info request goes through
--     SECURITY DEFINER functions that enforce the workflow and write the
--     timeline + notifications in the same transaction.
--   * New dashboard sign-ups are `pending_staff` until an admin approves them.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('resident', 'pending_staff', 'agent', 'admin');
create type public.report_status as enum (
  'submitted', 'under_review', 'in_progress', 'awaiting_resident', 'resolved', 'closed', 'rejected'
);
create type public.occupancy as enum ('owner', 'tenant');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 30),
  email text,
  role public.user_role not null default 'resident',
  notification_prefs jsonb not null default
    '{"reportUpdates": true, "infoRequests": true, "announcements": true, "listings": false}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Real estate
-- ---------------------------------------------------------------------------
create table public.residences (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  address text not null default '',
  city text not null default '',
  manager_name text,
  phone text,
  email text,
  emergency_phone text,
  guard_phone text,
  amenities text[] not null default '{}',
  -- Visual seed for the illustration used by the apps.
  palette text not null default 'sand' check (palette in ('sand', 'terracotta', 'stone', 'olive', 'sky')),
  style text not null default 'block' check (style in ('tower', 'block', 'villa', 'terrace')),
  floors int not null default 4 check (floors between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  residence_id uuid not null references public.residences (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (residence_id, name)
);

-- Unambiguous alphabet (no 0/O/1/I) for codes residents type by hand.
create function public.new_access_code() returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 32), 1), '')
  from (select gen_random_bytes(8) as b) r, generate_series(0, 7) as i
$$;

create table public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  floor int,
  number text not null check (char_length(number) between 1 and 20),
  area_sqm numeric(7, 1) check (area_sqm > 0),
  rooms int check (rooms between 0 and 50),
  access_code text not null unique default public.new_access_code(),
  created_at timestamptz not null default now(),
  unique (building_id, number)
);

create table public.unit_members (
  unit_id uuid not null references public.units (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  occupancy public.occupancy not null default 'tenant',
  created_at timestamptz not null default now(),
  primary key (unit_id, profile_id)
);
create index on public.unit_members (profile_id);

-- ---------------------------------------------------------------------------
-- Maintenance
-- ---------------------------------------------------------------------------
create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  trade text not null default 'other',
  phone text,
  company text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence public.report_ref_seq start 1;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  unit_id uuid not null references public.units (id) on delete restrict,
  resident_id uuid references public.profiles (id) on delete set null,
  category text not null check (category in (
    'plumbing', 'water_leak', 'electricity', 'hvac', 'doors_windows',
    'common_areas', 'structural', 'cleaning', 'other')),
  title text not null check (char_length(btrim(title)) between 5 and 80),
  description text not null check (char_length(btrim(description)) between 15 and 1000),
  location text not null check (location in (
    'kitchen', 'bathroom', 'bedroom', 'living_room', 'balcony', 'entrance',
    'common_area', 'parking', 'other')),
  urgency text not null default 'normal' check (urgency in ('low', 'normal', 'urgent')),
  status public.report_status not null default 'submitted',
  assignee_id uuid references public.technicians (id) on delete set null,
  scheduled_at timestamptz,
  feedback_rating smallint check (feedback_rating between 1 and 5),
  feedback_comment text check (char_length(feedback_comment) <= 500),
  feedback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.reports (unit_id);
create index on public.reports (status);
create index on public.reports (assignee_id);

create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  status public.report_status not null,
  note text check (char_length(note) <= 500),
  source text not null check (source in ('resident', 'agency', 'system')),
  actor_id uuid references public.profiles (id) on delete set null,
  technician_name text,
  scheduled_at timestamptz,
  at timestamptz not null default now()
);
create index on public.report_events (report_id, at);

create table public.report_messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_kind text not null check (author_kind in ('resident', 'agency')),
  author_name text not null default '',
  body text not null default '' check (char_length(body) <= 1000),
  is_info_request boolean not null default false,
  at timestamptz not null default now()
);
create index on public.report_messages (report_id, at);

create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  message_id uuid references public.report_messages (id) on delete set null,
  path text not null unique,
  name text not null default 'photo.jpg',
  size_bytes int not null default 0,
  added_by uuid references public.profiles (id) on delete set null,
  added_kind text not null check (added_kind in ('resident', 'agency')),
  at timestamptz not null default now()
);
create index on public.report_photos (report_id);

-- ---------------------------------------------------------------------------
-- Communication
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  residence_id uuid not null references public.residences (id) on delete cascade,
  title_fr text not null check (char_length(title_fr) between 3 and 120),
  title_ar text not null check (char_length(title_ar) between 2 and 120),
  body_fr text not null check (char_length(body_fr) between 3 and 2000),
  body_ar text not null check (char_length(body_ar) between 2 and 2000),
  important boolean not null default false,
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now()
);
create index on public.announcements (residence_id, published_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'report_submitted', 'report_status_changed', 'info_requested', 'report_resolved',
    'agency_message', 'intervention_scheduled', 'announcement')),
  report_id uuid references public.reports (id) on delete cascade,
  announcement_id uuid references public.announcements (id) on delete cascade,
  status public.report_status,
  read boolean not null default false,
  at timestamptz not null default now()
);
create index on public.notifications (profile_id, at desc);

-- ---------------------------------------------------------------------------
-- Acquisition
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title_fr text not null,
  title_ar text not null,
  description_fr text not null default '',
  description_ar text not null default '',
  kind text not null check (kind in ('apartment', 'house')),
  transaction text not null check (transaction in ('sale', 'rent')),
  city text not null,
  district text,
  area_sqm numeric(7, 1),
  rooms int,
  bedrooms int,
  price numeric(14, 0) check (price >= 0),
  features text[] not null default '{}',
  palette text not null default 'sand',
  style text not null default 'block',
  floors int not null default 4,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.interest_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null default auth.uid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  phone text not null check (char_length(phone) between 8 and 30),
  email text,
  message text check (char_length(message) <= 800),
  preferred_contact text not null default 'phone' check (preferred_contact in ('phone', 'email')),
  handled boolean not null default false,
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------
create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('agent', 'admin'))
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create function public.is_unit_member(p_unit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from unit_members where unit_id = p_unit and profile_id = auth.uid())
$$;

create function public.can_see_report(p_report uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from reports r join unit_members m on m.unit_id = r.unit_id
    where r.id = p_report and m.profile_id = auth.uid())
$$;

create function public.my_residence_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct b.residence_id
  from unit_members m join units u on u.id = m.unit_id join buildings b on b.id = u.building_id
  where m.profile_id = auth.uid()
$$;

create function public.report_is_open(s public.report_status) returns boolean
language sql immutable as $$
  select s in ('submitted', 'under_review', 'in_progress', 'awaiting_resident')
$$;

-- Mirrors AGENCY_TRANSITIONS in src/domain/reportWorkflow.ts.
create function public.agency_can_transition(p_from public.report_status, p_to public.report_status)
returns boolean language sql immutable as $$
  select case p_from
    when 'submitted' then p_to in ('under_review', 'in_progress', 'rejected')
    when 'under_review' then p_to in ('in_progress', 'awaiting_resident', 'rejected')
    when 'in_progress' then p_to in ('resolved', 'awaiting_resident')
    when 'awaiting_resident' then p_to in ('in_progress', 'closed')
    when 'resolved' then p_to in ('closed', 'in_progress')
    else false
  end
$$;

-- Notify every member of a report's unit.
create function public.notify_unit(p_report uuid, p_type text, p_status public.report_status)
returns void language sql security definer set search_path = public as $$
  insert into notifications (profile_id, type, report_id, status)
  select m.profile_id, p_type, r.id, p_status
  from reports r join unit_members m on m.unit_id = r.unit_id
  where r.id = p_report
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- New auth user → profile. Dashboard sign-ups wait for approval; resident
-- sign-ups may carry a unit access code that links them immediately.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_unit uuid;
begin
  insert into profiles (id, full_name, phone, email, role)
  values (
    new.id,
    left(coalesce(meta ->> 'full_name', ''), 120),
    left(meta ->> 'phone', 30),
    new.email,
    case when meta ->> 'app' = 'dashboard' then 'pending_staff'::user_role else 'resident'::user_role end
  );
  if meta ? 'unit_code' and coalesce(meta ->> 'app', '') <> 'dashboard' then
    select id into v_unit from units where access_code = upper(btrim(meta ->> 'unit_code'));
    if v_unit is not null then
      insert into unit_members (unit_id, profile_id, occupancy)
      values (v_unit, new.id, case when meta ->> 'occupancy' = 'owner' then 'owner'::occupancy else 'tenant'::occupancy end)
      on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Report insert: residents can only create a fresh, unassigned report.
create function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Staff and server-side admin scripts (service role) may file on any unit.
  if not public.is_staff() and coalesce(auth.role(), '') <> 'service_role' then
    new.resident_id := auth.uid();
    if not public.is_unit_member(new.unit_id) then
      raise exception 'not a member of this unit' using errcode = '42501';
    end if;
  end if;
  new.reference := 'SR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('report_ref_seq')::text, 4, '0');
  new.status := 'submitted';
  new.assignee_id := null;
  new.scheduled_at := null;
  new.feedback_rating := null;
  new.feedback_comment := null;
  new.feedback_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

create trigger reports_before_insert before insert on public.reports
for each row execute function public.reports_before_insert();

create function public.reports_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into report_events (report_id, status, source, actor_id) values (new.id, 'submitted', 'resident', new.resident_id);
  perform public.notify_unit(new.id, 'report_submitted', 'submitted');
  return new;
end $$;

create trigger reports_after_insert after insert on public.reports
for each row execute function public.reports_after_insert();

-- Message insert: authorship comes from the caller, never from the client.
create function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_status report_status;
begin
  select status into v_status from reports where id = new.report_id;
  if v_status is null or not public.can_see_report(new.report_id) then
    raise exception 'report not found' using errcode = '42501';
  end if;
  new.author_id := auth.uid();
  new.at := now();
  select coalesce(nullif(full_name, ''), email, '') into new.author_name from profiles where id = auth.uid();
  if public.is_staff() then
    new.author_kind := 'agency';
  else
    new.author_kind := 'resident';
    new.is_info_request := false;
    if not public.report_is_open(v_status) then
      raise exception 'report is closed' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger messages_before_insert before insert on public.report_messages
for each row execute function public.messages_before_insert();

create function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update reports set updated_at = now() where id = new.report_id;
  if new.author_kind = 'agency' and not new.is_info_request then
    perform public.notify_unit(new.report_id, 'agency_message', null);
  end if;
  return new;
end $$;

create trigger messages_after_insert after insert on public.report_messages
for each row execute function public.messages_after_insert();

create function public.photos_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_see_report(new.report_id) then
    raise exception 'report not found' using errcode = '42501';
  end if;
  new.added_by := auth.uid();
  new.added_kind := case when public.is_staff() then 'agency' else 'resident' end;
  new.at := now();
  return new;
end $$;

create trigger photos_before_insert before insert on public.report_photos
for each row execute function public.photos_before_insert();

create function public.announcements_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (profile_id, type, announcement_id)
  select distinct m.profile_id, 'announcement', new.id
  from unit_members m join units u on u.id = m.unit_id join buildings b on b.id = u.building_id
  where b.residence_id = new.residence_id;
  return new;
end $$;

create trigger announcements_after_insert after insert on public.announcements
for each row execute function public.announcements_after_insert();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Agency: change status (workflow enforced), optional note shown in the timeline.
create function public.set_report_status(p_report uuid, p_status public.report_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_from report_status;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  select status into v_from from reports where id = p_report for update;
  if v_from is null then raise exception 'report not found' using errcode = 'P0002'; end if;
  if not public.agency_can_transition(v_from, p_status) then
    raise exception 'transition % → % not allowed', v_from, p_status using errcode = 'P0001';
  end if;
  update reports set
    status = p_status,
    updated_at = now(),
    -- A new resolution needs a new confirmation from the resident.
    feedback_rating = case when p_status = 'resolved' then null else feedback_rating end,
    feedback_comment = case when p_status = 'resolved' then null else feedback_comment end,
    feedback_at = case when p_status = 'resolved' then null else feedback_at end
  where id = p_report;
  insert into report_events (report_id, status, note, source, actor_id)
  values (p_report, p_status, nullif(btrim(p_note), ''), 'agency', auth.uid());
  perform public.notify_unit(
    p_report,
    case when p_status in ('resolved', 'closed') then 'report_resolved' else 'report_status_changed' end,
    p_status);
end $$;

-- Agency: ask the resident for information (message + status in one step).
create function public.request_info(p_report uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_from report_status;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 5 then raise exception 'message required' using errcode = 'P0001'; end if;
  select status into v_from from reports where id = p_report for update;
  if v_from is null then raise exception 'report not found' using errcode = 'P0002'; end if;
  if v_from <> 'awaiting_resident' and not public.agency_can_transition(v_from, 'awaiting_resident') then
    raise exception 'cannot request information in status %', v_from using errcode = 'P0001';
  end if;
  insert into report_messages (report_id, body, is_info_request) values (p_report, btrim(p_body), true);
  if v_from <> 'awaiting_resident' then
    update reports set status = 'awaiting_resident', updated_at = now() where id = p_report;
    insert into report_events (report_id, status, source, actor_id) values (p_report, 'awaiting_resident', 'agency', auth.uid());
  end if;
  perform public.notify_unit(p_report, 'info_requested', 'awaiting_resident');
end $$;

-- Agency: dispatch to a technician with an appointment; moves the report to
-- "in progress" when its status allows it.
create function public.dispatch_report(p_report uuid, p_technician uuid, p_scheduled_at timestamptz, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_from report_status;
  v_tech text;
  v_to report_status;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  select status into v_from from reports where id = p_report for update;
  if v_from is null then raise exception 'report not found' using errcode = 'P0002'; end if;
  if not public.report_is_open(v_from) then raise exception 'report is closed' using errcode = 'P0001'; end if;
  select name || coalesce(' (' || company || ')', '') into v_tech from technicians where id = p_technician and active;
  if v_tech is null then raise exception 'technician not found' using errcode = 'P0002'; end if;
  v_to := case when v_from = 'in_progress' or public.agency_can_transition(v_from, 'in_progress') then 'in_progress'::report_status else v_from end;
  update reports set assignee_id = p_technician, scheduled_at = p_scheduled_at, status = v_to, updated_at = now() where id = p_report;
  insert into report_events (report_id, status, note, source, actor_id, technician_name, scheduled_at)
  values (p_report, v_to, coalesce(nullif(btrim(p_note), ''), 'timeline.notes.technicianScheduled'), 'agency', auth.uid(), v_tech, p_scheduled_at);
  perform public.notify_unit(p_report, 'intervention_scheduled', v_to);
end $$;

-- Resident: confirm the fix (with a rating) or say the problem persists.
create function public.submit_feedback(p_report uuid, p_fixed boolean, p_rating int default null, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r reports;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into r from reports where id = p_report for update;
  if r.id is null or not public.is_unit_member(r.unit_id) then raise exception 'report not found' using errcode = 'P0002'; end if;
  if r.status <> 'resolved' or r.feedback_at is not null then raise exception 'no feedback expected' using errcode = 'P0001'; end if;
  if char_length(coalesce(v_comment, '')) > 500 then raise exception 'comment too long' using errcode = 'P0001'; end if;
  if p_fixed then
    if p_rating is null or p_rating not between 1 and 5 then raise exception 'rating required' using errcode = 'P0001'; end if;
    update reports set feedback_rating = p_rating, feedback_comment = v_comment, feedback_at = now(), updated_at = now() where id = p_report;
  else
    if char_length(coalesce(v_comment, '')) < 5 then raise exception 'explanation required' using errcode = 'P0001'; end if;
    update reports set status = 'in_progress', updated_at = now() where id = p_report;
    insert into report_events (report_id, status, note, source, actor_id)
    values (p_report, 'in_progress', 'timeline.notes.reopenedByResident', 'resident', auth.uid());
    insert into report_messages (report_id, body) values (p_report, v_comment);
  end if;
end $$;

-- Resident: link the account to a unit with the code given by the agency.
create function public.claim_unit(p_code text, p_occupancy public.occupancy default 'tenant')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_unit uuid;
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode = '42501'; end if;
  select id into v_unit from units where access_code = upper(btrim(p_code));
  if v_unit is null then raise exception 'invalid code' using errcode = 'P0002'; end if;
  insert into unit_members (unit_id, profile_id, occupancy) values (v_unit, auth.uid(), p_occupancy) on conflict do nothing;
  return v_unit;
end $$;

-- Staff: new random access code for a unit (e.g. after a tenant leaves).
create function public.regenerate_access_code(p_unit uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not public.is_staff() then raise exception 'staff only' using errcode = '42501'; end if;
  update units set access_code = public.new_access_code() where id = p_unit returning access_code into v_code;
  return v_code;
end $$;

-- First dashboard sign-up becomes admin when the agency has none yet.
create function public.bootstrap_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where role = 'admin') then return false; end if;
  update profiles set role = 'admin' where id = auth.uid() and role = 'pending_staff';
  return found;
end $$;

-- Admin: approve / change / revoke staff access.
create function public.set_staff_role(p_profile uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_role = 'resident' then raise exception 'invalid role' using errcode = 'P0001'; end if;
  if p_profile = auth.uid() and p_role <> 'admin' then raise exception 'cannot demote yourself' using errcode = 'P0001'; end if;
  update profiles set role = p_role where id = p_profile and role <> 'resident';
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.residences enable row level security;
alter table public.buildings enable row level security;
alter table public.units enable row level security;
alter table public.unit_members enable row level security;
alter table public.technicians enable row level security;
alter table public.reports enable row level security;
alter table public.report_events enable row level security;
alter table public.report_messages enable row level security;
alter table public.report_photos enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.listings enable row level security;
alter table public.interest_requests enable row level security;

-- Profiles: yourself, or everyone for staff. Only name/phone/prefs editable.
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, notification_prefs) on public.profiles to authenticated;

-- Residences / buildings / units: members see theirs, staff manage all.
create policy residences_select on public.residences for select
  using (public.is_staff() or id in (select public.my_residence_ids()));
create policy residences_staff on public.residences for all using (public.is_staff()) with check (public.is_staff());

create policy buildings_select on public.buildings for select
  using (public.is_staff() or residence_id in (select public.my_residence_ids()));
create policy buildings_staff on public.buildings for all using (public.is_staff()) with check (public.is_staff());

create policy units_select on public.units for select using (public.is_staff() or public.is_unit_member(id));
create policy units_staff on public.units for all using (public.is_staff()) with check (public.is_staff());
-- Residents must not read access codes of other units; they only see their own
-- unit rows, and the code column is hidden from them below.
revoke select on public.units from authenticated, anon;
grant select (id, building_id, floor, number, area_sqm, rooms, created_at) on public.units to authenticated;

create function public.unit_access_codes() returns table (unit_id uuid, access_code text)
language sql stable security definer set search_path = public as $$
  select id, access_code from units where public.is_staff()
$$;

create policy members_select on public.unit_members for select using (profile_id = auth.uid() or public.is_staff());
create policy members_staff on public.unit_members for all using (public.is_staff()) with check (public.is_staff());

create policy technicians_staff on public.technicians for all using (public.is_staff()) with check (public.is_staff());

-- Reports: residents insert for their units (trigger sanitises), read their
-- units' reports. No direct UPDATE for anyone: use the RPCs above.
create policy reports_select on public.reports for select using (public.is_staff() or public.is_unit_member(unit_id));
create policy reports_insert on public.reports for insert with check (public.is_staff() or public.is_unit_member(unit_id));
create policy reports_delete on public.reports for delete using (public.is_admin());

create policy events_select on public.report_events for select using (public.can_see_report(report_id));

create policy messages_select on public.report_messages for select using (public.can_see_report(report_id));
create policy messages_insert on public.report_messages for insert with check (public.can_see_report(report_id));

create policy photos_select on public.report_photos for select using (public.can_see_report(report_id));
create policy photos_insert on public.report_photos for insert with check (public.can_see_report(report_id));

create policy announcements_select on public.announcements for select
  using (public.is_staff() or residence_id in (select public.my_residence_ids()));
create policy announcements_staff on public.announcements for all using (public.is_staff()) with check (public.is_staff());

create policy notifications_select on public.notifications for select using (profile_id = auth.uid());
create policy notifications_update on public.notifications for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
revoke update on public.notifications from authenticated, anon;
grant update (read) on public.notifications to authenticated;

create policy listings_select on public.listings for select using (published or public.is_staff());
create policy listings_staff on public.listings for all using (public.is_staff()) with check (public.is_staff());

create policy interest_insert on public.interest_requests for insert to authenticated with check (profile_id = auth.uid());
create policy interest_staff on public.interest_requests for all using (public.is_staff()) with check (public.is_staff());

-- Function execution: only signed-in users (anon gets nothing).
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
-- Used by RLS on rows anon may query (published listings).
grant execute on function public.is_staff() to anon;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for report photos, folder = report id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create function public.report_id_from_path(p_name text) returns uuid
language plpgsql immutable as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.report_id_from_path(text) to authenticated;

create policy report_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and public.can_see_report(public.report_id_from_path(name)));
create policy report_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'report-photos' and public.can_see_report(public.report_id_from_path(name)));

-- ---------------------------------------------------------------------------
-- Realtime: the dashboard listens for new reports/messages; the app for
-- notifications. Realtime applies the RLS policies above.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.reports, public.report_messages, public.report_events, public.notifications;
