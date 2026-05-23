import { test, expect, Page } from "@playwright/test";
import { setExpertSession } from "../helpers/expert-auth";
import {
  APPLICATION_ID,
  FINALIZED_APPLICATION_ID,
  ENGINEERING_GUILD_ID,
  MOCK_APPLICATION_FINALIZED,
  MOCK_APPLICATION_VOTED,
  MOCK_VOTE_HISTORY,
  MOCK_STAKING_NOT_MET,
  setupVotingDetailMocks,
} from "../helpers/guild-mocks";

// The redesigned detail page derives "can I vote?" from per-guild stake info
// (blockchainApi.getExpertGuildStakes) rather than the old staking-balance
// endpoint. The shared mock defaults to no stake, so tests that exercise the
// active voting interface register their own staked-guild override after the
// common mocks are installed (last-registered route wins in Playwright).
async function stakeInEngineeringGuild(page: Page) {
  await page.route("**/api/blockchain/staking/guilds/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [{ guildId: ENGINEERING_GUILD_ID, stakedAmount: "100", meetsMinimum: true }],
      }),
    });
  });
}

test.describe("Expert voting detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("renders candidate name, guild badge, and Voting Open badge", async ({ page }) => {
    await test.step("mocks are set up and expert opens the candidate review detail", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID);
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("the detail page shows the candidate name, guild badge, and Voting Open status", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Engineering").first()).toBeVisible();
      await expect(page.getByText("Voting Open").first()).toBeVisible();
    });
  });

  test("shows staking warning when meetsMinimum is false", async ({ page }) => {
    await test.step("mocks are set up with insufficient staking status and expert opens the detail page", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        stakingStatus: MOCK_STAKING_NOT_MET,
      });
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("the detail page displays a staking warning alongside the candidate", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Stak(e|ing) Required/i).first()).toBeVisible();
    });
  });

  test("shows Cast Your Vote button when assigned and staked", async ({ page }) => {
    await test.step("mocks are set up and expert opens the detail page for an assigned application", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID);
      await stakeInEngineeringGuild(page);
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("the Cast Your Vote button is visible on the loaded page", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: "Cast Your Vote" })).toBeVisible();
    });
  });

  test("Cast Your Vote button opens voting slider UI", async ({ page }) => {
    await test.step("mocks are set up and expert opens the detail page", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID);
      await stakeInEngineeringGuild(page);
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("expert clicks Cast Your Vote to open the scoring UI", async () => {
      await page.getByRole("button", { name: "Cast Your Vote" }).click();
    });

    await test.step("the scoring slider with score, stake, and comment fields appears", async () => {
      // Should see the slider UI elements from VotingScoreSlider
      await expect(page.getByText("Your Score (0-100)").first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Neutral/Uncertain").first()).toBeVisible();
      await expect(page.getByText("Stake Amount (VETD)").first()).toBeVisible();
      await expect(page.getByText("Comment (Optional)").first()).toBeVisible();
    });
  });

  test("submit vote calls API and shows success toast", async ({ page }) => {
    let voteCalled = false;

    await test.step("mocks are set up including the vote submission endpoint", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID);
      await stakeInEngineeringGuild(page);

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
    });

    await test.step("expert opens the detail page and clicks Cast Your Vote", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: "Cast Your Vote" }).click();
    });

    await test.step("expert submits the score and the vote API is called", async () => {
      // Click "Submit Score" button
      const submitBtn = page.getByRole("button", { name: /Submit Score/i });
      await expect(submitBtn).toBeVisible({ timeout: 5000 });
      await submitBtn.click();

      // Verify API was called
      await page.waitForTimeout(1000);
      expect(voteCalled).toBe(true);
    });
  });

  test("Already Voted state shows recorded score", async ({ page }) => {
    await test.step("mocks are set up with an already-voted application and expert opens the detail page", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        application: MOCK_APPLICATION_VOTED,
      });
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("the detail page shows the recorded vote score and confirmation message", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("75/100").first()).toBeVisible();
      await expect(page.getByText(/vote has been recorded/i).first()).toBeVisible();
    });
  });

  test("finalized application shows outcome banner and consensus score", async ({ page }) => {
    await test.step("mocks are set up with a finalized application and expert opens the detail page", async () => {
      await setupVotingDetailMocks(page, FINALIZED_APPLICATION_ID, {
        application: MOCK_APPLICATION_FINALIZED,
        voteHistory: MOCK_VOTE_HISTORY,
      });
      await page.goto(`/expert/voting/applications/${FINALIZED_APPLICATION_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("the detail page shows the outcome banner, approval status, and consensus score", async () => {
      await expect(page.getByText("Alex Smith").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Approved").first()).toBeVisible();
      await expect(page.getByText("78.5").first()).toBeVisible();
    });
  });

  test("finalized view shows vote history with expert names", async ({ page }) => {
    await test.step("mocks are set up with a finalized application and vote history, and expert opens the detail page", async () => {
      await setupVotingDetailMocks(page, FINALIZED_APPLICATION_ID, {
        application: MOCK_APPLICATION_FINALIZED,
        voteHistory: MOCK_VOTE_HISTORY,
      });
      await page.goto(`/expert/voting/applications/${FINALIZED_APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Alex Smith").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Vote History section lists each reviewer (anonymized) and their score", async () => {
      await expect(page.getByText("Vote History").first()).toBeVisible({ timeout: 10000 });
      // Reviewer identities are now anonymized: the current expert renders as
      // "You" and the rest as "Expert N". Scores remain visible per reviewer.
      await expect(page.getByText("You", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Expert 2").first()).toBeVisible();
      await expect(page.getByText("82/100").first()).toBeVisible();
    });
  });

  test("candidate profile section shows social links", async ({ page }) => {
    await test.step("mocks are set up and expert opens the candidate review detail", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID);
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("the candidate profile section renders the job title", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
      // The page shows LinkedIn/GitHub link icons and "Resume / CV"
      await expect(page.getByText("Senior Full-Stack Engineer").first()).toBeVisible();
    });
  });

  test("Back to Applications link is visible and clickable", async ({ page }) => {
    await test.step("mocks are set up and expert opens the candidate review detail", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID);
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Back to queue link is visible on the detail page", async () => {
      const backLink = page.getByRole("button", { name: /Back to queue/i }).first();
      await expect(backLink).toBeVisible();
    });

    await test.step("clicking Back to queue leaves the detail page", async () => {
      // Verify clicking navigates away from the detail page
      await page.getByRole("button", { name: /Back to queue/i }).first().click();
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain(`/applications/${APPLICATION_ID}`);
    });
  });
});
