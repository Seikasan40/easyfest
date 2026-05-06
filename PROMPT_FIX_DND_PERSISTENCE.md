# PROMPT FIX URGENT — Persistance DnD planning (Bug #5)

> **Contexte** : Phase 4 retest extrême Cowork (3 mai 2026 ~10h35 UTC) a découvert un bug PIRE que le précédent. Le universal fix `assignVolunteerToTeam` (commit `49f3234`) produit un FAUX POSITIF : UI optimiste OK, mais après F5 l'assignation est perdue. Le compteur global `84 bénévoles (84 en attente compte)` ne bouge JAMAIS.
>
> **À lancer dans Claude Code, terminal sur `E:\Easy_Fest\Easy_Fest\easyfest`, branche `main`. ZÉRO interaction user pendant l'exécution. Tout est pré-autorisé.**

---

## 🚨 SYMPTÔME — reproduction live confirmée 3× par Cowork

1. Login Pamela `pam@easyfest.test` / `easyfest-demo-2026-v2` sur prod
2. `/regie/icmpaca/rdl-2026/planning` → compteur `84 bénévoles (84 en attente compte)`
3. Filtrer `anais` → carte Anaïs Bayart visible (badge ⏳, wish BAR)
4. Drag carte → équipe Bar
5. **UI immédiat** : pool `(84)` → `(83)`, Anaïs apparaît dans Bar avec check vert ✓, message "Tous les bénévoles ont une équipe 🎉" — TOUT semble OK
6. **F5 (reload page)** : pool revient à `(84)`, Anaïs retombe dans le pool avec badge ⏳, Bar redevient `0/4`
7. **Compteur global ne bouge JAMAIS** : reste `84 bénévoles (84 en attente compte)` après tous les drags

Évidence visuelle dans `BUGS_AUDIT_EXTREME.md` (section Phase 4 en haut), screenshots `ss_24067hqir`, `ss_75608jhpw`, `ss_1028fyuzf`, `ss_3159m5f8h`, `ss_3824pzb53`, `ss_1680ya6ry`.

---

## 🎯 ROOT CAUSE PROBABLE (à confirmer par investigation code)

Hypothèses ordonnées par probabilité décroissante :

### Hypothèse #1 (la plus probable) — `realUserId` mal propagé
Dans `apps/vitrine/app/actions/planning.ts`, la fonction `assignVolunteerToTeam` :
- Détecte le préfixe `pre-<email>`
- Résout vers `auth.users.id` correct
- Crée la membership volunteer ✅
- **MAIS** insère le `volunteer_assignment` (ou équivalent) en utilisant l'ancien `input.volunteerUserId` (préfixe `pre-`) au lieu du `realUserId` (UUID réel).
→ L'assignment est créé avec un `user_id` orphelin invisible au reload.

### Hypothèse #2 — Server action retourne `ok: true` mais transaction revert
La server action lance plusieurs INSERT séquentiels sans transaction. L'un d'eux échoue (RLS, FK, constraint) après que le premier soit committé. Le client reçoit `{ ok: true }` du premier INSERT et fait sa mise à jour optimiste, sans savoir que le 2ᵉ a foiré.

### Hypothèse #3 — UI optimiste sans server call
Le composant `PlanningTeamColumn` ou `PlanningVolunteerCard` met à jour l'état React au drop AVANT d'attendre la réponse server, et la server action est silencieusement ignorée (rejeté par RLS sans toast affiché).

### Hypothèse #4 — Vercel build pas pris en compte
Le commit `49f3234` est sur main MAIS le déploiement Vercel a échoué silencieusement (build error, env var manquante) → la prod tourne encore l'ancienne version.

---

## 📋 PLAN D'EXÉCUTION CLAUDE CODE (autonome, pas d'interaction user)

### ÉTAPE 1 — Pré-flight diagnostic (5 min)

```bash
cd E:\Easy_Fest\Easy_Fest\easyfest
git status
git log --oneline -5
git fetch origin main
git pull origin main 2>&1 | tail -10
```

Vérifier ensuite que le code Vercel = code main :

```bash
# Via Vercel CLI ou API : vérifier le commit du dernier deploy
vercel ls 2>&1 | head -10
# OU : aller sur https://vercel.com/easyfest/easyfest et regarder le commit hash du dernier deploy
```

Si le commit Vercel ≠ `49f3234`, **HYPOTHÈSE #4 confirmée** → trigger un redeploy manuel via `vercel --prod` ou via le dashboard Vercel.

### ÉTAPE 2 — Audit code `assignVolunteerToTeam` (10 min)

