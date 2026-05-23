import { test, expect } from "@playwright/test";
import { setExpertSession } from "../helpers/expert-auth";
import {
  MOCK_EXPERT_PROFILE,
  MOCK_REPUTATION_TIMELINE,
  setupCommonExpertMocks,
} from "../helpers/guild-mocks";

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
    await test.step("expert opens their profile page", async () => {
      await page.goto("/expert/profile", { waitUntil: "networkidle" });
    });

    await test.step("the expert's name appears as the page heading", async () => {
      await expect(
        page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test("shows Member since text", async ({ page }) => {
    await test.step("expert opens their profile page", async () => {
      await page.goto("/expert/profile", { waitUntil: "networkidle" });
      await expect(
        page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Joined date label is visible on the profile", async () => {
      await expect(page.getByText(/Joined/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("shows stat cards for Reputation and Earnings", async ({ page }) => {
    await test.step("expert opens their profile page", async () => {
      await page.goto("/expert/profile", { waitUntil: "networkidle" });
      await expect(
        page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("Reputation and Earnings stat cards are rendered", async () => {
      await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Earnings").first()).toBeVisible();
    });
  });

  test("shows Guild positions section", async ({ page }) => {
    await test.step("expert opens their profile page", async () => {
      await page.goto("/expert/profile", { waitUntil: "networkidle" });
      await expect(
        page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Guild positions section is visible on the profile", async () => {
      await expect(page.getByText("Guild positions").first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("no error toasts on load", async ({ page }) => {
    await test.step("expert opens their profile page", async () => {
      await page.goto("/expert/profile", { waitUntil: "networkidle" });
      await expect(
        page.getByText(MOCK_EXPERT_PROFILE.fullName).first(),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("no error toasts appear after the profile finishes loading", async () => {
      const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(errorToasts).toHaveCount(0);
    });
  });
});
