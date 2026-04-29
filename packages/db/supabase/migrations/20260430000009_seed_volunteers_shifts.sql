-- ════════════════════════════════════════════════════════════════════
-- 20260430000009 — SEED ENRICHI : 30 bénévoles fictifs + 80 shifts
-- À exécuter APRÈS 20260430000008_seed_rdl_2026.sql
-- ════════════════════════════════════════════════════════════════════

-- Note : auth.users ne se crée pas via SQL standard (Supabase Auth gère).
-- On insère directement dans volunteer_profiles avec des UUID stables pour
-- pouvoir reconstituer les liens. Ces profils seront branchés à de vrais users
-- via le script seed-users.ts (Edge invokable / admin script).

do $$
declare
  rdl_id uuid := '22222222-2222-2222-2222-222222222222';
  pos_bar_id uuid;
  pos_catering_id uuid;
  pos_brigade_id uuid;
  pos_loges_id uuid;
  pos_scan_id uuid;
  pos_caisse_billet_id uuid;
  pos_caisse_jetons_id uuid;
  pos_camping_id uuid;
  pos_parking_id uuid;
  pos_montage_id uuid;
  pos_demontage_id uuid;
  pos_atelier_id uuid;
  pos_run_id uuid;
  pos_signa_id uuid;
  pos_merch_id uuid;
  pos_backline_id uuid;
  pos_pointinfo_id uuid;
  pos_jeremy_id uuid;
