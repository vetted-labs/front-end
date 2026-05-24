import { test, expect } from "../../fixtures";
import {
  applyToGuildApplicationViaUI,
  findAssignedExperts,
} from "../../helpers/ui-candidate-review-flow";
import {
  expectWorkspaceMyReviewsShowsAssignedApplicationViaUI,
  expectWorkspaceNonReviewTabsRenderViaUI,
  expectWorkspaceQueueShowsAssignedApplicationViaUI,
  expectWorkspaceShellViaUI,
  openExpertGuildWorkspaceViaUI,
} from "../../flows/expert-workspace.flow";

test("expert guild workspace tabs render wired data for an assigned candidate review", async ({
  page,
  candidate,
  guild,
  experts,
  testContexts,
  cleanState: _cleanState,
}) => {
  test.fixme(
    true,
    "DIV-010: workspace queue's `reviewAppId=...&reviewType=candidate` link never appears — candidate-review surface depends on DIV-001 HARD BLOCKER (commit-reveal session never created on-chain) so the assigned candidate application doesn't progress into a reviewable state.",
  );
  void _cleanState;

  const applicationId = await applyToGuildApplicationViaUI(page, {
    guildId: guild.id,
    candidate: {
      token: candidate.token,
      candidateId: candidate.candidateId,
      email: candidate.email,
    },
  });

  const assignedExperts = await findAssignedExperts(page.request, {
    guildId: guild.id,
    applicationId,
    experts,
  });
  expect(assignedExperts.length, "workspace tab test needs an assigned reviewer").toBeGreaterThan(0);

  const workspacePage = await openExpertGuildWorkspaceViaUI(page, {
    expert: assignedExperts[0],
    guildId: guild.id,
    testContexts,
  });

  try {
    await expectWorkspaceShellViaUI(workspacePage);
    await expectWorkspaceQueueShowsAssignedApplicationViaUI(workspacePage, applicationId);
    await expectWorkspaceMyReviewsShowsAssignedApplicationViaUI(workspacePage, applicationId);
    await expectWorkspaceNonReviewTabsRenderViaUI(workspacePage);
  } finally {
    await workspacePage.context().close().catch(() => undefined);
  }
});
