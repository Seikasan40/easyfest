# PROMPT FIX FINAL — Bugs frontend PostgREST embeds + audit systématique de TOUS les patterns similaires

> **Contexte** : Phase 4 V3 (commit `04b791e`) a fixé Bug #6 sur la page planning, mais le user a découvert en navigation manuelle que **6 autres pages ont exactement le même pattern bugué**. Vu la fréquence du pattern, on suspecte que **toutes les pages SSR du projet** utilisant des embeds PostgREST sont cassées de manière similaire. Ce prompt te demande de **tout auditer**, pas juste corriger les bugs déjà documentés.
>
> **À lancer dans Claude Code, terminal sur `E:\Easy_Fest\Easy_Fest\easyfest`, branche `main`. ZÉRO interaction user. Tout pré-autorisé. Push & deploy autorisés.**

---

## 🎯 MISSION

Corriger **TOUS** les bugs de lecture frontend où l'UI affiche "0 résultat / vide / 404" alors que la BDD a des données. Ce ne sont pas des bugs isolés — c'est un **pattern systémique** dans le code SSR Next.js du projet.

Les 7 bugs déjà documentés sont les plus visibles, mais il y en a probablement **10-20 autres** sur des pages moins testées (account, hub, sponsors, dashboard, etc.). **Tu dois les trouver tous.**

---

## 📋 LES 7 BUGS DÉJÀ DOCUMENTÉS (point de départ)

Tous documentés dans `BUGS_AUDIT_EXTREME.md` section "BUGS USER LIVE NAV — 3 mai 2026 ~13h30 UTC".

### Bug #7 — Pack préfecture 404
- **Fichier** : `apps/vitrine/app/regie/[orgSlug]/[eventSlug]/prefecture/page.tsx` ligne 35
- **Cause** : `events.select("...location_name, location...")` — `location_name` n'existe pas dans `events` (vraies colonnes : `id, organization_id, name, slug, description, starts_at, ends_at, location, geo_lat, geo_lng, timezone, status, registration_open_at, registration_close_at, max_preferred_positions, itinerary_enabled, wellbeing_enabled, safer_alerts_enabled, manual_signup_enabled, cover_image_url, created_at, updated_at, site_plan_url, site_plan_dark_url, site_plan_caption`)
- **Fix** : retirer `location_name,` de la query

### Bug #8 — Messages historique vide
- **Fichier** : `apps/vitrine/app/regie/[orgSlug]/[eventSlug]/messages/page.tsx` ligne 25
- **Cause** : `sender:sender_user_id (raw_user_meta_data)` embed sur `auth.users` (non exposée à PostgREST par défaut, FK inexistante côté API)
- **État BDD** : `messages` a 3 broadcasts persistés ("Salut à tous" + Bar + Parking) — vérifié SQL
- **Fix** : split queries — fetch `messages` puis `volunteer_profiles WHERE user_id IN [...senders]` séparément, merge JS-side

### Bug #9 — /regie/safer "Aucune alerte" malgré 1 alerte open
- **Fichier** : `apps/vitrine/app/regie/[orgSlug]/[eventSlug]/safer/page.tsx` lignes 24, 34
- **Cause** : `reporter:reporter_user_id (raw_user_meta_data)` même pattern que Bug #8
- **État BDD** : 1 alerte status='open' + 2 status='resolved' pour event RDL2026
- **Fix** : split queries comme Bug #8

### Bug #10 — Theme Forest Green pas appliqué visuellement
- **Fichier** : layout root + theme provider (à identifier)
- **État BDD** : `organization_themes.preset_slug = 'forest-green'`, `applied_at = 13:27:41` ✅
- **Cause hypothèse** : la query `organization_themes_public` côté layout root échoue, OU les CSS variables `--theme-primary` ne sont pas injectées au render
- **Fix** : trouver le composant qui lit le theme, vérifier la query, vérifier que le `<style>` ou `style={{...}}` est bien rendu

### Bug #11 — Camping affiche `—` au lieu du nom
- **Fichier** : `apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/page.tsx` ligne 109 + composant card
- **Cause** : `m.profile?.full_name ?? "—"` sans fallback `email`
- **Fix** : `coalesce(full_name, first_name + " " + last_name, email, "—")`

