import { test, expect } from "../../fixtures";
import { testApi } from "../../helpers/backend";
import {
  applyToGuildApplicationViaUI,
  findAssignedExperts,
} from "../../helpers/ui-candidate-review-flow";
import {
  createActiveJob,
  fetchEndorsementTarget,
  placeEndorsementViaUI,
  recordHiredOutcomeAndReleaseLockedReward,
  waitForSyncedEndorsement,
} from "../../helpers/ui-endorsement-flow";
import { approveCandidateGuildApplicationViaUI } from "../../flows/expert-review.flow";
import {
  claimAllRewardsViaUI,
  openExpertEarningsViaUI,
} from "../../flows/expert-reward.flow";
import { ANVIL_KEYS, makeWallet } from "../../helpers/chain";
import type { ContractHandles } from "../../helpers/contracts";

test.setTimeout(300_000);

test("expert claims distributed endorsement rewards through the earnings UI", async ({
  page,
  candidate,
  guild,
  experts,
  contracts,
  anvil,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  const company = await testApi.seedCompany(page.request, {
    name: `E2E Reward Claim Co ${Date.now()}`,
  });
  await prepareRewardDistributorForBackend(page.request, contracts, anvil);

  const jobId = await createActiveJob(page.request, company, "Engineering");

  const guildApplicationId = await applyToGuildApplicationViaUI(page, {
    guildId: guild.id,
    candidate: {
      token: candidate.token,
      candidateId: candidate.candidateId,
      email: candidate.email,
    },
    jobId,
  });

  const assignedExperts = await findAssignedExperts(page.request, {
    guildId: guild.id,
    applicationId: guildApplicationId,
    experts,
  });
  expect(assignedExperts.length, "reward claim setup needs assigned reviewers").toBeGreaterThan(0);

  await approveCandidateGuildApplicationViaUI(page, {
    reviewers: assignedExperts,
    guildId: guild.id,
    applicationId: guildApplicationId,
  });

  const target = await fetchEndorsementTarget(
    page.request,
    candidate.token,
    guildApplicationId,
  );
  const endorser = experts.find(
    (expert) => !assignedExperts.some((assigned) => assigned.address === expert.address),
  ) ?? experts[experts.length - 1];

  await placeEndorsementViaUI(page, endorser, {
    guildId: guild.id,
    applicationId: target.jobApplicationId,
    amountVetd: "2",
    candidateNamePattern: /E2E User/i,
  });
  await waitForSyncedEndorsement(page.request, endorser, target.jobApplicationId);

  await recordHiredOutcomeAndReleaseLockedReward(page.request, company.token, target);
  await testApi.endorsement.drainBlockchainOps(page.request);

  const pendingBefore = await contracts.rewardDistributor.read.pendingRewards([endorser.address]);
  expect(pendingBefore, "endorsement reward should be pending on-chain before claim").toBeGreaterThan(0n);

  const earningsPage = await openExpertEarningsViaUI(page, endorser);
  try {
    await claimAllRewardsViaUI(earningsPage);
  } finally {
    await earningsPage.context().close().catch(() => undefined);
  }

  const pendingAfter = await contracts.rewardDistributor.read.pendingRewards([endorser.address]);
  expect(pendingAfter, "claim should clear pending rewards on-chain").toBe(0n);
});

async function prepareRewardDistributorForBackend(
  request: Parameters<typeof testApi.endorsement.rewardDistributorAdmin>[0],
  contracts: ContractHandles,
  anvil: { setBalance: (address: `0x${string}`, amount: bigint) => Promise<void> },
): Promise<void> {
  const admin = await testApi.endorsement.rewardDistributorAdmin(request);
  await anvil.setBalance(admin.backendWallet, 10n * 10n ** 18n);

  const owner = makeWallet(ANVIL_KEYS[0]);
  if (admin.owner.toLowerCase() !== admin.backendWallet.toLowerCase()) {
    if (admin.pendingOwner.toLowerCase() !== admin.backendWallet.toLowerCase()) {
      await contracts.rewardDistributor.write.transferOwnership([admin.backendWallet], {
        account: owner.client.account,
      });
    }
    const accepted = await testApi.endorsement.acceptRewardDistributorOwnership(request);
    expect(accepted.owner.toLowerCase()).toBe(admin.backendWallet.toLowerCase());
  }

  const targetTreasury = 100n * 10n ** 18n;
  const currentTreasury = await contracts.rewardDistributor.read.getTreasuryBalance() as bigint;
  if (currentTreasury < targetTreasury) {
    const tokenTreasury = makeWallet(ANVIL_KEYS[1]);
    const topUp = targetTreasury - currentTreasury;
    await contracts.vettedToken.write.approve([contracts.rewardDistributor.address, topUp], {
      account: tokenTreasury.client.account,
    });
    await contracts.rewardDistributor.write.fundTreasury([topUp], {
      account: tokenTreasury.client.account,
    });
  }
}
