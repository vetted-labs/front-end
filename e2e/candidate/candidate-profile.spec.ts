import { test, expect } from "@playwright/test";
import { signupCandidate } from "../helpers/auth";

// NOTE: post-IA-restructure, the candidate "home" (welcome message, stat strip,
// applications/guild sections) lives at /candidate/dashboard. /candidate/profile
// was repurposed into a profile EDITOR. Tests whose intent is the dashboard
// landing experience point at /candidate/dashboard; the final test exercises the
// profile editor at /candidate/profile.

test.describe("Candidate dashboard page", () => {
  test("displays welcome message with candidate name", async ({ page }) => {
    await test.step("candidate signs up", async () => {
      await signupCandidate(page);
    });

    await test.step("candidate navigates to their dashboard", async () => {
      await page.goto("/candidate/dashboard");
    });

    await test.step("dashboard shows a personalised welcome message", async () => {
      // signupCandidate sets fullName "E2E User <ts>", so firstName is "E2E"
      await expect(page.getByText(/Welcome back, E2E/)).toBeVisible({ timeout: 15000 });
    });
  });

  test("shows the application stats strip for a new user", async ({ page }) => {
    await test.step("candidate signs up and navigates to dashboard", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/dashboard");
      await expect(page.getByText(/Welcome back, E2E/)).toBeVisible({ timeout: 15000 });
    });

    await test.step("the quick-stat tiles are visible", async () => {
      await expect(page.getByText("Applications", { exact: true })).toBeVisible();
      await expect(page.getByText("Interviews", { exact: true })).toBeVisible();
      await expect(page.getByText("In Review", { exact: true })).toBeVisible();
      await expect(page.getByText("Profile Strength", { exact: true })).toBeVisible();
    });
  });

  test("shows applications and guild applications sections", async ({ page }) => {
    await test.step("candidate signs up and navigates to dashboard", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/dashboard");
      await expect(page.getByText(/Welcome back, E2E/)).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Active Applications and Guild Applications sections are present", async () => {
      await expect(page.getByRole("heading", { name: "Active Applications" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Guild Applications" })).toBeVisible();
    });
  });

  test("Active Applications shows empty state with Browse Jobs call to action", async ({ page }) => {
    await test.step("candidate signs up and navigates to dashboard", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/dashboard");
      await expect(page.getByText(/Welcome back, E2E/)).toBeVisible({ timeout: 15000 });
    });

    await test.step("the empty applications state shows a call to action", async () => {
      await expect(page.getByText("No applications yet -- start exploring")).toBeVisible();
    });

    await test.step("Browse Jobs link navigates to the jobs listing", async () => {
      // Use the header Browse Jobs link to reach the jobs listing.
      await page.getByRole("link", { name: "Browse Jobs" }).first().click();
      await page.waitForURL("**/browse/jobs", { timeout: 10000 });
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

      await page.goto("/candidate/dashboard");
      await expect(page.getByText(/Welcome back, E2E/)).toBeVisible({ timeout: 15000 });

      // Verify no 500 errors from API calls
      const serverErrors = apiResponses.filter((r) => r.status >= 500);
      expect(serverErrors).toHaveLength(0);
    });

    await test.step("no error toasts appear on the dashboard", async () => {
      await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
    });
  });
});

test.describe("Candidate profile editor page", () => {
  test("profile editor renders the candidate's name and Resume section", async ({ page }) => {
    await test.step("candidate signs up and opens the profile editor", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/profile");
    });

    await test.step("the profile editor shows the candidate name and a Resume section", async () => {
      // signupCandidate creates "E2E User <ts>" as the full name.
      await expect(page.getByRole("heading", { name: /E2E User/ })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Resume / CV").first()).toBeVisible();
    });
  });
});
