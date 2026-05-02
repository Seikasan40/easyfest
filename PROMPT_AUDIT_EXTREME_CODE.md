# PROMPT 2/2 — CLAUDE CODE (terminal + code + BDD)

> Ce prompt fait : nettoyage repo, fixes code, implémentations manquantes, tests Vitest, build verify, nettoyage BDD via SQL, commits/push consolidés. À lancer EN SECOND, après le PROMPT 1/2 Cowork qui a généré `BUGS_AUDIT_EXTREME.md` et `CLEANUP_DB_AUDIT.md` à la racine du repo.

---

## 🔴🔴🔴 BUG ABSOLUMENT BLOQUANT À FIXER EN PRIORITÉ #1 (avant tout le reste)

**`onboardCurrentUser` ne crée PAS la membership volunteer post-magic-link** (RLS bloque l'insert).

Confirmé en live : Anaïs Bayart a reçu son invite, cliqué le magic-link, mais reste pre-volunteer. Côté régie planning, **AUCUN bénévole n'est draggable** car les 82 sont tous "pre-volunteer" (badge ⏳). Cause : RLS `memberships_insert_lead` exige `volunteer_lead+` pour insert, mais `onboardCurrentUser` utilise `createServerClient` (user-context).

**Impact J-26 RDL2026** : 79 bénévoles validés ne pourront PAS être placés sur le planning. Pamela bloquée le jour de la démo.

**Fix obligatoire** :
1. **`apps/vitrine/app/actions/onboard.ts`** : remplacer `createServerClient()` par `createServiceClient()` pour les inserts `volunteer_profiles` + `memberships` (avec sécurité préalable : vérifier que l'application validée existe pour cet email avant d'insérer). Faire échouer FAST sur `memErr` au lieu de swallow silently.
2. **Nouvelle migration `packages/db/supabase/migrations/20260503000001_rls_membership_self_volunteer.sql`** :
   ```sql
   create policy "memberships_insert_self_volunteer" on public.memberships
     for insert with check (
       user_id = auth.uid()
       and role = 'volunteer'
       and exists (
         select 1 from public.volunteer_applications va
         join auth.users au on lower(au.email) = lower(va.email)
         where va.event_id = memberships.event_id
           and va.status = 'validated'
           and au.id = auth.uid()
       )
     );
   ```
3. Defense-in-depth : appliquer les 2 fixes (service client + RLS policy) ensemble.

**Critère de validation après fix** : créer une candidature manuelle mailinator → valider → inviter → click magic-link → /hub doit afficher la carte volunteer (pas "Pas encore d'affectation") + côté régie planning, le bénévole doit apparaître SANS badge ⏳ et drag → "✓ Sauvegardé" avec persistence F5.

Détails complets dans `BUGS_AUDIT_EXTREME.md` à la racine.

---

## 📋 Notes user (à respecter strictement)

### Workflow d'orchestration
1. Phase 1 (nettoyage repo) : tu fais en autonomie
2. Phase 2 (impl manquantes) : tu fais en autonomie (force-set-password, QR SVG, templates Auth)
3. **Phase 3 (fixes bugs Cowork) : me relancer pour traiter les bugs trouvés** dans `BUGS_AUDIT_EXTREME.md` (le user veut me relancer après que j'aie fini Phases 1+2 pour traiter les bugs un par un avec validation)
4. Phase 4 (tests Vitest + build) : tu fais en autonomie
5. **Phase 5 (nettoyage BDD) : poser `.env.deploy.local` à la racine du repo, puis me relancer (DRY-RUN counts d'abord, puis demander validation explicite user avant DELETE prod)**

### Bugs pré-existants hors scope (NE PAS toucher)
- `pnpm test` (turbo) fail "no test files" — config root utilise un glob relatif au cwd des sous-packages. Tests passent avec `--root` depuis racine. **Hors scope, non régressé**.
- Modifs non-committed déjà présentes dans le worktree (préexistantes, **pas mon scope ni le tien**) :
  - `package.json`
  - `packages/db/supabase/config.toml` (re-encoding LF/CRLF)
  - `apps/vitrine/tsconfig.json`
  - `marketing/` (générée par Cowork)
  - `pnpm-lock.yaml`

### Vérifications limitées
- Skip vérification preview (pas de dev server). Build prod passant + types OK suffit.
- Test interactif `/account/setup-password` nécessiterait session Supabase live → skip, à valider post-deploy par re-pass Cowork.

---

## Tu es Claude Code

Tu es lancé dans un terminal ouvert dans `E:\Easy_Fest\Easy_Fest\easyfest`. Mission : finaliser l'audit J-26 RDL2026 en faisant TOUT ce que Cowork ne peut pas faire optimalement (tooling code, DB, repo cleanup), basé sur les bugs trouvés par Cowork.

## Context déjà appliqué (rien à demander à l'humain)

- **Repo** : `E:\Easy_Fest\Easy_Fest\easyfest` branch `main` au commit `02fea9c` (audit final 10/10 docs)
- **Vercel** `easyfest.app` : `SUPABASE_SERVICE_ROLE_KEY = sb_secret_xOLCr…` déjà set + redeploy fait
- **Supabase** projet `wsmehckdgnpbzwjvotro` (compte `easyfest@outlook.fr`)
- **7 Edge Functions** : qr_sign, qr_verify, trigger_safer_alert, send_validation_mail, ban_validator, rgpd_purge, rgpd_hard_delete — toutes ACTIVE v1
- **Secrets disponibles dans `.env.deploy.local`** (gitignored) :
  - `QR_HMAC_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, `SUPABASE_ACCESS_TOKEN` (token CLI valide jusqu'au 1er juin 2026)
- **Tags git de safety** : `backup-before-edge-fns-J26`, `audit-extreme-validated`
- **Inputs utilisateur déjà fournis dans les fichiers** :
  - `BUGS_AUDIT_EXTREME.md` (généré par Cowork) → liste des bugs à fixer
  - `CLEANUP_DB_AUDIT.md` (généré par Cowork) → patterns BDD à nettoyer

## Règle d'or

**ZÉRO interaction user pendant l'exécution.** Tout ce que tu fais est pré-autorisé par ce prompt. Si tu rencontres un problème, débogue-le toi-même via `--debug`, lecture de logs Supabase, ou rollback via tag git. Communique seulement à la fin avec un récap.

---

# PHASE 0 — BACKUP SAFE NET (1 min)

```bash
# Tag git horodaté
git tag backup-pre-extreme-code-$(date +%Y%m%d-%H%M)
git push origin --tags

# Zip complet (sans node_modules/.next/.turbo)
mkdir -p ../_backups
git archive --format=zip -o "../_backups/easyfest_pre_extreme_code_$(date +%Y%m%d-%H%M).zip" HEAD
```

Si erreur : STOP et alerte le user. Sinon, continue.

---

# PHASE 1 — NETTOYAGE REPO (10 min)

## Liste des fichiers à SUPPRIMER (à la racine)

Scripts hotfix one-shot (fait leur job, plus utiles) :
```
BACKUP_BEFORE_EDGE_FNS_J26.ps1
COMMIT_TURNSTILE_SENTRY.ps1
HOTFIX_DND_FINAL.ps1
HOTFIX_PLANNING_POOL.ps1
HOTFIX_REGIE_LOGIN.ps1
HOTFIX_TURNSTILE_LEGACY.ps1
AUDIT_J-26_PUSH_FIXES.ps1
DEPLOY_EDGE_FUNCTIONS_J26.ps1
RUN_DEPLOY_J26.ps1
SETUP_AND_DEPLOY_EDGE_FNS_J26.ps1
PUSH_AUDIT_FINAL_10_10.ps1
```

Markdown one-shot (handoff + prompts new chat) :
```
PROMPT_NEW_CHAT.md
PROMPT_CLAUDE_CODE_FINISH_J26.md
COMMANDES_PUSH_INITIAL.md
HANDOFF_TOKENS_REQUIS.md
```

⚠️ **GARDE** :
- `PROMPT_AUDIT_EXTREME_COWORK.md` et `PROMPT_AUDIT_EXTREME_CODE.md` (ces 2 prompts, réutilisables pour audits futurs)
- `AUDIT_J-26_RDL2026.md` (rapport principal, à déplacer dans `docs/audits/`)
- `BUGS_AUDIT_EXTREME.md` (à archiver après fix)
- `CLEANUP_DB_AUDIT.md` (à archiver après cleanup)
- `.env.deploy.local` (gitignored, garde pour réutilisation, mais SUPPRIME-LE après push final pour propreté disque user — facultatif)
- `.env.example` (référence env vars)

## Liste des fichiers à DÉPLACER

Documents qui doivent vivre dans `docs/audits/historiques/` :
```
Audit_Easy_Fest_Complet.md
Audit_F1_F6_Rigoureux.md
Audit_Complet_Demo_Mobile_Desktop.md
Audit_Env_Example_BuildCaptain.md
AUDIT_PAM_FEEDBACK_2MAI2026.md
AUDIT_P3_ARCHITECTURE.md
AUDIT_SPRINT_2MAI2026_VITEST_CHROME.md
Hermes_Note_29avril_J-5.md
```

Documents qui doivent vivre dans `docs/bilans/` :
```
BILAN_J0.md
BILAN_J1.md
BILAN_J2.md
BILAN_J3_DEPLOY.md
BILAN_J3_FINAL.md
```

Migrations one-shot Pam à archiver dans `docs/migrations-historiques/` :
```
IMPORT_PAM_INSCRITS.sql
IMPORT_PAM_PREFERENCES.sql
MIGRATIONS_J3_FIX_PAM.sql
MIGRATIONS_J3_PHASE2.sql
MIGRATIONS_J3_PHASE3.sql
MIGRATIONS_TO_PASTE.sql
```

PDFs et data RDL à laisser à la racine (Pamela en a besoin facilement) :
```
PLANNING ATELIERS ANIMATIONS.pdf
PLANNING BACKLINE.pdf
PLANNING BAR.pdf
PLANNING BRIGADE VERTE.pdf
Charte par thème .pdf
Charte_Festivaliers_Astropolis_copie.pdf
Formulaire de candidature RDL (réponses) .pdf
Easyfest_Identite_Visuelle_pour_Pamela.pdf
```

## Commandes (en bash via terminal Claude Code)

```bash
# Crée les dossiers de destination
mkdir -p docs/audits/historiques docs/bilans docs/migrations-historiques

# Supprime les scripts hotfix
rm -f \
  BACKUP_BEFORE_EDGE_FNS_J26.ps1 \
  COMMIT_TURNSTILE_SENTRY.ps1 \
  HOTFIX_DND_FINAL.ps1 \
  HOTFIX_PLANNING_POOL.ps1 \
  HOTFIX_REGIE_LOGIN.ps1 \
  HOTFIX_TURNSTILE_LEGACY.ps1 \
  AUDIT_J-26_PUSH_FIXES.ps1 \
  DEPLOY_EDGE_FUNCTIONS_J26.ps1 \
  RUN_DEPLOY_J26.ps1 \
  SETUP_AND_DEPLOY_EDGE_FNS_J26.ps1 \
  PUSH_AUDIT_FINAL_10_10.ps1 \
  PROMPT_NEW_CHAT.md \
  PROMPT_CLAUDE_CODE_FINISH_J26.md \
  COMMANDES_PUSH_INITIAL.md \
  HANDOFF_TOKENS_REQUIS.md

# Déplace audits historiques
git mv Audit_Easy_Fest_Complet.md docs/audits/historiques/ 2>/dev/null
git mv Audit_F1_F6_Rigoureux.md docs/audits/historiques/ 2>/dev/null
git mv Audit_Complet_Demo_Mobile_Desktop.md docs/audits/historiques/ 2>/dev/null
git mv Audit_Env_Example_BuildCaptain.md docs/audits/historiques/ 2>/dev/null
git mv AUDIT_PAM_FEEDBACK_2MAI2026.md docs/audits/historiques/ 2>/dev/null
git mv AUDIT_P3_ARCHITECTURE.md docs/audits/historiques/ 2>/dev/null
git mv AUDIT_SPRINT_2MAI2026_VITEST_CHROME.md docs/audits/historiques/ 2>/dev/null
git mv Hermes_Note_29avril_J-5.md docs/audits/historiques/ 2>/dev/null

# Déplace bilans
git mv BILAN_J0.md docs/bilans/ 2>/dev/null
git mv BILAN_J1.md docs/bilans/ 2>/dev/null
git mv BILAN_J2.md docs/bilans/ 2>/dev/null
git mv BILAN_J3_DEPLOY.md docs/bilans/ 2>/dev/null
git mv BILAN_J3_FINAL.md docs/bilans/ 2>/dev/null

# Déplace migrations historiques
git mv IMPORT_PAM_INSCRITS.sql docs/migrations-historiques/ 2>/dev/null
git mv IMPORT_PAM_PREFERENCES.sql docs/migrations-historiques/ 2>/dev/null
git mv MIGRATIONS_J3_FIX_PAM.sql docs/migrations-historiques/ 2>/dev/null
git mv MIGRATIONS_J3_PHASE2.sql docs/migrations-historiques/ 2>/dev/null
git mv MIGRATIONS_J3_PHASE3.sql docs/migrations-historiques/ 2>/dev/null
git mv MIGRATIONS_TO_PASTE.sql docs/migrations-historiques/ 2>/dev/null

# Déplace audit principal
mkdir -p docs/audits
git mv AUDIT_J-26_RDL2026.md docs/audits/ 2>/dev/null

# Vérifier état git
git status
```

---

# PHASE 2 — IMPLÉMENTATIONS PROACTIVES (anticipées avant lecture des bugs Cowork)

Ces 3 chantiers sont mentionnés comme manquants dans le contexte du projet. Implémente-les sans attendre :

## A. Force-set-password page + middleware

Crée `apps/vitrine/app/account/setup-password/page.tsx` :
- Form avec 2 inputs (mot de passe + confirmation)
- Validation min 12 chars, complexité Zod schema
- Server action qui appelle `supabase.auth.updateUser({ password, data: { password_set: true } })`
- Redirect `/hub` après succès

Modifie `apps/vitrine/middleware.ts` (ou crée si manquant) :
- Si user authentifié AND `user.user_metadata.password_set !== true` AND pathname !== `/account/setup-password` AND pathname !== `/auth/logout` :
  - redirect `/account/setup-password`

Vérifie que magic-link login marque bien `password_set = false` à la création (ou laisse undefined → middleware redirige).

## B. QR SVG rendering fix

Cowork peut avoir reporté "carré blanc" sur `/v/qr`. Le composant probablement à fix : `apps/vitrine/app/v/[orgSlug]/[eventSlug]/qr/...`

Lit le code, identifie comment le SVG est rendu (probablement via `qrcode.react` ou similaire), corrige l'absence de `value` ou `size` ou `bgColor`.

Test local via Vitest snapshot ou Playwright si possible.

## C. Templates Supabase Auth dashboard

Les 4 templates HTML existent dans `apps/vitrine/templates/email/*.html` :
- `confirm-signup.html`
- `magic-link.html`
- `recovery.html`
- `application-validated.html`

Tu ne peux pas changer les templates Supabase Auth dashboard via CLI directement (c'est une UI dashboard only en 2026). MAIS tu peux :
- Vérifier que les fichiers HTML sont à jour et brandés
- Documenter dans `docs/SETUP_EMAIL_TEMPLATES.md` le pas-à-pas exact à faire (déjà existant, vérifier qu'il est complet)
- Si possible, utiliser Supabase Management API pour update les templates programmatically (endpoint `PATCH /v1/projects/{ref}/config/auth`) — vérifie la doc Supabase 2026 récente.

Si tu peux les pousser via API : utilise le `SUPABASE_ACCESS_TOKEN` du `.env.deploy.local`.

---

# PHASE 3 — FIX BUGS REPORTÉS PAR COWORK

Lis `BUGS_AUDIT_EXTREME.md` à la racine.

Pour CHAQUE bug 🔴 ou 🟡 :
1. Lis le fichier concerné (`apps/vitrine/...`)
2. Comprends la root cause à partir de l'évidence Cowork
3. Applique le fix
4. Si possible, ajoute un test Vitest qui couvre le cas
5. Note le fix dans `BUGS_AUDIT_EXTREME.md` en ajoutant au bug : `**FIX** : commit hash + description courte`

Bugs 🟢 mineurs : note-les dans un fichier `docs/POST_RDL_TODO.md` pour traitement après le festival.

---

# PHASE 4 — TESTS VITEST + BUILD VERIFY

```bash
# Tests RLS cross-tenant (21 cases)
pnpm exec vitest run apps/vitrine/lib/supabase/rls.test.ts 2>&1 | tail -20

# Tests schemas
pnpm exec vitest run packages/shared/src/schemas 2>&1 | tail -20

# Build production
pnpm build 2>&1 | tail -50
```

Si build fail : `pnpm build --debug` pour voir l'erreur précise. Fix.

Si Vitest fail : analyse pourquoi. Si c'est un faux-positif lié au cleanup, mets à jour le test. Si c'est un vrai régression, fix le code.

---

# PHASE 5 — NETTOYAGE BDD POST-AUDIT

Lis `CLEANUP_DB_AUDIT.md` à la racine.

Connecte-toi à Supabase via le `SUPABASE_ACCESS_TOKEN` du `.env.deploy.local` :

```bash
export SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env.deploy.local | cut -d= -f2 | tr -d '"')
```

Génère un script SQL `_cleanup_audit_traces.sql` qui :

```sql
-- DRY RUN d'abord : on COUNT avant DELETE pour validation manuelle
BEGIN;
SELECT 'organizations' AS table_name, count(*) FROM organizations WHERE slug LIKE 'audit-%' OR slug LIKE 'audit10-%';
SELECT 'volunteer_applications' AS table_name, count(*) FROM volunteer_applications WHERE email LIKE 'easyfest-extreme-%@mailinator.com' OR email LIKE 'easyfest-audit-%@mailinator.com';
SELECT 'safer_alerts' AS table_name, count(*) FROM safer_alerts WHERE description ILIKE '%test e2e audit%' OR description ILIKE '%audit fictive%';
SELECT 'sponsors' AS table_name, count(*) FROM sponsors WHERE name ILIKE '%audit%';
SELECT 'pending_festival_requests' AS table_name, count(*) FROM pending_festival_requests WHERE org_slug LIKE 'audit-%' OR email LIKE 'easyfest-extreme-%';
SELECT 'broadcast_messages' AS table_name, count(*) FROM broadcast_messages WHERE content ILIKE '%test e2e audit%' OR content ILIKE '%audit extreme%';
ROLLBACK;
```

Affiche le résultat au user dans le récap final. Le user reverra et toi tu enchaînes :

```sql
-- DELETE réel
BEGIN;

-- Cascade : delete organizations (FK cascade vers events, memberships, applications via ON DELETE CASCADE — vérifier)
DELETE FROM organizations WHERE slug LIKE 'audit-%' OR slug LIKE 'audit10-%';

-- Applications mailinator orphelines
DELETE FROM volunteer_applications WHERE email LIKE 'easyfest-extreme-%@mailinator.com' OR email LIKE 'easyfest-audit-%@mailinator.com';

-- Safer alerts test
DELETE FROM safer_alerts WHERE description ILIKE '%test e2e audit%' OR description ILIKE '%audit fictive%';

-- Sponsors test
DELETE FROM sponsors WHERE name ILIKE '%audit%';

-- Pending requests
DELETE FROM pending_festival_requests WHERE org_slug LIKE 'audit-%' OR email LIKE 'easyfest-extreme-%';

-- Broadcasts
DELETE FROM broadcast_messages WHERE content ILIKE '%test e2e audit%' OR content ILIKE '%audit extreme%';

-- Auth users orphelins (mailinator) — via supabase admin
-- À faire en pgAdmin OR via Supabase Management API delete user

COMMIT;
```

Exécute via Supabase Management API ou directement via pgAdmin. Pour les auth.users orphelins, utilise le SDK admin :

```typescript
// scripts/cleanup_auth_users.ts
import { createClient } from '@supabase/supabase-js';
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const { data: { users } } = await admin.auth.admin.listUsers();
const toDelete = users.filter(u => u.email?.includes('@mailinator.com') && u.email.includes('audit'));
for (const u of toDelete) {
  await admin.auth.admin.deleteUser(u.id);
}
```

Lance le script. Vérifie que la BDD est propre.

---

# PHASE 6 — COMMIT FINAL CONSOLIDÉ + PUSH

```bash
# Vérifier l'état git
git status

# Add tous les changements
git add -A

# Commit message structuré
cat > /tmp/commit_msg.txt <<'EOF'
chore(audit-extreme): cleanup repo + impl manquantes + fixes bugs + DB clean

Phase 1 - Nettoyage repo :
- Suppression 11 scripts PowerShell hotfix one-shot (deja executes)
- Suppression 4 markdown handoff one-shot
- Deplacement audits historiques -> docs/audits/historiques/
- Deplacement bilans -> docs/bilans/
- Deplacement migrations Pam -> docs/migrations-historiques/
- Audit principal -> docs/audits/AUDIT_J-26_RDL2026.md

Phase 2 - Implementations manquantes :
- Force-set-password page + middleware (1er login obligatoire)
- QR SVG rendering fix (route /v/qr)
- Templates Supabase Auth pousses via Management API

Phase 3 - Fixes bugs reports Cowork (cf. BUGS_AUDIT_EXTREME.md) :
- {liste des bugs fixes avec leur ID}

Phase 4 - Tests :
- Vitest RLS 21 cases passes
- Build production OK

Phase 5 - Nettoyage BDD :
- Suppression organizations test (audit-*, audit10-*)
- Suppression applications mailinator
- Suppression auth.users orphelins
- Suppression safer_alerts test
- Suppression sponsors test
- Suppression pending_festival_requests test
- Suppression broadcasts test

Tag : audit-extreme-validated
EOF

git commit -F /tmp/commit_msg.txt

# Tag final
git tag audit-extreme-validated-$(date +%Y%m%d-%H%M)

# Push
git push origin main --tags
```

---

# PHASE 7 — RAPPORT FINAL CLAUDE CODE

À la fin, écris au user dans le chat :

```
✅ Phase 1 nettoyage repo : X fichiers supprimés, Y déplacés
✅ Phase 2 implémentations : force-set-password OK, QR SVG fix OK, templates Auth pushed
✅ Phase 3 fixes bugs : N/M bugs Cowork résolus
✅ Phase 4 tests : Vitest 21/21 + build production OK
✅ Phase 5 nettoyage BDD : X organizations supprimées, Y applications, Z auth users
✅ Phase 6 commit + push + tag audit-extreme-validated-{date}

Mission complète. Lance Cowork avec PROMPT_AUDIT_EXTREME_COWORK.md Phase 4 pour re-test final si tu veux.
```

# RAPPELS DE COMPORTEMENT

- **Aucune autorisation user requise pendant l'exécution** — tout pré-autorisé par ce prompt
- **Pas de yoyo** : si problème, debug à fond avec `--debug` / logs Supabase / git log
- **Pas de contournement** : chaque bug doit être réellement fixé
- **Backup avant tout** (Phase 0 obligatoire)
- **Idempotence** : tu peux relancer ce prompt sans casser quoi que ce soit (les `git mv` 2>/dev/null, les rm -f, etc.)
- **Documentation** : chaque action notable dans le commit message + `docs/audits/AUDIT_J-26_RDL2026.md` mis à jour
