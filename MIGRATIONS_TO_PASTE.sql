-- ═══════════════════════════════════════════════════════════════════
-- EASYFEST — TOUTES LES MIGRATIONS COMBINÉES
-- À copier-coller dans Supabase Studio SQL Editor :
--   https://supabase.com/dashboard/project/wsmehckdgnpbzwjvotro/sql/new
-- ───────────────────────────────────────────────────────────────────
-- Une fois collé, clique "Run" — ça applique en 5 secondes.
-- ═══════════════════════════════════════════════════════════════════


-- ─── 20260430000000_init_extensions.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000000 — INIT EXTENSIONS
-- Extensions Postgres requises pour Easyfest
-- ════════════════════════════════════════════════════════════════════
-- Extensions à activer côté Supabase (idempotent).

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists citext with schema extensions;

-- pg_cron pour les jobs RGPD purge mensuels (activable depuis dashboard Supabase)
-- create extension if not exists pg_cron;

-- Fonction utilitaire : timestamp with timezone à la milliseconde
create or replace function public.now_iso()
returns timestamptz
language sql immutable as $$
  select now();
$$;

-- Trigger générique : updated_at automatique
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── 20260430000001_init_core_tenants.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000001 — CORE MULTI-TENANT (Asso → Festivals → Memberships)
-- Vérouille la base multi-tenant DÈS la première migration.
-- ════════════════════════════════════════════════════════════════════

-- ─── Enum role_kind (5 rôles primaires) ────────────────────────────
create type public.role_kind as enum (
  'volunteer',
  'post_lead',
  'staff_scan',
  'volunteer_lead',
  'direction'
);

-- ─── Organizations (Asso ou structure faîtière) ────────────────────
create table public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  logo_url        text,
  contact_email   citext,
  contact_phone   text,
  billing_plan    text not null default 'free' check (billing_plan in ('free','crew','festival','pro','enterprise')),
  ban_required_approvals int not null default 3 check (ban_required_approvals between 1 and 10),
  privacy_policy_version text not null default '1.0.0',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger tg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.tg_set_updated_at();

create index idx_organizations_slug on public.organizations(slug);

-- ─── Events (festivals/éditions, N par organization) ───────────────
create table public.events (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  name                     text not null,
  slug                     text not null,
  description              text,
  starts_at                timestamptz not null,
  ends_at                  timestamptz not null,
  location                 text,
  geo_lat                  numeric(9,6),
  geo_lng                  numeric(9,6),
  timezone                 text not null default 'Europe/Paris',
  status                   text not null default 'draft' check (status in ('draft','open','closed','archived')),
  registration_open_at     timestamptz,
  registration_close_at    timestamptz,
  max_preferred_positions  int not null default 3 check (max_preferred_positions between 1 and 10),
  itinerary_enabled        boolean not null default false,  -- Pam : "désactivé pour RDL"
  wellbeing_enabled        boolean not null default true,
  safer_alerts_enabled     boolean not null default true,
  manual_signup_enabled    boolean not null default true,
  cover_image_url          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique(organization_id, slug),
  check (ends_at > starts_at)
);

create trigger tg_events_updated_at
  before update on public.events
  for each row execute function public.tg_set_updated_at();

create index idx_events_org_status on public.events(organization_id, status);
create index idx_events_dates on public.events(starts_at, ends_at);

-- ─── Memberships (user × event × role) ─────────────────────────────
create table public.memberships (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  event_id            uuid not null references public.events(id) on delete cascade,
  role                public.role_kind not null,
  position_id         uuid,  -- défini après init_planning, ALTER TABLE ajoute la FK
  is_entry_scanner    boolean not null default false,
  is_mediator         boolean not null default false,
  is_active           boolean not null default true,
  invited_at          timestamptz,
  invited_by          uuid references auth.users(id) on delete set null,
  accepted_at         timestamptz,
  notes_admin         text,
  created_at          timestamptz not null default now(),
  unique(user_id, event_id, role)
);

create index idx_memberships_event_role on public.memberships(event_id, role);
create index idx_memberships_user on public.memberships(user_id);

-- ─── Helper SQL : rôle effectif de l'utilisateur courant sur un event ───
-- Renvoie le rôle le plus élevé (hiérarchie : direction > volunteer_lead > post_lead > staff_scan > volunteer)
create or replace function public.role_in_event(target_event_id uuid)
returns public.role_kind
language sql security definer stable
set search_path = public, auth, extensions
as $$
  select role from public.memberships
  where user_id = auth.uid()
    and event_id = target_event_id
    and is_active = true
  order by case role
    when 'direction' then 1
    when 'volunteer_lead' then 2
    when 'post_lead' then 3
    when 'staff_scan' then 4
    when 'volunteer' then 5
  end
  limit 1;
$$;

-- Helper : l'utilisateur a-t-il au moins un rôle au-dessus du seuil donné ?
create or replace function public.has_role_at_least(target_event_id uuid, threshold public.role_kind)
returns boolean
language sql security definer stable
set search_path = public, auth
as $$
  select coalesce(
    (select case
      when role = 'direction' then 1
      when role = 'volunteer_lead' then 2
      when role = 'post_lead' then 3
      when role = 'staff_scan' then 4
      when role = 'volunteer' then 5
    end <= case threshold
      when 'direction' then 1
      when 'volunteer_lead' then 2
      when 'post_lead' then 3
      when 'staff_scan' then 4
      when 'volunteer' then 5
    end
    from public.memberships
    where user_id = auth.uid()
      and event_id = target_event_id
      and is_active = true
    order by case role
      when 'direction' then 1
      when 'volunteer_lead' then 2
      when 'post_lead' then 3
      when 'staff_scan' then 4
      when 'volunteer' then 5
    end
    limit 1),
    false
  );
$$;

-- ─── RLS systématique dès la création (sécurité by default) ────────
alter table public.organizations enable row level security;
alter table public.events        enable row level security;
alter table public.memberships   enable row level security;

-- ─── 20260430000002_init_volunteers.sql ─────────────────────────────────────────
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

-- ─── 20260430000003_init_planning.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000003 — PLANNING (positions, shifts, assignments, meals)
-- ════════════════════════════════════════════════════════════════════

-- ─── Postes (Bar, Catering, Brigade Verte, etc.) ───────────────────
create table public.positions (
  id                    uuid primary key default gen_random_uuid(),
  event_id              uuid not null references public.events(id) on delete cascade,
  name                  text not null,
  slug                  text not null,
  description           text,
  color                 text,
  icon                  text,
  responsible_user_id   uuid references auth.users(id) on delete set null,
  geo_zone              jsonb,                              -- coordonnées sur carte du site
  display_order         int not null default 0,
  needs_count_default   int not null default 1,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(event_id, slug)
);

create trigger tg_positions_updated_at
  before update on public.positions
  for each row execute function public.tg_set_updated_at();

create index idx_positions_event on public.positions(event_id, display_order);

-- Backfill memberships.position_id FK (créée après positions)
alter table public.memberships
  add constraint fk_memberships_position
  foreign key (position_id) references public.positions(id) on delete set null;

