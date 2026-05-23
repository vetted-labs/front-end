import { expect, type Page } from "@playwright/test";

export async function acceptCandidateViaCompanyPipelineUI(
  page: Page,
  args: {
    candidateName: RegExp;
    jobTitle: string;
    company: { token: string; companyId: string; email: string };
  },
): Promise<void> {
  await page.addInitScript((company) => {
    window.localStorage.setItem("authToken", company.token);
    window.localStorage.setItem("userType", "company");
    window.localStorage.setItem("companyId", company.companyId);
    window.localStorage.setItem("companyEmail", company.email);
    window.localStorage.removeItem("candidateId");
    window.localStorage.removeItem("candidateEmail");
    window.localStorage.removeItem("expertId");
    window.localStorage.removeItem("walletAddress");
  }, args.company);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((company) => {
    window.localStorage.setItem("authToken", company.token);
    window.localStorage.setItem("userType", "company");
    window.localStorage.setItem("companyId", company.companyId);
    window.localStorage.setItem("companyEmail", company.email);
    window.localStorage.removeItem("candidateId");
    window.localStorage.removeItem("candidateEmail");
    window.localStorage.removeItem("expertId");
    window.localStorage.removeItem("walletAddress");
  }, args.company);

  await page.goto("/dashboard/candidates", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /candidate applications/i }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByPlaceholder(/search candidates/i).fill(args.jobTitle);
  await page.getByRole("button", { name: args.candidateName }).first().click();

  await advanceStatus(page, "Start Review");
  await advanceStatus(page, "Mark Interviewed");

  await page.getByRole("button", { name: "Accept" }).click();
  await expect(
    page.getByRole("dialog").getByText(/accept candidate/i),
  ).toBeVisible({
    timeout: 10_000,
  });
  await page.getByLabel(/final compensation/i).fill("100000");
  await page
    .getByLabel(/note/i)
    .fill("Accepted through the real-flow company pipeline.");

  const statusResponse = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/applications/") &&
      resp.request().method() === "PUT",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Confirm Accept" }).click();
  const response = await statusResponse;
  expect(response.ok(), await response.text()).toBeTruthy();

  await expect(
    page
      .getByText(/^accepted$/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });
}

export async function rejectCandidateViaCompanyPipelineUI(
  page: Page,
  args: {
    candidateName: RegExp;
    jobTitle: string;
    company: { token: string; companyId: string; email: string };
  },
): Promise<void> {
  await openCompanyCandidatePipeline(page, args.company);

  await page.getByPlaceholder(/search candidates/i).fill(args.jobTitle);
  await page.getByRole("button", { name: args.candidateName }).first().click();

  await advanceStatus(page, "Start Review");
  await advanceStatus(page, "Mark Interviewed");

  await page.getByRole("button", { name: "Reject" }).click();
  await expect(
    page.getByRole("dialog").getByText(/reject candidate/i),
  ).toBeVisible({
    timeout: 10_000,
  });
  await page
    .getByLabel(/note/i)
    .fill("Rejected through the real-flow company pipeline.");

  const statusResponse = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/applications/") &&
      resp.request().method() === "PUT",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Confirm Reject" }).click();
  const response = await statusResponse;
  expect(response.ok(), await response.text()).toBeTruthy();

  await expect(
    page
      .getByText(/^rejected$/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });
}

async function openCompanyCandidatePipeline(
  page: Page,
  company: { token: string; companyId: string; email: string },
): Promise<void> {
  await page.addInitScript((company) => {
    window.localStorage.setItem("authToken", company.token);
    window.localStorage.setItem("userType", "company");
    window.localStorage.setItem("companyId", company.companyId);
    window.localStorage.setItem("companyEmail", company.email);
    window.localStorage.removeItem("candidateId");
    window.localStorage.removeItem("candidateEmail");
    window.localStorage.removeItem("expertId");
    window.localStorage.removeItem("walletAddress");
  }, company);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((company) => {
    window.localStorage.setItem("authToken", company.token);
    window.localStorage.setItem("userType", "company");
    window.localStorage.setItem("companyId", company.companyId);
    window.localStorage.setItem("companyEmail", company.email);
    window.localStorage.removeItem("candidateId");
    window.localStorage.removeItem("candidateEmail");
    window.localStorage.removeItem("expertId");
    window.localStorage.removeItem("walletAddress");
  }, company);

  await page.goto("/dashboard/candidates", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /candidate applications/i }),
  ).toBeVisible({ timeout: 30_000 });
}

async function advanceStatus(page: Page, buttonName: string): Promise<void> {
  const statusResponse = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/applications/") &&
      resp.request().method() === "PUT",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: buttonName }).click();
  const response = await statusResponse;
  expect(response.ok(), await response.text()).toBeTruthy();
}
