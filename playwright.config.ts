import { defineConfig, devices } from "@playwright/test";

const testFrontendPort = 3031;
const baseURL = `http://localhost:${testFrontendPort}`;

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
    command: `PORT=${testFrontendPort} npm run dev`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
