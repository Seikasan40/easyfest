/**
 * Bug #18 regression test : /hub doit afficher au moins une carte de rôle
 * pour un compte authentifié avec une membership active. Le test mobile-visual
 * existant (no h-scroll + tap targets ≥ 44px) passait vert sur /hub alors que
 * le contenu était cassé (RLS recursion sur memberships → memberships=null →
 * tous les comptes sur la branche "Salut bénévole / pas d'affectation").
 *
 * Ce test login Pamela (compte demo direction RDL2026) et vérifie qu'au
 * moins UNE carte de rôle est visible. Couvre :
 *   - Login flow OK (auth.users + setup-password idempotent)
 *   - RLS memberships SELECT non récursive (Bug #18)
 *   - Hub queries split (events + organizations + positions)
 *   - Render conditional `memberships.length > 0`
 *
 * Lancer :
 *   pnpm --filter @easyfest/vitrine exec playwright test \
 *     --config=playwright.mobile.config.ts hub-semantic.spec.ts
 */
import { test, expect } from "@playwright/test";

const PAM_EMAIL = process.env["AUDIT_PAM_EMAIL"] ?? "pam@easyfest.test";
// Le password Pamela peut avoir été modifié par un test précédent (Bug #3 setup
// idempotent). On essaie d'abord la valeur seed, puis le -v2 si ça échoue.
const PAM_PASSWORDS = [
  process.env["AUDIT_PAM_PASSWORD"] ?? "easyfest-demo-2026",
  "easyfest-demo-2026-v2",
];

test.describe("hub-semantic — Bug #18 regression", () => {
  test("Pamela login → /hub affiche au moins une carte de rôle", async ({ page }) => {
    let loggedIn = false;
    for (const password of PAM_PASSWORDS) {
      await page.goto("/auth/login");
      await page.fill('input[type=email]', PAM_EMAIL);
      await page.fill('input[type=password]', password);
      await Promise.all([
        page
          .waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 })
          .catch(() => null),
        page.click('button[type=submit]'),
      ]);
      const url = page.url();
      if (!url.includes("/auth/login")) {
        loggedIn = true;
        break;
      }
    }
    expect(loggedIn, `Login failed with all passwords for ${PAM_EMAIL}`).toBe(true);

    // Setup-password forcé peut intercepter ; si on y arrive, on doit
    // pouvoir naviguer directement à /hub (skip optionnel).
    if (page.url().includes("/account/setup-password")) {
      await page.goto("/hub");
    } else if (!page.url().endsWith("/hub")) {
      await page.goto("/hub");
    }

    // L'erreur catastrophique : la page est rendue mais le contenu est vide.
    const errorState = await page.locator('[data-testid="hub-error"]').count();
    expect(errorState, "Hub error state visible — RLS or query broken").toBe(0);

    const emptyState = await page.locator('[data-testid="hub-empty"]').count();
    expect(
      emptyState,
      "Hub empty state visible — Pamela seed has direction membership but page renders 'Pas d'affectation'",
    ).toBe(0);

    // Au moins une carte de rôle visible. Pamela a 2 memberships actives :
    // direction + volunteer_lead sur RDL2026 → 2 cards minimum attendu.
    const roleCards = await page.locator("[data-role-card]").count();
    expect(roleCards, "Pamela should see at least one role card").toBeGreaterThan(0);

    // Vérification sémantique : la carte direction doit linker vers /regie/.../...
    const directionLink = page.locator('[data-role-card="direction"] a[href^="/regie/"]').first();
    await expect(directionLink).toBeVisible();
  });
});
