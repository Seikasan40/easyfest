# Bugs trouvés audit extrême — 2 mai 2026 (Cowork)

## BUG #1 — 🔴 BLOQUANT J-26 — onboardCurrentUser ne crée PAS la membership volunteer (RLS bloque)

- **Test** : T2 + T17 + investigation live signalée par user (cas Anaïs Bayart)
- **Sévérité** : 🔴 BLOQUANT — empêche TOUS les 79 bénévoles RDL2026 d'être placés sur le planning
- **URL** : `/hub` (déclenché à chaque login post magic-link)
- **Compte** : tous les volunteers (Anaïs Bayart `anaisbayart@outlook.fr` confirmé en live)
- **Reproduction** :
  1. Utilisateur Régie : valider une candidature (statut `validated`)
  2. Utilisateur Régie : cliquer 📧 Inviter → Supabase signInWithOtp envoie magic-link
  3. Bénévole : reçoit le mail, click le lien → arrive sur `/hub`
  4. `/hub` (page.tsx) appelle `await onboardCurrentUser()` au début
  5. `onboardCurrentUser` trouve l'application validée → tente d'INSERT `memberships {user_id, event_id, role: 'volunteer', is_active: true}`
  6. **RLS policy `memberships_insert_lead` rejette l'insert** car `has_role_at_least('volunteer_lead')` est false (le user est volunteer, pas lead)
  7. Erreur est swallow par `if (!memErr) upgraded++` (silencieux)
  8. Bénévole se retrouve sur `/hub` avec **AUCUNE membership** → "Tu n'as pas encore d'affectation active"
  9. Côté régie `/regie/.../planning` → bénévole apparaît comme pre-volunteer (badge ⏳, prefix `pre-`)
  10. DnD du bénévole → action retourne "Compte pas encore créé — invite ce bénévole d'abord" (alors qu'il a déjà été invité ET cliqué le lien !)
- **Évidence** :
  - JS DOM inspect (live) : 82/82 bénévoles ont badge `⏳` pending_account
  - Anaïs Bayart visible dans pool avec ⏳ alors qu'elle a cliqué son magic-link
  - Drag Anaïs → Bar → message "⏳ Compte pas encore créé"
  - Code `apps/vitrine/app/actions/onboard.ts` ligne 21 : `createServerClient()` (user-context)
  - Code `apps/vitrine/app/actions/onboard.ts` ligne 88 : `supabase.from("memberships").insert(...)` SANS service-role
  - Code `packages/db/supabase/migrations/20260430000007_rls_policies.sql` ligne 72-75 : seul volunteer_lead+ peut insérer
- **Root cause** : `onboardCurrentUser` utilise le client SSR user-context. La RLS `memberships_insert_lead` n'autorise que les volunteer_lead+ à insérer une membership. Un volunteer ne peut donc pas s'auto-créer sa membership lors de l'onboarding magic-link.
- **Fichiers à modifier** :
  - `apps/vitrine/app/actions/onboard.ts` (utiliser service client pour les inserts memberships ET propager les erreurs au retour)
  - `packages/db/supabase/migrations/20260503000001_rls_membership_self_volunteer.sql` (NOUVELLE migration : ajouter une policy `memberships_insert_self_volunteer` qui autorise un user à créer sa propre membership volunteer SI une volunteer_application validated correspond à son email)
- **Fix proposé** :

  Solution A (rapide, recommandée) — utiliser service client dans onboardCurrentUser :
  ```typescript
  // apps/vitrine/app/actions/onboard.ts
  import { createServerClient, createServiceClient } from "@/lib/supabase/server";

  export async function onboardCurrentUser() {
    const userClient = createServerClient();
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return { ok: false, error: "Non authentifié" };

    // SERVICE client pour bypass RLS sur les inserts (le user volunteer ne peut pas s'auto-créer sa membership)
    const admin = createServiceClient();

    // ... lookup applications via admin client ...
    // ... insert volunteer_profiles + memberships via admin client ...

    // SÉCURITÉ : on vérifie d'abord que l'application VALIDÉE existe pour cet email,
    // sinon n'importe quel user authentifié pourrait demander à se créer une membership.
    const { data: apps } = await admin
      .from("volunteer_applications")
      .select("...")
      .eq("email", userEmail)
      .eq("status", "validated");

    // Insert avec admin client (bypass RLS)
    if (!existingMembership) {
      const { error: memErr } = await admin.from("memberships").insert({...});
      if (memErr) {
        // FAIL FAST : remonter l'erreur au lieu de la swallow
        return { ok: false, error: `Membership creation failed: ${memErr.message}` };
      }
      upgraded++;
    }
  }
  ```

  Solution B (plus propre long-terme) — nouvelle RLS policy :
  ```sql
  -- 20260503000001_rls_membership_self_volunteer.sql
  create policy "memberships_insert_self_volunteer" on public.memberships
    for insert with check (
      user_id = auth.uid()
      and role = 'volunteer'
      and exists (
        select 1 from public.volunteer_applications va
        join auth.users au on au.email = va.email
        where va.event_id = memberships.event_id
          and va.status = 'validated'
          and au.id = auth.uid()
      )
    );
  ```

  **Recommandation** : appliquer A + B (defense in depth). A débloque immédiatement, B sécurise pour le futur.

- **FIX** (Claude Code · 3 mai 2026, après commit) :
  - **A appliqué** : `apps/vitrine/app/actions/onboard.ts` utilise `createServiceClient()` pour les inserts `volunteer_profiles` + `memberships` + `audit_log` et la lookup `volunteer_applications`. Erreur sur insert membership = retour `{ ok: false, error }` (fail-fast au lieu de swallow). Contrat de sécurité : on insère uniquement pour les `event_id` où une `volunteer_application` `status='validated'` existe avec l'email authentifié.
  - **B appliqué** : nouvelle migration `packages/db/supabase/migrations/20260503000001_rls_membership_self_volunteer.sql` ajoute la policy `memberships_insert_self_volunteer` (autorise `user_id = auth.uid() AND role = 'volunteer' AND is_active = true AND public.user_has_validated_application(event_id, auth.uid())`). La fonction `user_has_validated_application` est `security definer` pour éviter récursion RLS sur volunteer_applications et accès direct à `auth.users`.
  - Migration à appliquer en prod après push (via `supabase db push` ou auto-deploy).

- **Critère de validation après fix** :
  1. Login Régie, créer une candidature manuelle test mailinator, valider, inviter
  2. Click magic-link mail → arrive sur `/hub`
  3. Vérifier `/hub` affiche la carte "Je suis bénévole · ZIK PACA · Roots du Lac 2026" (et NON "Tu n'as pas encore d'affectation active")
  4. Login Pamela `/regie/.../planning` : le bénévole nouvellement onboardé doit apparaître **SANS badge ⏳** (pas pre-volunteer)
  5. Drag du bénévole vers une équipe → "✓ Sauvegardé" (pas "Compte pas encore créé")
  6. F5 refresh → bénévole reste dans la nouvelle équipe (persistence DB)

---

> **Note pour Claude Code** : ce bug bloque 79 bénévoles RDL2026 le 28-30 mai. Priorité absolue. À fixer EN PREMIER avant tous les autres.

**TODO** : autres bugs T2-T18 à compléter par session Cowork suivante (T1 finalize click pas testé, T2-T18 non testés car investigation bug live a pris la priorité).
