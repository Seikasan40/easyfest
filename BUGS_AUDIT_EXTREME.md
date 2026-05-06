# 🟢 BUG #18 FIXED + AUDIT FINAL VALIDÉ — 3 mai 2026 ~18h21 UTC

> Tag : `audit-mobile-first-validated-bug18-fixed-20260503-1821`
> Commits : `b08f691` (fix RLS recursion) + `6f212bb` (3 breadcrumbs back-links 44px)

## ✅ Root cause identifiée par Claude Code via diagnostic curl direct

**Erreur réelle** : `42P17 infinite recursion detected in policy for relation "memberships"`
**Pas un bug d'embed PostgREST** comme initialement suspecté.

La policy `memberships_select_my_team_lead` ajoutée dans la migration `20260503020000` (Phase 4 V5 sprint Bug #7-bis) contenait un sub-query `select 1 from public.memberships m_self` à l'intérieur d'une policy SELECT sur memberships. Postgres détecte la récursion infinie de RLS et rejette TOUTE query SELECT sur memberships pour un utilisateur authentifié. Conséquence en cascade : tout `/hub`, /regie/.../planning, /poste, /v home cassés.

## ✅ Fix migration `20260503040000_fix_memberships_rls_recursion.sql`

3 fonctions `security definer` qui bypass RLS lors des sub-queries internes :
- `is_volunteer_in_team(event_id, position_id)` — vérifie via memberships ou assignments
- `is_post_lead_of(event_id, position_id)`
- `is_target_in_my_post_lead_team(target_user_id)`

Recréation des 3 policies `memberships_select_my_team_lead`, `vp_select_my_team_lead`, `vp_select_post_lead_team` en utilisant les fonctions. Plus de récursion possible.

## ✅ Fix défense-en-profondeur `hub/page.tsx`

- Suppression de l'embed PostgREST imbriqué `event:event_id (... organization:organization_id (...))`
- Split en 4 queries séparées + merge JS-side via Map (pattern réutilisable)
- `error` destructuré + log côté serveur + état d'erreur user-visible (`data-testid="hub-error"`, ⚠️) au lieu de tomber silencieusement sur "Salut bénévole"
- `data-testid="hub-empty"` distinct pour le vrai cas vide légitime
- `data-role-card={role}` sur chaque carte pour Playwright

## ✅ Test Playwright sémantique `hub-semantic.spec.ts`

Login Pamela + assertions :
1. `[data-testid="hub-error"]` count == 0
2. `[data-testid="hub-empty"]` count == 0
3. `[data-role-card]` count > 0
4. `[data-role-card="direction"] a[href^="/regie/"]` visible

Couvre la régression Bug #18 : un test contenu sémantique en complément des tests visuels (no h-scroll + tap targets). Si une nouvelle RLS pathologique réapparaît, ce test fail au lieu de passer vert silencieusement.

## ✅ Bonus — 3 breadcrumbs back-links agrandis

Re-run Playwright post-fix a détecté 3 liens "← Accueil/Retour/{orgName}" 68×17px sur :
- `apps/vitrine/app/[orgSlug]/page.tsx`
- `apps/vitrine/app/[orgSlug]/[eventSlug]/page.tsx`
- `apps/vitrine/app/[orgSlug]/[eventSlug]/inscription/page.tsx`

Fix : `inline-flex min-h-[44px] items-center` sur les 3 Links.

## ✅ Validation finale prod live (Cowork Phase 4 V7)

### Playwright automatisé (Claude Code)
```
113/113 tests OK (45.6s)
- 112 mobile-visual (4 viewports × 14 pages × 2 checks)
- 1   hub-semantic (Pamela login + role cards)
```

### Cowork desktop (Cowork moi-même, en live, 18h28 UTC)
- Login Pamela `pam@easyfest.test` / `easyfest-demo-2026` → /hub charge
- H1 : "Salut Pam 👋" (pas "Salut bénévole") ✅
- 1 role card "Je suis régie · ZIK en PACA · Roots du Lac 2026" ✅
- `roleCards=1, hubError=0, hubEmpty=0, hasNoAffectationText=false` ✅
- Pas de redirect /hub depuis /regie (Pamela a accès) ✅

### BDD cohérente (Management API)
- 13 memberships actives totales
- Pamela 1, Lucas 1, Sandy 3, Mahaut 1, Antoine 1, Dorothée 1
- Query SELECT memberships ne retourne plus 42P17 ✅
- 3 fonctions `security definer` déployées correctement ✅

## 📚 Leçons retenues pour le futur

1. **Tests visuels (no h-scroll, tap targets) sont nécessaires mais pas suffisants** : ils peuvent passer vert sur une page complètement cassée sémantiquement. Toujours doubler avec un test de contenu authentifié (Playwright `[data-role-card]` count > 0 par exemple).
2. **Sub-query RLS sur même table = piège récursion infinie**. Toujours utiliser `security definer` function intermédiaire pour bypass RLS lors des SELECT internes.
3. **Defense in depth dans le code** : split queries + error destructuré + état d'erreur user-visible empêchent le silent failure et accélèrent le debug.
4. **Diagnostic curl direct sur PostgREST** est le test ultime : si une query simple `?select=role,event_id` retourne 42P17, ça révèle un problème RLS profond invisible côté frontend.

## 🎯 Production J-26 RDL2026 (28-30 mai 2026)

Cycle d'audit clos avec **13 commits** et **24+ bugs documentés** (sans compter les 80+ anomalies mobile-first). Tag final : `audit-mobile-first-validated-bug18-fixed-20260503-1821`.

Recommandations user pré-festival :
1. **Test sur ton vrai téléphone** Pamela (le seul reproducteur fiable des comportements iOS/Android natifs)
2. **Brief Pamela** : `pam@easyfest.test` / `easyfest-demo-2026` en démo, son vrai compte en prod
3. **Smoke test 24h avant le festival** : refaire login Pamela + DnD planning tablet + alerte grave + broadcast pour vérifier qu'aucun deploy intermédiaire n'a régressé
4. **CI GitHub Actions Playwright** sur chaque PR pour ne plus avoir de régression silencieuse

---

# 🚨 BUG #18 BLOQUANT — /hub vide pour TOUS les comptes (régression critique)

> Découvert par user en test mobile + reproduit par Cowork desktop le 3 mai 2026 ~17h45 UTC.
> **Tag `audit-mobile-first-validated-final-20260503-1738` est invalide** — un test Playwright "no horizontal scroll + tap targets ≥ 44px" passe vert mais ne teste PAS le contenu sémantique. L'app est essentiellement cassée pour tous les rôles.

## Symptôme reproduit

- User mobile (iPhone 4G) sur `easyfest.app/hub` : "Salut bénévole 👋 / Tu n'as pas encore d'affectation active. L'équipe revient vers toi dès que ton rôle est confirmé." + liens "Mes données et vie privée" + "Se déconnecter"
- Cowork desktop (Chrome easy_fest) : login Pamela `pam@easyfest.test` / `easyfest-demo-2026` → redirect /hub → MÊME ÉCRAN VIDE
- User testify : « ça renvoi à ça même pour les comptes test régie admin etc »

## État BDD (confirmé via Management API)

- Pamela : 1 membership `direction RDL2026 ZIK en PACA` `is_active=true` ✅
- 6 comptes seed `*@easyfest.test` ont leurs memberships actives ✅
- FK `events.organization_id → organizations` existe ✅
- RLS `memberships_select_self` simple : `user_id = auth.uid()` ✅

## Root cause probable

`apps/vitrine/app/hub/page.tsx` lignes 30-40 utilise embed PostgREST imbriqué :

```typescript
const { data: memberships } = await supabase
  .from("memberships")
  .select(`
    role, position_id, is_entry_scanner, is_mediator, is_active,
    event:event_id (
      id, name, slug,
      organization:organization_id (slug, name)   // ← double imbrication
    ),
    position:position_id (name)
  `)
  .eq("user_id", userData.user.id)
  .eq("is_active", true);
```

C'est **exactement le même pattern** que les Bugs #6, #8, #9, #13 qui ont été fixés sur d'autres pages, mais le hub a été oublié. L'embed double `event:event_id (... organization:organization_id (...))` échoue silencieusement (PGRST200 ou autre erreur cachée car pas de `error` destructuré) → `memberships = null` ou `[]` → branche "Salut bénévole" affichée.

## Fix obligatoire

Split en 4 queries séparées + merge JS-side :

```typescript
// 1. Memberships seuls (aucun embed)
const { data: memberships, error: memErr } = await supabase
  .from("memberships")
  .select("role, position_id, event_id, is_entry_scanner, is_mediator, is_active")
  .eq("user_id", userData.user.id)
  .eq("is_active", true);

if (memErr) {
  console.error("[Hub] memberships fetch failed:", memErr);
  // Ne pas montrer "Salut bénévole" — montrer une vraie erreur user
}

// 2. Events séparés
const eventIds = Array.from(new Set((memberships ?? []).map(m => m.event_id)));
const { data: events } = eventIds.length > 0
  ? await supabase.from("events").select("id, name, slug, organization_id").in("id", eventIds)
  : { data: [] };

// 3. Organizations séparées
const orgIds = Array.from(new Set((events ?? []).map(e => e.organization_id)));
const { data: orgs } = orgIds.length > 0
  ? await supabase.from("organizations").select("id, slug, name").in("id", orgIds)
  : { data: [] };

// 4. Positions séparées
const posIds = Array.from(new Set((memberships ?? []).map(m => m.position_id).filter(Boolean)));
const { data: positions } = posIds.length > 0
  ? await supabase.from("positions").select("id, name").in("id", posIds)
  : { data: [] };

// Merge via Map
const eventsById = new Map((events ?? []).map(e => [e.id, e]));
const orgsById = new Map((orgs ?? []).map(o => [o.id, o]));
const posById = new Map((positions ?? []).map(p => [p.id, p]));

const enrichedMemberships = (memberships ?? []).map(m => {
  const event = eventsById.get(m.event_id);
  const organization = event ? orgsById.get(event.organization_id) : null;
  return {
    ...m,
    event: event ? { id: event.id, name: event.name, slug: event.slug, organization } : null,
    position: m.position_id ? posById.get(m.position_id) : null,
  };
});
```

## Correction Playwright pour ne plus avoir de faux positif

Le test Playwright `mobile-visual.spec.ts` a passé vert sur /hub alors que le contenu était cassé. Il faut ajouter un test **contenu sémantique** :

```typescript
test('hub displays role cards for authenticated user', async ({ page }) => {
  // Login Pamela
  await page.goto('https://easyfest.app/auth/login');
  await page.fill('input[type=email]', 'pam@easyfest.test');
  await page.fill('input[type=password]', 'easyfest-demo-2026');
  await page.press('input[type=password]', 'Enter');
  await page.waitForURL('**/hub');
  
  // Vérifier qu'au moins 1 carte de rôle est affichée
  const roleCards = await page.locator('[data-role-card]').count();
  expect(roleCards).toBeGreaterThan(0);
  
  // Vérifier que le message "Pas encore d'affectation" n'est PAS affiché
  const noAffectation = await page.locator('text=Tu n\'as pas encore d\'affectation').count();
  expect(noAffectation).toBe(0);
});
```

## Conséquence pour l'audit J-26

- **Tag `audit-mobile-first-validated-final-20260503-1738` est INVALIDE**
- L'app est dans un état où **AUCUN utilisateur authentifié ne peut accéder à son rôle**
- C'est probablement le bug le plus critique de toute la série — bloque 100% des utilisateurs au bout du tunnel d'authentification
- À fixer **immédiatement** par Claude Code avant tout autre travail

## Action immédiate

Lance Claude Code avec ce focus laser :
> Fix Bug #18 hub vide : split la query embed PostgREST de `apps/vitrine/app/hub/page.tsx` en 4 queries séparées (memberships + events + organizations + positions). Test Vitest. Test Playwright contenu sémantique (pas juste no horizontal scroll). Push, redeploy, vérifier sur prod que Pamela voit sa carte direction.

---

# 🟢 AUDIT MOBILE-FIRST FINAL VALIDÉ — 3 mai 2026 ~17h38 UTC

> Tag : `audit-mobile-first-validated-final-20260503-1738`
> Commit : `cd8147e` sur main
> Verdict objectif via tests automatisés Playwright + Lighthouse (pas via screenshots desktop Cowork qui ne pouvaient pas émuler mobile).

## ✅ Résultats automatisés

### Playwright mobile-visual : 112/112 tests passés

- **4 viewports** : 360×640 (Galaxy S5) / 390×844 (iPhone 14) / 412×915 (Pixel 7) / 768×1024 (iPad portrait Pamela)
- **14 pages** : `/`, `/pricing`, `/legal/cgu`, `/legal/mentions`, `/legal/privacy`, `/auth/login`, `/icmpaca`, `/icmpaca/rdl-2026`, `/icmpaca/rdl-2026/inscription`, `/demande-festival`, `/hub`, `/v/icmpaca/rdl-2026`, `/regie/icmpaca/rdl-2026`, `/poste/icmpaca/rdl-2026`
- **2 checks par page** : no horizontal scroll + tap targets ≥ 44×44px (heuristique WCAG 2.5.5 clause "Inline" pour exempter les liens en milieu de phrase)
- **Run time** : 45s sur prod live easyfest.app

### Lighthouse mobile (4G + 4× CPU throttle)

| Page | Performance | A11y | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/v/icmpaca/rdl-2026` | **96**/100 | 96 | 100 | 63* | 2.3s | 0 | 50ms |
| `/` homepage | **94**/100 | 94 | 100 | 100 | 2.3s | 0 | 210ms |

*SEO 63 sur `/v/` = noindex attendu (espace volunteer privé)

**Core Web Vitals** : tous "Good" ✅
- LCP < 2.5s ✅
- CLS < 0.1 ✅
- TBT < 300ms ✅

## ✅ Fixes Sprint final V6 (par-dessus les 84 du Sprint V5)

1. `apps/vitrine/components/site-header.tsx:23` — Logo `Easyfest, accueil` h=36 → `min-h-[44px]`
2. `site-header.tsx:27-37` — nav header (Festivals, Confidentialité) → `min-h-[44px] py-3 inline-flex`
3. `site-header.tsx:93-129` — 4 footer links → `min-h-[44px] py-3 inline-flex` ; items légaux non-cliquables → `py-1`
4. Playwright config + spec dédié mobile : `apps/vitrine/playwright.mobile.config.ts` + `apps/vitrine/e2e/mobile-visual.spec.ts`
5. Heuristique tap-targets respectant WCAG 2.5.5 clause "Inline" (exempte les liens dans bloc de texte)

## 📦 Récap complet du cycle d'audit J-26 RDL2026

| Phase | Livrable |
|---|---|
| Audit initial 10/10 | `02fea9c` |
| 7 multi-membership bugs | `1a6b6bc` |
| Audit extrême 4 bugs (#1-#4) | `5c231ae`, `b46f2ec` |
| Bug #5 RPC atomique | `e5e0a3e` |
| Universal fix DnD pre-volunteer | `49f3234` |
| Bug #6 frontend planning découplé | `04b791e` |
| 21 bugs PostgREST embeds | `4623ec0` |
| Bugs #16 mobile DnD + #7-bis + #13-bis + feed admin | `a605877` |
| **Audit mobile-first 84 anomalies** | **`4e13b54`** |
| **Sprint final V6 — 5 résiduelles + Playwright + Lighthouse** | **`cd8147e`** |

**Tag final** : `audit-mobile-first-validated-final-20260503-1738`

## 🎯 Ce qui reste pour la production J-26 (28-30 mai 2026)

### Recommandations user post-audit

1. **Test sur ton vrai téléphone** (le seul qui peut détecter ce que les tests automatisés ratent : multi-touch gestures, comportements iOS/Android natifs spécifiques, IME français AZERTY mobile, signal 4G réel hors WiFi)
2. **Test sur la tablette de Pamela** pour le jour J (DnD planning, taille tap targets en condition lumière soleil)
3. **Lancer Playwright en CI GitHub Actions** sur chaque PR pour ne pas régresser
4. **Brief Pamela** : utiliser `pam@easyfest.test` / `easyfest-demo-2026` en démo, et son vrai compte production en prod
5. **Smoke test J-26** : 24h avant le festival, refaire un Cowork retest des 11 scénarios prioritaires en mobile/tablette pour s'assurer que le deploy n'a rien régressé

### Bugs résiduels mineurs (non-bloquants J-26, à intégrer post-festival)

- Note : Lucas /v/feed visibility des broadcasts admin "Annonces" — partial fix dans commit `a605877`, à re-vérifier en prod
- SEO 63 sur `/v/` — par design (noindex pages auth)
- Mobile app Expo non auditée — hors scope J-26

---

# 🟠 RETEST PHASE 4 V4 — 3 mai 2026 ~16h30 UTC (Cowork) — 8/11 GREEN, 3 BUGS RÉSIDUELS + BUG MOBILE CRITIQUE

> Phase 4 V4 retest exhaustif après commit `4623ec0` (Claude Code, 21 bugs PostgREST fixés). Tests réels page-par-page avec cross-check BDD live.

## ✅ 8 pages validées desktop OK

| URL | Statut | Cross-check BDD |
|---|---|---|
| `/auth/login` Pamela password seed | ✅ | `easyfest-demo-2026` confirmé fonctionne |
| `/hub` Pamela | ✅ | 1 carte régie RDL2026 |
| `/regie/.../prefecture` | ✅ Bug #7 FIXED | 85 validés ✓ + 4 partenaires 9000€ + 3 mineurs |
| `/regie/.../messages` historique | ✅ Bug #8 FIXED | 3 broadcasts visibles avec auteurs enrichis |
| `/regie/.../safer` | ✅ Bug #9 FIXED | 3 alertes visibles avec reporters enrichis |
| `/regie/.../settings/theme` | ✅ Bug #10 + #14 FIXED | switch dynamique sans F5 + couleurs CSS variables |
| `/regie/.../applications` | ✅ Bug #11 FIXED | 87 cands, 85 validées, flags has_account corrects |
| `/regie/.../planning` | ✅ Bug #15 FIXED | 86 bénévoles, fallback noms OK |
| `/v/.../feed` Lucas | ✅ Bug #4 FIXED | 1 broadcast Bar visible avec auteur enrichi |

## 🟠 3 bugs résiduels desktop

### Bug résiduel #7-bis — `/v/...` ne trouve pas le team lead Mahaut
- Lucas voit « Pas encore de chef·fe d'équipe désigné·e » alors que **Mahaut a `memberships.role='post_lead', position_id=Bar, is_active=true`** en BDD ✅
- **Fichier** : `apps/vitrine/app/v/[orgSlug]/[eventSlug]/page.tsx`
- **Fix** : auditer la query post_lead, vérifier le merge JS-side du profile

### Bug résiduel #13-bis — Mahaut /poste affiche `?` au lieu des noms
- 3 user_ids correctement détectés via UNION (Lucas + Anaïs + Sandy)
- Cartes affichent `?` car **RLS `vp_select_post_lead_team`** bloque les profiles dont la membership.position_id ≠ post_lead.position_id
- Anaïs (membership.position_id=NULL, assignment Bar) et Sandy (membership.position_id=Ateliers, assignment Bar) → bloqués
- Seul Lucas (membership.position_id=Bar) devrait apparaître
- **Fix** : étendre la RLS pour autoriser aussi via assignments :
  ```sql
  -- nouveau OR EXISTS dans vp_select_post_lead_team
  or exists (
    select 1 from assignments a
    join shifts s on s.id = a.shift_id
    join memberships m_actor on m_actor.user_id = auth.uid()
    where a.volunteer_user_id = volunteer_profiles.user_id
      and m_actor.role = 'post_lead'
      and m_actor.position_id = s.position_id
      and m_actor.is_active = true
  )
  ```
- **Alternative plus propre** : la RPC `assign_volunteer_atomic` doit aussi mettre à jour `memberships.position_id` (en plus de créer l'assignment), pour synchroniser les 2 sources

## 🔴 BUG CRITIQUE #16 — DnD planning mobile inopérant (user-reported)

- **Test** : User tente DnD planning sur **téléphone** → ne fonctionne pas
- **Sévérité** : 🔴 BLOQUANT (slogan « mobile-first », Pamela utilisera tablette le jour J)
- **URL** : `/regie/icmpaca/rdl-2026/planning` en mobile
- **Symptômes observés par user** :
  1. Impossible de drag-drop (le touch déclenche probablement le scroll vertical au lieu du drag)
  2. Le pool affiche **« Tous les bénévoles ont une équipe 🎉 »** (faux) — le compteur mobile est désynchronisé
  3. OU l'app affiche **« Tu dois inviter d'abord ce bénévole »** alors que les bénévoles SONT déjà invités/connectés
- **Root cause hypothèses** :
  1. dnd-kit n'a pas `TouchSensor` configuré avec `delay` (250ms recommandé pour distinguer scroll vs long-press)
  2. Le menu d'équipes alternatif au tap court (mobile) ne se déclenche pas — possiblement le composant `PlanningVolunteerCard` n'a pas de fallback `onTap` mobile
  3. Le pool calculé en SSR n'est pas re-calculé après l'assignation côté mobile (cache différent ?)
- **Fix dnd-kit pour mobile** :
  ```typescript
  import { useSensors, useSensor, PointerSensor, TouchSensor, KeyboardSensor } from '@dnd-kit/core';
  
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 8 }  // 8px de mouvement avant drag (évite scroll accidentel)
    }),
    useSensor(TouchSensor, { 
      activationConstraint: { delay: 250, tolerance: 5 }  // long-press 250ms, tolérance 5px
    }),
    useSensor(KeyboardSensor),
  );
  
  <DndContext sensors={sensors} ...>
  ```
- **Fix menu mobile alternatif** : sur mobile (< 768px), au tap court sur une carte, ouvrir un bottom-sheet listant les équipes cliquables. C'est plus fiable que le drag pour mobile.
- **Critère validation** :
  1. Mobile 412×915 simulé OU device réel : long-press 250ms sur carte bénévole → drag possible
  2. Tap court → bottom-sheet "Choisir une équipe" → click équipe → toast Sauvegardé
  3. Compteur mobile cohérent avec desktop après assignation

## 🟡 Note observation — Lucas /v/feed ne voit que 1 broadcast Bar

- **État BDD** : 3 broadcasts (admin · Annonces "Salut à tous", team · Bar "Briefing", team · Parking "Yo yo")
- **UI Lucas** : 1 broadcast Bar uniquement
- **Attendu** : Lucas devrait voir AU MOINS 2 broadcasts (Bar + Annonces qui devrait toucher tout le monde)
- **À investiguer** : ciblage par `kind=admin` filtré côté frontend ou RLS messages mal configurée

---

# 🔴 RETEST EXTRÊME — 3 mai 2026 (Cowork) — STOP PHASE 1 déclenché

> Audit conduit dans browser `easy_fest`, login Pamela (`pam@easyfest.test` / `easyfest-demo-2026-v2`).
>
> **Verdict immédiat : BUG #1 PAS FIXÉ EN PROD.** Le scénario PRIORITÉ ABSOLUE du `PROMPT_AUDIT_EXTREME_COWORK.md` a été stoppé conformément au critère 14 : `❌ Si toast d'erreur "Compte pas encore créé. Invitez d'abord ce bénévole" : BUG #1 PAS FIXÉ → STOP la PHASE 1, alerter le user en chat`.

