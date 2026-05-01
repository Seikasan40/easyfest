-- ════════════════════════════════════════════════════════════════════
-- 20260501000020 — ONBOARDING SELF-SERVICE (OC-01)
-- Wizard direction : créer son association + 1er event + template
-- + inviter son équipe, sans intervention manuelle.
-- Additif — coexiste avec onboardCurrentUser() (auto-upgrade bénévole).
-- ════════════════════════════════════════════════════════════════════

-- ─── Catalogue de templates d'événement ─────────────────────────────
create table public.event_templates (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  jauge_label   text,                                 -- ex "≤ 500 personnes"
  positions     jsonb not null default '[]'::jsonb,   -- [{slug, name, icon, color, description, needs_count_default}]
  is_public     boolean not null default true,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index idx_event_templates_public on public.event_templates(display_order)
  where is_public = true;

alter table public.event_templates enable row level security;

-- Lecture publique (tout le monde peut voir les templates pour le wizard, même non authentifié)
create policy "templates_select_public" on public.event_templates
  for select using (is_public = true);

-- ─── Seed des 3 templates ────────────────────────────────────────────
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
  );

-- ─── RPC : créer une organisation + 1er event + memberships direction
-- + applique le template choisi (positions seed).
-- Security definer pour bypass les policies events_insert / memberships_insert
-- (qui exigent un rôle direction préalable que le créateur ne peut pas avoir).
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

  -- Validations basiques
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

  -- Vérifie que le slug org est libre
  if exists (select 1 from public.organizations where slug = p_org_slug) then
    raise exception 'org_slug_taken' using errcode = '23505';
  end if;

  -- 1. Création organisation
  insert into public.organizations (name, slug, contact_email)
  values (p_org_name, p_org_slug, (select email from auth.users where id = uid))
  returning id into v_org_id;

  -- 2. Création event (status draft, le user pourra l'ouvrir depuis /regie)
  insert into public.events (organization_id, name, slug, starts_at, ends_at, status)
  values (v_org_id, p_event_name, p_event_slug, p_event_starts, p_event_ends, 'draft')
  returning id into v_evt_id;

  -- 3. Membership direction pour le créateur
  insert into public.memberships (user_id, event_id, role, is_active, accepted_at)
  values (uid, v_evt_id, 'direction', true, now());

  -- 4. Application du template (positions seed)
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

  -- 5. Audit
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

grant execute on function public.bootstrap_org_for_user(text, text, text, text, timestamptz, timestamptz, text) to authenticated;
