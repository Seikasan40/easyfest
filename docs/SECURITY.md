# Security — Easyfest

## Quality Gates avant déploiement final (J4 samedi 3 mai)

Liste figée — **chaque case doit être cochée avant la mise en prod**.

```
[ ] 1.  Toutes les tables Postgres ont RLS activée (vérifié par requête pg_tables)
[ ] 2.  Aucune référence à SUPABASE_SERVICE_ROLE_KEY dans les bundles client (CI grep)
[ ] 3.  Aucune référence à QR_HMAC_SECRET côté client
[ ] 4.  Bundle mobile < 5 Mo (Expo)
[ ] 5.  Lighthouse vitrine ≥ 95 perf, ≥ 95 SEO, ≥ 95 a11y
[ ] 6.  Vitrine fonctionne sans JS (au moins la lecture)
[ ] 7.  Formulaire signup fonctionne en 3G (throttling Chrome DevTools)
[ ] 8.  Parcours E2E Playwright vert sur 5 rôles
[ ] 9.  Sentry initialisé front + edge + mobile, scrubber PII actif
[ ] 10. DPA Supabase EU mentionné dans /legal/privacy
[ ] 11. Politique anti-harcèlement et charte affichées 2 fois (signup + accueil app)
[ ] 12. Edge fn qr_verify détecte le rejouage (test unitaire)
[ ] 13. Audit log immuable (no update / no delete via RLS)
[ ] 14. APK Android signé buildable via `eas build`
[ ] 15. README de démo Pam à jour avec URL + 3 comptes test (Pam, Mahaut, Dorothée)
```

## Architecture sécurité

### RLS Postgres (ligne de défense #1)

Toutes les tables ont RLS activée dès la migration initiale.
La policy par défaut est **refus** — les policies explicites listées dans
`packages/db/supabase/migrations/20260430000007_rls_policies.sql` autorisent par rôle.

### Service role key

`SUPABASE_SERVICE_ROLE_KEY` n'apparaît **que** dans :
- Edge Functions Deno (`packages/db/supabase/functions/*/index.ts`)
- Server Actions Next.js (côté serveur uniquement, jamais dans un Client Component)
- Scripts admin / CI

CI (GitHub Actions) bloque tout merge où la chaîne `SUPABASE_SERVICE_ROLE_KEY`
apparaît dans `apps/vitrine/.next/static` ou `apps/vitrine/.next/server`.

### QR codes — anti-fraude

- Token = `base64url(payload).hmac_sha256(payload, QR_HMAC_SECRET)`
- Payload : `{v, vid, eid, exp, iat, n}` avec `n` = nonce 16 bytes
- Edge fn `qr_verify` :
  1. Vérifie la signature HMAC
  2. Vérifie l'expiration
  3. Pour `arrival` : refuse si déjà scanné dans la journée (anti-fraude bracelet)
  4. Pour `meal`/`post_take` : marque `is_replay=true` si nonce déjà vu
  5. Insère TOUJOURS dans `scan_events` (audit trail)

### MFA TOTP

Activé pour rôles `direction` + `volunteer_lead` à partir du 15 juin.
En V0 (test dimanche), magic-link seul. Acceptable pour scope 5-10 testeurs.

### RGPD

- DPA Supabase EU (région eu-west-3 paris) signé le 29 avril 2026
- Cron mensuel `rgpd_purge` : anonymise les profils > 12 mois post-event
- Page `/legal/privacy` versioned (`PRIVACY_POLICY_VERSION`)
- Consentements horodatés dans `volunteer_applications.consent_*_at`
- Mineurs : workflow autorisation parentale upload (champ `parental_auth_url`)

### Anti-bot

Cloudflare Turnstile sur le formulaire d'inscription public.
Site key publique + secret key serveur.
Fallback : si secret = placeholder dev, accepte (mais log warning).

### Logs

- Sentry : `beforeSend` scrub `phone`, `email`, `birth_date`, `address_*`, `diet_notes`, `parental_auth_url`
- Postgres `audit_log` : append-only via RLS (no update / no delete)
- `notification_log` : tracé envois mail (Resend message_id) pour compliance

## Vecteurs d'attaque évalués

| # | Vecteur | Mitigation |
|---|---|---|
| V1 | Inscription faux bénévole pour scraper liste | RLS stricte : 1 bénévole ne voit que son profil + nom de son resp. |
| V2 | Vol device responsable | MFA TOTP + logout auto 1h inactivité (post-15 juin) |
| V3 | Phishing magic-link | Mail clair "Si tu n'as pas demandé ce lien, ignore-le". TTL 24h |
| V4 | Brute-force OTP SMS | Pas d'OTP V1. Magic-link rate-limit 3/h/email |
| V5 | Vol QR bénévole (screenshot) | Nonce + détection rejouage Edge fn |
| V6 | Injection SQL | Supabase param. requests + Zod validation |
| V7 | XSS via fil d'actu | DOMPurify + CSP stricte |
| V8 | Scraping API anon key | Cloudflare Turnstile + rate-limit Supabase |
| V9 | Reverse-engineering bundle mobile | Pas de logique métier sensible côté client |
| V10 | Fuite PII via Sentry | beforeSend scrubber (cf above) |
| V11 | Compromission Stripe Connect | Webhook signature vérifiée (V2 only) |
| V12 | Vol idée/design | Repo privé, pas de doc publique modèle données |
