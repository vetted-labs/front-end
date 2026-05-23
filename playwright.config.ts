import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3030";
const watchSlowMo = process.env.PLAYWRIGHT_WATCH_UI === "1" ? 250 : 0;
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? watchSlowMo);
const launchOptions = slowMo > 0 ? { slowMo } : undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // Fast UI lane only. Specs are grouped by persona: candidate/, hiring/,
  // expert/, shared/. The full-stack real-flow lane has its own config
  // (e2e/real-flow/playwright.real-flow.config.ts) and is excluded here.
  testIgnore: "**/real-flow/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL,
    bypassCSP: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `NEXT_PUBLIC_E2E_MODE=true npx dotenv -e .env.local -- npx next dev --turbopack --port 3030`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
