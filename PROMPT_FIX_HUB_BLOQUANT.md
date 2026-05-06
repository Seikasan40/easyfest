# 🚨 PROMPT FIX URGENT — Bug #18 BLOQUANT /hub vide pour TOUS

> **Contexte** : User a découvert en mobile + Cowork a confirmé en desktop que `/hub` affiche "Salut bénévole 👋 / Tu n'as pas encore d'affectation active" pour **tous les comptes** (Pamela direction, Lucas volunteer, Sandy multi-rôle, etc.) malgré leurs memberships actives en BDD. Le tag `audit-mobile-first-validated-final-20260503-1738` est INVALIDE — l'app est essentiellement cassée pour tous les utilisateurs authentifiés.
>
> **À lancer dans Claude Code immédiatement, terminal sur `E:\Easy_Fest\Easy_Fest\easyfest`, branche `main`. ZÉRO interaction user. Tout pré-autorisé. Push & deploy autorisés.**
>
> **Estimation : 30-45 min**

---

## 🎯 Symptôme reproduit

| Source | Test | Résultat |
|---|---|---|
| User téléphone (4G) | Login → /hub | "Salut bénévole / Tu n'as pas encore d'affectation active" |
| Cowork desktop Chrome | Login Pamela `pam@easyfest.test` / `easyfest-demo-2026` | Idem (et redirect /regie/.../* → /hub) |
| BDD (Management API) | `select * from memberships where user_id=Pamela and is_active=true` | 1 ligne `direction RDL2026 ZIK en PACA` ✅ |

## 🎯 Root cause

`apps/vitrine/app/hub/page.tsx` lignes 30-40 utilise embed PostgREST imbriqué qui échoue silencieusement :

```typescript
const { data: memberships } = await supabase  // ❌ Pas de `error` destructuré
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

C'est **exactement le même pattern** que les Bugs #6, #8, #9, #13 déjà fixés sur d'autres pages. Le hub a été oublié dans l'audit exhaustif.

Quand l'embed échoue (FK ambiguë, RLS chaîne cassée, etc.), `data = null` (ou `[]`), le code passe dans la branche `if (!memberships || memberships.length === 0)` ligne 47 → écran "Salut bénévole" affiché. **L'erreur n'est jamais loggée** car `error` n'est pas destructuré du retour.

## 🛠️ Fix obligatoire

### Étape 1 — Refactor `apps/vitrine/app/hub/page.tsx`

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";

import { ROLE_CARDS_ORDER, ROLE_DEFINITIONS, type RoleKind } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";
import { onboardCurrentUser } from "@/app/actions/onboard";

const EMOJI: Record<RoleKind, string> = {
  volunteer: "🎟️",
  post_lead: "🧑‍🤝‍🧑",
  staff_scan: "📷",
  volunteer_lead: "📋",
  direction: "🎛️",
};

export default async function HubPage() {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?redirect=/hub");

  // Upgrade auto si applications validées sans membership
  await onboardCurrentUser();

  // 1️⃣ Memberships SEULES (aucun embed — split queries pattern)
  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("role, position_id, event_id, is_entry_scanner, is_mediator, is_active")
    .eq("user_id", userData.user.id)
    .eq("is_active", true);

  if (memErr) {
    // Log explicite — ne plus échouer silencieusement
    console.error("[HubPage] memberships fetch failed:", memErr);
  }

  // 2️⃣ Events séparés (in.list)
  const eventIds = Array.from(new Set((memberships ?? []).map((m: any) => m.event_id).filter(Boolean)));
  const { data: events, error: evErr } = eventIds.length > 0
    ? await supabase.from("events").select("id, name, slug, organization_id").in("id", eventIds)
    : { data: [] as any[], error: null };
  if (evErr) console.error("[HubPage] events fetch failed:", evErr);

  // 3️⃣ Organizations séparées
  const orgIds = Array.from(new Set((events ?? []).map((e: any) => e.organization_id).filter(Boolean)));
  const { data: orgs, error: orgErr } = orgIds.length > 0
    ? await supabase.from("organizations").select("id, slug, name").in("id", orgIds)
    : { data: [] as any[], error: null };
  if (orgErr) console.error("[HubPage] orgs fetch failed:", orgErr);

  // 4️⃣ Positions séparées
  const posIds = Array.from(new Set((memberships ?? []).map((m: any) => m.position_id).filter(Boolean)));
  const { data: positions, error: posErr } = posIds.length > 0
    ? await supabase.from("positions").select("id, name").in("id", posIds)
    : { data: [] as any[], error: null };
  if (posErr) console.error("[HubPage] positions fetch failed:", posErr);

  // 5️⃣ Profile pour first_name
  const { data: profile } = await supabase
    .from("volunteer_profiles")
    .select("first_name, full_name")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "bénévole";

  // 6️⃣ Merge JS-side via Map<id, ...>
  const eventsById = new Map((events ?? []).map((e: any) => [e.id, e]));
  const orgsById = new Map((orgs ?? []).map((o: any) => [o.id, o]));
  const posById = new Map((positions ?? []).map((p: any) => [p.id, p]));

  const enrichedMemberships = (memberships ?? []).map((m: any) => {
    const event = eventsById.get(m.event_id) as any;
    const organization = event ? orgsById.get(event.organization_id) : null;
    return {
      ...m,
      event: event ? { id: event.id, name: event.name, slug: event.slug, organization } : null,
      position: m.position_id ? posById.get(m.position_id) : null,
    };
  });

  // Branche "pas encore d'affectation"
  if (enrichedMemberships.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
        <p className="text-3xl">⏳</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Salut {firstName} 👋</h1>
        <p className="mt-2 text-center text-brand-ink/70">
          Tu n'as pas encore d'affectation active. L'équipe revient vers toi dès que ton
          rôle est confirmé.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <Link href="/account/privacy" className="text-sm text-brand-ink/60 underline">
            Mes données et vie privée
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              aria-label="Se déconnecter d'Easyfest"
              className="rounded-lg px-3 py-2 text-sm font-medium text-brand-ink/60 underline transition hover:bg-brand-ink/5 hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-coral"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Branche "cartes de rôles" (existante, juste replace memberships par enrichedMemberships)
  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-coral">
          Easyfest
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">Salut {firstName} 👋</h1>
        <p className="mt-2 text-sm text-brand-ink/70">
          Choisis ton rôle pour entrer dans l'app.
        </p>
      </header>

      <ul className="space-y-3" data-role-cards>
        {ROLE_CARDS_ORDER.flatMap((roleCode) => {
          const matches = enrichedMemberships.filter((m: any) => m.role === roleCode);
          return matches.map((m: any) => {
            const def = ROLE_DEFINITIONS[roleCode];
            const orgSlug = m.event?.organization?.slug;
            const eventSlug = m.event?.slug;
            const subtitle = def.subtitleTemplate
              .replace("{firstName}", firstName)
              .replace("{positionName}", m.position?.name ?? "tous postes");

            return (
              <li key={`${roleCode}-${m.event?.id}`} data-role-card>
                {/* ... existing JSX ... */}
              </li>
            );
          });
        })}
      </ul>
    </main>
  );
}
```

### Étape 2 — Audit similaire des autres embed imbriqués oubliés

```bash
# Trouver tous les embed PostgREST double-niveau qui pourraient être cassés
grep -rEn ":\w+_id\s*\([^)]+:\w+_id" apps/vitrine/app/ apps/vitrine/components/ --include="*.tsx" --include="*.ts" | tee /tmp/embeds_doubles.txt
```

Pour chaque résultat, vérifier si le pattern `parent:fk (... grandparent:fk2 (...))` est utilisé. Tout embed double-niveau est suspect — appliquer le même split + merge.

**Cas connus à vérifier** :
- `apps/vitrine/app/[orgSlug]/[eventSlug]/page.tsx` — page publique festival
- `apps/vitrine/app/[orgSlug]/[eventSlug]/inscription/page.tsx`
- `apps/vitrine/app/account/privacy/page.tsx`
- `apps/vitrine/app/v/[orgSlug]/[eventSlug]/preferences/page.tsx`
- `apps/vitrine/components/SponsorsBoard.tsx`
- Toute autre page qui demande des relations imbriquées

### Étape 3 — Tests Vitest pour la nouvelle logique split

```typescript
// apps/vitrine/__tests__/hub.test.ts
import { describe, it, expect } from 'vitest';
import { fetchHubMemberships } from '@/app/hub/page';  // exporter la fonction si pas déjà fait

