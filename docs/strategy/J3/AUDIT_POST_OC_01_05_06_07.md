# Audit post-OC-01/04/05/06/07 — vue 10 comités

> Date : 2026-05-01 | Sprint J3 | Branche : main HEAD = `8aede1b`
> Méthode : 10 comités spécialisés challengent l'état du repo. Ton acide constructif. Aucune complaisance.
> Périmètre vérifié : `apps/vitrine/`, `packages/db/supabase/migrations/`, `packages/db/supabase/functions/`, `docs/strategy/J3/`, `BILAN_J3_*.md`, `.github/workflows/ci.yml`.

---

## Synthèse Hermès (TL;DR)

J3 livre 3 OC P0 corrects sur le papier (RGPD, onboarding self-service, observabilité scaffoldée) mais l'écart entre `BILAN` triomphal et code livré reste réel : **les 5 happy paths E2E sont tous en `test.fixme` ou smoke-only**, l'edge function `rgpd_hard_delete` n'est pas déployée en prod, `ignoreBuildErrors=true` étouffe encore TypeScript dans `next.config.mjs:6`, et le wizard `/commencer` ne couvre que la création initiale (skip rebuilt-in qui interdit toute deuxième org pour un user). Cap V1 GA juin 2026 atteignable si on impose : 1) tests E2E réellement passants en CI, 2) déploiement Edge Functions + monitoring branchés, 3) une dette TS strict purgée. Note moyenne pondérée : **6.4/10**.

---

## 1. Product / Métier (6.5/10)

**Forces**
1. `bootstrap_org_for_user` (migration `20260501000020_onboarding.sql:82`) crée org + event + membership direction + applique un template positions en une seule RPC security definer — flux self-service réel, pas un mock.
2. 3 templates métier seedés (`festival-musique-petite-jauge`, `moyenne-jauge`, `evenement-associatif`) avec positions cohérentes (Bar, Catering, Brigade verte, Loges, Backline) — adapté à la cible Pam (Roots du Lac, ZIK PACA).
3. Auto-service RGPD couvre Art.15 + Art.17 avec UX claire (`apps/vitrine/app/account/privacy/page.tsx` + bandeau `deletion-pending-banner`).

**Faiblesses**
1. **Pricing toujours absent** — landing `app/page.tsx:13` dit "à partir de 49 €/édition" mais aucune route `/pricing`. Promesse non tenue depuis l'audit J3. Pas de CTA achat.
2. **Wizard mono-org** : le skip dans `commencer/page.tsx:38` (`if (existingDirection) redirect("/hub")`) interdit à un même utilisateur de créer 2 orgs. Bloque les agences/prestataires événementiels (segment B2B identifié dans `BUSINESS_MODELS_EASYFEST.md`).
3. **Pas de page `/case-studies/roots-du-lac`** ni de témoignage Pam, alors que c'est OC-11 P2 et que le BILAN J3 le cite comme "future étude de cas en or". Marketing-product gap.

**Décisions urgentes**
1. Livrer `/pricing` minimal en 1 jour (4 paliers déjà connus) + connecter au CTA "Commencer".
2. Ajouter un flag `multi_org_allowed` (default false) sur `auth.users` pour débloquer le cas agence sans casser le 80/20.
3. Capturer le verbatim Pam dimanche et scaffolder la page case study, même placeholders.

---

## 2. Tech (6/10)

**Forces**
1. Monorepo pnpm/turbo cohérent (`apps/vitrine`, `apps/mobile`, `packages/db`, `packages/shared`, `packages/ui`), 19 migrations versionnées, RPC `bootstrap_org_for_user` en `security definer` propre avec `set search_path`.
2. Wrap Sentry conditionnel (`next.config.mjs:84`) qui dégrade gracieusement sans DSN — pas de throw en dev.
3. CSP stricte (`next.config.mjs:38`) avec `frame-ancestors 'none'` et `connect-src` whitelisté Supabase/Resend/Sentry/PostHog.

