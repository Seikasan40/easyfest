# Cleanup BDD post-audit — 2 mai 2026 (Cowork)

> Liste des traces de tests à supprimer. Claude Code génère le SQL DRY-RUN d'abord (counts), demande validation user, puis exécute DELETE.

## Organisations à supprimer (cascade events + memberships + applications)
Patterns slugs créés pendant audits récents :
- slug LIKE `audit-%` (audit-extreme-T1-asso, audit-final-asso, audit-j26-asso)
- slug LIKE `audit10-%` (audit10-asso)

⚠️ **Vérifier avant DELETE** : que `icmpaca` et `zik-en-paca` (RDL2026 réel) ne matchent PAS ces patterns.

## Volunteer applications à supprimer
- email LIKE `easyfest-extreme-%@mailinator.com`
- email LIKE `easyfest-audit%@mailinator.com`
- email = `easyfest-audit-final-j26@mailinator.com`
- email = `easyfest-audit10-j26@mailinator.com`
- email = `easyfest-extreme-t1@mailinator.com`

## Auth users orphelins
Après cleanup applications, supprimer auth.users avec :
- email LIKE `easyfest-extreme-%@mailinator.com`
- email LIKE `easyfest-audit%@mailinator.com`

⚠️ NE PAS supprimer les comptes demo `*@easyfest.test` (pam, sandy, dorothee, mahaut, lucas, antoine).

## Sponsors à supprimer (si testés en T9)
- name ILIKE `%audit%`
- name ILIKE `%extreme%`

## Safer alerts à supprimer (créées pendant tests E2E précédents)
- description ILIKE `%test e2e audit%`
- description ILIKE `%audit fictive%`
- description ILIKE `%harcelement test%`
- description ILIKE `%audit J-26%`

## Wellbeing reports
- comment ILIKE `%audit%` (si applicable, sinon skip)
- ⚠️ Garder les vrais reports volunteers s'il y en a (vérifier avant)

## Pending festival requests
- email LIKE `easyfest-extreme-%@mailinator.com`
- email LIKE `easyfest-audit%@mailinator.com`
- org_slug LIKE `audit-%`

## Broadcasts messages
- content ILIKE `%test e2e audit%`
- content ILIKE `%audit extreme%`
- content ILIKE `%à supprimer apres test%`

## ⚠️ Procédure obligatoire (consigne user explicite)

1. Claude Code génère un script SQL DRY-RUN qui fait `SELECT count(*)` pour chaque pattern ci-dessus
2. Claude Code POSE `.env.deploy.local` à la racine (déjà présent)
3. Claude Code se RELANCE auprès du user pour montrer les counts
4. User valide explicitement (ou demande ajustement)
5. Claude Code exécute le DELETE en transaction (BEGIN ... COMMIT)
6. Vérification finale via Supabase Studio ou pgAdmin

**Pas de DELETE sans validation user. Pas de cascade sans count préalable.**

---

## ✅ EXÉCUTION (Claude Code · 3 mai 2026, ~01h05 UTC)

DRY-RUN counts via Supabase Management API (script
[`scripts/_cleanup_audit_traces_dryrun.sql`](scripts/_cleanup_audit_traces_dryrun.sql)) :

| Cible | Count |
|---|---:|
| organizations (audit-% / audit10-%) | 0 |
| volunteer_applications (mailinator audit) | 0 |
| auth.users (mailinator audit) | 0 |
| sponsors (audit / extreme) | 0 |
| safer_alerts (test e2e / audit) | 0 |
| pending_festival_requests | **2** |
| messages (broadcast audit) | 0 |
| 🛡️ SAFETY: real RDL orgs in pattern | 0 ✓ |
| 🛡️ SAFETY: demo @easyfest.test in pattern | 0 ✓ |

User a validé → DELETE exécuté sur les 2 lignes :

- `10e8b909-…` `audit-final-asso` `easyfest-audit-final-j26@mailinator.com`
- `e89db0e7-…` `audit10-asso` `easyfest-audit10-j26@mailinator.com`

**Recount post-DELETE : 0 ligne match les patterns audit.** ✓

> Note : la table `broadcast_messages` listée dans la spec initiale n'existe
> pas — la table réelle est `messages` avec un flag `is_broadcast`. Filtre
> ajusté en conséquence dans le script de DRY-RUN.
