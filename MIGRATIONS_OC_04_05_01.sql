-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATIONS OC-04 + OC-05 + OC-01  —  À COLLER DANS SUPABASE STUDIO
--
-- Cible : projet Supabase prod wsmehckdgnpbzwjvotro
-- URL   : https://supabase.com/dashboard/project/wsmehckdgnpbzwjvotro/sql/new
--
-- Ce fichier regroupe les 2 migrations Easyfest J3 en version IDEMPOTENTE
-- (rerunnable sans erreur). Origines :
--   • packages/db/supabase/migrations/20260501000010_rgpd_soft_delete.sql (OC-04+05)
--   • packages/db/supabase/migrations/20260501000020_onboarding.sql       (OC-01)
--
-- Aussi rerunnable plusieurs fois sans casser ce qui existe (IF NOT EXISTS,
-- DROP/CREATE pour les policies, ON CONFLICT pour les seeds, CREATE OR REPLACE
-- pour les fonctions).
--
-- Edge function `rgpd_hard_delete` (cron purge daily) : NON inclus ici.
-- À déployer séparément via `supabase functions deploy rgpd_hard_delete`
-- depuis le CLI authentifié — ou skip pour la démo Pam dimanche
-- (le soft-delete + restore via UI fonctionnent sans le cron).
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ════════════════════════════════════════════════════════════════════════════
-- BLOC 1 — OC-04 + OC-05 : RGPD soft-delete 30j (export + delete + restore)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Colonnes soft-delete sur volunteer_profiles ────────────────────────
alter table public.volunteer_profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deleted_at            timestamptz;

comment on column public.volunteer_profiles.deletion_requested_at is
  'Horodatage de la demande utilisateur (Art.17). UI affiche "annuler" tant que deleted_at > now().';
comment on column public.volunteer_profiles.deleted_at is
  'Date prévue de purge hard (deletion_requested_at + 30 jours, SLA produit). Profil masqué des leads quand non-null.';

create index if not exists idx_vp_pending_hard_delete
  on public.volunteer_profiles(deleted_at)
  where deleted_at is not null;

-- ─── RLS : masquer les comptes soft-deleted des vues lead/post_lead ────
-- Le user lui-même garde l'accès via vp_select_self pour voir le statut "scheduled for deletion".
drop policy if exists "vp_select_event_lead" on public.volunteer_profiles;
create policy "vp_select_event_lead" on public.volunteer_profiles
  for select using (
    deleted_at is null
    and exists (
      select 1 from public.memberships m
      where m.user_id = volunteer_profiles.user_id
        and public.has_role_at_least(m.event_id, 'volunteer_lead')
    )
  );

