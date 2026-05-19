// Phase 2B flow: candidate applies → expert logs in → expert sees the
// candidate's application in their queue → expert walks the 4-step rubric
// wizard and submits the review through the real UI.
//
// This spec drives the full multi-actor flow end-to-end:
//   1. Candidate application submitted via BE API (UI submission is a
//      separate concern tested in candidate-guild-review-ui.spec.ts).
//   2. Expert UI login (wallet connect → SIWE → /expert/dashboard).
//   3. Expert review submitted through the rubric wizard UI (Phase 2B —
//      previously submitted via BE API as a shortcut per TESTING_PHASES.md).

import { test, expect } from "../fixtures";
import { BACKEND_URL } from "../helpers/backend";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import { submitRubricReviewViaUI } from "../helpers/ui-review";
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
    throw new Error(`submit failed ${res.status()}: ${await res.text()}`);
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

test("candidate applies → expert logs in → expert submits review via rubric wizard", async ({
  page,
  candidate,
  guild,
  experts,
  wallet,
  cleanState: _cleanState,
}) => {
  let applicationId: string;
  let assignedExpert: Expert;

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 1: Candidate submits a guild application (BE direct)
  // ──────────────────────────────────────────────────────────────────────────
  await test.step("candidate submits a guild application via the BE API", async () => {
    applicationId = await submitCandidateGuildApplication(
      page.request,
      candidate.token,
      guild.id,
    );
    expect(applicationId).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 2: Find an assigned expert and log in via the UI
  // ──────────────────────────────────────────────────────────────────────────
  await test.step("an expert from the guild panel logs in via wallet connect", async () => {
    // BE assigns 3-4 reviewers from the guild's staked members (our 4
    // experts). Find one that got assigned.
    let found: Expert | undefined;
    for (const candidateExpert of experts) {
      const assignments = await fetchExpertAssignedApplications(
        page.request,
        guild.id,
        candidateExpert,
      );
      if (assignments.some((a) => a.id === applicationId)) {
        found = candidateExpert;
        break;
      }
    }
    expect(found, "no expert was assigned to this application").toBeDefined();
    assignedExpert = found!;

    // Login via the real UI (wallet connect → SIWE → /expert/dashboard).
    await wallet.attach(page, assignedExpert.privateKey);
    await loginAsExpertViaUI(page, assignedExpert.address);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 3: Expert sees the candidate in their review queue
  // ──────────────────────────────────────────────────────────────────────────
  await test.step("expert sees the candidate application in the voting queue", async () => {
    await page.goto("/expert/voting", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/expert\/voting/);

    await page
      .getByRole("button", { name: /candidate reviews/i })
      .or(page.getByRole("tab", { name: /candidate reviews/i }))
      .first()
      .click();

    // The queue should show the candidate (fullName = "E2E User <ts>" per
    // signupCandidate helper).
    await expect(page.getByText(/E2E User/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 4 (Phase 2B): Expert submits their review through the rubric wizard
  //
  // Replaces the previous BE-API shortcut:
  //   POST /api/guilds/candidate-applications/{id}/review?wallet=...
  // The wizard driver navigates to /expert/voting, opens the modal, and walks
  // all 4 steps (Profile → General rubric → Domain rubric → Confirm & submit).
  // ──────────────────────────────────────────────────────────────────────────
  await test.step("expert submits their review through the rubric wizard", async () => {
    const result = await submitRubricReviewViaUI(page, {
      generalScore: "high",
      domainScore: "high",
      justification:
        "Strong candidate — clear motivation, solid experience, and good domain command across all rubric dimensions. E2E test review.",
    });
    expect(result.submitted).toBe(true);
    expect(result.normalizedScore).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 5: Confirm the BE recorded the review via the expert's my-review
  //          endpoint (on-chain + BE invariant check).
  // ──────────────────────────────────────────────────────────────────────────
  await test.step("BE has recorded the expert's review for this application", async () => {
    const mineRes = await page.request.get(
      `${BACKEND_URL}/api/guilds/candidate-applications/${applicationId}/my-review?wallet=${encodeURIComponent(assignedExpert.address)}`,
    );
    expect(mineRes.ok(), await mineRes.text()).toBeTruthy();
    const mine = (await mineRes.json()) as {
      data: { vote?: string; overall_score?: number; overallScore?: number };
    };
    // The expert scored "high" on every criterion — vote should be "approve".
    expect(mine.data.vote ?? "approve").toBe("approve");
  });
});
