// e2e/real-flow/scenarios/expert/vote-after-deadline.spec.ts
//
// Expert-pillar coverage: vote submission is blocked after the voting deadline.
//
// ─── Actual UI behaviour vs plan assumption ───────────────────────────────────
//
// The plan template assumed `advanceTime(anvil, 86_400 * 8)` would expire the
// voting deadline and produce a disabled Review button on the expert dashboard.
// After tracing the production code, the actual behaviour diverges:
//
//   1. `voting_deadline` on `candidate_proposals` is set to
//      `CURRENT_TIMESTAMP + 3 days` in Postgres real time (NOT block.timestamp).
//      `advanceTime(anvil, ...)` advances only the EVM clock; it does NOT move
//      Postgres's `CURRENT_TIMESTAMP` and therefore does NOT expire the BE
//      deadline gate (`proposals.service.ts:718`).
//
//   2. The `ReviewQueue` widget on `/expert/dashboard` renders all assigned
//      proposals as clickable row-buttons — there is no disabled state tied to
//      the voting deadline. The row always navigates to the review page.
//
//   3. The "Cast Vote" button in `ProposalCard` and `VotingApplicationPage`
//      is only disabled when `!meetsStakingRequirement || hasVoted`. A past
//      deadline does NOT disable it on the client side.
//
//   4. After the `commit_deadline` passes on a commit-reveal proposal, the BE
//      cron (`processProposalTransitions`) auto-reveals + finalizes the proposal.
//      ONCE FINALIZED the `ProposalCard` replaces "Cast Vote" with an outcome
//      badge and the `VotingApplicationPage` renders the `FinalizedView`. That
//      is the actual "expert cannot vote" surface the UI exposes.
//
//   5. The `CommitRevealStatusCard` shows `formatDeadline(deadline, "Ended")`
//      once the real-time `commit_deadline` is past.
//
// ─── Test strategy ────────────────────────────────────────────────────────────
//
// We simulate an expired deadline using the BE's cron-secret-gated
// `POST /api/proposals/:id/commit-reveal/enable` endpoint with a near-zero
// `commitDurationMinutes` value (0.01 min ≈ 600 ms). By the time the
// assertion steps run, the stored `commit_deadline` is already in the past.
// We then call `processProposalTransitions` (the real automation cron) to
// advance the proposal through its expired-commit-deadline path: the cron
// auto-reveals all committed votes (none in this case), penalises
// non-committers, and either reassigns or finalises the proposal.
//
// Steps:
//   1. Candidate applies (direct-vote phase, no commit-reveal yet).
//   2. Enable commit-reveal with 0.01-minute commit window → deadline is
//      ~600 ms from now (already in the past by the time we act).
//   3. Call processProposalTransitions to auto-expire + finalise.
//   4. Expert logs in via the real UI.
//   5. Navigate to /expert/applications (ProposalCard list).
//   6. Assert: "Cast Vote" is absent / "Voted" or outcome badge appears.
//   7. Navigate to the individual voting page.
//   8. Assert: FinalizedView is rendered (no vote submission form).
//   9. Assert deadline copy — either "Ended" (CommitRevealStatusCard) or
//      "Expired" (CountdownBadge) is visible somewhere on the page.
//
// ─── Known divergences documented ────────────────────────────────────────────
//
//   DIV-011: No disabled "Review" button on the dashboard ReviewQueue widget
//            for past-deadline proposals (the card is always clickable).
//            The plan's "disabled Review button + deadline-passed copy" surface
//            does not exist in the current UI. Enforcement happens only after
//            the proposal finalises (FinalizedView replaces the vote form).
//
//   DIV-012: `advanceTime(anvil, ...)` cannot expire `candidate_proposals`
//            deadlines because they are stored as Postgres `TIMESTAMP WITH TIME
//            ZONE` relative to the server wall clock, not `block.timestamp`.
//            The workaround (near-zero commitDurationMinutes) exercises the
//            same code path that real deadline expiry triggers in production.

import { test, expect } from "../../fixtures";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";
import { applyToGuildDirectVote } from "../../helpers/scenario";
import { BACKEND_URL, CRON_SECRET, cronApi } from "../../helpers/backend";

/** Milliseconds to wait after enabling the near-zero commit window, ensuring
 *  the Postgres timestamp is strictly in the past when the cron runs. */
const DEADLINE_SETTLE_MS = 1_500;

/**
 * Enable commit-reveal on `proposalId` with an effectively-expired commit
 * window (0.01 minutes ≈ 600 ms). By the time `processProposalTransitions`
 * is invoked the deadline will already be past in Postgres time.
 */
async function enableNearZeroCommitReveal(
  request: import("@playwright/test").APIRequestContext,
  proposalId: string,
): Promise<void> {
  const res = await request.post(
    `${BACKEND_URL}/api/proposals/${encodeURIComponent(proposalId)}/commit-reveal/enable`,
    {
      headers: { "x-cron-secret": CRON_SECRET },
      data: { commitDurationMinutes: 0.01 }, // ≈ 600 ms → already past on next tick
    },
  );
  if (!res.ok()) {
    throw new Error(
      `enableNearZeroCommitReveal(${proposalId}): ${res.status()} ${await res.text()}`,
    );
  }
}

