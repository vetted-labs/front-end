import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate applications page", () => {
  test("shows My Applications heading", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/applications", { waitUntil: "networkidle" });

    // Wait for page to load
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    await expect(page.getByRole("heading", { name: "My Applications" })).toBeVisible({ timeout: 15000 });
  });

  test("shows empty state for new user with Browse Jobs button", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/applications", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Empty state text
    await expect(page.getByText("No applications yet")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Start applying to jobs to see them here")).toBeVisible();

    // Browse Jobs button
    const browseJobsButton = page.getByRole("button", { name: "Browse Jobs" });
    await expect(browseJobsButton).toBeVisible();
  });

  test("Browse Jobs button navigates to /browse/jobs", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/applications", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    await page.getByRole("button", { name: "Browse Jobs" }).click();
    await page.waitForURL("**/browse/jobs", { timeout: 10000 });
  });

  test("fetches applications without API 500 errors", async ({ page }) => {
    await signupCandidate(page);

    // Monitor for API errors
    const apiErrors: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 500) {
        apiErrors.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto("/candidate/applications", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // No server errors
    expect(apiErrors).toHaveLength(0);

    // No error toasts should appear
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
  });
});
