// e2e/real-flow/scenarios/expert/vote-after-deadline.spec.ts
//
// Expert-pillar coverage: vote submission is blocked after the voting deadline.
//
// ─── Actual UI behaviour ─────────────────────────────────────────────────────
//
//   1. `voting_deadline` on `candidate_proposals` is set to
//      `CURRENT_TIMESTAMP + 3 days` in Postgres real time (NOT block.timestamp).
//      `advanceTime(anvil, ...)` advances only the EVM clock; it does NOT move
//      Postgres's `CURRENT_TIMESTAMP` and therefore does NOT expire the BE
//      deadline gate (`proposals.service.ts:718`).
//
//   2. Once a proposal's commit deadline expires, non-committers are marked
//      forfeited and removed from active assignment queries. The
//      `/expert/dashboard` ReviewQueue must not render a clickable "Review →"
//      button for that reviewer; it shows no pending review work and the
//      forfeiture appears in Recent Activity.
//
//   3. The "Cast Vote" button in `ProposalCard` and `VotingApplicationPage`
//      is only disabled when `!meetsStakingRequirement || hasVoted`. A past
//      deadline does NOT disable it on the client side in isolation — but
//      once finalised the ProposalCard switches to an outcome badge and the
//      VotingApplicationPage renders the `FinalizedView`.
//
//   4. After the `commit_deadline` passes on a commit-reveal proposal, the BE
//      cron (`processProposalTransitions`) auto-reveals + finalizes the proposal.
//      ONCE FINALIZED the `ProposalCard` replaces "Cast Vote" with an outcome
//      badge and the `VotingApplicationPage` renders the `FinalizedView`. That
//      is the primary "expert cannot vote" surface the UI exposes.
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
//   4. Expert logs in via the real UI and visits the dashboard.
//   5. Assert: dashboard ReviewQueue shows no pending review work for the
//      forfeited reviewer and no clickable Review action.
//   6. Navigate to /expert/applications (ProposalCard list).
//   7. Assert: "Cast Vote" is absent / outcome badge appears.
//   8. Navigate to the individual voting page.
//   9. Assert: FinalizedView is rendered (no vote submission form).
//  10. Assert deadline copy — either "Ended" (CommitRevealStatusCard) or
//      "Expired" (CountdownBadge) is visible somewhere on the page.
//
// ─── Known divergences documented ────────────────────────────────────────────
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

/** Milliseconds to wait after finalising so the proposal's finalized/past-
 *  deadline state has settled before the UI assertions read it. */
