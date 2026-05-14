import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  APPLICATION_ID,
  MOCK_APPLICATION_ACTIVE,
  MOCK_STAKING_MET,
  MOCK_STAKING_NOT_MET,
  setupVotingQueueMocks,
  setupVotingDetailMocks,
} from "./helpers/guild-mocks";

test.describe("Staking requirement UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("voting queue shows staking warning when insufficient stake", async ({ page }) => {
    await test.step("voting queue mock is configured with insufficient stake", async () => {
      await setupVotingQueueMocks(page, { stakingStatus: MOCK_STAKING_NOT_MET });
    });

    await test.step("expert navigates to the voting queue", async () => {
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
    });

    await test.step("the Guild Applications & Voting page loads with the staking warning visible", async () => {
      await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("voting detail shows staking warning when insufficient stake", async ({ page }) => {
    await test.step("voting detail mock is configured with insufficient stake", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        stakingStatus: MOCK_STAKING_NOT_MET,
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Stake Required warning is displayed on the detail page", async () => {
      await expect(page.getByText(/Stake Required/i).first()).toBeVisible();
    });
  });

  test("vote button is disabled when insufficient stake", async ({ page }) => {
    await test.step("voting detail mock is configured with insufficient stake", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        stakingStatus: MOCK_STAKING_NOT_MET,
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Stake Required button is visible but disabled", async () => {
      const stakeRequiredBtn = page.getByRole("button", { name: /Stake Required/i });
      await expect(stakeRequiredBtn).toBeVisible();
      await expect(stakeRequiredBtn).toBeDisabled();
    });
  });

  test("vote button is enabled when sufficient stake", async ({ page }) => {
    await test.step("voting detail mock is configured with sufficient stake", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        stakingStatus: MOCK_STAKING_MET,
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Cast Your Vote button is visible and enabled", async () => {
      const castVoteBtn = page.getByRole("button", { name: "Cast Your Vote" });
      await expect(castVoteBtn).toBeVisible();
      await expect(castVoteBtn).toBeEnabled();
    });
  });
});