-- ─── Shifts (créneaux horaires d'un poste) ─────────────────────────
create table public.shifts (
  id              uuid primary key default gen_random_uuid(),
  position_id     uuid not null references public.positions(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  needs_count     int not null default 1 check (needs_count > 0),
  meal_included   boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index idx_shifts_position on public.shifts(position_id, starts_at);
create index idx_shifts_dates on public.shifts(starts_at, ends_at);

-- ─── Assignments (bénévole × shift + statut) ───────────────────────
create type public.assignment_status as enum (
  'pending', 'validated', 'refused', 'reserve', 'no_show', 'completed'
);

create table public.assignments (
  id                  uuid primary key default gen_random_uuid(),
  shift_id            uuid not null references public.shifts(id) on delete cascade,
  volunteer_user_id   uuid not null references auth.users(id) on delete cascade,
  status              public.assignment_status not null default 'pending',
  refusal_reason      text,
  rating              int check (rating between 1 and 5),
  rating_comment      text,
  assigned_by         uuid references auth.users(id) on delete set null,
  validated_by_volunteer_at  timestamptz,
  refused_by_volunteer_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(shift_id, volunteer_user_id)
);

create trigger tg_assignments_updated_at
  before update on public.assignments
  for each row execute function public.tg_set_updated_at();

create index idx_assignments_volunteer on public.assignments(volunteer_user_id);
create index idx_assignments_shift on public.assignments(shift_id);

-- ─── Repas attribués (1 entry par bénévole × créneau repas) ────────
create table public.meal_allowances (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  volunteer_user_id   uuid not null references auth.users(id) on delete cascade,
  meal_slot           text not null,           -- ex "vendredi-dejeuner"
  meal_label          text,                    -- ex "Vendredi 30 mai — déjeuner"
  served_at           timestamptz,
  served_by           uuid references auth.users(id) on delete set null,
  cancelled_at        timestamptz,
  cancelled_reason    text,
  created_at          timestamptz not null default now(),
  unique(event_id, volunteer_user_id, meal_slot)
);

create index idx_meals_volunteer on public.meal_allowances(volunteer_user_id, event_id);
create index idx_meals_event on public.meal_allowances(event_id, served_at);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table public.positions        enable row level security;
alter table public.shifts           enable row level security;
alter table public.assignments      enable row level security;
alter table public.meal_allowances  enable row level security;

-- ─── 20260430000004_init_messaging.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000004 — MESSAGING (channels typés, messages, broadcasts)
-- Verbatim Pam : "Régie en rouge, responsables en jaune... que ça se mélange pas
--                 avec le message des autres bénévoles."
-- ════════════════════════════════════════════════════════════════════

-- ─── Channel kinds ──────────────────────────────────────────────────
create type public.channel_kind as enum (
  'team',          -- canal d'une équipe (par poste)
  'responsibles',  -- canal entre responsables de poste + resp. bénévoles
  'regie',         -- canal régie (direction)
  'admin',         -- canal admin (organization-wide)
  'direct'         -- chat 1-1 entre bénévole et son responsable
);

create table public.message_channels (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  kind            public.channel_kind not null,
  name            text not null,
  position_id     uuid references public.positions(id) on delete cascade, -- pour 'team'
  participant_user_ids uuid[] default '{}',  -- pour 'direct' (2 participants)
  color           text,                       -- code couleur affichage UI (rouge régie, jaune resp.)
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_channels_event on public.message_channels(event_id);
create index idx_channels_position on public.message_channels(position_id) where position_id is not null;

-- ─── Messages ───────────────────────────────────────────────────────
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  channel_id      uuid not null references public.message_channels(id) on delete cascade,
  sender_user_id  uuid not null references auth.users(id) on delete cascade,
  content         text not null check (length(content) > 0 and length(content) <= 2000),
  is_broadcast    boolean not null default false,  -- diffusion régie/responsable
  is_muted        boolean not null default false,  -- modération régie
  muted_by        uuid references auth.users(id) on delete set null,
  muted_at        timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_messages_channel on public.messages(channel_id, created_at desc);
create index idx_messages_sender on public.messages(sender_user_id);

-- ─── Notifications outbound (push, mail, SMS — log) ────────────────
create table public.notification_log (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid references public.events(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  channel           text not null check (channel in ('push','email','sms','in_app')),
  template_id       text,
  subject           text,
  preview           text,
  status            text not null default 'queued' check (status in ('queued','sent','failed','bounced')),
  provider_id       text,                     -- Resend ID, Expo Push receipt, Twilio SID
  error             text,
  created_at        timestamptz not null default now(),
  sent_at           timestamptz
);

create index idx_notif_log_user on public.notification_log(user_id, created_at desc);
create index idx_notif_log_status on public.notification_log(status, created_at);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table public.message_channels  enable row level security;
alter table public.messages          enable row level security;
alter table public.notification_log  enable row level security;

-- ─── 20260430000005_init_safer_space.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000005 — SAFER SPACE (bien-être, alertes graves, modération)
-- Verbatim Pam : "Voilà, il faut, pour moi il faut une partie bien-être..."
--                "Il faut un bouton — un truc signal vraiment un truc grave..."
--                "Pour mettre cette croix rouge [bannissement], qu'il faut qu'il y
--                 ait par exemple trois personnes qui valident."
-- ════════════════════════════════════════════════════════════════════

-- ─── Self-report bien-être bénévole (vert/jaune/rouge) ─────────────
create type public.wellbeing_level as enum ('green', 'yellow', 'red');

create table public.wellbeing_reports (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  reporter_user_id    uuid not null references auth.users(id) on delete cascade,
  level               public.wellbeing_level not null,
  comment             text,
  acknowledged_by     uuid references auth.users(id) on delete set null,
  acknowledged_at     timestamptz,
  resolved_at         timestamptz,
  resolution_notes    text,
  created_at          timestamptz not null default now()
);

create index idx_wellbeing_event_level on public.wellbeing_reports(event_id, level, created_at desc);
create index idx_wellbeing_reporter on public.wellbeing_reports(reporter_user_id);

-- ─── Alertes graves (harcèlement, danger, médical, etc.) ───────────
create type public.safer_alert_kind as enum (
  'harassment', 'physical_danger', 'medical', 'wellbeing_red', 'other'
);

create type public.safer_alert_status as enum (
  'open', 'acknowledged', 'in_progress', 'resolved', 'false_alarm'
);

create table public.safer_alerts (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  reporter_user_id    uuid not null references auth.users(id) on delete cascade,
  kind                public.safer_alert_kind not null,
  description         text,
  location_hint       text,
  geo_lat             numeric(9,6),
  geo_lng             numeric(9,6),
  status              public.safer_alert_status not null default 'open',
  acknowledged_by     uuid references auth.users(id) on delete set null,
  acknowledged_at     timestamptz,
  resolved_by         uuid references auth.users(id) on delete set null,
  resolved_at         timestamptz,
  resolution_notes    text,
  -- Médiateur·ice désigné·e (assigné après acknowledge)
  mediator_user_id    uuid references auth.users(id) on delete set null,
  -- Notification trail
  notified_user_ids   uuid[] default '{}',
  created_at          timestamptz not null default now()
);

create index idx_safer_alerts_event_status on public.safer_alerts(event_id, status, created_at desc);
create index idx_safer_alerts_reporter on public.safer_alerts(reporter_user_id);

-- ─── Modération : actions (mute, propose ban, validate ban, unban) ─
create type public.moderation_action_kind as enum (
  'mute', 'unmute', 'ban_proposal', 'ban_validate', 'unban'
);

create table public.moderation_actions (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  target_user_id      uuid not null references auth.users(id) on delete cascade,
  actor_user_id       uuid not null references auth.users(id) on delete cascade,
  kind                public.moderation_action_kind not null,
  reason              text,
  related_message_id  uuid references public.messages(id) on delete set null,
  related_alert_id    uuid references public.safer_alerts(id) on delete set null,
  -- Pour les ban_proposal : combien de validations encore requises
  ban_proposal_id     uuid references public.moderation_actions(id) on delete cascade,
  created_at          timestamptz not null default now()
);

create index idx_moderation_event on public.moderation_actions(event_id, created_at desc);
create index idx_moderation_target on public.moderation_actions(target_user_id);
create index idx_moderation_proposal on public.moderation_actions(ban_proposal_id) where ban_proposal_id is not null;

-- ─── Bans actifs (snapshot, mis à jour quand un ban_proposal atteint le seuil) ─
create table public.bans (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  target_user_id      uuid not null references auth.users(id) on delete cascade,
  reason              text,
  ban_proposal_id     uuid references public.moderation_actions(id) on delete set null,
  validated_by        uuid[] not null default '{}',  -- IDs des valideurs
  enforced_at         timestamptz not null default now(),
  unbanned_at         timestamptz,
  unbanned_by         uuid references auth.users(id) on delete set null,
  unbanned_reason     text,
  unique(event_id, target_user_id, enforced_at)
);

create index idx_bans_event_target on public.bans(event_id, target_user_id) where unbanned_at is null;

-- ─── Charte / Engagements signés ───────────────────────────────────
create table public.signed_engagements (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  engagement_kind     text not null check (engagement_kind in ('charter','anti_harassment','image_rights','pii_consent')),
  version             text not null,
  signed_at           timestamptz not null default now(),
  ip_address          inet,
  user_agent          text,
  unique(event_id, user_id, engagement_kind, version)
);

create index idx_engagements_user on public.signed_engagements(user_id, event_id);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table public.wellbeing_reports    enable row level security;
alter table public.safer_alerts         enable row level security;
alter table public.moderation_actions   enable row level security;
alter table public.bans                 enable row level security;
alter table public.signed_engagements   enable row level security;

-- ─── 20260430000006_init_audit_log.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000006 — AUDIT LOG + SCAN EVENTS (immuables, append-only)
-- ════════════════════════════════════════════════════════════════════

-- ─── Scans terrain (arrival, meal, post_take, exit) ────────────────
create type public.scan_kind as enum (
  'arrival', 'meal', 'post_take', 'exit'
);

create table public.scan_events (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  volunteer_user_id   uuid not null references auth.users(id) on delete cascade,
  scanned_by          uuid references auth.users(id) on delete set null,
  scan_kind           public.scan_kind not null,
  context             jsonb not null default '{}',  -- {position_id, shift_id, meal_slot, geo_lat, geo_lng}
  -- Anti-rejouage : qr_token et qr_nonce stockés pour détecter les rejouages
  qr_token            text,
  qr_nonce            text,
  is_replay           boolean not null default false,
  scanned_at          timestamptz not null default now()
);

create index idx_scans_event_kind on public.scan_events(event_id, scan_kind, scanned_at desc);
create index idx_scans_volunteer on public.scan_events(volunteer_user_id, scanned_at desc);
create index idx_scans_nonce on public.scan_events(qr_nonce) where qr_nonce is not null;

-- ─── Audit log immuable (toute action sensible) ────────────────────
create table public.audit_log (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  event_id    uuid references public.events(id) on delete set null,
  action      text not null,                -- 'volunteer.validated', 'membership.created', 'ban.enforced'
  payload     jsonb not null default '{}',
  ip_address  inet,
  user_agent  text,
  occurred_at timestamptz not null default now()
);

create index idx_audit_event_action on public.audit_log(event_id, action, occurred_at desc);
create index idx_audit_user on public.audit_log(user_id, occurred_at desc);

-- ─── Helper : insertion typée + protection contre update/delete ────
create or replace function public.log_audit(
  p_action text,
  p_event_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql security definer
set search_path = public, auth
as $$
declare
  inserted_id bigint;
begin
  insert into public.audit_log (user_id, event_id, action, payload)
  values (auth.uid(), p_event_id, p_action, p_payload)
  returning id into inserted_id;
  return inserted_id;
end;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table public.scan_events  enable row level security;
alter table public.audit_log    enable row level security;

-- ─── 20260430000007_rls_policies.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000007 — RLS POLICIES
-- Toutes les policies appliquées en bloc.
-- Principe : refus par défaut + autorisation par rôle hiérarchique.
-- ════════════════════════════════════════════════════════════════════

-- ─── ORGANIZATIONS ─────────────────────────────────────────────────
-- Lecture : authentifié et membre d'au moins un event de cette org
create policy "orgs_select_members" on public.organizations
  for select using (
    exists (
      select 1 from public.memberships m
      join public.events e on e.id = m.event_id
      where m.user_id = auth.uid()
        and e.organization_id = organizations.id
        and m.is_active = true
    )
  );

-- Lecture : public si org a au moins 1 event 'open' (page d'inscription publique)
create policy "orgs_select_public_when_open" on public.organizations
  for select using (
    exists (
      select 1 from public.events e
      where e.organization_id = organizations.id
        and e.status = 'open'
    )
  );

-- Création/édition : direction d'au moins 1 event de l'org (pas de "owner" séparé V1)
create policy "orgs_update_direction" on public.organizations
  for update using (
    exists (
      select 1 from public.memberships m
      join public.events e on e.id = m.event_id
      where m.user_id = auth.uid()
        and e.organization_id = organizations.id
        and m.role = 'direction'
        and m.is_active = true
    )
  );

-- ─── EVENTS ─────────────────────────────────────────────────────────
create policy "events_select_public_when_open" on public.events
  for select using (status in ('open','closed','archived'));

create policy "events_select_members" on public.events
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.event_id = events.id
        and m.is_active = true
    )
  );

create policy "events_update_direction" on public.events
  for update using (public.role_in_event(events.id) = 'direction');

create policy "events_insert_authenticated" on public.events
  for insert with check (auth.uid() is not null);

-- ─── MEMBERSHIPS ────────────────────────────────────────────────────
create policy "memberships_select_self" on public.memberships
  for select using (user_id = auth.uid());

create policy "memberships_select_event_lead" on public.memberships
  for select using (
    public.has_role_at_least(memberships.event_id, 'volunteer_lead')
  );

create policy "memberships_insert_lead" on public.memberships
  for insert with check (
    public.has_role_at_least(memberships.event_id, 'volunteer_lead')
  );

create policy "memberships_update_lead" on public.memberships
  for update using (
    public.has_role_at_least(memberships.event_id, 'volunteer_lead')
  );

-- ─── VOLUNTEER PROFILES ────────────────────────────────────────────
create policy "vp_select_self" on public.volunteer_profiles
  for select using (user_id = auth.uid());

-- volunteer_lead/direction voient tous les profils des bénévoles de leurs events
create policy "vp_select_event_lead" on public.volunteer_profiles
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = volunteer_profiles.user_id
        and public.has_role_at_least(m.event_id, 'volunteer_lead')
    )
  );

-- post_lead voit les bénévoles de son équipe (même position)
create policy "vp_select_post_lead_team" on public.volunteer_profiles
  for select using (
    exists (
      select 1
      from public.memberships m_target
      join public.memberships m_actor on m_actor.event_id = m_target.event_id
      where m_target.user_id = volunteer_profiles.user_id
        and m_target.role = 'volunteer'
        and m_actor.user_id = auth.uid()
        and m_actor.role = 'post_lead'
        and m_actor.position_id is not null
        and m_actor.position_id = m_target.position_id
    )
  );

create policy "vp_update_self" on public.volunteer_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "vp_insert_self" on public.volunteer_profiles
  for insert with check (user_id = auth.uid());

-- ─── VOLUNTEER APPLICATIONS ────────────────────────────────────────
-- Le formulaire public peut INSERT (anonyme) pour un event open
create policy "applications_insert_public_open_event" on public.volunteer_applications
  for insert with check (
    exists (
      select 1 from public.events e
      where e.id = volunteer_applications.event_id
        and e.status = 'open'
        and (e.registration_open_at is null or e.registration_open_at <= now())
        and (e.registration_close_at is null or e.registration_close_at >= now())
    )
  );

-- Le candidat peut voir SA candidature s'il est connecté avec le même email
create policy "applications_select_self_email" on public.volunteer_applications
  for select using (
    auth.email() = volunteer_applications.email
  );

-- volunteer_lead/direction voient toutes les candidatures de leur event
create policy "applications_select_event_lead" on public.volunteer_applications
  for select using (
    public.has_role_at_least(volunteer_applications.event_id, 'volunteer_lead')
  );

create policy "applications_update_event_lead" on public.volunteer_applications
  for update using (
    public.has_role_at_least(volunteer_applications.event_id, 'volunteer_lead')
  );

-- ─── POSITIONS ──────────────────────────────────────────────────────
create policy "positions_select_event_members" on public.positions
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.event_id = positions.event_id
        and m.is_active = true
    )
    or exists (
      select 1 from public.events e
      where e.id = positions.event_id
        and e.status = 'open'
    )
  );

create policy "positions_modify_lead" on public.positions
  for all using (public.has_role_at_least(positions.event_id, 'volunteer_lead'))
  with check (public.has_role_at_least(positions.event_id, 'volunteer_lead'));

-- ─── SHIFTS ─────────────────────────────────────────────────────────
create policy "shifts_select_event_members" on public.shifts
  for select using (
    exists (
      select 1 from public.positions p
      join public.memberships m on m.event_id = p.event_id
      where p.id = shifts.position_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "shifts_modify_lead" on public.shifts
  for all using (
    exists (
      select 1 from public.positions p
      where p.id = shifts.position_id
        and public.has_role_at_least(p.event_id, 'volunteer_lead')
    )
  );

-- ─── ASSIGNMENTS ────────────────────────────────────────────────────
create policy "assignments_select_self" on public.assignments
  for select using (volunteer_user_id = auth.uid());

create policy "assignments_select_event_lead" on public.assignments
  for select using (
    exists (
      select 1 from public.shifts s
      join public.positions p on p.id = s.position_id
      where s.id = assignments.shift_id
        and (
          public.has_role_at_least(p.event_id, 'volunteer_lead')
          or (
            public.role_in_event(p.event_id) = 'post_lead'
            and exists (
              select 1 from public.memberships m
              where m.user_id = auth.uid()
                and m.event_id = p.event_id
                and m.role = 'post_lead'
                and m.position_id = p.id
            )
          )
        )
    )
  );

-- Bénévole peut update son rating + acceptation/refus
create policy "assignments_update_self_validation" on public.assignments
  for update using (volunteer_user_id = auth.uid())
  with check (volunteer_user_id = auth.uid());

create policy "assignments_modify_lead" on public.assignments
  for all using (
    exists (
      select 1 from public.shifts s
      join public.positions p on p.id = s.position_id
      where s.id = assignments.shift_id
        and public.has_role_at_least(p.event_id, 'volunteer_lead')
    )
  );

-- ─── MEAL ALLOWANCES ────────────────────────────────────────────────
create policy "meals_select_self" on public.meal_allowances
  for select using (volunteer_user_id = auth.uid());

create policy "meals_select_event_lead" on public.meal_allowances
  for select using (
    public.has_role_at_least(meal_allowances.event_id, 'staff_scan')
  );

create policy "meals_modify_lead" on public.meal_allowances
  for all using (
    public.has_role_at_least(meal_allowances.event_id, 'volunteer_lead')
  );

-- ─── MESSAGE CHANNELS / MESSAGES ───────────────────────────────────
create policy "channels_select_member" on public.message_channels
  for select using (
    case message_channels.kind
      when 'team' then exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid()
          and m.event_id = message_channels.event_id
          and (m.position_id = message_channels.position_id or m.role in ('volunteer_lead','direction'))
      )
      when 'responsibles' then public.has_role_at_least(message_channels.event_id, 'post_lead')
      when 'regie' then public.has_role_at_least(message_channels.event_id, 'volunteer_lead')
      when 'admin' then public.role_in_event(message_channels.event_id) = 'direction'
      when 'direct' then auth.uid() = any(message_channels.participant_user_ids)
                       or public.role_in_event(message_channels.event_id) = 'direction'
    end
  );

create policy "messages_select_via_channel" on public.messages
  for select using (
    exists (
      select 1 from public.message_channels c
      where c.id = messages.channel_id
        -- la policy channels_select_member s'applique transitivement via cette query
    )
    -- Régie peut tout voir (modération)
    or exists (
      select 1 from public.message_channels c
      where c.id = messages.channel_id
        and public.role_in_event(c.event_id) = 'direction'
    )
  );

create policy "messages_insert_member" on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and not exists (
      select 1 from public.bans b
      where b.target_user_id = auth.uid()
        and b.unbanned_at is null
        and exists (
          select 1 from public.message_channels c
          where c.id = messages.channel_id
            and c.event_id = b.event_id
        )
    )
  );

create policy "messages_update_regie_for_mute" on public.messages
  for update using (
    exists (
      select 1 from public.message_channels c
      where c.id = messages.channel_id
        and public.role_in_event(c.event_id) = 'direction'
    )
  );

-- ─── NOTIFICATION LOG ──────────────────────────────────────────────
create policy "notif_log_select_self_or_lead" on public.notification_log
  for select using (
    user_id = auth.uid()
    or (event_id is not null and public.has_role_at_least(event_id, 'volunteer_lead'))
  );

-- ─── WELLBEING REPORTS ─────────────────────────────────────────────
create policy "wellbeing_insert_self" on public.wellbeing_reports
  for insert with check (reporter_user_id = auth.uid());

create policy "wellbeing_select_self" on public.wellbeing_reports
  for select using (reporter_user_id = auth.uid());

create policy "wellbeing_select_event_lead" on public.wellbeing_reports
  for select using (public.has_role_at_least(wellbeing_reports.event_id, 'post_lead'));

create policy "wellbeing_update_lead" on public.wellbeing_reports
  for update using (public.has_role_at_least(wellbeing_reports.event_id, 'volunteer_lead'));

-- ─── SAFER ALERTS ──────────────────────────────────────────────────
-- Tout membre actif peut déclencher une alerte
create policy "safer_alerts_insert_member" on public.safer_alerts
  for insert with check (
    reporter_user_id = auth.uid()
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.event_id = safer_alerts.event_id
        and m.is_active = true
    )
  );

