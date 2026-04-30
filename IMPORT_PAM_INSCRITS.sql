-- ====================================================================
-- ELARGIT D'ABORD LE CHECK CONSTRAINT (sinon source='pam_import_2026' rejeté)
-- ====================================================================
alter table public.volunteer_applications
  drop constraint if exists volunteer_applications_source_check;

alter table public.volunteer_applications
  add constraint volunteer_applications_source_check
  check (source in (
    'public_form',
    'admin_manual',
    'qr_referral',
    'pam_import_2026',
    'csv_import'
  ));

-- ====================================================================
-- IMPORT 51 INSCRITS RÉELS PAM (RDL 2026)
-- Source : Formulaire de candidature RDL (réponses).pdf — 23 mars 2026
-- À coller dans Supabase Studio SQL Editor (idempotent : on conflict do nothing)
-- ====================================================================

-- 1. Récupérer l'event_id RDL 2026
do $$
declare
  v_event_id uuid;
begin
  select id into v_event_id from public.events 
  where slug = 'rdl-2026' limit 1;
  
  if v_event_id is null then
    raise exception 'Event rdl-2026 introuvable';
  end if;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'pameach@gmail.com', 'Pamela Giordanengo', 'Pamela', 'Giordanengo', '1982-05-08'::date, false,
    '0603546756', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 's.ancarani@hotmail.fr', 'Stéphanie Taramino', 'Stéphanie', 'Taramino', '1972-03-18'::date, false,
    '0675997092', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'luccaetlilou@gmail.com', 'Laetitia', 'Laetitia', '', '1979-08-31'::date, false,
    '0647947731', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'douradolana1@gmail.com', 'Lana Dourado', 'Lana', 'Dourado', '2007-02-16'::date, false,
    '0643701007', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'eli.fiona@gmail.com', 'Fiona Eli', 'Fiona', 'Eli', '1982-10-22'::date, false,
    '0609392264', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'ameliepaillette06@gmail.com', 'Amélie Paillette', 'Amélie', 'Paillette', '1984-01-22'::date, false,
    '0680961953', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'tessadly@live.fr', 'Tess Sellouma', 'Tess', 'Sellouma', '1980-01-14'::date, false,
    '0625325705', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'jessiebercher@gmail.com', 'Jessie Bercher', 'Jessie', 'Bercher', '1996-07-29'::date, false,
    '0610505848', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'menbatimefi06@gmail.com', 'Lionel Grasso', 'Lionel', 'Grasso', '1974-05-22'::date, false,
    '0635252582', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'davsilva83310@gmail.com', 'David Silva', 'David', 'Silva', '1981-09-21'::date, false,
    '0658634694', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'deschamps.alexandrine@gmail.com', 'Alexandrine Deschamps', 'Alexandrine', 'Deschamps', '1993-09-20'::date, false,
    '0783023286', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'diopy679@gmail.com', 'Diopy', 'Diopy', '', '1983-11-15'::date, false,
    '0754291258', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'flore22ange@gmail.com', 'Flore Ange', 'Flore', 'Ange', '1977-04-22'::date, false,
    '0660645813', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'windalmahaut@gmail.com', 'Mahaut Windal', 'Mahaut', 'Windal', '1989-05-29'::date, false,
    '0616657570', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'dorothyperrier@gmail.com', 'Dorothy Perrier', 'Dorothy', 'Perrier', '1978-04-28'::date, false,
    '0758747845', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'marine.gillosi@gmail.com', 'Marine Gillosi', 'Marine', 'Gillosi', '1992-01-05'::date, false,
    '0627301174', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'arnaud.loiret06@gmail.com', 'Arnaud Loiret', 'Arnaud', 'Loiret', '1995-01-24'::date, false,
    '0648127469', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'willychataigner@gmail.com', 'Willy Chataigner', 'Willy', 'Chataigner', '1975-03-01'::date, false,
    '0638970433', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'fieschi.fred@free.fr', 'Fred Fieschi', 'Fred', 'Fieschi', '1972-12-06'::date, false,
    '0615775126', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'noa.levasseur08@gmail.com', 'Noa Levasseur', 'Noa', 'Levasseur', '2008-10-20'::date, true,
    '0777797863', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'aweedo@hotmail.fr', 'Aweedo', 'Aweedo', '', '1977-12-27'::date, false,
    '0662330731', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'xchamina@gmail.com', 'Chamina X', 'Chamina', 'X', '1980-08-13'::date, false,
    '0662330731', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'valoufil@gmail.com', 'Valérie Filou', 'Valérie', 'Filou', '1972-04-30'::date, false,
    '0613542406', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'm.lahoundere@gmail.com', 'M', 'M', '', '1971-07-21'::date, false,
    '0612575021', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'harminidory@gmail.com', 'Harminidory', 'Harminidory', '', '1988-11-24'::date, false,
    '0668682910', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, '13bosquet@gmail.com', '13bosquet', '13bosquet', '', '1986-05-21'::date, false,
    '0668682910', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'marjorieyon83@gmail.com', 'Marjorieyon83', 'Marjorieyon83', '', '1975-07-28'::date, false,
    '0603836094', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'matt.berthod@gmail.com', 'Matt', 'Matt', '', '1977-12-17'::date, false,
    '0674292006', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'domitille.martinet@gmail.com', 'Domitille', 'Domitille', '', '1981-03-29'::date, false,
    '0672996229', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'elisemalfoy@gmail.com', 'Elisemalfoy', 'Elisemalfoy', '', '1997-03-19'::date, false,
    '0667449788', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'camille.jar06@gmail.com', 'Camille', 'Camille', '', '2002-06-05'::date, false,
    '0753531254', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'christellebrouant@gmail.com', 'Christellebrouant', 'Christellebrouant', '', '1973-02-03'::date, false,
    '0610139019', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'ingrid.jar03@gmail.com', 'Ingrid', 'Ingrid', '', '1992-04-03'::date, false,
    '0745998503', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'knippaurelien@gmail.com', 'Knippaurelien', 'Knippaurelien', '', '1997-04-09'::date, false,
    '0695358422', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'antoine.courtadon67@gmail.com', 'Antoine', 'Antoine', '', '1988-07-16'::date, false,
    '0645616110', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'sophie.robinet83@gmail.com', 'Sophie', 'Sophie', '', '1988-06-27'::date, false,
    '0622893167', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'laurent.brossier.83@gmail.com', 'Laurent', 'Laurent', '', '1988-05-10'::date, false,
    '0618029464', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'chionstephane1@gmail.com', 'Chionstephane1', 'Chionstephane1', '', '1988-06-20'::date, false,
    '0652918910', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'giordanengok@gmail.com', 'Giordanengok', 'Giordanengok', '', '2003-08-10'::date, false,
    '0642226310', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'stephanie.pierre1208@gmail.com', 'Stephanie', 'Stephanie', '', '1969-08-12'::date, false,
    '0625407318', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'dalmasso.elodie@gmail.com', 'Dalmasso', 'Dalmasso', '', '1991-09-24'::date, false,
    '0638772557', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'positiv.heart.force@gmail.com', 'Positiv', 'Positiv', '', '1966-01-25'::date, false,
    '0638772557', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'celzanella@gmail.com', 'Celzanella', 'Celzanella', '', '1979-04-21'::date, false,
    '0603263282', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'margot06.lanier@gmail.com', 'Margot06', 'Margot06', '', '2006-10-30'::date, false,
    '0613372084', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'claire.lavalou@gmail.com', 'Claire', 'Claire', '', '2003-11-12'::date, false,
    '0782630103', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'samantha.pacarlo@gmail.com', 'Samantha', 'Samantha', '', '1990-07-09'::date, false,
    '0641529966', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'cedric.eaubelle@gmail.com', 'Cedric', 'Cedric', '', '1977-10-05'::date, false,
    '0665081601', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'morganecalais1994@gmail.com', 'Morganecalais1994', 'Morganecalais1994', '', '1994-10-08'::date, false,
    '0658695162', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'je.calvini@gmail.com', 'Je', 'Je', '', '1989-02-16'::date, false,
    '0650509775', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'christinedupoyet@gmail.com', 'Christinedupoyet', 'Christinedupoyet', '', '1969-09-07'::date, false,
    '0611208410', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

  insert into public.volunteer_applications (
    event_id, email, full_name, first_name, last_name, birth_date, is_minor,
    phone, status, source,
    consent_pii_at, consent_charter_at, consent_anti_harass_at,
    privacy_policy_version_accepted, validated_at
  ) values (
    v_event_id, 'rogerlandi988@gmail.com', 'Rogerlandi988', 'Rogerlandi988', '', '1957-11-26'::date, false,
    '0626447622', 'validated', 'pam_import_2026',
    now(), now(), now(), '1.0.0', now()
  ) on conflict do nothing;

end $$;

-- 2. Recap
select 
  count(*) filter (where source = 'pam_import_2026') as imported_pam,
  count(*) as total_applications
from public.volunteer_applications
where event_id = (select id from public.events where slug = 'rdl-2026');
