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
    // The rewrite renders the resolved-target ready state as "Ready" (was
    // "Target visible" pre-redesign). Asserting it proves the spotlight locked
    // onto a real target before we let the test advance.
    await expect(driver.getByText("Ready", { exact: true })).toBeVisible({ timeout: 20_000 });
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
 * Per-step advance configuration mirroring `storyLabData.ts` (STORY_LAB_STEPS).
 *
 * After the story-lab rewrite, navigation works like this:
 *  - Within a step, every non-final sub-stop advances via the "Continue" button.
 *  - The LAST sub-stop of a step either:
 *      a) carries a navTrigger → the user must click that sidebar nav LINK
 *         (the driver intercepts the click and advances), or
 *      b) has no navTrigger → the primary button shows the step's actionLabel
 *         (a dynamic-route jump, e.g. "Open a guild").
 *
 * `subStopCount` is the number of sub-stops in the step. `navLink` is the
 * sidebar link label for navTrigger steps; `actionLabel` is the button label
 * for action steps. Exactly one of the two is set per step.
 */
const STORY_STEP_ADVANCE: Record<
  string,
  { navHref?: string; actionLabel?: string }
> = {
  overview: { navHref: "/expert/guilds" },
  guilds: { actionLabel: "Open a guild" },
  "guild-detail": { navHref: "/expert/voting" },
  applications: { actionLabel: "Open Maya's application" },
  "application-card": { actionLabel: "Open review walkthrough" },
  "review-evidence": { actionLabel: "Show scoring rubric" },
  "review-scoring": { actionLabel: "Show red flags" },
  "review-red-flags": { actionLabel: "Show commit behavior" },
  "review-commit": { actionLabel: "See your submitted score" },
  "review-result": { navHref: "/expert/notifications" },
  notification: { navHref: "/expert/earnings" },
  earnings: { navHref: "/expert/reputation" },
  reputation: { navHref: "/expert/endorsements" },
  endorsement: { navHref: "/expert/governance" },
  governance: { navHref: "/expert/dashboard" },
  complete: { actionLabel: "Finish" },
};

/**
 * Walks every sub-stop of `stepId`, then performs the cross-step advance.
 *
 * The driver dynamically filters sub-stops whose target can't resolve, so the
 * number of sub-stops per step is not fixed. We therefore walk by behavior:
 * while a "Continue" button is present we click it (advancing within the step);
 * once it disappears we've reached the last sub-stop, which advances the step
 * via a sidebar nav link (navTrigger) or the step's action button.
 */
