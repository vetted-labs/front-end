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

  test("expert sees the quests page with streak, general quests and progress", async ({ page }) => {
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupQuestsPage(page);
    });

    await test.step("expert opens the quests page", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Quests" }).first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the daily streak, general quests, progress and referral link render", async () => {
      await expect(page.getByText("Daily streak").first()).toBeVisible();
      await expect(page.getByText("Follow Vetted Protocol on X").first()).toBeVisible();
      await expect(page.getByText("+5 VETD").first()).toBeVisible();
      await expect(page.getByText("1/4 Completed").first()).toBeVisible();
      await expect(page.getByText("Refer an expert").first()).toBeVisible();
      await expect(page.getByText(/referral link/i).first()).toBeVisible();
    });
  });

  test("expert claims the daily streak reward", async ({ page }) => {
    let calls: QuestMockCalls;
    await test.step("expert session + quest mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      calls = await setupQuestsPage(page);
    });

    await test.step("expert opens quests and claims the daily reward", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /Claim daily reward/i }).click();
    });

    await test.step("the streak claim endpoint is called", async () => {
      await expect.poll(() => calls.claim, { timeout: 10000 }).toBe(1);
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
      // "Report a bug" is the only verifiable, not-yet-done quest, so it owns the single card "Submit" button.
      await page.getByRole("button", { name: "Submit", exact: true }).first().click();
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

  test("specific tab shows the guild gate when the expert has no guild", async ({ page }) => {
    await test.step("expert session + quest mocks (no guilds) are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupQuestsPage(page);
    });

    await test.step("expert opens the Specific tab", async () => {
      await page.goto("/expert/quests", { waitUntil: "networkidle" });
      await page.getByRole("tab", { name: "Specific" }).click();
    });

    await test.step("the locked-quests gate is shown", async () => {
      await expect(page.getByText(/Specific quests are locked/i)).toBeVisible();
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
      await expect(page.getByRole("tab", { name: "Review" })).toBeVisible({ timeout: 15000 });
      await page.getByRole("tab", { name: "Review" }).click();
    });

    await test.step("the review panel renders its empty state", async () => {
      await expect(page.getByText(/Nothing to review/i)).toBeVisible();
    });
  });

  test("a wallet-verified PENDING expert can reach Quests and see General quests (VET-114)", async ({ page }) => {
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

    await test.step("they are NOT redirected to the application-pending page and see General quests", async () => {
      await expect(page).toHaveURL(/\/expert\/quests/);
      await expect(page.getByRole("heading", { name: "Quests" }).first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Follow Vetted Protocol on X").first()).toBeVisible();
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
