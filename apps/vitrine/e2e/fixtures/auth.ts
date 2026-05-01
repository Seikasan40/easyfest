/**
 * Auth fixture pour Playwright — provisionne un user via Supabase admin API
 * et retourne un storageState avec session cookies.
 *
 * Usage :
 *   import { test, expect } from "./fixtures/auth";
 *   test("…", async ({ authedPage, testUser }) => { ... });
 *
 * Requiert :
 *   • Supabase local up (port 54321) ou Supabase test instance
 *   • SUPABASE_SERVICE_ROLE_KEY dispo (env Playwright)
 */
import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export type TestUser = {
  id: string;
  email: string;
  password: string;
  jwt: string;
};

/**
 * Crée un user via admin API + retourne email/password/JWT.
 * L'email est marqué comme déjà confirmé (skip OTP/magic-link).
 */
export async function createTestUser(prefix = "playwright"): Promise<TestUser> {
  const email = `${prefix}-${Date.now()}@easyfest.test`;
  const password = "PlaywrightTest123!";

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create user: ${createRes.status} ${await createRes.text()}`);
  }
  const userData = (await createRes.json()) as { id: string };

  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Failed to login: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const tokenData = (await tokenRes.json()) as { access_token: string };

  return { id: userData.id, email, password, jwt: tokenData.access_token };
}

/**
 * Supprime un user (cascade FK supprime profil/applications/memberships).
 * À appeler en teardown.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  }).catch(() => {
    /* best-effort */
  });
}

/**
 * Ouvre la page de login, remplit email/password, soumet via Server Action.
 * Le storageState capture les cookies HttpOnly Supabase pour réutilisation.
 */
async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${APP_URL}/auth/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Attendre la navigation post-login (redirect vers /hub par défaut)
  await page.waitForURL(/\/hub|\/commencer|\/v\/|\/regie\//, { timeout: 10_000 }).catch(() => {
    /* ignore — certains tests testent justement l'absence de redirect */
  });
}

/**
 * Fixture étendue : un user fresh + une page authentifiée.
 * Le user est nettoyé en teardown.
 */
export const test = base.extend<{ testUser: TestUser; authedPage: Page }>({
  testUser: async ({}, use) => {
    const user = await createTestUser();
    await use(user);
    await deleteTestUser(user.id);
  },

  authedPage: async ({ page, testUser }, use) => {
    await loginViaUi(page, testUser.email, testUser.password);
    await use(page);
  },
});

export { expect };