**Faiblesses**
1. **`typescript: { ignoreBuildErrors: true }` toujours là** (`next.config.mjs:6`) — déjà flaggé J0/J1/J2. Bombe à retardement, on ne sait pas combien d'erreurs TS sont étouffées. Identifié dans `BILAN_J3_DEPLOY.md:142` mais non corrigé.
2. **`(supabase as any)` partout** dans le code récent (`org-creation.ts:74,86,153`, `account/privacy/page.tsx:26`, `commencer/page.tsx:29,43`) — la génération de types Supabase n'est pas câblée, on perd la sécurité TS.
3. **Edge function `rgpd_hard_delete` non déployée** : code présent (`packages/db/supabase/functions/rgpd_hard_delete/index.ts`) mais `BILAN_J3_DEPLOY.md:96` confirme qu'aucune Edge Function n'est déployée en prod. Le soft-delete 30j ne purgera jamais → données pseudo-conservées indéfiniment.

**Décisions urgentes**
1. Lancer `supabase gen types` + checker la PR qui retire `ignoreBuildErrors`. Probablement 50-100 erreurs à fixer, 1-2j max.
2. `supabase functions deploy rgpd_hard_delete qr_sign qr_verify send_validation_mail trigger_safer_alert ban_validator rgpd_purge` + setter le cron Supabase Scheduler (sinon OC-04/05 est cosmétique).
3. Bannir `as any` dans le code RPC : typer `bootstrap_org_for_user` via Database types générés.

---

## 3. Sécurité / RGPD (7/10)

**Forces**
1. Service client utilisé uniquement côté route handler après `getUser()` (`api/account/export/route.ts:14-28`) — pattern correct, pas de leak service_role côté client.
2. Job CI `security-grep` (`ci.yml:46`) bloque tout commit avec `SUPABASE_SERVICE_ROLE_KEY` ou `QR_HMAC_SECRET` dans `apps/vitrine/.next/static`. Vraie barrière anti-leak.
3. RLS soft-delete (`20260501000010_rgpd_soft_delete.sql:26-52`) masque les profils soft-deleted aux leads/post_leads ; sign-out auto après delete (`api/account/delete/route.ts:41`).

**Faiblesses**
1. **Pas de hard-delete réel sans Edge Function déployée** (cf. comité Tech). En l'état, RGPD Art.17 est partiellement non-conforme : promesse "30j puis purge" non tenue côté infra.
2. **CSP `unsafe-inline` + `unsafe-eval` sur `script-src`** (`next.config.mjs:39`) — nécessaire pour Next 14 mais aucune mitigation (pas de nonce, pas de hash). Tout XSS injecté = exploitable.
3. **Pas de rate-limit** sur `POST /api/account/delete` ni `GET /api/account/export` — un user authentifié peut DDoS son propre export (lourd : 6 requêtes Postgres en parallèle). Pas de Cloudflare Turnstile non plus.

**Décisions urgentes**
1. Déployer `rgpd_hard_delete` + déclarer le cron quotidien Supabase Scheduler ; documenter le hash `X-Cron-Secret` dans les secrets repo.
2. Migrer le CSP vers nonces (Next 14 supporte via `headers()` + middleware) avant V1 GA.
3. Ajouter rate-limit Upstash (1 export/24h, 1 delete/h/IP) sur les 3 routes account/.

---

## 4. QA / Tests (4/10)

**Forces**
1. Fixture `e2e/fixtures/auth.ts` propre : `createTestUser` via Supabase admin API + login UI + cleanup. Réutilisable pour les futurs specs.
2. 8 fichiers `.spec.ts` (signup, onboarding, onboarding-full, rgpd, rgpd-full, regie-planning, staff-scan, roles) — la structure est posée.
3. CI job e2e (`ci.yml:77`) upload artifact `playwright-report` toujours, même en échec.