### Bug #12 — Onglets pas visibles sur mobile
- **Fichier** : composant `RegieEventLayout` ou nav header (à identifier)
- **Cause** : nav horizontale dépasse 412px mobile sans `overflow-x-auto`
- **Fix** : ajouter `overflow-x-auto scrollbar-hide` sur le conteneur de nav, vérifier les autres pages (poste, /v/...)

### Bug #13 — "Mon poste" Mahaut affiche 0 bénévoles + 0 shifts
- **Fichier** : `apps/vitrine/app/poste/[orgSlug]/[eventSlug]/page.tsx`
- **Triple cause** :
  1. Ligne 75-78 : `profiles:user_id (id, first_name, last_name, full_name, email, phone, avatar_url)` embed sans FK directe entre `memberships` et `volunteer_profiles`
  2. Ligne 85 : `shifts.select("id, starts_at, ends_at, needs_count, label")` — colonne `label` n'existe pas (vraies : `id, position_id, starts_at, ends_at, needs_count, meal_included, notes, created_at`)
  3. Logique : ne lit QUE `memberships.position_id`, ignore les volunteers via `assignments.shift_id` (Anaïs + Sandy invisibles alors qu'assignées sur Bar)
- **Fix** :
  1. Split queries (memberships + volunteer_profiles séparé)
  2. Remplacer `label` par `notes`
  3. UNION : volunteers via `memberships.position_id = X` UNION volunteers via `assignments` JOIN shifts WHERE position_id = X

---

## 🔬 AUDIT SYSTÉMATIQUE — TROUVER TOUS LES BUGS SIMILAIRES

> Le user veut explicitement que tu **vérifies absolument chacun de ces genres de problèmes possibles**. Ne te contente pas des 7 bugs documentés.

### ÉTAPE A — Audit des embeds PostgREST cassés (~30 min)

**Pattern à rechercher** : tous les `parent:foreign_key (...)` dans les queries Supabase JS.

```bash
cd E:\Easy_Fest\Easy_Fest\easyfest

# Trouver TOUS les embeds PostgREST dans les pages SSR + components
grep -rn ":\w\+_id\s*(\|:\w\+_user_id\s*(\|!fkey\|!_fkey" apps/vitrine/app/ packages/ --include="*.tsx" --include="*.ts" 2>&1 | tee /tmp/embeds_audit.txt
```

**Pour chaque embed trouvé, vérifier** :
1. La FK PostgREST existe-t-elle réellement entre les 2 tables ? Vérifier via :
   ```bash
   curl -sS -X POST "https://api.supabase.com/v1/projects/wsmehckdgnpbzwjvotro/database/query" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"query": "select tc.table_name, kcu.column_name, ccu.table_name as foreign_table from information_schema.table_constraints tc join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name where tc.constraint_type = '\''FOREIGN KEY'\'' and tc.table_schema = '\''public'\'' order by table_name;"}'
   ```
2. La FK pointe-t-elle vers une table accessible à PostgREST ? `auth.users` n'est PAS accessible par défaut — tout embed sur `auth.users` est cassé.
3. La syntaxe est-elle `:id (...)` ou `!_fkey (...)` ? Le `!_fkey` explicite est nécessaire si plusieurs FK existent entre les 2 tables.

**Liste à dresser** :

```
FILE | LINE | EMBED | TARGET TABLE | STATUS
apps/vitrine/.../messages/page.tsx | 25 | sender:sender_user_id | auth.users | ❌ CASSÉ
apps/vitrine/.../safer/page.tsx | 24 | reporter:reporter_user_id | auth.users | ❌ CASSÉ
apps/vitrine/.../poste/.../page.tsx | 76 | profiles:user_id | volunteer_profiles | ❌ CASSÉ (no direct FK)
... (etc, à compléter exhaustivement)
```

**Pour chaque ❌ CASSÉ, appliquer le fix** : split en 2 queries séparées + merge côté JS via `Map<id, profile>`.

### ÉTAPE B — Audit des colonnes inexistantes dans les SELECT (~15 min)

**Pattern à rechercher** : tous les `.select("col1, col2, col3")` qui demandent des colonnes peut-être absentes.

```bash
# Lister toutes les queries .from("table") .select("...")
grep -rEn "\.from\(\"(\w+)\"\)" apps/vitrine/app/ apps/vitrine/components/ apps/vitrine/lib/ --include="*.tsx" --include="*.ts" | tee /tmp/from_tables.txt

# Pour chaque table identifée, comparer les colonnes demandées vs schema réel
```

**Tables et leurs colonnes réelles (récupérées via SQL Management API)** :

| Table | Colonnes |
|---|---|
| `events` | `id, organization_id, name, slug, description, starts_at, ends_at, location, geo_lat, geo_lng, timezone, status, registration_open_at, registration_close_at, max_preferred_positions, itinerary_enabled, wellbeing_enabled, safer_alerts_enabled, manual_signup_enabled, cover_image_url, created_at, updated_at, site_plan_url, site_plan_dark_url, site_plan_caption` |
| `positions` | `id, event_id, name, slug, description, color, icon, responsible_user_id, geo_zone, display_order, needs_count_default, is_active, created_at, updated_at` |
| `memberships` | `id, user_id, event_id, role, position_id, is_entry_scanner, is_mediator, is_active, invited_at, invited_by, accepted_at, notes_admin, created_at` |
| `shifts` | `id, position_id, starts_at, ends_at, needs_count, meal_included, notes, created_at` (PAS de `label` !) |
| `assignments` | `id, shift_id, volunteer_user_id, status, refusal_reason, rating, rating_comment, assigned_by, validated_by_volunteer_at, refused_by_volunteer_at, created_at, updated_at` |
| `messages` | `id, channel_id, sender_user_id, content, is_broadcast, is_muted, muted_by, muted_at, created_at` (PAS de `event_id` direct !) |
| `message_channels` | `id, event_id, kind, name, position_id, participant_user_ids, color, is_archived, created_at` |
| `safer_alerts` | `id, event_id, reporter_user_id, kind, description, location_hint, geo_lat, geo_lng, status, acknowledged_by, acknowledged_at, resolved_by, resolved_at, resolution_notes, mediator_user_id, notified_user_ids, created_at` |
| `organization_themes` | `id, organization_id, preset_slug, primary_color, accent_color, surface_color, text_color, custom_logo_url, custom_font, is_premium, applied_at, created_at, updated_at` |
| `volunteer_profiles` | (à fetcher via le même endpoint — typiquement `user_id, full_name, first_name, last_name, email, phone, avatar_url, is_returning, ...`) |
| `volunteer_applications` | (à fetcher) |
| `sponsors` | (à fetcher) |
| `wellbeing_reports` | (à fetcher) |

**Pour chaque query qui demande une colonne inexistante** : retirer la colonne ou créer une migration pour l'ajouter (selon ce qui a du sens pour la feature).

### ÉTAPE C — Audit des erreurs silencieuses (~10 min)

**Pattern à rechercher** : queries Supabase qui ne destructurent PAS `error` du retour.

```bash
# Trouver les queries sans error handling
grep -rEn "const \{ data:" apps/vitrine/app/ apps/vitrine/components/ apps/vitrine/lib/ --include="*.tsx" --include="*.ts" | grep -v "error" | tee /tmp/no_error_handling.txt
```

**Pour chaque query sans `error`** : ajouter `if (error) console.error("[Page X] error:", error);` au minimum, ou propager l'erreur au user via toast / notFound() / 500.

### ÉTAPE D — Audit des FK manquantes côté schema (~10 min)

```sql
-- Lister tous les FK existantes en BDD
select
  tc.table_name as src,
  kcu.column_name as src_col,
  ccu.table_name as dst,
  ccu.column_name as dst_col,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;
```

Lister toutes les FK existantes. Cross-référencer avec les embeds utilisés dans le code. Toute embed qui pointe vers une FK absente est buggé.

### ÉTAPE E — Audit des vues volunteer / public (~15 min)

Pages à tester systématiquement (au-delà des 7 documentées) :

| URL | Compte test | Critère attendu |
|---|---|---|
| `/hub` | tous | cartes correspondant aux memberships actives |
| `/v/icmpaca/rdl-2026` | Lucas (volunteer Bar) | nom + équipe + shifts |
| `/v/icmpaca/rdl-2026/qr` | Lucas | SVG QR visible |
| `/v/icmpaca/rdl-2026/planning` | Lucas | shifts assignés à Lucas |
| `/v/icmpaca/rdl-2026/wellbeing` | Lucas | 3 niveaux, dernière mise à jour |
| `/v/icmpaca/rdl-2026/feed` | Lucas | broadcasts reçus pour Bar + Annonces |
| `/v/icmpaca/rdl-2026/safer` | Sandy mediator | alertes ouvertes + assignées |
| `/regie/icmpaca/rdl-2026` | Pamela | KPI cohérents avec BDD |
| `/regie/icmpaca/rdl-2026/dashboard` | Pamela | counters dashboard cohérents |
| `/regie/icmpaca/rdl-2026/applications` | Pamela | 87 candidatures |
| `/regie/icmpaca/rdl-2026/planning` | Pamela | bénévoles + équipes peuplées |
| `/regie/icmpaca/rdl-2026/sponsors` | Pamela | sponsors enregistrés |
| `/regie/icmpaca/rdl-2026/plan` | Pamela | plan upload + visualisation |
| `/regie/icmpaca/rdl-2026/safer` | Pamela | **doit afficher les alertes ouvertes** |
| `/regie/icmpaca/rdl-2026/messages` | Pamela | **historique des broadcasts** |
| `/regie/icmpaca/rdl-2026/prefecture` | Pamela | **doit charger sans 404** + ZIP download |
| `/regie/icmpaca/rdl-2026/settings/theme` | Pamela | **theme appliqué visuellement après select** |
| `/poste/icmpaca/rdl-2026` | Mahaut | **équipe Bar + shifts** |
| `/account/privacy` | Lucas | export JSON + warning suppression |
| `/account/setup-password` | tous | accepter même password (Bug #3) |
| `/auth/callback` | new user | session créée + redirect /hub (Bug #2) |

Pour chaque page, comparer ce que la BDD contient vs ce que l'UI affiche. Toute incohérence = bug à fixer.

### ÉTAPE F — Audit du theme provider (~10 min)

Trouver le composant qui injecte le theme :

```bash
grep -rn "organization_themes\|preset_slug\|--theme-primary\|theme-coral\|theme-forest" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" --include="*.ts" | tee /tmp/theme_audit.txt
```

Vérifier :
- Que la query lit bien `organization_themes` filtré par `organization_id` du tenant courant (pas event_id)
- Que les CSS variables (`--theme-primary`, `--theme-accent`, `--theme-surface`, `--theme-text`) sont bien injectées via `<style>` ou `style={...}` dans le layout root **par tenant**
- Que le cache Next.js (revalidate) ne sert pas une version stale après un changement de theme
- Que l'organization actuelle est bien identifiée via `orgSlug` du URL (pas via auth.uid() qui pourrait pointer vers une autre org)

Si ce dernier est en cause : modifier le ThemeProvider pour lire dynamiquement par tenant.

### ÉTAPE G — Audit mobile responsive (~10 min)

Pages à tester en mobile (412×915) :

```bash
grep -rEn "overflow-x|scrollbar|md:\|lg:|sm:hidden|md:hidden" apps/vitrine/app/regie/ apps/vitrine/app/v/ apps/vitrine/app/poste/ --include="*.tsx" | head -50
```

Pour chaque conteneur de nav horizontal, vérifier `overflow-x-auto` + `scrollbar-hide`. Pour chaque grille `grid-cols-X`, vérifier breakpoint mobile en `grid-cols-1 md:grid-cols-X`.

### ÉTAPE H — Cleanup BDD trace audit + retest (~10 min)

Une fois tous les fixes pushed, nettoyer les traces audit :

```sql
-- Supprimer le compte test sans profile
delete from memberships where user_id in (select id from auth.users where lower(email) = 'easyfest-extreme-bug1-verify@mailinator.com');
delete from assignments where volunteer_user_id in (select id from auth.users where lower(email) = 'easyfest-extreme-bug1-verify@mailinator.com');
delete from auth.users where lower(email) = 'easyfest-extreme-bug1-verify@mailinator.com';

-- Garder Anaïs Test DnD J26 si user souhaite, sinon :
-- delete cascade similaire pour easyfest-extreme-dnd-2603@mailinator.com
```

---

## 🛠️ STACK & PRINCIPES DE FIX

### Pattern de fix universel (à appliquer partout)

**❌ AVANT (bugué)** :
```typescript
const { data: messages } = await supabase
  .from("messages")
  .select(`
    id, content, created_at,
    sender:sender_user_id (raw_user_meta_data),
    channel:channel_id (id, name, kind)
  `)
  .order("created_at", { ascending: false });
```

**✅ APRÈS (correct)** :
```typescript
// 1. Query principale (sans embeds problématiques)
const { data: messages, error: msgErr } = await supabase
  .from("messages")
  .select("id, content, created_at, sender_user_id, channel_id, is_broadcast")
  .order("created_at", { ascending: false });

if (msgErr) {
  console.error("[Messages] failed to fetch:", msgErr);
  // graceful degradation : show empty state with error toast
}

// 2. Queries secondaires séparées
const senderIds = Array.from(new Set((messages ?? []).map(m => m.sender_user_id).filter(Boolean)));
const channelIds = Array.from(new Set((messages ?? []).map(m => m.channel_id).filter(Boolean)));

const [profilesRes, channelsRes] = await Promise.all([
  senderIds.length > 0
    ? supabase.from("volunteer_profiles").select("user_id, full_name, first_name, email, avatar_url").in("user_id", senderIds)
    : Promise.resolve({ data: [], error: null }),
  channelIds.length > 0
    ? supabase.from("message_channels").select("id, name, kind, color, position_id").in("id", channelIds)
    : Promise.resolve({ data: [], error: null }),
]);

const profilesById = new Map((profilesRes.data ?? []).map(p => [p.user_id, p]));
const channelsById = new Map((channelsRes.data ?? []).map(c => [c.id, c]));

// 3. Merge JS-side
const enriched = (messages ?? []).map(m => ({
  ...m,
  sender: profilesById.get(m.sender_user_id) ?? null,
  channel: channelsById.get(m.channel_id) ?? null,
}));
```

### Tests Vitest pour chaque fix

Pour chaque page fixée, créer un test qui :
1. Insère des données de test en BDD via service-role
2. Simule le SSR de la page (via le code server component directement appelé)
3. Vérifie que le résultat n'est PAS vide

Exemple :
```typescript
import { describe, it, expect } from 'vitest';
import { createServiceClient } from '@/lib/supabase/admin';

describe('Messages page — historique', () => {
  it('retourne les messages quand BDD a des broadcasts', async () => {
    const admin = createServiceClient();
    // Setup : 1 channel + 1 message
    const { data: channel } = await admin.from("message_channels").insert({ event_id: TEST_EVENT, kind: 'admin', name: 'Test' }).select().single();
    await admin.from("messages").insert({ channel_id: channel.id, sender_user_id: TEST_USER, content: 'Test broadcast', is_broadcast: true });

    // Run the page query (extract logic from page.tsx into a helper)
    const result = await fetchMessagesForEvent(TEST_EVENT);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].content).toBe('Test broadcast');
    expect(result[0].sender).toBeTruthy();  // sender enriched from volunteer_profiles
    expect(result[0].channel).toBeTruthy();  // channel enriched from message_channels
  });
});
```

---

## 📋 PLAN D'EXÉCUTION CLAUDE CODE

### Sprint 0 — Setup & backup (5 min)
```bash
cd E:\Easy_Fest\Easy_Fest\easyfest
git fetch origin main
git pull origin main
git tag backup-pre-postgrest-fixes-$(date +%Y%m%d-%H%M)
git push origin --tags
```

### Sprint 1 — Audit exhaustif (30 min)
- Étapes A à G ci-dessus
- Produire un fichier `AUDIT_POSTGREST_PATTERNS.md` qui liste **toutes** les anomalies trouvées (pas juste les 7 documentées). Cette liste doit dépasser 7 — **probablement 15-25 bugs** réels.

### Sprint 2 — Fixes Backend (45 min)
- Bug #7 prefecture : retirer `location_name`
- Bug #8 messages : split queries (template ci-dessus)
- Bug #9 safer regie : split queries
- Bug #13 mon poste : split queries + corriger `label` → `notes` + UNION assignments
- TOUS les autres bugs trouvés en audit (probablement 10+)

### Sprint 3 — Fixes Frontend / UI (20 min)
- Bug #10 theme : audit theme provider, fix CSS variables injection par tenant
- Bug #11 fallback nom : `coalesce(full_name, first_name+last_name, email, "—")`
- Bug #12 mobile responsive : `overflow-x-auto scrollbar-hide` sur nav régie / poste / volunteer

### Sprint 4 — Tests Vitest (30 min)
- Créer un test par page fixée (~20 tests minimum)
- Tous tests doivent passer avant push

### Sprint 5 — Build verify + push (10 min)
```bash
pnpm build
pnpm test
git add -A
git commit -m "fix(critical): audit exhaustif PostgREST embeds + colonnes inexistantes + theme provider + mobile responsive (Bugs #7-13 + N autres trouvés)"
git push origin main
```
Vercel auto-deploy. Vérifier le build passe au vert.

### Sprint 6 — Cleanup BDD audit traces (5 min)
SQL DRY-RUN puis DELETE des comptes test orphelins :
- `easyfest-extreme-bug1-verify@mailinator.com`
- `easyfest-extreme-dnd-2603@mailinator.com` (si user souhaite, sinon laisser pour archives)

### Sprint 7 — Rapport final (5 min)
Créer un message de fin clair dans le chat :

```
✅ Bugs PostgREST fixés. Récap :
- Bug #7 prefecture : location_name retiré (1 ligne)
- Bug #8 messages : split queries auth.users → volunteer_profiles
- Bug #9 safer regie : split queries idem
- Bug #10 theme : ThemeProvider lit organization_themes par orgSlug
- Bug #11 nom fallback : coalesce(full_name, email, "—")
- Bug #12 mobile : overflow-x-auto sur 5 nav containers
- Bug #13 mon poste : split queries + label→notes + UNION assignments
+ X autres bugs trouvés via audit systématique :
  - apps/vitrine/.../FOO/page.tsx ligne Y : embed cassé sender
  - apps/vitrine/.../BAR/page.tsx ligne Z : colonne inexistante "old_col"
  - ... (lister tous)

Tests Vitest 38/38 + N nouveaux tests OK
Build prod ✅
Cleanup BDD : 2 comptes test supprimés
Commit XXXXX poussé sur main, deploy Vercel ✅

Cowork peut relancer Phase 4 V4 retest extrême.
```

---

## ⛔ NON-NÉGOCIABLES

- **Audit exhaustif obligatoire** : ne te limite PAS aux 7 bugs documentés. Le user veut explicitement que tu vérifies **chacun** des patterns possibles. La liste finale doit avoir 15-25 lignes minimum.
- **Pas de commits intermédiaires "partiel"** : un seul commit final qui regroupe toutes les corrections, ou max 3-4 commits logiquement séparés (backend / frontend / tests / cleanup).
- **Pas de fix superficiel** : si une page utilise un embed `:fk(...)`, ne te contente pas de retirer l'embed. Implémente le merge JS-side proprement avec les profils enrichis. Sinon les noms ne s'afficheront pas et c'est UX cassée.
- **Pas de skip mobile/theme** : Bugs #10 et #12 sont bien réels et bloquants pour la démo Pamela qui se fera sur tablette.
- **Pré-autorisé** : tu n'as PAS à demander confirmation user pour push, deploy, migration apply, ou DELETE BDD.
- **Critères de validation Cowork** : à la fin, lister les URLs précises que Cowork doit re-tester en Phase 4 V4 (toutes les pages auditées en Étape E).

---

## Critère de validation Cowork (à confirmer en chat à la fin)

Cowork va relancer ce scénario :

1. Navigation manuelle Pamela sur **toutes** les pages listées en Étape E. Aucune ne doit afficher 0/vide/404 si la BDD a des données.
2. Spécifiquement :
   - `/regie/.../prefecture` → page charge, ZIP download fonctionne
   - `/regie/.../messages` → historique affiche "Salut à tous" + autres broadcasts
   - `/regie/.../safer` → 1 alerte open visible avec bouton "Acquitter" / "Résoudre"
   - `/regie/.../settings/theme` → click Forest Green → couleurs primaires changent visuellement
   - `/poste/.../` (Mahaut) → équipe Bar (Lucas + Anaïs + Sandy) + 9 shifts
   - mobile 412×915 sur ces pages → tous les onglets accessibles via scroll horizontal
3. Si tout vert → tag `audit-extreme-validated-final-{date}` + push + production J-26 RDL2026 GO
