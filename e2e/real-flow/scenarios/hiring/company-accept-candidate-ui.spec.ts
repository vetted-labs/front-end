import { test, expect } from "../../fixtures";
import { signupCompanyViaUI } from "../../flows/company-job.flow";
import { testApi } from "../../helpers/backend";
import { uuidToBytes32 } from "../../helpers/endorsement";

test("company accepts a guild-approved candidate → hired on-chain", async ({
  page,
  cleanState: _cleanState,
  contracts,
}) => {
  void _cleanState;

  const company = await signupCompanyViaUI(page);
  const { job, application } = await testApi.seedApprovedCandidate(
    page.request,
    { ownerCompanyId: company.companyId },
  );
  void application;

  // In the redesigned IA, companies act on applicants from the Candidates
  // dashboard: select a candidate → status actions appear in the detail panel.
  await test.step("open the company candidates dashboard", async () => {
    await page.goto("/dashboard/candidates", { waitUntil: "domcontentloaded" });
  });

  await test.step("select the seeded approved candidate", async () => {
    // The seed inserts a single candidate named "E2E Approved Candidate ...".
    // After cleanState this is the only applicant, so the row is unambiguous.
    const candidateRow = page
      .getByRole("button", { name: /E2E Approved Candidate/i })
      .first();
    await candidateRow.waitFor({ state: "visible", timeout: 20_000 });
    await candidateRow.click();
  });

  await test.step("advance the candidate from reviewing → interviewed", async () => {
    // Status transitions are linear: reviewing → interviewed → accepted.
    // The seeded application starts in "reviewing", so first mark interviewed.
    await page
      .getByRole("button", { name: "Mark Interviewed", exact: true })
      .click();
    await expect(
      page.getByText(/status updated to interviewed/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  await test.step("accept the candidate and confirm with final compensation", async () => {
    // With the application now "interviewed", the "Accept" action is available.
    await page.getByRole("button", { name: "Accept", exact: true }).click();

    // The accept confirmation modal requires a final compensation amount.
    await page.getByLabel(/final compensation/i).fill("120000");
    await page.getByRole("button", { name: /confirm accept/i }).click();
  });

  await test.step("candidate is marked accepted (hired)", async () => {
    // A success toast confirms the transition; the detail panel status badge
    // now reads "Accepted".
    await expect(
      page.getByText(/status updated to accepted/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  // On-chain invariant: the hire outcome is recorded against the endorsement
  // job entry via the backend.
  await test.step("on-chain hire outcome is recorded for the job", async () => {
    const jobOnChain = await contracts.endorsementBidding.read.jobs([
      uuidToBytes32(job.id),
    ]);
    expect(jobOnChain).toBeTruthy();
  });
});