**Faiblesses**
1. **Les 5 "happy paths" annoncés par OC-06+07 sont tous en `test.fixme` ou smoke-only** :
   - `regie-planning.spec.ts:33,49` → `test.fixme` (parcours réel non écrit)
   - `staff-scan.spec.ts:23,39,43` → 3 `test.fixme` consécutifs
   - `onboarding.spec.ts` → uniquement les redirects gateway (pas de wizard end-to-end)
   - `rgpd.spec.ts` → uniquement les 401/redirects publics
   Le commit message `8aede1b` est trompeur : "5 specs E2E + PostHog captures" sous-entend des happy paths fonctionnels, ce sont des squelettes.
2. **CI e2e tourne avec `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`** (`ci.yml:93`) — aucune Supabase test instance branchée, donc les tests `test.fixme` ne pourront jamais passer en l'état.
3. **0 test unitaire** (vitest installé mais aucune `.test.ts` détectée hors e2e) — la logique métier de `bootstrap_org_for_user` (validation slugs, conflit, template) ne couvre rien.

**Décisions urgentes**
1. Spinner Supabase en CI (action `supabase/setup-cli` + `supabase start`) ou utiliser une preview branch + secrets — sans ça, la matrice e2e est théâtre.
2. Convertir 1 `test.fixme` par OC en happy path réel **chaque semaine** ; baseline = au moins onboarding + rgpd full d'ici J4.
3. Tests unitaires vitest sur les server actions (`org-creation.ts` validations Zod, `bootstrap_org_for_user` codes d'erreur).

---

## 5. Marketing (3.5/10)

**Forces**
1. Tagline forte + lisible (`page.tsx:42` "Le festival pro, sans le prix pro") avec gradient brand-coral cohérent.
2. Section comparatif "Easyfest vs solutions pro" (`page.tsx:88-108`) pose un positionnement clair, sans nommer Weezevent/Sourcil (correct juridiquement).
3. Cookie banner + CSP + DPA EU mentionnés en hero — signal trust pour la cible asso.

**Faiblesses**
1. **Aucune route `/pricing`, aucune page `/cas-clients`, aucun blog SEO** — la home reste une page unique. Idem audit J0, idem J3. Trois sprints, zéro avancée marketing.
2. **CTA hero pointe vers `/icmpaca/rdl-2026/inscription`** (page bénévole d'un seul festival) au lieu de `/commencer` (le wizard direction qu'on vient de livrer). On vient d'investir dans OC-01 et la home n'y dirige pas.
3. **Footer absent de mention "Témoignages", "Pricing", "Blog"** — `SiteFooter` (vu via import dans `page.tsx:3`) ne reflète pas la stratégie.

**Décisions urgentes**
1. Câbler le hero sur `/commencer` en CTA primaire ("Lance ton festival en 3 minutes"). Le CTA bénévole RDL = secondaire.
2. Page `/pricing` 1 jour avant tout autre OC P1.
3. Récolter dimanche le verbatim Pam, transformer en case study + 1 post LinkedIn dans la semaine.

---

## 6. Branding (5/10)

**Forces**
1. Palette earth-tones + brand-coral cohérente, utilisée systématiquement (`text-brand-coral`, `border-brand-ink/10`, `bg-brand-cream`) dans `commencer/`, `account/privacy/`, `page.tsx`.
2. Typographie display + sans-serif respectée, hiérarchie claire (`font-display text-3xl font-bold` sur tous les H1 livrés).
3. Pas de bleu = différenciation visuelle vs Weezevent / HelloAsso / Yurplan.

**Faiblesses**
1. **Pas de logo SVG, pas de favicon distinctif** — l'audit J3 (`AUDIT_HERMES_J3.md:338`) le notait déjà. Aucun fichier dans `apps/vitrine/public/` qui ressemble à un logo. Identité = mot "Easyfest" en `font-display`, point.
2. **Emojis partout au lieu d'illustrations** : feature cards (`page.tsx:8-13`), templates positions (`migration:39 "🎟️", "🍻", "🍽️"`), hub (`hub/page.tsx:8-14`). Le BACKLOG OC-prompt dit "remplacer les emojis", rien n'a bougé.
3. **OG images absentes** — pas de `opengraph-image.tsx` détecté ; le partage social affichera la screenshot Netlify par défaut.

**Décisions urgentes**
1. Délivrer un logo SVG + favicon en 2 jours (déjà speccé dans `AUDIT_HERMES_J3.md:489` — Prompt 1 logo). Bloquant pour V1 GA.
2. OG image dynamique (Next 14 supporte nativement) sur `/`, `/commencer`, `/case-studies/*`.
3. Définir un système de pictos cohérent (Lucide ou Phosphor) pour remplacer progressivement les emojis sans casser la prod.

---

## 7. Recherche / Insights Pam (5.5/10)

**Forces**
1. Templates seedés reflètent vraiment les besoins ZIK PACA : "Backline", "Loges artistes", "Brigade verte", "Camping" sur le template moyenne-jauge (`migration onboarding.sql:52`) — c'est tiré du Google Form Pam.
2. `BILAN_J3_FINAL.md:25-27` documente la parité Google Form Pam (régime alimentaire, dispos montage/démontage, covoiturage) → import des 51 inscrits réels.
3. Convention bénévolat signée avec Siret/adresse Pam (commit `41e4f73` cité) = preuve qu'on a écouté terrain.

**Faiblesses**
1. **Pam est référencée comme cliente témoignage (memory `pam_identity.md`) mais OC-11 (case study) reste à faire en P2** — incohérence priorité : le verbatim Pam est la seule arme marketing crédible et elle est repoussée.
2. **Pas de feedback loop in-app** (bouton "Je signale", widget Crisp) → impossible de capturer le retour Pam dimanche autrement qu'à l'oral.
3. **Pas d'analytics actif sur le wizard `/commencer`** : `usePostHog` est no-op si pas de cookie consent (`usePostHog.ts:29`), et le cookie banner n'a probablement pas encore été testé sur ce flow → on ne saura pas si Pam (ou autre) lâche à l'étape 3 ou 4.

**Décisions urgentes**
1. Enregistrer / scripter dimanche : 8 questions pré-rédigées (déjà dans `AUDIT_HERMES_J3.md:1060`) + autorisation droit à l'image signée.
2. Câbler un widget feedback minimal (mailto: ou form Resend) accessible depuis `/hub` et `/regie/*` avant fin de semaine.
3. Vérifier que le cookie banner setter `analytics_consent=true` propage bien dans `localStorage[easyfest_cookies_consent_v1]` lu par `usePostHog`. Sinon les events `ONBOARDING_*` ne partiront jamais.

---

## 8. UX (6/10)

**Forces**
1. Wizard `/commencer` 5 étapes avec auto-slug (`OnboardingWizard.tsx:94-101`), validation par étape (`canContinueOrg`/`canContinueEvent`), back/next propre. Pattern attendu par l'utilisateur.
2. Page `/account/privacy` claire, deux articles séparés (Art.15 / Art.17), bandeau jaune si suppression pending. Vraiment user-facing.
3. `/onboarding` → 308 vers `/commencer` (`onboarding/page.tsx:13`) : route française canonique, alias historique préservé. Bon SEO + cohérence FR.

**Faiblesses**
1. **Pas de save progressif du wizard** — si l'utilisateur ferme l'onglet à l'étape 3, tout est perdu (pas de localStorage, pas de table `draft_onboardings`). Friction réelle pour un dirigeant d'asso interrompu.
2. **Pas d'empty state illustré sur `/hub` quand 0 membership** (`hub/page.tsx:48-56`) — juste "⏳ Tu n'as pas encore d'affectation". Frustrant pour un user qui vient de signer une candidature et atterrit sur cette page sans onboardCurrentUser concluant.
3. **Pas d'accessibilité ARIA testée** : labels `aria-*` rares (`role="status"` présent sur le bandeau privacy mais c'est tout), aucun audit Lighthouse / axe-core en CI.