-- Le reporter voit son alerte ; les responsables/régie voient toutes les alertes
create policy "safer_alerts_select_reporter_or_lead" on public.safer_alerts
  for select using (
    reporter_user_id = auth.uid()
    or public.has_role_at_least(safer_alerts.event_id, 'post_lead')
  );

create policy "safer_alerts_update_lead" on public.safer_alerts
  for update using (public.has_role_at_least(safer_alerts.event_id, 'post_lead'));

-- ─── MODERATION ACTIONS ────────────────────────────────────────────
create policy "moderation_select_lead" on public.moderation_actions
  for select using (public.has_role_at_least(moderation_actions.event_id, 'volunteer_lead'));

create policy "moderation_insert_lead" on public.moderation_actions
  for insert with check (
    actor_user_id = auth.uid()
    and public.has_role_at_least(moderation_actions.event_id, 'volunteer_lead')
  );

-- ─── BANS ──────────────────────────────────────────────────────────
create policy "bans_select_lead" on public.bans
  for select using (public.has_role_at_least(bans.event_id, 'post_lead'));

create policy "bans_insert_via_function_only" on public.bans
  for insert with check (false);  -- les insert se font via Edge fn ban_validator

-- ─── SIGNED ENGAGEMENTS ────────────────────────────────────────────
create policy "engagements_select_self" on public.signed_engagements
  for select using (user_id = auth.uid());

