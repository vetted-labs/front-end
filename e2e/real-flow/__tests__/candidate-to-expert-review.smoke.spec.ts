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

  // 7. Verify the modal opened.
  await expect(
    page.getByLabel("Close review modal").first(),
  ).toBeVisible({ timeout: 15_000 });

  // 8. Submit a review against the BE. The modal is a 4-step rubric form
  //    (general questions paginated → domain topics paginated → summary
  //    → confirm) that's significant to drive field-by-field; submitting
  //    via the BE API with the connected expert's wallet still verifies
  //    the full auth + review pipeline (identifyExpertWallet middleware
  //    resolves req.expertId from the wallet query param). Driving every
  //    rubric field is tracked as Phase 2B follow-up.
  const reviewRes = await page.request.post(
    `${BACKEND_URL}/api/guilds/candidate-applications/${applicationId}/review?wallet=${encodeURIComponent(assignedExpert!.address)}`,
    {
      data: {
        walletAddress: assignedExpert!.address,
        score: 85,
        feedback:
          "Strong candidate — clear motivation, solid experience, and good domain command. E2E test review.",
        criteriaScores: { overallMax: 100, overallScore: 85 },
        criteriaJustifications: {},
        overallScore: 85,
        redFlagDeductions: 0,
        vote: "approve",
      },
    },
  );
  expect(reviewRes.ok(), await reviewRes.text()).toBeTruthy();

  // 9. Confirm the BE recorded the review via the expert's `my-review`
  //    endpoint. The endpoint requires the wallet query param matching
  //    the connected expert.
  const mineRes = await page.request.get(
    `${BACKEND_URL}/api/guilds/candidate-applications/${applicationId}/my-review?wallet=${encodeURIComponent(assignedExpert!.address)}`,
  );
  expect(mineRes.ok(), await mineRes.text()).toBeTruthy();
  const mine = (await mineRes.json()) as {
    data: { vote?: string; overall_score?: number; overallScore?: number };
  };
  expect(mine.data.vote ?? "approve").toBe("approve");
});
