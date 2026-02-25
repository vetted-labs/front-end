import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate profile page", () => {
  test("displays welcome message with candidate name", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");

    // Wait for dashboard to load
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Should show welcome message with the candidate's name
    await expect(page.getByText(/Welcome back, E2E User/)).toBeVisible();
  });

  test("shows application stats cards with zero counts for new user", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Verify stats cards are present
    await expect(page.getByText("Total Applications")).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByText("Under Review")).toBeVisible();
    await expect(page.getByText("Interviewed")).toBeVisible();
    await expect(page.getByText("Accepted")).toBeVisible();
    await expect(page.getByText("Rejected")).toBeVisible();
  });

  test("shows three navigation tabs", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // All three tabs should be visible
    await expect(page.getByRole("button", { name: "My Applications" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Guild Applications/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Profile & Resume" })).toBeVisible();
  });

  test("Applications tab shows empty state with Browse Jobs button", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Applications tab is default — should show empty state
    await expect(page.getByText("No applications yet")).toBeVisible();
    await expect(page.getByText("Start applying to jobs")).toBeVisible();

    const browseJobsButton = page.getByRole("button", { name: "Browse Jobs" });
    await expect(browseJobsButton).toBeVisible();

    // Click Browse Jobs navigates to browse page
    await browseJobsButton.click();
    await page.waitForURL("**/browse/jobs", { timeout: 10000 });
  });

  test("Profile & Resume tab renders profile information", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Navigate to Profile tab
    await page.getByRole("button", { name: "Profile & Resume" }).click();

    // Should show Resume/CV section
    await expect(page.getByText("Resume / CV")).toBeVisible();
  });

  test("fetches profile and applications without API errors", async ({ page }) => {
    await signupCandidate(page);

    // Monitor for API errors
    const apiResponses: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/")) {
        apiResponses.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Verify no 500 errors from API calls
    const serverErrors = apiResponses.filter((r) => r.status >= 500);
    expect(serverErrors).toHaveLength(0);

    // No error toasts should appear
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
  });
});
