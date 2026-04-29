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
