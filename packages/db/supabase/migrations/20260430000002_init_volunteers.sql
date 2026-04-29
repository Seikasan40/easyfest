-- ════════════════════════════════════════════════════════════════════
-- 20260430000002 — VOLUNTEERS (profils + candidatures)
-- ════════════════════════════════════════════════════════════════════

-- ─── Profil bénévole (1-1 avec auth.users après validation candidature) ───
create table public.volunteer_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  full_name            text not null,
  first_name           text,
  last_name            text,
  birth_date           date,
  is_minor             boolean generated always as
                       (birth_date > current_date - interval '18 years') stored,
  gender               text check (gender in ('M','F','X','NS')),
  phone                text,
  email                citext,
  address_street       text,
  address_city         text,
  address_zip          text,
  address_country      text default 'FR',
  profession           text,
  size                 text check (size in ('XS','S','M','L','XL','XXL') or size is null),
  diet_notes           text,                   -- DATA SENSIBLE (allergies/régimes)
  skills               text[] default '{}',
  limitations          text[] default '{}',
  bio                  text,
  avatar_url           text,
  parental_auth_url    text,
  is_returning         boolean not null default false,

  -- Consentements horodatés (RGPD)
  consent_pii_at           timestamptz,
  consent_image_at         timestamptz,
  consent_charter_at       timestamptz,
  consent_anti_harass_at   timestamptz,
  privacy_policy_version_accepted text,

  -- Méta
  notes_admin          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger tg_volunteer_profiles_updated_at
  before update on public.volunteer_profiles
  for each row execute function public.tg_set_updated_at();

create index idx_volunteer_profiles_email on public.volunteer_profiles(lower(email::text));

-- ─── Vue v_volunteer_safe — sans diet_notes/parental_auth pour rôles non-catering ───
create or replace view public.v_volunteer_safe with (security_invoker = on) as
select
  user_id, full_name, first_name, last_name, gender, phone, email,
  size, skills, limitations, bio, avatar_url, is_returning,
  is_minor, created_at, updated_at
from public.volunteer_profiles;

comment on view public.v_volunteer_safe is
'Vue restreinte (sans diet_notes / parental_auth_url / address_*) pour rôles non-catering.';

-- ─── Candidatures (avant création compte — stockées dans la BDD avant validation) ───
create type public.application_status as enum (
  'pending', 'validated', 'refused', 'reserve', 'pre_selected', 'duplicate'
);

create table public.volunteer_applications (
  id                       uuid primary key default gen_random_uuid(),
  event_id                 uuid not null references public.events(id) on delete cascade,
  -- Identité (avant compte créé)
  email                    citext not null,
  full_name                text not null,
  first_name               text,
  last_name                text,
  birth_date               date,
  is_minor                 boolean,
  gender                   text check (gender in ('M','F','X','NS')),
  phone                    text,
  address_street           text,
  address_city             text,
  address_zip              text,
  address_country          text default 'FR',
  profession               text,
  -- Logistique
  arrival_at               timestamptz,
  departure_at             timestamptz,
  size                     text check (size in ('XS','S','M','L','XL','XXL') or size is null),
  diet_notes               text,
  has_vehicle              boolean default false,
  driving_license          boolean default false,
  -- Préférences
  preferred_position_slugs text[] default '{}',
  -- Compétences
  skills                   text[] default '{}',
  limitations              text[] default '{}',
  bio                      text,
  is_returning             boolean default false,
  -- Pièces jointes
  parental_auth_url        text,
  -- Consentements horodatés (obligatoires)
  consent_pii_at           timestamptz not null default now(),
  consent_charter_at       timestamptz not null default now(),
  consent_anti_harass_at   timestamptz not null default now(),
  consent_image_at         timestamptz,
  privacy_policy_version_accepted text not null default '1.0.0',
  -- Workflow
  status                   public.application_status not null default 'pending',
  refusal_reason           text,
  validated_by             uuid references auth.users(id) on delete set null,
  validated_at             timestamptz,
  created_user_id          uuid references auth.users(id) on delete set null,
  -- Méta
  source                   text not null default 'public_form'
                           check (source in ('public_form','admin_manual','import')),
  admin_notes              text,
  turnstile_token          text,         -- audité, pas re-vérifiable côté DB mais traçable
  ip_address               inet,
  user_agent               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger tg_volunteer_applications_updated_at
  before update on public.volunteer_applications
  for each row execute function public.tg_set_updated_at();

create index idx_applications_event_status on public.volunteer_applications(event_id, status);
create index idx_applications_email on public.volunteer_applications(lower(email::text));
create index idx_applications_created on public.volunteer_applications(created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table public.volunteer_profiles      enable row level security;
alter table public.volunteer_applications  enable row level security;
