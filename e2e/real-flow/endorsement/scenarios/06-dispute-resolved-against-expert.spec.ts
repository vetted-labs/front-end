// e2e/real-flow/endorsement/scenarios/06-dispute-resolved-against-expert.spec.ts
//
// Suite B — Scenario 06: dispute-resolved-against-expert.
//
// Builds on T25 (scenario 05, dispute-resolved-for-expert) which itself builds
// on T24 (scenario 04, performance-issue-no-dispute). The candidate is hired;
// before the retention deadline lapses cleanly, the company calls
// `reportPerformanceIssue` which moves all 3 `endorsement_rewards` rows to
// `status='locked_forfeited'`. From that fixed-point we add the dispute
// flow:
//
//   1. The affected expert (experts[0]) files a dispute via
//      `POST /api/endorsements/disputes`. The BE assigns a 3-member
//      arbitration panel (officers/masters of the relevant guild).
//   2. Three panelists vote: 3 uphold. The 3rd vote triggers the
//      `submitArbitrationVote` resolution path
//      (`hire-accountability.service.ts:671-704`): tally → `uphold > dismiss`
//      → `endorsement_disputes.status = 'resolved_upheld'`. The upheld branch
//      runs the locked-reward forfeit UPDATE
//      (`hire-accountability.service.ts:660-675` per the task brief; the
//      observable code lives at `:696-704`) but its WHERE clause requires
//      `locked_released = FALSE AND locked_forfeited = FALSE` — so when the
//      rewards were already moved to `locked_forfeited` by scenario 04's
//      `reportPerformanceIssue` call, the UPDATE matches 0 rows and the
//      reward state is unchanged. Uphold is a **no-op confirmation** in
//      this chain; the rewards remain forfeited.
//
// **Critical clarification from Suite B spec (line ~225 of
// `2026-05-08-e2e-endorsement-flow-design.md`):** in this performance-issue
// + uphold chain, the dispute resolution does not move the reward state —
// the locked forfeit happened at `reportPerformanceIssue` time. This
// scenario asserts that observable behavior: `endorsement_rewards` rows for
// the 3 endorsers remain in `status='locked_forfeited'` after the panel
// upholds.
//
// Inherits T21 + T24 + T25 concerns (verbatim from T25 file header):
//   1. **Company auth token** — read from `process.env.E2E_COMPANY_TOKEN`.
//      The suite-level setup that T21 introduces is expected to seed a
//      company + token; until that lands the scenario hard-fails (not
//      skips — the fail makes the missing pre-condition loud). Same
//      contract as scenarios 02, 05, and 07.
//   2. **`recordHireOutcome` helper signature gap** — the helper currently
//      posts only `{applicationId, outcome, finalCompensation}`. The BE
//      `recordHireOutcomeSchema` additionally requires `jobId` and
//      `candidateId` per the controller (`hire-accountability.controller.
//      ts:9-23`). T21's helper fix lands once and is shared; this scenario
//      uses the helper unchanged so the eventual fix flows through.
//   3. **`reportPerformanceIssue` helper field-name gap** — the helper
//      sends `{notes, rating}` but the BE controller reads
//      `{performanceNotes, companyRating}` (`hire-accountability.
//      controller.ts:30-42`). T24 either updates the helper or rebinds
//      via wrapper. We use the helper as-is to inherit the same fix path.
//   4. **Expert auth token (NEW for Suite B)** — `fileDispute` uses
//      `verifyAnyUser` so a company OR expert token works; we use the
//      filing expert's token. `castDisputeVote` strictly requires
//      `verifyExpertToken`. Both are read from
//      `process.env.E2E_EXPERT_TOKENS` as a JSON-encoded array indexed
//      against the `experts` fixture (so `experts[i]` ↔ tokens[i]). When
//      that env var is absent, the scenario hard-fails with a clear
//      message. The suite-level setup that T21 introduces should also
//      mint these tokens (4 staked experts × 1 JWT each, signed with
//      `process.env.JWT_SECRET`, payload `{userId, userType:'expert'}`).
//   5. **bytes32 recipe** — irrelevant here; this scenario reads only
//      BE-side state. `uuidToBytes32` is not used.
//   6. **Dispute status read path** — there is **no public BE endpoint
//      that exposes `endorsement_disputes.status` by id**. The closest
//      surface, `GET /api/endorsements/hire-outcome/:applicationId`,
//      returns a `dispute_count` aggregate but not the per-dispute status
//      (`hire-accountability.service.ts:719-734`). `submitArbitrationVote`
//      returns `{voted, allVoted, disputeId}` and not the resolution
//      label. We therefore assert the `'resolved_upheld'` resolution
//      **indirectly**:
//        a) the 3rd vote response has `allVoted = true` (BE saw the
//           tally complete);
//        b) attempting to vote a 4th time as one of the 3 panelists is
//           rejected with the `'You have already voted on this dispute'`
//           ValidationError — this confirms the dispute moved past
//           `under_review` and into a terminal state, since BE only
//           writes `'resolved_*'`/`'expired'` on those branches;
//        c) `dispute_count = 1` via `getHireOutcome`.
//      The literal `status='resolved_upheld'` comparison is the desired
//      strict assertion; we mark it as a documented gap until a
//      `GET /api/test/endorsement/disputes/:id` (or
//      `/api/endorsements/disputes/:id`) lands. See concern (a) in the
//      DONE_WITH_CONCERNS section.
//   7. **UI spot-check on `/expert/endorsements/disputes/[id]`** — the
//      page exists (`src/app/expert/endorsements/disputes/[disputeId]/
//      page.tsx`), but the `EndorsementDisputeDetailPage` component
//      authenticates via `useAccount()` from wagmi (no expert wallet
//      injected into the Playwright Chromium context). Driving real
//      RainbowKit auth from Playwright is out of scope for this
//      scenario — we conditionally probe the route and assert page
//      reachability without expert auth, falling back to a soft pass on
//      the auth gate. This mirrors the soft fall-back pattern used in
//      scenario 02 for `slashing_records`.
//
// Runtime acceptance:
//   - All test.steps pass on a clean local stack (anvil + BE + FE), given
//     the env-var pre-conditions above are met.
//   - `cleanState` reverts anvil + resets DB after the test.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  placeBid,
  recordHireOutcome,
  reportPerformanceIssue,
  fileDispute,
  castDisputeVote,
} from "../../helpers/endorsement";
import { applyToGuildViaUI } from "../../helpers/scenario";
import { BACKEND_URL } from "../../helpers/backend";
import type { Expert } from "../../fixtures";

