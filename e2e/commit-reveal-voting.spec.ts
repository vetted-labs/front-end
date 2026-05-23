import { test, expect, Page } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  APPLICATION_ID,
  ENGINEERING_GUILD_ID,
  MOCK_APPLICATION_ACTIVE,
  MOCK_CR_DIRECT,
  MOCK_CR_COMMIT,
  MOCK_CR_FINALIZED,
  setupVotingDetailMocks,
} from "./helpers/guild-mocks";

// NOTE ON THE REDESIGN:
// The commit-reveal flow was collapsed from a four-phase (direct → commit →
// reveal → finalized) plaintext-nonce flow into a three-phase on-chain flow
// (direct → commit → finalized). The "reveal" phase, the plaintext nonce
// reveal form, the localStorage auto-fill and the "Save your nonce!" reminder
// no longer exist — votes are committed on-chain and revealed automatically
// once all reviewers commit. The former reveal-phase tests are re-pinned to the
// surviving commit/finalized UI (the on-chain commitment form + the voting
// status card), since the reveal-phase UI they targeted was removed.

// The redesigned detail page gates "Cast Your Vote" on per-guild stake info.
// The shared mock defaults to no stake, so register a staked-guild override
// after the common mocks (last-registered route wins in Playwright).
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

test.describe("Commit-reveal voting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("no commit-reveal indicator when phase is direct", async ({ page }) => {
    await test.step("voting detail mocks are set up for direct phase", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        crPhase: MOCK_CR_DIRECT,
      });
      await stakeInEngineeringGuild(page);
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("direct phase shows no commit-reveal indicator but shows the vote button", async () => {
      // "Commit-Reveal Voting" heading should NOT be present for direct phase
      await expect(page.getByText("Commit-Reveal Voting")).not.toBeVisible();
      // Should still show the direct voting button
      await expect(page.getByRole("button", { name: "Cast Your Vote" })).toBeVisible();
    });
  });

  test("commit phase shows indicator with deadline and progress", async ({ page }) => {
    await test.step("voting detail mocks are set up for commit phase", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        crPhase: MOCK_CR_COMMIT,
        application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "commit" },
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("commit phase indicator shows phase label and 1/3 progress", async () => {
      await expect(page.getByText("Commit-Reveal Voting").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Commit Phase").first()).toBeVisible();
      // Progress: 1/3 voted (the redesign labels committed reviewers as "voted")
      await expect(page.getByText("1/3 voted").first()).toBeVisible();
    });
  });

  test("commit phase shows commitment form", async ({ page }) => {
    await test.step("voting detail mocks are set up for commit phase", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        crPhase: MOCK_CR_COMMIT,
        application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "commit" },
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the on-chain commitment form shows score, stake, and the hidden-until-consensus note", async () => {
      await expect(page.getByText("Submit Your Vote").first()).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText("Your score is hidden until all reviewers have voted.").first(),
      ).toBeVisible();
      await expect(page.getByText("Your Score").first()).toBeVisible();
      await expect(page.getByText("Stake Amount (VETD)").first()).toBeVisible();
    });
  });

  test("commit phase shows the voting status card with progress", async ({ page }) => {
    await test.step("voting detail mocks are set up for commit phase", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        crPhase: MOCK_CR_COMMIT,
        application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "commit" },
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the voting status card reports the reviewer's status and progress", async () => {
      await expect(page.getByText("Voting Status").first()).toBeVisible({ timeout: 10000 });
      // The reviewer has not committed yet in MOCK_CR_COMMIT.
      await expect(page.getByText("Not Yet Voted").first()).toBeVisible();
    });
  });

  test("committed reviewer sees a read-only on-chain confirmation", async ({ page }) => {
    await test.step("voting detail mocks are set up for commit phase", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        crPhase: MOCK_CR_COMMIT,
        application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "commit" },
      });
      // The redesigned commit form asks the BE for the reviewer's review state.
      // When the server reports a recorded on-chain commit, the form switches to
      // a read-only confirmation instead of the editable score/stake fields.
      await page.route(`**/api/proposals/${APPLICATION_ID}/review/state`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { kind: "committed", txHash: "0xabc123" },
          }),
        });
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the committed reviewer sees the auto-reveal confirmation copy", async () => {
      await expect(
        page.getByText(/revealed automatically/i).first(),
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test("finalized commit-reveal phase shows the completion indicator", async ({ page }) => {
    await test.step("voting detail mocks are set up with a finalized commit-reveal phase on an active application", async () => {
      // Keep the application active (not finalized) so the voting workspace —
      // and therefore the commit-reveal indicator — renders. The indicator's
      // finalized state is what we are asserting here.
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        crPhase: MOCK_CR_FINALIZED,
        application: { ...MOCK_APPLICATION_ACTIVE, voting_phase: "finalized" },
      });
    });

    await test.step("expert navigates to the voting detail page", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("finalized phase indicator shows the final label and completion message", async () => {
      await expect(page.getByText("Commit-Reveal Voting").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Finalized Phase").first()).toBeVisible();
      await expect(page.getByText("Voting complete. Results are final.").first()).toBeVisible();
    });
  });
});
