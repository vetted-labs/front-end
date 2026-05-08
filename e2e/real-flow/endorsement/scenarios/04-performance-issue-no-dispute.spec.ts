// e2e/real-flow/endorsement/scenarios/04-performance-issue-no-dispute.spec.ts
//
// Suite B — Scenario 04: performance-issue-no-dispute.
//
// Builds on Scenario 01 (happy-bid-and-hire). The candidate applies via the
// UI, three experts place increasing on-chain bids on (jobId, candidateId),
// the company records `hired`, the BE outbox is drained so the immediate-half
// rewards reach `RewardDistributor`. Then — BEFORE the retention deadline
// elapses — the company calls `reportPerformanceIssue`. That moves all 3
// `endorsement_rewards` rows into `status = 'locked_forfeited'` (the
// immediate half is already paid; only the locked half is forfeited).
//
// This scenario establishes the fixed-point that scenarios 05 and 06 both
// build on. No dispute is filed here — the headline assertion is simply that
// performance-issue, on its own, forfeits the locked halves.
//
// Spec reference (Suite B spec line ~214):
//   "All 3 endorsement_rewards rows have status='locked_forfeited' after a
//    performance issue is reported within the retention window."
//
// Inherits T21 + T27 concerns:
//   1. **Company auth token** — read from `process.env.E2E_COMPANY_TOKEN`.
//      The suite-level setup that T21 introduces seeds a company + token;
//      until that lands the scenario hard-fails (not skips — the fail makes
//      the missing pre-condition loud). Same contract as scenarios 01, 02,
//      05, 06, 07.
//   2. **Helper signatures (commit `fd06b88`)** — `recordHireOutcome` takes
//      an object payload `{applicationId, candidateId, jobId, outcome,
//      finalCompensation}` (the BE schema requires the latter four).
//      `reportPerformanceIssue` accepts `(request, token, applicationId,
//      notes, rating)` and remaps `notes → performanceNotes`,
//      `rating → companyRating` on the wire to satisfy the BE controller.
//   3. **camelCase OR snake_case projection** — the BE candidate-proposals
//      projection currently returns `jobId` in camelCase but is expected to
//      flip to snake_case once the projection fix lands. We accept either
//      shape on `/api/candidates/me/guild-applications` so this scenario
//      keeps passing through the BE fix.
//   4. **`getTopEndorsers` 3-slot array** — the contract returns a
//      fixed-size `address[3]` even when fewer bidders are present
//      (zero-address sentinels fill empty ranks). We filter sentinels
//      before counting. Not used in this scenario beyond the optional
//      sanity check, but inherited from T21/T27.
//   5. **Retention timing** — `reportPerformanceIssue` MUST run before
//      `retention_deadline` (BE `hire-accountability.service.ts:336`
//      rejects if `now > retention_deadline`). The deadline is
//      `hire.created_at + ENDORSEMENT_RETENTION_SECONDS=5`. We do NOT
//      sleep between hire and performance-issue here. (The brief mentions
//      a 5-second wait — we interpret that as "scenario assumes
//      ENDORSEMENT_RETENTION_SECONDS=5", not a literal sleep, since
//      sleeping past the deadline would invert the assertion: BE would
//      auto-mark `successful_retention` on the next processRetention
//      sweep and reject the late performance-issue call.)
//   6. **UI spot-check is permissive** — the candidate UI does NOT render
//      the literal word "hired" or "performance issue" anywhere on
//      `/candidate/applications`. Closest stable smoke check is asserting
//      the list page loaded and the row for our application is visible
//      (by guild name). Mirrored from scenario 01.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  placeBid,
  recordHireOutcome,
  reportPerformanceIssue,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { applyToGuildViaUI } from "../../helpers/scenario";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import type { Address } from "viem";

// Shape of one row returned by `GET /api/endorsements/rewards/:expertId`.
// We narrow only the fields we assert on; the rest are left optional so a BE
// projection change doesn't blow up the type-check.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  total_reward: string;
  immediate_reward: string;
  locked_reward: string;
  locked_released: boolean;
  locked_forfeited: boolean;
};

// Shape of the `hire_outcomes` row + virtual count columns returned by
// `GET /api/endorsements/hire-outcome/:applicationId`. Used to read
// `hireOutcomeId` so we can narrow reward rows to this scenario's outcome.
type HireOutcomeResponse = {
  id: string;
  application_id: string;
  outcome: string;
  retention_deadline: string | null;
};

