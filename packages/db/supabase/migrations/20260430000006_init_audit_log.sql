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