```bash
cd E:\Easy_Fest\Easy_Fest\easyfest
cat apps/vitrine/app/actions/planning.ts | head -200
```

Recherche TOUS les usages de `realUserId` vs `input.volunteerUserId` dans cette fonction. Toute insertion qui utilise encore `input.volunteerUserId` après la résolution du préfixe `pre-` est suspecte.

```bash
grep -n "volunteerUserId" apps/vitrine/app/actions/planning.ts
grep -n "realUserId" apps/vitrine/app/actions/planning.ts
grep -n "volunteer_assignments\|volunteer_assignment" apps/vitrine/app/actions/planning.ts
```

Lister aussi tout ce qui est UPDATE/INSERT après la résolution :

```bash
grep -n "from(\"volunteer_assignments\")\|from(\"memberships\")\|from(\"volunteer_profiles\")" apps/vitrine/app/actions/planning.ts
```

### ÉTAPE 3 — Inspection BDD live pour confirmer (5 min)

Via Supabase Management API ou psql, après un drag fait par toi (ou par Cowork) :

```sql
-- Vérifier la membership Anaïs Bayart
select m.user_id, m.role, m.is_active, u.email
from memberships m
join auth.users u on u.id = m.user_id
where lower(u.email) = 'anaisbayart@outlook.fr';

-- Vérifier l'assignment
select va.*, p.title as position_title, t.name as team_name
from volunteer_assignments va
left join positions p on p.id = va.position_id
left join teams t on t.id = p.team_id
where va.user_id in (
  select id from auth.users where lower(email) = 'anaisbayart@outlook.fr'
);

-- Vérifier les éventuels orphelins (user_id qui ne sont pas dans auth.users)
select * from volunteer_assignments
where user_id::text like 'pre-%'
   or user_id not in (select id from auth.users);
```

Si la query #3 retourne des lignes → **HYPOTHÈSE #1 confirmée** : `realUserId` mal propagé.

### ÉTAPE 4 — Refactor en RPC SQL atomique (30 min)

Le refactor définitif est de remplacer la séquence d'INSERTs par un seul appel RPC PostgreSQL. Migration à créer :

```sql
-- packages/db/supabase/migrations/20260503010000_rpc_assign_volunteer_atomic.sql

create or replace function public.assign_volunteer_atomic(
  p_user_or_email text,        -- "pre-<email>" OU UUID
  p_position_id uuid,           -- null = retour au pool
  p_event_id uuid,
  p_actor_user_id uuid          -- pour audit_log
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_real_user_id uuid;
  v_email text;
  v_app_id uuid;
  v_existing_membership_id uuid;
begin
  -- 1. Permission check : actor doit être direction ou volunteer_lead sur cet event
  if not exists (
    select 1 from memberships
    where user_id = p_actor_user_id
      and event_id = p_event_id
      and is_active = true
      and role in ('direction', 'volunteer_lead')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Permission refusée');
  end if;

  -- 2. Résoudre p_user_or_email vers un UUID réel
  if p_user_or_email like 'pre-%' then
    v_email := lower(substr(p_user_or_email, 5));
    select id into v_real_user_id from auth.users where lower(email) = v_email;
    if v_real_user_id is null then
      return jsonb_build_object('ok', false, 'error',
        format('Compte auth introuvable pour %s — clique 📧 Inviter dans Candidatures', v_email));
    end if;
    -- 2b. Vérifier que l'application est bien validée
    select id into v_app_id
    from volunteer_applications
    where lower(email) = v_email
      and event_id = p_event_id
      and status = 'validated'
    limit 1;
    if v_app_id is null then
      return jsonb_build_object('ok', false, 'error',
        format('Aucune candidature validée pour %s', v_email));
    end if;
  else
    v_real_user_id := p_user_or_email::uuid;
  end if;

  -- 3. Créer la membership volunteer si manquante (idempotent)
  insert into memberships (user_id, event_id, role, is_active)
  values (v_real_user_id, p_event_id, 'volunteer', true)
  on conflict (user_id, event_id, role) do update set is_active = true
  returning id into v_existing_membership_id;

  -- 4. Mettre à jour ou créer le volunteer_assignment
  if p_position_id is null then
    -- Retour au pool : supprimer toute affectation existante
    delete from volunteer_assignments
    where user_id = v_real_user_id
      and position_id in (select id from positions where event_id = p_event_id);
  else
    -- Vérifier que le position appartient bien à cet event
    if not exists (select 1 from positions where id = p_position_id and event_id = p_event_id) then
      return jsonb_build_object('ok', false, 'error', 'Position invalide pour cet event');
    end if;

    -- Upsert assignment
    insert into volunteer_assignments (user_id, position_id, assigned_by, assigned_at)
    values (v_real_user_id, p_position_id, p_actor_user_id, now())
    on conflict (user_id, position_id) do update
      set assigned_by = excluded.assigned_by,
          assigned_at = excluded.assigned_at;

    -- Supprimer les autres assignments pour cet event (un user = une équipe)
    delete from volunteer_assignments
    where user_id = v_real_user_id
      and position_id in (select id from positions where event_id = p_event_id and id != p_position_id);
  end if;

  -- 5. Audit log
  insert into audit_log (user_id, event_id, action, payload)
  values (
    p_actor_user_id,
    p_event_id,
    case when p_position_id is null then 'planning.unassign' else 'planning.assign' end,
    jsonb_build_object(
      'target_user_id', v_real_user_id,
      'position_id', p_position_id,
      'resolved_from', p_user_or_email
    )
  );

  return jsonb_build_object('ok', true, 'real_user_id', v_real_user_id);
end;
$$;

revoke all on function public.assign_volunteer_atomic(text, uuid, uuid, uuid) from public;
grant execute on function public.assign_volunteer_atomic(text, uuid, uuid, uuid) to authenticated;
```

