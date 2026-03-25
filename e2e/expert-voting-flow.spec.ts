import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  APPLICATION_ID,
  MOCK_APPLICATION_VOTED,
  setupVotingDetailMocks,
} from "./helpers/guild-mocks";

test.describe("Expert voting interaction flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("expert can view application details and candidate profile", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    // Wait for the page to render — look for "CANDIDATE PROFILE" section or the candidate headline
    await expect(page.getByText("Senior Full-Stack Engineer").first()).toBeVisible({ timeout: 15000 });

    // Verify candidate bio from profile data
    await expect(
      page.getByText("Passionate about building great software").first(),
    ).toBeVisible();

    // Verify "Voting Open" status badge
    await expect(page.getByText("Voting Open").first()).toBeVisible();
  });

  test("voting page shows candidate profile section", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    // Wait for page to load
    await expect(page.getByText("Senior Full-Stack Engineer").first()).toBeVisible({ timeout: 15000 });

    // Verify CANDIDATE PROFILE label
    await expect(page.getByText("CANDIDATE PROFILE").first()).toBeVisible();

    // Verify social links are shown
    await expect(page.getByText("LinkedIn").first()).toBeVisible();
    await expect(page.getByText("GitHub").first()).toBeVisible();
  });

  test("Cast Your Vote button is visible for unvoted application", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Senior Full-Stack Engineer").first()).toBeVisible({ timeout: 15000 });

    // Cast Your Vote button should be visible for unvoted applications
    await expect(page.getByRole("button", { name: "Cast Your Vote" })).toBeVisible({ timeout: 10000 });
  });

  test("already voted application shows vote score", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      application: MOCK_APPLICATION_VOTED,
    });

    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    // Wait for the page to load
    await expect(page.getByText("Senior Full-Stack Engineer").first()).toBeVisible({ timeout: 15000 });

    // The page should show something indicating the vote was recorded
    // Either the score or a "voted" indicator
    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("75");
  });
});
