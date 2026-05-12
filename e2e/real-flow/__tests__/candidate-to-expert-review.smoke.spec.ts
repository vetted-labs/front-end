// Phase 1 flow: candidate applies → expert logs in → expert sees the
// candidate's application in their queue and can read the BE record.
//
// This is the first full multi-actor UI test. It uses BE endpoints to
// submit the candidate application (the UI form is a separate concern)
// and drives the expert side through the real UI: SIWE-style wallet
// login → expert dashboard → applications page.
//
// Stage 2 (separate spec) will drive the review modal end-to-end.

import { test, expect } from "../fixtures";
import { BACKEND_URL } from "../helpers/backend";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import type { Expert } from "../fixtures";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

async function submitCandidateGuildApplication(
  request: import("@playwright/test").APIRequestContext,
  token: string,
  guildId: string,
): Promise<string> {
  const res = await request.post(
    `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/applications`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        answers: {
          motivation:
            "E2E test motivation answer covering my intent in joining this guild thoroughly.",
          experience:
            "E2E test experience answer covering professional background in sufficient detail.",
          domain_topic:
            "E2E test domain answer with enough specifics to satisfy min-length validation.",
        },
        level: "experienced",
        noAiDeclaration: true,
      },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `submit failed ${res.status()}: ${await res.text()}`,
    );
  }

  // The submit endpoint returns 201 with the application id in data
  const body = (await res.json()) as { data?: { applicationId?: string } };
  const applicationId = body.data?.applicationId;
  if (!applicationId) {
    throw new Error("BE did not return applicationId");
  }
  return applicationId;
}

async function fetchExpertAssignedApplications(
  request: import("@playwright/test").APIRequestContext,
  guildId: string,
  expert: Expert,
): Promise<Array<{ id: string }>> {
  const res = await request.get(
    `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/candidate-applications?wallet=${encodeURIComponent(expert.address)}`,
  );
  if (!res.ok()) {
    throw new Error(`list failed ${res.status()}: ${await res.text()}`);
  }
  const body = (await res.json()) as { data: Array<{ id: string }> };
  return body.data;
}

test("candidate applies → expert logs in → sees the application in queue", async ({
  page,
  candidate,
  guild,
  experts,
  wallet,
  cleanState: _cleanState,
}) => {
  // 1. Candidate submits a guild application (BE direct — the candidate
  //    submission UI is a separate test concern).
  const applicationId = await submitCandidateGuildApplication(
    page.request,
    candidate.token,
    guild.id,
  );

  // 2. BE assigns 3-4 reviewers from the guild's staked members (our 4
  //    experts). Find one that got assigned; login as them.
  let assignedExpert: Expert | undefined;
  for (const candidateExpert of experts) {
    const assignments = await fetchExpertAssignedApplications(
      page.request,
      guild.id,
      candidateExpert,
    );
    if (assignments.some((a) => a.id === applicationId)) {
      assignedExpert = candidateExpert;
      break;
    }
  }
  expect(assignedExpert, "no expert was assigned to this application").toBeDefined();

  // 3. Login as the assigned expert via the real UI (wallet connect → modal
  //    → click Headless E2E Wallet → auto-redirect to /expert/dashboard).
  await wallet.attach(page, assignedExpert!.privateKey);
  await loginAsExpertViaUI(page, assignedExpert!.address);

  // 4. Navigate to the Applications page and switch to the "Candidate
  //    Reviews" tab. The applications queue lists all assigned candidate
  //    guild applications for this expert.
  await page.goto("/expert/voting", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/expert\/voting/);

  await page
    .getByRole("button", { name: /candidate reviews/i })
    .or(page.getByRole("tab", { name: /candidate reviews/i }))
    .first()
    .click();

  // 5. The queue should show the candidate (fullName = "E2E User <ts>" per
  //    signupCandidate helper).
  await expect(
    page.getByText(/E2E User/i).first(),
  ).toBeVisible({ timeout: 30_000 });

  // 6. Click "Review" on the candidate's card — opens the review modal.
  await page.getByRole("button", { name: /^review$/i }).first().click();

  // 7. Verify the modal opened. RainbowKit modals use role="dialog"; this
  //    one renders ReviewGuildApplicationModal which has a Close button
  //    with aria-label="Close review modal".
  await expect(
    page.getByLabel("Close review modal").first(),
  ).toBeVisible({ timeout: 15_000 });
});
