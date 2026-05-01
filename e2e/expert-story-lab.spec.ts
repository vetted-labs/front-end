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
    // The popover content lives in the new expert-story-lab-popover testid
    // since the rewrite (commit 436d665). Asserting on the popover specifically
    // (rather than the whole driver portal) keeps the heading-text match
    // resilient to the spotlight/centered-fallback layout split.
    const popover = page.getByTestId("expert-story-lab-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText(step);
    await expect(driver.getByText("Target visible")).toBeVisible({ timeout: 20_000 });
    if (expectedTarget) {
      await expect(page.getByTestId("expert-story-lab-spotlight")).toHaveAttribute(
        "data-active-target",
        expectedTarget,
        { timeout: 20_000 }
      );
    }
    // Sanity: the rewrite renders Back / Next as <button>, not <a>. If anyone
    // regresses to <a href> the next click would still work but would issue a
    // full navigation instead of a router.push/replace, breaking sub-stop URL
    // semantics. This guard catches that regression.
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

/**
 * Per-step sub-stop ids in author order.
 *
 * Source of truth: `src/components/expert/story-lab/storyLabData.ts`
 * (`STORY_LAB_STEPS[i].subStops`). When that file gains additional sub-stops
 * for any step, mirror them here so the per-step walk in the arc test asserts
 * URL transitions for every authored sub-stop.
 *
 * Right now (commit 436d665 / 5a5bd22), every step has exactly one sub-stop
 * with id === step.id, so the inner walk loop is a no-op per step. The walk
 * itself is exercised cross-step via clicks on the step's action button.
 */
const STORY_LAB_SUB_STOPS_BY_STEP: Record<string, string[]> = {
  overview: ["overview"],
  guilds: ["guilds"],
  "guild-detail": ["guild-detail"],
  applications: ["applications"],
  "application-card": ["application-card"],
  "review-evidence": ["review-evidence"],
  "review-scoring": ["review-scoring"],
  "review-red-flags": ["review-red-flags"],
  "review-commit": ["review-commit"],
  "review-result": ["review-result"],
  notification: ["notification"],
  earnings: ["earnings"],
  reputation: ["reputation"],
  endorsement: ["endorsement"],
  governance: ["governance"],
  complete: ["complete"],
};

/**
 * Walks the remaining sub-stops within a single step. Each click is on the
 * step's action button and is expected to call `router.replace` with the next
 * sub-stop id appended as `storySub=<id>`. The first sub-stop is implicit
 * (the test arrived at the step on the previous cross-step click); we only
 * walk subStops[1..n-1] here.
 *
 * For step authoring with a single sub-stop this is a no-op. The function is
 * still called so future sub-stop expansions get coverage automatically — the
 * only thing a future author needs to do is update STORY_LAB_SUB_STOPS_BY_STEP.
 */
async function walkRemainingSubStopsWithinStep(
  page: Page,
  stepId: string,
  actionLabel: string,
) {
  const subStopIds = STORY_LAB_SUB_STOPS_BY_STEP[stepId];
  if (!subStopIds || subStopIds.length <= 1) return;

  for (let i = 1; i < subStopIds.length; i += 1) {
    const nextId = subStopIds[i];
    await page.getByRole("button", { name: actionLabel }).click();
    await expect(page).toHaveURL(
      new RegExp(`storyStep=${stepId}.*storySub=${nextId}`),
      { timeout: 10_000 },
    );
    // Driver should still be open and on the same step.
    await expect(page.getByTestId("expert-story-lab-popover")).toBeVisible();
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

    // Walk per-step sub-stops first (no-op when a step has only one sub-stop).
    await walkRemainingSubStopsWithinStep(page, "overview", "Go to guilds");

    // Cross-step transition contract: clicking the step's action button must
    // navigate from storyStep=overview to storyStep=guilds (router.push), and
    // the URL must NOT retain the previous storyStep value. This locks in the
    // step→step routing so a regression to e.g. additive params is caught.
    await page.getByRole("button", { name: "Go to guilds" }).click();
    await expect(page).toHaveURL(/\/expert\/guilds\?storyLab=expert&storyStep=guilds/, {
      timeout: 20_000,
    });
    await expect(page).not.toHaveURL(/storyStep=overview/);
    await expectStoryStep(page, "Guilds are where expertise is organized", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);
    await page.mouse.click(95, 180);
    await expectStoryStep(page, "Guilds are where expertise is organized", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);
    await page.getByRole("button", { name: "Back" }).focus();
    await page.keyboard.press("Enter");
    await expectStoryStep(page, "Start with the expert loop", /\/expert\/dashboard\?storyLab=expert&storyStep=overview/, diagnostics, TOUR_TARGETS.dashboardOverview);
    await page.getByRole("button", { name: "Go to guilds" }).click();
    await expectStoryStep(page, "Guilds are where expertise is organized", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);
    await walkRemainingSubStopsWithinStep(page, "guilds", "Open a guild");

    // The "Open a guild" action navigates via dynamic route resolution. The
    // primary button is rendered as a <button>; the test only asserts the
    // resulting URL after click rather than reading an href off the button.
    await page.getByRole("button", { name: "Open a guild" }).click();
    await expectStoryStep(page, "Inspect guild standards before reviewing", /\/expert\/guild\/story-lab-engineering-guild\?storyLab=expert&storyStep=guild-detail/, diagnostics, TOUR_TARGETS.guildStandards);
    await walkRemainingSubStopsWithinStep(page, "guild-detail", "Go to applications");

    await page.getByRole("button", { name: "Go to applications" }).click();
    await expectStoryStep(page, "The review queue is the workbench", /\/expert\/voting\?storyLab=expert&storyStep=applications/, diagnostics, TOUR_TARGETS.applicationsOverview);
    await expect(page.getByText("Maya Chen")).toBeVisible();
    await walkRemainingSubStopsWithinStep(page, "applications", "Show story application");

    await page.getByRole("button", { name: "Show story application" }).click();
    await expectStoryStep(page, "Maya Chen is the story application", /\/expert\/voting\?storyLab=expert&storyStep=application-card/, diagnostics, TOUR_TARGETS.applicationReviewCard);
    await walkRemainingSubStopsWithinStep(page, "application-card", "Open review walkthrough");

    await page.getByRole("button", { name: "Open review walkthrough" }).click();
    await expectStoryStep(page, "Start review by reading evidence", /\/expert\/voting\?storyLab=expert&storyStep=review-evidence/, diagnostics, TOUR_TARGETS.practiceReviewProfile);
    await expect(page.getByText("Practice sample / synthetic applicant")).toBeVisible();
    await walkRemainingSubStopsWithinStep(page, "review-evidence", "Show scoring rubric");

    await page.getByRole("button", { name: "Show scoring rubric" }).click();
    await expectStoryStep(page, "Score evidence against the rubric", /\/expert\/voting\?storyLab=expert&storyStep=review-scoring/, diagnostics, TOUR_TARGETS.practiceReviewGeneralRubric);
    await walkRemainingSubStopsWithinStep(page, "review-scoring", "Show red flags");

    await page.getByRole("button", { name: "Show red flags" }).click();
    await expectStoryStep(page, "Record domain signal and red flags", /\/expert\/voting\?storyLab=expert&storyStep=review-red-flags/, diagnostics, TOUR_TARGETS.practiceReviewDomainRubric);
    await walkRemainingSubStopsWithinStep(page, "review-red-flags", "Show commit behavior");

    await page.getByRole("button", { name: "Show commit behavior" }).click();
    await expectStoryStep(page, "Commit/reveal protects independent judgment", /\/expert\/voting\?storyLab=expert&storyStep=review-commit/, diagnostics, TOUR_TARGETS.practiceReviewCommitReveal);
    await walkRemainingSubStopsWithinStep(page, "review-commit", "Show simulated result");

    await page.getByRole("button", { name: "Show simulated result" }).click();
    await expectStoryStep(page, "The practice judgment resolves safely", /\/expert\/voting\?storyLab=expert&storyStep=review-result/, diagnostics, TOUR_TARGETS.practiceReviewResult);
    await walkRemainingSubStopsWithinStep(page, "review-result", "Show result notification");

    await page.getByRole("button", { name: "Show result notification" }).click();
    await expectStoryStep(page, "Consensus result arrives", /\/expert\/notifications\?storyLab=expert&storyStep=notification/, diagnostics, TOUR_TARGETS.notificationResultCard);
    await expect(page.getByText("Maya Chen review reached consensus")).toBeVisible();
    await walkRemainingSubStopsWithinStep(page, "notification", "Open earnings");

    await page.getByRole("button", { name: "Open earnings" }).click();
    await expectStoryStep(page, "Reward is posted in Earnings", /\/expert\/earnings\?storyLab=expert&storyStep=earnings/, diagnostics, TOUR_TARGETS.earningsRewardRow);
    await expect(page.getByText(/Voting Reward: Maya Chen/)).toBeVisible();
    await walkRemainingSubStopsWithinStep(page, "earnings", "Open reputation");

    await page.getByRole("button", { name: "Open reputation" }).click();
    await expectStoryStep(page, "Reputation changes explain judgment quality", /\/expert\/reputation\?storyLab=expert&storyStep=reputation/, diagnostics, TOUR_TARGETS.reputationDeltaRow);
    await expect(page.getByText(/Aligned review on Maya Chen/)).toBeVisible();
    await walkRemainingSubStopsWithinStep(page, "reputation", "Open endorsements");

    await page.getByRole("button", { name: "Open endorsements" }).click();
    await expectStoryStep(page, "Endorsement is a different kind of backing", /\/expert\/endorsements\?storyLab=expert&storyStep=endorsement/, diagnostics, TOUR_TARGETS.endorsementCandidateCard);
    await expect(page.getByText("Riley Park")).toBeVisible();
    await walkRemainingSubStopsWithinStep(page, "endorsement", "Open governance");

    await page.getByRole("button", { name: "Open governance" }).click();
    await expectStoryStep(page, "Guild decisions live in Governance", /\/expert\/governance\?storyLab=expert&storyStep=governance/, diagnostics, TOUR_TARGETS.governanceProposalCard);
    await expect(page.getByText(/Raise Engineering review quorum/).first()).toBeVisible();
    await walkRemainingSubStopsWithinStep(page, "governance", "Finish story");

    await page.getByRole("button", { name: "Finish story" }).click();
    await expectStoryStep(page, "The full expert story now makes sense", /\/expert\/dashboard\?storyLab=expert&storyStep=complete/, diagnostics, TOUR_TARGETS.dashboardOverview);
    await walkRemainingSubStopsWithinStep(page, "complete", "Finish");

    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page).toHaveURL(/\/expert\/dashboard$/);
    // After Finish the URL must contain none of the story params — proves the
    // Finish path scrubs storyLab, storyStep, and storySub on completion.
    const finalUrl = new URL(page.url());
    expect(finalUrl.searchParams.get("storyLab")).toBeNull();
    expect(finalUrl.searchParams.get("storyStep")).toBeNull();
    expect(finalUrl.searchParams.get("storySub")).toBeNull();
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

  test("Finish scrubs all story params and persists completion", async ({ page }) => {
    let putBody: unknown = null;
    await setupStoryLabMocks(page);
    await seedExpertBrowserSession(page);

    // Capture the PUT to /api/experts/me/onboarding-state.
    await page.route("**/api/experts/me/onboarding-state", async (route) => {
      if (route.request().method() === "PUT") {
        putBody = route.request().postDataJSON();
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: putBody ?? null }),
      });
    });

    // Walk to the last step directly via URL state, then click Finish.
    await page.goto("/expert/dashboard?storyLab=expert&storyStep=complete");
    await page.getByRole("button", { name: "Finish" }).click();

    await expect(page).toHaveURL(/\/expert\/dashboard$/);
    expect(new URL(page.url()).searchParams.toString()).toBe("");
    await expect.poll(() => putBody).toMatchObject({ completed: true });
  });

  test("non-story expert routes do not render any story-lab DOM", async ({ page }) => {
    // Mock minimal dashboard endpoints so the page actually renders.
    await page.route("**/api/experts/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      }),
    );
    await page.route("**/api/blockchain/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      }),
    );

    // Capture any uncaught exceptions — if the StoryLabLeakDetector throws,
    // the page errors propagate here.
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await seedExpertBrowserSession(page);

    // Mark onboarding completed locally so the layout doesn't auto-redirect
    // into story mode. Key shape: vetted:expert-onboarding-tour:v1:<expertId>.
    await page.addInitScript((expertId) => {
      const key = `vetted:expert-onboarding-tour:v1:${expertId}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          dismissed: false,
          completed: true,
          checklistDismissed: false,
          events: {},
        }),
      );
    }, MOCK_EXPERT.expertId);

    await page.goto("/expert/dashboard");

    // Wait briefly for the dashboard tree to mount.
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    // No story-prefixed DOM should be present.
    const leaks = page.locator("[id^='story-lab-'], [data-story-lab-guild-id], [data-story-lab-review-url]");
    await expect(leaks).toHaveCount(0);

    // The leak detector must not have thrown.
    const storyLabErrors = pageErrors.filter((m) => m.includes("StoryLab leak"));
    expect(storyLabErrors).toEqual([]);
  });

  test("leak detector throws when story-lab DOM appears outside story mode", async ({
    page,
  }) => {
    // This proves the detector itself works. We synthetically inject a node
    // with `data-story-lab-guild-id` while the URL has neither `storyLab=expert`
    // nor `storyLabComplete=expert`. The MutationObserver inside
    // StoryLabLeakDetector must throw a "StoryLab leak detected" error.
    await page.route("**/api/experts/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      }),
    );
    await page.route("**/api/blockchain/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      }),
    );

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await seedExpertBrowserSession(page);

    // Suppress the auto-redirect into story mode so the URL stays clean.
    await page.addInitScript((expertId) => {
      const key = `vetted:expert-onboarding-tour:v1:${expertId}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          dismissed: false,
          completed: true,
          checklistDismissed: false,
          events: {},
        }),
      );
    }, MOCK_EXPERT.expertId);

    await page.goto("/expert/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Confirm the URL is clean before injecting (otherwise the detector early-returns).
    const url = new URL(page.url());
    expect(url.searchParams.get("storyLab")).toBeNull();
    expect(url.searchParams.get("storyLabComplete")).toBeNull();

    // Wait briefly for the layout's StoryLabLeakDetector effect to mount and
    // start observing the DOM. If we inject before mount, the initial sweep
    // would catch it but only via querySelector (still fine), but observing a
    // mounted MutationObserver is the more interesting code path.
    await page.waitForTimeout(500);

    // Inject a leak. This must trigger the detector.
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.setAttribute("data-story-lab-guild-id", "synthetic-leak");
      el.textContent = "synthetic story-lab leak";
      document.body.appendChild(el);
    });

    // The detector calls console.error AND throws. We assert on both because:
    // - console.error is the dev-mode signal users see in their terminal
    // - throw is what fails Playwright/CI when story DOM truly leaks
    await expect
      .poll(() => consoleErrors.find((m) => m.includes("StoryLab leak detected")), {
        timeout: 2000,
      })
      .toBeTruthy();

    await expect
      .poll(() => pageErrors.find((m) => m.includes("StoryLab leak detected")), {
        timeout: 2000,
      })
      .toBeTruthy();
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

    await page.getByRole("button", { name: "Go to guilds" }).click();
    await expectStoryStep(
      page,
      "Guilds are where expertise is organized",
      /\/expert\/guilds\?storyLab=expert&storyStep=guilds/,
      [],
      TOUR_TARGETS.guildDirectory
    );

    // The action button is now a <button>; the dynamic guild route is resolved
    // inside goNextSubStop, not exposed as an href on the trigger. Assert by
    // observing the resulting URL after the click instead.
    await page.getByRole("button", { name: "Open a guild" }).click();
    await expectStoryStep(
      page,
      "Inspect guild standards before reviewing",
      /\/expert\/guild\/story-lab-engineering-guild\?storyLab=expert&storyStep=guild-detail/,
      [],
      TOUR_TARGETS.guildStandards
    );
  });
});
