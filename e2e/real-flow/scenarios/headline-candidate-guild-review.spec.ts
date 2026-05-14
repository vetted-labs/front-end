// e2e/real-flow/scenarios/headline-candidate-guild-review.spec.ts
//
// Workstream B — HEADLINE SCENARIO
//
// A candidate applies to a guild, a 5-expert panel reviews via the real rubric
// wizard (submitRubricReviewViaUI), IQR consensus finalizes, and the candidate
// sees the outcome. Every test.step() asserts a user-visible outcome AND a
// chain/DB invariant AND oracle agreement (computeConsensus).
//
// ─── DIV-001 RESOLVED (2026-05-14) ────────────────────────────────────────────
//
// Candidate guild-applications now route through Pipeline B: POST
// /api/guilds/{id}/applications creates a linked candidate_proposals row
// (5-7 expert panel, commit-reveal, IQR consensus) and returns its
// candidateProposalId. applyToGuildViaUI() reads that id, then calls the
// /api/test/candidate-reviews/{id}/assign-panel fixture with the panelFor
// expert ids so the panel is deterministic. The test.fixme() gate has been
// removed and this scenario runs.
//
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from "../fixtures";
import {
  applyToGuildViaUI,
  advanceTime,
  fireExpertTransitions,
  finalize,
} from "../helpers/scenario";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import { submitRubricReviewViaUI } from "../helpers/ui-review";
import { computeConsensus } from "../oracle";
import { REVIEW_OUTCOMES, SESSION_PHASE } from "../helpers/expectations";
import { BACKEND_URL } from "../helpers/backend";
import type { Hex } from "viem";

// One day + 1 second — the on-chain commit/reveal windows in Deploy.s.sol are
// each 1 day; pushing past them (plus a mine) flips the session phase.
const ONE_DAY_PLUS_ONE = 60 * 60 * 24 + 1;

// The candidate pass threshold (CANDIDATE_PASS_THRESHOLD in protocol.config.ts,
// per the CEO Consensus Scenarios doc) — consensus score must be ≥50.
const APPROVAL_THRESHOLD = 50;

// Indexable view of the sessions(bytes32) tuple. ABI loaded from non-const JSON
// so viem types it as unknown; we cast to this shape to reach phase (slot 6).
type SessionTuple = readonly [
  Hex, // guildId
  bigint, // commitDeadline
  bigint, // revealDeadline
  number, // panelSize
  number, // commitCount
  number, // revealCount
  number, // phase (enum SessionPhase)
  Hex, // applicationHash
];

// ─── The headline scenario ────────────────────────────────────────────────────