drop policy if exists "vp_select_post_lead_team" on public.volunteer_profiles;
create policy "vp_select_post_lead_team" on public.volunteer_profiles
  for select using (
    deleted_at is null
    and exists (
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

-- ─── RPC : demande de suppression Art.17 ────────────────────────────────
create or replace function public.rgpd_request_self_delete()
returns timestamptz
language plpgsql security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  recovery_until timestamptz;
begin
  if uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  recovery_until := now() + interval '30 days';

  update public.volunteer_profiles
     set deletion_requested_at = now(),
         deleted_at            = recovery_until
   where user_id = uid;

  insert into public.audit_log (user_id, action, payload)
  values (
    uid,
    'rgpd.deletion.requested',
    jsonb_build_object(
      'recovery_until', recovery_until,
      'profile_existed', found
    )
  );

  return recovery_until;
end;
$$;

comment on function public.rgpd_request_self_delete is
  'OC-05 : initie la suppression Art.17 avec soft-delete 30j (SLA produit). Retourne la date de purge prévue.';

-- ─── RPC : annulation de suppression (dans la fenêtre 30j) ─────────────
create or replace function public.rgpd_restore_self()
returns boolean
language plpgsql security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  did_restore boolean := false;
begin
  if uid is null then
    return false;
  end if;

  update public.volunteer_profiles
     set deletion_requested_at = null,
         deleted_at            = null
   where user_id = uid
     and deleted_at is not null
     and deleted_at > now();

  did_restore := found;

  if did_restore then
    insert into public.audit_log (user_id, action, payload)
    values (uid, 'rgpd.deletion.cancelled', '{}'::jsonb);
  end if;

  return did_restore;
end;
$$;

comment on function public.rgpd_restore_self is
  'OC-05 : annule la suppression Art.17 si encore dans la fenêtre 30j. Retourne true si restauré.';

grant execute on function public.rgpd_request_self_delete() to authenticated;
grant execute on function public.rgpd_restore_self()         to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- BLOC 2 — OC-01 : Onboarding self-service (event_templates + bootstrap RPC)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Catalogue de templates ─────────────────────────────────────────────
create table if not exists public.event_templates (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  jauge_label   text,
  positions     jsonb not null default '[]'::jsonb,
  is_public     boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_event_templates_public
  on public.event_templates(display_order)
  where is_public = true;

alter table public.event_templates enable row level security;

-- Policy create-or-skip via DO block (pas de IF NOT EXISTS sur create policy en PG14)
do $$
begin
  create policy "templates_select_public" on public.event_templates
    for select using (is_public = true);
exception when duplicate_object then null;
end$$;

-- ─── Seed des 3 templates (idempotent via ON CONFLICT) ─────────────────
insert into public.event_templates (slug, name, description, jauge_label, positions, display_order)
values
  (
    'festival-musique-petite-jauge',
    'Festival musique — petite jauge',
    'Festival associatif jusqu''à 500 personnes. Postes essentiels en équipe réduite.',
    '≤ 500 personnes',
    '[
      {"slug":"billetterie","name":"Billetterie","icon":"🎟️","color":"#E94B6F","description":"Accueil et scan des billets","needs_count_default":3},
      {"slug":"bar","name":"Bar","icon":"🍻","color":"#FFA500","description":"Service boissons","needs_count_default":4},
      {"slug":"catering","name":"Catering bénévoles","icon":"🍽️","color":"#22C55E","description":"Repas équipe","needs_count_default":2},
      {"slug":"accueil-public","name":"Accueil public","icon":"👋","color":"#3B82F6","description":"Information et orientation","needs_count_default":2},
      {"slug":"montage","name":"Montage / Démontage","icon":"🔧","color":"#A855F7","description":"Installation et rangement du site","needs_count_default":4}
    ]'::jsonb,
    10
  ),
  (
    'festival-musique-moyenne-jauge',
    'Festival musique — moyenne jauge',
    'Festival 500–2000 personnes. Postes structurés en équipes spécialisées.',
    '500 – 2 000 personnes',
    '[
      {"slug":"billetterie","name":"Billetterie","icon":"🎟️","color":"#E94B6F","description":"Accueil et scan des billets","needs_count_default":6},
      {"slug":"bar","name":"Bar","icon":"🍻","color":"#FFA500","description":"Service boissons","needs_count_default":10},
      {"slug":"catering","name":"Catering bénévoles","icon":"🍽️","color":"#22C55E","description":"Repas équipe","needs_count_default":4},
      {"slug":"backline","name":"Backline","icon":"🎸","color":"#0EA5E9","description":"Plateau technique scène","needs_count_default":3},
      {"slug":"loges","name":"Loges artistes","icon":"🎤","color":"#EC4899","description":"Hospitality artistes","needs_count_default":3},
      {"slug":"brigade-verte","name":"Brigade verte","icon":"♻️","color":"#10B981","description":"Tri et nettoyage du site","needs_count_default":4},
      {"slug":"camping","name":"Camping","icon":"⛺","color":"#84CC16","description":"Accueil camping bénévoles","needs_count_default":2},
      {"slug":"montage","name":"Montage / Démontage","icon":"🔧","color":"#A855F7","description":"Installation et rangement du site","needs_count_default":8}
    ]'::jsonb,
    20
  ),
  (
    'evenement-associatif',
    'Événement associatif générique',
    'Squelette minimal pour toute manifestation associative. À personnaliser ensuite.',
    'Toutes tailles',
    '[
      {"slug":"accueil","name":"Accueil","icon":"👋","color":"#3B82F6","description":"Accueil des participant·es","needs_count_default":2},
      {"slug":"logistique","name":"Logistique","icon":"📦","color":"#A855F7","description":"Matériel et installation","needs_count_default":2},
      {"slug":"buvette","name":"Buvette","icon":"🥤","color":"#FFA500","description":"Vente boissons / snacks","needs_count_default":3},
      {"slug":"animation","name":"Animation","icon":"🎉","color":"#EC4899","description":"Animation publique","needs_count_default":2}
    ]'::jsonb,
    30
  )
on conflict (slug) do update set
  name          = excluded.name,
  description   = excluded.description,
  jauge_label   = excluded.jauge_label,
  positions     = excluded.positions,
  display_order = excluded.display_order;