begin
  select id into pos_bar_id from positions where event_id = rdl_id and slug = 'bar';
  select id into pos_catering_id from positions where event_id = rdl_id and slug = 'catering';
  select id into pos_brigade_id from positions where event_id = rdl_id and slug = 'brigade-verte';
  select id into pos_loges_id from positions where event_id = rdl_id and slug = 'loges';
  select id into pos_scan_id from positions where event_id = rdl_id and slug = 'scan-bracelet';
  select id into pos_caisse_billet_id from positions where event_id = rdl_id and slug = 'caisse-billetterie';
  select id into pos_caisse_jetons_id from positions where event_id = rdl_id and slug = 'caisse-jetons';
  select id into pos_camping_id from positions where event_id = rdl_id and slug = 'camping';
  select id into pos_parking_id from positions where event_id = rdl_id and slug = 'parking';
  select id into pos_montage_id from positions where event_id = rdl_id and slug = 'jeudi-montage';
  select id into pos_demontage_id from positions where event_id = rdl_id and slug = 'vendredi-montage-demontage';
  select id into pos_atelier_id from positions where event_id = rdl_id and slug = 'ateliers-animations';
  select id into pos_run_id from positions where event_id = rdl_id and slug = 'run';
  select id into pos_signa_id from positions where event_id = rdl_id and slug = 'signaletique';
  select id into pos_merch_id from positions where event_id = rdl_id and slug = 'merch';
  select id into pos_backline_id from positions where event_id = rdl_id and slug = 'backline';
  select id into pos_pointinfo_id from positions where event_id = rdl_id and slug = 'point-info';
  select id into pos_jeremy_id from positions where event_id = rdl_id and slug = 'jeremy-besset-equipe';

  -- ─── SHIFTS ENRICHIS (80 shifts répartis sur 18 postes × 3 jours) ───
  -- Bar : vendredi 18h-22h, vendredi 22h-2h, samedi 14h-18h, samedi 18h-22h, samedi 22h-2h, dimanche 12h-18h, dimanche 18h-22h
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_bar_id, '2026-05-29 18:00+02', '2026-05-29 22:00+02', 4, true),
    (pos_bar_id, '2026-05-29 22:00+02', '2026-05-30 02:00+02', 4, false),
    (pos_bar_id, '2026-05-30 14:00+02', '2026-05-30 18:00+02', 4, true),
    (pos_bar_id, '2026-05-30 18:00+02', '2026-05-30 22:00+02', 4, true),
    (pos_bar_id, '2026-05-30 22:00+02', '2026-05-31 02:00+02', 4, false),
    (pos_bar_id, '2026-05-31 12:00+02', '2026-05-31 18:00+02', 3, true),
    (pos_bar_id, '2026-05-31 18:00+02', '2026-05-31 22:00+02', 3, true)
  on conflict do nothing;

  -- Catering : tous les jours midi+soir
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_catering_id, '2026-05-28 11:00+02', '2026-05-28 14:00+02', 3, true),
    (pos_catering_id, '2026-05-28 17:00+02', '2026-05-28 21:00+02', 3, true),
    (pos_catering_id, '2026-05-29 11:00+02', '2026-05-29 14:00+02', 3, true),
    (pos_catering_id, '2026-05-29 17:00+02', '2026-05-29 21:00+02', 3, true),
    (pos_catering_id, '2026-05-30 11:00+02', '2026-05-30 14:00+02', 3, true),
    (pos_catering_id, '2026-05-30 17:00+02', '2026-05-30 21:00+02', 3, true),
    (pos_catering_id, '2026-05-31 11:00+02', '2026-05-31 14:00+02', 3, true)
  on conflict do nothing;

  -- Brigade Verte : 4 créneaux de propreté par jour
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_brigade_id, '2026-05-29 08:00+02', '2026-05-29 12:00+02', 4, true),
    (pos_brigade_id, '2026-05-29 14:00+02', '2026-05-29 18:00+02', 4, true),
    (pos_brigade_id, '2026-05-30 08:00+02', '2026-05-30 12:00+02', 4, true),
    (pos_brigade_id, '2026-05-30 14:00+02', '2026-05-30 18:00+02', 4, true),
    (pos_brigade_id, '2026-05-31 08:00+02', '2026-05-31 12:00+02', 4, true),
    (pos_brigade_id, '2026-05-31 14:00+02', '2026-05-31 18:00+02', 4, true)
  on conflict do nothing;

  -- Scan/Bracelet : présent dès 17h chaque soir d'accueil
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_scan_id, '2026-05-29 17:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_scan_id, '2026-05-30 14:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_scan_id, '2026-05-31 12:00+02', '2026-05-31 21:00+02', 2, true)
  on conflict do nothing;

  -- Caisse Billetterie + Jetons : créneaux d'ouverture
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_caisse_billet_id, '2026-05-29 17:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_caisse_billet_id, '2026-05-30 14:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_caisse_billet_id, '2026-05-31 12:00+02', '2026-05-31 21:00+02', 2, true),
    (pos_caisse_jetons_id, '2026-05-29 18:00+02', '2026-05-29 23:00+02', 3, true),
    (pos_caisse_jetons_id, '2026-05-29 23:00+02', '2026-05-30 02:00+02', 3, false),
    (pos_caisse_jetons_id, '2026-05-30 14:00+02', '2026-05-30 23:00+02', 3, true),
    (pos_caisse_jetons_id, '2026-05-30 23:00+02', '2026-05-31 02:00+02', 3, false)
  on conflict do nothing;

  -- Loges : artistes
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_loges_id, '2026-05-29 16:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_loges_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_loges_id, '2026-05-31 12:00+02', '2026-05-31 20:00+02', 2, true)
  on conflict do nothing;

  -- Camping : 24/7 via créneaux de 8h
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_camping_id, '2026-05-29 14:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_camping_id, '2026-05-29 22:00+02', '2026-05-30 06:00+02', 2, false),
    (pos_camping_id, '2026-05-30 06:00+02', '2026-05-30 14:00+02', 2, true),
    (pos_camping_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_camping_id, '2026-05-30 22:00+02', '2026-05-31 06:00+02', 2, false),
    (pos_camping_id, '2026-05-31 06:00+02', '2026-05-31 14:00+02', 2, true)
  on conflict do nothing;

  -- Parking : aux pics d'arrivée et départ
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_parking_id, '2026-05-29 16:00+02', '2026-05-29 22:00+02', 3, true),
    (pos_parking_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 3, true),
    (pos_parking_id, '2026-05-31 11:00+02', '2026-05-31 14:00+02', 2, true),
    (pos_parking_id, '2026-05-31 21:00+02', '2026-06-01 01:00+02', 3, false)
  on conflict do nothing;

  -- Jeudi Montage (J-1) : 19 bénévoles
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_montage_id, '2026-05-28 09:00+02', '2026-05-28 18:00+02', 19, true)
  on conflict do nothing;

  -- Vendredi Montage / Démontage
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_demontage_id, '2026-05-29 09:00+02', '2026-05-29 14:00+02', 8, true),
    (pos_demontage_id, '2026-06-01 08:00+02', '2026-06-01 18:00+02', 12, true)
  on conflict do nothing;

  -- Ateliers / Animations : samedi+dimanche après-midi
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_atelier_id, '2026-05-30 14:00+02', '2026-05-30 19:00+02', 3, true),
    (pos_atelier_id, '2026-05-31 14:00+02', '2026-05-31 19:00+02', 3, true)
  on conflict do nothing;

  -- Runners
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_run_id, '2026-05-29 14:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_run_id, '2026-05-30 12:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_run_id, '2026-05-31 12:00+02', '2026-05-31 20:00+02', 2, true)
  on conflict do nothing;

  -- Signalétique : pose mercredi+jeudi, dépose dimanche soir
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_signa_id, '2026-05-27 14:00+02', '2026-05-27 18:00+02', 2, false),
    (pos_signa_id, '2026-05-28 09:00+02', '2026-05-28 14:00+02', 2, true),
    (pos_signa_id, '2026-05-31 22:00+02', '2026-06-01 01:00+02', 2, false)
  on conflict do nothing;

  -- Merch : pendant les concerts
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_merch_id, '2026-05-29 18:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_merch_id, '2026-05-30 16:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_merch_id, '2026-05-31 14:00+02', '2026-05-31 21:00+02', 2, true)
  on conflict do nothing;

  -- Backline : à la transition entre groupes
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_backline_id, '2026-05-29 18:00+02', '2026-05-29 23:00+02', 2, true),
    (pos_backline_id, '2026-05-30 16:00+02', '2026-05-30 23:00+02', 2, true),
    (pos_backline_id, '2026-05-31 14:00+02', '2026-05-31 21:00+02', 2, true)
  on conflict do nothing;

  -- Point Info : tous les jours
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_pointinfo_id, '2026-05-29 17:00+02', '2026-05-29 22:00+02', 2, true),
    (pos_pointinfo_id, '2026-05-30 14:00+02', '2026-05-30 22:00+02', 2, true),
    (pos_pointinfo_id, '2026-05-31 12:00+02', '2026-05-31 20:00+02', 2, true)
  on conflict do nothing;

  -- Jérémy Besset (artiste dédié)
  insert into shifts (position_id, starts_at, ends_at, needs_count, meal_included) values
    (pos_jeremy_id, '2026-05-30 16:00+02', '2026-05-30 23:00+02', 2, true)
  on conflict do nothing;

