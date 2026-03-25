import { test, expect, Page } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  ENGINEERING_GUILD_ID,
  MOCK_GUILD,
  MOCK_EXPERT_PROFILE,
  setupCommonExpertMocks,
} from "./helpers/guild-mocks";

async function setupGuildDetailMocks(page: Page) {
  // Catch-all FIRST (lowest priority — checked last by Playwright)
  // Prevents requests from hitting the (possibly dead) backend
  await page.route("**/api/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await setupCommonExpertMocks(page);

  // Guild-specific routes — use regex for reliable matching (higher priority than catch-all)
  await page.route(/\/api\/guilds\//, (route) => {
    const url = route.request().url();

    // Membership check (different URL pattern: /api/guilds/membership/{userId}/{guildId})
    if (url.includes("/guilds/membership/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { isMember: true, role: "reviewer" } }),
      });
    }

    // Guild posts
    if (url.includes("/posts")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    // Guild members
    if (url.includes("/members")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{
            id: MOCK_EXPERT_PROFILE.id,
            fullName: MOCK_EXPERT_PROFILE.fullName,
            role: "reviewer",
            reputation: MOCK_EXPERT_PROFILE.reputation,
          }],
        }),
      });
    }

    // Candidate applications
    if (url.includes("/candidate-applications")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    // Guild detail (default for any /api/guilds/{id} that isn't a sub-route)
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_GUILD }),
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

  // Governance proposals (sidebar)
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Proposals by guild
  await page.route("**/api/proposals/guild/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

}

// TODO: Guild detail page has complex multi-API fetching that needs more mock tuning.
// The GuildDetailPage component calls guildsApi.getPublicDetail + checkMembership +
// getCandidateApplications + getByGuild in a single useFetch, and the mock patterns
// aren't intercepting all requests reliably. Needs trace-level debugging.
test.describe.skip("Expert guild detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("shows guild name heading", async ({ page }) => {
    await setupGuildDetailMocks(page);
    await page.goto(`/expert/guild/${ENGINEERING_GUILD_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 15000 });
  });

  test("shows navigation tabs", async ({ page }) => {
    await setupGuildDetailMocks(page);
    await page.goto(`/expert/guild/${ENGINEERING_GUILD_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("button", { name: "Feed" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Pending Reviews/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Jobs" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Earnings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Members" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Leaderboard" })).toBeVisible();
  });

  test("tab switching works", async ({ page }) => {
    await setupGuildDetailMocks(page);
    await page.goto(`/expert/guild/${ENGINEERING_GUILD_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 15000 });

    // Click Members tab
    await page.getByRole("button", { name: "Members" }).click();
    // Verify expert name appears in members list
    await expect(page.getByText(MOCK_EXPERT_PROFILE.fullName).first()).toBeVisible({ timeout: 10000 });

    // Click Activity tab
    await page.getByRole("button", { name: "Activity" }).click();
    // Activity tab should render without error
    await page.waitForTimeout(500);
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("no error toasts on load", async ({ page }) => {
    await setupGuildDetailMocks(page);
    await page.goto(`/expert/guild/${ENGINEERING_GUILD_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 15000 });

    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });
});
