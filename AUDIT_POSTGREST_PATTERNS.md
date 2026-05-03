# AUDIT POSTGREST PATTERNS — 3 mai 2026

## Méthode

1. Recherche regex `*_user_id\s*\(`, `:\w+_id\s*\(`, `!_fkey` dans `apps/vitrine/`, `packages/`.
2. Liste exhaustive des FK BDD via `pg_constraint` (Management API).
3. Test direct chaque embed suspect via PostgREST REST API (`/rest/v1/...?select=...`).
4. Test des colonnes via `?select=col1,col2` direct.
5. Audit pages volunteer/régie/poste, theme provider, mobile responsive.

## Récap des FK pertinentes

Toutes les FK `*_user_id`, `*.user_id`, `*sender*`, `*reporter*`, `*volunteer*` du schema `public` pointent vers `auth.users(id)` — schema **non exposé** à PostgREST par défaut.

FK utilisables côté embed PostgREST (toutes vers tables `public`) :
- `events.organization_id → organizations.id` ✅
- `assignments.shift_id → shifts.id` ✅
- `shifts.position_id → positions.id` ✅
- `memberships.position_id → positions.id` ✅
- `memberships.event_id → events.id` ✅
- `messages.channel_id → message_channels.id` ✅
- `safer_alerts.event_id → events.id` ✅
- `volunteer_applications.event_id → events.id` ✅
- `wellbeing_reports.event_id → events.id` ✅
- `sponsors.event_id → events.id` ✅
- `meal_allowances.event_id → events.id` ✅
- `signed_engagements.event_id → events.id` ✅
- `organization_themes.organization_id → organizations.id` ✅

**Aucun FK `public.* → public.volunteer_profiles`** — donc embed `volunteer_profiles!*_fkey` est cassé partout.

## Tableau exhaustif des bugs

| # | Fichier | Ligne | Pattern | Type | Statut PostgREST |
|---|---|---|---|---|---|
| 1 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/messages/page.tsx | 25 | `sender:sender_user_id (raw_user_meta_data)` | A — auth.users | PGRST200 |
| 2 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/safer/page.tsx | 24 | `reporter:reporter_user_id (raw_user_meta_data)` | A — auth.users | PGRST200 |
| 3 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/safer/page.tsx | 34 | `reporter:reporter_user_id (raw_user_meta_data)` | A — auth.users | PGRST200 |
| 4 | apps/vitrine/app/v/[orgSlug]/[eventSlug]/feed/page.tsx | 24 | `sender:sender_user_id (raw_user_meta_data)` | A — auth.users | PGRST200 |
| 5 | apps/vitrine/app/poste/[orgSlug]/[eventSlug]/page.tsx | 79 | `profiles:user_id (id, first_name, last_name, full_name, email, phone, avatar_url)` | B — pas de FK directe vers volunteer_profiles | PGRST200 |
| 6 | apps/vitrine/app/poste/[orgSlug]/[eventSlug]/page.tsx | 89 | `shifts.select("id, ..., label")` | C — col `label` n'existe pas | 42703 |
| 7 | apps/vitrine/app/v/[orgSlug]/[eventSlug]/page.tsx | 68 | `profiles:user_id (id, first_name, last_name, full_name, email, phone, avatar_url)` | B | PGRST200 |
| 8 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/prefecture/page.tsx | 35 | `events.select("..., location_name, ...")` | C — col `location_name` n'existe pas | 42703 |
| 9 | apps/vitrine/app/v/[orgSlug]/[eventSlug]/convention/page.tsx | 18 | `events.select("..., location_name, ...")` | C — col `location_name` n'existe pas | 42703 |
| 10 | apps/vitrine/app/v/[orgSlug]/[eventSlug]/convention/page.tsx | 19 | `organization:organization_id (...)` ne sélectionne PAS `president_name, president_title` | C — colonnes manquantes dans embed | logique cassée |
| 11 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/applications/page.tsx | 38 | `profile:volunteer_profiles!memberships_user_id_fkey (email)` | B — FK pointe auth.users | PGRST200 |
| 12 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/shifts/page.tsx | 26 | `volunteer:volunteer_user_id (volunteer_profiles!user_id (full_name, first_name))` | B — assignments.volunteer_user_id → auth.users | PGRST200 |
| 13 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/shifts/page.tsx | 39 | `profile:volunteer_profiles!memberships_user_id_fkey (full_name, first_name)` | B | PGRST200 |
| 14 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/settings/theme/ThemePicker.tsx | 39-44 | Après `applyThemePreset` ok → pas de `router.refresh()` | UI cache | thème invisible jusqu'à navigation |
| 15 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/planning/page.tsx | 149-153 | Fallback `m.profile?.full_name ?? "—"` sans coalesce email | UX | "—" affiché si pas de full_name |
| 16 | apps/vitrine/app/v/[orgSlug]/[eventSlug]/layout.tsx | 77-90 | `<nav grid-cols-{5,6}>` sans `overflow-x-auto` | mobile responsive | onglets coupés en 412px si 6 cols |
| 17 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/messages/page.tsx | 20-28 | Pas de destructuring `error` | C — erreur silencieuse | UX vide silencieux |
| 18 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/safer/page.tsx | 19-40 | Pas de destructuring `error` | C — erreur silencieuse | idem |
| 19 | apps/vitrine/app/v/[orgSlug]/[eventSlug]/feed/page.tsx | 19-27 | Pas de destructuring `error` | C — erreur silencieuse | idem |
| 20 | apps/vitrine/app/poste/[orgSlug]/[eventSlug]/page.tsx | 77-91 | Pas de destructuring `error` + logique ne lit pas assignments→shifts→position | logique | équipe Bar incomplète |
| 21 | apps/vitrine/app/regie/[orgSlug]/[eventSlug]/applications/page.tsx | 34-46 | Embed cassé → `accountEmails` toujours vide → `has_account` = false partout | B + logique | tous flags KO |

## Vérifications curl PostgREST (preuve)

```
GET /rest/v1/messages?select=id,sender:sender_user_id(raw_user_meta_data)
→ PGRST200 "Could not find a relationship between 'messages' and 'sender_user_id'"

GET /rest/v1/memberships?select=user_id,profile:volunteer_profiles!memberships_user_id_fkey(email)
→ PGRST200 "Could not find a relationship between 'memberships' and 'volunteer_profiles' using the hint 'memberships_user_id_fkey'"

GET /rest/v1/safer_alerts?select=id,reporter:reporter_user_id(raw_user_meta_data)
→ PGRST200 "Could not find a relationship between 'safer_alerts' and 'reporter_user_id'"

GET /rest/v1/events?select=id,location_name
→ 42703 "column events.location_name does not exist"

GET /rest/v1/shifts?select=id,label
→ 42703 "column shifts.label does not exist"
```

## Plan de fix universel

Pour chaque embed cassé : **2 queries séparées + merge JS-side via Map**.

Pour chaque colonne inexistante :
- `location_name` → utiliser `location` (col existante)
- `label` → utiliser `notes` (col existante)

Pour Theme : `router.refresh()` après `applyThemePreset` ok.
Pour mobile responsive : `overflow-x-auto scrollbar-hide` sur nav volunteer 6-cols.
Pour fallback nom : `coalesce(full_name, first_name+last_name, email, "—")`.

**Total bugs identifiés : 21** (vs 7 documentés à l'origine).
