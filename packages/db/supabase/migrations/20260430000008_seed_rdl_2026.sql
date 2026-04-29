-- ════════════════════════════════════════════════════════════════════
-- 20260430000008 — SEED RDL 2026 + ICMPACA
-- Données de seed pour démo + tests J1-J5.
-- Exécuté manuellement via : pnpm db:seed
-- ════════════════════════════════════════════════════════════════════

-- ─── Organization ICMPACA ──────────────────────────────────────────
insert into public.organizations (id, name, slug, contact_email, billing_plan, ban_required_approvals)
values (
  '11111111-1111-1111-1111-111111111111',
  'ICMPACA',
  'icmpaca',
  'contact@icmpaca.fr',
  'festival',
  3
) on conflict (slug) do nothing;

-- ─── Event RDL 2026 ────────────────────────────────────────────────
insert into public.events (
  id, organization_id, name, slug, description,
  starts_at, ends_at, location, geo_lat, geo_lng, status,
  registration_open_at, registration_close_at,
  itinerary_enabled, wellbeing_enabled, safer_alerts_enabled
)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Roots du Lac 2026',
  'rdl-2026',
  'Festival reggae au Lac de Sainte-Croix. 28-30 mai 2026.',
  '2026-05-28 17:00:00+02',
  '2026-05-30 23:59:00+02',
  'Lac de Sainte-Croix, Verdon',
  43.7611, 6.1481,
  'open',
  '2026-04-01 00:00:00+02',
  '2026-05-25 23:59:00+02',
  false,  -- pas d'itinéraire (verbatim Pam)
  true,
  true
) on conflict (organization_id, slug) do nothing;

-- ─── Event Frégus Reggae Festival (placeholder pour multi-tenant demo) ───
insert into public.events (
  id, organization_id, name, slug, description,
  starts_at, ends_at, location, status
)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Frégus Reggae Festival',
  'fregus-reggae-2026',
  'Festival reggae à Fréjus. Été 2026.',
  '2026-07-15 18:00:00+02',
  '2026-07-17 23:59:00+02',
  'Fréjus, Var',
  'draft'
) on conflict (organization_id, slug) do nothing;

-- ─── 18 Postes RDL 2026 ────────────────────────────────────────────
insert into public.positions (event_id, name, slug, description, color, icon, display_order, needs_count_default) values
('22222222-2222-2222-2222-222222222222', 'Bar', 'bar', 'Service boissons (jetons papier).', '#F59E0B', '🍺', 1, 4),
('22222222-2222-2222-2222-222222222222', 'Catering', 'catering', 'Repas bénévoles, artistes, staff.', '#10B981', '🍽️', 2, 3),
('22222222-2222-2222-2222-222222222222', 'Brigade Verte', 'brigade-verte', 'Propreté du site, tri sélectif.', '#22C55E', '♻️', 3, 4),
('22222222-2222-2222-2222-222222222222', 'Camping', 'camping', 'Accueil campeurs, contrôle bracelets.', '#84CC16', '⛺', 4, 2),
('22222222-2222-2222-2222-222222222222', 'Loges', 'loges', 'Accueil artistes, hospitality.', '#A855F7', '🎤', 5, 2),
('22222222-2222-2222-2222-222222222222', 'Scan / Bracelet', 'scan-bracelet', 'Première guérite : check-in bénévoles.', '#EF4444', '🎟️', 6, 2),
('22222222-2222-2222-2222-222222222222', 'Caisse Billetterie', 'caisse-billetterie', 'Vente sur place, retrait billets.', '#3B82F6', '💳', 7, 2),
('22222222-2222-2222-2222-222222222222', 'Caisse Jetons', 'caisse-jetons', 'Vente jetons boisson papier.', '#FACC15', '🪙', 8, 3),
('22222222-2222-2222-2222-222222222222', 'Backline', 'backline', 'Logistique technique scène.', '#1E293B', '🎛️', 9, 2),
('22222222-2222-2222-2222-222222222222', 'Parking', 'parking', 'Gestion parkings, fluidité circulation.', '#64748B', '🚗', 10, 3),
('22222222-2222-2222-2222-222222222222', 'Run / Runners', 'run', 'Petites courses logistiques (permis B).', '#06B6D4', '🚐', 11, 2),
('22222222-2222-2222-2222-222222222222', 'Signalétique', 'signaletique', 'Pose et dépose panneaux.', '#0EA5E9', '🪧', 12, 2),
('22222222-2222-2222-2222-222222222222', 'Ateliers / Animations', 'ateliers-animations', 'Animation famille, kids corner.', '#EC4899', '🎨', 13, 3),
('22222222-2222-2222-2222-222222222222', 'Merch', 'merch', 'Vente merchandising festival.', '#F97316', '👕', 14, 2),
('22222222-2222-2222-2222-222222222222', 'Jeudi Montage', 'jeudi-montage', 'Montage J-1 : structures, scènes, stands.', '#78716C', '🔧', 15, 19),
('22222222-2222-2222-2222-222222222222', 'Vendredi Montage / Démontage', 'vendredi-montage-demontage', 'Renforts montage + démontage.', '#92400E', '🛠️', 16, 8),
('22222222-2222-2222-2222-222222222222', 'Point Info', 'point-info', 'Accueil public, infos pratiques.', '#6366F1', 'ℹ️', 17, 2),
('22222222-2222-2222-2222-222222222222', 'Équipe Jérémy Besset', 'jeremy-besset-equipe', 'Équipe artiste dédiée.', '#7C3AED', '🎼', 18, 2)
on conflict (event_id, slug) do nothing;

-- ─── Quelques shifts seed (à enrichir J3) ──────────────────────────
-- Bar — Vendredi 29 mai soir
insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 18:00:00+02', '2026-05-29 22:00:00+02', 4, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'bar';

insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 22:00:00+02', '2026-05-30 02:00:00+02', 4, false
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'bar';

-- Catering — Vendredi midi/soir
insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 11:00:00+02', '2026-05-29 14:00:00+02', 3, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'catering';

insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-29 17:00:00+02', '2026-05-29 21:00:00+02', 3, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'catering';

-- Jeudi montage : 19 bénévoles toute la journée
insert into public.shifts (position_id, starts_at, ends_at, needs_count, meal_included)
select id, '2026-05-28 09:00:00+02', '2026-05-28 18:00:00+02', 19, true
from public.positions
where event_id = '22222222-2222-2222-2222-222222222222' and slug = 'jeudi-montage';

-- Audit log seed
select public.log_audit('seed.applied', '22222222-2222-2222-2222-222222222222',
  '{"name": "20260430000008_seed_rdl_2026", "applied_at": "2026-04-30T00:00:00Z"}'::jsonb);
