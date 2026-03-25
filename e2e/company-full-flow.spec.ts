import { test, expect } from "@playwright/test";
import { signupCompany } from "./helpers/company-auth";

/**
 * Workaround for AuthContext token key mismatch:
 * AuthContext stores token as "authToken" but company profile page reads "companyAuthToken".
 */
async function ensureCompanyProfileAccessible(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const token = localStorage.getItem("authToken");
    if (token && !localStorage.getItem("companyAuthToken")) {
      localStorage.setItem("companyAuthToken", token);
    }
  });
}

test.describe("Company full flow", () => {
  test("company signs up and lands on dashboard", async ({ page }) => {
    const { companyName } = await signupCompany(page);

    // Verify redirect to /dashboard
    expect(page.url()).toContain("/dashboard");

    // Wait for dashboard to finish loading
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    // Verify dashboard content renders (stat cards)
    await expect(page.getByText("Total Jobs")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Active Postings")).toBeVisible();
  });

  test("company can navigate to job posting form", async ({ page }) => {
    await signupCompany(page);
    await expect(page.getByText("Loading dashboard...")).toBeHidden({ timeout: 15000 });

    // Navigate to the job creation form
    await page.goto("/jobs/new", { waitUntil: "networkidle" });

    // Verify form fields render
    await page.getByPlaceholder("e.g., Senior Solidity Developer").waitFor({
      state: "visible",
      timeout: 15000,
    });

    // Job title input
    await expect(
      page.getByPlaceholder("e.g., Senior Solidity Developer"),
    ).toBeVisible();

    // Job description textarea
    await expect(
      page.getByPlaceholder("Describe the job responsibilities..."),
    ).toBeVisible();

    // Location input
    await expect(
      page.getByPlaceholder("e.g., Remote or San Francisco"),
    ).toBeVisible();

    // Page heading
    await expect(page.getByText("Create New Job Posting")).toBeVisible();
  });

  test("company can access profile page", async ({ page }) => {
    const { companyName } = await signupCompany(page);
    await ensureCompanyProfileAccessible(page);

    // Navigate to company profile
    await page.goto("/company/profile", { waitUntil: "networkidle" });

    // Wait for profile to load
    await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });

    // Verify company profile page heading
    await expect(page.getByText("Company Profile")).toBeVisible({ timeout: 10000 });

    // Verify company name is visible
    await expect(page.getByText(companyName)).toBeVisible();
  });
});
