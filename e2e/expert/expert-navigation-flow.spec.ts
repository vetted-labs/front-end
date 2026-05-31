import { test, expect } from "@playwright/test";
import { setExpertSession } from "../helpers/expert-auth";
import {
  setupCommonExpertMocks,
  setupEarningsMocks,
  setupReputationMocks,
  setupVotingQueueMocks,
  MOCK_EXPERT_PROFILE,
} from "../helpers/guild-mocks";

/**
 * Sets up mocks for the expert dashboard page.
 * Dashboard fetches: profile, notifications, staking, guilds summary, voting stats.
 */
async function setupDashboardMocks(page: import("@playwright/test").Page) {
  await setupCommonExpertMocks(page);

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Guilds list
  await page.route("**/api/guilds", (route) => {
    if (route.request().url().includes("/guilds/")) return route.fallback();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Staking sync
  await page.route("**/api/blockchain/staking/sync", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  // Dashboard stats / voting summary
  await page.route("**/api/proposals/assigned/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route("**/api/proposals/guild/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Endorsements summary
  await page.route("**/api/endorsements**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Earnings summary
  await page.route("**/api/experts/earnings/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { summary: { totalVetd: 0, votingTotal: 0, endorsementTotal: 0, byGuild: [] }, entries: [], total: 0, page: 1, limit: 20 },
      }),
    });
  });

  // Reputation timeline
  await page.route("**/api/experts/reputation/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { timeline: [], total: 0, page: 1, limit: 15 },
      }),
    });
  });
}

/**
 * Sets up mocks for the endorsements page.
 */
async function setupEndorsementsMocks(page: import("@playwright/test").Page) {
  await setupCommonExpertMocks(page);

  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route("**/api/endorsements**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route("**/api/endorsements/given**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route("**/api/endorsements/received**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

/**
 * Sets up mocks for the notifications page.
 */
async function setupNotificationsMocks(page: import("@playwright/test").Page) {
  await setupCommonExpertMocks(page);

  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

test.describe("Expert sidebar navigation flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);

    // The redesigned expert experience forces a first-run guided story
    // (ExpertStoryLabDriver) that makes the app shell inert until completed,
    // which would hide the sidebar this spec navigates. Mark onboarding
    // complete for the mock expert's identity keys so the story stays closed
    // and the real sidebar/navigation is interactive. The key format is
    // `vetted:expert-onboarding-tour:v1:<expertId|walletAddress>` and the
    // legacy "completed" value is accepted as a completed state.
    await page.evaluate(() => {
      const prefix = "vetted:expert-onboarding-tour:v1";
      const walletAddress = localStorage.getItem("walletAddress")?.toLowerCase();
      const expertId = localStorage.getItem("expertId");
      [expertId, walletAddress, expertId ? `${expertId}:${walletAddress}` : null]
        .filter((id): id is string => Boolean(id))
        .forEach((id) => localStorage.setItem(`${prefix}:${id}`, "completed"));
    });
  });

  test("expert sidebar shows all navigation items", async ({ page }) => {
    await test.step("dashboard mocks are set up and expert lands on the dashboard", async () => {
      await setupDashboardMocks(page);
      await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

      await page.waitForTimeout(3000);
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    });

    await test.step("sidebar Home group links are visible", async () => {
      await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("link", { name: "Notifications" }).first()).toBeVisible();
    });

    await test.step("sidebar Vetting and Guilds group links are visible", async () => {
      await expect(page.getByRole("link", { name: "Applications" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Endorsements" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "My Guilds" }).first()).toBeVisible();
    });

    await test.step("sidebar Rewards group links are visible", async () => {
      await expect(page.getByRole("link", { name: "Earnings" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Reputation" }).first()).toBeVisible();
    });
  });

  test("expert can navigate between pages", async ({ page }) => {
    await test.step("mocks for all destination pages are set up and expert lands on the dashboard", async () => {
      await setupDashboardMocks(page);
      await setupEarningsMocks(page);
      await setupReputationMocks(page);
      await setupNotificationsMocks(page);

      await page.goto("/expert/dashboard", { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);
    });

    await test.step("expert clicks Earnings in the sidebar and the earnings page loads", async () => {
      await page.getByRole("link", { name: "Earnings" }).first().click();
      await page.waitForURL("**/expert/earnings", { timeout: 10000 });
      await expect(page.getByText("Earnings").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("expert clicks Reputation in the sidebar and the reputation page loads", async () => {
      await page.getByRole("link", { name: "Reputation" }).first().click();
      await page.waitForURL("**/expert/reputation", { timeout: 10000 });
      await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("expert clicks Notifications in the sidebar and the notifications page loads", async () => {
      await page.getByRole("link", { name: "Notifications" }).first().click();
      await page.waitForURL("**/expert/notifications", { timeout: 10000 });
      // Notifications page should render heading or loading state
      const hasHeading = await page.getByText("Notifications").first().isVisible().catch(() => false);
      const hasLoading = await page.getByText("Loading notifications").isVisible().catch(() => false);
      expect(hasHeading || hasLoading).toBeTruthy();
    });
  });
});
