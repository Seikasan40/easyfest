-- ════════════════════════════════════════════════════════════════════
-- 20260503000001 — RLS : memberships_insert_self_volunteer
-- Defense-in-depth pour le flow onboardCurrentUser.
--
-- Contexte : la policy `memberships_insert_lead` (cf. 20260430000007)
-- réserve les inserts sur `memberships` aux volunteer_lead+. Cela bloque
-- l'auto-onboarding d'un bénévole post magic-link : `onboardCurrentUser`
-- (côté serveur) doit pouvoir créer la membership volunteer correspondant
-- à une volunteer_application déjà `validated`.
--
-- Le fix principal passe par le service-role client dans onboard.ts. Ici on
-- ajoute en defense-in-depth une policy RLS qui permet à un user
-- authentifié de s'auto-créer SA membership volunteer pour un event où il
-- a une volunteer_application `validated`. La vérification est encapsulée
-- dans une fonction security-definer pour éviter toute récursion RLS sur
-- volunteer_applications et l'accès direct à auth.users.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.user_has_validated_application(
  p_event_id uuid,
  p_user_id  uuid
)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public, auth
as $$
  select exists (
    select 1
    from public.volunteer_applications va
    join auth.users au on lower(au.email) = lower(va.email)
    where va.event_id = p_event_id
      and va.status = 'validated'
      and au.id = p_user_id
  );
$$;

comment on function public.user_has_validated_application(uuid, uuid) is
  'Renvoie true si le user p_user_id a une volunteer_application validated pour p_event_id (match par email, case-insensitive). Security-definer pour la policy memberships_insert_self_volunteer.';

grant execute on function public.user_has_validated_application(uuid, uuid) to authenticated;

create policy "memberships_insert_self_volunteer" on public.memberships
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'volunteer'
    and is_active = true
    and public.user_has_validated_application(event_id, auth.uid())
  );

comment on policy "memberships_insert_self_volunteer" on public.memberships is
  'Autorise un user à s''auto-créer SA membership volunteer pour un event où il a une volunteer_application validated. Coexiste avec memberships_insert_lead (volunteer_lead+ peut tout insérer).';
