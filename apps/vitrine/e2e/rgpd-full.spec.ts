/**
 * OC-06+07 — happy path #3 (full E2E) : OC-04+05 RGPD self-service.
 *
 * Authentifié, navigue vers /account/privacy, télécharge l'export JSON,
 * déclenche delete + vérifie restore.
 */
import { test, expect } from "./fixtures/auth";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

test.describe("OC-04 — Article 15 export (full E2E)", () => {
  test("user authentifié télécharge l'export JSON", async ({ authedPage, testUser }) => {
    await authedPage.goto("/account/privacy");
    await expect(authedPage).toHaveURL(/\/account\/privacy/);
    await expect(authedPage.getByText(/Mes données et vie privée/i)).toBeVisible();

    // Trigger download via API directement (le bouton fait fetch + blob + a.click)
    const response = await authedPage.request.get("/api/account/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(response.headers()["content-disposition"]).toContain("attachment");
    expect(response.headers()["content-disposition"]).toMatch(/filename=".+\.json"/);

    const payload = await response.json();
    expect(payload.article).toContain("Art.15");
    expect(payload.user.id).toBe(testUser.id);
    expect(payload.user.email).toBe(testUser.email);
    expect(payload).toHaveProperty("profile");
    expect(payload).toHaveProperty("applications");
    expect(payload).toHaveProperty("memberships");
    expect(payload).toHaveProperty("assignments");
  });
});

test.describe("OC-05 — Article 17 soft-delete + restore (full E2E)", () => {
  test("delete pose deleted_at puis restore reset à null", async ({ authedPage, testUser }) => {
    // Pré-requis : un volunteer_profile minimal pour que les RPC trouvent une row à update
    await fetch(`${SUPABASE_URL}/rest/v1/volunteer_profiles`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        user_id: testUser.id,
        full_name: "Playwright Test User",
        email: testUser.email,
      }),
    });

    await authedPage.goto("/account/privacy");
    await expect(authedPage.getByTestId("delete-btn")).toBeVisible();
    await authedPage.getByTestId("delete-confirm-input").fill("DELETE");
    await authedPage.getByTestId("delete-btn").click();

    // Le delete redirige vers /legal/privacy?account_deleted=1
    await authedPage.waitForURL(/\/legal\/privacy\?account_deleted=1/, { timeout: 10_000 });
    await expect(authedPage.getByText(/Demande de suppression enregistrée/i)).toBeVisible();

    // Vérif DB via service_role : deleted_at est posé
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/volunteer_profiles?user_id=eq.${testUser.id}&select=deleted_at`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const rows = (await checkRes.json()) as { deleted_at: string | null }[];
    expect(rows[0]?.deleted_at).not.toBeNull();
    const deletedAt = new Date(rows[0]!.deleted_at!);
    const expected = new Date();
    expected.setDate(expected.getDate() + 30);
    // Tolérance ±1 minute pour la diff entre client/serveur
    expect(Math.abs(deletedAt.getTime() - expected.getTime())).toBeLessThan(60_000);

    // Restore via re-login + bouton (le delete a sign-out)
    await authedPage.goto("/auth/login");
    await authedPage.locator('input[type="email"]').fill(testUser.email);
    await authedPage.locator('input[type="password"]').fill(testUser.password);
    await authedPage.locator('button[type="submit"]').click();
    await authedPage.waitForURL(/\/(hub|commencer)/, { timeout: 10_000 }).catch(() => {});

    await authedPage.goto("/account/privacy");
    await expect(authedPage.getByTestId("deletion-pending-banner")).toBeVisible();
    await authedPage.getByTestId("restore-btn").click();
    await authedPage.waitForTimeout(1500);

    // Vérif DB : deleted_at = null
    const checkAfter = await fetch(
      `${SUPABASE_URL}/rest/v1/volunteer_profiles?user_id=eq.${testUser.id}&select=deleted_at`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const rowsAfter = (await checkAfter.json()) as { deleted_at: string | null }[];
    expect(rowsAfter[0]?.deleted_at).toBeNull();
  });
});
