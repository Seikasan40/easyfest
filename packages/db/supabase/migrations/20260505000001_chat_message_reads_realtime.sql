-- ════════════════════════════════════════════════════════════════════
-- 20260505000001 — Chat bidirectionnel : message_reads + RLS INSERT
--                  granulaire + Realtime
--
-- Contexte :
--   Le schéma message_channels + messages existe depuis 20260430000004.
--   Le channel_kind enum a les valeurs : team, responsibles, regie,
--   admin, direct.
--   Les canaux DM utilisent participant_user_ids uuid[].
--   Cette migration ajoute uniquement :
--     1. Table message_reads (suivi lu/non-lu)
--     2. Colonne messages.author_user_id (alias ergonomique, nullable pour
--        rétro-compatibilité — les broadcasts existants ont sender_user_id)
--     3. Renforcement de la policy messages INSERT (isolation par canal)
--     4. Realtime sur messages + message_channels
-- ════════════════════════════════════════════════════════════════════

-- ── 1. message_reads ────────────────────────────────────────────────
create table if not exists public.message_reads (
  user_id      uuid not null references auth.users(id) on delete cascade,
  channel_id   uuid not null references public.message_channels(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

comment on table public.message_reads is
  'Suivi lu/non-lu par user et canal. Upsert à chaque ouverture du canal.';

create index if not exists idx_message_reads_user
  on public.message_reads(user_id);

alter table public.message_reads enable row level security;

create policy "reads_own" on public.message_reads
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── 2. messages.author_user_id (alias ergonomique) ──────────────────
-- sender_user_id reste la colonne canonique (NOT NULL, déjà peuplée).
-- author_user_id est une colonne calculée pour les nouveaux messages
-- envoyés via le nouveau chat bidirectionnel.
-- On la rend nullable pour compatibilité avec les anciens broadcasts.
alter table public.messages
  add column if not exists author_user_id uuid
    references auth.users(id) on delete set null;

comment on column public.messages.author_user_id is
  'Alias de sender_user_id, utilisé par le chat bidirectionnel.
   NULL pour les anciens broadcasts (sender_user_id fait foi).';

-- Backfill : les messages existants reçoivent author_user_id = sender_user_id
update public.messages
  set author_user_id = sender_user_id
  where author_user_id is null;

-- Index
create index if not exists idx_messages_author_uid
  on public.messages(author_user_id);

-- ── 3. Renforcement policy INSERT messages ───────────────────────────
-- L'ancienne policy messages_insert_member autorisait tout bénévole à
-- écrire dans n'importe quel canal (sans vérifier le kind/position).
-- On la remplace par une policy qui vérifie l'accès réel au canal.

drop policy if exists "messages_insert_member" on public.messages;

create policy "messages_insert_member" on public.messages
  for insert with check (
    -- L'émetteur doit être le user connecté
    (sender_user_id = auth.uid() or author_user_id = auth.uid())
    -- Pas de ban actif
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
    -- Vérification accès au canal selon le kind
    and exists (
      select 1 from public.message_channels c
      join public.memberships m
        on m.event_id = c.event_id
        and m.user_id = auth.uid()
        and m.is_active = true
      where c.id = messages.channel_id
        and (
          -- Canal équipe : doit être dans la bonne position OU être régie
          (c.kind = 'team'
            and (m.position_id = c.position_id
                 or m.role in ('volunteer_lead', 'direction')))
          -- Canal responsables : post_lead +
          or (c.kind = 'responsibles'
              and m.role in ('post_lead', 'volunteer_lead', 'direction'))
          -- Canal régie : volunteer_lead +
          or (c.kind = 'regie'
              and m.role in ('volunteer_lead', 'direction'))
          -- Canal admin (annonces) : direction uniquement en écriture
          or (c.kind = 'admin'
              and m.role = 'direction')
          -- Canal direct : doit être participant
          or (c.kind = 'direct'
              and auth.uid() = any(c.participant_user_ids))
        )
    )
  );

comment on policy "messages_insert_member" on public.messages is
  'Isolation stricte : bénévole écrit uniquement dans son canal équipe.
   Régie/direction écrivent dans tous les canaux. DM = participant only.';

-- ── 4. Realtime ─────────────────────────────────────────────────────
-- Active les publications Realtime sur les tables de chat.
-- Nécessite un projet Supabase avec Realtime activé (Database > Replication).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_channels;