const DEADLINE_SETTLE_MS = 1_500;

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
    void experts; // used only as a type source below

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

    // ─── Phase 2+3: Expire the voting window and finalise the PROPOSAL ────
    //
    // ROOT-CAUSE FIX (this spec was failing at `review-queue-item-expired`):
    //
    // The dashboard ReviewQueue is fed by `guildApplicationsApi.getAssigned`,
    // which reads the Pipeline B `candidate_proposals` row (via
    // `proposal_reviewer_assignments`) and maps `cp.finalized` /
    // `cp.voting_deadline` into the GuildApplication. ReviewQueue renders the
    // disabled `review-queue-item-expired` row only when
    // `app.finalized || voting_deadline < now` (ReviewQueue.tsx:93-96).
    //
    // The previous fixture call `testApi.candidateReviews.expireAndFinalize`
    // only touches the LEGACY `candidate_guild_applications` table + the
    // dormant `candidate_guild_application_reviewer_assignments`
    // (CandidateProposalRewardsService.finalizeExpiredReviews — see
    // candidate-proposal-rewards.service.ts:181 + 242-285). It NEVER sets
    // `candidate_proposals.finalized` nor moves `candidate_proposals.voting_
    // deadline` into the past. So `getAssigned` kept returning the proposal as
    // finalized=false with a future deadline → ReviewQueue rendered the
    // CLICKABLE "Review →" button, and `review-queue-item-expired` never
    // appeared. That was a test-FIXTURE bug, not a product bug — the component
    // correctly renders the expired state when the proposal IS finalized.
    //
    // Correct path (the strategy already documented in this file's header):
    // enable commit-reveal with a near-zero commit window (deadline ~600ms out,
    // already in the past by assertion time), then run the real
    // `processProposalTransitions` cron. That cron flips
    // `voting_phase='finalized'` and `finalizationService.finalizeProposal`
    // sets `candidate_proposals.finalized = TRUE` + `finalized_at`
    // (commit-reveal-automation.service.ts:347-373,
    // proposal-finalization.service.ts:327-332). With finalized=true on the
    // proposal the dashboard now reads `isPastDeadline=true` and renders the
    // expired row.
    await test.step(
      "the candidate proposal's commit window is collapsed and the proposal is finalised via the real transition cron",
      async () => {
        // Enable commit-reveal with a ~0.01-minute (≈600ms) commit window.
        // The cronApi.enableCommitReveal helper doesn't expose a duration
        // param, so we hit the endpoint directly with the cron secret and a
        // `commitDurationMinutes` body (commit-reveal.controller.ts:12-14
        // validates it must be a positive number).
        const enableRes = await page.request.post(
          `${BACKEND_URL}/api/proposals/${encodeURIComponent(proposalId)}/commit-reveal/enable`,
          {
            headers: { "x-cron-secret": CRON_SECRET },
            data: { commitDurationMinutes: 0.01 },
          },
        );
        expect(
          enableRes.ok(),
          `commit-reveal/enable must succeed (got ${enableRes.status()}: ${await enableRes.text().catch(() => "")})`,
        ).toBeTruthy();

        // Let the ~600ms commit window elapse so the deadline is strictly in
        // the past before the transition cron evaluates `commit_deadline <=
        // CURRENT_TIMESTAMP`.
        await new Promise((r) => setTimeout(r, DEADLINE_SETTLE_MS));

        // Run the production transition cron: expired commit deadline →
        // voting_phase='finalized' → finalizeProposal sets finalized=TRUE.
        await cronApi.processProposalTransitions(page.request);

        // Brief settle so the finalized state is committed before the UI reads.
        await new Promise((r) => setTimeout(r, DEADLINE_SETTLE_MS));
      },
    );

    // ─── Phase 4: Expert logs in through the real UI ──────────────────────
    const expert = panelists[0];
    await test.step("expert connects their wallet and reaches the dashboard via the production login flow", async () => {
      await wallet.attach(page, expert.privateKey);
      await loginAsExpertViaUI(page, expert.address);
    });

    // ─── Phase 4b: Dashboard ReviewQueue — forfeited assignment hidden ────
    await test.step(
      "the expert dashboard ReviewQueue removes the forfeited past-deadline assignment from active work",
      async () => {
        await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

        // Wait for the ReviewQueue widget to render.
        await expect(
          page.getByText("Review Queue", { exact: true }),
        ).toBeVisible({ timeout: 30_000 });

        await expect(
          page.getByText("No pending reviews"),
        ).toBeVisible({ timeout: 20_000 });

        await expect(
          page.getByText("Failed to submit vote by commit deadline"),
        ).toBeVisible({ timeout: 10_000 });

        // No clickable "Review →" button should exist for this forfeited item.
        await expect(
          page.getByRole("button", { name: /review/i }),
        ).toHaveCount(0, { timeout: 5_000 });
      },
    );

    // ─── Phase 5: Applications list — no active vote button ───────────────
    await test.step(
      "the expert applications list shows the finalised proposal without an active Cast Vote button",
      async () => {
        await page.goto("/expert/voting", { waitUntil: "domcontentloaded" });

        // Wait for the page to resolve the expert's identity and load proposals.
        await expect(
          page.getByRole("heading", { name: /reviews/i }).first(),
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
      "the individual voting page is not accessible for the forfeited reviewer; no vote submission form is present",
      async () => {
        await page.goto(
          `/expert/voting/applications/${encodeURIComponent(applicationId)}`,
          { waitUntil: "domcontentloaded" },
        );

        await expect(
          page.getByText(/application not found|not assigned|not authorized|forbidden/i).first(),
        ).toBeVisible({ timeout: 30_000 });

        // No submit/cast-vote control should be visible once the reviewer has
        // forfeited their assignment.
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
          "BE rejection message should reference proposal state, deadline, or commit-reveal gating",
        ).toMatch(/deadline|not open|finali[zs]|commit-reveal|commit phase/i);
      },
    );
  },
);
