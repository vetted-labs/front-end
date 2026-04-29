import { expect, test, type Page } from "@playwright/test";
import { MOCK_EXPERT } from "./helpers/expert-auth";
import { TOUR_TARGETS } from "@/components/expert/onboarding/tourTargets";
import {
  APPLICATION_ID,
  MOCK_APPLICATION_ACTIVE,
  MOCK_EARNINGS_BREAKDOWN,
  MOCK_ENDORSEMENT_HISTORY,
  MOCK_GOVERNANCE_PROPOSAL,
  MOCK_GUILD,
  MOCK_EXPERT_PROFILE,
  MOCK_REPUTATION_TIMELINE_WITH_SLASHING,
  MOCK_VOTE_HISTORY,
  setupDashboardWithVoteWeight,
  setupVotingDetailMocks,
  setupVotingQueueMocks,
} from "./helpers/guild-mocks";

async function setupStoryLabMocks(
  page: Page,
  options?: { expertProfile?: Record<string, unknown> }
) {
  let onboardingState: unknown = null;

  await setupDashboardWithVoteWeight(page, { expertProfile: options?.expertProfile });
  await setupVotingQueueMocks(page);
  await setupVotingDetailMocks(page, APPLICATION_ID, {
    application: MOCK_APPLICATION_ACTIVE,
    voteHistory: MOCK_VOTE_HISTORY,
  });

  await page.route("**/api/experts/guilds/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          ...MOCK_GUILD,
          blockchainGuildId: MOCK_GUILD.id,
          guildApplications: [MOCK_APPLICATION_ACTIVE],
        },
      }),
    });
  });

  await page.route("**/api/blockchain/staking/guilds/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [{ guildId: MOCK_GUILD.id, stakedAmount: "100", meetsMinimum: true }],
      }),
    });
  });

  await page.route("**/api/blockchain/staking/sync", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { synced: true } }),
    });
  });

  await page.route("**/api/blockchain/staking/balance/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { stakedAmount: "100", meetsMinimum: true },
      }),
    });
  });

  await page.route("**/api/guilds/e2e-guild-engineering-001", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          ...MOCK_GUILD,
          blockchainGuildId: MOCK_GUILD.id,
          guildApplications: [MOCK_APPLICATION_ACTIVE],
        },
      }),
    });
  });

  await page.route("**/api/guilds/e2e-guild-engineering-001/posts**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { posts: [], total: 0 } }),
    });
  });

  await page.route("**/api/guilds/*/candidate-applications**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route("**/api/blockchain/endorsements/applications/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [], total: 0 } }),
    });
  });

  await page.route("**/api/experts/notifications**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          notifications: [
            {
              id: "story-lab-notification-001",
              type: "proposal_finalized",
              title: "Engineering review finalized",
              message: "Your vote aligned with consensus. Reward and reputation updated.",
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        },
      }),
    });
  });

  await page.route("**/api/experts/earnings/breakdown**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_EARNINGS_BREAKDOWN }),
    });
  });

  await page.route("**/api/experts/reputation/timeline**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_REPUTATION_TIMELINE_WITH_SLASHING }),
    });
  });

  await page.route("**/api/blockchain/endorsements/expert/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_ENDORSEMENT_HISTORY }),
    });
  });

  await page.route("**/api/endorsements**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { data: [], total: 0 } }),
    });
  });

  await page.route("**/api/experts/me/onboarding-state", async (route) => {
    if (route.request().method() === "PUT") {
      onboardingState = route.request().postDataJSON();
    }

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: onboardingState }),
    });
  });

  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [MOCK_GOVERNANCE_PROPOSAL] }),
    });
  });
}

async function seedExpertBrowserSession(page: Page) {
  await page.addInitScript((expert) => {
    const win = window as Window & {
      process?: { env?: Record<string, string> };
    };
    win.process = win.process ?? {};
    win.process.env = {
      ...win.process.env,
      NEXT_PUBLIC_E2E_MODE: "true",
    };
    localStorage.setItem("walletAddress", expert.walletAddress);
    localStorage.setItem("expertId", expert.expertId);
    localStorage.setItem("userType", "expert");
    localStorage.setItem("expertStatus", "approved");
  }, MOCK_EXPERT);
}