describe('Hub memberships fetch (split queries)', () => {
  it('returns enriched memberships with event + organization + position', async () => {
    const result = await fetchHubMemberships(PAMELA_USER_ID);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].event).toBeTruthy();
    expect(result[0].event.organization).toBeTruthy();
    expect(result[0].event.organization.slug).toBe('icmpaca');
  });

  it('returns empty array if user has no active membership', async () => {
    const result = await fetchHubMemberships(NEW_USER_ID);
    expect(result).toEqual([]);
  });

  it('logs error if events fetch fails (graceful degradation)', async () => {
    // mock Supabase to return error
    // verify console.error was called
  });
});
```

### Étape 4 — Test Playwright contenu sémantique (combat le faux positif Phase 4 V6)

Le test mobile-visual qui a passé vert sur /hub était insuffisant. Ajouter un test contenu :

```typescript
// apps/vitrine/e2e/hub-content.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Hub content for authenticated users', () => {
  test('Pamela direction sees regie card', async ({ page }) => {
    await page.goto('https://easyfest.app/auth/login');
    await page.fill('input[type=email]', 'pam@easyfest.test');
    await page.fill('input[type=password]', 'easyfest-demo-2026');
    await page.press('input[type=password]', 'Enter');
    await page.waitForURL('**/hub', { timeout: 10000 });
    
    // Vérifier qu'il y a au moins 1 carte de rôle
    const roleCards = page.locator('[data-role-card]');
    await expect(roleCards.first()).toBeVisible();
    
    // Vérifier que l'écran "pas encore d'affectation" n'est PAS affiché
    const notReadyMsg = page.locator('text=/Tu n.as pas encore d.affectation/');
    await expect(notReadyMsg).not.toBeVisible();
    
    // Vérifier le contenu de la carte direction
    const directionCard = page.locator('[data-role-card]:has-text("régie")').first();
    await expect(directionCard).toBeVisible();
    await expect(directionCard).toContainText('Roots du Lac 2026');
    await expect(directionCard).toContainText('ZIK en PACA');
  });

  test('Lucas volunteer sees volunteer card', async ({ page }) => {
    // Idem avec lucas@easyfest.test
  });

  test('Sandy multi-role sees 3 cards', async ({ page }) => {
    // Idem avec sandy@easyfest.test → expect roleCards.count() to equal 3
  });
});
```

### Étape 5 — Push, redeploy, vérifier sur prod

```bash
pnpm build
pnpm test
pnpm exec playwright test hub-content
git add -A
git commit -m "fix(critical): Bug #18 hub vide pour tous - split PostgREST embed imbriqué events→organizations en 4 queries séparées + tests sémantiques Playwright"
git push origin main
```

Vercel auto-deploy. Vérifier ensuite via curl/SQL que les comptes seed marchent :
```bash
# Confirmation manuelle : se logger sur prod en Pamela et voir une carte
# OU lancer le test Playwright en headless après deploy
```

### Étape 6 — Tag de validation

```bash
git tag audit-extreme-final-fix-hub-$(date +%Y%m%d-%H%M)
git push origin --tags
```

---

## ⛔ NON-NÉGOCIABLES

- **Bug #18 est BLOQUANT** : sans fix, l'app est inutilisable. Pamela ne peut accéder à régie le jour J du festival.
- **Pas de fix superficiel** : appliquer le split queries pattern complet, pas juste retirer un embed
- **Audit similaire** : chercher tous les autres embed doubles imbriqués (Étape 2)
- **Test Playwright contenu sémantique** : OBLIGATOIRE pour ne plus avoir de faux positif "validated"
- **Pré-autorisé** : push, deploy

---

## Critère de validation Cowork (Phase 4 V7)

Cowork relance retest immédiat :

1. Login Pamela `pam@easyfest.test` / `easyfest-demo-2026` → /hub → **carte régie RDL2026 visible** + texte "Salut Pam 👋 / Choisis ton rôle pour entrer dans l'app."
2. Login Lucas `lucas@easyfest.test` → /hub → **carte volunteer Bar visible**
3. Login Sandy `sandy@easyfest.test` → /hub → **3 cartes** (volunteer RDL Ateliers + resp. RDL + resp. Frégus)
4. Login Mahaut `mahaut@easyfest.test` → /hub → **carte resp. de poste Bar visible**
5. Click sur n'importe quelle carte → redirect vers /regie/... ou /v/... ou /poste/... selon le rôle (PAS /hub)
6. F5 sur /hub → cartes restent visibles (pas de stale cache)

Si tout vert → tag `audit-extreme-validated-FINAL-{date}` + production J-26 RDL2026 GO **vraiment** (cette fois).
