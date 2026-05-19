// e2e/real-flow/scenarios/expert/governance-create-proposal-ui.spec.ts
//
// Expert-pillar coverage: governance proposal creation via the UI form.
//
// Flow:
//   1. Expert logs in via the real RainbowKit UI flow.
//   2. Navigates to /expert/governance/create and verifies the form renders.
//   3. Fills in the required fields:
//      - Title (min 10 chars)
//      - Description (min 50 chars per FE validation)
//      - Proposal type: "Protocol Upgrade" (no guild required, no extra fields)
//      - Stake amount: left at default 100 VETD
//   4. Submits the form → TransactionModal opens in "pending" then "success" state.
//   5. Clicks "Done" in the modal → router redirects to /expert/governance.
//   6. Verifies the new proposal title appears on the governance list page.
//
// Proposal type choice (Protocol Upgrade):
//   - No guild selection required (GUILD_REQUIRED_TYPES excludes it).
//   - No extra conditional fields (parameter_change adds 3 inputs; election
//     adds a nominee wallet field).
//   - The code path skips the on-chain staking flow entirely (no `executeWithPermit`
//     or `stakeForAppealWithPermit` calls) and posts directly to the BE API.
//   - This keeps the test self-contained without requiring Anvil transactions
//     or VETD token approval flows.
//
// Potential BE precondition: the BE route POST /api/governance/proposals
//   may require the expert to have a minimum stake. If the seeded expert
//   satisfies the bootstrap stake requirement (≥10 VETD staked, as bootstrapped
//   by the e2e:bootstrap script) this should pass. If the BE imposes a higher
//   governance-specific threshold, the test will surface that as a toast error
//   and be marked DONE_WITH_CONCERNS.

import { test, expect } from "../../fixtures";
import {
  loginAsExpertViaUI,
  connectWalletViaUI,
} from "../../helpers/ui-auth";

const PROPOSAL_TITLE = "Upgrade vetting protocol to v2 engine";
const PROPOSAL_DESCRIPTION =
  "This proposal upgrades the core vetting protocol engine to v2, " +
  "enabling faster candidate review cycles and improved guild consensus " +
  "mechanisms. The upgrade is backward-compatible and requires no migration.";

// Phase breakdown (generous):
//   login:           30s
//   goto + wagmi:    20s
//   form fill:       10s
//   submit + modal:  30s
//   redirects:       15s
//   list verify:     20s
//                   ---
//                   125s → round up to 180s for CI headroom
test.setTimeout(180_000);

test("expert creates a governance proposal via the UI form", async ({
  page,
  experts,
  wallet,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  // Pick the first bootstrapped expert. The bootstrap staked each expert
  // with ≥10 VETD in their guild, which satisfies the governance creation
  // prerequisite (the BE checks expert status, not a specific stake threshold
  // for governance proposals).
  const [proposer] = experts;

  // Attach the headless wallet shim so RainbowKit's "Headless E2E Wallet"
  // option is available in the modal. loginAsExpertViaUI drives the modal
  // click flow which requires the shim to be injected first.
  await wallet.attach(page, proposer.privateKey);

  // ── Phase 1: Log in and open the create-proposal page ──────────────────
  await test.step("expert logs in and opens the create-proposal page", async () => {
    await loginAsExpertViaUI(page, proposer.address);
    await page.goto("/expert/governance/create", {
      waitUntil: "domcontentloaded",
    });

    // page.goto is a full page reload — wagmi must re-connect its injected
    // connector before CreateProposalForm renders the form instead of
    // <WalletRequiredState>. Drive the programmatic connect path to ensure
    // the wallet is connected before we look for any form elements.
    await connectWalletViaUI(page);

    await expect(
      page.getByRole("heading", { name: /create governance proposal/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Wait for the form body to be ready (not WalletRequiredState). The
    // "Proposal Details" section heading confirms CreateProposalForm has
    // rendered its full form state.
    await expect(
      page.getByRole("heading", { name: /proposal details/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  // ── Phase 2: Fill the proposal form ────────────────────────────────────
  await test.step("expert fills the proposal title and description", async () => {
    // Title field: <Input label="Title" required ...> → label renders a
    // <label> without a `for` attribute (no id prop passed), so use
    // placeholder-based locator as the reliable fallback.
    await page
      .getByPlaceholder(/a concise title for your proposal/i)
      .fill(PROPOSAL_TITLE);

    // Description: <Textarea label="Description" required ...> — same
    // label-without-for situation; use the placeholder.
    await page
      .getByPlaceholder(/describe your proposal in detail/i)
      .fill(PROPOSAL_DESCRIPTION);
  });

  await test.step("expert selects 'Protocol Upgrade' proposal type", async () => {
    // ProposalTypeSection renders a grid of <button type="button"> cards,
    // one per proposal type. Each button contains two <p> elements (label +
    // description), so Playwright's accessible name is the concatenated
    // text — use a substring match rather than an anchored regex.
    await page
      .getByRole("button", { name: /protocol upgrade/i })
      .first()
      .click();

    // Confirm the card is still visible after click (no crash/redirect).
    await expect(
      page.getByRole("button", { name: /protocol upgrade/i }).first(),
    ).toBeVisible();
  });

  // Stake amount defaults to 100 VETD (minimum) — no change needed.
  // Voting duration defaults to 7 days — no change needed.

  // ── Phase 3: Submit the form ────────────────────────────────────────────
  await test.step("expert submits the proposal form", async () => {
    // The submit button label is dynamic: "Stake 100 VETD & Create Proposal"
    // when submitStep === "idle" and stakeAmount === "100".
    // Use a regex that matches both the idle label and any mid-flight label
    // (e.g. "Creating Proposal...") so the click lands on the right element.
    const submitBtn = page.getByRole("button", {
      name: /stake.*vetd.*create proposal|creating proposal/i,
    });
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();
  });

  // ── Phase 4: Transaction modal transitions to success ──────────────────
  await test.step("the transaction modal shows success and expert clicks Done", async () => {
    // The TransactionModal opens with status="pending" immediately after the
    // API call starts. When the BE responds successfully the status flips to
    // "success" and the modal renders "Stake Confirmed!" + "Done" button.
    // Allow up to 30s for the BE round-trip.
    const doneBtn = page.getByRole("button", { name: /^done$/i });
    await expect(doneBtn).toBeVisible({ timeout: 30_000 });
    await doneBtn.click();
  });

  // ── Phase 5: Redirected to governance list ──────────────────────────────
  await test.step("expert lands on the governance list after proposal creation", async () => {
    // handleTxModalClose calls router.push("/expert/governance") on success.
    await page.waitForURL(/\/expert\/governance$/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/expert\/governance$/);
  });

  // ── Phase 6: Proposal appears on the list ──────────────────────────────
  await test.step("the new proposal title appears on the governance list page", async () => {
    // GovernancePage loads proposals via governanceApi.getProposals(); wait
    // for the list to hydrate. The proposal title will appear in a card.
    await expect(
      page.getByText(PROPOSAL_TITLE).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