create policy "engagements_select_lead" on public.signed_engagements
  for select using (public.has_role_at_least(signed_engagements.event_id, 'volunteer_lead'));

create policy "engagements_insert_self" on public.signed_engagements
  for insert with check (user_id = auth.uid());

-- ─── SCAN EVENTS ───────────────────────────────────────────────────
create policy "scans_insert_staff" on public.scan_events
  for insert with check (
    scanned_by = auth.uid()
    and (
      public.has_role_at_least(scan_events.event_id, 'staff_scan')
      or exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid()
          and m.event_id = scan_events.event_id
          and m.is_entry_scanner = true
          and m.is_active = true
      )
    )
  );

create policy "scans_select_volunteer_self" on public.scan_events
  for select using (volunteer_user_id = auth.uid());

create policy "scans_select_event_lead" on public.scan_events
  for select using (public.has_role_at_least(scan_events.event_id, 'staff_scan'));

-- ─── AUDIT LOG (immuable, no update/no delete) ─────────────────────
create policy "audit_select_lead" on public.audit_log
  for select using (
    event_id is null
    or public.has_role_at_least(audit_log.event_id, 'volunteer_lead')
  );

create policy "audit_insert_authenticated" on public.audit_log
  for insert with check (auth.uid() is not null);

-- IMMUTABLE : pas d'update ni de delete possible (RLS bloque tout)
create policy "audit_no_update" on public.audit_log
  for update using (false);

