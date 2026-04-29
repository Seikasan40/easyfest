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
