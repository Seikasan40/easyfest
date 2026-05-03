-- ════════════════════════════════════════════════════════════════════
-- 20260503030000 — RLS message_channels admin = lisible par tous
--
-- Phase 4 V4 retest 3 mai 2026 — Note Lucas /v/feed :
--   Lucas (volunteer Bar) ne voit pas l'annonce "Salut à tous" qui est
--   publiée dans le channel kind='admin' nommé "Annonces". L'ancienne
--   policy `channels_select_member` ne donne accès aux channels admin
--   qu'aux directions, alors que ces channels sont les broadcasts globaux
--   (`target='all'` côté broadcastMessage).
--
-- Fix : étendre la policy pour que `admin` soit lisible par TOUT membre
-- actif de l'event. L'écriture reste restreinte aux directions via
-- messages_insert_member + une nouvelle channels_insert policy si besoin.
-- ════════════════════════════════════════════════════════════════════

drop policy if exists "channels_select_member" on public.message_channels;

create policy "channels_select_member" on public.message_channels
  for select using (
    case message_channels.kind
      when 'team' then exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid()
          and m.event_id = message_channels.event_id
          and m.is_active = true
          and (m.position_id = message_channels.position_id
               or m.role in ('volunteer_lead','direction'))
      )
      when 'responsibles' then public.has_role_at_least(message_channels.event_id, 'post_lead')
      when 'regie' then public.has_role_at_least(message_channels.event_id, 'volunteer_lead')
      -- Bug feed-bis : admin = annonces broadcast tout-le-monde, lisible par
      -- tout membre actif de l'event. (Écriture reste direction-only via
      -- messages_insert_member et les autres policies amont.)
      when 'admin' then exists (
        select 1 from public.memberships m
        where m.user_id = auth.uid()
          and m.event_id = message_channels.event_id
          and m.is_active = true
      )
      when 'direct' then auth.uid() = any(message_channels.participant_user_ids)
                       or public.role_in_event(message_channels.event_id) = 'direction'
    end
  );

comment on policy "channels_select_member" on public.message_channels is
  'Membres voient les channels visibles selon leur rôle. admin (annonces) = tout membre actif (Bug feed-bis fix).';
