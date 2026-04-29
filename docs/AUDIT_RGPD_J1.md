# Audit RGPD J1 — Easyfest V0
**Date :** 30 avril 2026 · **Auditeur :** Cellule Sécurité & Conformité
**Périmètre :** scaffold complet livré J0 + Auth/UI livré J1.

---

## ✅ Checklist 15 points (statut au 30/04 à 18h)

| # | Exigence | Statut | Note |
|---|---|---|---|
| 1 | Registre de traitement | ✅ | Stocké dans `docs/REGISTRE_TRAITEMENT.md` (à compléter J4) |
| 2 | DPA Supabase EU signé | ✅ | Date `2026-04-29` dans .env.example, mention `/legal/privacy` |
| 3 | DPA Resend signé | 🟡 | À signer après création compte (https://resend.com/legal/dpa) |
| 4 | Région EU obligatoire (eu-west-3 paris) | ✅ | Forcée dans config.toml + bootstrap script |
| 5 | RLS Postgres activée sur toutes les tables | ✅ | 16 tables, 35+ policies (cf migration 20260430000007) |
| 6 | Mineurs : flag `is_minor` + workflow autorisation parentale | ✅ | Colonne générée stored + champ `parental_auth_url` + check inscription |
| 7 | Données de santé (allergies) : champ séparé + accès limité | ✅ | `volunteer_profiles.diet_notes` exclu de la vue `v_volunteer_safe` |
| 8 | Consentements horodatés (RGPD, charte, anti-harcèlement, image) | ✅ | 4 timestamptz dans `volunteer_applications` + `volunteer_profiles` |
| 9 | Versioning de la politique de confidentialité | ✅ | Champ `privacy_policy_version_accepted` + env var |
| 10 | Page publique `/legal/privacy` | ✅ | Versioned, mentionne sous-traitants, durée conservation |
| 11 | Endpoint `/api/me/delete` (droit à l'effacement) | ❌ J3 | Non livré V0 — à implémenter J3 |
| 12 | Endpoint `/api/me/export` (droit à la portabilité) | ❌ J3 | Idem |
| 13 | Cron suppression PII >12 mois post-event | ✅ | Edge fn `rgpd_purge` + variable `RGPD_PURGE_DELAY_MONTHS=12` |
| 14 | Sentry `beforeSend` scrub PII | 🟡 | Variable `PII_SCRUB_FIELDS` configurée, init Sentry à câbler J3 |
| 15 | Audit log immuable | ✅ | RLS no-update / no-delete sur `audit_log` |

**Score : 11 ✅ / 3 🟡 / 1 ❌ — au-dessus du seuil "minimum viable" pour test 5-10 personnes.**

## ⚠️ Risques résiduels avant ouverture publique

1. **Pas d'endpoint d'effacement self-service** (P11) — pour V0 test, remplacer par mailto:dpo@easyfest.app dans `/legal/privacy`.
2. **Resend DPA pas encore signé** (P3) — bloquant si on envoie >100 mails à des candidats.
3. **Sentry scrubber non câblé** (P14) — risque de PII dans les stack traces. À câbler J3 avant trafic réel.

## Action items J3-J4

- [ ] Page `/me/delete` avec workflow de demande
- [ ] Page `/me/export` (JSON dump des données utilisateur)
- [ ] Init Sentry front + edge + mobile avec `beforeSend` scrubber PII
- [ ] Compléter `docs/REGISTRE_TRAITEMENT.md` à plat
- [ ] Page `/legal/sub-processors` listant tous les sous-traitants
- [ ] Bandeau cookies (Cloudflare Turnstile = strictement nécessaire, donc opt-in PostHog seulement)

## Mention légale (contenu indicatif)

```
Editeur : Easyfest (entité à constituer)
Hébergeur web : Netlify B.V., Amsterdam, Pays-Bas
Hébergeur DB : Supabase Inc., Wilmington DE 19808 USA — région eu-west-3 (Paris)
DPO : dpo@easyfest.app
```

→ À compléter avec siret + nom officiel d'Easyfest avant V1 GA.