create policy "audit_no_delete" on public.audit_log
  for delete using (false);

-- ─── 20260430000008_seed_rdl_2026.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000008 — SEED RDL 2026 + ICMPACA
-- Données de seed pour démo + tests J1-J5.
-- Exécuté manuellement via : pnpm db:seed
-- ════════════════════════════════════════════════════════════════════

-- ─── Organization ICMPACA ──────────────────────────────────────────
insert into public.organizations (id, name, slug, contact_email, billing_plan, ban_required_approvals)
values (
  '11111111-1111-1111-1111-111111111111',
  'ICMPACA',
  'icmpaca',
  'contact@icmpaca.fr',
  'festival',
  3
) on conflict (slug) do nothing;

-- ─── Event RDL 2026 ────────────────────────────────────────────────
insert into public.events (
  id, organization_id, name, slug, description,
  starts_at, ends_at, location, geo_lat, geo_lng, status,
  registration_open_at, registration_close_at,
  itinerary_enabled, wellbeing_enabled, safer_alerts_enabled
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Roots du Lac 2026',
  'rdl-2026',
  'Festival reggae au Lac de Sainte-Croix. 28-30 mai 2026.',
  '2026-05-28 17:00:00+02',
  '2026-05-30 23:59:00+02',
  'Lac de Sainte-Croix, Verdon',
  43.7611, 6.1481,
  'open',
  '2026-04-01 00:00:00+02',
  '2026-05-25 23:59:00+02',
  false,  -- pas d'itinéraire (verbatim Pam)
  true,
  true
) on conflict (organization_id, slug) do nothing;

-- ─── Event Frégus Reggae Festival (placeholder pour multi-tenant demo) ───
insert into public.events (
  id, organization_id, name, slug, description,
  starts_at, ends_at, location, status
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Frégus Reggae Festival',
  'fregus-reggae-2026',
  'Festival reggae à Fréjus. Été 2026.',
  '2026-07-15 18:00:00+02',
  '2026-07-17 23:59:00+02',
  'Fréjus, Var',
  'draft'
) on conflict (organization_id, slug) do nothing;

-- ─── 18 Postes RDL 2026 ────────────────────────────────────────────
insert into public.positions (event_id, name, slug, description, color, icon, display_order, needs_count_default) values
('22222222-2222-2222-2222-222222222222', 'Bar', 'bar', 'Service boissons (jetons papier).', '#F59E0B', '🍺', 1, 4),
('22222222-2222-2222-2222-222222222222', 'Catering', 'catering', 'Repas bénévoles, artistes, staff.', '#10B981', '🍽️', 2, 3),
('22222222-2222-2222-2222-222222222222', 'Brigade Verte', 'brigade-verte', 'Propreté du site, tri sélectif.', '#22C55E', '♻️', 3, 4),
('22222222-2222-2222-2222-222222222222', 'Camping', 'camping', 'Accueil campeurs, contrôle bracelets.', '#84CC16', '⛺', 4, 2),
('22222222-2222-2222-2222-222222222222', 'Loges', 'loges', 'Accueil artistes, hospitality.', '#A855F7', '🎤', 5, 2),
('22222222-2222-2222-2222-222222222222', 'Scan / Bracelet', 'scan-bracelet', 'Première guérite : check-in bénévoles.', '#EF4444', '🎟️', 6, 2),
('22222222-2222-2222-2222-222222222222', 'Caisse Billetterie', 'caisse-billetterie', 'Vente sur place, retrait billets.', '#3B82F6', '💳', 7, 2),
('22222222-2222-2222-2222-222222222222', 'Caisse Jetons', 'caisse-jetons', 'Vente jetons boisson papier.', '#FACC15', '🪙', 8, 3),
('22222222-2222-2222-2222-222222222222', 'Backline', 'backline', 'Logistique technique scène.', '#1E293B', '🎛️', 9, 2),
('22222222-2222-2222-2222-222222222222', 'Parking', 'parking', 'Gestion parkings, fluidité circulation.', '#64748B', '🚗', 10, 3),
('22222222-2222-2222-2222-222222222222', 'Run / Runners', 'run', 'Petites courses logistiques (permis B).', '#06B6D4', '🚐', 11, 2),
('22222222-2222-2222-2222-222222222222', 'Signalétique', 'signaletique', 'Pose et dépose panneaux.', '#0EA5E9', '🪧', 12, 2),
('22222222-2222-2222-2222-222222222222', 'Ateliers / Animations', 'ateliers-animations', 'Animation famille, kids corner.', '#EC4899', '🎨', 13, 3),
('22222222-2222-2222-2222-222222222222', 'Merch', 'merch', 'Vente merchandising festival.', '#F97316', '👕', 14, 2),
('22222222-2222-2222-2222-222222222222', 'Jeudi Montage', 'jeudi-montage', 'Montage J-1 : structures, scènes, stands.', '#78716C', '🔧', 15, 19),
('22222222-2222-2222-2222-222222222222', 'Vendredi Montage / Démontage', 'vendredi-montage-demontage', 'Renforts montage + démontage.', '#92400E', '🛠️', 16, 8),
('22222222-2222-2222-2222-222222222222', 'Point Info', 'point-info', 'Accueil public, infos pratiques.', '#6366F1', 'ℹ️', 17, 2),
('22222222-2222-2222-2222-222222222222', 'Équipe Jérémy Besset', 'jeremy-besset-equipe', 'Équipe artiste dédiée.', '#7C3AED', '🎼', 18, 2)
on conflict (event_id, slug) do nothing;

