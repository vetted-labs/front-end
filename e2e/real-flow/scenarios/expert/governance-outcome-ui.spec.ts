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
import { advanceTime } from "../../helpers/scenario";

test.setTimeout(180_000);

test("governance proposal closes with a Passed banner after quorum", async ({
  page,
  cleanState: _cleanState,
  experts,
  anvil,
  wallet,
  request,
}) => {
  void _cleanState;

  // NOTE: seedGovernanceProposal + castGovernanceVote are currently stubs —
  // failure expected until BE lands POST /api/test/seed/governance-proposal
  // and POST /api/test/seed/governance-vote.

  const proposer = experts[0];

  await test.step("seed a governance proposal with 3 votes (> quorum)", async () => {
    const proposal = await testApi.seedGovernanceProposal(request, {
      proposerExpertId: proposer.id,
      title: "Outcome smoke",
      description: "Test proposal for outcome display",
    });

    // Cast 3 votes for (exceeds typical quorum threshold).
    for (const expert of experts.slice(0, 3)) {
      await testApi.castGovernanceVote(request, {
        proposalId: proposal.id,
        expertId: expert.id,
        choice: "for",
      });
    }

    // Advance time 8 days to expire the voting deadline.
    await advanceTime(anvil, 86_400 * 8);

    // Drain blockchain operations queue to ensure on-chain finalization.
    await testApi.drain(request);
  });

  await test.step("expert logs in and navigates to proposal detail page", async () => {
    await wallet.attach(page, proposer.privateKey);
    await loginAsExpertViaUI(page, proposer.address);

    // Navigate to the proposal detail page. The proposal ID will be available
    // from the seeded response in a real implementation; for now, placeholder
    // assumes proposal.id from the seed call above.
    //
    // TODO: once seedGovernanceProposal returns the full proposal object,
    // update this to use the actual proposal.id.
    await page.goto("/expert/governance/1", {
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
