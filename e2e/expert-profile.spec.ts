import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_EXPERT_PROFILE,
  MOCK_REPUTATION_TIMELINE,
  setupCommonExpertMocks,
} from "./helpers/guild-mocks";

test.describe("Expert profile page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupCommonExpertMocks(page);

    // Reputation timeline
    await page.route("**/api/experts/reputation/timeline**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_REPUTATION_TIMELINE }),
      });
    });

    // Governance proposals (sidebar)
    await page.route("**/api/governance/proposals**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // Expert activity
    await page.route("**/api/experts/*/activity**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  });

  test("shows expert name as heading", async ({ page }) => {
    await page.goto("/expert/profile", { waitUntil: "networkidle" });

    await expect(
      page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows Member since text", async ({ page }) => {
    await page.goto("/expert/profile", { waitUntil: "networkidle" });

    await expect(
      page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/Member since/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("shows stat cards for Reputation Score and Total Earnings", async ({ page }) => {
    await page.goto("/expert/profile", { waitUntil: "networkidle" });

    await expect(
      page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Reputation Score").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total Earnings").first()).toBeVisible();
  });

  test("shows Guild Memberships section", async ({ page }) => {
    await page.goto("/expert/profile", { waitUntil: "networkidle" });

    await expect(
      page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Guild Memberships").first()).toBeVisible({ timeout: 10000 });
  });

  test("no error toasts on load", async ({ page }) => {
    await page.goto("/expert/profile", { waitUntil: "networkidle" });

    await expect(
      page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
    ).toBeVisible({ timeout: 15000 });

    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });
});