## Reproduction live (3 mai 2026 ~10h25 UTC)

1. Login Pamela sur prod easyfest.app — ✅ OK
2. `/regie/icmpaca/rdl-2026/applications/manual-signup` — créer candidature `Anaïs Test DnD J26` / `easyfest-extreme-dnd-2603@mailinator.com` — ✅ status auto `Validé`
3. Bouton 📧 Inviter — ✅ status `Déjà invité·e + Renvoyer`, mail envoyé (Mailinator confirme 2 mails reçus : `Confirm Your Signup` + `Ta candidature pour Roots du Lac 2026 est validée`)
4. ⚠️ Mailinator rate-limit empêche extraction du magic-link — pivot test sur **Anaïs Bayart** (vraie femme du user, ya cliqué le magic-link en prod il y a quelques jours)
5. `/regie/icmpaca/rdl-2026/planning` — compteur affiche `**84 bénévoles (84 en attente compte)**` — TOUS les 84 sont en pre-volunteer ⏳, AUCUN n'a la membership
6. Filtrer "anais" → carte Anaïs Bayart visible, badge ⏳, wish BAR
7. **Right-click** sur la carte → toast jaune : `💡 Pour inviter anaisbayart@outlook.fr, va sur l'onglet Candidatures → bouton 📧 à côté de son nom`
8. **Drag-drop** carte → équipe Bar → toast jaune : **`⏳ Compte pas encore créé — invite ce bénévole d'abord`** ❌

