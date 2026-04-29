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
