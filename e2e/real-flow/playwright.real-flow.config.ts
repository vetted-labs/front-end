// e2e/real-flow/playwright.real-flow.config.ts
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3030";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report-real-flow" }], ["list"]],
  timeout: 120_000,
  use: {
    baseURL,
    bypassCSP: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "review",
      testMatch: /scenarios\/.*\.spec\.ts/,
      testIgnore: /endorsement\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "endorsement",
      testMatch: /endorsement\/scenarios\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Smoke project for fixture/helpers sanity checks under
    // `e2e/real-flow/__tests__/`. Kept separate from the scenario projects
    // so a CI run scoped to `--project=review|endorsement` skips them.
    {
      name: "smoke",
      testMatch: /__tests__\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // NEXT_PUBLIC_EXPERT_ONBOARDING_TOUR=false suppresses the 16-step
    // first-time-reviewer tour that otherwise overlays /expert/dashboard
    // and intercepts clicks in real-flow tests.
    command:
      "NEXT_PUBLIC_E2E_MODE=true NEXT_PUBLIC_EXPERT_ONBOARDING_TOUR=false npx dotenv -e .env.local -- npx next dev --turbopack --port 3030",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
