import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 2 : undefined,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 5"] } },
    {
      name: "chromium-3g-mobile",
      use: {
        ...devices["Pixel 5"],
        // Throttle 3G simulation
        launchOptions: { args: ["--enable-features=NetworkService"] },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
