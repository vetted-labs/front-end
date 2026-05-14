// e2e/real-flow/scenarios/slashing-misalignment-panel.spec.ts
//
// Workstream B — SLASHING SCENARIO (the core protocol mechanic)
//
// A candidate applies to a guild; a 5-expert Pipeline B panel reviews with a
// DELIBERATE, oracle-predicted disagreement (CEO Consensus Scenario 7:
// 91, 88, 85, 30, 87 — both the 30 and the 91 fall outside the IQR band).
// The backend's IQR finalizer runs with tiered slashing, and this scenario
// asserts that:
//
//   • the experts the PLATFORM slashed (slash_percent = 25, tier =
//     severe_deviation) are EXACTLY the experts the ORACLE marks misaligned;
//   • the aligned experts are NOT slashed (slash_percent = 0, tier = aligned);
//   • the on-chain / DB reputation deltas match the protocol schedule
//     (−20 misaligned, +10 aligned);
//   • the candidate sees the (still-passing) outcome in the UI.
//
// Why CEO Scenario 7: it is the cleanest deliberate-disagreement vector. Under
// the inclusive-halves IQR (median 87, Q1 85, Q3 88, IQR 3):
//   - oracle inclusion band  [M ± 0.75·IQR] = [84.75, 89.25]
//   - backend slashing band  deviation/IQR ≤ 1 from median = [84, 90]
// Both bands classify {30, 91} as misaligned and {85, 87, 88} as aligned — so
// the 0.75-vs-1.0 band-width difference between consensus inclusion and
// slashing alignment does NOT change the partition here. The panel's consensus
// (86.67) is still well above the candidate pass threshold (50), so the
// candidate PASSES even though two reviewers are slashed — slashing is about
// reviewer alignment, not the candidate's outcome.
//
// Pipeline: this drives the DIRECT-vote Pipeline B path (voting_phase='direct')
// via POST /api/proposals/:id/vote with precise per-expert scores. The rubric-
// wizard UI driver only produces coarse high/mid/low bands and cannot express a
// score vector like [91, 88, 85, 30, 87]; the headline scenario already covers
// the wizard UI + commit-reveal path. Here, precision matters more than the
// last mile of UI, so we use the direct-vote API and assert the slash math.

import { test, expect } from "../fixtures";
import {
  applyToGuildDirectVote,
  submitProposalVote,
  pollProposalFinalization,
  getExpertReputation,
} from "../helpers/scenario";
import { computeConsensus } from "../oracle";
import { reviewSlash } from "../oracle/slashing";
import { REVIEW_OUTCOMES } from "../helpers/expectations";
import { BACKEND_URL, testApi } from "../helpers/backend";
import type { Expert } from "../fixtures";

// CEO Consensus Scenario 7 — "Single low outlier, strong candidate".
// Expert order E1..E5. The 30 (E4) and the 91 (E1) are the misaligned pair.
const SCORES: readonly number[] = [91, 88, 85, 30, 87];

// Candidate pass threshold (CANDIDATE_PASS_THRESHOLD, protocol.config.ts).
const APPROVAL_THRESHOLD = 50;

