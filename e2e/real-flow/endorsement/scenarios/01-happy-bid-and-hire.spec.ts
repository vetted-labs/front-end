// e2e/real-flow/endorsement/scenarios/01-happy-bid-and-hire.spec.ts
//
// Suite B — Scenario 01: happy-bid-and-hire.
//
// Canonical happy path for the endorsement-bidding flow: candidate applies via
// the UI, three experts place increasing on-chain bids on (jobId, candidateId),
// the company records `hired`, the BE outbox is drained so the immediate-half
// rewards reach `RewardDistributor`, and the top-3 endorsers + reward rows are
// asserted on both sides (chain + BE).
//
// This is the first scenario in Suite B and (alongside the already-shipped
// Scenario 07) doubles as a smoke test for the Suite B helper stack
// (`helpers/endorsement.ts`, the `experts` worker fixture, and the test-API
// blockchain-ops drain).
//
// Known mismatches with the plan code block (documented for the reviewer):
//   1. The plan reads jobId/candidateId from
//      `GET /api/candidate-guild-applications/:applicationId`. That route does
//      not exist. We use `GET /api/candidates/me/guild-applications` (the same
//      route Suite A scenario 01 uses to read `proposalOutcome`) and find the
//      row by `id`. NOTE: the BE projection currently returns `jobId` in
//      camelCase and does not project `candidateId` at all (see
//      `candidate-proposal-queries.service.ts:273-298`); the BE fix needed for
//      Suite B is the same as Scenario 07 — track once.
//   2. `applyToGuildViaUI(page, candidate, guildId)` applies to a guild
//      _without_ a job (no `?jobId=` query param). When applied this way, the
//      BE writes `candidate_guild_applications.job_id = NULL`. The validation
//      schema for `POST /api/endorsements/hire-outcome` requires a UUID for
//      `jobId`, so the test will fail at `recordHireOutcome` until the suite
//      bootstrap seeds a real job and the apply helper accepts a `?jobId=`
//      override (or the validation/route is loosened). We surface this by
//      throwing an explicit error if `job_id` is null on the application row.
//   3. The plan calls `recordHireOutcome(request, companyToken, applicationId,
//      "hired", 100_000)`. The current helper signature does take exactly that
//      shape, but the BE schema additionally requires `jobId` and
//      `candidateId` in the body. The helper as shipped (commit `d6342ac`) does
//      _not_ pass them, so the request will 400 until the helper is extended.
//      Mirrored from Scenario 07.
//   4. The plan reads `rewards.total` from the rewards endpoint. The BE
//      actually returns an array of `ExpertRewardWithOutcome` rows (see
//      `hire-accountability.service.ts:739`). We assert the latest row's
//      `total_reward` is positive instead.
//   5. The plan UI spot-check goes to `/candidate/applications/${applicationId}`
//      — that detail route does not exist. We use the list page
//      `/candidate/applications` (same as Suite A) and look for the application
//      ID or guild name on the page. The candidate UI does NOT currently
//      render the literal word "hired"; the closest stable smoke check is
//      asserting the page loaded and the application row is visible.
//
// Critical concern — company JWT:
//   `recordHireOutcome` requires a company-typed Bearer token (the route uses
//   `verifyCompanyToken`). The fixtures do not mint one and the BE has no
//   `/api/test/seed/company` endpoint, so this test reads
//   `process.env.E2E_COMPANY_TOKEN`. It throws a clear error if unset rather
//   than silently passing. Mirrored from Scenario 07.
//
// Critical concern — bytes32 conversion for jobId/candidateId:
//   `placeBid` calls `uuidToBytes32(jobId)` (`keccak256(toHex(uuid))`). If the
//   BE bid-recording / hire-outcome path uses a different recipe — or doesn't
//   bother with bytes32 at all — the on-chain bid will not surface in
//   `getTopEndorsers([uuidToBytes32(jobId), uuidToBytes32(candidateId)])`. We
//   surface this via a specific assertion on `top.experts.length === 3`; an
//   empty result means recipe drift.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  placeBid,
  recordHireOutcome,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { applyToGuildViaUI } from "../../helpers/scenario";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import type { Address } from "viem";

