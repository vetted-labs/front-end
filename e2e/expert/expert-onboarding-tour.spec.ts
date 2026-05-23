import { test, expect, type Page } from "@playwright/test";
import { setExpertSession } from "../helpers/expert-auth";
import {
  MOCK_EXPERT_PROFILE,
  setupDashboardWithVoteWeight,
} from "../helpers/guild-mocks";

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

// The first-run expert onboarding is now a forced, URL-driven guided story
// (the "story lab" spotlight tour rendered by ExpertStoryLabDriver) instead of
// the old in-dashboard "Expert story mode" modal. The dialog is labelled by the
// active stop's title; the first stop on the dashboard is "This is your home
// base for review work". Navigation is via "Continue" (and a sidebar "navTrigger"
// at the end of a step), and the first stop offers no Skip/Close escape — the
// story is mandatory until completed.
const FIRST_STOP_TITLE = "This is your home base for review work";

test.describe("Expert first-run story", () => {
  test("forces the guided story and walks the expert through the dashboard toward real work", async ({ page }) => {
    await test.step("expert session is prepared with onboarding tour state cleared", async () => {
      await setupExpertDashboard(page);
    });

    await test.step("expert opens the dashboard and the forced story launches automatically", async () => {
      await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

      const story = page.getByRole("dialog", { name: FIRST_STOP_TITLE });
      await expect(story).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("heading", { name: FIRST_STOP_TITLE })).toBeVisible();
      // First-run story is mandatory: no skip/close/end-tour escape on the first stop.
      await expect(story.getByRole("button", { name: /skip/i })).toHaveCount(0);
      await expect(story.getByRole("button", { name: /close/i })).toHaveCount(0);
      await expect(story.getByRole("button", { name: /end tour/i })).toHaveCount(0);
    });

    await test.step("expert advances through the guided dashboard stops with Continue", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Five numbers tell you how you're doing" })
      ).toBeVisible({ timeout: 10000 });

      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("heading", { name: "Reputation is your weight on the panel" })
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step("the story drives the expert toward review work via the guilds nav trigger", async () => {
      // Advance through the remaining dashboard sub-stops until the story hands
      // off to the sidebar: the final dashboard stop instructs the expert to
      // click "My Guilds" to continue into real review work. Poll-and-settle
      // rather than blind-clicking — under load the sub-stop transitions lag,
      // so wait for each one before advancing and stop once the handoff shows.
      const myGuildsPrompt = page.getByText(/Click .*My Guilds.* in the sidebar/i);
      for (let i = 0; i < 8; i += 1) {
        if (await myGuildsPrompt.isVisible().catch(() => false)) break;
        const continueBtn = page.getByRole("button", { name: "Continue" });
        if (!(await continueBtn.isVisible().catch(() => false))) break;
        await continueBtn.click();
        // Let the sub-stop transition settle before the next advance/poll.
        await page.waitForTimeout(400);
      }
      await expect(myGuildsPrompt).toBeVisible({ timeout: 10000 });
    });
  });

  test("redirects unfinished experts from deep links back to the dashboard story", async ({ page }) => {
    await test.step("expert session is prepared with onboarding tour state cleared", async () => {
      await setupExpertDashboard(page);
    });

    await test.step("expert tries to navigate directly to the earnings page", async () => {
      await page.goto("/expert/earnings", { waitUntil: "domcontentloaded" });
    });

    await test.step("expert is redirected to the dashboard where the forced story is shown", async () => {
      await expect(page).toHaveURL(/\/expert\/dashboard/, { timeout: 15000 });
      await expect(
        page.getByRole("dialog", { name: FIRST_STOP_TITLE })
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: FIRST_STOP_TITLE })).toBeVisible();
    });
  });
});
