import { defineConfig, devices } from "@playwright/test";

/**
 * Config Playwright dédiée à l'audit mobile-first (Phase 4 V6).
 *
 * - Cible la prod URL (https://easyfest.app) ou NEXT_PUBLIC_APP_URL si exposée.
 * - PAS de webServer local : on teste directement le déploiement.
 * - Spec unique : mobile-visual.spec.ts (no h-scroll + tap targets ≥ 44px).
 *
 * Lancer : pnpm --filter @easyfest/vitrine exec playwright test --config=playwright.mobile.config.ts
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /mobile-visual\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 1,
  workers: 4,
  reporter: process.env["CI"] ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env["MOBILE_AUDIT_BASE_URL"] ?? "https://easyfest.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // Headers HTTPS prod
    extraHTTPHeaders: {
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    },
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 5"] } },
  ],
});