Côté server action TypeScript, simplification radicale :

```typescript
// apps/vitrine/app/actions/planning.ts — assignVolunteerToTeam
"use server";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignVolunteerToTeam(input: {
  volunteerUserId: string;       // peut être "pre-<email>" OU UUID
  targetPositionId: string | null; // null = pool
  eventId: string;
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  const { data, error } = await supabase.rpc("assign_volunteer_atomic", {
    p_user_or_email: input.volunteerUserId,
    p_position_id: input.targetPositionId,
    p_event_id: input.eventId,
    p_actor_user_id: user.id,
  });

  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? "Échec assignation" };

  revalidatePath("/regie", "layout");
  return { ok: true, realUserId: data.real_user_id };
}
```

### ÉTAPE 5 — Frontend : remplacer la mise à jour optimiste par un re-fetch (10 min)

Dans `apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/PlanningTeamColumn.tsx` (ou le composant qui gère le drop) :

```typescript
// AVANT (optimiste pure):
setMembers(prev => [...prev, draggedVolunteer]);
await assignVolunteerToTeam({ ... });  // ignoré silencieusement

// APRÈS (server-first, avec toast d'erreur):
const result = await assignVolunteerToTeam({
  volunteerUserId: draggedVolunteer.user_id,
  targetPositionId: targetPosition.id,
  eventId,
});

if (!result.ok) {
  toast.error(result.error);
  return; // pas de mise à jour state, le pool revient visuellement
}

toast.success("✓ Sauvegardé");
router.refresh(); // re-fetch les données depuis le server
```

### ÉTAPE 6 — Tests Vitest (15 min)

```typescript
// apps/vitrine/__tests__/planning.assignVolunteerToTeam.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { assignVolunteerToTeam } from '@/app/actions/planning';
import { createServiceClient } from '@/lib/supabase/admin';

describe('assignVolunteerToTeam — persistance BDD', () => {
  // Setup : un event de test, un volunteer_application validated, un auth.users
  // (mockable via createServiceClient en mode test)

  it('persiste la membership volunteer après drag pre-volunteer', async () => {
    const result = await assignVolunteerToTeam({
      volunteerUserId: 'pre-test@mailinator.com',
      targetPositionId: TEST_POSITION_ID,
      eventId: TEST_EVENT_ID,
    });
    expect(result.ok).toBe(true);

    // Vérifier en BDD
    const admin = createServiceClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('*')
      .eq('user_id', result.realUserId)
      .eq('event_id', TEST_EVENT_ID)
      .single();
    expect(membership).toBeTruthy();
    expect(membership.role).toBe('volunteer');
    expect(membership.is_active).toBe(true);

    const { data: assignment } = await admin
      .from('volunteer_assignments')
      .select('*')
      .eq('user_id', result.realUserId)
      .eq('position_id', TEST_POSITION_ID)
      .single();
    expect(assignment).toBeTruthy();
  });

  it('retourne au pool quand position null', async () => {
    // Setup : assignment existant
    const result = await assignVolunteerToTeam({
      volunteerUserId: TEST_USER_UUID,
      targetPositionId: null,
      eventId: TEST_EVENT_ID,
    });
    expect(result.ok).toBe(true);

    // Vérifier que l'assignment a été supprimé
    const admin = createServiceClient();
    const { data: assignments } = await admin
      .from('volunteer_assignments')
      .select('*')
      .eq('user_id', TEST_USER_UUID);
    expect(assignments).toHaveLength(0);
  });

  it('refuse si actor sans permission', async () => {
    // Login un volunteer normal (pas direction/lead)
    const result = await assignVolunteerToTeam({ ... });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Permission/i);
  });
});
```

