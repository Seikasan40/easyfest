# Easyfest

> SaaS multi-tenant pour festivals associatifs. **Bénévoles-first, multi-festival, RGPD-clean.**
> Le festival pro, sans le prix pro.

**État :** V0 Field Test — déploiement cible **dimanche 4 mai 2026** (réunion d'organes RDL avec Pam, Dorothée et 5-10 bénévoles testeurs).

---

## Stack

| Couche | Choix |
|---|---|
| Front-end Web (vitrine + admin + app PWA) | **Next.js 14 App Router** + TypeScript strict + Tailwind + shadcn/ui |
| Mobile (PWA + APK Android) | **Expo SDK 53** React Native + Web export |
| Backend / DB / Auth / Storage / Realtime | **Supabase EU** (eu-west-3 paris) |
| Edge Functions | Supabase Edge (Deno) |
| Mail transactionnel | Resend |
| Anti-bot signup | Cloudflare Turnstile |
| Carte du site | Mapbox |
| Errors | Sentry (3 projets) |
| Analytics | PostHog (cloud EU) |
| Hosting Web | **Netlify** (vitrine + admin) |
| CI/CD | GitHub Actions + EAS Build |
| Monorepo | Turborepo + pnpm workspaces |

---

## Structure

```
easyfest/
├── apps/
│   ├── vitrine/       Next.js 14 — vitrine publique + back-office admin (même domaine)
│   └── mobile/        Expo SDK 53 — PWA bénévole + APK Android responsables
├── packages/
│   ├── db/            Migrations Supabase + types TS générés + Edge Functions Deno
│   ├── ui/            shadcn/ui partagé Next + Expo Web
│   └── shared/        Zod schemas, constants, utils, role helpers
├── .github/workflows/ CI : lint, typecheck, tests, migrations
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example       Variables d'environnement (vault prod)
```

---

## Démarrage rapide (dev)

```bash
# 1. Pré-requis
node -v   # >= 20.10
pnpm -v   # >= 8.15
npx supabase --version   # CLI Supabase

# 2. Installer
pnpm install

# 3. Configurer env
cp .env.example .env.local
# Remplir au minimum : SUPABASE_*, RESEND_API_KEY, QR_HMAC_SECRET

# 4. Démarrer Supabase local (Docker requis) OU lier au projet hosted EU
pnpm supabase:start
# OU
pnpm supabase:link

# 5. Appliquer les migrations + seed
pnpm db:migrate
pnpm db:seed
pnpm db:types

# 6. Lancer le monorepo en dev
pnpm dev
# Vitrine : http://localhost:3000
# Mobile (Expo Web) : http://localhost:8081
```

---

## Multi-tenant : URL pattern

```
easyfest.app/                              → home publique multi-asso
easyfest.app/[org-slug]                    → page asso (mosaïque festivals)
easyfest.app/[org-slug]/[event-slug]       → page festival
easyfest.app/[org-slug]/[event-slug]/inscription → formulaire bénévole

easyfest.app/admin/[org-slug]/[event-slug] → back-office admin (auth)
easyfest.app/v/[org-slug]/[event-slug]     → app bénévole (auth, role volunteer)
easyfest.app/r/[org-slug]/[event-slug]     → app responsable (auth, post_lead/volunteer_lead)
easyfest.app/staff/[org-slug]/[event-slug] → app staff terrain scan (auth, staff_scan)
easyfest.app/regie/[org-slug]/[event-slug] → app régie (auth, direction)
```

---

## 5 rôles + sous-rôles

| Code interne | Libellé UI | Sous-titre type |
|---|---|---|
| `volunteer` | Je suis bénévole | `<prénom>` · `<poste>` |
| `post_lead` | Je suis resp. de poste | `<prénom>` · `<poste>` — son équipe |
| `staff_scan` | Je suis staff terrain | `<prénom>` · Scan d'accueil |
| `volunteer_lead` | Je suis resp. bénévoles | `<prénom>` · Validation, planning, modération |
| `direction` | Je suis régie | Vue d'ensemble du festival |

**Sous-rôles via flags `memberships.is_entry_scanner` / `is_mediator`.**

---

## Quality Gates (avant déploiement final)

Voir `BILAN_J4.md` (rempli en fin J4). Les 14 gates obligatoires sont rappelées dans `docs/QUALITY_GATES.md`.

---

## Bilans quotidiens

- `BILAN_J0.md` — Mer 29 avril : scaffold infra
- `BILAN_J1.md` — Jeu 30 avril : backend complet
- `BILAN_J2.md` — Ven 1 mai : vitrine + formulaire
- `BILAN_J3.md` — Sam 2 mai : app multi-rôles
- `BILAN_J4.md` — Sam 3 mai : polish + audit + deploy
- `BILAN_J5.md` — Dim 4 mai : assist live RDL

---

## Sécurité

- **RLS Postgres activée sur TOUTES les tables**, dès la migration initiale.
- `service_role_key` jamais dans bundle client (CI grep bloquant).
- JWT signé HMAC pour les QR codes, Edge fn `qr_verify` détecte rejouage.
- `expo-secure-store` (Keychain/Keystore) pour tokens mobile.
- DPA Supabase EU signé. Mention dans `/legal/privacy`.
- Cron mensuel `rgpd_purge` : suppression PII >12 mois post-event.

Détails : `docs/SECURITY.md`.

---

## Licence

UNLICENSED — code interne Easyfest. Pas de redistribution sans accord écrit.

---

*Built by the Easyfest engineering crew · Cellule Hermes · Avril 2026.*
