import { test, expect } from "@playwright/test";
import { signupCompany } from "../helpers/company-auth";

test.describe("Company dashboard", () => {
  test("displays stats grid with four stat cards", async ({ page }) => {
    await test.step("company signs up and lands on the dashboard", async () => {
      await signupCompany(page);
      await page.waitForURL("**/dashboard", { timeout: 15000 });
    });

    await test.step("dashboard shows all four stat cards", async () => {
      await expect(page.getByText("Active Jobs")).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Total Applicants")).toBeVisible();
      await expect(page.getByText("Unread Messages")).toBeVisible();
      await expect(page.getByText("Avg Days to Hire")).toBeVisible();
    });
  });

  test("shows Job Postings management with search and filter", async ({ page }) => {
    await test.step("company signs up and opens the job management page", async () => {
      await signupCompany(page);
      await page.goto("/dashboard/jobs", { waitUntil: "domcontentloaded" });
    });

    await test.step("job management shows heading, search input, and status filter", async () => {
      await expect(
        page.getByRole("heading", { name: "Your job postings" })
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByPlaceholder("Search jobs by title, location, or skill...")
      ).toBeVisible();
      // Status filter <select> defaults to "All statuses"
      await expect(
        page.locator("select").filter({ hasText: "All statuses" })
      ).toBeVisible();
    });
  });

  test("shows empty state for new company with no jobs", async ({ page }) => {
    await test.step("company signs up and opens the job management page", async () => {
      await signupCompany(page);
      await page.goto("/dashboard/jobs", { waitUntil: "domcontentloaded" });
    });

    await test.step("job management shows empty state with a create-first-job call to action", async () => {
      await expect(page.getByText("No job postings yet")).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Create your first job posting" })
      ).toBeVisible();
    });
  });

  test("Create your first job posting button navigates to job form", async ({ page }) => {
    await test.step("company signs up and opens the job management page", async () => {
      await signupCompany(page);
      await page.goto("/dashboard/jobs", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("button", { name: "Create your first job posting" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("company clicks Create your first job posting and reaches the job form", async () => {
      await page
        .getByRole("button", { name: "Create your first job posting" })
        .click();
      await page.waitForURL("**/jobs/new", { timeout: 10000 });
    });
  });

  test("Post New Job link navigates to job form", async ({ page }) => {
    await test.step("company signs up and lands on the dashboard", async () => {
      await signupCompany(page);
      await page.waitForURL("**/dashboard", { timeout: 15000 });
    });

    await test.step("company clicks Post New Job and reaches the job form", async () => {
      await page.getByRole("link", { name: /Post New Job/i }).first().click();
      await page.waitForURL("**/jobs/new", { timeout: 10000 });
    });
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await test.step("unauthenticated visitor attempts to open the dashboard", async () => {
      await page.goto("/dashboard", { waitUntil: "networkidle" });
    });

    await test.step("visitor is redirected to the company login page", async () => {
      await page.waitForURL(/auth\/login.*type=company|auth\/signup/, {
        timeout: 15000,
      });
    });
  });

  test("fetches dashboard data without server errors", async ({ page }) => {
    await test.step("company signs up and API error monitoring is wired up", async () => {
      await signupCompany(page);

      // Track API responses
      const apiErrors: { url: string; status: number }[] = [];
      page.on("response", (response) => {
        if (response.url().includes("/api/") && response.status() >= 500) {
          apiErrors.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto("/dashboard", { waitUntil: "networkidle" });
      // Stat cards confirm the critical dashboard data resolved
      await expect(page.getByText("Active Jobs")).toBeVisible({ timeout: 15000 });

      // No server errors
      expect(apiErrors).toHaveLength(0);
    });
  });
});
