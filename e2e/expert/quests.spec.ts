import { test, expect, type Page } from "@playwright/test";
import { setExpertSession } from "../helpers/expert-auth";
import { setupCommonExpertMocks, MOCK_EXPERT_PROFILE } from "../helpers/guild-mocks";
import {
  setupQuestMocks,
  MOCK_QUESTS_RESPONSE,
  type QuestMockCalls,
} from "../helpers/quest-mocks";

/** Quests page needs the expert layout/sidebar mocks + the quest API. */
async function setupQuestsPage(
  page: Page,
  questOpts: Parameters<typeof setupQuestMocks>[1] = {},
): Promise<QuestMockCalls> {
  await setupCommonExpertMocks(page);
  await page.route("**/api/governance/proposals**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }),
  );
  return setupQuestMocks(page, questOpts);
}

test.describe("Expert quests — full flows (VET-111..114)", () => {
  test("prompts wallet connection when there is no expert session", async ({ page }) => {
    await test.step("no wallet session; quest API is unauthorized", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.route("**/api/experts/profile**", (route) =>
        route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
      );
      await page.route("**/api/quests**", (route) =>
        route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
      );
    });

    await test.step("expert opens /expert/quests without a wallet", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
    });

    await test.step("the page asks the expert to connect their wallet", async () => {
      await expect(page.getByText(/Connect your wallet/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("expert sees the quests page with allocation progress, specific quests and the bonus section", async ({ page }) => {
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupQuestsPage(page);
    });

    await test.step("expert opens the quests page", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Quests" }).first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the allocation milestones, specific quests and bonus section render", async () => {
      // Two-milestone allocation progress (replaces the daily streak).
      await expect(page.getByText("Complete 10 Quests").first()).toBeVisible();
      await expect(page.getByText("Share 5 approved answers").first()).toBeVisible();
      await expect(page.getByText(/500 \+ 300 bonus, allocated once you join a Guild/i)).toBeVisible();
      // Specific quests show allocation copy instead of a per-quest reward.
      await expect(page.getByText("Review a candidate application").first()).toBeVisible();
      await expect(page.getByText(/Counts toward your 500 VETD allocation/i).first()).toBeVisible();
      // Bonus section pinned to the bottom with fixed rewards.
      await expect(page.getByRole("heading", { name: "Bonus" })).toBeVisible();
      await expect(page.getByText("To support the team")).toBeVisible();
      await expect(page.getByText("+10 VETD").first()).toBeVisible();
      await expect(page.getByText("+30 VETD").first()).toBeVisible();
    });
  });

  test("expert completes a self-attested follow quest", async ({ page }) => {
    let calls: QuestMockCalls;
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      calls = await setupQuestsPage(page);
    });

    await test.step("expert marks the follow quest done", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByText("Follow Vetted Protocol on X").first()).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: "Mark done" }).first().click();
    });

    await test.step("the complete endpoint is called", async () => {
      await expect.poll(() => calls.complete, { timeout: 10000 }).toBe(1);
    });
  });

  test("expert submits a bug report with a screenshot", async ({ page }) => {
    let calls: QuestMockCalls;
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      calls = await setupQuestsPage(page);
    });

    await test.step("expert opens the bug report submission modal", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByText("Report a bug").first()).toBeVisible({ timeout: 15000 });
      // Scope to the "Report a bug" QuestCard (the card root carries bg-muted/20;
      // the wrapping Bonus section does not) so we hit that card's own Submit
      // button rather than another verifiable quest's.
      const bugCard = page
        .locator('div.bg-muted\\/20')
        .filter({ hasText: "Report a bug" });
      await bugCard.getByRole("button", { name: "Submit", exact: true }).click();
    });

    await test.step("expert fills the description, attaches a screenshot and submits", async () => {
      await expect(page.getByText("What happened?")).toBeVisible();
      await page.locator("textarea").fill("The dashboard crashes when I open the review queue.");
      await page.setInputFiles('input[type="file"]', {
        name: "bug.png",
        mimeType: "image/png",
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      });
      await page.getByRole("button", { name: /Submit for review/i }).click();
    });

    await test.step("the submit endpoint is called", async () => {
      await expect.poll(() => calls.submit, { timeout: 10000 }).toBe(1);
    });
  });

  test("specific quests render as the primary list with no category tags (VET-115)", async ({ page }) => {
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupQuestsPage(page);
    });

    await test.step("expert opens the quests page", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Quests" }).first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("there are no General/Specific tabs and the specific list is shown directly", async () => {
      await expect(page.getByRole("tab", { name: "General" })).toHaveCount(0);
      await expect(page.getByRole("tab", { name: "Specific" })).toHaveCount(0);
      await expect(page.getByText("Review a candidate application").first()).toBeVisible();
      await expect(page.getByText("Answer an expertise question").first()).toBeVisible();
    });
  });

  test("review tab appears for an officer/master and renders the review panel", async ({ page }) => {
    await test.step("expert session + reviewer quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupQuestsPage(page, {
        fixture: { ...MOCK_QUESTS_RESPONSE, isReviewer: true },
        pending: [],
      });
    });

    await test.step("expert opens the Review tab", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByRole("tab", { name: "Review", exact: true })).toBeVisible({ timeout: 15000 });
      await page.getByRole("tab", { name: "Review", exact: true }).click();
    });

    await test.step("the review panel renders its empty state", async () => {
      await expect(page.getByText(/Nothing to review/i)).toBeVisible();
    });
  });

  test("a wallet-verified PENDING expert can reach Quests and see quests (VET-114)", async ({ page }) => {
    await test.step("a pending (not-yet-approved) expert session + mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupCommonExpertMocks(page, {
        expertProfile: { ...MOCK_EXPERT_PROFILE, status: "pending" },
      });
      await page.route("**/api/governance/proposals**", (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }),
      );
      await setupQuestMocks(page);
    });

    await test.step("the pending expert opens /expert/quests", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
    });

    await test.step("they are NOT redirected to the application-pending page and see quests", async () => {
      await expect(page).toHaveURL(/\/expert\/quests/);
      await expect(page.getByRole("heading", { name: "Quests" }).first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Review a candidate application").first()).toBeVisible();
    });
  });

  test("expert shares an approved answer to the feed and sees the pending state (VET-115)", async ({ page }) => {
    let calls: QuestMockCalls;
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      calls = await setupQuestsPage(page);
    });

    await test.step("expert opens the quests page and finds the approved answer quest", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByText("Answer an expertise question").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("expert shares the approved answer to the feed", async () => {
      await page.getByTestId("quest-share-button").first().click();
      await expect(page.getByText(/Share answer to the feed/i)).toBeVisible();
      await page.getByRole("button", { name: /Share for review/i }).click();
    });

    await test.step("the share endpoint is hit and the card shows pending team review", async () => {
      await expect.poll(() => calls.share, { timeout: 10000 }).toBe(1);
      await expect(page.getByText(/Pending team review/i).first()).toBeVisible();
    });
  });

  test("expert browses the feed tab and upvotes an answer (VET-115)", async ({ page }) => {
    let calls: QuestMockCalls;
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      calls = await setupQuestsPage(page);
    });

    await test.step("expert opens the Feed tab", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByRole("tab", { name: "Feed" })).toBeVisible({ timeout: 15000 });
      await page.getByRole("tab", { name: "Feed" }).click();
    });

    await test.step("approved answers render with their expertise field", async () => {
      await expect(
        page.getByText(/Use a circuit breaker to fail fast/i),
      ).toBeVisible();
      await expect(page.getByText("Engineering").first()).toBeVisible();
    });

    await test.step("upvoting an answer calls the votes endpoint", async () => {
      await page.getByTestId("feed-upvote-button").first().click();
      await expect.poll(() => calls.upvote, { timeout: 10000 }).toBe(1);
    });
  });

  test("an officer/master sees a Feed review tab for shared answers (VET-115)", async ({ page }) => {
    await test.step("expert session + reviewer quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupQuestsPage(page, {
        fixture: { ...MOCK_QUESTS_RESPONSE, isReviewer: true },
        pendingFeedPosts: [],
      });
    });

    await test.step("expert opens the Feed review tab", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByRole("tab", { name: "Feed review" })).toBeVisible({ timeout: 15000 });
      await page.getByRole("tab", { name: "Feed review" }).click();
    });

    await test.step("the feed review queue renders its empty state", async () => {
      await expect(page.getByText(/Nothing to review/i)).toBeVisible();
    });
  });

  test("the sidebar shows a Quests nav link (VET-111)", async ({ page }) => {
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupQuestsPage(page);
    });

    await test.step("the Quests nav item links to /expert/quests", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.locator('a[href="/expert/quests"]').first()).toBeVisible({ timeout: 15000 });
    });
  });
});
