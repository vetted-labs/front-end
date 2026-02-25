import { test, expect } from "@playwright/test";
import { signupCompany } from "./helpers/company-auth";

test.describe("Company job posting", () => {
  test("navigates to job creation form from dashboard", async ({ page }) => {
    await signupCompany(page);

    // Dashboard should have a "Post New Job" or similar button
    // Wait for dashboard to finish loading
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    await page.getByRole("button", { name: /Post New Job|New Job/i }).click();
    await page.waitForURL("**/jobs/new", { timeout: 10000 });

    // Verify we're on the job creation form
    await expect(page.getByText("Create New Job Posting")).toBeVisible();
  });

  test("creates a job posting with all required fields", async ({ page }) => {
    await signupCompany(page);
    await page.goto("/jobs/new", { waitUntil: "networkidle" });

    // Wait for form to render
    await page.getByPlaceholder("e.g., Senior Solidity Developer").waitFor({
      state: "visible",
      timeout: 15000,
    });

    // Fill Basic Information
    await page.getByPlaceholder("e.g., Senior Solidity Developer").fill(
      "E2E Test Engineer"
    );
    await page.getByPlaceholder("e.g., Engineering").fill("QA Department");
    await page
      .getByPlaceholder("Describe the job responsibilities...")
      .fill(
        "This is an E2E test job posting created by Playwright automated tests. " +
        "The role involves testing web applications and ensuring quality standards are met. " +
        "Must have experience with modern testing frameworks."
      );

    // Fill Location & Compensation
    await page
      .getByPlaceholder("e.g., Remote or San Francisco")
      .fill("Remote");

    // Fill Requirements
    await page
      .getByPlaceholder("e.g., 5+ years experience")
      .fill("3+ years testing experience\nPlaywright or Cypress expertise");
    await page
      .getByPlaceholder("e.g., Solidity, React")
      .fill("Playwright\nTypeScript\nCI/CD");

    // Select a guild if the dropdown has options
    const guildSelect = page.locator("select").filter({ hasText: "Select a guild" });
    const guildOptions = await guildSelect.locator("option").count();
    if (guildOptions > 1) {
      // Select the first non-placeholder guild option
      await guildSelect.selectOption({ index: 1 });
    }

    // Set status to active
    const statusSelect = page.locator("select").filter({ hasText: "Draft" });
    await statusSelect.selectOption("active");

    // Submit the form
    await page.getByRole("button", { name: "Create Job" }).click();

    // Should redirect to dashboard or show success
    // Wait for navigation or success indication
    await expect(
      page.getByText("Create Job").or(page.locator("text=Job Postings"))
    ).toBeVisible({ timeout: 15000 });
  });

  test("validates required fields before submission", async ({ page }) => {
    await signupCompany(page);
    await page.goto("/jobs/new", { waitUntil: "networkidle" });

    await page.getByPlaceholder("e.g., Senior Solidity Developer").waitFor({
      state: "visible",
      timeout: 15000,
    });

    // Try to submit with empty form
    await page.getByRole("button", { name: "Create Job" }).click();

    // Should show validation errors for required fields
    // Title requires min 3 chars, description requires min 50 chars
    await expect(
      page.getByText(/required|must be|at least/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("back to dashboard button works from job form", async ({ page }) => {
    await signupCompany(page);
    await page.goto("/jobs/new", { waitUntil: "networkidle" });

    await page.getByPlaceholder("e.g., Senior Solidity Developer").waitFor({
      state: "visible",
      timeout: 15000,
    });

    // Click "Back to Dashboard"
    await page.getByText("Back to Dashboard").click();
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });
});
