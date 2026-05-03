-- ════════════════════════════════════════════════════════════════════
-- 20260503020000 — RLS extensions team visibility
--
-- Phase 4 V4 retest 3 mai 2026 — fixes :
--   Bug #7-bis  : Lucas (volunteer Bar) ne voit pas Mahaut (post_lead Bar)
--                 sur /v/icmpaca/rdl-2026 → manque RLS pour volunteer voir son
--                 post_lead (à la fois sur memberships et volunteer_profiles).
--   Bug #13-bis : Mahaut (post_lead Bar) voit "?" au lieu des noms d'Anaïs/Sandy
--                 sur /poste/icmpaca/rdl-2026 — vp_select_post_lead_team ne
--                 matchait que via memberships.position_id, ignorait les
--                 volunteers assignés via assignments.shift_id.
--
-- Sync memberships.position_id : la RPC assign_volunteer_atomic est mise à
-- jour pour aussi UPDATE memberships.position_id quand on assigne un volunteer
-- à une position. Backfill correspondant exécuté dans la même migration pour
-- les assignments validated existantes.
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. Étendre vp_select_post_lead_team avec OR via assignments ─────
drop policy if exists vp_select_post_lead_team on public.volunteer_profiles;

create policy vp_select_post_lead_team on public.volunteer_profiles
  for select using (
    exists (
      -- Cas 1 (existant) : volunteer assigné via memberships.position_id
      select 1
      from public.memberships m_target
      join public.memberships m_actor on m_actor.event_id = m_target.event_id
      where m_target.user_id = volunteer_profiles.user_id
        and m_target.role = 'volunteer'
        and m_actor.user_id = auth.uid()
        and m_actor.role = 'post_lead'
        and m_actor.position_id is not null
        and m_actor.position_id = m_target.position_id
        and m_actor.is_active = true
    )
    or exists (
      -- Cas 2 (nouveau) : volunteer assigné via assignments.shift_id
      select 1
      from public.assignments a
      join public.shifts s on s.id = a.shift_id
      join public.memberships m_actor on m_actor.user_id = auth.uid()
      where a.volunteer_user_id = volunteer_profiles.user_id
        and a.status in ('pending', 'validated')
        and m_actor.role = 'post_lead'
        and m_actor.is_active = true
        and m_actor.event_id = (select position_id from public.shifts where id = a.shift_id) -- always false (just a no-op join validator)
        or (
          m_actor.role = 'post_lead'
          and m_actor.is_active = true
          and m_actor.position_id = s.position_id
        )
    )
  );

-- Note : la condition complexe ci-dessus a une faille typo. On la réécrit proprement.
drop policy if exists vp_select_post_lead_team on public.volunteer_profiles;

create policy vp_select_post_lead_team on public.volunteer_profiles
  for select using (
    -- Cas 1 (existant) : volunteer assigné via memberships.position_id
    exists (
      select 1
      from public.memberships m_target
      join public.memberships m_actor on m_actor.event_id = m_target.event_id
      where m_target.user_id = volunteer_profiles.user_id
        and m_target.role = 'volunteer'
        and m_actor.user_id = auth.uid()
        and m_actor.role = 'post_lead'
        and m_actor.position_id is not null
        and m_actor.position_id = m_target.position_id
        and m_actor.is_active = true
    )
    or
    -- Cas 2 (nouveau) : volunteer assigné via assignments → shifts.position_id
    exists (
      select 1
      from public.assignments a
      join public.shifts s on s.id = a.shift_id
      join public.memberships m_actor
        on m_actor.user_id = auth.uid()
       and m_actor.role = 'post_lead'
       and m_actor.is_active = true
       and m_actor.position_id = s.position_id
      where a.volunteer_user_id = volunteer_profiles.user_id
        and a.status in ('pending', 'validated')
    )
  );

