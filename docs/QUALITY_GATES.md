# Quality Gates — Easyfest V0

À cocher avant la mise en prod finale (samedi 3 mai 2026 23h59).

## Gates obligatoires

```
□ 1.  Toutes les tables ont RLS activée
□ 2.  Aucune référence service_role_key dans bundles client
□ 3.  Aucune référence QR_HMAC_SECRET dans bundles client
□ 4.  Bundle mobile < 5 Mo
□ 5.  Lighthouse vitrine ≥ 95 perf, ≥ 95 SEO, ≥ 95 a11y
□ 6.  Vitrine lit sans JS (au moins la lecture des pages)
□ 7.  Formulaire signup en 3G (Chrome throttling)
□ 8.  Parcours E2E Playwright vert sur 5 rôles
□ 9.  Sentry init front + edge + mobile, PII scrubber actif
□ 10. DPA Supabase EU mention dans /legal/privacy
□ 11. Charte + anti-harcèlement signés 2 fois
□ 12. Edge fn qr_verify détecte rejouage (test unitaire)
□ 13. Audit log immuable
□ 14. APK Android signé buildable via eas build
□ 15. README démo Pam à jour
```

## Comment vérifier (commandes)

```bash
# Gate 1 — RLS
psql $SUPABASE_DB_URL -c "
  select schemaname, tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
  order by tablename;
" | grep -v "rowsecurity = t" | grep -E "^public" && echo "❌ TABLES SANS RLS" || echo "✅ RLS partout"

# Gates 2-3 — leak secrets
grep -RIn "SUPABASE_SERVICE_ROLE_KEY\|QR_HMAC_SECRET" apps/vitrine/.next/static apps/vitrine/.next/server 2>/dev/null \
  | grep -v ".map$" \
  && echo "❌ SECRETS LEAKED" || echo "✅ pas de leak"

# Gate 4 — bundle mobile
du -sh apps/mobile/dist | awk '{print $1}'

# Gate 5 — Lighthouse
npx lighthouse https://easyfest.app --only-categories=performance,seo,accessibility \
  --chrome-flags="--headless" --output=json --output-path=./lh.json
cat lh.json | jq '.categories | { perf: .performance.score, seo: .seo.score, a11y: .accessibility.score }'

# Gate 7 — 3G test (manuel via Chrome DevTools)
#   1. Ouvrir https://easyfest.app/icmpaca/rdl-2026/inscription
#   2. DevTools > Network > Throttling = "Slow 3G"
#   3. Remplir et soumettre — doit passer en < 30s

# Gate 8 — Playwright E2E
pnpm test:e2e

# Gate 12 — qr_verify test unitaire
cd packages/db/supabase/functions/qr_verify && deno test --allow-all

# Gate 14 — APK
cd apps/mobile && eas build --platform android --profile preview --non-interactive
```