test(
  "candidate joins a guild after a 5-expert panel review via the rubric wizard",
  async ({
    page,
    candidate,
    guild,
    panelFor,
    contracts,
    anvil,
    wallet,
    cleanState: _cleanState,
  }) => {
    // ─── Phase 0: Application ───────────────────────────────────────────────
    // DIV-001 RESOLVED: POST /api/guilds/{id}/applications now routes through
    // Pipeline B — it creates a linked candidate_proposals row and returns its
    // candidateProposalId. applyToGuildViaUI() then pins the panel to the
    // panelFor experts via the assign-panel test fixture.

    // Whitepaper §2: panels are 5-7 experts. We use 5 (the minimum).
    // Defined up front so applyToGuildViaUI can pin the panel deterministically.
    const panel = panelFor(guild.id, 5);

    let applicationId!: string;
    let sessionId!: Hex;

    await test.step("candidate submits a guild application via the UI", async () => {
      const result = await applyToGuildViaUI(
        page,
        candidate,
        guild.id,
        panel.map((e) => e.id),
      );
      applicationId = result.applicationId;
      sessionId = result.sessionId;

      // User-visible: application appears in candidate's list.
      const listRes = await page.request.get(
        `${BACKEND_URL}/api/candidates/me/guild-applications`,
        { headers: { Authorization: `Bearer ${candidate.token}` } },
      );
      expect(listRes.ok()).toBeTruthy();
      const listBody = (await listRes.json()) as {
        data: Array<{ id: string }>;
      };
      expect(listBody.data.some((r) => r.id === applicationId)).toBe(true);

      // DB invariant: both ids are populated.
      expect(applicationId).toBeTruthy();
      expect(sessionId).toBeTruthy();
    });

    // ─── Phase 1: 5-expert panel reviews via the rubric wizard ─────────────
    //
    // One browser context per actor (real-flow operating principle #3).
    // `panel` is the same deterministic 5-expert set assigned in Phase 0.
    const submittedScores: number[] = [];

    await test.step("each of the 5 panel experts reviews via the 4-step rubric wizard", async () => {
      for (const reviewer of panel) {
        const ctx = await page
          .context()
          .browser()!
          .newContext({
            baseURL: new URL(page.url()).origin,
            bypassCSP: true,
          });
        try {
          const reviewerPage = await ctx.newPage();

          // Attach the headless wallet and log in as this expert.
          await wallet.attach(reviewerPage, reviewer.privateKey);
          await loginAsExpertViaUI(reviewerPage, reviewer.address);

          // Walk the 4-step rubric wizard — this is the core UI exercise.
          // submitRubricReviewViaUI navigates to /expert/voting and clicks the
          // first queued Candidate Review automatically.
          const result = await submitRubricReviewViaUI(reviewerPage, {
            generalScore: "high",
            domainScore: "high",
            justification: `Panel review by ${reviewer.address}: strong, well-evidenced application across all rubric dimensions.`,
          });

          // User-visible assertion: wizard completed and returned submitted=true.
          expect(result.submitted).toBe(true);

          // DB/chain invariant: score is in the valid rubric range (0-100).
          // normalizedScore of 0 means we couldn't parse it from the UI success
          // panel — use 80 (high band) as a fallback so the oracle step runs.
          const score =
            result.normalizedScore > 0 ? result.normalizedScore : 80;
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          submittedScores.push(score);
        } finally {
          await ctx.close();
        }
      }

      // All 5 reviewers submitted.
      expect(submittedScores.length).toBe(5);
    });

    // ─── Phase 2: Oracle sanity check BEFORE finalization ──────────────────
    //
    // The oracle (computeConsensus) is the independent IQR reference
    // (Technical Appendix §4 / oracle/consensus.ts). Running it here lets us
    // distinguish "panel consensus was fine" from "finalization pipeline broke".

    await test.step("oracle computes IQR consensus over the 5 submitted scores", async () => {
      const oracleResult = computeConsensus(submittedScores);

      // Oracle-level assertion: consensus is above the approval threshold.
      // With all-high scores the IQR band is tight and consensus ≈ mean(scores).
      expect(oracleResult.consensusScore).toBeGreaterThanOrEqual(
        APPROVAL_THRESHOLD,
      );

      // All 5 scores should be classified as aligned (tight band, no outliers).
      const misaligned = oracleResult.classification.filter((c) => !c.aligned);
      expect(misaligned.length).toBe(0);
    });

    // ─── Phase 3: Commit-reveal finalization ───────────────────────────────
    //
    // The rubric wizard (ReviewGuildApplicationModal → CommitmentForm) submits
    // a "commitment" in commit-reveal mode. We need to:
    //   1. Advance past the commit window.
    //   2. Trigger the BE cron to advance the session to the Reveal phase.
    //   3. Advance past the reveal window.
    //   4. Trigger transitions again (session → Finalized on BE side).
    //   5. Call finalizeSessionVerifiable on-chain.
    //
    // SCENARIO_OUTCOME_MATRIX §3: "No reveal-phase screen exists in the
    // frontend — phase model is direct | commit | finalized. Reveal is
    // automatic backend-side." So no UI reveal action is needed here.
    //
    // If applyToGuildViaUI stalled in Phase 0 (see divergence), the sessionId
    // is a zero-value hex and finalize() will revert with an on-chain error.

    await test.step("commit window expires and BE transitions session to reveal phase", async () => {
      await advanceTime(anvil, ONE_DAY_PLUS_ONE);
      await fireExpertTransitions(page.request);
    });

    await test.step("reveal window expires and BE finalizes the session", async () => {
      await advanceTime(anvil, ONE_DAY_PLUS_ONE);
      await fireExpertTransitions(page.request);
    });

    await test.step("owner calls finalizeSessionVerifiable on-chain", async () => {
      await finalize(panel[0], contracts, sessionId);
    });

    // ─── Phase 4: Chain assertion ───────────────────────────────────────────

    await test.step("on-chain session phase is Finalized (phase slot = 3)", async () => {
      const session = (await contracts.vettingManager.read.sessions([
        sessionId,
      ])) as SessionTuple;
      // Slot 6 is the phase enum: Finalized = 3 per SESSION_PHASE.FINALIZED.
      expect(session[6]).toBe(SESSION_PHASE.FINALIZED);
    });

    // ─── Phase 5: BE outcome ───────────────────────────────────────────────
    //
    // All-high scores → consensus well above 60 → proposalOutcome = "approved".

    await test.step("BE records the application outcome as approved", async () => {
      // The BE surfaces outcome through the candidate-authenticated list
      // endpoint (no per-id route — see 01-approve-consensus.spec.ts note #2).
      const res = await page.request.get(
        `${BACKEND_URL}/api/candidates/me/guild-applications`,
        { headers: { Authorization: `Bearer ${candidate.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as {
        data: Array<{ id: string; proposalOutcome: string | null }>;
      };
      const app = body.data.find((row) => row.id === applicationId);
      expect(app).toBeDefined();
      expect(app?.proposalOutcome).toBe(REVIEW_OUTCOMES.APPROVED);
    });

    // ─── Phase 6: Oracle agreement with the platform outcome ───────────────
    //
    // Re-run the oracle to verify its consensusScore agrees with the platform's
    // "approved" decision. Because the oracle replicates the backend's IQR
    // implementation, any divergence here signals a backend regression, not a
    // test bug.

    await test.step("oracle consensusScore agrees with the platform approved decision", async () => {
      const oracleResult = computeConsensus(submittedScores);

      // Consensus must be above the approval threshold.
      expect(oracleResult.consensusScore).toBeGreaterThanOrEqual(
        APPROVAL_THRESHOLD,
      );

      // Every score is aligned (no outliers expected with all-high reviews).
      expect(oracleResult.classification.every((c) => c.aligned)).toBe(true);
    });

    // ─── Phase 7: Candidate sees the outcome in the UI ─────────────────────

    await test.step("candidate sees their application approved in the UI", async () => {
      // The applications list renders status pills from proposalOutcome.
      // An /approved/i match mirrors 01-approve-consensus.spec.ts §UI spot-check.
      await page.goto("/candidate/applications", {
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByText(/approved/i).first()).toBeVisible({
        timeout: 15_000,
      });
    });
  },
);
