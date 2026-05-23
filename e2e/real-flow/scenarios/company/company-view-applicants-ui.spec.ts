// e2e/real-flow/scenarios/company/company-view-applicants-ui.spec.ts
//
// Task H2 — company views applicants per job through the UI.
//
// Flow:
//   1. Sign up a company via the UI flow helper.
//   2. Seed a job for that company via the backend test API.
//   3. Seed 3 applicants for that job (stub — depends on BE endpoint).
//   4. Navigate to the job applicants page.
//   5. Assert 3 applicant rows appear (+ 1 header row = 4 total).
//
// NOTE: testApi.seedApplicantsForJob is a stub that throws an error.
// This spec is scaffolding and will fail until the backend implements
// POST /api/test/seed/applicants-for-job. Track as DIV-XXX.

import { test, expect } from "../../fixtures";
import { signupCompanyViaUI, publishJobViaUI } from "../../flows/company-job.flow";
import { testApi } from "../../helpers/backend";

test("company sees 3 candidates that applied to their job", async ({
  page,
  request,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  // NOTE: testApi.seedApplicantsForJob is a stub — failure expected until BE lands endpoint.
  const company = await signupCompanyViaUI(page);

  const job = await publishJobViaUI(page, {
    title: `E2E Job ${Date.now()}`,
    guildName: "Engineering",
  });

  await test.step("seed 3 applicants for the job", async () => {
    await testApi.seedApplicantsForJob(request, {
      jobId: job.id,
      count: 3,
    });
  });

  await test.step("navigate to the company candidates dashboard", async () => {
    // The redesigned IA surfaces applicants on the company's Candidates page,
    // grouped by job. There is no per-job /company/jobs/[id]/applicants route.
    await page.goto(`/dashboard/candidates`, {
      waitUntil: "domcontentloaded",
    });
  });

  await test.step("assert the 3 seeded applicants are listed for the job", async () => {
    // Switch to the "By Job" view, which renders a per-job group with all of
    // its applications and an "{n} applications" total count.
    await page.getByRole("button", { name: "By Job", exact: true }).click();

    // The seeded job appears as a group header containing its title.
    await expect(
      page.getByText(job.title, { exact: false }).first(),
    ).toBeVisible({ timeout: 20_000 });

    // The applications total count reflects exactly the 3 seeded applicants.
    await expect(
      page.getByText(/\b3 applications\b/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
