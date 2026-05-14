// e2e/real-flow/scenarios/candidate-rejected-consensus.spec.ts
//
// Workstream B — CANDIDATE-REJECTED VERDICT SCENARIO
//
// The headline scenario (headline-candidate-guild-review.spec.ts) exercises the
// APPROVED verdict path. This scenario is its mirror: a candidate applies to a
// guild, a 5-expert Pipeline B panel reviews with a tight LOW score cluster,
// the IQR consensus lands below the candidate pass threshold, and the candidate
// sees the REJECTED outcome.
//
// Score vector: CEO Consensus Scenario 2 — "Tight consensus, clear fail"
// (18, 22, 15, 20, 25). Under inclusive-halves IQR (median 20, Q1 18, Q3 22,
// IQR 4): band [17, 23] → aligned {18, 20, 22}, misaligned {15, 25}; consensus
// = mean(18, 20, 22) = 20, which is < 50 (CANDIDATE_PASS_THRESHOLD) → REJECTED.
//
// So this scenario also incidentally exercises slashing of the two tight-cluster
// outliers — that is fine and additive; the slashing-misalignment-panel.spec.ts
// scenario is the dedicated slash assertion. Here the PRIMARY assertion is the
// rejected verdict, with the oracle independently confirming the FAIL outcome.
//
// Pipeline: direct-vote Pipeline B (voting_phase='direct') via
// POST /api/proposals/:id/vote — same path as the slashing scenario, for the
// same reason: precise per-expert scores cannot be expressed through the coarse
// high/mid/low rubric-wizard UI driver.

import { test, expect } from "../fixtures";
import {
  applyToGuildDirectVote,
  submitProposalVote,
  pollProposalFinalization,
} from "../helpers/scenario";
import { computeConsensus } from "../oracle";
import { REVIEW_OUTCOMES } from "../helpers/expectations";
import { BACKEND_URL } from "../helpers/backend";

// CEO Consensus Scenario 2 — "Tight consensus, clear fail". Expert order E1..E5.
const SCORES: readonly number[] = [18, 22, 15, 20, 25];

// Candidate pass threshold (CANDIDATE_PASS_THRESHOLD, protocol.config.ts).
const APPROVAL_THRESHOLD = 50;

test(
  "candidate is rejected when the panel consensus lands below the pass threshold",
  async ({ page, candidate, guild, panelFor, cleanState: _cleanState }) => {
    test.setTimeout(180_000);

    const panel = panelFor(guild.id, 5);
    expect(panel.length).toBe(5);

    // ─── The oracle is the independent reference — compute it up front ──────
    const oracle = computeConsensus([...SCORES]);

    await test.step("oracle predicts a failing consensus before the panel runs", () => {
      // Consensus must be strictly below the pass threshold for the verdict to
      // be REJECTED — guard the fixture vector against a future edit.
      expect(oracle.consensusScore).toBeLessThan(APPROVAL_THRESHOLD);
      // CEO Scenario 2 pins consensus = 20.
      expect(oracle.consensusScore).toBe(20);
    });

    let applicationId!: string;
    let proposalId!: string;

    // ─── Phase 0: Application + deterministic panel (direct-vote Pipeline B) ─
    await test.step("candidate submits a guild application and the test panel is seated", async () => {
      const r = await applyToGuildDirectVote(
        page,
        candidate,
        guild.id,
        panel.map((e) => e.id),
      );
      applicationId = r.applicationId;
      proposalId = r.proposalId;
      expect(applicationId).toBeTruthy();
      expect(proposalId).toBeTruthy();
    });

    // ─── Phase 1: The 5 reviewers submit a tight low score cluster ──────────
    await test.step("the 5 panel reviewers submit a tight low-scoring vote vector", async () => {
      for (let i = 0; i < panel.length; i++) {
        await submitProposalVote(page.request, proposalId, panel[i], SCORES[i]);
      }
    });

    // ─── Phase 2: Backend finalizes — verdict must be REJECTED ──────────────
    await test.step("the backend finalizes the panel and the verdict is rejected", async () => {
      const finalization = await pollProposalFinalization(
        page.request,
        proposalId,
        panel[0],
      );
      expect(
        finalization,
        "proposal must be finalized after all 5 reviewers vote",
      ).not.toBeNull();

      // All 5 votes processed.
      expect(finalization!.vote_count).toBe(5);

      // THE verdict assertion: the candidate is REJECTED.
      expect(finalization!.outcome).toBe(REVIEW_OUTCOMES.REJECTED);

      // Platform consensus agrees with the oracle (within rounding) and is
      // below the pass threshold.
      const platformConsensus = parseFloat(
        finalization!.consensus_score ?? "0",
      );
      expect(platformConsensus).toBeCloseTo(oracle.consensusScore, 1);
      expect(platformConsensus).toBeLessThan(APPROVAL_THRESHOLD);
    });

    // ─── Phase 3: Candidate-visible REJECTED outcome ────────────────────────
    await test.step("the candidate sees their guild application rejected in the UI", async () => {
      // DB invariant: the linked guild application is rejected.
      const res = await page.request.get(
        `${BACKEND_URL}/api/candidates/me/guild-applications`,
        { headers: { Authorization: `Bearer ${candidate.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as {
        data: Array<{ id: string; proposalOutcome: string | null }>;
      };
      const app = body.data.find((row) => row.id === applicationId);
      expect(app?.proposalOutcome).toBe(REVIEW_OUTCOMES.REJECTED);

      // User-visible: the rejected pill renders on /candidate/guilds.
      await page.goto("/candidate/guilds", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/rejected/i).first()).toBeVisible({
        timeout: 15_000,
      });
    });
  },
);