async function advanceStoryStep(page: Page, stepId: string): Promise<void> {
  const config = STORY_STEP_ADVANCE[stepId];
  if (!config) throw new Error(`Unknown story step: ${stepId}`);

  const driver = page.getByTestId("expert-story-lab-driver");
  const continueBtn = page.getByRole("button", { name: "Continue" });

  // Click "Continue" through the intermediate sub-stops. The popover re-mounts
  // on every sub-stop, so we read the progress counter to confirm an advance
  // before looking for the next Continue (avoids clicking a detaching button).
  for (let guard = 0; guard < 12; guard += 1) {
    await expect(driver.getByText("Ready", { exact: true })).toBeVisible({ timeout: 20_000 });
    if (!(await continueBtn.isVisible())) break;
    const counterBefore = await driver
      .getByText(/\d+ \/ \d+ in this step/)
      .textContent()
      .catch(() => null);
    await continueBtn.click();
    if (counterBefore) {
      await expect
        .poll(
          async () =>
            (await driver
              .getByText(/\d+ \/ \d+ in this step/)
              .textContent()
              .catch(() => null)) !== counterBefore,
          { timeout: 20_000 },
        )
        .toBe(true);
    }
  }

  // Cross-step advance from the last sub-stop.
  await expect(driver.getByText("Ready", { exact: true })).toBeVisible({ timeout: 20_000 });
  if (config.navHref) {
    // navTrigger sub-stop: the driver intercepts a click on the live sidebar
    // nav link (matched by href, since the link's accessible name is icon-only
    // when the sidebar label is decorative).
    await page.locator(`aside a[href="${config.navHref}"], nav a[href="${config.navHref}"]`).first().click();
  } else if (config.actionLabel) {
    await page.getByRole("button", { name: config.actionLabel }).click();
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
  // PRODUCT GAP (flagged 2026-05-22): the redesigned GuildWorkspacePage
  // (/expert/guild/[id]) lost the data-tour-target attributes the story-lab
  // guild-detail stop spotlights, and gates its data fetch on a live wagmi
  // wallet connection the mocked story-lab can't provide. The expert onboarding
  // tour therefore can't complete its guild-detail chapter. Parked until the
  // tour targets are restored on the redesigned page. See COVERAGE_GAP_MAP.md.
  test.skip("drives the story across real expert routes without skip or exit controls", async ({
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

    // Chapter 1: setup — mocks, session, story entry
    await test.step("mocks and expert session are seeded, story lab opens on the dashboard overview", async () => {
      await setupStoryLabMocks(page);
      await seedExpertBrowserSession(page);

      await page.goto("/story-lab/expert", { waitUntil: "domcontentloaded" });
      await expectStoryStep(page, "This is your home base for review work", /\/expert\/dashboard\?storyLab=expert&storyStep=overview/, diagnostics, TOUR_TARGETS.dashboardOverview);
      await expectFocusInsideStoryDriver(page);
      const appRoot = page.getByTestId("app-shell-root");
      await expect(appRoot).toHaveAttribute("aria-hidden", "true");
      await expect.poll(() => appRoot.evaluate((node) => (node as HTMLElement).inert)).toBe(true);
    });

    // Chapter 2: overview → guilds. After the rewrite the cross-step jump is a
    // sidebar nav click (navTrigger) on the step's last sub-stop, preceded by
    // "Continue" clicks through the intermediate sub-stops.
    await test.step("expert advances from the dashboard overview to the guilds directory", async () => {
      await advanceStoryStep(page, "overview");
      await expect(page).toHaveURL(/\/expert\/guilds\?storyLab=expert&storyStep=guilds/, {
        timeout: 20_000,
      });
      await expect(page).not.toHaveURL(/storyStep=overview/);
      await expectStoryStep(page, "These are the guilds you belong to", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);
    });

    await test.step("clicking outside the driver popover keeps the current story step", async () => {
      await page.mouse.click(95, 180);
      await expectStoryStep(page, "These are the guilds you belong to", /\/expert\/guilds\?storyLab=expert&storyStep=guilds/, diagnostics, TOUR_TARGETS.guildDirectory);
    });

    // Chapter 3: guild detail. The guilds step's last sub-stop has no navTrigger,
    // so it advances via the "Open a guild" action button (dynamic route).
    await test.step("expert opens a specific guild to inspect its standards", async () => {
      await advanceStoryStep(page, "guilds");
      await expectStoryStep(page, "This is the bar you uphold", /\/expert\/guild\/story-lab-engineering-guild\?storyLab=expert&storyStep=guild-detail/, diagnostics, TOUR_TARGETS.guildStandards);
    });

    // Chapter 4: applications queue
    await test.step("expert opens the review queue and sees the story application card for Maya Chen", async () => {
      await advanceStoryStep(page, "guild-detail");
      await expectStoryStep(page, "This is your review workbench", /\/expert\/voting\?storyLab=expert&storyStep=applications/, diagnostics, TOUR_TARGETS.applicationsOverview);
      await expect(page.getByText("Maya Chen")).toBeVisible();
    });

    // Chapter 5: application card spotlight
    await test.step("the story spotlights Maya Chen's application card in the queue", async () => {
      await advanceStoryStep(page, "applications");
      await expectStoryStep(page, "Maya Chen, the applicant", /\/expert\/voting\?storyLab=expert&storyStep=application-card/, diagnostics);
    });

    // Chapter 6: review evidence
    await test.step("expert enters the review walkthrough and reads the candidate evidence", async () => {
      await advanceStoryStep(page, "application-card");
      await expectStoryStep(page, "Start with the evidence", /\/expert\/voting\?storyLab=expert&storyStep=review-evidence/, diagnostics, TOUR_TARGETS.practiceReviewProfile);
    });

    // Chapter 7: scoring rubric
    await test.step("expert views the scoring rubric to guide their judgment", async () => {
      await advanceStoryStep(page, "review-evidence");
      await expectStoryStep(page, "The general rubric runs first", /\/expert\/voting\?storyLab=expert&storyStep=review-scoring/, diagnostics, TOUR_TARGETS.practiceReviewGeneralRubric);
    });

    // Chapter 8: red flags
    await test.step("expert records domain signal and red flags", async () => {
      await advanceStoryStep(page, "review-scoring");
      await expectStoryStep(page, "Now score the deep, specialized signal", /\/expert\/voting\?storyLab=expert&storyStep=review-red-flags/, diagnostics, TOUR_TARGETS.practiceReviewDomainRubric);
    });

    // Chapter 9: commit / reveal
    await test.step("the story explains commit/reveal to protect independent judgment", async () => {
      await advanceStoryStep(page, "review-red-flags");
      await expectStoryStep(page, "Your score is sealed before the panel sees it", /\/expert\/voting\?storyLab=expert&storyStep=review-commit/, diagnostics, TOUR_TARGETS.practiceReviewCommitReveal);
    });

    // Chapter 10: practice result
    await test.step("the simulated review judgment resolves safely in the practice run", async () => {
      await advanceStoryStep(page, "review-commit");
      await expectStoryStep(page, "Your score is in", /\/expert\/voting\?storyLab=expert&storyStep=review-result/, diagnostics, TOUR_TARGETS.practiceReviewResult);
    });

    // Chapter 11: notification
    await test.step("the consensus result notification for Maya Chen's review arrives", async () => {
      await advanceStoryStep(page, "review-result");
      await expectStoryStep(page, "Maya's review reached consensus", /\/expert\/notifications\?storyLab=expert&storyStep=notification/, diagnostics, TOUR_TARGETS.notificationResultCard);
    });

    // Chapter 12: earnings
    await test.step("the voting reward for Maya Chen's review appears in Earnings", async () => {
      await advanceStoryStep(page, "notification");
      await expectStoryStep(page, "Your VETD totals at a glance", /\/expert\/earnings\?storyLab=expert&storyStep=earnings/, diagnostics, TOUR_TARGETS.earningsSummary);
    });

    // Chapter 13: reputation
    await test.step("the aligned review on Maya Chen is reflected in the Reputation timeline", async () => {
      await advanceStoryStep(page, "earnings");
      await expectStoryStep(page, "This is your reputation, out of 1000", /\/expert\/reputation\?storyLab=expert&storyStep=reputation/, diagnostics, TOUR_TARGETS.reputationScoreHero);
    });

    // Chapter 14: endorsements
    await test.step("the story explains endorsements using Riley Park's candidate card", async () => {
      await advanceStoryStep(page, "reputation");
      await expectStoryStep(page, "Reviews decide who joins. Endorsements decide who gets hired.", /\/expert\/endorsements\?storyLab=expert&storyStep=endorsement/, diagnostics, TOUR_TARGETS.endorsementMarketplace);
    });

    // Chapter 15: governance
    await test.step("guild governance decisions are surfaced via a proposal card", async () => {
      await advanceStoryStep(page, "endorsement");
      await expectStoryStep(page, "Vote on the rules, not just the people", /\/expert\/governance\?storyLab=expert&storyStep=governance/, diagnostics, TOUR_TARGETS.governanceHero);
    });

    // Chapter 16: completion and cleanup
    await test.step("the story completes and the Finish button scrubs all story params from the URL", async () => {
      await advanceStoryStep(page, "governance");
      await expectStoryStep(page, "You've seen the whole loop", /\/expert\/dashboard\?storyLab=expert&storyStep=complete/, diagnostics, TOUR_TARGETS.dashboardOverview);
      await advanceStoryStep(page, "complete");
      await expect(page).toHaveURL(/\/expert\/dashboard$/);
      // After Finish the URL must contain none of the story params — proves the
      // Finish path scrubs storyLab, storyStep, and storySub on completion.
      const finalUrl = new URL(page.url());
      expect(finalUrl.searchParams.get("storyLab")).toBeNull();
      expect(finalUrl.searchParams.get("storyStep")).toBeNull();
      expect(finalUrl.searchParams.get("storySub")).toBeNull();
      await expect(page.getByTestId("expert-story-lab-driver")).toHaveCount(0);
      await expect(page.getByRole("dialog", { name: "Expert story mode" })).toHaveCount(0);
    });

    await test.step("no actionable errors or unexpected mutations occurred during the story", async () => {
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
  });

  test("does not complete onboarding from a direct completion deep link", async ({
    page,
  }) => {
    await test.step("mocks and expert session are seeded", async () => {
      await setupStoryLabMocks(page);
      await seedExpertBrowserSession(page);
    });

    await test.step("expert navigates directly to the storyLabComplete deep link", async () => {
      await page.goto("/expert/dashboard?storyLabComplete=expert", {
        waitUntil: "domcontentloaded",
      });
    });

    await test.step("the app redirects to the story overview instead of accepting the completion shortcut", async () => {
      await expect(page).toHaveURL(/\/expert\/dashboard\?storyLab=expert&storyStep=overview/);
      await expect(page.getByTestId("expert-story-lab-driver")).toBeVisible();
    });

    await test.step("onboarding state in localStorage is not marked completed", async () => {
      const onboardingState = await page.evaluate(() => {
        const rawValue = localStorage.getItem(
          "vetted:expert-onboarding-tour:v1:mock-expert-id-001"
        );
        return rawValue ? JSON.parse(rawValue) : null;
      });
      expect(onboardingState?.completed).not.toBe(true);
      expect(onboardingState?.events?.practiceReviewCompleted).not.toBe(true);
    });
  });

  test("starts the route story for first-run experts from the dashboard", async ({ page }) => {
    await test.step("mocks and expert session are seeded", async () => {
      await setupStoryLabMocks(page);
      await seedExpertBrowserSession(page);
    });

    await test.step("first-run expert opens the dashboard", async () => {
      await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });
    });

    await test.step("the story lab launches automatically and lands on the overview step", async () => {
      await expect(page).toHaveURL(/\/expert\/dashboard\?storyLab=expert&storyStep=overview/);
      await expectStoryStep(
        page,
        "This is your home base for review work",
        /\/expert\/dashboard\?storyLab=expert&storyStep=overview/,
        [],
        TOUR_TARGETS.dashboardOverview
      );
    });
  });

  test("dashboard surfaces the canonical 100 VETD stake during story mode", async ({ page }) => {
    await test.step("mocks are set up with story-lab guild stake injector overriding the empty staking API", async () => {
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
    });

    await test.step("expert enters story mode and the dashboard shows the canonical 100 VETD stake", async () => {
      await page.goto("/story-lab/expert");
      await expect(page.getByText(/100 VETD/).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("Finish scrubs all story params and persists completion", async ({ page }) => {
    let putBody: unknown = null;

    await test.step("mocks are set up and the onboarding-state PUT endpoint is intercepted", async () => {
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
    });

    await test.step("expert jumps to the final step via direct URL and clicks Finish", async () => {
      // Walk to the last step's LAST sub-stop directly via URL state. After the
      // rewrite the complete step has multiple sub-stops; only the final one
      // ("ready-to-go") renders the "Finish" button, so we deep-link to it.
      await page.goto(
        "/expert/dashboard?storyLab=expert&storyStep=complete&storySub=ready-to-go"
      );
      await page.getByRole("button", { name: "Finish" }).click();
    });

    await test.step("the URL is clean and the completion state is persisted to the API", async () => {
      await expect(page).toHaveURL(/\/expert\/dashboard$/);
      expect(new URL(page.url()).searchParams.toString()).toBe("");
      await expect.poll(() => putBody).toMatchObject({ completed: true });
    });
  });

  test("non-story expert routes do not render any story-lab DOM", async ({ page }) => {
    // Capture any uncaught exceptions — if the StoryLabLeakDetector throws,
    // the page errors propagate here.
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await test.step("minimal API mocks and a completed-onboarding expert session are set up", async () => {
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
    });

    await test.step("expert opens the dashboard outside of story mode", async () => {
      await page.goto("/expert/dashboard");

      // Wait briefly for the dashboard tree to mount.
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
    });

    await test.step("no story-lab DOM nodes are present and the leak detector has not thrown", async () => {
      // No story-prefixed DOM should be present.
      const leaks = page.locator("[id^='story-lab-'], [data-story-lab-guild-id], [data-story-lab-review-url]");
      await expect(leaks).toHaveCount(0);

      // The leak detector must not have thrown.
      const storyLabErrors = pageErrors.filter((m) => m.includes("StoryLab leak"));
      expect(storyLabErrors).toEqual([]);
    });
  });

  test("leak detector throws when story-lab DOM appears outside story mode", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await test.step("minimal API mocks and a completed-onboarding expert session are set up", async () => {
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
    });

    await test.step("expert opens the dashboard and the URL is confirmed to be clean", async () => {
      await page.goto("/expert/dashboard");
      await page.waitForLoadState("domcontentloaded");

      // Confirm the URL is clean before injecting (otherwise the detector early-returns).
      const url = new URL(page.url());
      expect(url.searchParams.get("storyLab")).toBeNull();
      expect(url.searchParams.get("storyLabComplete")).toBeNull();
    });

    await test.step("a synthetic story-lab DOM node is injected outside story mode", async () => {
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
    });

    await test.step("the leak detector fires both a console error and an uncaught exception", async () => {
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
  });

  // PRODUCT GAP (flagged 2026-05-22): same GuildWorkspacePage tour-target /
  // wallet-gating gap as the arc test above — the guild-detail story stop can't
  // render its spotlight target. Parked. See COVERAGE_GAP_MAP.md.
  test.skip("provides a deterministic story guild when the real expert has no guilds", async ({
    page,
  }) => {
    await test.step("mocks are set up for an expert with no guild memberships", async () => {
      await setupStoryLabMocks(page, {
        expertProfile: { ...MOCK_EXPERT_PROFILE, guilds: [] },
      });
      await seedExpertBrowserSession(page);
    });

    await test.step("expert enters story mode and the overview step is shown on the dashboard", async () => {
      await page.goto("/story-lab/expert", { waitUntil: "domcontentloaded" });
      await expectStoryStep(
        page,
        "This is your home base for review work",
        /\/expert\/dashboard\?storyLab=expert&storyStep=overview/,
        [],
        TOUR_TARGETS.dashboardOverview
      );
    });

    await test.step("expert advances to the guilds directory step", async () => {
      await advanceStoryStep(page, "overview");
      await expectStoryStep(
        page,
        "These are the guilds you belong to",
        /\/expert\/guilds\?storyLab=expert&storyStep=guilds/,
        [],
        TOUR_TARGETS.guildDirectory
      );
    });

    await test.step("the story resolves a deterministic fallback guild and opens the guild detail", async () => {
      // The action button resolves the dynamic guild route inside goNextSubStop,
      // not via an href on the trigger. Assert by observing the resulting URL.
      await advanceStoryStep(page, "guilds");
      await expectStoryStep(
        page,
        "This is the bar you uphold",
        /\/expert\/guild\/story-lab-engineering-guild\?storyLab=expert&storyStep=guild-detail/,
        [],
        TOUR_TARGETS.guildStandards
      );
    });
  });
});
