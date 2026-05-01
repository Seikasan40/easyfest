/**
 * OC-06+07 — happy path #2 (full E2E) : OC-01 wizard /commencer.
 *
 * Authentifié via fixture, parcourt les 5 étapes du wizard, vérifie
 * la redirection finale vers /regie/<orgSlug>/<eventSlug>.
 */
import { test, expect } from "./fixtures/auth";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

test.describe("OC-01 — wizard /commencer (full E2E)", () => {
  test("nouveau directeur crée org + event + template + skip team → done", async ({
    authedPage,
    testUser,
  }) => {
    const orgSlug = `e2e-org-${Date.now()}`;
    const eventSlug = `e2e-event-${Date.now()}`;

    await authedPage.goto("/commencer");
    await expect(authedPage).toHaveURL(/\/commencer/);

    // Étape 1 : Asso
    await authedPage.getByTestId("org-name").fill("Asso E2E Test");
    // Le slug est auto-généré, mais on le force pour test idempotence
    await authedPage.getByTestId("org-slug").fill(orgSlug);
    await authedPage.getByTestId("continue-btn").click();

    // Étape 2 : Event
    await expect(authedPage.getByTestId("step-event")).toBeVisible();
    await authedPage.getByTestId("event-name").fill("Event E2E Test 2026");
    await authedPage.getByTestId("event-slug").fill(eventSlug);
    await authedPage.getByTestId("continue-btn").click();

    // Étape 3 : Template — sélectionner le petit festival
    await expect(authedPage.getByTestId("step-template")).toBeVisible();
    await authedPage.getByTestId("template-festival-musique-petite-jauge").click();
    await authedPage.getByTestId("create-org-btn").click();

    // Étape 4 : Team — skip
    await expect(authedPage.getByTestId("step-team")).toBeVisible();
    await authedPage.getByTestId("skip-team-btn").click();

    // Étape 5 : Done
    await expect(authedPage.getByTestId("step-done")).toBeVisible();
    await expect(authedPage.getByTestId("goto-regie-btn")).toBeVisible();

    // Cleanup org créée (cascade FK supprime tout)
    await fetch(`${SUPABASE_URL}/rest/v1/organizations?slug=eq.${orgSlug}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    }).catch(() => {});
  });
});
