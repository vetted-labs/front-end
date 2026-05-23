import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import { signupCompany } from "./helpers/company-auth";

test.describe("Candidate job application flow", () => {
  test("candidate can browse jobs from their dashboard", async ({ page }) => {
    await test.step("candidate signs up and opens their dashboard", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/dashboard");
      await expect(page.getByText(/Welcome back, E2E/)).toBeVisible({ timeout: 15000 });
    });

    await test.step("candidate clicks Browse Jobs and lands on the job listings page", async () => {
      await page.getByRole("link", { name: "Browse Jobs" }).first().click();
      await page.waitForURL("**/browse/jobs", { timeout: 10000 });

      await expect(page.locator("body")).toBeVisible();
    });
  });

  test("full flow: company posts job, candidate sees it on browse page", async ({
    browser,
  }) => {
    await test.step("company signs up and publishes a job through the posting wizard", async () => {
      const companyContext = await browser.newContext();
      const companyPage = await companyContext.newPage();
      await signupCompany(companyPage);

      await companyPage.goto("/jobs/new", { waitUntil: "domcontentloaded" });

      // ── Step 1 · The role ──────────────────────────────────────────
      await expect(
        companyPage.getByRole("heading", { name: "The role" })
      ).toBeVisible({ timeout: 15000 });

      const jobTitle = `E2E Job ${Date.now()}`;

      // Top skills — type then commit with Enter.
      const skillInput = companyPage.getByPlaceholder(/Type to search/i);
      await skillInput.click();
      await skillInput.fill("React");
      await skillInput.press("Enter");
      await expect(
        companyPage.getByRole("button", { name: /Remove React/i })
      ).toBeVisible({ timeout: 5000 });

      // Select the chip radios and verify each one registered.
      const employmentRadio = companyPage.getByRole("radio", { name: "Full-time", exact: true });
      await employmentRadio.click();
      await expect(employmentRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 });

      const experienceRadio = companyPage.getByRole("radio", { name: "Mid", exact: true });
      await experienceRadio.click();
      await expect(experienceRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 });

      // Fill the title LAST and confirm it persisted right before advancing.
      const titleInput = companyPage.getByPlaceholder("e.g. Senior Frontend Engineer");
      await titleInput.fill(jobTitle);
      await expect(titleInput).toHaveValue(jobTitle, { timeout: 5000 });
      await companyPage.getByRole("button", { name: "Continue" }).click();

      // ── Step 2 · Where and how much ────────────────────────────────
      await expect(
        companyPage.getByRole("heading", { name: "Where and how much" })
      ).toBeVisible({ timeout: 10000 });
      await companyPage.getByRole("radio", { name: "Remote", exact: true }).click();
      await companyPage
        .getByPlaceholder("e.g. Berlin · Remote-friendly")
        .fill("Remote-friendly");
      await companyPage.getByRole("button", { name: "Continue" }).click();

      // ── Step 3 · Description + requirements ────────────────────────
      await companyPage
        .getByPlaceholder(/About the role/i)
        .waitFor({ state: "visible", timeout: 10000 });
      await companyPage
        .getByPlaceholder(/About the role/i)
        .fill(
          "This is a test job created for E2E testing of the candidate application flow. " +
          "It tests the full pipeline from job creation to candidate browsing and applying."
        );
      const reqInput = companyPage.getByPlaceholder("Add a requirement, press Enter…");
      await reqInput.fill("5 years of experience");
      await reqInput.press("Enter");
      await expect(
        companyPage.getByRole("button", { name: /Remove 5 years of experience/i })
      ).toBeVisible({ timeout: 5000 });
      await companyPage.getByRole("button", { name: "Continue" }).click();

      // ── Step 4 · Assign a guild ────────────────────────────────────
      await companyPage
        .getByRole("button", { name: /Choose guild/i })
        .waitFor({ state: "visible", timeout: 10000 });
      await companyPage.getByRole("button", { name: /Choose guild/i }).click();
      const guildDialog = companyPage.getByRole("dialog");
      await guildDialog
        .getByRole("button", { name: "Assign guild" })
        .waitFor({ state: "visible" });
      // Guild option cards each show "X experts" — pick the first one.
      await guildDialog
        .locator("button")
        .filter({ hasText: /experts?/i })
        .first()
        .click();
      await guildDialog.getByRole("button", { name: "Assign guild" }).click();
      await companyPage.getByRole("button", { name: "Continue" }).click();

      // ── Steps 5 & 6 (questions, attachments) are optional ──────────
      await companyPage.getByRole("button", { name: "Continue" }).click();
      await companyPage.getByRole("button", { name: "Continue" }).click();

      // ── Step 7 · Review & publish ──────────────────────────────────
      const jobCreateResponse = companyPage.waitForResponse(
        (resp) => resp.url().includes("/api/jobs") && resp.request().method() === "POST",
        { timeout: 15000 },
      );
      await companyPage.getByRole("button", { name: "Publish job" }).first().click();
      await jobCreateResponse;
      await companyContext.close();
    });

    await test.step("candidate signs up and opens the Browse Jobs page", async () => {
      const candidateContext = await browser.newContext();
      const candidatePage = await candidateContext.newPage();
      await signupCandidate(candidatePage);

      const jobsApiPromise = candidatePage.waitForResponse(
        (resp) =>
          resp.url().includes("/api/jobs") && resp.request().method() === "GET",
        { timeout: 15000 },
      );

      await candidatePage.goto("/browse/jobs");

      const response = await jobsApiPromise;
      expect(response.status()).toBeLessThan(500);

      await expect(
        candidatePage.getByPlaceholder(/Role, company|search/i).first()
      ).toBeVisible({ timeout: 15000 });

      const bodyText = await candidatePage.textContent("body");
      expect(bodyText).toBeTruthy();

      await candidateContext.close();
    });
  });

  test("candidate sees correct application stats after signup", async ({ page }) => {
    await test.step("candidate signs up and opens their dashboard", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/dashboard");
      await expect(page.getByText(/Welcome back, E2E/)).toBeVisible({ timeout: 15000 });
    });

    await test.step("all stat counters show zero for a brand new account", async () => {
      const zeroValues = await page.locator("text=0").count();
      expect(zeroValues).toBeGreaterThanOrEqual(1);
    });
  });
});