test(
  "misaligned panel reviewers are slashed and aligned reviewers are not",
  async ({ page, candidate, guild, panelFor, cleanState: _cleanState }) => {
    // 5 sequential API votes + a finalization poll; comfortably under 120s, but
    // give headroom for the candidate-signup + UI spot-check.
    test.setTimeout(180_000);

    // Whitepaper §2: a 5-expert panel. panelFor returns a deterministic set.
    const panel = panelFor(guild.id, 5);
    expect(panel.length).toBe(5);

    // ─── The oracle is the independent reference — compute it up front ──────
    // computeConsensus replicates the backend IQR (Technical Appendix §4 /
    // oracle/consensus.ts). For SCORES it predicts {30, 91} misaligned,
    // {85, 87, 88} aligned, consensus 86.67.
    const oracle = computeConsensus([...SCORES]);
    const oracleMisalignedScores = new Set(oracle.excluded);
    const oracleAlignedScores = new Set(oracle.included);

    await test.step("oracle predicts the misaligned pair before the panel runs", () => {
      // Sanity-check the fixture vector against the oracle so a future edit to
      // SCORES that breaks the deliberate-disagreement property fails loudly
      // HERE rather than as a confusing slash-set mismatch later.
      expect([...oracleMisalignedScores].sort((a, b) => a - b)).toEqual([
        30, 91,
      ]);
      expect([...oracleAlignedScores].sort((a, b) => a - b)).toEqual([
        85, 87, 88,
      ]);
      expect(oracle.consensusScore).toBeGreaterThanOrEqual(APPROVAL_THRESHOLD);
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

    // ─── Phase 1: Capture each reviewer's reputation BEFORE finalization ────
    // The slash/reward reputation deltas are applied during finalization, so we
    // snapshot the baseline now to assert exact deltas afterwards.
    const reputationBefore = new Map<string, number>();
    await test.step("record every panel reviewer's reputation baseline", async () => {
      for (const expert of panel) {
        reputationBefore.set(
          expert.id,
          await getExpertReputation(page.request, expert),
        );
      }
      expect(reputationBefore.size).toBe(5);
    });

    // ─── Phase 2: The 5 reviewers submit their deliberate scores ────────────
    // The LAST vote triggers the backend's early IQR finalization automatically.
    await test.step("the 5 panel reviewers submit a deliberately split score vector", async () => {
      for (let i = 0; i < panel.length; i++) {
        await submitProposalVote(
          page.request,
          proposalId,
          panel[i],
          SCORES[i],
        );
      }
    });

    // ─── Phase 3: Read the platform's finalization + slash decisions ────────
    let finalization!: NonNullable<
      Awaited<ReturnType<typeof pollProposalFinalization>>
    >;
    await test.step("the backend finalizes the panel with IQR-tiered slashing", async () => {
      const result = await pollProposalFinalization(
        page.request,
        proposalId,
        panel[0],
      );
      expect(
        result,
        "proposal must be finalized after all 5 reviewers vote",
      ).not.toBeNull();
      finalization = result!;

      // Every submitted vote was processed.
      expect(finalization.vote_count).toBe(5);

      // The candidate PASSES — consensus is above threshold even with 2 slashed
      // reviewers (slashing is about reviewer alignment, not the verdict).
      expect(finalization.outcome).toBe(REVIEW_OUTCOMES.APPROVED);

      // Platform consensus agrees with the oracle (within rounding).
      const platformConsensus = parseFloat(
        finalization.consensus_score ?? "0",
      );
      expect(platformConsensus).toBeCloseTo(oracle.consensusScore, 1);
    });

    // ─── Phase 4: THE CORE ASSERTION — platform slash set == oracle's ───────
    await test.step("the platform slashes exactly the experts the oracle marks misaligned", async () => {
      // Build the platform's verdict per expert from the finalization payload.
      const expertIdToScore = new Map(panel.map((e, i) => [e.id, SCORES[i]]));

      const platformSlashed = new Set<number>();
      const platformAligned = new Set<number>();

      for (const vote of finalization.votes) {
        const score = expertIdToScore.get(vote.expert_id);
        expect(
          score,
          `finalization returned an unexpected expert ${vote.expert_id}`,
        ).toBeDefined();

        // The platform's slash decision: severe_deviation tier + 25% slash.
        if (vote.slash_percent > 0) {
          expect(vote.slash_percent).toBe(25);
          expect(vote.slashing_tier).toBe("severe_deviation");
          expect(vote.reputation_change).toBe(-20);
          platformSlashed.add(score!);
        } else {
          expect(vote.slashing_tier).toBe("aligned");
          expect(vote.reputation_change).toBe(10);
          platformAligned.add(score!);
        }
      }

      // THE invariant: the set the platform slashed is EXACTLY the set the
      // oracle independently marks misaligned — and the aligned sets match too.
      expect([...platformSlashed].sort((a, b) => a - b)).toEqual(
        [...oracleMisalignedScores].sort((a, b) => a - b),
      );
      expect([...platformAligned].sort((a, b) => a - b)).toEqual(
        [...oracleAlignedScores].sort((a, b) => a - b),
      );

      // And cross-check the oracle's own slashing module: a misaligned reviewer
      // loses 25% of stake and −20 rep; an aligned reviewer loses nothing.
      expect(reviewSlash({ aligned: false, stake: 100 }).slashPercent).toBe(25);
      expect(reviewSlash({ aligned: true, stake: 100 }).slashPercent).toBe(0);
    });

    // ─── Phase 5: Reputation deltas match the protocol schedule ─────────────
    // DB/chain invariant: the +10 / −20 deltas were actually applied to the
    // experts' persistent reputation, not just reported in the vote row.
    await test.step("misaligned reviewers lose 20 reputation and aligned reviewers gain 10", async () => {
      const expertIdToScore = new Map(panel.map((e, i) => [e.id, SCORES[i]]));
      for (const expert of panel) {
        const score = expertIdToScore.get(expert.id)!;
        const before = reputationBefore.get(expert.id)!;
        const after = await getExpertReputation(page.request, expert);
        const delta = after - before;

        if (oracleMisalignedScores.has(score)) {
          // −20, floored at 0 by the finalizer (GREATEST(... , 0)). The
          // bootstrap stakes experts with a healthy reputation, so the floor
          // is not expected to bite — assert the exact −20.
          expect(
            delta,
            `misaligned expert (score ${score}) should lose 20 reputation`,
          ).toBe(-20);
        } else {
          expect(
            delta,
            `aligned expert (score ${score}) should gain 10 reputation`,
          ).toBe(10);
        }
      }
    });

    // ─── Phase 6: Candidate-visible outcome ─────────────────────────────────
    await test.step("the candidate sees their guild application approved despite the split panel", async () => {
      // DB invariant: the linked guild application is approved.
      const res = await page.request.get(
        `${BACKEND_URL}/api/candidates/me/guild-applications`,
        { headers: { Authorization: `Bearer ${candidate.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as {
        data: Array<{ id: string; proposalOutcome: string | null }>;
      };
      const app = body.data.find((row) => row.id === applicationId);
      expect(app?.proposalOutcome).toBe(REVIEW_OUTCOMES.APPROVED);

      // User-visible: the approved pill renders on /candidate/guilds.
      await page.goto("/candidate/guilds", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/approved/i).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    // ─── Phase 7: Settle background work before teardown ────────────────────
    // An APPROVED finalization kicks off fire-and-forget backend work — guild-
    // membership creation, the reward-distribution outbox, and
    // scheduleOnChainFinalization. If that work is still touching tables when
    // the cleanState fixture runs `POST /api/test/reset` (a single TRUNCATE ...
    // CASCADE that takes ACCESS EXCLUSIVE locks), the two deadlock. Draining the
    // blockchain-ops outbox here lets the async chain settle so teardown's
    // TRUNCATE has no concurrent lock-holder to deadlock against.
    await test.step("backend async finalization work settles before teardown", async () => {
      await testApi.drain(page.request);
      // A short settle window for any remaining fire-and-forget callbacks
      // (scheduleOnChainFinalization) to release their table locks.
      await page.waitForTimeout(1_500);
    });
  },
);

// Standalone type export so the Expert import is not tree-shaken in isolation.
export type { Expert };