comment on policy vp_select_post_lead_team on public.volunteer_profiles is
  'post_lead voit les profiles des bénévoles de son équipe — via memberships.position_id OR via assignments→shifts.position_id (Bug #13-bis fix).';

-- ─── 2. Nouvelle policy : volunteer voit son post_lead ──────────────
-- Symétrique : un volunteer peut voir le profile du post_lead qui dirige son
-- équipe (utile pour /v/.../page.tsx "MON ÉQUIPE — chef·fe d'équipe Mahaut").
create policy vp_select_my_team_lead on public.volunteer_profiles
  for select using (
    exists (
      -- Cas 1 : volunteer rattaché via memberships.position_id
      select 1
      from public.memberships m_self
      join public.memberships m_lead
        on m_lead.event_id = m_self.event_id
       and m_lead.position_id = m_self.position_id
       and m_lead.role = 'post_lead'
       and m_lead.is_active = true
      where m_self.user_id = auth.uid()
        and m_self.role = 'volunteer'
        and m_self.is_active = true
        and m_self.position_id is not null
        and m_lead.user_id = volunteer_profiles.user_id
    )
    or
    -- Cas 2 : volunteer rattaché via assignments (DnD planning)
    exists (
      select 1
      from public.assignments a
      join public.shifts s on s.id = a.shift_id
      join public.memberships m_lead
        on m_lead.event_id = (select event_id from public.positions where id = s.position_id)
       and m_lead.position_id = s.position_id
       and m_lead.role = 'post_lead'
       and m_lead.is_active = true
      where a.volunteer_user_id = auth.uid()
        and a.status in ('pending', 'validated')
        and m_lead.user_id = volunteer_profiles.user_id
    )
  );

comment on policy vp_select_my_team_lead on public.volunteer_profiles is
  'volunteer voit le profile de son post_lead — via memberships.position_id OR via assignments→shifts.position_id (Bug #7-bis fix).';

-- ─── 3. Memberships : volunteer voit son post_lead ─────────────────
-- Sans cette policy, Lucas ne voit jamais la membership de Mahaut, donc
-- impossible de récupérer son user_id pour ensuite fetcher son profile.
create policy memberships_select_my_team_lead on public.memberships
  for select using (
    -- Le row demandé est une post_lead ACTIVE et l'auth.uid() courant
    -- est un volunteer ACTIVE de la même équipe (memberships ou assignments).
    role = 'post_lead'
    and is_active = true
    and (
      exists (
        select 1
        from public.memberships m_self
        where m_self.user_id = auth.uid()
          and m_self.event_id = memberships.event_id
          and m_self.role = 'volunteer'
          and m_self.is_active = true
          and m_self.position_id = memberships.position_id
          and m_self.position_id is not null
      )
      or exists (
        select 1
        from public.assignments a
        join public.shifts s on s.id = a.shift_id
        where a.volunteer_user_id = auth.uid()
          and a.status in ('pending', 'validated')
          and s.position_id = memberships.position_id
      )
    )
  );

comment on policy memberships_select_my_team_lead on public.memberships is
  'volunteer voit la membership post_lead de son équipe — via memberships.position_id OR via assignments→shifts.position_id (Bug #7-bis fix dependency).';