end$$;

-- ─── 30 candidatures fictives (sans compte auth — pour démo back-office) ───
insert into volunteer_applications (
  event_id, email, full_name, first_name, last_name, birth_date, is_minor,
  phone, profession, size, arrival_at, departure_at,
  preferred_position_slugs, skills, limitations, bio, is_returning,
  consent_pii_at, consent_charter_at, consent_anti_harass_at,
  status, source
) values
('22222222-2222-2222-2222-222222222222', 'pam.morin@example.com', 'Pam Morin', 'Pam', 'Morin', '1985-03-12', false, '+33611111111', 'Régisseuse', 'M', '2026-05-28 09:00+02', '2026-06-01 18:00+02', array['scan-bracelet','caisse-billetterie','point-info'], array['communication','experience_festival'], array[]::text[], 'Régisseuse RDL depuis 5 éditions.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'mahaut@example.com', 'Mahaut Lefèvre', 'Mahaut', 'Lefèvre', '1990-07-22', false, '+33622222222', 'Barmaid', 'S', '2026-05-29 16:00+02', '2026-05-31 23:00+02', array['bar','caisse-jetons'], array['service','communication'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'dorothee@example.com', 'Dorothée Carlo', 'Dorothée', 'Carlo', '1992-01-05', false, '+33633333333', 'Responsable bénévoles', 'M', '2026-05-28 09:00+02', '2026-06-01 18:00+02', array['scan-bracelet','point-info','signaletique'], array['communication','experience_festival'], array[]::text[], 'Co-organisatrice ICMPACA.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'stephane@example.com', 'Stéphane Taramino', 'Stéphane', 'Taramino', '1978-09-14', false, '+33644444444', 'Cuisinier', 'L', '2026-05-28 08:00+02', '2026-06-01 12:00+02', array['catering'], array['cuisine','manutention_lourde'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'antoine@example.com', 'Antoine Loiret', 'Antoine', 'Loiret', '1995-04-18', false, '+33655555555', 'Étudiant', 'M', '2026-05-29 09:00+02', '2026-06-01 12:00+02', array['brigade-verte','run'], array['permis_b','manutention_lourde'], array[]::text[], null, false, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'florence@example.com', 'Florence Aubin', 'Florence', 'Aubin', '1988-11-30', false, '+33666666666', 'Infirmière', 'M', '2026-05-29 10:00+02', '2026-06-01 12:00+02', array['point-info','catering','ateliers-animations'], array['secourisme','communication'], array[]::text[], 'Premiers secours à dispo si besoin.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'aurelien@example.com', 'Aurélien Bouchet', 'Aurélien', 'Bouchet', '1991-02-08', false, '+33677777777', 'Régisseur son', 'L', '2026-05-28 09:00+02', '2026-06-01 18:00+02', array['backline','jeremy-besset-equipe'], array['regie_son','manutention_lourde'], array[]::text[], 'Régisseur son depuis 8 ans.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'fred@example.com', 'Fred Marchand', 'Fred', 'Marchand', '1980-06-25', false, '+33688888888', 'Charpentier', 'XL', '2026-05-27 09:00+02', '2026-06-01 18:00+02', array['jeudi-montage','vendredi-montage-demontage'], array['manutention_lourde','permis_b'], array[]::text[], 'Connait le montage du chapiteau.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'willy@example.com', 'Willy Roche', 'Willy', 'Roche', '1983-12-03', false, '+33699999999', 'Chauffeur', 'L', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['parking','run'], array['permis_b'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'sandy@example.com', 'Sandy Berger', 'Sandy', 'Berger', '1993-08-19', false, '+33611002233', 'Animatrice', 'S', '2026-05-30 12:00+02', '2026-05-31 22:00+02', array['ateliers-animations'], array['communication'], array[]::text[], 'Mediator·ice safer space.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'gael@example.com', 'Gael Martin', 'Gael', 'Martin', '1986-05-11', false, '+33611223344', 'Médiateur', 'M', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['point-info','signaletique'], array['communication','anglais'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'romane@example.com', 'Romane Dupont', 'Romane', 'Dupont', '1996-03-27', false, '+33611334455', 'Étudiante', 'S', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['caisse-jetons','merch'], array['service'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'lucas@example.com', 'Lucas Petit', 'Lucas', 'Petit', '1999-11-14', false, '+33611445566', 'Étudiant', 'L', '2026-05-29 18:00+02', '2026-06-01 12:00+02', array['bar','catering'], array['service'], array[]::text[], 'Première fois en festival.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'emma@example.com', 'Emma Garcia', 'Emma', 'Garcia', '2009-07-09', true, '+33611556677', 'Lycéenne', 'XS', '2026-05-30 14:00+02', '2026-05-31 22:00+02', array['ateliers-animations','merch'], array[]::text[], array[]::text[], 'Mineure (16 ans), autorisation parentale envoyée.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'thomas@example.com', 'Thomas Léger', 'Thomas', 'Léger', '1994-09-21', false, '+33611667788', 'Développeur', 'L', '2026-05-29 18:00+02', '2026-06-01 12:00+02', array['signaletique','run'], array['anglais','manutention_lourde'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'manon@example.com', 'Manon Delcourt', 'Manon', 'Delcourt', '1997-04-12', false, '+33611778899', 'Graphiste', 'M', '2026-05-30 14:00+02', '2026-06-01 12:00+02', array['point-info','merch','signaletique'], array['communication'], array[]::text[], null, false, now(), now(), now(), 'pre_selected', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'kevin@example.com', 'Kevin Roux', 'Kevin', 'Roux', '1989-10-05', false, '+33611889900', 'Maçon', 'XL', '2026-05-27 14:00+02', '2026-06-01 18:00+02', array['jeudi-montage','vendredi-montage-demontage','signaletique'], array['manutention_lourde','permis_b'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'julie@example.com', 'Julie Moreau', 'Julie', 'Moreau', '1992-06-30', false, '+33611990011', 'Pâtissière', 'S', '2026-05-29 09:00+02', '2026-05-31 22:00+02', array['catering'], array['cuisine'], array[]::text[], 'Régime végétarien.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'amelie@example.com', 'Amélie Vernier', 'Amélie', 'Vernier', '1990-02-17', false, '+33611001122', 'Coiffeuse', 'M', '2026-05-30 14:00+02', '2026-05-31 22:00+02', array['loges','merch'], array['service','anglais'], array[]::text[], null, false, now(), now(), now(), 'reserve', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'max@example.com', 'Maxime Berger', 'Maxime', 'Berger', '1985-08-08', false, '+33611112233', 'Photographe', 'L', '2026-05-29 18:00+02', '2026-06-01 02:00+02', array['point-info','run'], array['communication'], array['acrophobie'], 'Pas en hauteur svp.', true, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'leo@example.com', 'Léo Schmitt', 'Léo', 'Schmitt', '1998-12-12', false, '+33611223345', 'Étudiant', 'M', '2026-05-30 14:00+02', '2026-06-01 02:00+02', array['brigade-verte','catering'], array[]::text[], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'sarah@example.com', 'Sarah Aitouali', 'Sarah', 'Aitouali', '2008-03-22', true, '+33611334456', 'Lycéenne', 'XS', '2026-05-30 14:00+02', '2026-05-31 20:00+02', array['ateliers-animations'], array[]::text[], array[]::text[], 'Mineure (17 ans), autorisation parentale OK.', false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'nicolas@example.com', 'Nicolas Bertrand', 'Nicolas', 'Bertrand', '1981-05-04', false, '+33611445567', 'Mécanicien', 'XL', '2026-05-29 14:00+02', '2026-06-01 18:00+02', array['parking','run','jeudi-montage'], array['permis_b','manutention_lourde'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'clara@example.com', 'Clara Dubois', 'Clara', 'Dubois', '1995-09-28', false, '+33611556678', 'Soignante', 'M', '2026-05-29 17:00+02', '2026-06-01 12:00+02', array['point-info','catering'], array['secourisme','communication'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'paul@example.com', 'Paul Henry', 'Paul', 'Henry', '1987-01-19', false, '+33611667789', 'Sound designer', 'L', '2026-05-28 12:00+02', '2026-06-01 12:00+02', array['backline','jeremy-besset-equipe'], array['regie_son'], array[]::text[], null, true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'helene@example.com', 'Hélène Pacaud', 'Hélène', 'Pacaud', '1993-04-04', false, '+33611778890', 'Prof', 'M', '2026-05-29 17:00+02', '2026-06-01 02:00+02', array['caisse-billetterie','scan-bracelet'], array['communication','anglais'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'mathieu@example.com', 'Mathieu Lefebvre', 'Mathieu', 'Lefebvre', '1979-07-15', false, '+33611889901', 'Chauffeur', 'XL', '2026-05-29 14:00+02', '2026-06-01 12:00+02', array['parking','run'], array['permis_b'], array['dos_fragile'], 'Pas de manutention lourde svp.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'agathe@example.com', 'Agathe Bossard', 'Agathe', 'Bossard', '1996-11-23', false, '+33611990012', 'Étudiante', 'S', '2026-05-30 14:00+02', '2026-06-01 02:00+02', array['merch','ateliers-animations'], array['service'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'olivier@example.com', 'Olivier Klein', 'Olivier', 'Klein', '1984-02-10', false, '+33611001123', 'Électricien', 'L', '2026-05-27 09:00+02', '2026-06-01 18:00+02', array['jeudi-montage','signaletique','vendredi-montage-demontage'], array['manutention_lourde','permis_b'], array[]::text[], 'Habilitation électrique.', true, now(), now(), now(), 'validated', 'public_form'),

('22222222-2222-2222-2222-222222222222', 'lina@example.com', 'Lina Saadi', 'Lina', 'Saadi', '1992-05-06', false, '+33611112234', 'Communicante', 'S', '2026-05-29 17:00+02', '2026-06-01 02:00+02', array['point-info','signaletique','merch'], array['communication','anglais'], array[]::text[], null, false, now(), now(), now(), 'pending', 'public_form')
on conflict do nothing;

-- Audit log
select log_audit('seed.enriched.applied', '22222222-2222-2222-2222-222222222222',
  '{"name": "20260430000009_seed_volunteers_shifts", "applications": 30, "shifts_added": 80}'::jsonb);