async function expectStoryStep(
  page: Page,
  step: string,
  pathPattern: RegExp,
  diagnostics: string[],
  expectedTarget?: string,
) {
  await expect(page).toHaveURL(pathPattern, { timeout: 20_000 });
  const driver = page.getByTestId("expert-story-lab-driver");
  try {
    await expect(driver).toBeVisible();
    await expect(driver).toContainText(step);
    await expect(driver.getByText("Target visible")).toBeVisible({ timeout: 20_000 });
    if (expectedTarget) {
      await expect(page.getByTestId("expert-story-lab-spotlight")).toHaveAttribute(
        "data-active-target",
        expectedTarget,
        { timeout: 20_000 }
      );
    }
    await expect(driver.locator('a[aria-label^="Go to"]')).toHaveCount(0);
    await expect(driver.getByRole("button", { name: /skip|close/i })).toHaveCount(0);
  } catch (error) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    console.log("STORY_LAB_FAILURE_URL", page.url());
    console.log("STORY_LAB_FAILURE_BODY", bodyText.slice(0, 2000));
    console.log("STORY_LAB_FAILURE_DIAGNOSTICS", diagnostics);
    throw error;
  }
}

async function expectFocusInsideStoryDriver(page: Page) {
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(document.activeElement?.closest('[data-testid="expert-story-lab-driver"]'))
      )
    )
    .toBe(true);
}

