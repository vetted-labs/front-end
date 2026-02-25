import { test, expect } from "@playwright/test";
import { signupCompany, logoutCompany } from "./helpers/company-auth";

test.describe("Company dashboard", () => {
  test("displays stats grid with four stat cards", async ({ page }) => {
    await signupCompany(page);

    // Wait for dashboard to finish loading
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    // Verify four stat cards are visible
    await expect(page.getByText("Total Jobs")).toBeVisible();
    await expect(page.getByText("Active Postings")).toBeVisible();
    await expect(page.getByText("Total Applicants")).toBeVisible();
    await expect(page.getByText("Avg. Days to Hire")).toBeVisible();
  });

  test("shows Job Postings section with search and filter", async ({ page }) => {
    await signupCompany(page);
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    // Job Postings section header
    await expect(page.getByRole("heading", { name: "Job Postings" })).toBeVisible();

    // Search input
    await expect(page.getByPlaceholder("Search jobs...")).toBeVisible();

    // Status filter dropdown
    await expect(page.locator("select").filter({ hasText: "All Status" })).toBeVisible();
  });

  test("shows empty state for new company with no jobs", async ({ page }) => {
    await signupCompany(page);
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    // New company should see empty state
    await expect(page.getByText("No job postings found")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Your First Job Posting" })
    ).toBeVisible();
  });

  test("Create Your First Job Posting button navigates to job form", async ({
    page,
  }) => {
    await signupCompany(page);
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    await page
      .getByRole("button", { name: "Create Your First Job Posting" })
      .click();
    await page.waitForURL("**/jobs/new", { timeout: 10000 });
  });

  test("Post New Job button navigates to job form", async ({ page }) => {
    await signupCompany(page);
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    await page.getByRole("button", { name: /Post New Job/ }).click();
    await page.waitForURL("**/jobs/new", { timeout: 10000 });
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Should redirect to login page
    await page.waitForURL(/auth\/login.*type=company|auth\/signup/, {
      timeout: 15000,
    });
  });

  test("fetches dashboard data without server errors", async ({ page }) => {
    await signupCompany(page);

    // Track API responses
    const apiErrors: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 500) {
        apiErrors.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto("/dashboard");
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    // No server errors
    expect(apiErrors).toHaveLength(0);
  });
});
