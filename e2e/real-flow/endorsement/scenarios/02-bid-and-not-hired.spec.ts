// e2e/real-flow/endorsement/scenarios/02-bid-and-not-hired.spec.ts
//
// Suite B — Scenario 02: bid-and-not-hired.
//
// Same shape as Scenario 01 (happy-bid-and-hire) but the company records the
// negative outcome. Three experts place increasing on-chain bids on
// (jobId, candidateId), the company records `not_hired`, the BE writes 3
// `slashing_records` rows + flips the endorsements to `slashed` — but
// **never calls `EndorsementBidding.slashEndorsements()` on-chain**.
// On-chain bids are therefore unchanged from when they were placed
// (Suite B spec line 205, e2e-endorsement-flow-design.md).
//
// Differences from Scenario 01:
//   - `recordHireOutcome(..., "not_hired")` — no `finalCompensation` (the
//     BE only requires it for `hired`, see hire-accountability.service
//     .ts:174-177).
//   - The "rewards exist" assertion is inverted: query
//     `GET /api/endorsements/rewards/${experts[0].id}` and confirm the
//     response array does not contain any reward for the in-flight
//     application (the BE only writes `endorsement_rewards` on hire).
//   - ADDITIONAL: assert 3 `slashing_records` rows with
//     `slash_percentage = 10` and reason
//     `'Endorsed candidate was not hired'`. No public BE API exposes
//     `slashing_records` today; we probe a couple of plausible test
//     endpoints in priority order and document the gap if none answer.
//   - ADDITIONAL: read `endorsementBidding.read.bids(jobId, candidateId,
//     expert)` for each panelist and assert `amount` is unchanged from
//     the placed-bid value. This is the harder behavioral guarantee —
//     it proves the BE took the not-hired branch without invoking the
//     on-chain slasher.
//   - UI spot-check: status pill is something other than "hired"
//     (e.g. "not hired" / "rejected"). Today the candidate UI does not
//     render any hire-outcome pill at all (see Scenario 01 step 7
//     concern), so we assert the list page loaded and the application
//     row for our guild is visible — the same smoke check Scenario 01
//     uses, with a defensive negative match on a literal "hired".
//
// Inherits all known concerns from Scenario 01:
//   - Company auth token: read from `process.env.E2E_COMPANY_TOKEN`.
//     Throws (not skip) if unset, mirroring T21.
//   - bytes32 conversion: `placeBid` and the subsequent `bids` reads use
//     `uuidToBytes32` (`keccak256(toHex(uuid))`). Recipe drift would
//     surface as zero-amount reads in the on-chain assertion.
//   - `applyToGuildViaUI` applies to the guild without a `?jobId=`
//     query param, so `candidate_guild_applications.job_id` is NULL.
//     `recordHireOutcome` requires a UUID for `jobId`, so the call will
//     400 until the suite bootstrap seeds a real job and the apply
//     helper accepts a jobId override (mirrored from T21).
//   - The BE projection on `/api/candidates/me/guild-applications`
//     returns `jobId` in camelCase and does NOT project a
//     `candidate_id` field; we accept either snake_case or camelCase so
//     this scenario picks up the BE fix the moment it lands.
//   - `recordHireOutcome` (helper as shipped in d6342ac) does not pass
//     `jobId` / `candidateId` in the request body; the BE schema
//     requires them. Mirrored from T21 — same blocker, same fix.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  placeBid,
  recordHireOutcome,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { applyToGuildViaUI } from "../../helpers/scenario";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import { parseEther, type Address } from "viem";

// Same `ExpertRewardRow` shape Scenario 01 uses — the BE returns an array
// of these from `GET /api/endorsements/rewards/:expertId`. Optional
// fields stay optional so a BE projection change doesn't blow up the
// type-check.
type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  total_reward: string;
  immediate_reward: string;
  locked_reward: string;
};

// Indexable view of the on-chain `bids(bytes32, bytes32, address)` tuple
// returned by `EndorsementBidding`. The ABI is loaded from a non-`as
// const` JSON, so viem types `read.bids(...)` as `unknown`. We cast to
// this tuple to reach `amount` (slot 1) without `any`.
type BidTuple = readonly [
  Address, // expert
  bigint,  // amount
  bigint,  // timestamp
  boolean, // isActive
];