## Évidence (screenshot IDs, conversation Cowork)

- `ss_4569vv9hb` formulaire manual-signup vierge
- `ss_8413d13pm` formulaire rempli Anaïs Test DnD
- `ss_03883jwqt` applications list — Anaïs Test DnD `Déjà invité·e`
- `ss_7834i8prp` planning — `84 bénévoles (84 en attente compte)`
- `ss_1664bkttk` planning filtré "anais" — carte Anaïs Bayart badge ⏳
- `ss_6621uqtwy` right-click → toast `Pour inviter…`
- `ss_05404f4dn` drag → toast `Compte pas encore créé — invite ce bénévole d'abord`

## Verdict détaillé

3 bugs imbriqués causent ensemble cette boucle infinie en prod :

1. **Bug #1** (RLS `memberships_insert_lead` bloque l'auto-création de membership volunteer côté user) — commit `5c231ae` claim « FIXED » côté code, mais **84 bénévoles tous en pre-volunteer en prod** prouve que le fix n'a pas pris effet (deploy Vercel pas exécuté ? branche `chore/supabase-cli-v2-upgrade` pas mergée sur main ? migration RLS pas appliquée ?). 🔴
2. **Bug #2** (magic-link callback `/auth/callback` parse hash JWT côté client uniquement — manque côté Next.js) — non fixé. ❌
3. **Universal fix `assignVolunteerToTeam`** (auto-create membership pour pre-volunteers ayant `auth.users` + `volunteer_application validated`) — **non implémenté**. La spec est dans `PROMPT_AUDIT_EXTREME_CODE.md` section PRIORITÉ ABSOLUE, mais Claude Code ne l'a pas encore exécuté. ❌

