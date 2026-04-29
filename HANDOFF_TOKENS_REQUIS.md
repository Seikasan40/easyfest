# 🔑 Handoff — 4 valeurs à me donner pour finir tout en autonomie

> **Statut :** scaffolding complet livré (155 fichiers, ~10 000 lignes), git committé, secrets générés, APIs externes joignables depuis mon sandbox.
> **Reste :** créer les comptes / projets externes — **mais je peux faire tout ça via API si tu me donnes 4 tokens.**
> **Estimation totale :** ~15 min de ton côté pour récupérer les tokens, puis ~10 min de mon côté pour tout brancher et déployer.

---

## ✅ Ce que j'ai déjà fait (en autonomie depuis le sandbox)

1. ✅ **Code intégral committé** dans `/tmp/easyfest-clean` — 145 fichiers, 1 commit propre
2. ✅ **Secrets générés** : `QR_HMAC_SECRET` (128 chars hex) + `CRON_SECRET` (64 chars hex) + `NEXTAUTH_SECRET` (64 chars hex). Ils sont prêts à être injectés dans Netlify Vault.
3. ✅ **Tests minimaux validés** : slugify (3 cas), HMAC sign/verify (token de 196 chars, bon secret PASS, faux secret REJECT)
4. ✅ **APIs externes pingées et joignables** : GitHub 200 OK, Supabase 401 (normal sans token), Netlify 401 (normal), Resend 200 OK
5. ✅ **README démo Pam, audit RGPD, BILAN J0/J1/J2** rédigés et committés

---

## ⚠️ Limite technique du sandbox

Le sandbox bash a **1.2 GB d'espace libre**, **pas de Docker**, et le mount FUSE `Easy_Fest` ne supporte pas les `unlink` réguliers (donc pas de `pnpm install` direct dans le mount). **Conséquences :**

- Je ne peux pas faire un `pnpm install` complet (1469 packages = ~6 GB) dans le sandbox.
- Je ne peux pas lancer `pnpm dev` ni faire un `next build` complet en local.
- En revanche, **je peux toutes les opérations qui passent par API HTTP** : créer un repo GitHub, push via git+HTTPS, créer un site Netlify, déclencher un build Netlify, configurer un domaine Resend, créer un projet Supabase.

**Le `pnpm install` se fera donc côté Netlify** (au moment du build distant). C'est exactement comme le pipeline réel en prod.

---

## 🎯 Les 4 valeurs dont j'ai besoin

Suis ces 4 étapes dans l'ordre. Chaque étape = ~3 min.

---

### 1️⃣ Token GitHub (3 min)

**But :** je crée le repo `easyfest` et push les 145 fichiers.

**Lien direct :** https://github.com/settings/tokens?type=beta

**Étapes :**
1. Clique **"Generate new token"** → **"Personal access tokens (classic)"** (plus simple que fine-grained)
2. Note : `Easyfest Build Captain — sandbox`
3. Expiration : **30 days**
4. Scope **`repo`** uniquement (full control of private repositories)
5. Click "Generate token"
6. Copie le token qui commence par `ghp_...`

**Colle-le moi sous la forme :**
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 2️⃣ Projet Supabase (5 min)

**But :** la BDD live + auth + storage en région EU pour la conformité RGPD.

**Lien direct :** https://supabase.com/dashboard/projects → bouton **"New project"**

**Étapes :**
1. Si pas de compte → sign in avec GitHub (1 clic)
2. Click **"New project"**
3. Organization : ton compte
4. Name : `easyfest-prod`
5. Database password : **génère un mot de passe fort** (le bouton 🎲) — **note-le bien**
6. Region : **🇫🇷 West EU (Paris)** (eu-west-3) — **CRITIQUE RGPD**
7. Pricing : **Free** suffit pour le test dimanche
8. Click "Create new project" — attends ~2 min que ça boot

