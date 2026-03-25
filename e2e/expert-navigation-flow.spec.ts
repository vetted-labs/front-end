import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  setupCommonExpertMocks,
  setupEarningsMocks,
  setupReputationMocks,
  setupVotingQueueMocks,
  MOCK_EXPERT_PROFILE,
} from "./helpers/guild-mocks";

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

  // Leaderboard
  await page.route("**/api/experts/leaderboard**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { experts: [], stats: { totalExperts: 0, avgReviews: 0, topEarnings: 0, totalEarnings: 0 } },
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
  });

  test("expert sidebar shows all navigation items", async ({ page }) => {
    await setupDashboardMocks(page);
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    // Wait for the page to render
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Verify sidebar navigation groups and items from sidebar-config.ts
    // Home group
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Notifications" }).first()).toBeVisible();

    // Vetting group
    await expect(page.getByRole("link", { name: "Applications" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Endorsements" }).first()).toBeVisible();

    // Guilds group
    await expect(page.getByRole("link", { name: "My Guilds" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Guild Ranks" }).first()).toBeVisible();

    // Governance group
    await expect(page.getByRole("link", { name: "Proposals" }).first()).toBeVisible();

    // Rewards group
    await expect(page.getByRole("link", { name: "Earnings" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Reputation" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Leaderboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Withdrawals" }).first()).toBeVisible();
  });

  test("expert can navigate between pages", async ({ page }) => {
    // Set up mocks for all the pages we'll navigate to
    await setupDashboardMocks(page);
    await setupEarningsMocks(page);
    await setupReputationMocks(page);
    await setupNotificationsMocks(page);

    // Start on dashboard
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Click Earnings in sidebar
    await page.getByRole("link", { name: "Earnings" }).first().click();
    await page.waitForURL("**/expert/earnings", { timeout: 10000 });
    await expect(page.getByText("Earnings").first()).toBeVisible({ timeout: 15000 });

    // Click Reputation in sidebar
    await page.getByRole("link", { name: "Reputation" }).first().click();
    await page.waitForURL("**/expert/reputation", { timeout: 10000 });
    await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });

    // Click Notifications in sidebar
    await page.getByRole("link", { name: "Notifications" }).first().click();
    await page.waitForURL("**/expert/notifications", { timeout: 10000 });
    // Notifications page should render heading or loading state
    const hasHeading = await page.getByText("Notifications").first().isVisible().catch(() => false);
    const hasLoading = await page.getByText("Loading notifications").isVisible().catch(() => false);
    expect(hasHeading || hasLoading).toBeTruthy();
  });
});
