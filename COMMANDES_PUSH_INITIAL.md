# 🚀 Commandes à exécuter ce soir (J0 → J1)

> **Quand exécuter ?** Maintenant. Idéalement avant minuit.
> **Pré-requis :** Node 20+, pnpm 8+, Git, compte GitHub, compte Netlify, compte Supabase.

---

## 1️⃣ Initialiser le repo Git (5 min)

```bash
cd E:\Easy_Fest\Easy_Fest\easyfest

git init
git add .
git commit -m "chore(infra): J0 monorepo scaffold (turbo+pnpm), 9 migrations SQL, 6 Edge fns, vitrine Next 14, mobile Expo, CI GH Actions, RLS partout"

# Créer le repo distant : https://github.com/new (private, sans README)
# Nom suggéré : easyfest

git branch -M main
git remote add origin git@github.com:<TON_USER>/easyfest.git
git push -u origin main
```

## 2️⃣ Installer les dépendances (3 min)

```bash
pnpm install
```

Si erreur `peer dependencies` Expo : c'est normal, ignorer (compatibilité Tailwind/RN).

## 3️⃣ Créer le projet Supabase EU (10 min)

1. Aller sur https://supabase.com/dashboard
2. **New project** → Region: **eu-west-3 (Paris)** (OBLIGATOIRE pour DPA EU)
3. Plan : **Pro** (25 $/mois) recommandé pour MFA + DPA — ou **Free** si test seul
4. Récupérer :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` (Settings > API) → `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT secret` → `SUPABASE_JWT_SECRET`
   - `Project ref` (URL : `https://app.supabase.com/project/XXXXXXX`) → `SUPABASE_PROJECT_REF`
   - DB password → `SUPABASE_DB_PASSWORD`

5. Activer extensions (SQL Editor) :
```sql
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_stat_statements;
create extension if not exists citext;
```

## 4️⃣ Acheter le domaine (10 min)

1. https://domains.cloudflare.com → chercher `easyfest.app`
2. Acheter (~14 €/an pour `.app`)
3. DNS : configurer plus tard une fois Netlify branché

## 5️⃣ Configurer Resend (5 min)

1. https://resend.com → créer compte
2. **Add Domain** → `easyfest.app`
3. Copier les DNS records (DKIM + SPF + DMARC) → les ajouter sur Cloudflare DNS
4. Récupérer `RESEND_API_KEY`

## 6️⃣ Configurer Cloudflare Turnstile (3 min)

1. https://dash.cloudflare.com → **Turnstile** → Add site
2. Domain : `easyfest.app` + `localhost`
3. Mode : **invisible**
4. Récupérer `Site key` + `Secret key`

## 7️⃣ Créer le `.env.local` (5 min)

```bash
cp .env.example .env.local
# Éditer .env.local et remplir au minimum :
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - SUPABASE_PROJECT_REF
# - SUPABASE_DB_PASSWORD
# - SUPABASE_DB_URL
# - RESEND_API_KEY
# - QR_HMAC_SECRET (générer avec: openssl rand -hex 64)
# - CRON_SECRET (générer avec: openssl rand -hex 32)
# - TURNSTILE_SECRET_KEY
# - NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Générer les secrets :
openssl rand -hex 64  # → QR_HMAC_SECRET
openssl rand -hex 32  # → CRON_SECRET
```

## 8️⃣ Lier Supabase + appliquer les migrations (10 min)

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Login
supabase login

# Lier le projet
cd packages/db
supabase link --project-ref $SUPABASE_PROJECT_REF

# Appliquer les migrations (dry-run d'abord)
supabase db push --dry-run

# Si OK, push réel
supabase db push

# Générer les types TypeScript
supabase gen types typescript --project-id $SUPABASE_PROJECT_REF --schema public > src/types/database.ts

# Seed RDL 2026 (manuel — peut aussi se faire via SQL Editor sur le dashboard)
supabase db execute --file supabase/migrations/20260430000008_seed_rdl_2026.sql
```

## 9️⃣ Déployer les Edge Functions (5 min)

```bash
cd packages/db

# Set les secrets
supabase secrets set QR_HMAC_SECRET=<ta_clé_hex_64>
supabase secrets set RESEND_API_KEY=<re_xxx>
supabase secrets set RESEND_FROM_EMAIL=hello@easyfest.app
supabase secrets set APP_URL=https://easyfest.app
supabase secrets set CRON_SECRET=<ta_clé_hex_32>

# Deploy chaque function
supabase functions deploy qr_sign
supabase functions deploy qr_verify
supabase functions deploy send_validation_mail
supabase functions deploy trigger_safer_alert
supabase functions deploy ban_validator
supabase functions deploy rgpd_purge
```

## 🔟 Brancher Netlify (10 min)

1. https://app.netlify.com → **Add new site** → **Import from Git** → GitHub `easyfest/easyfest`
2. Build settings (le `netlify.toml` les définit déjà) :
   - Base directory : `apps/vitrine`
   - Build command : `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @easyfest/vitrine build`
   - Publish directory : `apps/vitrine/.next`
3. Environment variables : copier toutes les variables `NEXT_PUBLIC_*` + `SUPABASE_SERVICE_ROLE_KEY` + `RESEND_API_KEY` + `TURNSTILE_SECRET_KEY` + `QR_HMAC_SECRET`
4. Deploy
5. Custom domain → easyfest.app → suivre les DNS instructions

## 1️⃣1️⃣ Vérifier que ça marche

```bash
# Local
pnpm dev
# Ouvrir http://localhost:3000 → home Easyfest doit s'afficher
# Ouvrir http://localhost:3000/icmpaca → mosaïque ICMPACA + RDL 2026
# Ouvrir http://localhost:3000/icmpaca/rdl-2026 → page festival
# Ouvrir http://localhost:3000/icmpaca/rdl-2026/inscription → form 5 étapes

# Soumettre un test bidon → vérifier dans Supabase dashboard que la candidature
# est bien dans volunteer_applications
```

## 1️⃣2️⃣ Configurer GitHub Secrets (5 min)

Repo Settings → Secrets and variables → Actions → New repository secret :

```
SUPABASE_PROJECT_REF=<ton_project_ref>
SUPABASE_ACCESS_TOKEN=<créé sur supabase.com/dashboard/account/tokens>
SUPABASE_DB_PASSWORD=<le password supabase>
NETLIFY_AUTH_TOKEN=<sur app.netlify.com/user/applications#personal-access-tokens>
TURBO_TOKEN=<optionnel — pour remote cache turbo>
```

---

## ⏱ Timing total : ~70 minutes

Si tu fais tout ça avant 1h du matin, **J1 démarre à pleine vitesse demain matin**.

Si tu butes sur Q1 (Supabase) ou Q2 (domaine), **dis-le-moi et je propose un plan B** (Supabase free + easyfest.netlify.app pour l'instant).

---

## 🟢 Confirmation pour démarrer J1

Dès que tu m'envoies :
1. ✅ "Repo Git pushé"
2. ✅ "Supabase project ref : `xxxxx`"
3. ✅ "Migrations appliquées avec succès"

→ J1 commence : enrichissement seed (30 bénévoles fictifs, +shifts), audit RGPD 15 points, tests Vitest sur les Edge fns, génération types BDD, fix éventuels bugs SQL.
