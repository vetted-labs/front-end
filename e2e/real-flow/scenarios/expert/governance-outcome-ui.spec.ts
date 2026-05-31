// e2e/real-flow/scenarios/expert/governance-outcome-ui.spec.ts
//
// Expert-pillar coverage: governance proposal outcome display after voting closes.
//
// Flow:
//   1. Seed a governance proposal authored by expert[0].
//   2. Seed votes from experts[0..2] voting "for" (3 votes > quorum).
//   3. Advance Anvil time by 8 days to expire the voting deadline.
//   4. Drain the blockchain operations queue (to finalize on-chain state).
//   5. Expert logs in via the real RainbowKit UI flow.
//   6. Navigate to /expert/governance/:proposalId.
//   7. Assert: "Passed" banner is visible (on-chain outcome = passed).
//
// Stub dependencies:
//   - testApi.seedGovernanceProposal — POST /api/test/seed/governance-proposal not yet on BE
//   - testApi.castGovernanceVote — POST /api/test/seed/governance-vote not yet on BE
//
// Until the BE endpoints are wired, this spec will fail at the first testApi call.
// Track endpoint availability as DIV-XXX.

import { test, expect } from "../../fixtures";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";
import { testApi } from "../../helpers/backend";

test.setTimeout(180_000);

// Governance hidden pending rework (VET-103) — re-enable with GOVERNANCE_ENABLED.
test.beforeEach(() => {
  test.skip(true, "Governance hidden pending rework (VET-103)");
});

test("governance proposal closes with a Passed banner after quorum", async ({
  page,
  cleanState: _cleanState,
  experts,
  wallet,
  request,
}) => {
  void _cleanState;

  // NOTE: seedGovernanceProposal + castGovernanceVote are currently stubs —
  // failure expected until BE lands POST /api/test/seed/governance-proposal
  // and POST /api/test/seed/governance-vote.

  const proposer = experts[0];
  let proposalId = "";

  await test.step("seed a governance proposal with 3 votes (> quorum)", async () => {
    // Seed a proposal whose voting window has ALREADY closed. Governance
    // deadlines are evaluated against the backend wall-clock (DB timestamp),
    // not the anvil chain clock, so advancing anvil time does not expire them —
    // we seed a negative voting offset instead.
    const proposal = await testApi.seedGovernanceProposal(request, {
      proposerExpertId: proposer.id,
      title: "Outcome smoke",
      description: "Test proposal for outcome display",
      votingEndsInSeconds: -86_400,
    });
    proposalId = proposal.id;

    // Cast 3 votes for (exceeds typical quorum threshold).
    for (const expert of experts.slice(0, 3)) {
      await testApi.castGovernanceVote(request, {
        proposalId: proposal.id,
        expertId: expert.id,
        choice: "for",
      });
    }

    // Drain blockchain operations queue to ensure on-chain finalization.
    await testApi.drain(request);

    // Finalize the closed proposal so its outcome (passed/rejected) is computed
    // and the results banner renders. Without this the proposal stays "active".
    await testApi.finalizeGovernanceProposal(
      request,
      proposalId,
      proposer.address,
    );
  });

  await test.step("expert logs in and navigates to proposal detail page", async () => {
    await wallet.attach(page, proposer.privateKey);
    await loginAsExpertViaUI(page, proposer.address);

    // Navigate to the seeded proposal's detail page.
    await page.goto(`/expert/governance/${proposalId}`, {
      waitUntil: "domcontentloaded",
    });
  });

  await test.step("the proposal page displays the Passed outcome banner", async () => {
    // Assert: the "Passed" text is visible somewhere on the page, indicating
    // the proposal reached quorum and was approved by the voting period end.
    await expect(page.getByText(/passed/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