-- ─── Quelques shifts seed (à enrichir J3) ──────────────────────────
-- Bar — Vendredi 29 mai soir
insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 18:00:00+02', '2026-05-29 22:00:00+02', 4, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'bar';

insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 22:00:00+02', '2026-05-30 02:00:00+02', 4, false
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'bar';

-- Catering — Vendredi midi/soir
insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 11:00:00+02', '2026-05-29 14:00:00+02', 3, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'catering';

insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 17:00:00+02', '2026-05-29 21:00:00+02', 3, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'catering';

-- Jeudi montage : 19 bénévoles toute la journée
insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-28 09:00:00+02', '2026-05-28 18:00:00+02', 19, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'jeudi-montage';

-- Audit log seed
select public.log_audit('seed.applied', '22222222-2222-2222-2222-222222222222',
  '{"name": "20260430000008_seed_rdl_2026", "applied_at": "2026-04-30T00:00:00Z"}'::jsonb);

-- ─── 20260430000009_seed_volunteers_shifts.sql ─────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════
-- 20260430000009 — SEED ENRICHI : 30 bénévoles fictifs + 80 shifts
-- À exécuter APRÈS 20260430000008_seed_rdl_2026.sql
-- ════════════════════════════════════════════════════════════════════

-- Note : auth.users ne se crée pas via SQL standard (Supabase Auth gère).
-- On insère directement dans volunteer_profiles avec des UUID stables pour
-- pouvoir reconstituer les liens. Ces profils seront branchés à de vrais users
-- via le script seed-users.ts (Edge invokable / admin script).

do $$
declare
  rdl_id uuid := '22222222-2222-2222-2222-222222222222';
  pos_bar_id uuid;
  pos_catering_id uuid;
  pos_brigade_id uuid;
  pos_loges_id uuid;
  pos_scan_id uuid;
  pos_caisse_billet_id uuid;
  pos_caisse_jetons_id uuid;
  pos_camping_id uuid;
  pos_parking_id uuid;
  pos_montage_id uuid;
  pos_demontage_id uuid;
  pos_atelier_id uuid;
  pos_run_id uuid;
  pos_signa_id uuid;
  pos_merch_id uuid;
  pos_backline_id uuid;
  pos_pointinfo_id uuid;
  pos_jeremy_id uuid;
