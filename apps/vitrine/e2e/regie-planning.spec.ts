/**
 * OC-06+07 — happy path #4 : régie planning (drag&drop équipes).
 *
 * 2 niveaux :
 *  • SMOKE (sans auth) : redirects /regie/* protégés
 *  • FULL (avec authedPage fixture) : volunteer_lead/direction visite la page,
 *    le board PlanningTeamsBoard est rendu, le drag d'un bénévole pool→équipe
 *    déclenche un assignment.
 */
import { test, expect } from "./fixtures/auth";

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

test.describe("Régie planning — board accessible direction (full E2E)", () => {
  /**
   * Test "page rendue" : on bootstrap une org via OC-01, on visite /regie/.../planning,
   * on assert que le PlanningTeamsBoard est monté (header présent, équipes seedées
   * du template visibles). Pas de drag réel ici — pas de bénévoles validés sur le
   * fresh user, le pool serait vide. Le drag réel nécessiterait un seed dédié et est
   * couvert par le test fixme ci-dessous.
   */
  test("direction fresh-bootstrappée voit le board planning avec les positions du template", async ({
    authedPage,
    testUser,
  }) => {
    // Bootstrap une org via la même RPC que /commencer wizard
    const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "http://127.0.0.1:54321";
    const ANON = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const orgSlug = `e2e-rp-${Date.now()}`;
    const eventSlug = `e2e-rp-evt-${Date.now()}`;

    const bootstrapRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/bootstrap_org_for_user`, {
      method: "POST",
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${testUser.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_org_name: "E2E Régie Planning",
        p_org_slug: orgSlug,
        p_event_name: "E2E Event RP",
        p_event_slug: eventSlug,
        p_event_starts: "2026-09-01T18:00:00Z",
        p_event_ends: "2026-09-03T23:00:00Z",
        p_template_slug: "festival-musique-petite-jauge",
      }),
    });
    expect(bootstrapRes.ok).toBe(true);

    await authedPage.goto(`/regie/${orgSlug}/${eventSlug}/planning`);
    await expect(authedPage.getByRole("heading", { name: /Planning par équipes/i })).toBeVisible();
    // 5 positions du template "petite-jauge" doivent être rendues
    await expect(authedPage.getByText("Billetterie", { exact: false }).first()).toBeVisible();
    await expect(authedPage.getByText("Bar", { exact: false }).first()).toBeVisible();
    await expect(authedPage.getByText(/Bénévoles à placer/i)).toBeVisible();

    // Cleanup org (cascade FK)
    const SVC = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    await fetch(`${SUPABASE_URL}/rest/v1/organizations?slug=eq.${orgSlug}`, {
      method: "DELETE",
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
    }).catch(() => {});
  });

  test.fixme(
    "drag d'un bénévole pool→équipe Bar crée un assignment en BDD",
    async ({ authedPage }) => {
      // PRÉ-REQUIS (à coder dans fixture seed-volunteer.ts) :
      //   • Une org bootstrap avec template
      //   • Un volunteer_application validated + onboardCurrentUser appelé
      //   • Le user_id du bénévole exposé pour vérification BDD
      //
      // PARCOURS :
      // 1. authedPage.goto("/regie/.../planning")
      // 2. localiser une carte bénévole dans le pool (data-testid possible)
      // 3. drag&drop vers la team "Bar" — Playwright supporte drag avec
      //    page.locator(...).dragTo(page.locator(...))
      // 4. attendre le toast "✓ Sauvegardé"
      // 5. fetch /rest/v1/assignments?volunteer_user_id=eq.UID&select=shift_id
      //    → expect 1 row avec position "Bar"
    },
  );
});
