-- ════════════════════════════════════════════════════════════════════
-- 20260430000007 — RLS POLICIES
-- Toutes les policies appliquées en bloc.
-- Principe : refus par défaut + autorisation par rôle hiérarchique.
-- ════════════════════════════════════════════════════════════════════

-- ─── ORGANIZATIONS ─────────────────────────────────────────────────
-- Lecture : authentifié et membre d'au moins un event de cette org
create policy "orgs_select_members" on public.organizations
  for select using (
    exists (
      select 1 from public.memberships m
      join public.events e on e.id = m.event_id
      where m.user_id = auth.uid()
        and e.organization_id = organizations.id
        and m.is_active = true
    )
  );

-- Lecture : public si org a au moins 1 event 'open' (page d'inscription publique)
create policy "orgs_select_public_when_open" on public.organizations
  for select using (
    exists (
      select 1 from public.events e
      where e.organization_id = organizations.id
        and e.status = 'open'
    )
  );

-- Création/édition : direction d'au moins 1 event de l'org (pas de "owner" séparé V1)
create policy "orgs_update_direction" on public.organizations
  for update using (
    exists (
      select 1 from public.memberships m
      join public.events e on e.id = m.event_id
      where m.user_id = auth.uid()
        and e.organization_id = organizations.id
        and m.role = 'direction'
        and m.is_active = true
    )
  );

-- ─── EVENTS ─────────────────────────────────────────────────────────
create policy "events_select_public_when_open" on public.events
  for select using (status in ('open','closed','archived'));

create policy "events_select_members" on public.events
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.event_id = events.id
        and m.is_active = true
    )
  );

create policy "events_update_direction" on public.events
  for update using (public.role_in_event(events.id) = 'direction');

create policy "events_insert_authenticated" on public.events
  for insert with check (auth.uid() is not null);

-- ─── MEMBERSHIPS ────────────────────────────────────────────────────
create policy "memberships_select_self" on public.memberships
  for select using (user_id = auth.uid());

create policy "memberships_select_event_lead" on public.memberships
  for select using (
    public.has_role_at_least(memberships.event_id, 'volunteer_lead')
  );

create policy "memberships_insert_lead" on public.memberships
  for insert with check (
    public.has_role_at_least(memberships.event_id, 'volunteer_lead')
  );

create policy "memberships_update_lead" on public.memberships
  for update using (
    public.has_role_at_least(memberships.event_id, 'volunteer_lead')
  );

-- ─── VOLUNTEER PROFILES ────────────────────────────────────────────
create policy "vp_select_self" on public.volunteer_profiles
  for select using (user_id = auth.uid());

-- volunteer_lead/direction voient tous les profils des bénévoles de leurs events
create policy "vp_select_event_lead" on public.volunteer_profiles
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = volunteer_profiles.user_id
        and public.has_role_at_least(m.event_id, 'volunteer_lead')
    )
  );

-- post_lead voit les bénévoles de son équipe (même position)
create policy "vp_select_post_lead_team" on public.volunteer_profiles
  for select using (
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
    )
  );

create policy "vp_update_self" on public.volunteer_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "vp_insert_self" on public.volunteer_profiles
  for insert with check (user_id = auth.uid());

-- ─── VOLUNTEER APPLICATIONS ────────────────────────────────────────
-- Le formulaire public peut INSERT (anonyme) pour un event open
create policy "applications_insert_public_open_event" on public.volunteer_applications
  for insert with check (
    exists (
      select 1 from public.events e
      where e.id = volunteer_applications.event_id
        and e.status = 'open'
        and (e.registration_open_at is null or e.registration_open_at <= now())
        and (e.registration_close_at is null or e.registration_close_at >= now())
    )
  );

-- Le candidat peut voir SA candidature s'il est connecté avec le même email
create policy "applications_select_self_email" on public.volunteer_applications
  for select using (
    auth.email() = volunteer_applications.email
  );

-- volunteer_lead/direction voient toutes les candidatures de leur event
create policy "applications_select_event_lead" on public.volunteer_applications
  for select using (
    public.has_role_at_least(volunteer_applications.event_id, 'volunteer_lead')
  );

create policy "applications_update_event_lead" on public.volunteer_applications
  for update using (
    public.has_role_at_least(volunteer_applications.event_id, 'volunteer_lead')
  );