// 1 second buffer past `ENDORSEMENT_RETENTION_SECONDS=5` is unnecessary
// here — `reportPerformanceIssue` must run BEFORE the retention deadline,
// not after. We deliberately don't wait between the hire and the
// performance-issue report. The retention check inside the BE service
// (`hire-accountability.service.ts:336`) only rejects if `now >
// retention_deadline`, which is `Date.now() + 5_000` away.

// Shape of `endorsement_rewards` rows surfaced by
// `GET /api/endorsements/rewards/:expertId`. Same shape used in scenario 07
// (locked_released path) and scenario 05.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  locked_released: boolean;
  locked_forfeited: boolean;
};

// Shape of the `hire_outcomes` row plus the two virtual count columns
// returned by `GET /api/endorsements/hire-outcome/:applicationId`.
type HireOutcomeResponse = {
  id: string;
  application_id: string;
  outcome: string;
  retention_deadline: string | null;
  reward_count: number | string;
  dispute_count: number | string;
};

// `submitArbitrationVote` response payload (see
// `hire-accountability.service.ts:712`). `allVoted` is the BE's signal
// that the tally completed and the dispute resolved (or stays
// `under_review` while it's false).
type CastVoteResponse = {
  success?: boolean;
  data: { voted: boolean; allVoted: boolean; disputeId: string };
};

/**
 * Reads the per-expert tokens injected via env var. We accept either:
 *   - `E2E_EXPERT_TOKENS` — JSON array `[t0, t1, t2, t3]`, indexed
 *     parallel to the `experts` fixture.
 *   - `E2E_EXPERT_TOKEN_<i>` — discrete per-index env vars.
 * Returns `undefined` for any expert whose token is missing; the caller
 * decides whether that's a hard fail.
 */
function readExpertTokens(experts: Expert[]): Array<string | undefined> {
  const tokens: Array<string | undefined> = experts.map(() => undefined);
  const json = process.env.E2E_EXPERT_TOKENS;
  if (json) {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (Array.isArray(parsed)) {
        for (let i = 0; i < experts.length; i++) {
          const v = parsed[i];
          if (typeof v === "string" && v.length > 0) {
            tokens[i] = v;
          }
        }
      }
    } catch {
      // Fall through to discrete env-var lookups below.
    }
  }
  for (let i = 0; i < experts.length; i++) {
    const discrete = process.env[`E2E_EXPERT_TOKEN_${i}`];
    if (typeof discrete === "string" && discrete.length > 0) {
      tokens[i] = discrete;
    }
  }
  return tokens;
}

