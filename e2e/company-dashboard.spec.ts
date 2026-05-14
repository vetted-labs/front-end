import { test, expect } from "@playwright/test";
import { signupCompany, logoutCompany } from "./helpers/company-auth";

test.describe("Company dashboard", () => {
  test("displays stats grid with four stat cards", async ({ page }) => {
    await test.step("company signs up and waits for the dashboard to load", async () => {
      await signupCompany(page);
      await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("dashboard shows all four stat cards", async () => {
      await expect(page.getByText("Total Jobs")).toBeVisible();
      await expect(page.getByText("Active Postings")).toBeVisible();
      await expect(page.getByText("Total Applicants")).toBeVisible();
      await expect(page.getByText("Avg. Days to Hire")).toBeVisible();
    });
  });

  test("shows Job Postings section with search and filter", async ({ page }) => {
    await test.step("company signs up and waits for the dashboard to load", async () => {
      await signupCompany(page);
      await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("Job Postings section shows heading, search input, and status filter", async () => {
      await expect(page.getByRole("heading", { name: "Job Postings" })).toBeVisible();
      await expect(page.getByPlaceholder("Search jobs...")).toBeVisible();
      await expect(page.locator("select").filter({ hasText: "All Status" })).toBeVisible();
    });
  });

  test("shows empty state for new company with no jobs", async ({ page }) => {
    await test.step("company signs up and waits for the dashboard to load", async () => {
      await signupCompany(page);
      await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("dashboard shows empty state with a create-first-job call to action", async () => {
      await expect(page.getByText("No job postings found")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create Your First Job Posting" })
      ).toBeVisible();
    });
  });

  test("Create Your First Job Posting button navigates to job form", async ({ page }) => {
    await test.step("company signs up and waits for the dashboard to load", async () => {
      await signupCompany(page);
      await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("company clicks Create Your First Job Posting and reaches the job form", async () => {
      await page
        .getByRole("button", { name: "Create Your First Job Posting" })
        .click();
      await page.waitForURL("**/jobs/new", { timeout: 10000 });
    });
  });

  test("Post New Job button navigates to job form", async ({ page }) => {
    await test.step("company signs up and waits for the dashboard to load", async () => {
      await signupCompany(page);
      await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("company clicks Post New Job and reaches the job form", async () => {
      await page.getByRole("button", { name: /Post New Job/ }).click();
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

      await page.goto("/dashboard");
      await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

      // No server errors
      expect(apiErrors).toHaveLength(0);
    });
  });
});