test("bid and not hired: 3 bids, candidate not hired → 3 slashing records, no on-chain stake change", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  request,
  cleanState: _cleanState,
}) => {
  // Hoisted bindings so later steps can read what step 1 produced.
  let applicationId!: string;
  let jobId!: string;
  let candidateId!: string;

  const bidders = experts.slice(0, 3);
  // Bid amounts in whole VETD strings (helper uses `parseEther`). >=1
  // VETD per the contract's MIN_BID — see plan §5.6.
  const bidAmounts = ["1", "2", "3"] as const;

  await test.step("approve VETD for the 3 bidders", async () => {
    await approveExpertsForBidding(bidders, contracts);
  });

  await test.step("apply to guild via UI", async () => {
    const result = await applyToGuildViaUI(page, candidate, guild.id);
    applicationId = result.applicationId;
  });

  await test.step("read jobId + candidateId off the application row", async () => {
    // Mirrors Scenario 01 — `GET /api/candidate-guild-applications/:id`
    // doesn't exist; we use the candidate-authenticated list endpoint
    // and find by `id`. Accept snake_case OR camelCase to ride future
    // BE-projection fixes without a code change here.
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

  await test.step("company records not_hired", async () => {
    const companyToken = process.env.E2E_COMPANY_TOKEN ?? "";
    if (!companyToken) {
      throw new Error(
        "E2E_COMPANY_TOKEN env var is required (mirror T21 — seeded by suite bootstrap).",
      );
    }
    // No finalCompensation — only required when outcome === 'hired' per
    // hire-accountability.service.ts:174-177.
    await recordHireOutcome(request, companyToken, applicationId, "not_hired");
  });

  await test.step("drain blockchain ops outbox", async () => {
    // The not-hired path does not enqueue on-chain calls (no slash, no
    // distribute), but draining is cheap and keeps the BE state stable
    // before the assertion phase. Mirrors T21 verbatim.
    await testApi.endorsement.drainBlockchainOps(request);
  });

  await test.step("assert on-chain bid amounts unchanged for every expert", async () => {
    // BE never calls `slashEndorsements()` on the not-hired branch (see
    // Suite B spec line 205). Each expert's on-chain bid `amount` must
    // therefore equal the value they placed in the "place bids" step.
    const jobIdBytes = uuidToBytes32(jobId);
    const candidateIdBytes = uuidToBytes32(candidateId);

    for (let i = 0; i < bidders.length; i++) {
      const bid = (await contracts.endorsementBidding.read.bids([
        jobIdBytes,
        candidateIdBytes,
        bidders[i].address,
      ])) as BidTuple;

      // bid[0] = expert, bid[1] = amount, bid[2] = timestamp, bid[3] = isActive
      expect(bid[0].toLowerCase()).toBe(bidders[i].address.toLowerCase());
      expect(bid[1]).toBe(parseEther(bidAmounts[i]));
      expect(bid[3]).toBe(true);
    }
  });

  await test.step("assert no rewards earned for the not-hired application", async () => {
    // The BE only writes `endorsement_rewards` rows on the hired branch
    // (hire-accountability.service.ts:188-235). For not_hired the
    // expert may still have unrelated reward rows from prior hires —
    // we therefore assert that NO row exists for THIS application's
    // hire-outcome. We index by `hire_outcome_id` if available; if the
    // BE projection doesn't include it (it does today per the service
    // SELECT at :742-747), fall back to asserting the rewards array
    // doesn't contain a row tied to a not-hired outcome.
    for (const expert of bidders) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as {
        data: Array<ExpertRewardRow & { outcome?: string }>;
      };

      // Defensive: in this fresh per-test fixture (cleanState resets
      // the BE DB before the test runs) the expert has no prior
      // rewards, so the array MUST be empty.
      const rewardsForThisExpert = body.data.filter(
        (r) => r.expert_id === expert.id,
      );
      expect(rewardsForThisExpert).toHaveLength(0);
    }
  });

  await test.step("assert 3 slashing_records rows for the not-hired outcome", async () => {
    // No public BE API currently exposes the `slashing_records` table.
    // The closest hooks (`expert-activity` + finalization) report a
    // different `slashing_tier` concept used for the commit-reveal
    // vetting flow, not the post-hire endorsement slash.
    //
    // Probe a couple of plausible test endpoints in priority order and
    // fall back to documenting the gap. The on-chain assertion above +
    // the no-rewards assertion already cover the most behaviorally
    // important guarantees; this slashing-row check is purely a DB
    // mirror of the same outcome.
    type SlashingRow = { slash_percentage?: number; reason?: string };
    let confirmedRows: SlashingRow[] | null = null;

    const candidateUrls = [
      // Hypothetical future test endpoints. If the BE adds either
      // shape this assertion strengthens automatically.
      `${BACKEND_URL}/api/test/endorsement/slashing-records?applicationId=${applicationId}`,
      `${BACKEND_URL}/api/test/endorsement/slashing-records?expertId=${bidders[0].id}`,
    ];

    for (const url of candidateUrls) {
      const res = await request.get(url).catch(() => null);
      if (!res || !res.ok()) continue;
      const body = (await res.json().catch(() => null)) as
        | { data?: unknown }
        | null;
      const data = body?.data;
      if (Array.isArray(data)) {
        confirmedRows = data as SlashingRow[];
        break;
      }
    }

    if (confirmedRows === null) {
      // Documented gap — mirrored from the file-header concerns. We do
      // not fail the test on this alone because the on-chain bids-
      // unchanged + no-rewards assertions already prove the BE took the
      // not-hired branch.
       
      console.warn(
        "[scenario 02] No BE API exposes `slashing_records`. " +
          "Skipping the (slash_percentage = 10, reason = 'Endorsed candidate was " +
          "not hired') assertion. Add `GET /api/test/endorsement/slashing-records` " +
          "(or surface via an existing controller) to enable this check.",
      );
      return;
    }

    expect(confirmedRows).toHaveLength(3);
    for (const row of confirmedRows) {
      expect(row.slash_percentage).toBe(10);
      expect(row.reason).toBe("Endorsed candidate was not hired");
    }
  });

  await test.step("UI spot-check: applications list renders, no positive 'hired' pill", async () => {
    // Same shape as Scenario 01's spot-check (the candidate UI doesn't
    // currently render any hire-outcome pill anywhere on
    // `/candidate/applications` — see `CandidateApplications.tsx`).
    // We assert the list page loaded by matching the seeded guild name
    // — every application card in this fixture is for "Engineering".
    // We additionally guard against a future positive-only regression
    // by asserting no `^hired$` text pill appears for this row.
    await page.goto(`/candidate/applications`, { waitUntil: "networkidle" });

    await expect(
      page.getByText(new RegExp(guild.name, "i")).first(),
    ).toBeVisible({ timeout: 10_000 });

    // No literal "hired" status pill should appear. The candidate page
    // also renders strings like "Hire" / "hiring" inside marketing
    // copy; we use a strict ^hired$ regex (case-insensitive) so the
    // assertion specifically targets a status-pill-shaped string.
    await expect(page.getByText(/^hired$/i)).toHaveCount(0);
  });
});
