-- Ajoute les champs manquants pour parité avec Google Form Pam (RDL 2026)
alter table public.volunteer_applications
  add column if not exists available_setup    boolean default false,
  add column if not exists available_teardown boolean default false,
  add column if not exists diet_type          text check (diet_type in ('none','vegetarian','vegan','gluten_free','no_pork','other') or diet_type is null),
  add column if not exists carpool            text check (carpool in ('none','offering','seeking') or carpool is null) default 'none';

comment on column public.volunteer_applications.available_setup is 'Dispo pour le montage (J-2 / J-1)';
comment on column public.volunteer_applications.available_teardown is 'Dispo pour le démontage (J+1)';
comment on column public.volunteer_applications.diet_type is 'Régime alimentaire structuré (en plus de diet_notes libre)';
comment on column public.volunteer_applications.carpool is 'Préférence covoiturage';

alter table public.volunteer_profiles
  add column if not exists available_setup    boolean default false,
  add column if not exists available_teardown boolean default false,
  add column if not exists diet_type          text,
  add column if not exists carpool            text default 'none';

-- Mise à jour du RPC submit_volunteer_application pour accepter les nouveaux champs
create or replace function public.submit_volunteer_application(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_id uuid;
  v_pos_slugs text[];
  v_skills text[];
  v_limitations text[];
begin
  v_pos_slugs := coalesce(array(select jsonb_array_elements_text(coalesce(payload->'preferred_position_slugs','[]'::jsonb))), '{}');
  v_skills := coalesce(array(select jsonb_array_elements_text(coalesce(payload->'skills','[]'::jsonb))), '{}');
  v_limitations := coalesce(array(select jsonb_array_elements_text(coalesce(payload->'limitations','[]'::jsonb))), '{}');

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    gender, phone, profession, arrival_at, departure_at, size, diet_notes,
    has_vehicle, driving_license,
    available_setup, available_teardown, diet_type, carpool,
    preferred_position_slugs, skills, limitations, bio, is_returning, parental_auth_url,
    consent_pii_at, consent_charter_at, consent_anti_harass_at, consent_image_at,
    privacy_policy_version_accepted, source, turnstile_token, ip_address, user_agent
  ) values (
    (payload->>'event_id')::uuid,
    payload->>'email',
    payload->>'full_name',
    payload->>'first_name',
    payload->>'last_name',
    nullif(payload->>'birth_date','')::date,
    coalesce((payload->>'is_minor')::boolean, false),
    nullif(payload->>'gender',''),
    payload->>'phone',
    nullif(payload->>'profession',''),
    nullif(payload->>'arrival_at','')::timestamptz,
    nullif(payload->>'departure_at','')::timestamptz,
    nullif(payload->>'size',''),
    nullif(payload->>'diet_notes',''),
    coalesce((payload->>'has_vehicle')::boolean, false),
    coalesce((payload->>'driving_license')::boolean, false),
    coalesce((payload->>'available_setup')::boolean, false),
    coalesce((payload->>'available_teardown')::boolean, false),
    nullif(payload->>'diet_type',''),
    coalesce(payload->>'carpool', 'none'),
    v_pos_slugs,
    v_skills,
    v_limitations,
    nullif(payload->>'bio',''),
    coalesce((payload->>'is_returning')::boolean, false),
    nullif(payload->>'parental_auth_url',''),
    nullif(payload->>'consent_pii_at','')::timestamptz,
    nullif(payload->>'consent_charter_at','')::timestamptz,
    nullif(payload->>'consent_anti_harass_at','')::timestamptz,
    nullif(payload->>'consent_image_at','')::timestamptz,
    coalesce(payload->>'privacy_policy_version_accepted','1.0.0'),
    coalesce(payload->>'source','public_form'),
    nullif(payload->>'turnstile_token',''),
    nullif(payload->>'ip_address','')::inet,
    nullif(payload->>'user_agent','')
  ) returning id into v_app_id;

  return v_app_id;
end;
$$;

grant execute on function public.submit_volunteer_application(jsonb) to anon, authenticated;
