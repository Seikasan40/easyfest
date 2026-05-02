-- ════════════════════════════════════════════════════════════════════
-- DRY-RUN Cleanup BDD post-audit — 3 mai 2026
-- Source : CLEANUP_DB_AUDIT.md (Cowork)
--
-- ⚠️ READ-ONLY : aucun DELETE ici, uniquement des SELECT count(*).
-- À exécuter contre la prod via Supabase Management API.
-- Présenter les counts au user pour validation explicite avant DELETE.
-- ════════════════════════════════════════════════════════════════════

-- 1. Organizations test (cascade events + memberships + applications)
SELECT 'organizations'::text AS table_name,
       count(*)::int AS to_delete
FROM organizations
WHERE slug LIKE 'audit-%' OR slug LIKE 'audit10-%';

-- 2. Volunteer applications mailinator (orphans après cleanup orgs)
SELECT 'volunteer_applications'::text AS table_name,
       count(*)::int AS to_delete
FROM volunteer_applications
WHERE email LIKE 'easyfest-extreme-%@mailinator.com'
   OR email LIKE 'easyfest-audit%@mailinator.com';

-- 3. Auth users orphelins mailinator
SELECT 'auth.users'::text AS table_name,
       count(*)::int AS to_delete
FROM auth.users
WHERE email LIKE 'easyfest-extreme-%@mailinator.com'
   OR email LIKE 'easyfest-audit%@mailinator.com';

-- 4. Sponsors test
SELECT 'sponsors'::text AS table_name,
       count(*)::int AS to_delete
FROM sponsors
WHERE name ILIKE '%audit%' OR name ILIKE '%extreme%';

-- 5. Safer alerts test
SELECT 'safer_alerts'::text AS table_name,
       count(*)::int AS to_delete
FROM safer_alerts
WHERE description ILIKE '%test e2e audit%'
   OR description ILIKE '%audit fictive%'
   OR description ILIKE '%harcelement test%'
   OR description ILIKE '%audit J-26%';

-- 6. Pending festival requests
SELECT 'pending_festival_requests'::text AS table_name,
       count(*)::int AS to_delete
FROM pending_festival_requests
WHERE org_slug LIKE 'audit-%'
   OR email LIKE 'easyfest-extreme-%@mailinator.com'
   OR email LIKE 'easyfest-audit%@mailinator.com';

-- 7. Messages broadcast (table `messages`, filtre is_broadcast=true)
-- Note Cowork CLEANUP_DB_AUDIT.md mentionnait `broadcast_messages` qui n'existe pas
-- en realite ; la table reelle est `messages` avec un flag is_broadcast.
SELECT 'messages'::text AS table_name,
       count(*)::int AS to_delete
FROM messages
WHERE (content ILIKE '%test e2e audit%'
   OR content ILIKE '%audit extreme%'
   OR content ILIKE '%à supprimer apres test%');

-- 8. SAFETY CHECK : confirmer que les orgs RDL2026 réelles ne sont PAS dans le pattern
SELECT 'SAFETY_real_orgs_kept'::text AS table_name,
       count(*)::int AS would_be_deleted
FROM organizations
WHERE (slug LIKE 'audit-%' OR slug LIKE 'audit10-%')
  AND slug IN ('icmpaca', 'zik-en-paca');

-- 9. SAFETY CHECK : auth.users demo @easyfest.test ne sont pas dans le pattern audit
SELECT 'SAFETY_demo_users_kept'::text AS table_name,
       count(*)::int AS would_be_deleted
FROM auth.users
WHERE email LIKE '%@easyfest.test'
  AND (email LIKE 'easyfest-extreme-%@mailinator.com'
       OR email LIKE 'easyfest-audit%@mailinator.com');