**Sans ces 3 fixes ensemble, le festival RDL2026 du 28-30 mai démarre avec 0 bénévole assigné. La démo Pamela est cassée. Le J-26 est compromis.**

## Action user immédiate

Lancer **immédiatement** le `PROMPT_AUDIT_EXTREME_CODE.md` dans Claude Code pour :
1. Vérifier que le commit `5c231ae` est sur main + déployé Vercel + migration RLS appliquée en prod
2. Implémenter Bug #2 (page `/auth/callback`)
3. Implémenter le universal fix `assignVolunteerToTeam` (code TS spec'é dans le prompt)
4. Push, redeploy
5. Relancer Cowork Phase 4 retest

---

## ❗ Bug observé en parallèle pendant l'audit (à intégrer Phase 4)

**Pamela password en prod = `easyfest-demo-2026-v2`** (au lieu de `easyfest-demo-2026` dans seeds/docs). Probablement résultat d'un test précédent qui a forcé un changement (Bug #3 setup-password idempotence). À prendre en compte dans les futurs scripts seeds + docs.

---

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

---

## BUG #2 — 🔴 BLOQUANT — Magic-link callback ne crée pas la session côté Next.js

- **Test** : T17 + critère P0 du Bug #1 (impossible de valider sans ce fix)
- **Sévérité** : 🔴 BLOQUANT — empêche tout onboarding bénévole via magic-link
- **URL** : `/auth/login#access_token=...`
- **Compte** : tous les nouveaux users créés via `inviteVolunteer` ou `manual-signup`
- **Reproduction** :
  1. Régie : créer une candidature manual-signup avec mailinator (`easyfest-extreme-bug1-verify@mailinator.com`)
  2. Mail magique reçu sur Mailinator (preuve `send_validation_mail` Edge fn OK ✅)
  3. Click le lien dans le mail → URL `https://wsmehckdgnpbzwjvotro.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://easyfest.app/v/icmpaca/rdl-2026`
  4. Supabase verify le token et redirige vers `https://easyfest.app/v/icmpaca/rdl-2026#access_token=eyJ...&refresh_token=...&type=signup`
  5. **MAIS** : Next.js middleware sur `/v/...` détecte qu'il n'y a pas de cookie session (le hash est côté client) → redirige sur `/auth/login?redirect=/v/icmpaca/rdl-2026#access_token=...`
  6. Le hash JWT reste dans l'URL mais aucun client `@supabase/ssr` n'est attaché à `/auth/login` pour le parser et créer les cookies session
  7. User reste anonyme → impossible d'arriver sur `/hub` → `onboardCurrentUser` jamais appelé → aucune membership créée
- **Évidence** :
  - URL après click magic-link : `https://easyfest.app/auth/login?redirect=%2Fv%2Ficmpaca%2Frdl-2026#access_token=...`
  - JS attempt `window.location.href = '/auth/callback?...'` → redirect homepage anonyme (pas de page `/auth/callback` qui process le hash)
  - Côté planning régie : compteur passe de 82 → 83 (candidature ajoutée) mais nouveau user reste avec badge ⏳
- **Root cause** : Pas de page `/auth/callback` qui parse le hash JWT et set les cookies session via `supabase.auth.exchangeCodeForSession` ou `setSession`. Le flow Supabase Auth implicit (#access_token=) nécessite un handler client côté Next.js.
- **Fichiers à modifier** :
  - **Créer** `apps/vitrine/app/auth/callback/page.tsx` (route client component qui parse le hash + appelle `supabase.auth.setSession({access_token, refresh_token})` + redirect vers `next` query param)
  - **Modifier** `apps/vitrine/app/actions/applications-admin.ts` (action `inviteVolunteer`) : changer `emailRedirectTo` pour pointer vers `${baseUrl}/auth/callback?next=/hub` au lieu de `${baseUrl}/hub`
  - **Modifier** Supabase Auth config : ajouter `https://easyfest.app/auth/callback*` dans `additional_redirect_urls`
- **Fix proposé** :
  ```tsx
  // apps/vitrine/app/auth/callback/page.tsx
  "use client";
  import { useEffect } from "react";
  import { useRouter, useSearchParams } from "next/navigation";
  import { createBrowserClient } from "@supabase/ssr";

  export default function AuthCallback() {
    const router = useRouter();
    const sp = useSearchParams();
    useEffect(() => {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) {
        router.replace("/auth/login?error=missing_token");
        return;
      }
      const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      sb.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          router.replace("/auth/login?error=" + encodeURIComponent(error.message));
        } else {
          const next = sp.get("next") || "/hub";
          router.replace(next);
        }
      });
    }, []);
    return <main className="flex min-h-screen items-center justify-center"><p>Connexion en cours…</p></main>;
  }
  ```
  + dans `inviteVolunteer` : `emailRedirectTo: \`${baseUrl}/auth/callback?next=/hub\``
- **Critère de validation après fix** :
  1. Régie : créer candidature manual-signup mailinator → email reçu
  2. Click magic-link → URL `https://easyfest.app/auth/callback?next=/hub#access_token=...`
  3. Page "Connexion en cours…" affichée brièvement
  4. Redirect automatique vers `/hub` avec session active
  5. **Combiné avec Bug #1 fix** : la carte "Je suis bénévole · ZIK PACA · RDL2026" apparaît directement (membership auto-créée)
  6. Côté régie planning : nouveau bénévole sans badge ⏳ + drag → "✓ Sauvegardé" + persistence F5

- **FIX** (Claude Code · 3 mai 2026, après commit) :
  - **Page client** : `apps/vitrine/app/auth/callback/page.tsx` (server wrapper avec `<Suspense>`) + `apps/vitrine/app/auth/callback/CallbackInner.tsx` (client component) qui gère les 2 flows :
    - PKCE (`?code=…`) → `exchangeCodeForSession(code)`
    - Implicit (`#access_token=…&refresh_token=…`) → `setSession({ access_token, refresh_token })`
    - Open-redirect protection via `isSafeRedirect()` (chemins locaux uniquement).
  - **Suppression** `apps/vitrine/app/auth/callback/route.ts` (route handler server-only — incompatible avec `page.tsx` au même path, et la nouvelle page client couvre l'ex flow PKCE via createBrowserClient qui pose les cookies @supabase/ssr).
  - **Update** `apps/vitrine/app/actions/applications-admin.ts:127` : `emailRedirectTo: ${baseUrl}/auth/callback?next=/hub` (au lieu de `${baseUrl}/hub`).
  - **Update** Edge fn `packages/db/supabase/functions/send_validation_mail/index.ts:232` : `redirectTo = ${APP_URL}/auth/callback?next=/hub&event=...&org=...` (au lieu de `/v/${orgSlug}/${eventSlug}` direct).
  - **À REDEPLOY** côté humain : Edge fn (Claude Code n'a pas la permission systeme pour `supabase functions deploy` en prod). Commande : `pnpm exec supabase functions deploy send_validation_mail --project-ref wsmehckdgnpbzwjvotro` après `supabase login` + `supabase link`.

---

## BUG #3 — 🟡 UX — Force-set-password redirige même quand le password est inchangé

- **Test** : T17 (validation E2E)
- **Sévérité** : 🟡 UX (workaround possible : taper un nouveau password)
- **URL** : `/account/setup-password`
- **Compte** : Pamela demo (`pam@easyfest.test`) en l'occurrence
- **Reproduction** :
  1. Login compte demo Pamela
  2. Middleware redirige vers `/account/setup-password` (correct, comportement T17 implémenté)
  3. Saisir le même password actuel (`easyfest-demo-2026`) dans les 2 champs → cliquer Enregistrer
  4. **BUG** : la page se recharge sur `/account/setup-password` (le metadata `password_set: true` n'a pas été persisté car Supabase Auth refuse l'update si nouveau password = ancien)
  5. Workaround : taper un password différent (`easyfest-demo-2026-v2`) → save OK → redirect /hub
- **Root cause** : la server action `setPassword` ne distingue pas (a) l'erreur Supabase "password unchanged" (b) un vrai succès. Si Supabase retourne une erreur, le metadata `password_set: true` n'est pas updaté.
- **Fix proposé** : dans la server action, si `supabase.auth.updateUser({password})` retourne une erreur du genre "New password should be different", traiter comme succès SI le password était déjà set (i.e. user.user_metadata.password_set vaut déjà true) OU forcer l'update du metadata `password_set: true` indépendamment du résultat update password.
- **Critère** : Pamela demo peut re-confirmer son password actuel sans devoir le changer.

- **FIX** (Claude Code · 3 mai 2026, après commit) :
  - `apps/vitrine/app/actions/auth.ts` `setupPassword` détecte le pattern d'erreur Supabase Auth "should be different / unchanged / identical" et fait un second `updateUser({ data: { password_set: true } })` (sans password) pour aligner le metadata. L'utilisateur est ensuite redirigé vers `/hub` normalement. Les autres erreurs (validation, session expirée, etc.) restent fail-fast.

⚠️ **Note importante** : pour les comptes demo (Pamela en particulier), le password actuel est maintenant `easyfest-demo-2026-v2` (modifié pendant cet audit). À documenter ou reset SQL pour la prochaine session.

---

## BUG #4 — 🟡 UX — Badges ⏳ pour TOUS les bénévoles seedés (planning régie)

- **Test** : T5
- **Sévérité** : 🟡 UX — affecte la lisibilité du planning mais n'empêche pas le DnD une fois Bug #1+#2 fixés
- **URL** : `/regie/icmpaca/rdl-2026/planning`
- **Compte** : Pamela direction
- **Reproduction** :
  1. Login Pamela → planning
  2. Tous les 83 bénévoles affichent badge ⏳ (pre-volunteer)
- **Root cause** : Les seeds SQL (`20260430000009_seed_volunteers_shifts.sql`) créent les `volunteer_applications` avec `status='validated'` mais ne créent PAS les `memberships` correspondantes. Donc tous les seeded users restent pre-volunteer dans le pool planning.
- **Fix proposé** : modifier le seed SQL pour créer aussi les `memberships role='volunteer' is_active=true` pour les applications validated. OU créer une migration one-shot `20260503000002_backfill_seed_memberships.sql` qui INSERT les memberships manquantes pour les applications validated existantes.
- **Critère** : Login Pamela → planning → bénévoles seedés affichent SANS badge ⏳, drag-and-drop direct fonctionne sans avoir à passer par le flow invite/onboard.

- **FIX** (Claude Code · 3 mai 2026, après commit) :
  - Nouvelle migration `packages/db/supabase/migrations/20260503000002_backfill_seed_memberships.sql` : `INSERT … SELECT` qui crée les memberships volunteer manquantes pour toutes les `volunteer_applications` `validated` dont l'email matche un `auth.users` (case-insensitive). Idempotente (LEFT JOIN exclut les memberships existantes + `ON CONFLICT DO NOTHING`).
  - **Appliquée en prod via Management API** : 5 memberships créées (correspondent aux 5 apps dont l'email = compte demo `@easyfest.test` déjà dans `auth.users`). Recount post-migration : `still_missing_memberships = 0` ✓
  - Les 79 autres applications validées seront automatiquement converties en memberships via le flow normal `inviteVolunteer → magic-link → /auth/callback → /hub → onboardCurrentUser` (débloqué par les fix Bug #1 + Bug #2).

---

## TODO restant (autres tests T2-T18 non exécutés)

T2 (QR SVG visual), T3 (ALERTE GRAVE inter-rôles complet), T4 (Inviter mail+click chaîné), T5 (drag persistence F5), T6 (Broadcast → fil Lucas), T7 (Plan upload), T8 (ZIP Préfecture), T9 (Sponsors CRUD), T10 (Theme switcher), T11 (Static pages × 5), T12 (RGPD export), T13 (Wellbeing red counter), T14 (Cross-tenant), T15 (Multi-event Sandy Frégus), T16 (Mobile DnD), T18 (Mail-tester score).

À faire dans une **nouvelle session Cowork** après que Claude Code ait fixé Bug #2 (auth callback) et Bug #4 (seed memberships). Bug #1 sera alors testable end-to-end.

---

## Ce qui a été VALIDÉ pendant cette session

- ✅ Manual-signup régie : envoie le mail magique (Edge fn `send_validation_mail` OK, mail brandé "Bienvenue à bord, Audit." reçu sur mailinator)
- ✅ Setup-password forcé (T17 partiel — middleware actif et fonctionnel pour password différent)
- ✅ Login Pamela password OK
- ✅ Filtre planning fonctionne
- ✅ Bug #1 fix code-side validé (commit `5c231ae` + RLS migration appliquée), mais **non validé E2E à cause de Bug #2 qui bloque le flow magic-link login**.
