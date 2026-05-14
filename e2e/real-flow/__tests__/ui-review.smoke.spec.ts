// Phase 2B smoke test: the 4-step rubric wizard driver.
//
// Validates that `submitRubricReviewViaUI` can walk the full review modal
// (Profile → General rubric → Domain rubric + summary → Confirm & submit)
// against a live stack and return a meaningful result shape.
//
// Application submission uses a direct BE API call (the same pattern used by
// candidate-to-expert-review.smoke.spec.ts) rather than the scenario.ts
// applyToGuildViaUI helper, which requires a candidate_proposal_id that the
// BE does not currently populate (Phase 7 gap — BE auto-promotion pipeline).
// Once Phase 7 lands, this can be replaced with the applyToGuildViaUI helper.

import { test, expect } from "../fixtures";
import { BACKEND_URL } from "../helpers/backend";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import { submitRubricReviewViaUI } from "../helpers/ui-review";
import type { Expert } from "../fixtures";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

async function submitCandidateGuildApplicationDirect(
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
            "E2E test motivation: strong desire to contribute to the guild's review process and improve platform quality systematically.",
          experience:
            "E2E test experience: three years of relevant domain work including code review, system design, and technical hiring.",
          domain_topic:
            "E2E test domain: deep familiarity with the core topic including tradeoffs, implementation patterns, and common failure modes.",
        },
        level: "experienced",
        noAiDeclaration: true,
      },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `submitCandidateGuildApplicationDirect: ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { data?: { applicationId?: string } };
  const applicationId = body.data?.applicationId;
  if (!applicationId) throw new Error("BE did not return applicationId");
  return applicationId;
}

async function findAssignedExpert(
  request: import("@playwright/test").APIRequestContext,
  guildId: string,
  applicationId: string,
  experts: Expert[],
): Promise<Expert | undefined> {
  for (const expert of experts) {
    const res = await request.get(
      `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/candidate-applications?wallet=${encodeURIComponent(expert.address)}`,
    );
    if (!res.ok()) continue;
    const body = (await res.json()) as { data: Array<{ id: string }> };
    if (body.data.some((a) => a.id === applicationId)) return expert;
  }
  return undefined;
}

test("an expert submits a full rubric review through the wizard UI", async ({
  page,
  candidate,
  guild,
  experts,
  wallet,
  cleanState: _cleanState,
}) => {
  let applicationId: string;
  let reviewer: Expert;

  await test.step("candidate applies to the guild via the UI", async () => {
    applicationId = await submitCandidateGuildApplicationDirect(
      page.request,
      candidate.token,
      guild.id,
    );
    expect(applicationId).toBeTruthy();
  });

  await test.step("an expert from the panel logs in and opens the review", async () => {
    const guildExperts = experts.filter((e) => e.guildId === guild.id);
    const assigned = await findAssignedExpert(
      page.request,
      guild.id,
      applicationId,
      guildExperts,
    );
    expect(
      assigned,
      "no expert was assigned to this application — check BE reviewer assignment",
    ).toBeDefined();
    reviewer = assigned!;

    await wallet.attach(page, reviewer.privateKey);
    await loginAsExpertViaUI(page, reviewer.address);
  });

  await test.step("the expert walks the 4-step rubric wizard and submits", async () => {
    const result = await submitRubricReviewViaUI(page, {
      generalScore: "high",
      domainScore: "high",
      justification:
        "Strong, well-evidenced application across all rubric dimensions. The candidate demonstrated clear domain knowledge and sound reasoning throughout.",
    });
    expect(result.submitted).toBe(true);
    expect(result.normalizedScore).toBeGreaterThan(0);
  });
});