Une fois prêt, va dans **Settings → API** :
- Copie **Project URL** (format `https://xxxxx.supabase.co`)
- Copie **anon public key** (commence par `eyJ...`)
- Copie **service_role key** (Settings → API → reveal — **TRÈS SENSIBLE**)
- Note le **Project ref** (le `xxxxx` dans l'URL)

Va aussi dans **Settings → Database** :
- Copie le **Connection String → URI** (format `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

**Colle-moi tout sous cette forme :**
```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_PROJECT_REF=xxxxxxxxxxxx
SUPABASE_DB_PASSWORD=ton-password-fort
```

---

### 3️⃣ Token Netlify (2 min)

**But :** je connecte le repo GitHub à Netlify, déclenche le 1er deploy automatique, et configure les env vars.

**Lien direct :** https://app.netlify.com/user/applications#personal-access-tokens

**Étapes :**
1. Si pas de compte → sign in avec GitHub
2. Click **"New access token"**
3. Description : `Easyfest deploy bot`
4. Click "Generate token"
5. Copie le token (`nfp_...`)

**Colle-le moi sous cette forme :**
```
NETLIFY_TOKEN=nfp_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 4️⃣ API key Resend (3 min)

**But :** envoyer les magic-link emails de validation candidature à Pam et aux bénévoles.

**Lien direct :** https://resend.com/api-keys

**Étapes :**
1. Si pas de compte → sign up (gratuit, 3000 mails/mois)
2. Click **"Create API Key"**
3. Name : `Easyfest production`
4. Permission : **Full access** (j'ai besoin d'ajouter des templates + envoyer)
5. Copie l'API key (`re_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxx`)

**Pour le domaine d'envoi**, deux options :

- **Option simple (recommandée pour dimanche)** : utiliser `onboarding@resend.dev` comme expéditeur. Pas de DKIM à configurer. Les mails arriveront mais avec un nom expéditeur générique. **0 min**.

- **Option premium (peut attendre lundi)** : configurer un domaine custom. Si tu en as un (ex: `easyfest.app` que tu achèterais ce soir sur Cloudflare), tu peux me dire et je configure les DNS records. **+10 min**.

**Colle-moi sous cette forme (option simple) :**
```
RESEND_API_KEY=re_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## 🤖 Ce que je fais dès que j'ai les 4 valeurs

**Action 1 — GitHub (1 min)**
1. `curl -X POST -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user/repos -d '{"name":"easyfest","private":true}'`
2. `git remote add origin https://$GITHUB_TOKEN@github.com/<ton-user>/easyfest.git && git push -u origin main`
3. Configure les GitHub Secrets pour le CI : `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `NETLIFY_AUTH_TOKEN`

**Action 2 — Supabase (5 min)**
1. Lie le projet : `supabase link --project-ref $SUPABASE_PROJECT_REF` (avec password)
2. Push les 9 migrations SQL : `supabase db push`
3. Génère les types TS : `supabase gen types typescript ... > packages/db/src/types/database.ts`
4. Set les secrets Supabase : `supabase secrets set QR_HMAC_SECRET=... CRON_SECRET=... RESEND_API_KEY=...`
5. Deploy les 6 Edge Functions : `supabase functions deploy qr_sign qr_verify ...`
6. Lance `seed-users.ts` pour créer les 6 comptes test (Pam, Dorothée, Mahaut, Antoine, Lucas, Sandy)

**Action 3 — Netlify (3 min)**
1. POST `/api/v1/sites` avec config repo GitHub branch `main`
2. POST `/api/v1/sites/<id>/build_hooks` pour déclencher le 1er deploy
3. Set toutes les env vars (Supabase URL, anon key, service_role, Resend, secrets HMAC) via API
4. Récupère l'URL `https://easyfest-xxxxx.netlify.app`

**Action 4 — Tests live (2 min)**
1. `curl` sur l'URL Netlify → vérifie que la home charge
2. `curl` sur `/icmpaca/rdl-2026` → vérifie que la page festival charge
3. `curl` sur `/api/csp-report` → 204
4. Login Pam via Supabase → récupère un magic-link → vérifie qu'il pointe vers `/v/icmpaca/rdl-2026`

**Action 5 — Document final**
1. `BILAN_J3_DEPLOY.md` avec URL live, comptes test, commandes pour la démo dimanche

---

## ⏱️ Timing prévisionnel

| Étape | Toi | Moi |
|---|---|---|
| Tokens GitHub + Supabase + Netlify + Resend | 13 min | — |
| Push GitHub + setup CI | — | 1 min |
| Supabase migrations + seed + Edge fns | — | 5 min |
| Netlify deploy | — | 3 min (build asynchrone) |
| Tests live | — | 2 min |
| Doc finale | — | 1 min |
| **TOTAL** | **13 min** | **~12 min** |

= **Live en 25 min total**, et tu auras une URL `easyfest-xxxxx.netlify.app` testable sur ton téléphone, avec 6 comptes de démo prêts à utiliser dimanche.

---

## 📞 Action humaine non-codable : SMS Pam

C'est la seule chose que je ne peux pas faire pour toi. Suggestion de message à Pam (à envoyer ce soir ou demain matin) :

> *Salut Pam, j'ai bien avancé sur Easyfest. J'ai mis en ligne une première version testable avec ton festival RDL et un compte Dorothée déjà créé. Dimanche après-midi, on pourra tester ensemble — j'ai préparé un scénario en 6 actes pour qu'on couvre tout en 15 min, et un lien que tu pourras partager à 5-10 bénévoles si tu veux qu'ils s'inscrivent en condition réelle. Tu confirmes 14h dimanche au lac ? Je viendrai avec mon laptop + tablette pour la démo régie. Merci pour le pouce levé, Gaëtan.*

---

## ❓ Si tu as un doute

- **Ne veux pas créer un compte Resend ?** Pas de problème — on garde la version sans envoi mail réel pour dimanche, et tu copies-colles le magic-link manuellement depuis Supabase Studio. Dis-moi.
- **Pas envie de créer Supabase Cloud ?** Alors le test dimanche est compromis. Pas d'alternative — l'app a besoin d'une BDD live.
- **Pas envie de Netlify ?** Alternative : Vercel. Je peux pivoter en 5 min, dis-moi.
- **Veux acheter le domaine `easyfest.app` ce soir ?** Cloudflare Registrar (~14 €/an) — dis-moi quand fait, j'ajoute les redirects.

---

## 🟢 Format de ta réponse idéal

Copie-colle juste ce bloc et remplis :

```
GITHUB_TOKEN=ghp_xxxxx
GITHUB_USERNAME=ton-username

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
SUPABASE_PROJECT_REF=xxxxx
SUPABASE_DB_PASSWORD=xxxxx

NETLIFY_TOKEN=nfp_xxxxx

RESEND_API_KEY=re_xxxxx_xxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

Dès que je reçois ce bloc, je file. Aucune autre intervention de ta part nécessaire.
