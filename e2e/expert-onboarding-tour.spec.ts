import { test, expect, type Page } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_EXPERT_PROFILE,
  setupDashboardWithVoteWeight,
} from "./helpers/guild-mocks";

async function setupExpertDashboard(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await setExpertSession(page);
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("vetted:expert-onboarding-tour:"))
      .forEach((key) => localStorage.removeItem(key));
    localStorage.setItem("expertStatus", "approved");
  });

  await setupDashboardWithVoteWeight(page, {
    expertProfile: {
      ...MOCK_EXPERT_PROFILE,
      status: "approved",
      reputation: 1500,
    },
  });

  await page.route("**/api/experts/notifications**", (route) => {
    const url = route.request().url();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: url.includes("unread-count")
          ? { count: 0 }
          : { notifications: [], total: 0, unreadCount: 0 },
      }),
    });
  });

  await page.route("**/api/blockchain/staking/sync", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });
}

test.describe("Expert story mode", () => {
  test("forces the fake story and suspends it while practice review is open", async ({ page }) => {
    await setupExpertDashboard(page);
    await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

    const story = page.getByRole("dialog", { name: "Expert story mode" });
    await expect(story).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Meet your guild" })).toBeVisible();
    await expect(story.getByRole("button", { name: /skip/i })).toHaveCount(0);
    await expect(story.getByRole("button", { name: /close/i })).toHaveCount(0);

    await story.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { name: "Maya Chen applies to Engineering" })
    ).toBeVisible();

    await story.getByRole("button", { name: "Next" }).click();

    await expect(page.getByRole("heading", { name: "Practice review" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Sandbox walkthrough. No backend, wallet, or real queue changes.")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Expert story mode" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /close review modal/i })).toHaveCount(0);
  });

  test("redirects unfinished experts from deep links back to the dashboard story", async ({ page }) => {
    await setupExpertDashboard(page);
    await page.goto("/expert/earnings", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/expert\/dashboard/, { timeout: 15000 });
    await expect(
      page.getByRole("dialog", { name: "Expert story mode" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meet your guild" })).toBeVisible();
  });
});
