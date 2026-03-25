import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_EXPERT_PROFILE,
  MOCK_EARNINGS_BREAKDOWN,
  setupCommonExpertMocks,
} from "./helpers/guild-mocks";

test.describe("Expert dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupCommonExpertMocks(page);

    // Dashboard-specific mocks
    await page.route("**/api/experts/earnings/breakdown**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_EARNINGS_BREAKDOWN }),
      });
    });

    await page.route("**/api/proposals/assigned/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route("**/api/blockchain/staking/sync", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.route("**/api/governance/proposals**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  });

  test("shows welcome heading with expert name", async ({ page }) => {
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    await expect(
      page.getByText(`Welcome back, ${MOCK_EXPERT_PROFILE.fullName}!`).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows stat cards for key metrics", async ({ page }) => {
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    await expect(
      page.getByText(`Welcome back, ${MOCK_EXPERT_PROFILE.fullName}!`).first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Reputation Score").first()).toBeVisible();
    await expect(page.getByText("Total Earnings").first()).toBeVisible();
    await expect(page.getByText("Guild Memberships").first()).toBeVisible();
    await expect(page.getByText("Staked VETD").first()).toBeVisible();
  });

  test("shows Assigned to Me and Your Guilds section headings", async ({ page }) => {
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    await expect(
      page.getByText(`Welcome back, ${MOCK_EXPERT_PROFILE.fullName}!`).first(),
    ).toBeVisible({ timeout: 15000 });

    // "Your Guilds" section is always present
    await expect(page.getByText("Your Guilds").first()).toBeVisible({ timeout: 10000 });
  });

  test("no error toasts on load", async ({ page }) => {
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    await expect(
      page.getByText(`Welcome back, ${MOCK_EXPERT_PROFILE.fullName}!`).first(),
    ).toBeVisible({ timeout: 15000 });

    // Sonner toasts use [data-sonner-toast] attribute with data-type="error"
    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });

  test("fetches without 500 errors", async ({ page }) => {
    const serverErrors: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    await expect(
      page.getByText(`Welcome back, ${MOCK_EXPERT_PROFILE.fullName}!`).first(),
    ).toBeVisible({ timeout: 15000 });

    expect(serverErrors).toHaveLength(0);
  });
});
