import { test, expect } from "@playwright/test";
import { setExpertSession, MOCK_EXPERT } from "./helpers/expert-auth";
import {
  APPLICATION_ID,
  MOCK_APPLICATION_ACTIVE,
  MOCK_CR_DIRECT,
  MOCK_CR_COMMIT,
  MOCK_CR_REVEAL,
  MOCK_CR_FINALIZED,
  setupVotingDetailMocks,
} from "./helpers/guild-mocks";

test.describe("Commit-reveal voting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("no commit-reveal indicator when phase is direct", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      crPhase: MOCK_CR_DIRECT,
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    // "Commit-Reveal Voting" heading should NOT be present for direct phase
    await expect(page.getByText("Commit-Reveal Voting")).not.toBeVisible();
    // Should still show the direct voting button
    await expect(page.getByRole("button", { name: "Cast Your Vote" })).toBeVisible();
  });

  test("commit phase shows indicator with deadline and progress", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      crPhase: MOCK_CR_COMMIT,
      application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "commit" },
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Commit-Reveal Voting").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Commit Phase").first()).toBeVisible();
    // Progress: 1/3 committed
    await expect(page.getByText("1/3 committed").first()).toBeVisible();
  });

  test("commit phase shows commitment form", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      crPhase: MOCK_CR_COMMIT,
      application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "commit" },
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Submit Commitment").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Your score is hidden until the reveal phase").first()).toBeVisible();
    await expect(page.getByText("Your Score").first()).toBeVisible();
    await expect(page.getByText("Your Secret Nonce").first()).toBeVisible();
    await expect(page.getByText("Save your nonce!").first()).toBeVisible();
  });

  test("reveal phase shows indicator with progress", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      crPhase: MOCK_CR_REVEAL,
      application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "reveal" },
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Commit-Reveal Voting").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Reveal Phase").first()).toBeVisible();
    // Progress: 2/3 revealed
    await expect(page.getByText("2/3 revealed").first()).toBeVisible();
  });

  test("reveal phase shows reveal form with auto-fill from localStorage", async ({ page }) => {
    // Pre-populate localStorage with commitment data
    await page.evaluate(
      ({ appId, expertId }) => {
        const key = `commitReveal:${appId}:${expertId}`;
        localStorage.setItem(key, JSON.stringify({ score: 72, nonce: "abc123def456" }));
      },
      { appId: APPLICATION_ID, expertId: MOCK_EXPERT.expertId },
    );

    await setupVotingDetailMocks(page, APPLICATION_ID, {
      crPhase: MOCK_CR_REVEAL,
      application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "reveal" },
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Reveal Your Vote").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Auto-filled").first()).toBeVisible();
  });

  test("finalized phase shows finalized indicator", async ({ page }) => {
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      crPhase: MOCK_CR_FINALIZED,
      application: {
        ...MOCK_APPLICATION_ACTIVE,
        voting_phase: "finalized",
        finalized: true,
        outcome: "approved",
        consensus_score: 78.5,
        status: "approved",
        has_voted: true,
        my_vote_score: 82,
      },
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Commit-Reveal Voting").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Finalized Phase").first()).toBeVisible();
    await expect(page.getByText("Voting complete. Results are final.").first()).toBeVisible();
  });

  test("reveal form without localStorage shows manual entry warning", async ({ page }) => {
    // Don't set localStorage — simulate lost commitment data
    await setupVotingDetailMocks(page, APPLICATION_ID, {
      crPhase: MOCK_CR_REVEAL,
      application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "reveal" },
    });
    await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Reveal Your Vote").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Could not find saved commitment data/i).first()).toBeVisible();
  });
});