test(
  "expert cannot cast a vote once the voting window has closed; UI reflects finalised state",
  async ({
    page,
    cleanState: _cleanState,
    candidate,
    experts,
    guild,
    panelFor,
    wallet,
  }) => {
    test.setTimeout(120_000);
    void _cleanState;

    // ─── Phase 1: Candidate applies; panel is assigned ────────────────────
    let applicationId!: string;
    let proposalId!: string;
    let panelists!: typeof experts;

    await test.step("candidate submits a guild application; deterministic panel is assigned", async () => {
      panelists = panelFor(guild.id, 5);
      const reviewerIds = panelists.map((e) => e.id);

      ({ applicationId, proposalId } = await applyToGuildDirectVote(
        page,
        candidate,
        guild.id,
        reviewerIds,
      ));

      expect(applicationId, "applicationId must be a non-empty string").toBeTruthy();
      expect(proposalId, "proposalId must be a non-empty string").toBeTruthy();
    });

    // ─── Phase 2: Enable commit-reveal with an expired window ─────────────
    await test.step(
      "commit-reveal is enabled with a near-zero commit window so the deadline is immediately in the past",
      async () => {
        await enableNearZeroCommitReveal(page.request, proposalId);

        // Give Postgres time to record the timestamp and ensure it is strictly
        // before the next CURRENT_TIMESTAMP read inside processPhaseTransitions.
        await new Promise((r) => setTimeout(r, DEADLINE_SETTLE_MS));
      },
    );

    // ─── Phase 3: Run the automation cron to advance through expiry ───────
    await test.step(
      "processProposalTransitions cron detects the expired commit deadline and auto-finalises",
      async () => {
        // Up to 3 rounds to handle the fire-and-forget finalisation path.
        for (let i = 0; i < 3; i++) {
          await cronApi.processProposalTransitions(page.request);
          await new Promise((r) => setTimeout(r, 400));
        }
      },
    );

    // ─── Phase 4: Expert logs in through the real UI ──────────────────────
    const expert = panelists[0];
    await test.step("expert connects their wallet and reaches the dashboard via the production login flow", async () => {
      await wallet.attach(page, expert.privateKey);
      await loginAsExpertViaUI(page, expert.address);
    });

    // ─── Phase 5: Applications list — no active vote button ───────────────
    await test.step(
      "the expert applications page shows the proposal without an active Cast Vote button",
      async () => {
        await page.goto("/expert/applications", { waitUntil: "domcontentloaded" });

        // Wait for the page to resolve the expert's identity and load proposals.
        await expect(
          page.getByRole("heading", { name: /applications/i }).first(),
        ).toBeVisible({ timeout: 30_000 });

        // The ProposalCard renders a "Cast Vote" primary button ONLY when the
        // proposal is non-finalised AND the expert is an unvoted assigned reviewer.
        // After finalisation it switches to an outcome badge or disappears.
        // We assert "Cast Vote" is absent from the page entirely, since the
        // proposal is now finalized.
        await expect(
          page.getByRole("button", { name: /cast vote/i }),
        ).toHaveCount(0, { timeout: 20_000 });
      },
    );

    // ─── Phase 6: Voting detail page — FinalizedView ──────────────────────
    await test.step(
      "the individual voting page renders the finalised view; no vote submission form is present",
      async () => {
        await page.goto(
          `/expert/voting/applications/${encodeURIComponent(applicationId)}`,
          { waitUntil: "domcontentloaded" },
        );

        // VotingApplicationPage switches to FinalizedView when finalized=true.
        // The finalized layout contains either an outcome heading or finalized_at.
        // We look for either the "Finalized" text in CommitRevealStatusCard or
        // the absence of the vote submission form (VotingScoreSlider + submit button).
        await expect(
          page.getByText(/finalized|ended|expired/i).first(),
        ).toBeVisible({ timeout: 30_000 });

        // No submit/cast-vote control should be visible once finalized.
        await expect(
          page.getByRole("button", { name: /cast your vote|submit vote|cast vote/i }),
        ).toHaveCount(0, { timeout: 10_000 });
      },
    );

    // ─── Phase 7: Backend enforcement — direct vote API rejects ───────────
    await test.step(
      "a direct vote POST via the API is rejected once the proposal is finalised",
      async () => {
        const res = await page.request.post(
          `${BACKEND_URL}/api/proposals/${encodeURIComponent(proposalId)}/vote`,
          {
            headers: { "x-wallet-address": expert.address },
            data: {
              score: 80,
              stakeAmount: 10,
              comment: "E2E deadline-enforcement check — should be rejected.",
            },
          },
        );

        // The backend must reject the vote with a 4xx status once the proposal
        // is finalized or the voting deadline has passed.
        expect(
          res.status(),
          `BE must reject a late vote (got ${res.status()})`,
        ).toBeGreaterThanOrEqual(400);

        const body = await res.json() as { success: boolean; error?: string; message?: string };
        const errorText = (body.error ?? body.message ?? "").toLowerCase();
        expect(
          errorText,
          "BE rejection message should reference proposal state or deadline",
        ).toMatch(/deadline|not open|finali[zs]/i);
      },
    );
  },
);
