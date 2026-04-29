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
