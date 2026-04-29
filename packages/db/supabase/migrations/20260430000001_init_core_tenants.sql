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