test.describe("expert story lab", () => {
  test("drives the story across real expert routes without skip or exit controls", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const diagnostics: string[] = [];
    const mutationRequests: string[] = [];
    page.on("request", (request) => {
      if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) return;
      const currentUrl = new URL(page.url());
      const isInsideStoryLab =
        currentUrl.pathname === "/story-lab/expert" ||
        currentUrl.searchParams.get("storyLab") === "expert" ||
        currentUrl.searchParams.get("storyLabComplete") === "expert";
      if (!isInsideStoryLab) return;
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/")) return;
      if (url.pathname === "/api/experts/me/onboarding-state") return;
      mutationRequests.push(
        `${request.method()} ${request.url()} from ${currentUrl.pathname}${currentUrl.search}`
      );
    });
    page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 400) {
        diagnostics.push(`response ${response.status()}: ${response.url()}`);
      }
    });
    page.on("console", (message) => {
      if (message.type() === "error") diagnostics.push(`console: ${message.text()}`);
    });

    await setupStoryLabMocks(page);
    await seedExpertBrowserSession(page);

    await page.goto("/story-lab/expert", { waitUntil: "domcontentloaded" });
    await expectStoryStep(page, "Start with the expert loop", /\/expert\/dashboard\?storyLab=expert&storyStep=overview/, diagnostics, TOUR_TARGETS.dashboardOverview);
    await expectFocusInsideStoryDriver(page);
    const appRoot = page.getByTestId("app-shell-root");
    await expect(appRoot).toHaveAttribute("aria-hidden", "true");
    await expect.poll(() => appRoot.evaluate((node) => (node as HTMLElement).inert)).toBe(true);

    await page.getByRole("link", { name: "Go to guilds" }).click();
    await expectStoryStep(page, "Guilds are where expertise is organized", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);
    await page.mouse.click(95, 180);
    await expectStoryStep(page, "Guilds are where expertise is organized", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);
    await page.getByRole("link", { name: "Back" }).focus();
    await page.keyboard.press("Enter");
    await expectStoryStep(page, "Start with the expert loop", /\/expert\/dashboard\?storyLab=expert&storyStep=overview/, diagnostics, TOUR_TARGETS.dashboardOverview);
    await page.getByRole("link", { name: "Go to guilds" }).click();
    await expectStoryStep(page, "Guilds are where expertise is organized", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);

    const openGuild = page.getByRole("link", { name: "Open a guild" });
    await expect(openGuild).toHaveAttribute(
      "href",
      /\/expert\/guild\/story-lab-engineering-guild/,
      { timeout: 20_000 }
    );
    await openGuild.click();
    await expectStoryStep(page, "Inspect guild standards before reviewing", /\/expert\/guild\/story-lab-engineering-guild\?storyLab=expert&storyStep=guild-detail/, diagnostics, TOUR_TARGETS.guildStandards);

    await page.getByRole("link", { name: "Go to applications" }).click();
    await expectStoryStep(page, "The review queue is the workbench", /\/expert\/voting\?storyLab=expert&storyStep=applications/, diagnostics, TOUR_TARGETS.applicationsOverview);
    await expect(page.getByText("Maya Chen")).toBeVisible();

    const openReview = page.getByRole("link", { name: "Show story application" });
    await openReview.click();
    await expectStoryStep(page, "Maya Chen is the story application", /\/expert\/voting\?storyLab=expert&storyStep=application-card/, diagnostics, TOUR_TARGETS.applicationReviewCard);

    await page.getByRole("link", { name: "Open review walkthrough" }).click();
    await expectStoryStep(page, "Start review by reading evidence", /\/expert\/voting\?storyLab=expert&storyStep=review-evidence/, diagnostics, TOUR_TARGETS.practiceReviewProfile);
    await expect(page.getByText("Practice sample / synthetic applicant")).toBeVisible();

    await page.getByRole("link", { name: "Show scoring rubric" }).click();
    await expectStoryStep(page, "Score evidence against the rubric", /\/expert\/voting\?storyLab=expert&storyStep=review-scoring/, diagnostics, TOUR_TARGETS.practiceReviewGeneralRubric);

    await page.getByRole("link", { name: "Show red flags" }).click();
    await expectStoryStep(page, "Record domain signal and red flags", /\/expert\/voting\?storyLab=expert&storyStep=review-red-flags/, diagnostics, TOUR_TARGETS.practiceReviewDomainRubric);

    await page.getByRole("link", { name: "Show commit behavior" }).click();
    await expectStoryStep(page, "Commit/reveal protects independent judgment", /\/expert\/voting\?storyLab=expert&storyStep=review-commit/, diagnostics, TOUR_TARGETS.practiceReviewCommitReveal);

    await page.getByRole("link", { name: "Show simulated result" }).click();
    await expectStoryStep(page, "The practice judgment resolves safely", /\/expert\/voting\?storyLab=expert&storyStep=review-result/, diagnostics, TOUR_TARGETS.practiceReviewResult);

    await page.getByRole("link", { name: "Show result notification" }).click();
    await expectStoryStep(page, "Consensus result arrives", /\/expert\/notifications\?storyLab=expert&storyStep=notification/, diagnostics, TOUR_TARGETS.notificationResultCard);
    await expect(page.getByText("Maya Chen review reached consensus")).toBeVisible();

    await page.getByRole("link", { name: "Open earnings" }).click();
    await expectStoryStep(page, "Reward is posted in Earnings", /\/expert\/earnings\?storyLab=expert&storyStep=earnings/, diagnostics, TOUR_TARGETS.earningsRewardRow);
    await expect(page.getByText(/Voting Reward: Maya Chen/)).toBeVisible();

    await page.getByRole("link", { name: "Open reputation" }).click();
    await expectStoryStep(page, "Reputation changes explain judgment quality", /\/expert\/reputation\?storyLab=expert&storyStep=reputation/, diagnostics, TOUR_TARGETS.reputationDeltaRow);
    await expect(page.getByText(/Aligned review on Maya Chen/)).toBeVisible();

    await page.getByRole("link", { name: "Open endorsements" }).click();
    await expectStoryStep(page, "Endorsement is a different kind of backing", /\/expert\/endorsements\?storyLab=expert&storyStep=endorsement/, diagnostics, TOUR_TARGETS.endorsementCandidateCard);
    await expect(page.getByText("Riley Park")).toBeVisible();

    await page.getByRole("link", { name: "Open governance" }).click();
    await expectStoryStep(page, "Guild decisions live in Governance", /\/expert\/governance\?storyLab=expert&storyStep=governance/, diagnostics, TOUR_TARGETS.governanceProposalCard);
    await expect(page.getByText(/Raise Engineering review quorum/).first()).toBeVisible();

    await page.getByRole("link", { name: "Finish story" }).click();
    await expectStoryStep(page, "The full expert story now makes sense", /\/expert\/dashboard\?storyLab=expert&storyStep=complete/, diagnostics, TOUR_TARGETS.dashboardOverview);

    await page.getByRole("link", { name: "Finish" }).click();
    await expect(page).toHaveURL(/\/expert\/dashboard$/);
    await expect(page.getByTestId("expert-story-lab-driver")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Expert story mode" })).toHaveCount(0);
    const actionableDiagnostics = diagnostics.filter(
      (entry) =>
        !entry.includes("Hydration failed") &&
        !entry.includes("tree hydrated but some attributes") &&
        !entry.includes("hydration-mismatch") &&
        !entry.includes("blocked by CORS policy") &&
        !entry.includes("Error checking Cross-Origin-Opener-Policy") &&
        !entry.includes("Analytics SDK: TypeError: Failed to fetch") &&
        !entry.includes("Failed to load resource: net::ERR_FAILED"),
    );
    expect(actionableDiagnostics).toEqual([]);
    expect(mutationRequests).toEqual([]);
  });

  test("does not complete onboarding from a direct completion deep link", async ({
    page,
  }) => {
    await setupStoryLabMocks(page);
    await seedExpertBrowserSession(page);

    await page.goto("/expert/dashboard?storyLabComplete=expert", {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/expert\/dashboard\?storyLab=expert&storyStep=overview/);
    await expect(page.getByTestId("expert-story-lab-driver")).toBeVisible();

    const onboardingState = await page.evaluate(() => {
      const rawValue = localStorage.getItem(
        "vetted:expert-onboarding-tour:v1:mock-expert-id-001"
      );
      return rawValue ? JSON.parse(rawValue) : null;
    });
    expect(onboardingState?.completed).not.toBe(true);
    expect(onboardingState?.events?.practiceReviewCompleted).not.toBe(true);
  });

  test("starts the route story for first-run experts from the dashboard", async ({ page }) => {
    await setupStoryLabMocks(page);
    await seedExpertBrowserSession(page);

    await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/expert\/dashboard\?storyLab=expert&storyStep=overview/);
    await expectStoryStep(
      page,
      "Start with the expert loop",
      /\/expert\/dashboard\?storyLab=expert&storyStep=overview/,
      [],
      TOUR_TARGETS.dashboardOverview
    );
  });

  test("dashboard surfaces the canonical 100 VETD stake during story mode", async ({ page }) => {
    await setupStoryLabMocks(page);
    // Override the real-API staking mock with an empty list so this assertion
    // actually proves withStoryLabGuildStakes ran. If the injector regresses,
    // the dashboard sees no stake and the test fails.
    await page.route("**/api/blockchain/staking/guilds/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
    await seedExpertBrowserSession(page);
    await page.goto("/story-lab/expert");
    await expect(page.getByText(/100 VETD/)).toBeVisible({ timeout: 15000 });
  });

  test("provides a deterministic story guild when the real expert has no guilds", async ({
    page,
  }) => {
    await setupStoryLabMocks(page, {
      expertProfile: { ...MOCK_EXPERT_PROFILE, guilds: [] },
    });
    await seedExpertBrowserSession(page);

    await page.goto("/story-lab/expert", { waitUntil: "domcontentloaded" });
    await expectStoryStep(
      page,
      "Start with the expert loop",
      /\/expert\/dashboard\?storyLab=expert&storyStep=overview/,
      [],
      TOUR_TARGETS.dashboardOverview
    );

    await page.getByRole("link", { name: "Go to guilds" }).click();
    await expectStoryStep(
      page,
      "Guilds are where expertise is organized",
      /\/expert\/guilds\?storyLab=expert&storyStep=guilds/,
      [],
      TOUR_TARGETS.guildDirectory
    );

    const openGuild = page.getByRole("link", { name: "Open a guild" });
    await expect(openGuild).toHaveAttribute(
      "href",
      /\/expert\/guild\/story-lab-engineering-guild/,
      { timeout: 20_000 }
    );
    await openGuild.click();
    await expectStoryStep(
      page,
      "Inspect guild standards before reviewing",
      /\/expert\/guild\/story-lab-engineering-guild\?storyLab=expert&storyStep=guild-detail/,
      [],
      TOUR_TARGETS.guildStandards
    );
  });
});
