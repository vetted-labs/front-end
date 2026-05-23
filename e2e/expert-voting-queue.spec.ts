import { test, expect, Page } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_STAKING_NOT_MET,
  setupVotingQueueMocks,
} from "./helpers/guild-mocks";

// The expert voting queue was restructured into the "Reviews" page
// (ApplicationsPage). Proposal cards — the ones carrying a candidate name,
// "View" action, "Assigned" badge and "Stake Required" lock — now live under
// the "Proposals" tab, so most assertions switch to that tab first.
async function openProposalsTab(page: Page) {
  await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("tab", { name: /Proposals/i }).click();
}

test.describe("Expert voting queue page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("shows page heading and guild selector", async ({ page }) => {
    await test.step("mocks are set up and expert opens the voting queue", async () => {
      await setupVotingQueueMocks(page);
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
    });

    await test.step("the queue page shows the heading and guild selector", async () => {
      await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible({ timeout: 15000 });
      // The guild selector is a combobox defaulting to "All Guilds".
      await expect(page.getByRole("combobox").first()).toBeVisible();
      await expect(page.getByText("All Guilds").first()).toBeVisible();
    });
  });

  test("shows staking warning when insufficient stake", async ({ page }) => {
    await test.step("mocks are set up with insufficient staking and expert opens the voting queue", async () => {
      await setupVotingQueueMocks(page, { stakingStatus: MOCK_STAKING_NOT_MET });
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
    });

    await test.step("the queue page displays a Stake VETD warning", async () => {
      await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Stake VETD to Start Reviewing").first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("shows Assigned and All filter controls", async ({ page }) => {
    await test.step("mocks are set up and expert opens the voting queue", async () => {
      await setupVotingQueueMocks(page);
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
    });

    await test.step("both the Assigned and All assignment filter controls are visible", async () => {
      await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: "Assigned", exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
    });
  });

  test("proposal cards show candidate name", async ({ page }) => {
    await test.step("mocks are set up and expert opens the voting queue", async () => {
      await setupVotingQueueMocks(page);
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
    });

    await test.step("proposal cards render with the candidate name", async () => {
      await openProposalsTab(page);
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("shows Assigned badge on assigned proposals", async ({ page }) => {
    await test.step("mocks are set up and expert opens the voting queue Proposals tab", async () => {
      await setupVotingQueueMocks(page);
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
      await openProposalsTab(page);
    });

    await test.step("the assigned proposal card shows the Assigned badge", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Assigned", { exact: true }).first()).toBeVisible();
    });
  });

  test("empty state when no proposals", async ({ page }) => {
    await test.step("mocks are set up with an empty application list and expert opens the voting queue", async () => {
      await setupVotingQueueMocks(page, { applications: [], assignedApplications: [] });
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
    });

    await test.step("the Proposals tab shows the empty state message", async () => {
      await openProposalsTab(page);
      await expect(page.getByText("No proposals").first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("View button is present on proposal cards", async ({ page }) => {
    await test.step("mocks are set up and expert opens the voting queue", async () => {
      await setupVotingQueueMocks(page);
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
      await openProposalsTab(page);
    });

    await test.step("each proposal card has a View button", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: /View/i }).first()).toBeVisible();
    });
  });

  test("Stake Required lock shown when staking insufficient", async ({ page }) => {
    await test.step("mocks are set up with insufficient staking and expert opens the voting queue", async () => {
      await setupVotingQueueMocks(page, { stakingStatus: MOCK_STAKING_NOT_MET });
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
      await openProposalsTab(page);
    });

    await test.step("proposal cards display a Stake Required lock indicator", async () => {
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Stake Required").first()).toBeVisible();
    });
  });
});
