import { test, expect } from "../../fixtures";
import { testApi } from "../../helpers/backend";
import {
  applyToGuildApplicationViaUI,
  findAssignedExperts,
} from "../../helpers/ui-candidate-review-flow";
import {
  expectExpertEarningsShowsEndorsement,
  fetchEndorsementTarget,
  fetchExpertRewards,
  placeEndorsementViaUI,
  waitForSyncedEndorsement,
} from "../../helpers/ui-endorsement-flow";
import { acceptCandidateViaCompanyPipelineUI } from "../../flows/company-candidate.flow";
import { publishJobViaUI, signupCompanyViaUI } from "../../flows/company-job.flow";
import { approveCandidateGuildApplicationViaUI } from "../../flows/expert-review.flow";

test.setTimeout(300_000);

test("company job -> candidate guild-backed application -> expert approval -> endorsement -> company acceptance", async ({
  page,
  candidate,
  experts,
  guild,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  const company = await signupCompanyViaUI(page);
  const job = await publishJobViaUI(page, {
    title: `E2E Hire Pipeline Role ${Date.now()}`,
    guildName: guild.name,
  });

  const guildApplicationId = await applyToGuildApplicationViaUI(page, {
    guildId: guild.id,
    candidate: {
      token: candidate.token,
      candidateId: candidate.candidateId,
      email: candidate.email,
    },
    jobId: job.id,
    candidateNamePattern: /E2E User/i,
  });

  const assignedExperts = await findAssignedExperts(page.request, {
    guildId: guild.id,
    applicationId: guildApplicationId,
    experts,
  });
  expect(assignedExperts.length, "candidate application should assign reviewers").toBeGreaterThan(0);

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
    (expert) => !assignedExperts.some((reviewer) => reviewer.address === expert.address),
  ) ?? experts[experts.length - 1];
  await placeEndorsementViaUI(page, endorser, {
    guildId: guild.id,
    applicationId: target.jobApplicationId,
    amountVetd: "1.5",
    candidateNamePattern: /E2E User/i,
  });
  await waitForSyncedEndorsement(page.request, endorser, target.jobApplicationId);

  await acceptCandidateViaCompanyPipelineUI(page, {
    candidateName: /E2E User/i,
    jobTitle: job.title,
    company,
  });
  await testApi.endorsement.drainBlockchainOps(page.request);

  const rewards = await fetchExpertRewards(page.request, endorser.id, company.token);
  const reward = rewards.find((row) => row.expert_id === endorser.id);
  expect(reward).toBeDefined();
  expect(Number(reward!.total_reward)).toBeGreaterThan(0);

  await expectExpertEarningsShowsEndorsement(page, endorser, /E2E User/i);
});