-- ─── 4. Sync memberships.position_id côté RPC assign_volunteer_atomic ──
-- Bug #13-bis racine : DnD planning crée une assignment mais ne touche PAS
-- memberships.position_id du bénévole. Résultat : la RLS post_lead via
-- memberships.position_id ne voit jamais le bénévole. On le synchronise.
CREATE OR REPLACE FUNCTION public.assign_volunteer_atomic(
  p_user_or_email TEXT,
  p_position_id   UUID,
  p_event_id      UUID,
  p_actor_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_real_user_id  UUID;
  v_email         TEXT;
  v_app           public.volunteer_applications%ROWTYPE;
  v_target_shift_id UUID;
  v_event_starts  TIMESTAMPTZ;
  v_event_ends    TIMESTAMPTZ;
BEGIN
  -- 1. Permission check (direction OR volunteer_lead sur cet event)
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = p_actor_user_id
      AND event_id = p_event_id
      AND is_active = true
      AND role IN ('direction', 'volunteer_lead')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission refusée');
  END IF;

  -- 2. Résoudre p_user_or_email → UUID réel
  IF p_user_or_email LIKE 'pre-%' THEN
    v_email := lower(substr(p_user_or_email, 5));

    SELECT id INTO v_real_user_id
    FROM auth.users
    WHERE lower(email) = v_email
    LIMIT 1;

    IF v_real_user_id IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('Compte auth introuvable pour %s — clique 📧 Inviter dans Candidatures', v_email)
      );
    END IF;

    SELECT * INTO v_app
    FROM public.volunteer_applications
    WHERE lower(email) = v_email
      AND event_id = p_event_id
      AND status = 'validated'
    LIMIT 1;

    IF v_app.id IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('Aucune candidature validée pour %s sur cet event — valide d''abord la candidature', v_email)
      );
    END IF;

    INSERT INTO public.memberships (user_id, event_id, role, is_active, accepted_at)
    VALUES (v_real_user_id, p_event_id, 'volunteer', true, now())
    ON CONFLICT (user_id, event_id, role) DO UPDATE SET is_active = true;

    INSERT INTO public.volunteer_profiles (
      user_id, full_name, first_name, last_name, birth_date, gender, phone, email,
      address_street, address_city, address_zip, profession, size, diet_notes,
      diet_type, carpool, available_setup, available_teardown, skills, limitations,
      bio, avatar_url, is_returning
    )
    VALUES (
      v_real_user_id,
      COALESCE(v_app.full_name, v_email),
      v_app.first_name, v_app.last_name, v_app.birth_date, v_app.gender, v_app.phone, v_email,
      v_app.address_street, v_app.address_city, v_app.address_zip, v_app.profession,
      v_app.size, v_app.diet_notes, v_app.diet_type, v_app.carpool,
      v_app.available_setup, v_app.available_teardown,
      COALESCE(v_app.skills, '{}'::text[]),
      COALESCE(v_app.limitations, '{}'::text[]),
      v_app.bio, v_app.avatar_url, COALESCE(v_app.is_returning, false)
    )
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.audit_log (user_id, event_id, action, payload)
    VALUES (
      p_actor_user_id, p_event_id,
      'membership.auto_created_via_assignment',
      jsonb_build_object(
        'email', v_email,
        'target_user_id', v_real_user_id,
        'reason', 'drag_pre_volunteer'
      )
    );
  ELSE
    BEGIN
      v_real_user_id := p_user_or_email::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Identifiant bénévole invalide');
    END;
  END IF;

  -- 3. Supprimer toutes les assignments existantes du bénévole sur cet event
  DELETE FROM public.assignments
  WHERE volunteer_user_id = v_real_user_id
    AND status IN ('pending', 'validated')
    AND shift_id IN (
      SELECT s.id FROM public.shifts s
      JOIN public.positions p ON p.id = s.position_id
      WHERE p.event_id = p_event_id
    );

  -- 4. Si retour au pool, fin de course + reset memberships.position_id
  IF p_position_id IS NULL THEN
    -- Bug #13-bis : on remet aussi position_id à NULL côté memberships
    -- pour que la source memberships soit cohérente avec le pool.
    UPDATE public.memberships
    SET position_id = NULL
    WHERE user_id = v_real_user_id
      AND event_id = p_event_id
      AND role = 'volunteer'
      AND is_active = true;

    INSERT INTO public.audit_log (user_id, event_id, action, payload)
    VALUES (
      p_actor_user_id, p_event_id,
      'assignment.team.removed',
      jsonb_build_object('volunteer_user_id', v_real_user_id)
    );
    RETURN jsonb_build_object('ok', true, 'real_user_id', v_real_user_id);
  END IF;

  -- 5. Validation position
  IF NOT EXISTS (
    SELECT 1 FROM public.positions
    WHERE id = p_position_id AND event_id = p_event_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Position invalide pour cet event');
  END IF;

  -- 6. Trouver/créer un shift dans la position cible
  SELECT id INTO v_target_shift_id
  FROM public.shifts
  WHERE position_id = p_position_id
  ORDER BY starts_at ASC
  LIMIT 1;

  IF v_target_shift_id IS NULL THEN
    SELECT starts_at, ends_at INTO v_event_starts, v_event_ends
    FROM public.events WHERE id = p_event_id;

    IF v_event_starts IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Event introuvable');
    END IF;

    INSERT INTO public.shifts (position_id, starts_at, ends_at, needs_count, notes)
    VALUES (
      p_position_id, v_event_starts, v_event_ends, 1,
      'Shift couverture totale créé via planning équipes'
    )
    RETURNING id INTO v_target_shift_id;
  END IF;

  -- 7. Créer l'assignment
  INSERT INTO public.assignments (shift_id, volunteer_user_id, status, assigned_by)
  VALUES (v_target_shift_id, v_real_user_id, 'validated', p_actor_user_id)
  ON CONFLICT (shift_id, volunteer_user_id) DO UPDATE
    SET status = 'validated', assigned_by = EXCLUDED.assigned_by;

  -- 8. Bug #13-bis : sync memberships.position_id pour cohérence des sources
  -- (RLS post_lead via memberships.position_id, /poste page logic, /v home page).
  UPDATE public.memberships
  SET position_id = p_position_id
  WHERE user_id = v_real_user_id
    AND event_id = p_event_id
    AND role = 'volunteer'
    AND is_active = true;

  -- 9. Audit log assignment
  INSERT INTO public.audit_log (user_id, event_id, action, payload)
  VALUES (
    p_actor_user_id, p_event_id,
    'assignment.team.assigned',
    jsonb_build_object(
      'volunteer_user_id', v_real_user_id,
      'position_id', p_position_id,
      'shift_id', v_target_shift_id,
      'resolved_from', p_user_or_email,
      'sync_membership_position_id', true
    )
  );

  RETURN jsonb_build_object('ok', true, 'real_user_id', v_real_user_id, 'shift_id', v_target_shift_id);
END;
$$;

COMMENT ON FUNCTION public.assign_volunteer_atomic(TEXT, UUID, UUID, UUID) IS
  'Bug #5 + #13-bis : assigne un bénévole atomiquement + sync memberships.position_id pour cohérence avec /poste, /v et RLS post_lead.';

-- ─── 5. Backfill : aligner memberships.position_id sur les assignments existantes ──
-- Pour chaque membership volunteer active avec assignment validated dont
-- shifts.position_id ≠ memberships.position_id (ou NULL), on aligne.
-- Si un volunteer a plusieurs assignments sur des positions différentes, on
-- prend la 1ère par created_at (heuristique : on suit le DnD historique).
WITH assignments_position AS (
  SELECT DISTINCT ON (a.volunteer_user_id, p.event_id)
    a.volunteer_user_id,
    p.event_id,
    s.position_id
  FROM public.assignments a
  JOIN public.shifts s ON s.id = a.shift_id
  JOIN public.positions p ON p.id = s.position_id
  WHERE a.status IN ('pending', 'validated')
  ORDER BY a.volunteer_user_id, p.event_id, a.created_at ASC
)
UPDATE public.memberships m
SET position_id = ap.position_id
FROM assignments_position ap
WHERE m.user_id = ap.volunteer_user_id
  AND m.event_id = ap.event_id
  AND m.role = 'volunteer'
  AND m.is_active = true
  AND (m.position_id IS NULL OR m.position_id <> ap.position_id);
