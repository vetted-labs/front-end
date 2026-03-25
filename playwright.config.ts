import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3030";

export default defineConfig({
  testDir: "./e2e",
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
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `NEXT_PUBLIC_E2E_MODE=true dotenv -e .env.local -- next dev --turbopack --port 3030`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
