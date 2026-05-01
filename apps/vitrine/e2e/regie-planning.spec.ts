import { expect, test } from "@playwright/test";

/**
 * OC-06+07 — happy path #4 : régie planning (volunteer_lead crée position + shift + assigne).
 *
 * Niveau actuel : SMOKE (vérifie redirects + visibilité publique).
 * Niveau cible : full E2E avec storageState authentifié pour Dorothée (volunteer_lead RDL 2026).
 *
 * TODO post tests fumée OC-04+05+01 :
 *  • Setup auth fixture : `e2e/fixtures/auth.ts` qui crée une session signée
 *    pour dorothee@easyfest.test via supabase.auth.admin.generateLink + injection cookie
 *  • Compléter les `test.fixme` ci-dessous avec le parcours réel
 */

test.describe("Régie planning — accès et redirects (smoke)", () => {
  test("/regie/icmpaca/rdl-2026 non-auth redirige vers /auth/login", async ({ page }) => {
    await page.goto("/regie/icmpaca/rdl-2026");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("/regie/icmpaca/rdl-2026/planning non-auth redirige", async ({ page }) => {
    await page.goto("/regie/icmpaca/rdl-2026/planning");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("/regie/icmpaca/rdl-2026/applications non-auth redirige", async ({ page }) => {
    await page.goto("/regie/icmpaca/rdl-2026/applications");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Régie planning — parcours volunteer_lead complet", () => {
  test.fixme("Dorothée crée une position + un shift + assigne un bénévole", async ({ page }) => {
    // PRÉ-REQUIS (à coder dans e2e/fixtures/auth.ts) :
    //   • dorothee@easyfest.test seedée avec role volunteer_lead sur RDL 2026
    //   • storageState avec session cookie injecté
    //
    // PARCOURS :
    // 1. page.goto("/regie/icmpaca/rdl-2026/planning")
    // 2. click "Ajouter un poste" → input name "Bar test" + slug "bar-test"
    // 3. submit → vérifier la position apparaît dans la liste
    // 4. click position "Bar test" → "Ajouter un créneau"
    // 5. fill starts_at + ends_at + needs_count=2 → submit
    // 6. drag-drop d'un bénévole "validated" sur le shift via PlanningDnd
    // 7. assert : assignment row créée, status pending
    // 8. cleanup : delete shift + position via cleanup hook
  });

  test.fixme("post_lead voit uniquement son équipe", async ({ page }) => {
    // PRÉ-REQUIS : Mahaut seedée avec role post_lead + position_id sur "Bar"
    // ASSERT : /regie/.../planning ne montre QUE les shifts liés à sa position
  });
});