test("performance issue (no dispute): hire → reportPerformanceIssue → all 3 rewards locked_forfeited", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  request,
  cleanState: _cleanState,
}) => {
  // Hoisted bindings populated by the early steps.
  let applicationId!: string;
  let jobId!: string;
  let candidateId!: string;
  let hireOutcomeId!: string;

  const bidders = experts.slice(0, 3);
  // Bid amounts in whole VETD strings (helper uses `parseEther`). >=1 VETD per
  // the contract's MIN_BID — see plan §5.6.
  const bidAmounts = ["1", "2", "3"] as const;

  await test.step("approve VETD for the 3 bidders", async () => {
    await approveExpertsForBidding(bidders, contracts);
  });

  await test.step("apply to guild via UI", async () => {
    const result = await applyToGuildViaUI(page, candidate, guild.id);
    applicationId = result.applicationId;
  });

  await test.step("read jobId + candidateId off the application row", async () => {
    // The candidate-authenticated list endpoint is the only BE route that
    // currently surfaces job/candidate identifiers for a candidate's own
    // applications (no per-id GET exists). Accept either snake_case or
    // camelCase to absorb the BE projection fix when it lands.
    const res = await page.request.get(
      `/api/candidates/me/guild-applications`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data: Array<{
        id: string;
        job_id?: string | null;
        jobId?: string | null;
        candidate_id?: string | null;
        candidateId?: string | null;
      }>;
    };
    const app = body.data.find((row) => row.id === applicationId);
    expect(app).toBeDefined();

    const resolvedJobId = app?.job_id ?? app?.jobId;
    const resolvedCandidateId = app?.candidate_id ?? app?.candidateId;
    if (!resolvedJobId || !resolvedCandidateId) {
      throw new Error(
        `BE did not project job_id/candidate_id for application ${applicationId}. ` +
          `applyToGuildViaUI applies without a jobId so the application row's job_id is NULL; ` +
          `the suite bootstrap must seed a real job and pass it to the apply helper, ` +
          `and the candidate-proposals projection must surface candidate_id (Suite B blocker).`,
      );
    }
    jobId = resolvedJobId;
    candidateId = resolvedCandidateId;
  });

  await test.step("3 experts place bids (1, 2, 3 VETD)", async () => {
    for (let i = 0; i < bidders.length; i++) {
      await placeBid(bidders[i], contracts, jobId, candidateId, bidAmounts[i]);
    }
  });

  await test.step("company records hire", async () => {
    const companyToken = process.env.E2E_COMPANY_TOKEN ?? "";
    if (!companyToken) {
      throw new Error(
        "E2E_COMPANY_TOKEN env var is required (mirror T21 — seeded by suite bootstrap).",
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

  await test.step("drain blockchain ops outbox (immediate halves)", async () => {
    await testApi.endorsement.drainBlockchainOps(request);
  });

  await test.step("assert top-3 endorsers recorded on-chain (sanity)", async () => {
    // Inherited from T21: the contract returns a fixed-size `address[3]`;
    // filter zero-address sentinels before counting. This is a light sanity
    // check — the headline of scenario 04 is the BE reward state, not the
    // chain state.
    const top = (await contracts.endorsementBidding.read.getTopEndorsers([
      uuidToBytes32(jobId),
      uuidToBytes32(candidateId),
    ])) as { experts: readonly Address[]; amounts: readonly bigint[] };
    const nonZero = top.experts.filter(
      (addr) =>
        addr.toLowerCase() !== "0x0000000000000000000000000000000000000000",
    );
    expect(nonZero).toHaveLength(3);
  });

  await test.step("read hireOutcomeId off the hire-outcome GET", async () => {
    // We need this so we can narrow reward rows to this scenario's hire
    // outcome (rather than picking up stale rows from a previous run that
    // somehow survived `cleanState`). Mirrors scenario 05.
    const res = await page.request.get(
      `${BACKEND_URL}/api/endorsements/hire-outcome/${applicationId}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { data: HireOutcomeResponse };
    expect(body.data.id).toBeTruthy();
    hireOutcomeId = body.data.id;
  });

  await test.step("company reports performance issue (within retention window)", async () => {
    // Retention deadline = hire.created_at + ENDORSEMENT_RETENTION_SECONDS=5.
    // We deliberately do NOT sleep between recordHireOutcome and this call —
    // the BE rejects performance-issue submissions after the deadline (see
    // hire-accountability.service.ts:336). Helper remaps notes →
    // performanceNotes and rating → companyRating per commit fd06b88.
    const companyToken = process.env.E2E_COMPANY_TOKEN ?? "";
    if (!companyToken) {
      throw new Error(
        "E2E_COMPANY_TOKEN env var is required (mirror T21 — seeded by suite bootstrap).",
      );
    }
    await reportPerformanceIssue(
      request,
      companyToken,
      applicationId,
      "low quality work",
      2,
    );
  });

  await test.step("assert all 3 endorsement_rewards.status = locked_forfeited", async () => {
    // Headline assertion of scenario 04. The locked half is forfeited; the
    // immediate half stays paid (the BE flips status to 'locked_forfeited'
    // and sets `locked_forfeited = true` while leaving the immediate-half
    // distribution untouched).
    for (const expert of bidders) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const rewardsForThisHire = (body.data ?? []).filter(
        (r) => r.hire_outcome_id === hireOutcomeId,
      );
      expect(rewardsForThisHire.length).toBeGreaterThanOrEqual(1);
      const reward = rewardsForThisHire[0];
      expect(reward.status).toBe("locked_forfeited");
      expect(reward.locked_forfeited).toBe(true);
      expect(reward.locked_released).toBe(false);
      // Immediate half stays paid: total_reward and immediate_reward should
      // remain populated (numeric Postgres columns come back as strings;
      // BigInt-parse before comparing to avoid JS-number precision loss on
      // wei-scale values).
      expect(BigInt(reward.immediate_reward)).toBeGreaterThan(0n);
    }
  });

  await test.step("UI spot-check: applications list still renders the application", async () => {
    // The candidate UI does NOT currently render any text related to the
    // hire outcome or performance-issue state on `/candidate/applications`.
    // The closest stable smoke check is asserting the list page loaded and
    // the row for our application is visible (by guild name). Mirrors
    // scenario 01.
    await page.goto(`/candidate/applications`, { waitUntil: "networkidle" });
    await expect(
      page.getByText(new RegExp(guild.name, "i")).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
