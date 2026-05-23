import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate applications page", () => {
  test("shows My Applications heading", async ({ page }) => {
    await test.step("candidate signs up with a clean session", async () => {
      await signupCandidate(page);
    });

    await test.step("candidate opens the My Applications page", async () => {
      await page.goto("/candidate/applications", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("My applications heading is visible", async () => {
      await expect(page.getByRole("heading", { name: "My applications" })).toBeVisible({ timeout: 15000 });
    });
  });

  test("shows empty state for new user with Browse Jobs button", async ({ page }) => {
    await test.step("candidate signs up with a clean session", async () => {
      await signupCandidate(page);
    });

    await test.step("candidate opens the My Applications page", async () => {
      await page.goto("/candidate/applications", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("empty state message and Browse jobs call to action are visible", async () => {
      await expect(page.getByText("No applications yet")).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByText("Start applying to roles and watch them move through the vetting pipeline here.")
      ).toBeVisible();

      const browseJobsButton = page.getByRole("button", { name: "Browse jobs" });
      await expect(browseJobsButton).toBeVisible();
    });
  });

  test("Browse Jobs button navigates to /browse/jobs", async ({ page }) => {
    await test.step("candidate signs up and opens the My Applications page", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/applications", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("candidate clicks Browse jobs and lands on the job listings page", async () => {
      await page.getByRole("button", { name: "Browse jobs" }).click();
      await page.waitForURL("**/browse/jobs", { timeout: 10000 });
    });
  });

  test("fetches applications without API 500 errors", async ({ page }) => {
    // Monitor for API errors across the full test
    const apiErrors: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 500) {
        apiErrors.push({ url: response.url(), status: response.status() });
      }
    });

    await test.step("candidate signs up and opens the My Applications page", async () => {
      await signupCandidate(page);
      await page.goto("/candidate/applications", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("no API server errors or error toasts appear", async () => {
      expect(apiErrors).toHaveLength(0);
      await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
    });
  });
});