-- ─── POSITIONS ──────────────────────────────────────────────────────
create policy "positions_select_event_members" on public.positions
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.event_id = positions.event_id
        and m.is_active = true
    )
    or exists (
      select 1 from public.events e
      where e.id = positions.event_id
        and e.status = 'open'
    )
  );

create policy "positions_modify_lead" on public.positions
  for all using (public.has_role_at_least(positions.event_id, 'volunteer_lead'))
  with check (public.has_role_at_least(positions.event_id, 'volunteer_lead'));

-- ─── SHIFTS ─────────────────────────────────────────────────────────
create policy "shifts_select_event_members" on public.shifts
  for select using (
    exists (
      select 1 from public.positions p
      join public.memberships m on m.event_id = p.event_id
      where p.id = shifts.position_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

create policy "shifts_modify_lead" on public.shifts
  for all using (
    exists (
      select 1 from public.positions p
      where p.id = shifts.position_id
        and public.has_role_at_least(p.event_id, 'volunteer_lead')
    )
  );

-- ─── ASSIGNMENTS ────────────────────────────────────────────────────
create policy "assignments_select_self" on public.assignments
  for select using (volunteer_user_id = auth.uid());

create policy "assignments_select_event_lead" on public.assignments
  for select using (
    exists (
      select 1 from public.shifts s
      join public.positions p on p.id = s.position_id
      where s.id = assignments.shift_id
        and (
          public.has_role_at_least(p.event_id, 'volunteer_lead')
          or (
            public.role_in_event(p.event_id) = 'post_lead'
            and exists (
              select 1 from public.memberships m
              where m.user_id = auth.uid()
                and m.event_id = p.event_id
                and m.role = 'post_lead'
                and m.position_id = p.id
            )
          )
        )
    )
  );

-- Bénévole peut update son rating + acceptation/refus
create policy "assignments_update_self_validation" on public.assignments
  for update using (volunteer_user_id = auth.uid())
  with check (volunteer_user_id = auth.uid());

create policy "assignments_modify_lead" on public.assignments
  for all using (
    exists (
      select 1 from public.shifts s
      join public.positions p on p.id = s.position_id
      where s.id = assignments.shift_id
        and public.has_role_at_least(p.event_id, 'volunteer_lead')
    )
  );

-- ─── MEAL ALLOWANCES ────────────────────────────────────────────────
create policy "meals_select_self" on public.meal_allowances
  for select using (volunteer_user_id = auth.uid());

create policy "meals_select_event_lead" on public.meal_allowances
  for select using (
    public.has_role_at_least(meal_allowances.event_id, 'staff_scan')
  );

create policy "meals_modify_lead" on public.meal_allowances
  for all using (
    public.has_role_at_least(meal_allowances.event_id, 'volunteer_lead')
  );

-- ─── MESSAGE CHANNELS / MESSAGES ───────────────────────────────────
create policy "channels_select_member" on public.message_channels
  for select using (
    case message_channels.kind
      when 'team' then exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid()
          and m.event_id = message_channels.event_id
          and (m.position_id = message_channels.position_id or m.role in ('volunteer_lead','direction'))
      )
      when 'responsibles' then public.has_role_at_least(message_channels.event_id, 'post_lead')
      when 'regie' then public.has_role_at_least(message_channels.event_id, 'volunteer_lead')
      when 'admin' then public.role_in_event(message_channels.event_id) = 'direction'
      when 'direct' then auth.uid() = any(message_channels.participant_user_ids)
                       or public.role_in_event(message_channels.event_id) = 'direction'
    end
  );

create policy "messages_select_via_channel" on public.messages
  for select using (
    exists (
      select 1 from public.message_channels c
      where c.id = messages.channel_id
        -- la policy channels_select_member s'applique transitivement via cette query
    )
    -- Régie peut tout voir (modération)
    or exists (
      select 1 from public.message_channels c
      where c.id = messages.channel_id
        and public.role_in_event(c.event_id) = 'direction'
    )
  );

create policy "messages_insert_member" on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and not exists (
      select 1 from public.bans b
      where b.target_user_id = auth.uid()
        and b.unbanned_at is null
        and exists (
          select 1 from public.message_channels c
          where c.id = messages.channel_id
            and c.event_id = b.event_id
        )
    )
  );