### ÉTAPE 7 — Backfill memberships pour les 84 pre-volunteers existants (5 min)

Migration one-shot pour rétablir les memberships manquantes en prod :

```sql
-- packages/db/supabase/migrations/20260503010001_backfill_memberships_validated.sql

-- Pour chaque volunteer_application validated dont l'auth.users existe MAIS pas la membership,
-- créer la membership volunteer is_active=true.
insert into memberships (user_id, event_id, role, is_active)
select distinct
  au.id as user_id,
  va.event_id,
  'volunteer'::text as role,
  true as is_active
from volunteer_applications va
join auth.users au on lower(au.email) = lower(va.email)
where va.status = 'validated'
  and not exists (
    select 1 from memberships m
    where m.user_id = au.id
      and m.event_id = va.event_id
      and m.role = 'volunteer'
  )
on conflict (user_id, event_id, role) do nothing;

-- Vérification post-migration : compteur attendu = 0 pour 'attente compte' RDL2026
select count(*) as orphans_remaining
from volunteer_applications va
join auth.users au on lower(au.email) = lower(va.email)
where va.status = 'validated'
  and va.event_id = (select id from events where slug = 'rdl-2026' limit 1)
  and not exists (
    select 1 from memberships m
    where m.user_id = au.id
      and m.event_id = va.event_id
      and m.role = 'volunteer'
  );
```

### ÉTAPE 8 — Push, redeploy, communiquer (5 min)

```bash
git add -A
git commit -m "fix(critical): DnD persistance via RPC atomique + backfill memberships RDL2026 (Bug #5)"
git push origin main
# Vercel auto-deploy. Vérifier en dashboard que le deploy passe au vert (~2 min).
```

Sortir un message de fin clair :

```
✅ Bug #5 fixé. Récap :
- RPC SQL atomique `assign_volunteer_atomic` (membership + assignment dans la même transaction)
- Server action TS simplifiée à 1 appel RPC
- Frontend : remplacement optimistic update → server-first + toast d'erreur explicite
- 2 tests Vitest verts
- Backfill prod : X memberships créées (où X = chiffre retourné par la migration)
- Commit XXXXX poussé sur main, deploy Vercel ✅

Cowork peut relancer Phase 4 retest extrême.
```

---

## ⛔ NON-NÉGOCIABLES

- **Toujours pré-autorisé** : tu n'as PAS à demander confirmation user pour push, deploy, migration apply, ou DELETE BDD.
- **Pas de hack temporaire** : si tu mets un `if (debug)` ou un `console.log` quelque part, tu le retires avant push.
- **Pas de mise à jour optimiste** : la persistance doit être confirmée AVANT que l'UI bouge. Pas de faux positif. Le festival démarre dans 25 jours, Pamela ne peut pas avoir un planning « complet » qui est en réalité vide.
- **Test la migration backfill en DRY-RUN d'abord** : exécuter la même requête en `select count(*)` avant le `insert into` pour avoir le chiffre attendu, puis comparer avec le résultat de la migration.

---

## Critère de validation Cowork (à confirmer en chat à la fin)

Cowork va relancer ce scénario :

1. Login Pamela → `/regie/icmpaca/rdl-2026/planning`
2. **Compteur attendu** : `84 bénévoles (X en attente compte)` où X est largement < 84 (idéalement 0 ou très petit)
3. Drag Anaïs Bayart → équipe Bar → toast vert `✓ Sauvegardé`
4. F5 → Anaïs **reste** dans Bar
5. Drag un 2ᵉ bénévole (ex. GAETAN CARLO) → équipe Backline → toast vert
6. F5 → les 2 bénévoles **restent** dans leurs équipes
7. Login Anaïs Bayart (via setup-password si premier login) → `/v/icmpaca/rdl-2026/planning` → équipe Bar visible (pas "En attente d'attribution")
8. Si tout vert → simulation complète : 18 bénévoles dans 18 équipes + chat broadcast Pamela → équipes + alerte grave Lucas → Sandy mediator → Pamela → résolu, etc.