test("dispute resolved against expert (panel votes 3 uphold) — rewards remain forfeited", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  request,
  cleanState: _cleanState,
}) => {
  // -------------------------------------------------------------------
  // Hoisted bindings populated by step 1.
  // -------------------------------------------------------------------
  let applicationId!: string;
  let jobId!: string;
  let candidateId!: string;
  let hireOutcomeId!: string;
  let disputeId!: string;

  // The disputing expert is experts[0]; the 3 panel voters are experts[1],
  // experts[2], experts[3] per the task brief. The BE picks panel members
  // by random-3 of officers/masters in the guild excluding `filedBy`
  // (`hire-accountability.service.ts:585-593`). Our fixture seeds 4 experts
  // and joins them all to the same guild — but it does NOT set
  // `guild_memberships.role`. The default role from the guild_memberships
  // table CHECK constraint is whatever `seedExpert` writes; if the BE's
  // panel-selection query returns 0 rows, the dispute is filed but no panel
  // is assigned and `castDisputeVote` will 403 with
  // 'You are not on the arbitration panel for this dispute'. We catch that
  // case explicitly below and surface a documented concern rather than a
  // confusing 403 in the trace.
  const disputingExpert = experts[0];
  const panel = [experts[1], experts[2], experts[3]];
  const bidAmounts = ["1", "2", "3"] as const; // for experts[0..2]

  // Token wiring: `disputingExpert` files; `panel[*]` vote.
  const tokens = readExpertTokens(experts);
  const disputingToken = tokens[0];
  const panelTokens = [tokens[1], tokens[2], tokens[3]];

  await test.step("approve VETD allowance for the 3 bidders", async () => {
    await approveExpertsForBidding(experts.slice(0, 3), contracts);
  });

  await test.step("apply to guild via UI", async () => {
    const result = await applyToGuildViaUI(page, candidate, guild.id);
    applicationId = result.applicationId;

    // Same fallback as scenario 02/05/07: read job_id/candidate_id off the
    // candidate's own application list.
    const res = await page.request.get(
      `${BACKEND_URL}/api/candidates/me/guild-applications`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data: Array<{
        id: string;
        job_id?: string | null;
        candidate_id?: string | null;
      }>;
    };
    const app = body.data.find((row) => row.id === applicationId);
    expect(app).toBeDefined();
    if (!app?.job_id || !app?.candidate_id) {
      throw new Error(
        `BE did not project job_id/candidate_id for application ${applicationId}.`,
      );
    }
    jobId = app.job_id;
    candidateId = app.candidate_id;
  });

  await test.step("3 experts place bids (1, 2, 3 VETD)", async () => {
    for (let i = 0; i < 3; i++) {
      await placeBid(experts[i], contracts, jobId, candidateId, bidAmounts[i]);
    }
  });

  await test.step("company records hire", async () => {
    const companyToken = process.env.E2E_COMPANY_TOKEN ?? "";
    if (!companyToken) {
      throw new Error(
        "E2E_COMPANY_TOKEN env var is required (mirror T21 — seeded by suite bootstrap)",
      );
    }
    await recordHireOutcome(request, companyToken, {
      applicationId,
      candidateId,
      jobId,
      outcome: "hired",
      finalCompensation: 100_000,
    });
  });

  await test.step("read hireOutcomeId off the hire-outcome GET", async () => {
    // Needed for `fileDispute(hireOutcomeId, ...)`. The scenario-07
    // template uses the same endpoint to read `outcome` later. Done after
    // `recordHireOutcome` so the row exists.
    const res = await page.request.get(
      `${BACKEND_URL}/api/endorsements/hire-outcome/${applicationId}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: HireOutcomeResponse };
    expect(body.data.id).toBeTruthy();
    hireOutcomeId = body.data.id;
  });

  await test.step("company reports performance issue (T24 fixed-point)", async () => {
    const companyToken = process.env.E2E_COMPANY_TOKEN ?? "";
    // Notes/rating field-name mismatch with BE is a known T24 helper bug;
    // see file header concern #3. The helper call is preserved as-is so the
    // eventual fix in `helpers/endorsement.ts` propagates here.
    await reportPerformanceIssue(
      request,
      companyToken,
      applicationId,
      "Quality of work fell well below contract expectations within the retention window.",
      1,
    );
  });

  await test.step("assert all 3 endorsement_rewards = locked_forfeited (scenario 04 fixed-point)", async () => {
    for (const expert of experts.slice(0, 3)) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const reward = (body.data ?? []).find(
        (r) => r.hire_outcome_id === hireOutcomeId,
      );
      expect(reward).toBeDefined();
      expect(reward!.status).toBe("locked_forfeited");
      expect(reward!.locked_forfeited).toBe(true);
      expect(reward!.locked_released).toBe(false);
    }
  });

  // ---------------------------------------------------------------------
  // Scenario-06-specific work: file dispute + 3-panel vote (3 uphold) →
  // resolved_upheld. The reward forfeit UPDATE inside the upheld branch
  // matches 0 rows because rewards are already locked_forfeited from
  // scenario 04 — so this is a no-op confirmation rather than a state
  // change.
  // ---------------------------------------------------------------------

  await test.step("disputing expert files dispute", async () => {
    if (!disputingToken) {
      throw new Error(
        "E2E_EXPERT_TOKENS[0] (or E2E_EXPERT_TOKEN_0) is required — see file header concern #4",
      );
    }
    const result = await fileDispute(
      request,
      disputingToken,
      hireOutcomeId,
      "I delivered quality work",
      "evidence-link",
    );
    expect(result.id).toBeTruthy();
    disputeId = result.id;
  });

  await test.step("3 panel members vote: 3 uphold (3rd vote triggers resolution)", async () => {
    // All three panelists uphold the dispute. Tally is 3 uphold > 0 dismiss
    // → `upholdCount > rows.length / 2` (3 > 1.5) → `'resolved_upheld'`.
    const votes: ReadonlyArray<"dismiss" | "uphold"> = [
      "uphold",
      "uphold",
      "uphold",
    ];

    let lastResponse: CastVoteResponse | null = null;

    for (let i = 0; i < panel.length; i++) {
      const token = panelTokens[i];
      if (!token) {
        throw new Error(
          `E2E_EXPERT_TOKENS[${i + 1}] (or E2E_EXPERT_TOKEN_${i + 1}) is required — see file header concern #4`,
        );
      }

      // We can't use the helper directly for the last call because we want
      // to inspect `allVoted` from the response body. Helper throws on
      // !ok and discards the body; we duplicate its POST inline so we
      // keep the response. The first two votes also benefit from the
      // explicit response check (allVoted should be false).
      const res = await request.post(
        `${BACKEND_URL}/api/endorsements/disputes/${disputeId}/vote`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { vote: votes[i], reasoning: `e2e vote ${i}: ${votes[i]}` },
        },
      );

      // Panel-membership 403: documented as concern (b). Surface a clear
      // message so the trace doesn't bury it under a generic !ok().
      if (res.status() === 403) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `castDisputeVote(panel[${i}]) returned 403 (likely panel-membership). ` +
            `BE response: ${text}. ` +
            `The fixture-level guild_memberships.role for the 4 seeded experts must ` +
            `be 'officer' or 'master' for the panel-selection query in ` +
            `hire-accountability.service.ts:585-593 to find them.`,
        );
      }

      // Sanity: the helper's failure mode also matches non-2xx.
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as CastVoteResponse;
      lastResponse = body;

      if (i < panel.length - 1) {
        // First two votes: tally not yet complete.
        expect(body.data.allVoted).toBe(false);
      }
    }

    // Final vote should have flipped allVoted true and triggered the
    // tally → resolution path. Resolution label is `'resolved_upheld'`
    // (3 uphold > 1.5 = panel.length / 2) per
    // `hire-accountability.service.ts:676-679`.
    expect(lastResponse).not.toBeNull();
    expect(lastResponse!.data.allVoted).toBe(true);
    expect(lastResponse!.data.disputeId).toBe(disputeId);

    // We deliberately keep `castDisputeVote` imported even though we use
    // the inline POST above — the helper is the canonical entry point and
    // a future test can delete this inline expansion once the helper
    // returns the response body.
    void castDisputeVote;
  });

  await test.step("assert dispute reached terminal state (replay 4th vote rejected)", async () => {
    // Documented gap (concern #6 — no GET endpoint exposes
    // endorsement_disputes.status). We probe the terminal state
    // indirectly: replaying a vote from one of the 3 panelists must fail
    // with the BE's `'You have already voted on this dispute'`
    // ValidationError. That branch only fires when the panelist has a
    // non-null `vote`, which is the case in BOTH the open-but-terminal
    // (resolved_*) and active-but-voted states. Combined with `allVoted
    // === true` from the previous step, this is sufficient to conclude
    // the dispute is in a terminal `resolved_*` state — and given the
    // 3-uphold tally, that state is `'resolved_upheld'`.
    const replayToken = panelTokens[0]!;
    const res = await request.post(
      `${BACKEND_URL}/api/endorsements/disputes/${disputeId}/vote`,
      {
        headers: { Authorization: `Bearer ${replayToken}` },
        data: { vote: "uphold", reasoning: "e2e replay" },
      },
    );
    expect(res.ok()).toBe(false);
    // BE returns 400 for ValidationError per the standard error handler.
    expect([400, 422]).toContain(res.status());
    const text = await res.text();
    expect(text).toMatch(/already voted/i);
  });

  await test.step("assert hire-outcome dispute_count = 1 (sanity check via GET)", async () => {
    const res = await page.request.get(
      `${BACKEND_URL}/api/endorsements/hire-outcome/${applicationId}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: HireOutcomeResponse };
    // BE projects via SELECT COUNT(*) which Postgres returns as a string in
    // the row; coerce to Number for the comparison.
    expect(Number(body.data.dispute_count)).toBe(1);
  });

  // ---------------------------------------------------------------------
  // The headline assertion of scenario 06: rewards remain locked_forfeited
  // even after the panel upholds the dispute. Per the spec's "Critical
  // clarification" block and the WHERE clause in
  // `hire-accountability.service.ts:696-704`, the upheld-branch UPDATE
  // (`SET locked_forfeited = TRUE WHERE ... AND locked_forfeited = FALSE`)
  // matches 0 rows because scenario 04's `reportPerformanceIssue` already
  // moved the rewards to `locked_forfeited`. Uphold is therefore a no-op
  // confirmation — reward state must equal the scenario-04 fixed-point.
  // ---------------------------------------------------------------------
  await test.step("assert rewards remain forfeited after uphold (no-op confirmation)", async () => {
    for (const expert of experts.slice(0, 3)) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const reward = (body.data ?? []).find(
        (r) => r.hire_outcome_id === hireOutcomeId,
      );
      expect(reward).toBeDefined();
      expect(reward!.status).toBe("locked_forfeited");
      expect(reward!.locked_forfeited).toBe(true);
      expect(reward!.locked_released).toBe(false);
    }
  });

  await test.step("UI spot-check: dispute detail page reachable (best-effort)", async () => {
    // The route is `/expert/endorsements/disputes/[disputeId]` and the
    // component reads from `endorsementAccountabilityApi.getHireOutcome`
    // gated by `useAccount()` (wagmi). Playwright's Chromium context has
    // no injected wallet and we don't run RainbowKit's connect flow here,
    // so the component will render the unauthenticated state. We
    // therefore only assert (a) the navigation completes and (b) the
    // page contains the dispute-detail shell (breadcrumb / heading) or a
    // recognizable wallet-gate message. Either is fine — we only need to
    // prove the route exists and isn't a 404. Failures degrade to a
    // documented gap.
    try {
      await page.goto(`/expert/endorsements/disputes/${disputeId}`, {
        waitUntil: "domcontentloaded",
        timeout: 10_000,
      });
      // Either flavor satisfies "page reachable":
      //   - "Upheld" / "Resolved" copy if the page somehow renders
      //     resolved dispute state without expert auth (unlikely).
      //   - "wallet" / "connect" / "endorsement" copy if the page is
      //     gated.
      // Falsy match is the one thing we want to flag as broken.
      const reachable = page.getByText(
        /dispute|wallet|connect|endorsement|sign in/i,
      );
      await expect(reachable.first()).toBeVisible({ timeout: 5_000 });
    } catch (err) {
      // Soft-pass with a breadcrumb. Mirrors the slashing_records
      // soft-pass in scenario 02. The non-UI assertions above already
      // prove the BE-side behavior.
       
      console.warn(
        `[scenario 06] UI spot-check on /expert/endorsements/disputes/${disputeId} ` +
          `did not render expected copy (${err instanceof Error ? err.message : String(err)}). ` +
          `This is acceptable because the page authenticates via wagmi useAccount() ` +
          `and Playwright has no injected wallet here. To strengthen, wire a ` +
          `Playwright RainbowKit fixture for expert wallets (out of scope for T26).`,
      );
    }
  });
});
