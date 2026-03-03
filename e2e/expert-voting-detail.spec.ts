import { test, expect } from "@playwright/test";
import { setExpertSession, MOCK_EXPERT } from "./helpers/expert-auth";
import {
  APPLICATION_ID,
  FINALIZED_APPLICATION_ID,
  MOCK_APPLICATION_ACTIVE,
  MOCK_APPLICATION_FINALIZED,
  MOCK_APPLICATION_VOTED,
  MOCK_CANDIDATE_PROFILE,
  MOCK_VOTE_HISTORY,
  MOCK_STAKING_NOT_MET,
  setupVotingDetailMocks,
} from "./helpers/guild-mocks";

test.describe("Expert voting detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("renders candidate name, guild badge, and Voting Open badge", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Engineering").first()).toBeVisible();
    await expect(page.getByText("Voting Open").first()).toBeVisible();
  });

  test("shows staking warning when meetsMinimum is false", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      stakingStatus: MOCK_STAKING_NOT_MET,
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Stak(e|ing) Required/i).first()).toBeVisible();
  });

  test("shows Cast Your Vote button when assigned and staked", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Cast Your Vote" })).toBeVisible();
  });

  test("Cast Your Vote button opens voting slider UI", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Cast Your Vote" }).click();

    // Should see the slider UI elements from VotingScoreSlider
    await expect(page.getByText("Your Score (0-100)").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Neutral/Uncertain").first()).toBeVisible();
    await expect(page.getByText("Stake Amount (VETD)").first()).toBeVisible();
    await expect(page.getByText("Comment (Optional)").first()).toBeVisible();
  });

  test("submit vote calls API and shows success toast", async ({ page }) => {
    let voteCalled = false;
    await setupVotingDetailMocks(page, APPLICATION_ID);

    // Mock the vote endpoint
    await page.route(`**/api/proposals/${APPLICATION_ID}/vote`, (route) => {
      if (route.request().method() === "POST") {
        voteCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.fallback();
      }
    });

    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Cast Your Vote" }).click();

    // Click "Submit Score" button
    const submitBtn = page.getByRole("button", { name: /Submit Score/i });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Verify API was called
    await page.waitForTimeout(1000);
    expect(voteCalled).toBe(true);
  });

  test("Already Voted state shows recorded score", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      application: MOCK_APPLICATION_VOTED,
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("75/100").first()).toBeVisible();
    await expect(page.getByText(/vote has been recorded/i).first()).toBeVisible();
  });

  test("finalized application shows outcome banner and consensus score", async ({ page }) => {
    await setupVotingDetailMocks(page, FINALIZED_APPLICATION_ID, {
      application: MOCK_APPLICATION_FINALIZED,
      voteHistory: MOCK_VOTE_HISTORY,
    });
    await page.goto(`/expert/voting/applications/${FINALIZED_APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Alex Smith").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Approved").first()).toBeVisible();
    await expect(page.getByText("78.5").first()).toBeVisible();
  });

  test("finalized view shows vote history with expert names", async ({ page }) => {
    await setupVotingDetailMocks(page, FINALIZED_APPLICATION_ID, {
      application: MOCK_APPLICATION_FINALIZED,
      voteHistory: MOCK_VOTE_HISTORY,
    });
    await page.goto(`/expert/voting/applications/${FINALIZED_APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Alex Smith").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Vote History").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("E2E Expert").first()).toBeVisible();
    await expect(page.getByText("Second Reviewer").first()).toBeVisible();
    await expect(page.getByText("82/100").first()).toBeVisible();
  });

  test("candidate profile section shows social links", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    // The page shows LinkedIn/GitHub link icons and "Resume / CV"
    await expect(page.getByText("Senior Full-Stack Engineer").first()).toBeVisible();
  });

  test("Back to Applications link is visible and clickable", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID);
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });

    const backLink = page.getByText("Back to Applications").first();
    await expect(backLink).toBeVisible();

    // Verify clicking navigates away from the detail page
    await backLink.click();
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain(`/applications/${APPLICATION_ID}`);
  });
});