begin
  select id into pos_bar_id from positions where event_id = rdl_id and slug = 'bar';
  select id into pos_catering_id from positions where event_id = rdl_id and slug = 'catering';
  select id into pos_brigade_id from positions where event_id = rdl_id and slug = 'brigade-verte';
  select id into pos_loges_id from positions where event_id = rdl_id and slug = 'loges';
  select id into pos_scan_id from positions where event_id = rdl_id and slug = 'scan-bracelet';
  select id into pos_caisse_billet_id from positions where event_id = rdl_id and slug = 'caisse-billetterie';
  select id into pos_caisse_jetons_id from positions where event_id = rdl_id and slug = 'caisse-jetons';
  select id into pos_camping_id from positions where event_id = rdl_id and slug = 'camping';
  select id into pos_parking_id from positions where event_id = rdl_id and slug = 'parking';
  select id into pos_montage_id from positions where event_id = rdl_id and slug = 'jeudi-montage';
  select id into pos_demontage_id from positions where event_id = rdl_id and slug = 'vendredi-montage-demontage';
  select id into pos_atelier_id from positions where event_id = rdl_id and slug = 'ateliers-animations';
  select id into pos_run_id from positions where event_id = rdl_id and slug = 'run';
  select id into pos_signa_id from positions where event_id = rdl_id and slug = 'signaletique';
  select id into pos_merch_id from positions where event_id = rdl_id and slug = 'merch';
  select id into pos_backline_id from positions where event_id = rdl_id and slug = 'backline';
  select id into pos_pointinfo_id from positions where event_id = rdl_id and slug = 'point-info';
  select id into pos_jeremy_id from positions where event_id = rdl_id and slug = 'jeremy-besset-equipe';

  -- ─── SHIFTS ENRICHIS (80 shifts répartis sur 18 postes × 3 jours) ───
  -- Bar : vendredi 18h-22h, vendredi 22h-2h, samedi 14h-18h, samedi 18h-22h, samedi 22h-2h, dimanche 12h-18h, dimanche 18h-22h
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_bar_id, '2026-05-29 18:00+02', '2026-05-29 22:00+02', 4, true),
    (pos_bar_id, '2026-05-29 22:00+02', '2026-05-30 02:00+02', 4, false),
    (pos_bar_id, '2026-05-30 14:00+02', '2026-05-30 18:00+02', 4, true),
    (pos_bar_id, '2026-05-30 18:00+02', '2026-05-30 22:00+02', 4, true),
    (pos_bar_id, '2026-05-30 22:00+02', '2026-05-31 02:00+02', 4, false),
    (pos_bar_id, '2026-05-31 12:00+02', '2026-05-31 18:00+02', 3, true),
    (pos_bar_id, '2026-05-31 18:00+02', '2026-05-31 22:00+02', 3, true)
  on conflict do nothing;

  -- Catering : tous les jours midi+soir
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_catering_id, '2026-05-28 11:00+02', '2026-05-28 14:00+02', 3, true),
    (pos_catering_id, '2026-05-28 17:00+02', '2026-05-28 21:00+02', 3, true),
    (pos_catering_id, '2026-05-29 11:00+02', '2026-05-29 14:00+02', 3, true),
    (pos_catering_id, '2026-05-29 17:00+02', '2026-05-29 21:00+02', 3, true),
    (pos_catering_id, '2026-05-30 11:00+02', '2026-05-30 14:00+02', 3, true),
    (pos_catering_id, '2026-05-30 17:00+02', '2026-05-30 21:00+02', 3, true),
    (pos_catering_id, '2026-05-31 11:00+02', '2026-05-31 14:00+02', 3, true)
  on conflict do nothing;

  -- Brigade Verte : 4 créneaux de propreté par jour
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_brigade_id, '2026-05-29 08:00+02', '2026-05-29 12:00+02', 4, true),
    (pos_brigade_id, '2026-05-29 14:00+02', '2026-05-29 18:00+02', 4, true),
    (pos_brigade_id, '2026-05-30 08:00+02', '2026-05-30 12:00+02', 4, true),
    (pos_brigade_id, '2026-05-30 14:00+02', '2026-05-30 18:00+02', 4, true),
    (pos_brigade_id, '2026-05-31 08:00+02', '2026-05-31 12:00+02', 4, true),
    (pos_brigade_id, '2026-05-31 14:00+02', '2026-05-31 18:00+02', 4, true)
  on conflict do nothing;

  -- Scan/Bracelet : présent dès 17h chaque soir d'accueil
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_scan_id, '2026-05-29 17:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_scan_id, '2026-05-30 14:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_scan_id, '2026-05-31 12:00+02', '2026-05-31 21:00+02', 2, true)
  on conflict do nothing;

  -- Caisse Billetterie + Jetons : créneaux d'ouverture
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_caisse_billet_id, '2026-05-29 17:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_caisse_billet_id, '2026-05-30 14:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_caisse_billet_id, '2026-05-31 12:00+02', '2026-05-31 21:00+02', 2, true),
    (pos_caisse_jetons_id, '2026-05-29 18:00+02', '2026-05-29 23:00+02', 3, true),
    (pos_caisse_jetons_id, '2026-05-29 23:00+02', '2026-05-30 02:00+02', 3, false),
    (pos_caisse_jetons_id, '2026-05-30 14:00+02', '2026-05-30 23:00+02', 3, true),
    (pos_caisse_jetons_id, '2026-05-30 23:00+02', '2026-05-31 02:00+02', 3, false)
  on conflict do nothing;

  -- Loges : artistes
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_loges_id, '2026-05-29 16:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_loges_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_loges_id, '2026-05-31 12:00+02', '2026-05-31 20:00+02', 2, true)
  on conflict do nothing;

  -- Camping : 24/7 via créneaux de 8h
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_camping_id, '2026-05-29 14:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_camping_id, '2026-05-29 22:00+02', '2026-05-30 06:00+02', 2, false),
    (pos_camping_id, '2026-05-30 06:00+02', '2026-05-30 14:00+02', 2, true),
    (pos_camping_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_camping_id, '2026-05-30 22:00+02', '2026-05-31 06:00+02', 2, false),
    (pos_camping_id, '2026-05-31 06:00+02', '2026-05-31 14:00+02', 2, true)
  on conflict do nothing;

  -- Parking : aux pics d'arrivée et départ
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_parking_id, '2026-05-29 16:00+02', '2026-05-29 22:00+02', 3, true),
    (pos_parking_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 3, true),
    (pos_parking_id, '2026-05-31 11:00+02', '2026-05-31 14:00+02', 2, true),
    (pos_parking_id, '2026-05-31 21:00+02', '2026-06-01 01:00+02', 3, false)
  on conflict do nothing;

  -- Jeudi Montage (J-1) : 19 bénévoles
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_montage_id, '2026-05-28 09:00+02', '2026-05-28 18:00+02', 19, true)
  on conflict do nothing;

  -- Vendredi Montage / Démontage
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_demontage_id, '2026-05-29 09:00+02', '2026-05-29 14:00+02', 8, true),
    (pos_demontage_id, '2026-06-01 08:00+02', '2026-06-01 18:00+02', 12, true)
  on conflict do nothing;

  -- Ateliers / Animations : samedi+dimanche après-midi
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_atelier_id, '2026-05-30 14:00+02', '2026-05-30 19:00+02', 3, true),
    (pos_atelier_id, '2026-05-31 14:00+02', '2026-05-31 19:00+02', 3, true)
  on conflict do nothing;

  -- Runners
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_run_id, '2026-05-29 14:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_run_id, '2026-05-30 12:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_run_id, '2026-05-31 12:00+02', '2026-05-31 20:00+02', 2, true)
  on conflict do nothing;

  -- Signalétique : pose mercredi+jeudi, dépose dimanche soir
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_signa_id, '2026-05-27 14:00+02', '2026-05-27 18:00+02', 2, false),
    (pos_signa_id, '2026-05-28 09:00+02', '2026-05-28 14:00+02', 2, true),
    (pos_signa_id, '2026-05-31 22:00+02', '2026-06-01 01:00+02', 2, false)
  on conflict do nothing;

  -- Merch : pendant les concerts
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_merch_id, '2026-05-29 18:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_merch_id, '2026-05-30 16:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_merch_id, '2026-05-31 14:00+02', '2026-05-31 21:00+02', 2, true)
  on conflict do nothing;

  -- Backline : à la transition entre groupes
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_backline_id, '2026-05-29 18:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_backline_id, '2026-05-30 16:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_backline_id, '2026-05-31 14:00+02', '2026-05-31 21:00+02', 2, true)
  on conflict do nothing;

  -- Point Info : tous les jours
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_pointinfo_id, '2026-05-29 17:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_pointinfo_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_pointinfo_id, '2026-05-31 12:00+02', '2026-05-31 20:00+02', 2, true)
  on conflict do nothing;

  -- Jérémy Besset (artiste dédié)
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_jeremy_id, '2026-05-30 16:00+02', '2026-05-30 23:00+02', 2, true)
  on conflict do nothing;

end$$;

