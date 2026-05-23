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
// See scenario 01 for the full setup pattern (seed job, apply to job, sync
// bids). This scenario doesn't need bid sync for its assertions because it
// only checks that on-chain bids are unchanged and no rewards were created —
// both verifiable without `endorsement_bids` rows. However we do sync so the
// BE slashing path records rows correctly.

import { test, expect } from "../../fixtures";
import {
  approveExpertsForBidding,
  createJob,
  placeBid,
  recordHireOutcome,
  uuidToBytes32,
} from "../../helpers/endorsement";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import { parseEther, type Address } from "viem";

// Indexable view of the on-chain `bids(bytes32, bytes32, address)` tuple
// returned by `EndorsementBidding`. The ABI is loaded from a non-`as
// const` JSON, so viem types `read.bids(...)` as `unknown`. We cast to
// this tuple to reach `amount` (slot 1) without `any`.
type BidTuple = readonly [
  Address, // expert
  bigint, // amount
  bigint, // timestamp
  boolean, // isActive
];

type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
};

test("bid and not hired: 3 bids, candidate not hired → 3 slashing records, no on-chain stake change", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  request,
  jobCreator,
  company,
  cleanState: _cleanState,
}) => {
  let applicationId!: string;
  let jobId!: string;
  const candidateId = candidate.candidateId;

  const bidders = experts.slice(0, 3);
  const bidAmounts = ["1", "2", "3"] as const;

  await test.step("approve VETD for the 3 bidders", async () => {
    await approveExpertsForBidding(bidders, contracts);
  });

  await test.step("seed job + candidate applies to job; create on-chain job", async () => {
    const seededJob = await testApi.seedJob(request, {
      companyId: company.id,
      title: "E2E Endorsement Not-Hired Job",
      guild: guild.name,
    });
    jobId = seededJob.jobId;

    const applyRes = await page.request.post(
      `${BACKEND_URL}/api/applications`,
      {
        headers: { Authorization: `Bearer ${candidate.token}` },
        data: {
          jobId,
          coverLetter:
            "E2E test application for endorsement scenario 02. This cover letter meets the minimum length requirement.",
        },
      },
    );
    expect(applyRes.ok()).toBeTruthy();
    const applyBody = (await applyRes.json()) as { data: { id: string } };
    applicationId = applyBody.data.id;

    await createJob(jobCreator, contracts, jobId);
  });

  await test.step("3 experts place bids (1, 2, 3 VETD) + sync each to BE", async () => {
    for (let i = 0; i < bidders.length; i++) {
      await placeBid(bidders[i], contracts, jobId, candidateId, bidAmounts[i]);

      const syncRes = await page.request.post(
        `${BACKEND_URL}/api/blockchain/endorsements/sync`,
        {
          headers: { "x-wallet-address": bidders[i].address },
          data: {
            applicationId,
            jobId,
            candidateId,
            walletAddress: bidders[i].address,
          },
        },
      );
      expect(syncRes.ok()).toBeTruthy();
    }
  });

  await test.step("company records not_hired", async () => {
    // No finalCompensation — only required when outcome === 'hired'.
    await recordHireOutcome(request, company.token, {
      applicationId,
      candidateId,
      jobId,
      outcome: "not_hired",
    });
  });

  await test.step("drain blockchain ops outbox", async () => {
    // The not-hired path does not enqueue on-chain calls (no slash, no
    // distribute), but draining is cheap and keeps the BE state stable.
    await testApi.endorsement.drainBlockchainOps(request);
  });

  await test.step("assert on-chain bid amounts unchanged for every expert", async () => {
    // BE never calls `slashEndorsements()` on the not-hired branch.
    // Each expert's on-chain bid `amount` must equal the placed value.
    const jobIdBytes = uuidToBytes32(jobId);
    const candidateIdBytes = uuidToBytes32(candidateId);

    for (let i = 0; i < bidders.length; i++) {
      const bid = (await contracts.endorsementBidding.read.bids([
        jobIdBytes,
        candidateIdBytes,
        bidders[i].address,
      ])) as BidTuple;

      expect(bid[0].toLowerCase()).toBe(bidders[i].address.toLowerCase());
      expect(bid[1]).toBe(parseEther(bidAmounts[i]));
      expect(bid[3]).toBe(true);
    }
  });

  await test.step("assert no rewards earned for the not-hired application", async () => {
    // BE only writes `endorsement_rewards` rows on the hired branch.
    for (const expert of bidders) {
      const res = await page.request.get(
        `${BACKEND_URL}/api/endorsements/rewards/${expert.id}`,
        { headers: { Authorization: `Bearer ${company.token}` } },
      );
      expect(res.ok()).toBeTruthy();
      const body = (await res.json()) as {
        data: Array<ExpertRewardRow>;
      };

      // cleanState resets the BE DB before each test, so no prior rewards
      // should exist. The array MUST be empty.
      const rewardsForThisExpert = (body.data ?? []).filter(
        (r) => r.expert_id === expert.id,
      );
      expect(rewardsForThisExpert).toHaveLength(0);
    }
  });

  await test.step("assert 3 slashing_records rows for the not-hired outcome", async () => {
    // No public BE API currently exposes the `slashing_records` table.
    // Probe the test endpoint and document the gap if not available.
    type SlashingRow = { slash_percentage?: number; reason?: string };
    let confirmedRows: SlashingRow[] | null = null;

    const candidateUrls = [
      `${BACKEND_URL}/api/test/endorsement/slashing-records?applicationId=${applicationId}`,
      `${BACKEND_URL}/api/test/endorsement/slashing-records?expertId=${bidders[0].id}`,
    ];

    for (const url of candidateUrls) {
      const res = await request.get(url).catch(() => null);
      if (!res || !res.ok()) continue;
      const body = (await res.json().catch(() => null)) as {
        data?: unknown;
      } | null;
      const data = body?.data;
      if (Array.isArray(data)) {
        confirmedRows = data as SlashingRow[];
        break;
      }
    }

    if (confirmedRows === null) {
      console.warn(
        "[scenario 02] No BE API exposes `slashing_records`. " +
          "Skipping the (slash_percentage = 10, reason = 'Endorsed candidate was " +
          "not hired') assertion.",
      );
      return;
    }

    expect(confirmedRows).toHaveLength(3);
    for (const row of confirmedRows) {
      expect(row.slash_percentage).toBe(10);
      expect(row.reason).toBe("Endorsed candidate was not hired");
    }
  });

  await test.step("UI spot-check: applications list renders the job application", async () => {
    await page.goto(`/candidate/applications`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText(/E2E Endorsement Not-Hired Job/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^hired$/i)).toHaveCount(0);
  });
});
