-- ════════════════════════════════════════════════════════════════════
-- 20260430000010 — RPC submit_volunteer_application (SECURITY DEFINER)
-- Contourne la limitation RLS qui empêche un INSERT+SELECT immédiat
-- en mode anon. Validations métier en SQL (event open + fenêtre).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.submit_volunteer_application(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_event_id uuid := (payload->>'event_id')::uuid;
  v_email citext := (payload->>'email')::citext;
  v_event events%ROWTYPE;
  v_app_id uuid;
  v_pos_slugs text[];
  v_skills text[];
  v_limitations text[];
begin
  select * into v_event from events where id = v_event_id;
  if v_event is null then raise exception 'event_not_found'; end if;
  if v_event.status <> 'open' then raise exception 'event_not_open'; end if;
  if v_event.registration_open_at is not null and v_event.registration_open_at > now() then
    raise exception 'registration_not_yet_open';
  end if;
  if v_event.registration_close_at is not null and v_event.registration_close_at < now() then
    raise exception 'registration_closed';
  end if;

  v_pos_slugs := coalesce(array(select jsonb_array_elements_text(coalesce(payload->'preferred_position_slugs','[]'::jsonb))), '{}');
  v_skills := coalesce(array(select jsonb_array_elements_text(coalesce(payload->'skills','[]'::jsonb))), '{}');
  v_limitations := coalesce(array(select jsonb_array_elements_text(coalesce(payload->'limitations','[]'::jsonb))), '{}');

  insert into volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    gender, phone, address_street, address_city, address_zip, address_country,
    profession, arrival_at, departure_at, size, diet_notes, has_vehicle, driving_license,
    preferred_position_slugs, skills, limitations, bio, is_returning, parental_auth_url,
    consent_pii_at, consent_charter_at, consent_anti_harass_at, consent_image_at,
    privacy_policy_version_accepted, source, ip_address, user_agent
  ) values (
    v_event_id, v_email,
    payload->>'full_name', payload->>'first_name', payload->>'last_name',
    nullif(payload->>'birth_date','')::date,
    coalesce((payload->>'is_minor')::boolean, false),
    nullif(payload->>'gender',''),
    payload->>'phone',
    payload->>'address_street', payload->>'address_city', payload->>'address_zip',
    coalesce(payload->>'address_country','FR'),
    payload->>'profession',
    nullif(payload->>'arrival_at','')::timestamptz,
    nullif(payload->>'departure_at','')::timestamptz,
    nullif(payload->>'size',''),
    payload->>'diet_notes',
    coalesce((payload->>'has_vehicle')::boolean, false),
    coalesce((payload->>'driving_license')::boolean, false),
    v_pos_slugs, v_skills, v_limitations,
    payload->>'bio',
    coalesce((payload->>'is_returning')::boolean, false),
    payload->>'parental_auth_url',
    case when (payload->>'consent_pii')::boolean then now() else null end,
    case when (payload->>'consent_charter')::boolean then now() else null end,
    case when (payload->>'consent_anti_harassment')::boolean then now() else null end,
    case when (payload->>'consent_image')::boolean then now() else null end,
    coalesce(payload->>'privacy_policy_version', '1.0.0'),
    'public_form',
    nullif(payload->>'ip_address','')::inet,
    payload->>'user_agent'
  ) returning id into v_app_id;
  
  insert into audit_log (event_id, action, payload)
  values (v_event_id, 'application.submitted', jsonb_build_object('application_id', v_app_id, 'email', v_email));
  
  return v_app_id;
end;
$$;

grant execute on function public.submit_volunteer_application(jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