-- ─── 30 candidatures fictives (sans compte auth — pour démo back-office) ───
insert into volunteer_applications (
  event_id, email, full_name, first_name, last_name, birth_date, is_minor,
  phone, profession, size, arrival_at, departure_at,
  preferred_position_slugs, skills, limitations, bio, is_returning,
  consent_pii_at, consent_charter_at, consent_anti_harass_at,
  status, source
) values
('22222222-2222-2222-2222-222222222222', 'pam.morin@example.com', 'Pam Morin', 'Pam', 'Morin', '1985-03-12', false, '+33611111111', 'Régisseuse', 'M', '2026-05-28 09:00+02', '2026-06-01 18:00+02', array['scan-bracelet','caisse-billetterie','point-info'], array['communication','experience_festival'], array[]::text[], 'Régisseuse RDL depuis 5 éditions.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'mahaut@example.com', 'Mahaut Lefèvre', 'Mahaut', 'Lefèvre', '1990-07-22', false, '+33622222222', 'Barmaid', 'S', '2026-05-29 16:00+02', '2026-05-31 23:00+02', array['bar','caisse-jetons'], array['service','communication'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'dorothee@example.com', 'Dorothée Carlo', 'Dorothée', 'Carlo', '1992-01-05', false, '+33633333333', 'Responsable bénévoles', 'M', '2026-05-28 09:00+02', '2026-06-01 18:00+02', array['scan-bracelet','point-info','signaletique'], array['communication','experience_festival'], array[]::text[], 'Co-organisatrice ICMPACA.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'stephane@example.com', 'Stéphane Taramino', 'Stéphane', 'Taramino', '1978-09-14', false, '+33644444444', 'Cuisinier', 'L', '2026-05-28 08:00+02', '2026-06-01 12:00+02', array['catering'], array['cuisine','manutention_lourde'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'antoine@example.com', 'Antoine Loiret', 'Antoine', 'Loiret', '1995-04-18', false, '+33655555555', 'Étudiant', 'M', '2026-05-29 09:00+02', '2026-06-01 12:00+02', array['brigade-verte','run'], array['permis_b','manutention_lourde'], array[]::text[], null, false, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'florence@example.com', 'Florence Aubin', 'Florence', 'Aubin', '1988-11-30', false, '+33666666666', 'Infirmière', 'M', '2026-05-29 10:00+02', '2026-06-01 12:00+02', array['point-info','catering','ateliers-animations'], array['secourisme','communication'], array[]::text[], 'Premiers secours à dispo si besoin.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'aurelien@example.com', 'Aurélien Bouchet', 'Aurélien', 'Bouchet', '1991-02-08', false, '+33677777777', 'Régisseur son', 'L', '2026-05-28 09:00+02', '2026-06-01 18:00+02', array['backline','jeremy-besset-equipe'], array['regie_son','manutention_lourde'], array[]::text[], 'Régisseur son depuis 8 ans.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'fred@example.com', 'Fred Marchand', 'Fred', 'Marchand', '1980-06-25', false, '+33688888888', 'Charpentier', 'XL', '2026-05-27 09:00+02', '2026-06-01 18:00+02', array['jeudi-montage','vendredi-montage-demontage'], array['manutention_lourde','permis_b'], array[]::text[], 'Connait le montage du chapiteau.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'willy@example.com', 'Willy Roche', 'Willy', 'Roche', '1983-12-03', false, '+33699999999', 'Chauffeur', 'L', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['parking','run'], array['permis_b'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'sandy@example.com', 'Sandy Berger', 'Sandy', 'Berger', '1993-08-19', false, '+33611002233', 'Animatrice', 'S', '2026-05-30 12:00+02', '2026-05-31 22:00+02', array['ateliers-animations'], array['communication'], array[]::text[], 'Mediator·ice safer space.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'gael@example.com', 'Gael Martin', 'Gael', 'Martin', '1986-05-11', false, '+33611223344', 'Médiateur', 'M', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['point-info','signaletique'], array['communication','anglais'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'romane@example.com', 'Romane Dupont', 'Romane', 'Dupont', '1996-03-27', false, '+33611334455', 'Étudiante', 'S', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['caisse-jetons','merch'], array['service'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'lucas@example.com', 'Lucas Petit', 'Lucas', 'Petit', '1999-11-14', false, '+33611445566', 'Étudiant', 'L', '2026-05-29 18:00+02', '2026-06-01 12:00+02', array['bar','catering'], array['service'], array[]::text[], 'Première fois en festival.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'emma@example.com', 'Emma Garcia', 'Emma', 'Garcia', '2009-07-09', true, '+33611556677', 'Lycéenne', 'XS', '2026-05-30 14:00+02', '2026-05-31 22:00+02', array['ateliers-animations','merch'], array[]::text[], array[]::text[], 'Mineure (16 ans), autorisation parentale envoyée.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'thomas@example.com', 'Thomas Léger', 'Thomas', 'Léger', '1994-09-21', false, '+33611667788', 'Développeur', 'L', '2026-05-29 18:00+02', '2026-06-01 12:00+02', array['signaletique','run'], array['anglais','manutention_lourde'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'manon@example.com', 'Manon Delcourt', 'Manon', 'Delcourt', '1997-04-12', false, '+33611778899', 'Graphiste', 'M', '2026-05-30 14:00+02', '2026-06-01 12:00+02', array['point-info','merch','signaletique'], array['communication'], array[]::text[], null, false, now(), now(), now(), 'pre_selected', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'kevin@example.com', 'Kevin Roux', 'Kevin', 'Roux', '1989-10-05', false, '+33611889900', 'Maçon', 'XL', '2026-05-27 14:00+02', '2026-06-01 18:00+02', array['jeudi-montage','vendredi-montage-demontage','signaletique'], array['manutention_lourde','permis_b'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'julie@example.com', 'Julie Moreau', 'Julie', 'Moreau', '1992-06-30', false, '+33611990011', 'Pâtissière', 'S', '2026-05-29 09:00+02', '2026-05-31 22:00+02', array['catering'], array['cuisine'], array[]::text[], 'Régime végétarien.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'amelie@example.com', 'Amélie Vernier', 'Amélie', 'Vernier', '1990-02-17', false, '+33611001122', 'Coiffeuse', 'M', '2026-05-30 14:00+02', '2026-05-31 22:00+02', array['loges','merch'], array['service','anglais'], array[]::text[], null, false, now(), now(), now(), 'reserve', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'max@example.com', 'Maxime Berger', 'Maxime', 'Berger', '1985-08-08', false, '+33611112233', 'Photographe', 'L', '2026-05-29 18:00+02', '2026-06-01 02:00+02', array['point-info','run'], array['communication'], array['acrophobie'], 'Pas en hauteur svp.', true, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'leo@example.com', 'Léo Schmitt', 'Léo', 'Schmitt', '1998-12-12', false, '+33611223345', 'Étudiant', 'M', '2026-05-30 14:00+02', '2026-06-01 02:00+02', array['brigade-verte','catering'], array[]::text[], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'sarah@example.com', 'Sarah Aitouali', 'Sarah', 'Aitouali', '2008-03-22', true, '+33611334456', 'Lycéenne', 'XS', '2026-05-30 14:00+02', '2026-05-31 20:00+02', array['ateliers-animations'], array[]::text[], array[]::text[], 'Mineure (17 ans), autorisation parentale OK.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'nicolas@example.com', 'Nicolas Bertrand', 'Nicolas', 'Bertrand', '1981-05-04', false, '+33611445567', 'Mécanicien', 'XL', '2026-05-29 14:00+02', '2026-06-01 18:00+02', array['parking','run','jeudi-montage'], array['permis_b','manutention_lourde'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'clara@example.com', 'Clara Dubois', 'Clara', 'Dubois', '1995-09-28', false, '+33611556678', 'Soignante', 'M', '2026-05-29 17:00+02', '2026-06-01 12:00+02', array['point-info','catering'], array['secourisme','communication'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'paul@example.com', 'Paul Henry', 'Paul', 'Henry', '1987-01-19', false, '+33611667789', 'Sound designer', 'L', '2026-05-28 12:00+02', '2026-06-01 12:00+02', array['backline','jeremy-besset-equipe'], array['regie_son'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'helene@example.com', 'Hélène Pacaud', 'Hélène', 'Pacaud', '1993-04-04', false, '+33611778890', 'Prof', 'M', '2026-05-29 17:00+02', '2026-06-01 02:00+02', array['caisse-billetterie','scan-bracelet'], array['communication','anglais'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'mathieu@example.com', 'Mathieu Lefebvre', 'Mathieu', 'Lefebvre', '1979-07-15', false, '+33611889901', 'Chauffeur', 'XL', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['parking','run'], array['permis_b'], array['dos_fragile'], 'Pas de manutention lourde svp.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'agathe@example.com', 'Agathe Bossard', 'Agathe', 'Bossard', '1996-11-23', false, '+33611990012', 'Étudiante', 'S', '2026-05-30 14:00+02', '2026-06-01 02:00+02', array['merch','ateliers-animations'], array['service'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'olivier@example.com', 'Olivier Klein', 'Olivier', 'Klein', '1984-02-10', false, '+33611001123', 'Électricien', 'L', '2026-05-27 09:00+02', '2026-06-01 18:00+02', array['jeudi-montage','signaletique','vendredi-montage-demontage'], array['manutention_lourde','permis_b'], array[]::text[], 'Habilitation électrique.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'lina@example.com', 'Lina Saadi', 'Lina', 'Saadi', '1992-05-06', false, '+33611112234', 'Communicante', 'S', '2026-05-29 17:00+02', '2026-06-01 02:00+02', array['point-info','signaletique','merch'], array['communication','anglais'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form')
on conflict do nothing;

-- Audit log
select log_audit('seed.enriched.applied', '22222222-2222-2222-2222-222222222222',
  '{"name": "20260430000009_seed_volunteers_shifts", "applications": 30, "shifts_added": 80}'::jsonb);
