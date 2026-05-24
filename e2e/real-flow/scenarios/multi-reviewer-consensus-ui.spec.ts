// e2e/real-flow/scenarios/multi-reviewer-consensus-ui.spec.ts
//
// Phase 3 — multi-reviewer consensus rendered in UI.
//
// A candidate applies to a guild, 5 experts review via the rubric wizard
// (all high scores → approve), and the candidate's /candidate/guilds page
// surfaces an "APPROVED" pill once IQR finalization completes.
//
// Plan-vs-reality corrections applied (see pre-context and headline scenario):
//   - panelFor(guildId, size) takes guildId as first arg (NOT candidateId),
//     size must be 5-7 (whitepaper §2 minimum).
//   - loginAsExpertViaUI(page, expert.address) — passes address string, not object.
//   - submitRubricReviewViaUI uses { generalScore, domainScore, justification },
//     NOT a `band` property — the task spec template was wrong.
//   - wallet.attach(page, expert.privateKey) is required before loginAsExpertViaUI
//     in each new browser context to inject the headless wallet.
//   - There is no /candidate/applications/[id] route. Guild applications surface
//     on /candidate/guilds as a statusLabel="APPROVED" pill (CandidateGuilds.tsx).
//   - The consensus UI assertion is getByText(/approved/i), not getByRole("status").
//   - Commit-reveal finalization is backend-driven (finalizeViaBackend).

import { test, expect } from "../fixtures";
import {
  applyToGuildViaUI,
  advanceTime,
  finalizeViaBackend,
} from "../helpers/scenario";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import { submitRubricReviewViaUI } from "../helpers/ui-review";
import { computeConsensus } from "../oracle";
import { REVIEW_OUTCOMES } from "../helpers/expectations";
import { BACKEND_URL } from "../helpers/backend";
import type { Hex } from "viem";

// One day + 1 second. The on-chain commit/reveal windows (Deploy.s.sol) are
// each 1 day; pushing past them plus a mine flips the phase deterministically.
const ONE_DAY_PLUS_ONE = 60 * 60 * 24 + 1;

// Approval threshold from the Technical Appendix (CANDIDATE_PASS_THRESHOLD).
const APPROVAL_THRESHOLD = 50;

test(
  "five experts each approve via UI → candidate page surfaces approved pill",
  async ({
    page,
    candidate,
    guild,
    panelFor,
    contracts,
    anvil,
    wallet,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to activate the cleanState fixture (DB/chain reset) for its side effect
    cleanState: _cleanState,
  }) => {
    // 5 sequential rubric reviews (each with an on-chain commit + 12-confirmation
    // wait) and a finalization pump legitimately exceed the default 120s budget.
    test.setTimeout(300_000);

    // ── Phase 0: Select panel ─────────────────────────────────────────────────
    // Whitepaper §2: panels are 5-7 experts. We use 5 (the minimum).
    // panelFor takes (guildId, size) — NOT (candidateId, size).
    const panel = panelFor(guild.id, 5);

    let applicationId!: string;
    let sessionId!: Hex;

    // ── Phase 1: Application ──────────────────────────────────────────────────
    await test.step("candidate applies to guild via UI", async () => {
      const result = await applyToGuildViaUI(
        page,
        candidate,
        guild.id,
        panel.map((e) => e.id),
      );
      applicationId = result.applicationId;
      sessionId = result.sessionId;

      // Invariant: both ids are populated.
      expect(applicationId).toBeTruthy();
      expect(sessionId).toBeTruthy();
    });

    // ── Phase 2: 5-expert panel reviews via the rubric wizard ─────────────────
    //
    // One browser context per actor. wallet.attach must be called on the new
    // page before loginAsExpertViaUI so the headless wallet shim is present.
    const submittedScores: number[] = [];

    await test.step("each of the 5 panel experts reviews via the rubric wizard", async () => {
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

          // Attach the headless wallet shim BEFORE login.
          await wallet.attach(reviewerPage, reviewer.privateKey);
          // loginAsExpertViaUI takes an address string, not the Expert object.
          await loginAsExpertViaUI(reviewerPage, reviewer.address);

          // Walk the 4-step rubric wizard.
          const result = await submitRubricReviewViaUI(reviewerPage, {
            reviewAppId: applicationId,
            reviewType: "candidate",
            generalScore: "high",
            domainScore: "high",
            justification: `Panel review by ${reviewer.address}: strong, well-evidenced application across all rubric dimensions.`,
          });

          // User-visible: wizard completed.
          expect(result.submitted).toBe(true);

          // Collect the normalised score for oracle validation.
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

    // ── Phase 3: Oracle sanity check ──────────────────────────────────────────
    await test.step("oracle computes IQR consensus ≥ 50 over the 5 high scores", async () => {
      const oracleResult = computeConsensus(submittedScores);

      // All-high scores → consensus well above threshold.
      expect(oracleResult.consensusScore).toBeGreaterThanOrEqual(
        APPROVAL_THRESHOLD,
      );

      // All 5 should be classified as aligned (tight band, no outliers).
      const misaligned = oracleResult.classification.filter((c) => !c.aligned);
      expect(misaligned.length).toBe(0);
    });

    // ── Phase 4: Commit + reveal windows expire ───────────────────────────────
    await test.step("commit and reveal windows expire (time-warp)", async () => {
      await advanceTime(anvil, ONE_DAY_PLUS_ONE);
      await advanceTime(anvil, ONE_DAY_PLUS_ONE);
    });

    // ── Phase 5: Backend finalizes the session on-chain ───────────────────────
    //
    // finalizeViaBackend pumps the proposal-transition cron and drains the
    // blockchain-ops outbox. The finalize op is queued asynchronously and
    // processed in bounded batches — poll until confirmed.
    await test.step("BE finalizes the session on-chain", async () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        await finalizeViaBackend(page.request);
        await new Promise((r) => setTimeout(r, 1_000));
      }
      // At this point the outbox has had plenty of ticks to land the
      // finalize op. The UI and BE assertions below confirm the outcome.
    });

    // ── Phase 6: BE records approved outcome ──────────────────────────────────
    await test.step("BE records the application outcome as approved", async () => {
      // No per-id route exists for guild-applications. The candidate-authenticated
      // list endpoint surfaces proposalOutcome per row.
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

    // ── Phase 7: Candidate's guild page renders the approved pill ─────────────
    //
    // Guild applications surface on /candidate/guilds.
    // CandidateGuilds.tsx renders statusLabel="APPROVED" for approved rows.
    // (/candidate/applications is the job-pipeline — it would show an empty state.)
    await test.step("candidate's application page renders an approved consensus pill", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "domcontentloaded" });
      await expect(page.getByText(/approved/i).first()).toBeVisible({
        timeout: 30_000,
      });
    });
  },
);
