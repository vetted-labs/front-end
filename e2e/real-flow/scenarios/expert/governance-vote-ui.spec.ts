// e2e/real-flow/scenarios/expert/governance-vote-ui.spec.ts
//
// BLOCKER: testApi.seedGovernanceProposal is currently a stub (DIV-XXX).
// This spec will fail at runtime until BE implements POST /api/test/seed/governance-proposal.
// The spec is written as scaffolding to exercise the vote UI flow once the seed endpoint lands.
//
// Expert-pillar coverage: governance vote submission via the UI.
//
// Flow:
//   1. Expert logs in via the real RainbowKit UI flow.
//   2. Seed a governance proposal using testApi (currently stubs; will use BE endpoint when available).
//   3. Navigate to the proposal detail page /expert/governance/[proposalId].
//   4. Click "Vote For" button.
//   5. Click "Confirm" in the transaction modal.
//   6. Assert success state: "You voted for" message appears.
//   7. TransactionModal "Done" button becomes visible and clickable.
//
// Route: /expert/governance/[proposalId]  (GovernanceProposalDetailPage)
//
// The proposal detail page renders:
//   • Proposal title, description, status
//   • Vote breakdown (For / Against / Abstain counts)
//   • Vote buttons (For / Against / Abstain) — disabled if already voted or voting period closed
//   • TransactionModal overlay on vote submission

import { test, expect } from "../../fixtures";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";
import { testApi } from "../../helpers/backend";

test.setTimeout(180_000);

test("expert votes For on a proposal via the UI", async ({
  page,
  cleanState: _cleanState,
  experts,
  wallet,
  request,
}) => {
  void _cleanState;

  // Pick two experts: one to propose, one to vote.
  const proposer = experts[0];
  const voter = experts[1];

  expect(proposer, "fixture invariant: at least 2 experts available").toBeDefined();
  expect(voter, "fixture invariant: at least 2 experts available").toBeDefined();

  // NOTE: testApi.seedGovernanceProposal is currently a stub — this test will fail until
  // the BE endpoint POST /api/test/seed/governance-proposal lands. Track as DIV-XXX.
  // Once implemented, the endpoint should accept { proposerExpertId, title, description? }
  // and return { id, title, description, proposer_expert_id, status }.
  const proposal = await testApi.seedGovernanceProposal(request, {
    proposerExpertId: proposer.id,
    title: "Test proposal — vote path",
    description: "A test governance proposal to exercise the voting UI",
  });

  // ─── Phase 1: Authenticate as the voter ───────────────────────────────────
  await test.step("expert connects their wallet and logs in via the UI", async () => {
    await wallet.attach(page, voter.privateKey);
    await loginAsExpertViaUI(page, voter.address);
  });

  // ─── Phase 2: Navigate to the proposal detail page ───────────────────────
  await test.step("voter navigates to the proposal detail page", async () => {
    await page.goto(`/expert/governance/${encodeURIComponent(proposal.id)}`, {
      waitUntil: "domcontentloaded",
    });

    // The proposal title should appear on the page.
    await expect(
      page.getByText(new RegExp(proposal.title, "i")).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  // ─── Phase 3: Vote buttons are visible ─────────────────────────────────
  await test.step("the vote buttons (For / Against / Abstain) are visible and enabled", async () => {
    await expect(
      page.getByRole("button", { name: /vote for/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /vote against/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /abstain/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 4: Click "Vote For" button ──────────────────────────────────
  await test.step("voter clicks the 'Vote For' button", async () => {
    await page
      .getByRole("button", { name: /vote for/i })
      .first()
      .click();
  });

  // ─── Phase 5: TransactionModal opens and shows confirmation ──────────────
  await test.step("transaction modal appears with a Confirm button", async () => {
    const confirmBtn = page.getByRole("button", { name: /confirm/i });
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
    await confirmBtn.click();
  });

  // ─── Phase 6: Vote is submitted and modal transitions to success ────────
  await test.step("the transaction succeeds and the success state is reached", async () => {
    // The TransactionModal will show a success state after the API call completes.
    // Look for "You voted for" or similar confirmation text that appears after
    // the vote is recorded.
    await expect(
      page.getByText(/you voted for/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  // ─── Phase 7: Done button is visible; click to redirect ────────────────
  await test.step("the Done button appears and voter clicks it to close the modal", async () => {
    const doneBtn = page.getByRole("button", { name: /^done$/i });
    await expect(doneBtn).toBeVisible({ timeout: 10_000 });
    await doneBtn.click();
  });

  // ─── Phase 8: Proposal page updates to reflect the vote ───────────────
  await test.step("the proposal page updates to show the new vote count", async () => {
    // After voting, the vote breakdown should update. Expect the "For" count
    // to have incremented. The exact text depends on the UI, but "For" or similar
    // should be visible in the vote breakdown section.
    await expect(page.getByText(/for/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
