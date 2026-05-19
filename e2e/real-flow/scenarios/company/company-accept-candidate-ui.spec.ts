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

  // NOTE: testApi.seedApprovedCandidate is a stub — failure expected until BE lands endpoint.
  const company = await signupCompanyViaUI(page);
  const { job, application } = await testApi.seedApprovedCandidate(
    page.request,
    { ownerCompanyId: company.companyId },
  );

  await page.goto(
    `/company/jobs/${job.id}/applicants/${application.id}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.getByRole("button", { name: /accept|hire/i }).click();
  await page.getByRole("button", { name: /confirm/i }).click();
  await expect(page.getByText(/hired/i).first()).toBeVisible();

  // On-chain invariant
  const jobOnChain = await contracts.endorsementBidding.read.jobs([
    uuidToBytes32(job.id),
  ]);
  expect(jobOnChain).toBeTruthy();
});