-- ─── RPC : bootstrap d'une nouvelle organisation ───────────────────────
create or replace function public.bootstrap_org_for_user(
  p_org_name      text,
  p_org_slug      text,
  p_event_name    text,
  p_event_slug    text,
  p_event_starts  timestamptz,
  p_event_ends    timestamptz,
  p_template_slug text default null
)
returns table (org_id uuid, event_id uuid, event_slug text, org_slug text)
language plpgsql security definer
set search_path = public, auth
as $$
declare
  uid       uuid := auth.uid();
  v_org_id  uuid;
  v_evt_id  uuid;
  v_template public.event_templates%rowtype;
  v_position jsonb;
begin
  if uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if length(coalesce(p_org_name, '')) < 2 then
    raise exception 'org_name_too_short' using errcode = '23514';
  end if;
  if not (p_org_slug ~ '^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$') then
    raise exception 'org_slug_invalid' using errcode = '23514';
  end if;
  if not (p_event_slug ~ '^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$') then
    raise exception 'event_slug_invalid' using errcode = '23514';
  end if;
  if p_event_ends <= p_event_starts then
    raise exception 'event_dates_invalid' using errcode = '23514';
  end if;

  if exists (select 1 from public.organizations where slug = p_org_slug) then
    raise exception 'org_slug_taken' using errcode = '23505';
  end if;

  insert into public.organizations (name, slug, contact_email)
  values (p_org_name, p_org_slug, (select email from auth.users where id = uid))
  returning id into v_org_id;

  insert into public.events (organization_id, name, slug, starts_at, ends_at, status)
  values (v_org_id, p_event_name, p_event_slug, p_event_starts, p_event_ends, 'draft')
  returning id into v_evt_id;

  insert into public.memberships (user_id, event_id, role, is_active, accepted_at)
  values (uid, v_evt_id, 'direction', true, now());

  if p_template_slug is not null then
    select * into v_template
    from public.event_templates
    where slug = p_template_slug and is_public = true;

    if found then
      for v_position in select * from jsonb_array_elements(v_template.positions)
      loop
        insert into public.positions (
          event_id, name, slug, description, color, icon, needs_count_default, display_order
        ) values (
          v_evt_id,
          v_position->>'name',
          v_position->>'slug',
          v_position->>'description',
          v_position->>'color',
          v_position->>'icon',
          coalesce((v_position->>'needs_count_default')::int, 1),
          coalesce((v_position->>'display_order')::int, 0)
        );
      end loop;
    end if;
  end if;

  insert into public.audit_log (user_id, event_id, action, payload)
  values (
    uid,
    v_evt_id,
    'onboarding.org_bootstrapped',
    jsonb_build_object(
      'org_slug', p_org_slug,
      'event_slug', p_event_slug,
      'template', p_template_slug
    )
  );

  return query select v_org_id, v_evt_id, p_event_slug, p_org_slug;
end;
$$;

comment on function public.bootstrap_org_for_user is
  'OC-01 : crée org + 1er event (draft) + membership direction + applique template positions. Security definer.';

grant execute on function public.bootstrap_org_for_user(text, text, text, text, timestamptz, timestamptz, text)
  to authenticated;

commit;


-- ════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION POST-MIGRATION (à lancer dans Supabase Studio après le commit)
-- ════════════════════════════════════════════════════════════════════════════
-- Décommenter et exécuter pour valider que tout est bien posé :
--
-- select column_name from information_schema.columns
-- where table_name = 'volunteer_profiles' and column_name in ('deletion_requested_at','deleted_at');
--
-- select count(*) as templates_seeded from public.event_templates where is_public;
--
-- select proname from pg_proc where proname in
--   ('rgpd_request_self_delete','rgpd_restore_self','bootstrap_org_for_user');


-- ════════════════════════════════════════════════════════════════════════════
-- CLEANUP TESTS — à lancer après les tests de fumée
-- ════════════════════════════════════════════════════════════════════════════
-- ATTENTION : à exécuter MANUELLEMENT, pas dans le commit ci-dessus.
-- Supprime tous les comptes oc-test-*@easyfest.test et leurs données associées
-- (cascade FK depuis auth.users).
--
--   delete from auth.users
--    where email like 'oc-test-%@easyfest.test'
--    returning email;
--
-- Si l'org test "oc-test-asso" reste orpheline (créée par OC-01 wizard) :
--
--   delete from public.organizations where slug like 'oc-test-%' returning slug;
