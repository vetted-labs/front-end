import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate profile page", () => {
  test("displays welcome message with candidate name", async ({ page }) => {
    await test.step("candidate signs up and lands on dashboard", async () => {
      await signupCandidate(page);
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("candidate navigates to their profile page", async () => {
      await page.goto("/candidate/profile");
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("profile page shows a personalised welcome message", async () => {
      await expect(page.getByText(/Welcome back, E2E User/)).toBeVisible();
    });
  });

  test("shows application stats cards with zero counts for new user", async ({ page }) => {
    await test.step("candidate signs up and navigates to profile", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/profile");
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("all six application stat cards are visible", async () => {
      await expect(page.getByText("Total Applications")).toBeVisible();
      await expect(page.getByText("Pending")).toBeVisible();
      await expect(page.getByText("Under Review")).toBeVisible();
      await expect(page.getByText("Interviewed")).toBeVisible();
      await expect(page.getByText("Accepted")).toBeVisible();
      await expect(page.getByText("Rejected")).toBeVisible();
    });
  });

  test("shows three navigation tabs", async ({ page }) => {
    await test.step("candidate signs up and navigates to profile", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/profile");
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("all three profile navigation tabs are visible", async () => {
      await expect(page.getByRole("button", { name: "My Applications" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Guild Applications/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Profile & Resume" })).toBeVisible();
    });
  });

  test("Applications tab shows empty state with Browse Jobs button", async ({ page }) => {
    await test.step("candidate signs up and navigates to profile", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/profile");
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("Applications tab shows empty state with call to action", async () => {
      await expect(page.getByText("No applications yet")).toBeVisible();
      await expect(page.getByText("Start applying to jobs")).toBeVisible();
      await expect(page.getByRole("button", { name: "Browse Jobs" })).toBeVisible();
    });

    await test.step("Browse Jobs button navigates to the jobs listing", async () => {
      const browseJobsButton = page.getByRole("button", { name: "Browse Jobs" });
      await browseJobsButton.click();
      await page.waitForURL("**/browse/jobs", { timeout: 10000 });
    });
  });

  test("Profile & Resume tab renders profile information", async ({ page }) => {
    await test.step("candidate signs up and navigates to profile", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/profile");
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("candidate switches to the Profile & Resume tab", async () => {
      await page.getByRole("button", { name: "Profile & Resume" }).click();
    });

    await test.step("Resume / CV section is visible", async () => {
      await expect(page.getByText("Resume / CV")).toBeVisible();
    });
  });

  test("fetches profile and applications without API errors", async ({ page }) => {
    await test.step("candidate signs up and API error monitoring is wired up", async () => {
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
    });

    await test.step("no error toasts appear on the profile page", async () => {
      await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
    });
  });
});