// Shape of one row returned by `GET /api/endorsements/rewards/:expertId`. We
// only read the fields we assert on — the rest are left optional so a BE
// projection change doesn't blow up the type-check.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  total_reward: string;
  immediate_reward: string;
  locked_reward: string;
};

test("happy bid and hire: 3 bids, candidate hired, rewards distributed", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  request,
  cleanState: _cleanState,
}) => {
  // Hoisted bindings so later steps can read what step 1 produced. Resolved
  // inside the relevant `test.step` so any error inside the step is attributed
  // correctly in the trace viewer.
  let applicationId!: string;
  let jobId!: string;
  let candidateId!: string;

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
    // applications (no per-id GET exists). `page.request` carries the
    // candidate session set up by the `candidate` fixture.
    //
    // Known BE gap (Suite B blocker, see file header): the projection returns
    // `jobId` in camelCase and does NOT project a `candidate_id` field. We
    // accept either snake_case or camelCase here so this scenario picks up the
    // BE fix the moment it lands.
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

  await test.step("assert top-3 endorsers recorded on-chain", async () => {
    // ABIs are loaded from non-`as const` JSON so viem types this read as
    // `unknown`. The Solidity signature is `(address[3] experts, uint256[3]
    // amounts)` — named-return tuples come back from viem as
    // `{ experts, amounts }`. Cast to that shape so the tuple is statically
    // indexable; the contract guarantees 3 slots (`MAX_ENDORSEMENTS = 3`)
    // even when fewer bids are placed (zero-address sentinels fill empty
    // ranks), so we filter those out before counting.
    const top = (await contracts.endorsementBidding.read.getTopEndorsers([
      uuidToBytes32(jobId),
      uuidToBytes32(candidateId),
    ])) as { experts: readonly Address[]; amounts: readonly bigint[] };
    const nonZero = top.experts.filter(
      (addr) => addr.toLowerCase() !== "0x0000000000000000000000000000000000000000",
    );
    expect(nonZero).toHaveLength(3);
    // Sanity-check: amounts non-increasing (rank 1 = highest bid). Bids were
    // 1, 2, 3 VETD — so rank 1 is the 3-VETD bidder, rank 3 is the 1-VETD
    // bidder. The fixed-size array preserves rank ordering even with sentinels.
    expect(top.amounts[0]).toBeGreaterThan(0n);
    expect(top.amounts[0]).toBeGreaterThanOrEqual(top.amounts[1]);
    expect(top.amounts[1]).toBeGreaterThanOrEqual(top.amounts[2]);
  });

  await test.step("assert BE rewards positive for each bidder", async () => {
    // BE returns an array of EndorsementRewardRow + outcome columns; we assert
    // the most-recent row (DESC by created_at per the BE ORDER BY) has a
    // positive total_reward. This is the BE-side mirror of the on-chain
    // reward-distributed event the outbox drain just dispatched.
    for (const expert of bidders) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as { data: ExpertRewardRow[] };
      const rewardsForThisExpert = body.data.filter(
        (r) => r.expert_id === expert.id,
      );
      expect(rewardsForThisExpert.length).toBeGreaterThanOrEqual(1);
      const reward = rewardsForThisExpert[0];
      // total_reward is a numeric Postgres column the BE returns as a string;
      // BigInt-parse before comparing so we don't hit JS-number precision on
      // wei-scale values.
      expect(BigInt(reward.total_reward)).toBeGreaterThan(0n);
    }
  });

  await test.step("UI spot-check: applications list renders the application", async () => {
    // The candidate UI does NOT currently render the literal word "hired"
    // anywhere on `/candidate/applications` (no UI surface exists for the hire
    // outcome — see `CandidateApplications.tsx`). The plan's
    // `/candidate/applications/${applicationId}` detail route also does not
    // exist. The closest stable smoke check is asserting the list page loaded
    // and the row for our application is visible (by guild name — every
    // application card in this fixture is for the seeded "Engineering" guild).
    await page.goto(`/candidate/applications`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(new RegExp(guild.name, "i")).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
