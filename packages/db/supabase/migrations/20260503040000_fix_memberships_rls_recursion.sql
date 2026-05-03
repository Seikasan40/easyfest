-- ════════════════════════════════════════════════════════════════════
-- 20260503040000 — Fix Bug #18 : RLS recursion infinie sur memberships
--
-- Le 3 mai 2026 ~17h45 UTC : /hub renvoie "Tu n'as pas encore d'affectation"
-- pour TOUS les comptes authentifiés (Pamela direction incluse). Le pool
-- /regie/.../planning est aussi cassé.
--
-- Root cause : la policy `memberships_select_my_team_lead` ajoutée en
-- migration 20260503020000 contient un sub-query `select 1 from
-- public.memberships m_self` à l'intérieur d'une policy SELECT sur
-- memberships → Postgres détecte une récursion infinie de RLS et rejette
-- TOUTE query SELECT memberships avec `42P17 infinite recursion detected`.
--
-- Reproduction directe :
--   curl ".../rest/v1/memberships?select=role,event_id"
--     -> 42P17 infinite recursion detected in policy for relation "memberships"
--
-- Conséquence catastrophique : /hub ne peut JAMAIS lire les memberships du
-- user → tombe systématiquement sur la branche "Salut bénévole / Pas
-- encore d'affectation". Régression bloquante J-26.
--
-- Fix : extraire les sub-queries memberships dans une fonction
-- `security definer` qui bypass RLS lors de l'exécution interne. Recréer
-- les policies en utilisant la fonction. Pas de récursion possible car
-- la fonction n'invoque pas RLS quand elle SELECTe memberships.
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. Drop policies récursives ──────────────────────────────────
drop policy if exists memberships_select_my_team_lead on public.memberships;
drop policy if exists vp_select_my_team_lead on public.volunteer_profiles;
drop policy if exists vp_select_post_lead_team on public.volunteer_profiles;

-- ─── 2. Helpers SECURITY DEFINER (bypass RLS lors du sub-query) ───

-- Renvoie TRUE si auth.uid() est volunteer actif d'une équipe (memberships
-- ou assignments) dont la position == p_position_id sur p_event_id.
create or replace function public.is_volunteer_in_team(
  p_event_id uuid,
  p_position_id uuid
) returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select coalesce(
    (
      select true
      from public.memberships m_self
      where m_self.user_id = auth.uid()
        and m_self.event_id = p_event_id
        and m_self.role = 'volunteer'
        and m_self.is_active = true
        and m_self.position_id = p_position_id
      limit 1
    ),
    (
      select true
      from public.assignments a
      join public.shifts s on s.id = a.shift_id
      join public.positions p on p.id = s.position_id
      where a.volunteer_user_id = auth.uid()
        and a.status in ('pending', 'validated')
        and p.event_id = p_event_id
        and s.position_id = p_position_id
      limit 1
    ),
    false
  );
$$;

-- Renvoie TRUE si auth.uid() est post_lead actif sur (event, position).
create or replace function public.is_post_lead_of(
  p_event_id uuid,
  p_position_id uuid
) returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and event_id = p_event_id
      and role = 'post_lead'
      and is_active = true
      and position_id = p_position_id
  );
$$;

-- Renvoie TRUE si auth.uid() est post_lead actif et target_user_id est dans
-- son équipe (via memberships.position_id OU via assignments→shifts.position_id).
create or replace function public.is_target_in_my_post_lead_team(
  p_target_user_id uuid
) returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  with my_post_leads as (
    select event_id, position_id
    from public.memberships
    where user_id = auth.uid()
      and role = 'post_lead'
      and is_active = true
      and position_id is not null
  )
  select coalesce(
    (
      select true
      from public.memberships m_target
      join my_post_leads mpl on mpl.event_id = m_target.event_id
                             and mpl.position_id = m_target.position_id
      where m_target.user_id = p_target_user_id
        and m_target.role = 'volunteer'
      limit 1
    ),
    (
      select true
      from public.assignments a
      join public.shifts s on s.id = a.shift_id
      join my_post_leads mpl on mpl.position_id = s.position_id
      where a.volunteer_user_id = p_target_user_id
        and a.status in ('pending', 'validated')
      limit 1
    ),
    false
  );
$$;

revoke all on function public.is_volunteer_in_team(uuid, uuid) from public;
revoke all on function public.is_post_lead_of(uuid, uuid) from public;
revoke all on function public.is_target_in_my_post_lead_team(uuid) from public;
grant execute on function public.is_volunteer_in_team(uuid, uuid) to authenticated;
grant execute on function public.is_post_lead_of(uuid, uuid) to authenticated;
grant execute on function public.is_target_in_my_post_lead_team(uuid) to authenticated;

-- ─── 3. Recréer policies non-récursives via les helpers ───────────

-- volunteer voit la membership post_lead de son équipe (Bug #7-bis).
-- Pas de récursion : on lit memberships où role='post_lead' avec
-- une condition sur is_volunteer_in_team(event_id, position_id) qui
-- est SECURITY DEFINER (pas de RLS interne).
create policy memberships_select_my_team_lead on public.memberships
  for select using (
    role = 'post_lead'
    and is_active = true
    and position_id is not null
    and public.is_volunteer_in_team(event_id, position_id)
  );

comment on policy memberships_select_my_team_lead on public.memberships is
  'Bug #18 fix : volunteer voit la membership post_lead de son equipe via fonction security definer (pas de recursion RLS).';

-- volunteer_profiles : volunteer voit le profile de son post_lead.
create policy vp_select_my_team_lead on public.volunteer_profiles
  for select using (
    -- target = post_lead actif d'une equipe ou je suis volunteer
    exists (
      select 1
      from public.memberships m_lead
      where m_lead.user_id = volunteer_profiles.user_id
        and m_lead.role = 'post_lead'
        and m_lead.is_active = true
        and m_lead.position_id is not null
        and public.is_volunteer_in_team(m_lead.event_id, m_lead.position_id)
    )
  );

comment on policy vp_select_my_team_lead on public.volunteer_profiles is
  'Bug #7-bis : volunteer voit le profile de son post_lead.';

-- volunteer_profiles : post_lead voit les profiles de ses volunteers.
create policy vp_select_post_lead_team on public.volunteer_profiles
  for select using (
    public.is_target_in_my_post_lead_team(volunteer_profiles.user_id)
  );

comment on policy vp_select_post_lead_team on public.volunteer_profiles is
  'Bug #13-bis : post_lead voit les profiles de ses volunteers (via memberships ou assignments) — fonction security definer.';