**Décisions urgentes**
1. Persister l'état du wizard en `localStorage` (clé `easyfest_onboarding_draft_v1`) + bouton "Reprendre" sur `/commencer` si draft trouvé.
2. Empty state `/hub` avec illustration + 2 CTA ("Créer mon organisation" si pas direction, "Voir les festivals" sinon).
3. Brancher `axe-playwright` sur 3 pages clés (landing, /commencer, /account/privacy) en CI.

---

## 9. Open Code (DX) (6.5/10)

**Forces**
1. Headers de fichiers documentent l'intention métier (`org-creation.ts:1-6`, `rgpd_soft_delete.sql:1-7`) — quelqu'un qui débarque comprend l'OC concerné.
2. CI clean (`ci.yml`) : lint + typecheck + test + build + grep secrets + e2e + sourcemaps — couvre les bonnes étapes même si typecheck est mou (cf. `ignoreBuildErrors`).
3. Commit messages OC-tagged (`feat(onboarding): OC-01 wizard self-service direction`) — historique navigable.

**Faiblesses**
1. **README racine pauvre** (`README.md` non lu en détail mais aucun setup local documenté dans le repo en dehors de `BILAN_J3_DEPLOY.md:124`). Un nouveau dev ne sait pas par où commencer.
2. **`BILAN_J3_FINAL.md` triomphal mais commit `8aede1b` "imprécis"** (mention dans la mission elle-même) — les bilans embellissent ce que les tests fixme révèlent. Drift `documentation ↔ code`.
3. **Aucun script `pnpm setup` qui scaffold .env.local** : le BILAN dit "remplir .env.local" sans `.env.example` complet vérifié. Frottement onboarding dev.

