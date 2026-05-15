import { test, expect } from "../../fixtures";
import { testApi } from "../../helpers/backend";
import {
  applyToGuildApplicationViaUI,
  findAssignedExperts,
} from "../../helpers/ui-candidate-review-flow";
import {
  expectExpertHistoryShowsSlashedEndorsement,
  fetchEndorsementTarget,
  placeEndorsementViaUI,
  waitForSyncedEndorsement,
} from "../../helpers/ui-endorsement-flow";
import { rejectCandidateViaCompanyPipelineUI } from "../../flows/company-candidate.flow";
import { publishJobViaUI, signupCompanyViaUI } from "../../flows/company-job.flow";
import { approveCandidateGuildApplicationViaUI } from "../../flows/expert-review.flow";

test.setTimeout(300_000);

test("company rejection records not-hired outcome and slashes endorsed expert", async ({
  page,
  candidate,
  experts,
  guild,
  cleanState: _cleanState,
}) => {
  test.fixme(
    true,
    "DIV-010: candidate-review modal cannot open — depends on DIV-001 HARD BLOCKER (commit-reveal session never created on-chain), so `Close review modal` button is never rendered",
  );
  void _cleanState;

  const company = await signupCompanyViaUI(page);
  const job = await publishJobViaUI(page, {
    title: `E2E Not Hired Pipeline Role ${Date.now()}`,
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
    amountVetd: "2",
    candidateNamePattern: /E2E User/i,
  });
  await waitForSyncedEndorsement(page.request, endorser, target.jobApplicationId);

  await rejectCandidateViaCompanyPipelineUI(page, {
    candidateName: /E2E User/i,
    jobTitle: job.title,
    company,
  });

  const slashingRows = await testApi.endorsement.slashingRecords(page.request, {
    applicationId: target.jobApplicationId,
  });
  expect(slashingRows).toHaveLength(1);
  expect(slashingRows[0]).toMatchObject({
    expert_id: endorser.id,
    slash_percentage: 10,
    reason: "Endorsed candidate was not hired",
    related_type: "hire_outcome",
  });

  await expectExpertHistoryShowsSlashedEndorsement(page, endorser, /E2E User/i);
});
