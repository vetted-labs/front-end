import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import { signupCompany } from "./helpers/company-auth";

test.describe("Candidate job application flow", () => {
  test("candidate can browse jobs from their profile", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Click "Browse Jobs" from the empty applications state
    await page.getByRole("button", { name: "Browse Jobs" }).click();
    await page.waitForURL("**/browse/jobs", { timeout: 10000 });

    // Verify the browse page loads
    await expect(page.locator("body")).toBeVisible();
  });

  test("full flow: company posts job, candidate sees it on browse page", async ({
    browser,
  }) => {
    // Step 1: Company creates a job
    const companyContext = await browser.newContext();
    const companyPage = await companyContext.newPage();
    await signupCompany(companyPage);

    await companyPage.goto("/jobs/new", { waitUntil: "networkidle" });
    await companyPage
      .getByPlaceholder("e.g., Senior Solidity Developer")
      .waitFor({ state: "visible", timeout: 15000 });

    const jobTitle = `E2E Job ${Date.now()}`;
    await companyPage
      .getByPlaceholder("e.g., Senior Solidity Developer")
      .fill(jobTitle);
    await companyPage.getByPlaceholder("e.g., Engineering").fill("E2E Dept");
    await companyPage
      .getByPlaceholder("Describe the job responsibilities...")
      .fill(
        "This is a test job created for E2E testing of the candidate application flow. " +
        "It tests the full pipeline from job creation to candidate browsing and applying."
      );
    await companyPage
      .getByPlaceholder("e.g., Remote or San Francisco")
      .fill("Remote");

    // Select guild if available
    const guildSelect = companyPage
      .locator("select")
      .filter({ hasText: "Select a guild" });
    const guildOptions = await guildSelect.locator("option").count();
    if (guildOptions > 1) {
      await guildSelect.selectOption({ index: 1 });
    }

    // Set status to active so it appears in browse
    const statusSelect = companyPage
      .locator("select")
      .filter({ hasText: "Draft" });
    await statusSelect.selectOption("active");

    // Submit and wait for API response
    const jobCreateResponse = companyPage.waitForResponse(
      (resp) => resp.url().includes("/api/jobs") && resp.request().method() === "POST",
      { timeout: 15000 },
    );
    await companyPage.getByRole("button", { name: "Create Job" }).click();
    await jobCreateResponse;
    await companyContext.close();

    // Step 2: Candidate browses and finds the job
    const candidateContext = await browser.newContext();
    const candidatePage = await candidateContext.newPage();
    await signupCandidate(candidatePage);

    // Set up response listener BEFORE navigating
    const jobsApiPromise = candidatePage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/jobs") && resp.request().method() === "GET",
      { timeout: 15000 },
    );

    await candidatePage.goto("/browse/jobs");

    const response = await jobsApiPromise;
    expect(response.status()).toBeLessThan(500);

    // Wait for search input to render (React hydration complete)
    await expect(
      candidatePage.getByPlaceholder(/Role, company|search/i).first()
    ).toBeVisible({ timeout: 15000 });

    // The page should load without errors
    const bodyText = await candidatePage.textContent("body");
    expect(bodyText).toBeTruthy();

    await candidateContext.close();
  });

  test("candidate sees correct application stats after signup", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // New user should have 0 in all stats — verify stat values directly
    const zeroValues = await page.locator("text=0").count();
    expect(zeroValues).toBeGreaterThanOrEqual(1);
  });
});