**Décisions urgentes**
1. README racine = quickstart 10 lignes + lien vers `docs/strategy/J3/BACKLOG.md` + lien `BILAN_J3_FINAL.md`.
2. Générer un `.env.example` exhaustif (Supabase URLs, Sentry, PostHog, Resend, QR_HMAC_SECRET, CRON_SECRET) — checké par CI (`grep` sur les vars manquantes).
3. Imposer en review : pas de `BILAN_*.md` rédigé avant que les tests E2E associés soient verts.

---

## 10. Hermès (arbitrage final)

**Verdict pondéré** : **6.4/10**

Le sprint J3 a livré du code utile, mais le BILAN survend. Le delta entre `8aede1b` ("OC-06+07 implem") et la réalité (3 fichiers de specs en `test.fixme`) confirme que la méthode "1 commit par OC" ne suffit plus si l'OC livre une coquille vide. L'urgence n'est pas d'empiler de nouveaux OC (Artistes, Cmd+K, ZIP export…) mais de **boucler les 3 P0 déjà entamés** avant juin :
- OC-04/05 incomplet sans Edge Function déployée
- OC-01 incomplet sans pricing + multi-org + persistance wizard
- OC-06/07 incomplet sans 1 happy path réellement vert en CI avec Supabase test

Si on ouvre OC-08 Artistes maintenant, on construit sur du sable.

---

## Top 3 priorités absolues V1 GA juin 2026 (Hermès)

1. **Boucler la production-readiness avant tout nouvel OC** : (a) déployer les 6 Edge Functions Supabase (incluant `rgpd_hard_delete`) + cron Scheduler, (b) retirer `ignoreBuildErrors=true` et fixer les erreurs TS, (c) brancher Supabase test instance dans CI pour rendre les `test.fixme` exécutables, convertir 1 happy path par OC en test passant.
2. **Acquisition / vente** : livrer `/pricing` (4 paliers) + page `/case-studies/roots-du-lac` (placeholder verbatim Pam dimanche) + repointer le CTA hero de la home vers `/commencer`. Sans ces 3 deltas, OC-01 onboarding self-service est un escalator qui ne mène à aucune porte.
3. **Conformité réelle** : rate-limit + CSP nonces + désactivation `/auth/dev-login` en prod (gated env var seulement, mais surface d'attaque non nulle). Bloquer le go-live tant qu'un audit pentest léger n'a pas tourné sur les routes `/api/account/*`.

---

*Audit généré le 2026-05-01 sur `main@8aede1b`. Réviser à chaque livraison OC pour mesurer la convergence.*