create policy "messages_update_regie_for_mute" on public.messages
  for update using (
    exists (
      select 1 from public.message_channels c
      where c.id = messages.channel_id
        and public.role_in_event(c.event_id) = 'direction'
    )
  );

-- ─── NOTIFICATION LOG ──────────────────────────────────────────────
create policy "notif_log_select_self_or_lead" on public.notification_log
  for select using (
    user_id = auth.uid()
    or (event_id is not null and public.has_role_at_least(event_id, 'volunteer_lead'))
  );

-- ─── WELLBEING REPORTS ─────────────────────────────────────────────
create policy "wellbeing_insert_self" on public.wellbeing_reports
  for insert with check (reporter_user_id = auth.uid());

create policy "wellbeing_select_self" on public.wellbeing_reports
  for select using (reporter_user_id = auth.uid());

create policy "wellbeing_select_event_lead" on public.wellbeing_reports
  for select using (public.has_role_at_least(wellbeing_reports.event_id, 'post_lead'));

create policy "wellbeing_update_lead" on public.wellbeing_reports
  for update using (public.has_role_at_least(wellbeing_reports.event_id, 'volunteer_lead'));

-- ─── SAFER ALERTS ──────────────────────────────────────────────────
-- Tout membre actif peut déclencher une alerte
create policy "safer_alerts_insert_member" on public.safer_alerts
  for insert with check (
    reporter_user_id = auth.uid()
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.event_id = safer_alerts.event_id
        and m.is_active = true
    )
  );

-- Le reporter voit son alerte ; les responsables/régie voient toutes les alertes
create policy "safer_alerts_select_reporter_or_lead" on public.safer_alerts
  for select using (
    reporter_user_id = auth.uid()
    or public.has_role_at_least(safer_alerts.event_id, 'post_lead')
  );

create policy "safer_alerts_update_lead" on public.safer_alerts
  for update using (public.has_role_at_least(safer_alerts.event_id, 'post_lead'));

-- ─── MODERATION ACTIONS ────────────────────────────────────────────
create policy "moderation_select_lead" on public.moderation_actions
  for select using (public.has_role_at_least(moderation_actions.event_id, 'volunteer_lead'));

create policy "moderation_insert_lead" on public.moderation_actions
  for insert with check (
    actor_user_id = auth.uid()
    and public.has_role_at_least(moderation_actions.event_id, 'volunteer_lead')
  );

-- ─── BANS ──────────────────────────────────────────────────────────
create policy "bans_select_lead" on public.bans
  for select using (public.has_role_at_least(bans.event_id, 'post_lead'));

create policy "bans_insert_via_function_only" on public.bans
  for insert with check (false);  -- les insert se font via Edge fn ban_validator

-- ─── SIGNED ENGAGEMENTS ────────────────────────────────────────────
create policy "engagements_select_self" on public.signed_engagements
  for select using (user_id = auth.uid());

create policy "engagements_select_lead" on public.signed_engagements
  for select using (public.has_role_at_least(signed_engagements.event_id, 'volunteer_lead'));

create policy "engagements_insert_self" on public.signed_engagements
  for insert with check (user_id = auth.uid());

-- ─── SCAN EVENTS ───────────────────────────────────────────────────
create policy "scans_insert_staff" on public.scan_events
  for insert with check (
    scanned_by = auth.uid()
    and (
      public.has_role_at_least(scan_events.event_id, 'staff_scan')
      or exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid()
          and m.event_id = scan_events.event_id
          and m.is_entry_scanner = true
          and m.is_active = true
      )
    )
  );

create policy "scans_select_volunteer_self" on public.scan_events
  for select using (volunteer_user_id = auth.uid());

create policy "scans_select_event_lead" on public.scan_events
  for select using (public.has_role_at_least(scan_events.event_id, 'staff_scan'));

-- ─── AUDIT LOG (immuable, no update/no delete) ─────────────────────
create policy "audit_select_lead" on public.audit_log
  for select using (
    event_id is null
    or public.has_role_at_least(audit_log.event_id, 'volunteer_lead')
  );

create policy "audit_insert_authenticated" on public.audit_log
  for insert with check (auth.uid() is not null);

-- IMMUTABLE : pas d'update ni de delete possible (RLS bloque tout)
create policy "audit_no_update" on public.audit_log
  for update using (false);

create policy "audit_no_delete" on public.audit_log
  for delete using (false);
