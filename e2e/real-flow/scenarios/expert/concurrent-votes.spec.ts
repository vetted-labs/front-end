// e2e/real-flow/scenarios/expert/concurrent-votes.spec.ts
//
// J3 — Concurrent expert votes: two panel members submit the rubric wizard
// simultaneously; both commits must land in the backend.
//
// Why this matters: commit-reveal uses per-expert on-chain nonces and
// DB rows in proposal_votes. A double-write or DB-level unique-constraint
// race could silently drop one of two concurrent commits. This spec drives
// the UI wizard for two experts in two separate browser contexts at the same
// time (Promise.all) and then asserts the backend recorded both via the
// commit-reveal phase-status endpoint (`totalCommitments >= 2`).
//
// Pipeline: the candidate application goes through Pipeline B (commit-reveal).
// `applyToGuildViaUI` enables commit-reveal and drains the outbox so the
// on-chain session exists before the two experts try to vote.
//
// Invariant checked: GET /api/proposals/:proposalId/commit-reveal/status →
// { totalCommitments } ≥ 2.  The vote-history endpoint only exposes data
// post-finalization, so we use the phase-status route which counts committed
// (but not yet revealed) votes in real-time.

import { test, expect } from "../../fixtures";
import { applyToGuildViaUI } from "../../helpers/scenario";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";
import { submitRubricReviewViaUI } from "../../helpers/ui-review";
import { BACKEND_URL } from "../../helpers/backend";

test(
  "two experts vote simultaneously — both votes record",
  async ({
    page,
    candidate,
    guild,
    panelFor,
    wallet,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to activate cleanState fixture for DB/chain reset side-effect
    cleanState: _cleanState,
  }) => {
    // Two concurrent UI-driven wizard flows: each has 4 wizard steps,
    // an on-chain commitVote tx, and 12-confirmation wait. 240s is generous
    // but realistic given the background miner ticks every 200ms.
    test.setTimeout(240_000);

    // ── Phase 0: Panel selection ──────────────────────────────────────────
    // panelFor(guildId, size) — whitepaper §2 minimum is 5.
    // We need at least 2 for the concurrent vote; 5 satisfies the protocol
    // minimum and lets later assertion checks remain valid.
    const panel = panelFor(guild.id, 5);
    const [expertA, expertB] = panel;

    // ── Phase 1: Candidate applies and the commit-reveal session is live ──
    let applicationId!: string;
    let proposalId!: string;

    await test.step("candidate applies to guild and the on-chain vetting session is created", async () => {
      const result = await applyToGuildViaUI(
        page,
        candidate,
        guild.id,
        panel.map((e) => e.id),
      );
      applicationId = result.applicationId;

      expect(applicationId).toBeTruthy();
      expect(result.sessionId).toBeTruthy();

      // Resolve the linked candidateProposalId from the guild-applications
      // list so we can query the commit-reveal status endpoint later.
      const appsRes = await page.request.get(
        `${BACKEND_URL}/api/candidates/me/guild-applications`,
        { headers: { Authorization: `Bearer ${candidate.token}` } },
      );
      expect(appsRes.ok()).toBeTruthy();
      const appsBody = (await appsRes.json()) as {
        data: Array<{ id: string; candidate_proposal_id?: string | null; candidateProposalId?: string | null }>;
      };
      const appRow = appsBody.data.find((r) => r.id === applicationId);
      expect(appRow, "application row must be present in /me/guild-applications").toBeDefined();
      const pid = appRow?.candidate_proposal_id ?? appRow?.candidateProposalId;
      expect(pid, "application must carry a candidateProposalId").toBeTruthy();
      proposalId = pid!;
    });

    // ── Phase 2: Two experts submit the rubric wizard concurrently ────────
    //
    // Each expert gets its own browser context (separate wallet + session).
    // wallet.attach must be called on the new page BEFORE loginAsExpertViaUI
    // so the headless wallet shim is injected into the page runtime.
    // Both wizards run inside a single Promise.all to maximise concurrency
    // and surface any race conditions in the DB commit path.

    const browser = page.context().browser()!;
    const origin = new URL(page.url()).origin;

    const ctxA = await browser.newContext({ baseURL: origin, bypassCSP: true });
    const ctxB = await browser.newContext({ baseURL: origin, bypassCSP: true });

    try {
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      // Attach headless wallets — must happen before navigation.
      await wallet.attach(pageA, expertA.privateKey);
      await wallet.attach(pageB, expertB.privateKey);

      await test.step("both experts log in via the real UI simultaneously", async () => {
        await Promise.all([
          loginAsExpertViaUI(pageA, expertA.address),
          loginAsExpertViaUI(pageB, expertB.address),
        ]);
      });

      await test.step("both experts walk the 4-step rubric wizard and submit their votes concurrently", async () => {
        const [resultA, resultB] = await Promise.all([
          submitRubricReviewViaUI(pageA, {
            generalScore: "high",
            domainScore: "high",
            justification: "Concurrent reviewer A: strong candidate with excellent domain depth and communication skills.",
          }),
          submitRubricReviewViaUI(pageB, {
            generalScore: "high",
            domainScore: "high",
            justification: "Concurrent reviewer B: excellent candidate with strong technical background and clear motivation.",
          }),
        ]);

        // Both wizards must report success.
        expect(resultA.submitted, "expert A's review submission must succeed").toBe(true);
        expect(resultB.submitted, "expert B's review submission must succeed").toBe(true);
      });
    } finally {
      // Always close contexts regardless of test outcome to free resources.
      await ctxA.close().catch(() => undefined);
      await ctxB.close().catch(() => undefined);
    }

    // ── Phase 3: Backend invariant — both commits recorded ────────────────
    //
    // GET /api/proposals/:id/commit-reveal/status returns `totalCommitments`
    // = COUNT(*) of proposal_votes rows with commit_hash IS NOT NULL and
    // revealed = FALSE. This reflects in-flight commitments before finalization,
    // which is exactly the race we are probing. Auth: x-wallet-address header
    // with an assigned panel member (expertA is the first assigned reviewer).

    await test.step("BE records at least 2 committed votes for the proposal", async () => {
      const statusRes = await page.request.get(
        `${BACKEND_URL}/api/proposals/${encodeURIComponent(proposalId)}/commit-reveal/status`,
        { headers: { "x-wallet-address": expertA.address } },
      );
      expect(
        statusRes.ok(),
        `GET /api/proposals/${proposalId}/commit-reveal/status must return 2xx (got ${statusRes.status()})`,
      ).toBeTruthy();

      const statusBody = (await statusRes.json()) as {
        data: { totalCommitments?: number; totalActive?: number };
      };
      const totalCommitments = statusBody.data?.totalCommitments ?? 0;

      expect(
        totalCommitments,
        `both concurrent votes must have been recorded — expected totalCommitments >= 2, got ${totalCommitments}`,
      ).toBeGreaterThanOrEqual(2);
    });
  },
);
